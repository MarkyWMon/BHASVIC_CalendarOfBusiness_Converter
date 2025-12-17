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
  try {
    const response = await fetch(LOGO_URL, {
      method: 'GET',
      mode: 'cors', // Ensure CORS request
      cache: 'force-cache'
    });
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn("Could not load logo image for PDF", error);
    return null;
  }
};

export const generatePDF = async (events: CalendarEvent[], includeInitials: boolean, title: string, showPublicColumn: boolean = true): Promise<Blob> => {
  // Orientation 'p' (portrait), unit 'mm', format 'a4'
  const doc = new jsPDF('p', 'mm', 'a4');
  
  // -- Header --
  
  // BHASVIC Title
  doc.setFont('helvetica', 'bold');
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

  // Draw Logo (Fetch async)
  const logoData = await fetchLogo();
  if (logoData) {
    // Position: Top right. 
    // Previous vector center was (190, 24) with radius 9 (approx width 18).
    // Let's place the image at x=181, y=15, width=18, height=18 to match roughly.
    try {
      doc.addImage(logoData, 'PNG', 181, 15, 18, 18);
    } catch (e) {
      console.warn("Error adding image to PDF", e);
    }
  }

  let finalY = 40;

  const grouped = groupEventsByMonth(events);

  grouped.forEach((group, index) => {
    // Check if we need a page break before the month title
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

    const tableHead = showPublicColumn 
      ? [['Date', 'Time', 'Event Description', 'Public']] 
      : [['Date', 'Time', 'Event Description']];

    const tableBody = group.events.map(e => {
      const timeStr = `${e.startTime} - ${e.endTime}`;
      let desc = e.description;
      if (includeInitials && e.staffInitials) {
        desc += ` (${e.staffInitials})`;
      }
      
      const row = [
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
      0: { cellWidth: 30 }, // Date
      1: { cellWidth: 25 }, // Time
      2: { cellWidth: 'auto' }, // Event
    };

    if (showPublicColumn) {
      columnStyles[3] = { cellWidth: 15, halign: 'center' }; // Public
    }

    autoTable(doc, {
      startY: finalY,
      head: tableHead,
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
      columnStyles: columnStyles,
      alternateRowStyles: {
        fillColor: [249, 250, 251] // Very light gray/blue
      },
      margin: { left: 14, right: 14 }
    });

    // Update Y for next loop
    finalY = (doc as any).lastAutoTable.finalY + 15;
  });

  // -- Footer & Page Numbering --
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(COLORS.gray[0], COLORS.gray[1], COLORS.gray[2]);
    
    // Draw a subtle line separator
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.1);
    doc.line(14, 285, 196, 285);

    // Footer Text
    doc.text('BHASVIC Calendar', 14, 290);
    doc.text(`Page ${i} of ${pageCount}`, 196, 290, { align: 'right' });
  }

  return doc.output('blob');
};