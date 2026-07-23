import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Trash2, Download, Upload, Undo2, Redo2 } from 'lucide-react';
import { clearIndexedDB } from './utils/indexedDB';
import './index.css';

import DetailsForm from './components/DetailsForm';
import CompStudentsTab from './components/CompStudentsTab';
import CompExaminerTab from './components/CompExaminerTab';
import CompMarklistTab from './components/CompMarklistTab';
import CompPrintableMarklist from './components/CompPrintableMarklist';
import ClearDataModal from './components/ClearDataModal';

function ComprehensiveVivaApp({
  details: propDetails,
  setDetails: propSetDetails,
  students: propStudents,
  setStudents: propSetStudents,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onResetData
}) {
  const queryParams = new URLSearchParams(window.location.search);
  const printMode = queryParams.get('print');
  const fileInputRef = useRef(null);

  // Internal state fallbacks
  const [internalDetails, setInternalDetails] = useState(() => {
    const saved = localStorage.getItem('comp_viva_details');
    return saved ? JSON.parse(saved) : { centre: '', date: '', courseCode: 'Viva Voce / BOT4V01' };
  });

  const [internalStudents, setInternalStudents] = useState(() => {
    const saved = localStorage.getItem('comp_viva_students');
    return saved ? JSON.parse(saved) : [];
  });

  const details = propDetails || internalDetails;
  const setDetails = propSetDetails || setInternalDetails;
  const students = propStudents || internalStudents;
  const setStudents = propSetStudents || setInternalStudents;

  const [currentTab, setCurrentTab] = useState('students');
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  // Auto-save to localStorage
  useEffect(() => {
    localStorage.setItem('comp_viva_details', JSON.stringify(details));
    localStorage.setItem('comp_viva_students', JSON.stringify(students));
  }, [details, students]);

  const handleChange = (id, field, value, examiner = null) => {
    setStudents(prev => prev.map(s => {
      if (s.id !== id) return s;
      if (examiner) {
        return { ...s, [examiner]: { ...s[examiner], [field]: value } };
      }
      return { ...s, [field]: value };
    }));
  };

  const handleClearAllData = () => {
    if (onResetData) {
      onResetData();
    } else {
      localStorage.removeItem('comp_viva_details');
      localStorage.removeItem('comp_viva_students');
      clearIndexedDB();
      setDetails({ centre: '', date: '', courseCode: 'Viva Voce / BOT4V01' });
      setStudents([]);
    }
    setCurrentTab('students');
  };

  const handleExportJSON = () => {
    const data = {
      app: 'ComprehensiveVivaApp',
      timestamp: new Date().toISOString(),
      details,
      students
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Comp_Viva_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.app === 'ComprehensiveVivaApp' && data.details && data.students) {
          setDetails(data.details);
          setStudents(data.students);
          alert('Data imported successfully!');
        } else {
          alert('Error: Invalid Comprehensive Viva backup file.');
        }
      } catch (_err) {
        alert('Error reading JSON file.');
      }
      event.target.value = '';
    };
    reader.readAsText(file);
  };

  const tabs = [
    { id: 'students', label: '1. Students Data' },
    { id: 'examiner1', label: '2. Examiner 1' },
    { id: 'examiner2', label: '3. Examiner 2' },
    { id: 'marklist', label: '4. Final Marklist' }
  ];

  if (printMode === 'marklist') {
    return <CompPrintableMarklist details={details} students={students} />;
  }

  return (
    <div className="app-container">
      <header className="header glass-panel" style={{ background: 'linear-gradient(to right, #4c1d95, #6d28d9)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <BookOpen size={32} color="#a78bfa" />
          <h1 className="header-title">Comprehensive Viva Marks Consolidator</h1>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: '100%' }} className="header-actions">
          {onUndo && (
            <button 
              className="btn btn-secondary" 
              onClick={onUndo}
              disabled={!canUndo}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: canUndo ? 1 : 0.4, cursor: canUndo ? 'pointer' : 'not-allowed' }}
              title="Undo last change (Ctrl+Z)"
            >
              <Undo2 size={18} /> Undo
            </button>
          )}

          {onRedo && (
            <button 
              className="btn btn-secondary" 
              onClick={onRedo}
              disabled={!canRedo}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: canRedo ? 1 : 0.4, cursor: canRedo ? 'pointer' : 'not-allowed' }}
              title="Redo last change (Ctrl+Y)"
            >
              <Redo2 size={18} /> Redo
            </button>
          )}

          <input 
            type="file" 
            accept=".json" 
            ref={fileInputRef} 
            onChange={handleImportJSON} 
            style={{ display: 'none' }} 
          />
          <button 
            className="btn btn-secondary" 
            onClick={() => fileInputRef.current.click()}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', flex: '1 1 auto' }}
            title="Import Data from JSON file"
          >
            <Upload size={18} />
            Import
          </button>
          
          <button 
            className="btn btn-secondary" 
            onClick={handleExportJSON}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', flex: '1 1 auto' }}
            title="Export Data to JSON file"
          >
            <Download size={18} />
            Export
          </button>

          <button 
            className="btn btn-danger" 
            onClick={() => setIsClearModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', flex: '1 1 auto' }}
            title="Clear all local app data"
          >
            <Trash2 size={18} />
            Reset Data
          </button>
        </div>
      </header>

      <main style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <section>
          <DetailsForm details={details} setDetails={setDetails} />
        </section>

        <section className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
          <div className="tabs-header">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`tab-btn ${currentTab === tab.id ? 'active' : ''}`}
                onClick={() => setCurrentTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="tab-content" style={{ padding: '1.5rem' }}>
            {currentTab === 'students' && (
              <CompStudentsTab students={students} setStudents={setStudents} handleChange={handleChange} />
            )}
            {currentTab === 'examiner1' && (
              <CompExaminerTab students={students} handleChange={handleChange} examiner="ex1" title="Examiner 1" />
            )}
            {currentTab === 'examiner2' && (
              <CompExaminerTab students={students} handleChange={handleChange} examiner="ex2" title="Examiner 2" />
            )}
            {currentTab === 'marklist' && (
              <CompMarklistTab details={details} students={students} />
            )}
          </div>
        </section>
      </main>

      <ClearDataModal 
        isOpen={isClearModalOpen} 
        onClose={() => setIsClearModalOpen(false)} 
        onConfirm={handleClearAllData}
        appName="Comprehensive Viva App"
      />
    </div>
  );
}

export default ComprehensiveVivaApp;
