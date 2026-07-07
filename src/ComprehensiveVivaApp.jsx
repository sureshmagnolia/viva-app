import React, { useState, useEffect } from 'react';
import { BookOpen, Trash2 } from 'lucide-react';
import './index.css';

import DetailsForm from './components/DetailsForm';
import CompStudentsTab from './components/CompStudentsTab';
import CompExaminerTab from './components/CompExaminerTab';
import CompMarklistTab from './components/CompMarklistTab';
import CompPrintableMarklist from './components/CompPrintableMarklist';
import ClearDataModal from './components/ClearDataModal';

function ComprehensiveVivaApp() {
  const queryParams = new URLSearchParams(window.location.search);
  const printMode = queryParams.get('print');

  const [details, setDetails] = useState(() => {
    const saved = localStorage.getItem('comp_viva_details');
    return saved ? JSON.parse(saved) : {
      centre: '',
      date: '',
      courseCode: 'Viva Voce / BOT4V01'
    };
  });

  const [students, setStudents] = useState(() => {
    const defaultGrades = {};
    for(let i=1; i<=15; i++) defaultGrades[`q${i}`] = 'A+';

    const saved = localStorage.getItem('comp_viva_students');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Patch old state that might be missing ex1 and ex2
      return parsed.map(s => ({
        ...s,
        ex1: s.ex1 || { ...defaultGrades },
        ex2: s.ex2 || { ...defaultGrades }
      }));
    }
    
    return [
      { 
        id: '1', 
        registerNumber: '', 
        name: '',
        ex1: { ...defaultGrades },
        ex2: { ...defaultGrades }
      }
    ];
  });

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
    localStorage.removeItem('comp_viva_details');
    localStorage.removeItem('comp_viva_students');
    setDetails({ centre: '', date: '', courseCode: 'Viva Voce / BOT4V01' });
    
    const defaultGrades = {};
    for(let i=1; i<=15; i++) defaultGrades[`q${i}`] = 'A+';
    setStudents([
      { 
        id: '1', registerNumber: '', name: '',
        ex1: { ...defaultGrades }, ex2: { ...defaultGrades }
      }
    ]);
    setCurrentTab('students');
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
      <header className="header glass-panel" style={{ background: 'linear-gradient(to right, #4c1d95, #6d28d9)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <BookOpen size={32} color="#a78bfa" />
          <h1 className="header-title">Comprehensive Viva Marks Consolidator</h1>
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
