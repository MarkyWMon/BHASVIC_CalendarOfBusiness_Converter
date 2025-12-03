import { CalendarEvent } from '../types';

const formatDate = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
};

const formatTime = (timeStr: string): string => {
  return timeStr.replace(':', '') + '00'; // HH:MM -> HHMMSS
};

const escapeText = (text: string): string => {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
};

export const generateICS = (events: CalendarEvent[], includeInitials: boolean): string => {
  const chunks: string[] = [];

  // Header
  chunks.push('BEGIN:VCALENDAR');
  chunks.push('VERSION:2.0');
  chunks.push('PRODID:-//BHASVIC//Calendar Converter//EN');
  chunks.push('CALSCALE:GREGORIAN');
  chunks.push('METHOD:PUBLISH');
  chunks.push('X-WR-CALNAME:BHASVIC Calendar');
  chunks.push('X-WR-TIMEZONE:Europe/London');

  // Events
  events.forEach(event => {
    chunks.push('BEGIN:VEVENT');
    chunks.push(`UID:${event.uid}`);
    chunks.push(`DTSTAMP:${formatDate(new Date())}T${formatTime(new Date().toTimeString().slice(0, 5))}Z`);
    
    const dateStr = formatDate(event.date);
    chunks.push(`DTSTART:${dateStr}T${formatTime(event.startTime)}`);
    chunks.push(`DTEND:${dateStr}T${formatTime(event.endTime)}`);
    
    let summary = event.description;
    if (includeInitials && event.staffInitials) {
      summary += ` (${event.staffInitials})`;
    }
    chunks.push(`SUMMARY:${escapeText(summary)}`);
    
    chunks.push('END:VEVENT');
  });

  // Footer
  chunks.push('END:VCALENDAR');

  return chunks.join('\r\n');
};
