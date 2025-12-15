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

export const generatePDF = (events: CalendarEvent[], includeInitials: boolean, title: string): Blob => {
  // Orientation 'p' (portrait), unit 'mm', format 'a4'
  const doc = new jsPDF('p', 'mm', 'a4');
  
  // -- Header --
  
  // BHASVIC Title
  doc.setFont('helvetica', 'bold'); // Closest standard font to Poppins/Display
  doc.setFontSize(24);
  doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
  doc.text('BHASVIC', 14, 20);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(COLORS.red[0], COLORS.red[1], COLORS.red[2]);
  doc.text(title, 14, 28);

  // Generated Date
  doc.setFontSize(9);
  doc.setTextColor(COLORS.gray[0], COLORS.gray[1], COLORS.gray[2]);
  doc.text(`Generated on ${new Date().toLocaleDateString('en-GB')}`, 14, 34);

  let finalY = 40;

  const grouped = groupEventsByMonth(events);

  grouped.forEach((group, index) => {
    // Check if we need a page break before the month title
    // A4 height is ~297mm. If we are low on space (e.g., > 250), force break
    if (finalY > 250) {
      doc.addPage();
      finalY = 20;
    }

    // Month Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
    doc.text(group.month.toUpperCase(), 14, finalY);
    
    // Draw decorative line under month
    doc.setDrawColor(COLORS.red[0], COLORS.red[1], COLORS.red[2]);
    doc.setLineWidth(0.5);
    doc.line(14, finalY + 2, 196, finalY + 2);

    finalY += 5;

    const tableBody = group.events.map(e => {
      const timeStr = `${e.startTime} - ${e.endTime}`;
      let desc = e.description;
      if (includeInitials && e.staffInitials) {
        desc += ` (${e.staffInitials})`;
      }
      return [
        formatPdfDate(e.date),
        timeStr,
        desc,
        e.isPublic ? 'Yes' : 'No'
      ];
    });

    autoTable(doc, {
      startY: finalY,
      head: [['Date', 'Time', 'Event Description', 'Public']],
      body: tableBody,
      theme: 'grid',
      styles: {
        font: 'helvetica', // Closest to Roboto
        fontSize: 9,
        cellPadding: 3,
        lineColor: [230, 230, 230],
        lineWidth: 0.1,
        textColor: [30, 30, 30]
      },
      headStyles: {
        fillColor: COLORS.navy as any,
        textColor: COLORS.white as any,
        fontStyle: 'bold',
        font: 'helvetica',
        halign: 'left'
      },
      columnStyles: {
        0: { cellWidth: 30 }, // Date
        1: { cellWidth: 25 }, // Time
        2: { cellWidth: 'auto' }, // Event
        3: { cellWidth: 15, halign: 'center' } // Public
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251] // Very light gray/blue
      },
      margin: { left: 14, right: 14 }
    });

    // Update Y for next loop
    finalY = (doc as any).lastAutoTable.finalY + 15;
  });

  return doc.output('blob');
};