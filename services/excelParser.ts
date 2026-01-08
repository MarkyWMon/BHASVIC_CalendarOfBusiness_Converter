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

/**
 * Ensures that any opened brackets are closed and cleans up trailing 
 * punctuation/separators often left behind after parsing.
 */
const cleanAndBalanceText = (text: string): string => {
  let cleaned = text.trim();
  
  // 1. Remove trailing dashes, colons, or stray opening brackets at the very end
  // e.g., "Event (ABC -" becomes "Event (ABC"
  cleaned = cleaned.replace(/[\s\-\:\(\[]+$/, '');

  // 2. Balance brackets
  const stack: string[] = [];
  const openers = ['(', '['];
  const closers = [')', ']'];
  const map: Record<string, string> = { '(': ')', '[': ']' };

  for (const char of cleaned) {
    if (openers.includes(char)) {
      stack.push(map[char]);
    } else if (closers.includes(char)) {
      if (stack.length > 0 && stack[stack.length - 1] === char) {
        stack.pop();
      }
    }
  }

  // Append missing closing brackets from the stack
  while (stack.length > 0) {
    cleaned += stack.pop();
  }

  // 3. Final cleanup for empty brackets like "Event ()"
  cleaned = cleaned.replace(/\(\s*\)/g, '').replace(/\[\s*\]/g, '').trim();
  
  return cleaned;
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
  const publicMatch = text.match(PUBLIC_MARKER_PATTERN) || rawText.match(/\([A-Z]{2,3}\s*-\s*[pP]\)/);
  if (publicMatch) {
    isPublic = true;
    text = text.replace(PUBLIC_MARKER_PATTERN, '');
  }

  // 3. Detect and extract Staff Initials
  const initialsMatch = text.match(INITIALS_PATTERN);
  if (initialsMatch) {
    staffInitials = initialsMatch[1] || initialsMatch[2];
    text = text.replace(initialsMatch[0], ' ');
  }
  
  // 4. Robust Cleanup and Balancing
  text = cleanAndBalanceText(text);

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
  
  if (excelDate instanceof Date) {
    if (isNaN(excelDate.getTime())) return null;
    return excelDate;
  }

  if (typeof excelDate === 'number') {
    const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
    return date;
  }
  
  if (typeof excelDate === 'string') {
    const trimmed = excelDate.trim();
    const d = new Date(trimmed);
    if (!isNaN(d.getTime()) && d.getFullYear() > 2000) return d;
    
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

const detectStructure = (data: any[][], onLog: (l: ProcessingLog) => void): SheetStructure => {
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
        if (headerRowIndex === -1) headerRowIndex = i;
        eveningEventsColIndex = j;
      }
    }
    
    if (headerRowIndex !== -1 && dayEventsColIndex !== -1) break;
  }

  if (headerRowIndex === -1) {
    throw new Error("Could not find header row (looked for 'During the college day'). File structure might be invalid.");
  }

  let dateColIndex = -1;
  const potentialCols: {[key: number]: number} = {}; 
  
  for (let i = headerRowIndex + 1; i < Math.min(data.length, headerRowIndex + 15); i++) {
    const row = data[i];
    if (!row) continue;
    for (let j = 0; j < dayEventsColIndex; j++) {
       if (parseExcelDate(row[j])) {
         potentialCols[j] = (potentialCols[j] || 0) + 1;
       }
    }
  }

  let maxMatches = 0;
  Object.entries(potentialCols).forEach(([colStr, matches]) => {
    if (matches > maxMatches) {
      maxMatches = matches;
      dateColIndex = parseInt(colStr, 10);
    }
  });

  if (dateColIndex === -1) {
     dateColIndex = Math.max(0, dayEventsColIndex - 1);
     onLog({ id: 's1', timestamp: new Date(), message: `Warning: Could not auto-detect date column. Defaulting to column ${dateColIndex}.`, type: 'warning' });
  }

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
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        if (jsonData.length < 2) {
            throw new Error("Sheet appears to be empty or malformed.");
        }

        let structure: SheetStructure;
        try {
           structure = detectStructure(jsonData, onLog);
        } catch (err: any) {
           onLog({ id: 'err1', timestamp: new Date(), message: `Detection failed: ${err.message}. Trying default indices.`, type: 'warning' });
           structure = { headerRowIndex: 0, dateColIndex: 2, dayEventsColIndex: 3, eveningEventsColIndex: 4 };
        }

        const events: CalendarEvent[] = [];
        let currentDate: Date | null = null;
        let rowCount = 0;

        for (let i = structure.headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;

          const cellDate = row[structure.dateColIndex];
          if (cellDate) {
            const parsedDate = parseExcelDate(cellDate);
            if (parsedDate) {
              currentDate = parsedDate;
            }
          }

          if (!currentDate) continue; 

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

        onLog({ id: '3', timestamp: new Date(), message: `Scanned ${rowCount} data rows.`, type: 'info' });
        
        if (events.length === 0) {
            onLog({ id: '4', timestamp: new Date(), message: `No events extracted.`, type: 'warning' });
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