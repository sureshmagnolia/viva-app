import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { calculateStudentScores, DISSERTATION_WEIGHTS } from '../utils/calculations';
import { getGradeColorStyle, GRADE_OPTION_STYLES } from '../utils/gradeColors';

const GRADES = ['', 'O', 'A+', 'A', 'B', 'C', 'D', 'E'];

const MarksTable = ({ students, setStudents }) => {
  const handleAddStudent = () => {
    setStudents(prev => [...prev, {
      id: Date.now().toString(),
      registerNumber: '',
      name: '',
      structural: '', editing: '', references: '', title: '', supporting: '', results: '', novelty: '',
      presentationEx1: '', presentationEx2: '', vivaEx1: '', vivaEx2: ''
    }]);
  };

  const handleRemoveStudent = (id) => {
    setStudents(prev => prev.filter(s => s.id !== id));
  };

  const handleChange = (id, field, value) => {
    setStudents(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, [field]: value };
      }
      return s;
    }));
  };

  const renderDropdown = (student, field, label, weight) => {
    const currentGrade = student[field] || '';
    const styleObj = getGradeColorStyle(currentGrade);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '500', display: 'flex', justifyContent: 'space-between' }}>
          <span>{label}</span>
          {weight && <span style={{ color: '#64748b' }}>(x{weight})</span>}
        </label>
        <select
          className="table-input"
          value={currentGrade}
          onChange={(e) => handleChange(student.id, field, e.target.value)}
          style={{
            padding: '8px',
            fontSize: '0.9rem',
            width: '100%',
            borderRadius: '6px',
            border: `1px solid ${styleObj.borderColor}`,
            backgroundColor: styleObj.backgroundColor,
            color: styleObj.color,
            fontWeight: styleObj.fontWeight,
            textShadow: styleObj.textShadow,
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}
        >
          {GRADES.map(g => (
            <option key={g} value={g} style={GRADE_OPTION_STYLES[g] || GRADE_OPTION_STYLES['']}>
              {g === '' ? 'Select...' : g}
            </option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {students.map((student) => {
          const scores = calculateStudentScores(student);

          return (
            <div key={student.id} className="glass-panel" style={{ padding: '1.5rem', position: 'relative' }}>
              <button 
                className="btn btn-danger btn-icon" 
                onClick={() => handleRemoveStudent(student.id)}
                title="Remove Student"
                style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}
              >
                <Trash2 size={18} />
              </button>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Header Row */}
                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', paddingRight: '3rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '1rem' }}>
                  <div style={{ flex: '1', minWidth: '200px' }}>
                    <label style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px', display: 'block' }}>Register Number</label>
                    <input
                      type="text"
                      className="table-input"
                      value={student.registerNumber}
                      onChange={(e) => handleChange(student.id, 'registerNumber', e.target.value)}
                      placeholder="e.g. TESTBT001"
                      style={{ fontSize: '1.1rem', fontWeight: 'bold' }}
                    />
                  </div>
                  <div style={{ flex: '2', minWidth: '250px' }}>
                    <label style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px', display: 'block' }}>Student Name</label>
                    <input
                      type="text"
                      className="table-input"
                      value={student.name}
                      onChange={(e) => handleChange(student.id, 'name', e.target.value)}
                      placeholder="Student Name"
                      style={{ fontSize: '1.1rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', background: 'rgba(15, 23, 42, 0.3)', padding: '0.5rem 1.5rem', borderRadius: '8px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Total (150)</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>{scores.total150 > 0 ? scores.total150 : '-'}</div>
                    </div>
                    <div style={{ width: '1px', height: '100%', background: 'rgba(255, 255, 255, 0.1)' }}></div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>In 200</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#60a5fa' }}>{scores.total200 > 0 ? Math.round(scores.total200) : '-'}</div>
                    </div>
                  </div>
                </div>

                {/* Grading Sections */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                  
                  {/* Dissertation section */}
                  <div style={{ background: 'rgba(15, 23, 42, 0.2)', padding: '1rem', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.5rem' }}>
                      <h4 style={{ color: '#e2e8f0', margin: 0 }}>Dissertation / Project (90)</h4>
                      <span style={{ color: '#10b981', fontWeight: 'bold' }}>{scores.dissertationTotal || '-'}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      {renderDropdown(student, 'structural', 'Structural', DISSERTATION_WEIGHTS.structural)}
                      {renderDropdown(student, 'editing', 'Editing', DISSERTATION_WEIGHTS.editing)}
                      {renderDropdown(student, 'references', 'References', DISSERTATION_WEIGHTS.references)}
                      {renderDropdown(student, 'title', 'Title & Content', DISSERTATION_WEIGHTS.title)}
                      {renderDropdown(student, 'supporting', 'Supporting', DISSERTATION_WEIGHTS.supporting)}
                      {renderDropdown(student, 'results', 'Results', DISSERTATION_WEIGHTS.results)}
                      {renderDropdown(student, 'novelty', 'Novelty', DISSERTATION_WEIGHTS.novelty)}
                    </div>
                  </div>

                  {/* Presentation & Viva Sections */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    <div style={{ background: 'rgba(15, 23, 42, 0.2)', padding: '1rem', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.5rem' }}>
                        <h4 style={{ color: '#e2e8f0', margin: 0 }}>Presentation (30)</h4>
                        <span style={{ color: '#10b981', fontWeight: 'bold' }}>{scores.presentationTotal || '-'}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        {renderDropdown(student, 'presentationEx1', 'Examiner 1', 1.5)}
                        {renderDropdown(student, 'presentationEx2', 'Examiner 2', 1.5)}
                      </div>
                    </div>

                    <div style={{ background: 'rgba(15, 23, 42, 0.2)', padding: '1rem', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.5rem' }}>
                        <h4 style={{ color: '#e2e8f0', margin: 0 }}>Viva Voce (30)</h4>
                        <span style={{ color: '#10b981', fontWeight: 'bold' }}>{scores.vivaTotal || '-'}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        {renderDropdown(student, 'vivaEx1', 'Examiner 1', 1.5)}
                        {renderDropdown(student, 'vivaEx2', 'Examiner 2', 1.5)}
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button className="btn btn-secondary" onClick={handleAddStudent} style={{ padding: '0.75rem 2rem' }}>
          <Plus size={18} />
          Add Student Row
        </button>
      </div>
    </div>
  );
};

export default MarksTable;
