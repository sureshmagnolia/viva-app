import React, { useEffect } from 'react';
import { calculateStudentScores } from '../utils/calculations';

const PrintableMarklist = ({ details, students, previewMode = false }) => {
  useEffect(() => {
    if (!previewMode) {
      document.body.classList.add('print-mode');
      return () => {
        document.body.classList.remove('print-mode');
      };
    }
  }, [previewMode]);

  const rowCount = students.length || 1;
  // Dynamically scale vertical padding so fewer rows stretch to fill the page
  const dynamicPadding = Math.max(3, Math.min(25, Math.floor(250 / rowCount)));

  return (
    <div className="printable-marklist" style={previewMode ? { boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' } : {}}>
      {!previewMode && (
        <div className="no-print" style={{ textAlign: 'center', margin: '20px 0' }}>
          <button 
            onClick={() => window.print()} 
            style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            Print Marklist
          </button>
        </div>
      )}

      <div className="print-header">
        <h1 className="print-title">UNIVERSITY OF CALICUT</h1>
        <h2 className="print-subtitle">4 SEM M.Sc. BOTANY (CBCSS) PRACTICAL EXAMINATION, APRIL 2026</h2>
        <h2 className="print-subtitle">GRADE SHEET OF DISSERTATION EVALUATION</h2>
      </div>

      <div className="print-details">
        <p>Name of the centre: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{details.centre || ''}</p>
        <p>Date of examination: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{details.date || ''}</p>
        <p>Course name /Course code : &nbsp;{details.courseCode || ''}</p>
      </div>

      <table className="print-table">
        <thead>
          <tr>
            <th rowSpan={2} style={{ width: '80px' }}>Register<br/>Number</th>
            <th rowSpan={2} style={{ width: '180px' }}>Name of the candidate</th>
            <th colSpan={5}>Weighted Grade Point</th>
            <th colSpan={2}>Signature of<br/>Examiners</th>
          </tr>
          <tr>
            <th style={{ width: '60px' }}>Dissertatio<br/>n (90)</th>
            <th style={{ width: '60px' }}>Presentati<br/>on (30)</th>
            <th style={{ width: '50px' }}>Viva<br/>voce (30)</th>
            <th style={{ width: '50px' }}>Total<br/>(150)</th>
            <th style={{ width: '50px' }}>Total in<br/>200</th>
            <th style={{ width: '60px' }}>1</th>
            <th style={{ width: '60px' }}>2</th>
          </tr>
        </thead>
        <tbody>
          {students.map(student => {
            const scores = calculateStudentScores(student);
            return (
              <tr key={student.id}>
                <td style={{ textAlign: 'center', padding: `${dynamicPadding}px 4px` }}>{student.registerNumber}</td>
                <td style={{ padding: `${dynamicPadding}px 4px` }}>{student.name}</td>
                <td style={{ textAlign: 'center', padding: `${dynamicPadding}px 4px` }}>{scores.dissertationTotal > 0 ? scores.dissertationTotal : ''}</td>
                <td style={{ textAlign: 'center', padding: `${dynamicPadding}px 4px` }}>{scores.presentationTotal > 0 ? scores.presentationTotal : ''}</td>
                <td style={{ textAlign: 'center', padding: `${dynamicPadding}px 4px` }}>{scores.vivaTotal > 0 ? scores.vivaTotal : ''}</td>
                <td style={{ textAlign: 'center', padding: `${dynamicPadding}px 4px` }}>{scores.total150 > 0 ? scores.total150 : ''}</td>
                <td style={{ textAlign: 'center', padding: `${dynamicPadding}px 4px` }}>{scores.total200 > 0 ? scores.total200.toFixed(2) : ''}</td>
                <td style={{ padding: `${dynamicPadding}px 4px` }}></td>
                <td style={{ padding: `${dynamicPadding}px 4px` }}></td>
              </tr>
            );
          })}
          {/* Empty spacer row */}
          <tr className="no-border-row">
            <td colSpan={9} style={{ height: '30px', border: 'none' }}></td>
          </tr>
          {/* Footer rows */}
          <tr className="no-border-row">
            <td colSpan={3} style={{ fontWeight: 'bold', border: 'none' }}>Name and Signature of Examiners</td>
            <td colSpan={6} style={{ border: 'none' }}></td>
          </tr>
          <tr className="no-border-row">
            <td colSpan={1} style={{ border: 'none' }}></td>
            <td colSpan={4} style={{ border: 'none' }}>1................................................</td>
            <td colSpan={4} style={{ border: 'none' }}>2................................................</td>
          </tr>
          <tr className="no-border-row">
            <td colSpan={1} style={{ border: 'none' }}></td>
            <td colSpan={4} style={{ border: 'none' }}>3................................................</td>
            <td colSpan={4} style={{ border: 'none' }}>4................................................</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default PrintableMarklist;
