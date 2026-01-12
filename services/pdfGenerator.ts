import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CalendarEvent } from '../types';

// BHASVIC Colors
const COLORS = {
  navy: [0, 35, 77],     // #00234D
  red: [230, 45, 60],    // #E62D3C
  gray: [128, 128, 128], // #808080
  lightGray: [245, 245, 245],
  white: [255, 255, 255]
};

const LOGO_URL = "https://i.postimg.cc/XN5gRCBn/round_logo_red_on_white_Edited_(1).png";

const formatPdfDate = (date: Date): string => {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const groupEventsByMonth = (events: CalendarEvent[]) => {
  const sorted = [...events].sort((a, b) => a.date.getTime() - b.date.getTime());
  const groups: Record<string, CalendarEvent[]> = {};
  
  sorted.forEach(event => {
    const key = event.date.toLocaleString('en-GB', { month: 'long', year: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(event);
  });

  return Object.entries(groups).map(([month, events]) => ({ month, events }));
};

const fetchLogo = async (): Promise<string | null> => {
  const fetchWithTimeout = async (url: string, timeout = 3000): Promise<Response> => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { 
        signal: controller.signal,
        mode: 'cors',
        cache: 'force-cache'
      });
      clearTimeout(id);
      return response;
    } catch (e) {
      clearTimeout(id);
      throw e;
    }
  };

  try {
    const response = await fetchWithTimeout(LOGO_URL);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn("Could not load logo image for PDF (likely timeout or CORS)", error);
    return null;
  }
};

export const generatePDF = async (
  events: CalendarEvent[], 
  includeInitials: boolean, 
  title: string, 
  showPublicColumn: boolean = true,
  defaultTimes?: { start: string, end: string }
): Promise<Blob> => {
  const doc = new jsPDF('p', 'mm', 'a4');
  
  // -- Header --
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
  doc.text('BHASVIC', 14, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(COLORS.red[0], COLORS.red[1], COLORS.red[2]);
  doc.text(title, 14, 28);

  doc.setFontSize(9);
  doc.setTextColor(COLORS.gray[0], COLORS.gray[1], COLORS.gray[2]);
  doc.text(`Generated on ${new Date().toLocaleDateString('en-GB')}`, 14, 34);

  // Add Caveat Text
  if (defaultTimes) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(COLORS.gray[0], COLORS.gray[1], COLORS.gray[2]);
    const caveat = "Details about timings for all day events will be published nearer the time.";
    doc.text(caveat, 14, 39);
  }

  // Fetch logo with safety timeout
  const logoData = await fetchLogo();
  if (logoData) {
    try {
      doc.addImage(logoData, 'PNG', 181, 15, 18, 18);
    } catch (e) {
      console.warn("Error adding image to PDF", e);
    }
  }

  let currentY = 45;
  const grouped = groupEventsByMonth(events);

  grouped.forEach((group) => {
    // Page break handling
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
    doc.text(group.month.toUpperCase(), 14, currentY);
    
    doc.setDrawColor(COLORS.red[0], COLORS.red[1], COLORS.red[2]);
    doc.setLineWidth(0.5);
    doc.line(14, currentY + 2, 196, currentY + 2);

    currentY += 5;

    const tableHead = showPublicColumn 
      ? [['Day', 'Date', 'Time', 'Event Description', 'Public']] 
      : [['Day', 'Date', 'Time', 'Event Description']];

    const tableBody = group.events.map(e => {
      // Check if this event uses the default "All Day" times
      const isAllDay = defaultTimes && e.startTime === defaultTimes.start && e.endTime === defaultTimes.end;
      const timeStr = isAllDay ? 'All Day' : `${e.startTime} - ${e.endTime}`;
      
      let desc = e.description;
      if (includeInitials && e.staffInitials) {
        desc += ` (${e.staffInitials})`;
      }
      
      const row = [
        e.date.toLocaleDateString('en-GB', { weekday: 'long' }),
        formatPdfDate(e.date),
        timeStr,
        desc
      ];

      if (showPublicColumn) {
        row.push(e.isPublic ? 'Yes' : 'No');
      }

      return row;
    });

    const columnStyles: any = {
      0: { cellWidth: 25 }, 
      1: { cellWidth: 30 }, 
      2: { cellWidth: 25 }, 
      3: { cellWidth: 'auto' }, 
    };

    if (showPublicColumn) {
      columnStyles[4] = { cellWidth: 15, halign: 'center' };
    }

    autoTable(doc, {
      startY: currentY,
      head: tableHead,
      body: tableBody,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: 4,
        lineColor: [230, 230, 230],
        lineWidth: 0.1,
        textColor: [30, 30, 30],
        valign: 'middle',
      },
      headStyles: {
        fillColor: COLORS.navy as any,
        textColor: COLORS.white as any,
        fontStyle: 'bold',
        font: 'helvetica',
        halign: 'left',
        valign: 'middle',
      },
      columnStyles: columnStyles,
      alternateRowStyles: {
        fillColor: [249, 250, 251]
      },
      margin: { left: 14, right: 14 }
    });

    const lastTable = (doc as any).lastAutoTable;
    currentY = (lastTable && lastTable.finalY) ? lastTable.finalY + 15 : currentY + 30;
  });

  // -- Footer & Page Numbering --
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(COLORS.gray[0], COLORS.gray[1], COLORS.gray[2]);
    
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.1);
    doc.line(14, 285, 196, 285);

    doc.text('BHASVIC Calendar', 14, 290);
    doc.text(`Page ${i} of ${pageCount}`, 196, 290, { align: 'right' });
  }

  return doc.output('blob');
};