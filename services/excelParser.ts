import * as XLSX from 'xlsx';
import { CalendarEvent, ProcessingOptions, ProcessingLog } from '../types';

// Regex Patterns
const TIME_PATTERN = /(\d{1,2})[:\.](\d{2})(?:\s*-\s*|\s*to\s*)(\d{1,2})[:\.](\d{2})/;
// Updated to capture initials with at least one bracket (e.g., "(ABC)", "(ABC", "ABC)")
const INITIALS_PATTERN = /[\(\[]([A-Z]{2,3})[\)\]]?|([A-Z]{2,3})[\)\]]/;
const PUBLIC_MARKER_PATTERN = /\s+-\s*[pP](?:\s|$|\))/;

interface ExtractionResult {
  description: string;
  startTime: string | null;
  endTime: string | null;
  staffInitials?: string;
  isPublic: boolean;
}

interface SheetStructure {
  headerRowIndex: number;
  dateColIndex: number;
  dayEventsColIndex: number;
  eveningEventsColIndex: number;
}

const addLog = (logs: ProcessingLog[], message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
  logs.push({
    id: Math.random().toString(36).substring(7),
    timestamp: new Date(),
    message,
    type
  });
};

const formatDateForUid = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
};

const parseTime = (h: string, m: string): string => {
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
};

const extractEventDetails = (rawText: string): ExtractionResult => {
  let text = rawText.trim();
  let startTime: string | null = null;
  let endTime: string | null = null;
  let staffInitials: string | undefined = undefined;
  let isPublic = false;

  // 1. Detect and extract Time
  const timeMatch = text.match(TIME_PATTERN);
  if (timeMatch) {
    startTime = parseTime(timeMatch[1], timeMatch[2]);
    endTime = parseTime(timeMatch[3], timeMatch[4]);
    // Remove time from text
    text = text.replace(timeMatch[0], ' ');
  }

  // 2. Detect and extract Public Marker
  // Check specifically for the marker pattern or if it was part of an initials block
  const publicMatch = text.match(PUBLIC_MARKER_PATTERN) || rawText.match(/\([A-Z]{2,3}\s*-\s*[pP]\)/);
  if (publicMatch) {
    isPublic = true;
    // Remove marker if it exists as a standalone suffix or is part of the text body
    text = text.replace(PUBLIC_MARKER_PATTERN, '');
  }

  // 3. Detect and extract Staff Initials
  // We check the modified text. Pattern handles missing brackets on one side.
  const initialsMatch = text.match(INITIALS_PATTERN);
  if (initialsMatch) {
    // Group 1 matches start bracket case, Group 2 matches end bracket case
    staffInitials = initialsMatch[1] || initialsMatch[2];
    text = text.replace(initialsMatch[0], ' ');
  }
  
  // Clean up any double spaces created by removals and trim
  text = text.replace(/\s\s+/g, ' ').replace(/\(\s*\)/g, '').trim();
  
  // Special cleanup for stray punctuation often left behind
  text = text.replace(/\s+-\s*$/, '');

  return {
    description: text,
    startTime,
    endTime,
    staffInitials,
    isPublic
  };
};

const parseExcelDate = (excelDate: any): Date | null => {
  if (!excelDate) return null;
  
  // 1. Handle JS Date objects (returned by SheetJS when cellDates: true)
  if (excelDate instanceof Date) {
    if (isNaN(excelDate.getTime())) return null;
    return excelDate;
  }

  // 2. If it's a number (Excel serial date)
  if (typeof excelDate === 'number') {
    const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
    return date;
  }
  
  // 3. If it's a string
  if (typeof excelDate === 'string') {
    const trimmed = excelDate.trim();
    
    // Try standard constructor
    const d = new Date(trimmed);
    if (!isNaN(d.getTime()) && d.getFullYear() > 2000) return d;
    
    // Try d-MMM-yy format (e.g., "5-Aug-24")
    const parts = trimmed.match(/^(\d{1,2})[ -]([A-Za-z]{3})[ -](\d{2,4})$/);
    if (parts) {
      const day = parseInt(parts[1], 10);
      const monthStr = parts[2].toLowerCase();
      let year = parseInt(parts[3], 10);
      
      if (year < 100) year += 2000;
      
      const months: {[key: string]: number} = {
        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
        'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
      };
      
      if (months.hasOwnProperty(monthStr)) {
        return new Date(year, months[monthStr], day);
      }
    }
  }
  
  return null;
};

// Dynamic Column Detection
const detectStructure = (data: any[][], onLog: (l: ProcessingLog) => void): SheetStructure => {
  // 1. Find Header Row
  // We look for "During the college day" or "From the end of the college day"
  let headerRowIndex = -1;
  let dayEventsColIndex = -1;
  let eveningEventsColIndex = -1;

  for (let i = 0; i < Math.min(data.length, 20); i++) {
    const row = data[i];
    if (!row) continue;
    
    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j]).toLowerCase();
      if (cell.includes("during the college day")) {
        headerRowIndex = i;
        dayEventsColIndex = j;
      } else if (cell.includes("from the end of the college day")) {
        // If we haven't found headerRowIndex yet, set it (though usually During comes first)
        if (headerRowIndex === -1) headerRowIndex = i;
        eveningEventsColIndex = j;
      }
    }
    
    if (headerRowIndex !== -1 && dayEventsColIndex !== -1) break;
  }

  if (headerRowIndex === -1) {
    throw new Error("Could not find header row (looked for 'During the college day'). File structure might be invalid.");
  }

  // 2. Find Date Column
  // It's usually to the left of the Day Events column.
  // We will scan the first 15 rows of DATA to see which column has date-like values.
  let dateColIndex = -1;
  const potentialCols: {[key: number]: number} = {}; // colIndex -> dateMatchCount
  
  for (let i = headerRowIndex + 1; i < Math.min(data.length, headerRowIndex + 15); i++) {
    const row = data[i];
    if (!row) continue;
    // Check columns to the left of dayEventsColIndex
    for (let j = 0; j < dayEventsColIndex; j++) {
       if (parseExcelDate(row[j])) {
         potentialCols[j] = (potentialCols[j] || 0) + 1;
       }
    }
  }

  // Pick the column with the most date matches
  let maxMatches = 0;
  Object.entries(potentialCols).forEach(([colStr, matches]) => {
    if (matches > maxMatches) {
      maxMatches = matches;
      dateColIndex = parseInt(colStr, 10);
    }
  });

  // Fallback: if no dates found, assume it's immediately to the left of Day Events, or 1 column gap?
  // In the image: Date is C (2), During is D (3). So index - 1.
  if (dateColIndex === -1) {
     dateColIndex = Math.max(0, dayEventsColIndex - 1);
     onLog({ id: 's1', timestamp: new Date(), message: `Warning: Could not auto-detect date column. Defaulting to column ${dateColIndex} (immediately left of events).`, type: 'warning' });
  }

  // Fallback for Evening events if not found by header name
  if (eveningEventsColIndex === -1) {
    eveningEventsColIndex = dayEventsColIndex + 1;
  }

  onLog({ 
    id: 's2', 
    timestamp: new Date(), 
    message: `Structure Detected - Header Row: ${headerRowIndex}, Date Col: ${dateColIndex}, Day Events Col: ${dayEventsColIndex}, Evening Events Col: ${eveningEventsColIndex}`, 
    type: 'success' 
  });

  return { headerRowIndex, dateColIndex, dayEventsColIndex, eveningEventsColIndex };
};

export const parseWorkbook = async (
  file: File, 
  options: ProcessingOptions,
  onLog: (log: ProcessingLog) => void
): Promise<CalendarEvent[]> => {
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        onLog({ id: '1', timestamp: new Date(), message: 'Reading file data...', type: 'info' });
        
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        
        if (!workbook.SheetNames.length) {
          throw new Error("No sheets found in Excel file.");
        }

        const sheetName = workbook.SheetNames[0]; 
        onLog({ id: '2', timestamp: new Date(), message: `Processing sheet: ${sheetName}`, type: 'info' });
        
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON array of arrays (header: 1)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        if (jsonData.length < 2) {
            throw new Error("Sheet appears to be empty or malformed.");
        }

        // Detect Structure
        let structure: SheetStructure;
        try {
           structure = detectStructure(jsonData, onLog);
        } catch (err: any) {
           // Fallback to defaults if detection fails completely
           onLog({ id: 'err1', timestamp: new Date(), message: `Detection failed: ${err.message}. Trying default indices.`, type: 'warning' });
           structure = { headerRowIndex: 0, dateColIndex: 2, dayEventsColIndex: 3, eveningEventsColIndex: 4 };
        }

        const events: CalendarEvent[] = [];
        let currentDate: Date | null = null;
        let rowCount = 0;

        // Iterate starting from the row AFTER the header
        for (let i = structure.headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;

          // Date Column
          const cellDate = row[structure.dateColIndex];
          if (cellDate) {
            const parsedDate = parseExcelDate(cellDate);
            if (parsedDate) {
              currentDate = parsedDate;
            }
          }

          if (!currentDate) continue; 

          // During college day
          const dayEventsCell = row[structure.dayEventsColIndex];
          if (dayEventsCell) {
             const rawEvents = String(dayEventsCell).split(/\r?\n/);
             rawEvents.forEach(rawEvent => {
                if (!rawEvent.trim() || rawEvent.trim() === 'undefined') return;
                
                const details = extractEventDetails(rawEvent);
                events.push({
                  date: new Date(currentDate!),
                  description: details.description,
                  originalText: rawEvent,
                  startTime: details.startTime || options.defaultStartTime,
                  endTime: details.endTime || options.defaultEndTime,
                  staffInitials: details.staffInitials,
                  isPublic: details.isPublic,
                  uid: `${formatDateForUid(currentDate!)}T${(details.startTime || options.defaultStartTime).replace(':', '')}00Z-${Math.random().toString(36).substr(2, 5)}@bhasvic.ac.uk`
                });
             });
          }

          // After college day
          const eveningEventsCell = row[structure.eveningEventsColIndex];
          if (eveningEventsCell) {
            const rawEvents = String(eveningEventsCell).split(/\r?\n/);
             rawEvents.forEach(rawEvent => {
                if (!rawEvent.trim() || rawEvent.trim() === 'undefined') return;
                
                const details = extractEventDetails(rawEvent);
                events.push({
                  date: new Date(currentDate!),
                  description: details.description,
                  originalText: rawEvent,
                  startTime: details.startTime || "16:00", 
                  endTime: details.endTime || "17:00", 
                  staffInitials: details.staffInitials,
                  isPublic: details.isPublic,
                  uid: `${formatDateForUid(currentDate!)}T${(details.startTime || "1600").replace(':', '')}00Z-${Math.random().toString(36).substr(2, 5)}@bhasvic.ac.uk`
                });
             });
          }
          
          rowCount++;
        }

        onLog({ id: '3', timestamp: new Date(), message: `Scanned ${rowCount} data rows (dates found).`, type: 'info' });
        
        if (events.length === 0) {
            onLog({ id: '4', timestamp: new Date(), message: `No events extracted. Please check if the 'During the college day' column is populated.`, type: 'warning' });
        } else {
            onLog({ id: '4', timestamp: new Date(), message: `Successfully extracted ${events.length} events.`, type: 'success' });
        }

        resolve(events);

      } catch (err: any) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};
