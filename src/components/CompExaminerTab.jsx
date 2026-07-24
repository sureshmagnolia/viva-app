import React from 'react';
import { getGradeColorStyle, GRADE_OPTION_STYLES } from '../utils/gradeColors';

const CompExaminerTab = ({ 
  students, 
  handleChange, 
  examiner, 
  title, 
  deviceRole = 'ex1',
  deviceName = 'This PC',
  connectedPeers = {},
  onSwitchTab
}) => {
  const questions = Array.from({ length: 15 }, (_, i) => `q${i + 1}`);

  const isRoleMismatch = (examiner === 'ex1' && deviceRole === 'ex2') || (examiner === 'ex2' && deviceRole === 'ex1');
  const isReadOnlyViewer = deviceRole === 'viewer';

  const calculateTotalWGP = (studentGrades) => {
    let total = 0;
    const points = { 'A+': 10, 'A': 8, 'B': 6, 'C': 4, 'D': 2, 'E': 0 };
    questions.forEach(q => {
      const grade = (studentGrades && studentGrades[q] !== undefined && studentGrades[q] !== '') ? studentGrades[q] : 'A+';
      total += (points[grade] !== undefined ? points[grade] : 10);
    });
    return total;
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', color: '#e2e8f0', margin: 0 }}>{title}</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '4px 0 0 0' }}>Select grades (A+, A, B, C, D, E) for each of the 15 questions.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Assigned Slot:</span>
          <span style={{ 
            fontSize: '0.8rem', 
            fontWeight: 'bold', 
            padding: '3px 10px', 
            borderRadius: '12px',
            backgroundColor: examiner === 'ex1' ? '#15803d' : '#1d4ed8',
            color: '#fff'
          }}>
            {examiner === 'ex1' ? 'Examiner 1 Slot' : 'Examiner 2 Slot'}
          </span>
        </div>
      </div>

      {isRoleMismatch && (
        <div style={{ 
          position: 'sticky', 
          top: '0px', 
          zIndex: 100, 
          background: 'linear-gradient(135deg, #facc15, #eab308)', 
          border: '2px solid #fef08a', 
          padding: '1rem 1.25rem', 
          borderRadius: '12px', 
          marginBottom: '1.5rem', 
          color: '#000', 
          display: 'flex', 
          justify: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '12px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ flex: '1 1 300px', fontSize: '0.95rem', fontWeight: '700', lineHeight: '1.4' }}>
            ⚠️ <strong>Role Mismatch Warning:</strong> Your device ({deviceName}) is set as <strong>{deviceRole === 'ex1' ? 'Examiner 1' : 'Examiner 2'}</strong>, but you are currently viewing <strong>{title}</strong>. Avoid entering marks here to prevent overwriting your partner's entries.
          </div>
          {onSwitchTab && (
            <button
              onClick={() => onSwitchTab(deviceRole === 'ex1' ? 'examiner1' : 'examiner2')}
              style={{ background: '#000', color: '#fde047', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.88rem', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
            >
              Switch to My Tab ({deviceRole === 'ex1' ? 'Examiner 1' : 'Examiner 2'})
            </button>
          )}
        </div>
      )}

      {isReadOnlyViewer && (
        <div style={{ background: 'rgba(168, 85, 247, 0.15)', border: '1px solid #a855f7', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1.25rem', color: '#c084fc', fontSize: '0.88rem' }}>
          ℹ️ <strong>Chairman / Read-Only View:</strong> You are viewing {title} as a monitoring observer.
        </div>
      )}
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {students.map((student) => {
          const studentGrades = student[examiner] || {};
          const totalWgp = calculateTotalWGP(studentGrades);
          
          return (
            <div key={student.id} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff' }}>
                    {student.registerNumber || 'No Register Number'}
                  </span>
                  <span style={{ fontSize: '1rem', color: '#cbd5e1' }}>
                    {student.name || 'Unnamed Student'}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total WGP</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981', lineHeight: '1' }}>
                    {totalWgp}
                  </div>
                </div>
              </div>
              
              <div className="questions-grid" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))', 
                gap: '0.75rem' 
              }}>
                {questions.map((q, i) => {
                  const currentGrade = studentGrades[q] || 'A+';
                  const styleObj = getGradeColorStyle(currentGrade);

                  return (
                    <div key={q} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '500', textAlign: 'center' }}>
                        Q {i + 1}
                      </label>
                      <select
                        className="table-input"
                        style={{
                          padding: '6px',
                          fontSize: '0.9rem',
                          width: '100%',
                          textAlign: 'center',
                          borderRadius: '6px',
                          border: `1px solid ${styleObj.borderColor}`,
                          backgroundColor: styleObj.backgroundColor,
                          color: styleObj.color,
                          fontWeight: styleObj.fontWeight,
                          textShadow: styleObj.textShadow,
                          transition: 'all 0.2s ease',
                          cursor: 'pointer'
                        }}
                        value={currentGrade}
                        onChange={(e) => handleChange(student.id, q, e.target.value, examiner)}
                      >
                        <option value="A+" style={GRADE_OPTION_STYLES['A+']}>A+</option>
                        <option value="A" style={GRADE_OPTION_STYLES['A']}>A</option>
                        <option value="B" style={GRADE_OPTION_STYLES['B']}>B</option>
                        <option value="C" style={GRADE_OPTION_STYLES['C']}>C</option>
                        <option value="D" style={GRADE_OPTION_STYLES['D']}>D</option>
                        <option value="E" style={GRADE_OPTION_STYLES['E']}>E</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CompExaminerTab;
