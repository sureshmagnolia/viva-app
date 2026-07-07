import React from 'react';
import { Download } from 'lucide-react';
import { generatePDF } from '../utils/pdfGenerator';
import PrintableMarklist from './PrintableMarklist';

const MarklistTab = ({ details, students }) => {
  const handlePrintHTML = () => {
    window.open(window.location.pathname + '?print=marklist', '_blank');
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Final Marklist Preview</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={handlePrintHTML}>
            Open HTML for Print
          </button>
          <button className="btn btn-primary" onClick={() => generatePDF(details, students)}>
            <Download size={18} />
            Download PDF
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', background: '#f8fafc', padding: '2rem', borderRadius: '8px', overflowX: 'auto' }}>
        <PrintableMarklist details={details} students={students} previewMode={true} />
      </div>
    </div>
  );
};

export default MarklistTab;
