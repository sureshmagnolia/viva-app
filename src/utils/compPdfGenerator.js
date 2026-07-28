import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { calculateExaminerWGP, calculateFinalWGP, calculateFinalGradePoint, getFinalGrade } from './compCalculations';

export const generateCompPDF = (details, students) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("UNIVERSITY OF CALICUT 4 SEM M.Sc. BOTANY (CBCSS) PRACTICAL EXAMINATION, April 2026", pageWidth / 2, 20, { align: 'center' });
  doc.setFontSize(9);
  doc.text("GRADE SHEET OF COMPREHENSIVE VIVA VOCE", pageWidth / 2, 25, { align: 'center' });

  const formattedDate = details.date ? details.date.split('-').reverse().join('/') : '';

  // Details section
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Name of the centre:           ${details.centre}`, 14, 35);
  doc.text(`Date of examination:          ${formattedDate}`, 14, 40);
  doc.text(`Course name /Course code :    ${details.courseCode}`, 14, 45);

  // Table Data
  const tableData = students.map((student) => {
    const finalWgp = calculateFinalWGP(student);

    return [
      student.registerNumber,
      student.name,
      finalWgp.toString()
    ];
  });

  const rowCount = students.length || 1;
  const availableHeight = 160; 
  const targetRowHeight = availableHeight / rowCount;
  const dynamicPadding = Math.max(0.5, Math.min(8, (targetRowHeight - 3) / 2));

  let finalY = 50;

  autoTable(doc, {
    startY: 50,
    margin: { top: 20, right: 14, bottom: 25, left: 14 },
    head: [['Register Number', 'Name of the candidate', 'Weighted Grade Point\n(150)']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 1, // Base small padding
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
      textColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'normal',
      halign: 'center',
      valign: 'middle',
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 40, halign: 'center' },
      1: { cellWidth: 100, halign: 'left' },
      2: { cellWidth: 40, halign: 'center' }
    },
    didParseCell: function (data) {
      if (data.section === 'body') {
        data.cell.styles.cellPadding = dynamicPadding;
      }
    },
    didDrawPage: function (data) {
      finalY = data.cursor.y;
    }
  });

  // Footer: Signatures
  doc.setFontSize(9);
  doc.text("Name and Signature of Examiners", 14, finalY + 15);
  doc.text("1", 50, finalY + 25);
  doc.text("2", pageWidth / 2, finalY + 25, { align: 'center' });
  doc.text("Chairman", pageWidth - 30, finalY + 25, { align: 'right' });

  doc.save('Comprehensive_Viva_Marklist.pdf');
};
