export interface CalendarEvent {
  date: Date;
  description: string;
  originalText: string;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  staffInitials?: string;
  isPublic: boolean;
  uid: string;
}

export interface ProcessingOptions {
  includeInitials: boolean;
  createPublicCalendar: boolean;
  defaultStartTime: string; // HH:MM
  defaultEndTime: string; // HH:MM
}

export interface ProcessingLog {
  id: string;
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

export interface ParsedResult {
  allEvents: CalendarEvent[];
  publicEvents: CalendarEvent[];
  mainIcsContent: string;
  publicIcsContent: string | null;
  mainCsvContent: string;
  publicCsvContent: string | null;
  mainPdfBlob: Blob | null;
  publicPdfBlob: Blob | null;
}