import React, { useState, useEffect, useRef } from 'react';
import { FileSpreadsheet, Trash2, Download, Upload, Undo2, Redo2 } from 'lucide-react';
import DetailsForm from './components/DetailsForm';
import StudentsTab from './components/StudentsTab';
import ProjectGradesTab from './components/ProjectGradesTab';
import PresentationVivaTab from './components/PresentationVivaTab';
import MarklistTab from './components/MarklistTab';
import PrintableMarklist from './components/PrintableMarklist';
import ClearDataModal from './components/ClearDataModal';
import './index.css';

function ProjectVivaApp({ 
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

  // Fallback internal state if not provided as props
  const [internalDetails, setInternalDetails] = useState(() => {
    const saved = localStorage.getItem('viva_marks_details');
    return saved ? JSON.parse(saved) : { centre: '', date: '', courseCode: '' };
  });

  const [internalStudents, setInternalStudents] = useState(() => {
    const saved = localStorage.getItem('viva_marks_students');
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
    localStorage.setItem('viva_marks_details', JSON.stringify(details));
    localStorage.setItem('viva_marks_students', JSON.stringify(students));
  }, [details, students]);

  const handleChange = (id, field, value) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleClearAllData = () => {
    if (onResetData) {
      onResetData();
    } else {
      localStorage.removeItem('viva_marks_details');
      localStorage.removeItem('viva_marks_students');
      setDetails({ centre: '', date: '', courseCode: '' });
      setStudents([]);
    }
    setCurrentTab('students');
  };

  const handleExportJSON = () => {
    const data = {
      app: 'ProjectVivaApp',
      timestamp: new Date().toISOString(),
      details,
      students
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Project_Viva_Backup_${new Date().toISOString().split('T')[0]}.json`;
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
        if (data.app === 'ProjectVivaApp' && data.details && data.students) {
          setDetails(data.details);
          setStudents(data.students);
          alert('Data imported successfully!');
        } else {
          alert('Error: Invalid Project Viva backup file.');
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
    { id: 'project', label: '2. Project Grades' },
    { id: 'viva', label: '3. Presentation & Viva' },
    { id: 'marklist', label: '4. Final Marklist' }
  ];

  if (printMode === 'marklist') {
    return <PrintableMarklist details={details} students={students} />;
  }

  return (
    <div className="app-container">
      <header className="header glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FileSpreadsheet size={32} color="#60a5fa" />
          <h1 className="header-title">Project Viva Marks Consolidator</h1>
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
              <StudentsTab students={students} setStudents={setStudents} handleChange={handleChange} />
            )}
            {currentTab === 'project' && (
              <ProjectGradesTab students={students} handleChange={handleChange} />
            )}
            {currentTab === 'viva' && (
              <PresentationVivaTab students={students} handleChange={handleChange} />
            )}
            {currentTab === 'marklist' && (
              <MarklistTab details={details} students={students} />
            )}
          </div>
        </section>
      </main>

      <ClearDataModal 
        isOpen={isClearModalOpen} 
        onClose={() => setIsClearModalOpen(false)} 
        onConfirm={handleClearAllData}
        appName="Project Viva App"
      />
    </div>
  );
}

export default ProjectVivaApp;
