import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { calculateStudentScores } from './calculations';

export const generatePDF = (details, students) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Calculate scaling and center positions
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Custom headers
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("UNIVERSITY OF CALICUT", pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(9);
  doc.text("4 SEM M.Sc. BOTANY (CBCSS) PRACTICAL EXAMINATION, APRIL 2026", pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(9);
  doc.text("GRADE SHEET OF DISSERTATION EVALUATION", pageWidth / 2, 25, { align: 'center' });

  // Details section
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Name of the centre:           ${details.centre}`, 14, 35);
  doc.text(`Date of examination:          ${details.date}`, 14, 40);
  doc.text(`Course name /Course code :    ${details.courseCode}`, 14, 45);

  // Table Data
  const head = [
    [
      { content: 'Register\nNumber', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'Name of the candidate', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'Weighted Grade Point', colSpan: 5, styles: { halign: 'center' } },
      { content: 'Signature of\nExaminers', colSpan: 2, styles: { halign: 'center' } }
    ],
    [
      'Dissertation\n(90)',
      'Presentation\n(30)',
      'Viva voce\n(30)',
      'Total\n(150)',
      'Total in\n200',
      '1',
      '2'
    ]
  ];

  const body = students.map(s => {
    const scores = calculateStudentScores(s);

    return [
      s.registerNumber,
      s.name,
      scores.dissertationTotal > 0 ? scores.dissertationTotal.toString() : '',
      scores.presentationTotal > 0 ? scores.presentationTotal.toString() : '',
      scores.vivaTotal > 0 ? scores.vivaTotal.toString() : '',
      scores.total150 > 0 ? scores.total150.toString() : '',
      scores.total200 > 0 ? parseFloat(scores.total200.toFixed(2)).toString() : '',
      '', // Signature 1 empty space
      ''  // Signature 2 empty space
    ];
  });

  // Add Examiner Signature Rows at the end
  const footerRows = [
    [{ content: '', colSpan: 9, styles: { minCellHeight: 6, fillColor: [255,255,255] } }],
    [
      { content: 'Name and Signature of Examiners', colSpan: 3, styles: { fontStyle: 'bold', halign: 'left', lineWidth: 0 } },
      { content: '', colSpan: 6, styles: { lineWidth: 0 } }
    ],
    [
      { content: '', styles: { lineWidth: 0 } },
      { content: '1................................................', colSpan: 4, styles: { lineWidth: 0, halign: 'left' } },
      { content: '2................................................', colSpan: 4, styles: { lineWidth: 0, halign: 'left' } }
    ],
    [
      { content: '', styles: { lineWidth: 0 } },
      { content: '3................................................', colSpan: 4, styles: { lineWidth: 0, halign: 'left' } },
      { content: '4................................................', colSpan: 4, styles: { lineWidth: 0, halign: 'left' } }
    ]
  ];

  const rowCount = students.length || 1;
  const availableHeight = 170; 
  const targetRowHeight = availableHeight / rowCount;
  const dynamicPadding = Math.max(0.5, Math.min(8, (targetRowHeight - 3) / 2));

  autoTable(doc, {
    startY: 50,
    margin: { top: 50, bottom: 15, left: 14, right: 14 },
    head: head,
    body: [...body, ...footerRows],
    theme: 'grid',
    styles: {
      fontSize: 7, // Reduced font size to prevent any text wrapping
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
      cellPadding: 0.5, // Tiny base padding
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'normal',
      halign: 'center',
      cellPadding: 1,
    },
    columnStyles: {
      0: { cellWidth: 22, halign: 'center' }, // Register Number
      1: { cellWidth: 42 }, // Name
      2: { cellWidth: 16, halign: 'center' }, // Dissertation
      3: { cellWidth: 16, halign: 'center' }, // Presentation
      4: { cellWidth: 14, halign: 'center' }, // Viva
      5: { cellWidth: 14, halign: 'center' }, // Total (150)
      6: { cellWidth: 14, halign: 'center' }, // Total in 200
      7: { cellWidth: 22 }, // Sig 1
      8: { cellWidth: 22 }, // Sig 2
    },
    didParseCell: function (data) {
      if (data.section === 'body') {
        if (data.row.index < students.length) {
          // Apply dynamic padding ONLY to top/bottom so we don't squish the horizontal space!
          data.cell.styles.cellPadding = {
            top: dynamicPadding,
            bottom: dynamicPadding,
            left: 1,
            right: 1
          };
        } else {
          // Remove borders for footer rows
          data.cell.styles.lineWidth = 0;
          data.cell.styles.cellPadding = 2; // Fixed small padding for footers
        }
      }
    }
  });

  doc.save('Project_Marklist.pdf');
};
