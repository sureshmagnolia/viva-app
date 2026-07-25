import React, { useEffect } from 'react';
import { calculateExaminerWGP, calculateFinalGradePoint, getFinalGrade } from '../utils/compCalculations';

const CompPrintableMarklist = ({ details, students }) => {
  useEffect(() => {
    document.body.classList.add('print-mode');
    return () => {
      document.body.classList.remove('print-mode');
    };
  }, []);

  const rowCount = students.length || 1;
  // Dynamically scale vertical padding so fewer rows stretch to fill the page
  const dynamicPadding = Math.max(5, Math.min(30, Math.floor(250 / rowCount)));

  return (
    <div className="printable-marklist">
      <div className="no-print" style={{ textAlign: 'center', margin: '20px 0' }}>
        <button 
          onClick={() => window.print()} 
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Print Marklist
        </button>
      </div>

      <div className="print-header">
        <h1 className="print-title">UNIVERSITY OF CALICUT 4 SEM M.Sc. BOTANY (CBCSS) PRACTICAL EXAMINATION, April 2026</h1>
        <h2 className="print-subtitle">GRADE SHEET OF COMPREHENSIVE VIVA VOCE</h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '20px' }}>
        <p>Name of the centre: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{details.centre || ''}</p>
        <p>Date of examination: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{details.date ? details.date.split('-').reverse().join('/') : ''}</p>
        <p>Course name /Course code : &nbsp;&nbsp;{details.courseCode || ''}</p>
      </div>

      <table className="print-table">
        <thead>
          <tr>
            <th style={{ width: '25%' }}>Register Number</th>
            <th style={{ width: '50%' }}>Name of the candidate</th>
            <th style={{ width: '25%' }}>Weighted Grade Point<br/>(150)</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => {
            const ex1Wgp = calculateExaminerWGP(student.ex1);
            const ex2Wgp = calculateExaminerWGP(student.ex2);
            const finalWgp = (ex1Wgp + ex2Wgp) / 2;

            return (
              <tr key={student.id}>
                <td data-label="Reg No." style={{ textAlign: 'center', padding: `${dynamicPadding}px 4px` }}>{student.registerNumber}</td>
                <td data-label="Name" style={{ padding: `${dynamicPadding}px 4px` }}>{student.name}</td>
                <td data-label="Grade Point" style={{ textAlign: 'center', padding: `${dynamicPadding}px 4px` }}>{finalWgp}</td>
              </tr>
            );
          })}
          {/* Empty spacer row to push the footer down if there are few students */}
          <tr className="no-border-row">
            <td colSpan={3} style={{ height: '30px', border: 'none' }}></td>
          </tr>
        </tbody>
      </table>

      <div style={{ marginTop: '50px', fontSize: '10pt', width: '100%' }}>
        <p style={{ marginBottom: '50px' }}>Name and Signature of Examiners</p>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ marginLeft: '40px' }}>1</span>
          <span>2</span>
          <span style={{ marginRight: '80px' }}>Chairman</span>
        </div>
      </div>
    </div>
  );
};

export default CompPrintableMarklist;
