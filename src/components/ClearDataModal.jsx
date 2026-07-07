import React, { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

const ClearDataModal = ({ isOpen, onClose, onConfirm, appName }) => {
  const [step, setStep] = useState(1);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (step === 1) {
      setStep(2);
    } else {
      onConfirm();
      setStep(1);
      onClose();
    }
  };

  const handleCancel = () => {
    setStep(1);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(4px)'
    }}>
      <div className="glass-panel animate-fade-in" style={{
        maxWidth: '450px',
        width: '90%',
        padding: '2rem',
        position: 'relative',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)'
      }}>
        <button 
          onClick={handleCancel}
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
        >
          <X size={24} />
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1rem' }}>
          <div style={{ 
            width: '64px', height: '64px', 
            borderRadius: '50%', 
            background: 'rgba(239, 68, 68, 0.1)', 
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            color: '#ef4444',
            marginBottom: '0.5rem'
          }}>
            <AlertTriangle size={32} />
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, color: '#fff' }}>
            {step === 1 ? 'Clear All Data?' : 'Final Warning!'}
          </h2>
          
          <p style={{ color: '#cbd5e1', fontSize: '1rem', lineHeight: '1.5', margin: 0 }}>
            {step === 1 
              ? `Are you sure you want to permanently delete all students and grades for the ${appName}?` 
              : `This action CANNOT be undone. ALL data will be lost forever. Are you absolutely certain you want to proceed?`
            }
          </p>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', width: '100%' }}>
            <button 
              className="btn btn-secondary" 
              style={{ flex: 1, padding: '0.75rem' }} 
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button 
              className="btn btn-danger" 
              style={{ flex: 1, padding: '0.75rem', display: 'flex', justifyContent: 'center', gap: '8px' }} 
              onClick={handleConfirm}
            >
              {step === 1 ? (
                'Yes, clear data'
              ) : (
                <>
                  <Trash2 size={18} />
                  Permanently Delete
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClearDataModal;
