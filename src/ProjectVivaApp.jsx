import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Trash2 } from 'lucide-react';
import DetailsForm from './components/DetailsForm';
import StudentsTab from './components/StudentsTab';
import ProjectGradesTab from './components/ProjectGradesTab';
import PresentationVivaTab from './components/PresentationVivaTab';
import MarklistTab from './components/MarklistTab';
import PrintableMarklist from './components/PrintableMarklist';
import ClearDataModal from './components/ClearDataModal';
import './index.css';

function ProjectVivaApp() {
  const queryParams = new URLSearchParams(window.location.search);
  const printMode = queryParams.get('print');

  const [details, setDetails] = useState(() => {
    const saved = localStorage.getItem('viva_marks_details');
    return saved ? JSON.parse(saved) : {
      centre: '',
      date: '',
      courseCode: ''
    };
  });

  const [students, setStudents] = useState(() => {
    const saved = localStorage.getItem('viva_marks_students');
    return saved ? JSON.parse(saved) : [
      { 
        id: '1', registerNumber: '', name: '', topic: '',
        structural: 'A+', editing: 'A+', references: 'A+', title: 'A+', supporting: 'A+', results: 'A+', novelty: 'A+',
        presentationEx1: 'A+', presentationEx2: 'A+', vivaEx1: 'A+', vivaEx2: 'A+' 
      }
    ];
  });

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
    localStorage.removeItem('viva_marks_details');
    localStorage.removeItem('viva_marks_students');
    setDetails({ centre: '', date: '', courseCode: '' });
    setStudents([
      { 
        id: '1', registerNumber: '', name: '', topic: '',
        structural: 'A+', editing: 'A+', references: 'A+', title: 'A+', supporting: 'A+', results: 'A+', novelty: 'A+',
        presentationEx1: 'A+', presentationEx2: 'A+', vivaEx1: 'A+', vivaEx2: 'A+' 
      }
    ]);
    setCurrentTab('students');
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
        <button 
          className="btn btn-danger" 
          onClick={() => setIsClearModalOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}
        >
          <Trash2 size={18} />
          Reset App Data
        </button>
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
