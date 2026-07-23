import React from 'react';
import { Plus, Trash2, Copy, User } from 'lucide-react';

const CompStudentsTab = ({ students, setStudents, handleChange }) => {
  const generateUniqueId = () => `std_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const getDefaultGrades = () => {
    const defaultGrades = {};
    for (let i = 1; i <= 15; i++) defaultGrades[`q${i}`] = 'A+';
    return defaultGrades;
  };

  const handleAddStudent = () => {
    setStudents(prev => [...prev, {
      id: generateUniqueId(),
      registerNumber: '',
      name: '',
      ex1: getDefaultGrades(),
      ex2: getDefaultGrades()
    }]);
  };

  const handleRemoveStudent = (id) => {
    setStudents(prev => prev.filter(s => s.id !== id));
  };

  const handleCopyDown = (index) => {
    const currentStudent = students[index];
    const currentReg = currentStudent.registerNumber || '';
    
    // Extract numeric part from the end
    const match = currentReg.match(/^(.*?)(\d+)$/);
    let nextReg = currentReg;
    
    if (match) {
      const prefix = match[1];
      const numStr = match[2];
      const nextNum = parseInt(numStr, 10) + 1;
      const paddedNum = nextNum.toString().padStart(numStr.length, '0');
      nextReg = `${prefix}${paddedNum}`;
    }

    const newStudent = {
      id: generateUniqueId(),
      registerNumber: nextReg,
      name: '',
      ex1: getDefaultGrades(),
      ex2: getDefaultGrades()
    };

    const newStudents = [...students];
    newStudents.splice(index + 1, 0, newStudent);
    setStudents(newStudents);
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        {students.length === 0 && (
          <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', color: '#cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <User size={48} color="#a78bfa" style={{ opacity: 0.6 }} />
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#f8fafc' }}>No Student Records Added</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                Start fresh by adding student rows or importing a student backup file.
              </p>
            </div>
            <button 
              className="btn btn-primary" 
              onClick={handleAddStudent}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', marginTop: '0.5rem', background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}
            >
              <Plus size={18} /> Add First Student Row
            </button>
          </div>
        )}

        {students.map((student, index) => (
          <div key={student.id} className="glass-panel student-card animate-fade-in" style={{ padding: '1rem', background: 'rgba(30, 41, 59, 0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-primary" style={{ background: '#8b5cf6', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  #{index + 1}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Student Record</span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleCopyDown(index)}
                  style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="Copy row & auto-increment Register Number"
                >
                  <Copy size={14} /> Duplicate / Next Reg No
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleRemoveStudent(student.id)}
                  style={{ padding: '4px 8px', fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
                  title="Remove Student"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div>
                <label className="input-label" style={{ fontSize: '0.8rem', marginBottom: '4px', display: 'block', color: '#cbd5e1' }}>Register Number</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. REG123456"
                  value={student.registerNumber}
                  onChange={(e) => handleChange(student.id, 'registerNumber', e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
                />
              </div>

              <div>
                <label className="input-label" style={{ fontSize: '0.8rem', marginBottom: '4px', display: 'block', color: '#cbd5e1' }}>Student Name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter full name"
                  value={student.name}
                  onChange={(e) => handleChange(student.id, 'name', e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
                />
              </div>
            </div>
          </div>
        ))}

        {students.length > 0 && (
          <button
            className="btn btn-primary"
            onClick={handleAddStudent}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', width: '100%', marginTop: '0.5rem', background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}
          >
            <Plus size={18} /> Add Student Row
          </button>
        )}

      </div>
    </div>
  );
};

export default CompStudentsTab;
