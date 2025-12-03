import { CalendarEvent } from '../types';

export const generateCSV = (events: CalendarEvent[], includeInitials: boolean): string => {
  // CSV Headers compatible with generic calendar imports (e.g. Outlook, Google)
  const headers = [
    'Subject',
    'Start Date',
    'Start Time',
    'End Date',
    'End Time',
    'Description',
    'Private'
  ];

  const rows = events.map(e => {
    // Format Date as DD/MM/YYYY
    const day = e.date.getDate().toString().padStart(2, '0');
    const month = (e.date.getMonth() + 1).toString().padStart(2, '0');
    const year = e.date.getFullYear();
    const dateStr = `${day}/${month}/${year}`;

    let subject = e.description;
    if (includeInitials && e.staffInitials) subject += ` (${e.staffInitials})`;
    
    // Escape quotes for CSV (doubling double quotes) and wrap in quotes
    const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;

    return [
      escape(subject),
      escape(dateStr),
      escape(e.startTime),
      escape(dateStr), // Assuming single day events for now
      escape(e.endTime),
      escape(e.originalText), // Description/Notes
      e.isPublic ? "False" : "True"
    ].join(',');
  });
  
  return [headers.join(','), ...rows].join('\n');
};