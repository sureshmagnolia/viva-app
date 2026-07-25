import React from 'react';
import { Download } from 'lucide-react';
import { calculateExaminerWGP, calculateFinalGradePoint, getFinalGrade } from '../utils/compCalculations';
import { generateCompPDF } from '../utils/compPdfGenerator';
import CompPrintableMarklist from './CompPrintableMarklist';

const CompMarklistTab = ({ details, students }) => {
  const handlePrintHTML = () => {
    // Open in new tab with print=marklist&app=comp
    window.open(window.location.pathname + '?print=marklist&app=comp', '_blank');
  };

  const handleDownloadPDF = () => {
    generateCompPDF(details, students);
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginBottom: '1.5rem' }}>
        <button className="btn btn-secondary" onClick={handlePrintHTML}>
          Preview HTML / Print
        </button>
        <button className="btn btn-primary" onClick={handleDownloadPDF}>
          <Download size={18} />
          Download PDF
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', background: '#f8fafc', padding: '2rem', borderRadius: '8px', overflowX: 'auto' }}>
        <CompPrintableMarklist details={details} students={students} previewMode={true} />
      </div>
    </div>
  );
};

export default CompMarklistTab;
