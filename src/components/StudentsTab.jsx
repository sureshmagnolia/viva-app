import React from 'react';
import { Plus, Trash2, Copy, User } from 'lucide-react';

const StudentsTab = ({ students, setStudents, handleChange }) => {
  const handleAddStudent = () => {
    setStudents(prev => [...prev, {
      id: Date.now().toString(),
      registerNumber: '',
      name: '',
      topic: '',
      structural: 'A+', editing: 'A+', references: 'A+', title: 'A+', supporting: 'A+', results: 'A+', novelty: 'A+',
      presentationEx1: 'A+', presentationEx2: 'A+', vivaEx1: 'A+', vivaEx2: 'A+'
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
      // Pad with same number of zeros
      const paddedNum = nextNum.toString().padStart(numStr.length, '0');
      nextReg = `${prefix}${paddedNum}`;
    }

    const newStudent = {
      id: Date.now().toString(),
      registerNumber: nextReg,
      name: '',
      topic: '',
      structural: 'A+', editing: 'A+', references: 'A+', title: 'A+', supporting: 'A+', results: 'A+', novelty: 'A+',
      presentationEx1: 'A+', presentationEx2: 'A+', vivaEx1: 'A+', vivaEx2: 'A+'
    };

    // Insert right below the current index
    const newStudents = [...students];
    newStudents.splice(index + 1, 0, newStudent);
    setStudents(newStudents);
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        {students.length === 0 && (
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
            No students added. Click the button below to add one.
          </div>
        )}

        {students.map((student, index) => (
          <div key={student.id} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* Card Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ background: 'rgba(96, 165, 250, 0.2)', color: '#60a5fa', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  {index + 1}
                </div>
                <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={16} color="#94a3b8" />
                  Student Details
                </span>
              </div>
              <button 
                className="btn btn-danger btn-icon" 
                onClick={() => handleRemoveStudent(student.id)}
                title="Remove student"
                style={{ padding: '6px', background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)' }}
              >
                <Trash2 size={16} />
              </button>
            </div>

            {/* Form Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px', display: 'block' }}>Register Number</label>
                <input
                  type="text"
                  className="table-input text-left"
                  value={student.registerNumber}
                  onChange={(e) => handleChange(student.id, 'registerNumber', e.target.value)}
                  placeholder="e.g. VPABMBT001"
                  style={{ width: '100%', fontSize: '1rem', padding: '10px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px', display: 'block' }}>Name of the Candidate</label>
                <input
                  type="text"
                  className="table-input text-left"
                  value={student.name}
                  onChange={(e) => handleChange(student.id, 'name', e.target.value)}
                  placeholder="Student Name"
                  style={{ width: '100%', fontSize: '1rem', padding: '10px' }}
                />
              </div>
            </div>

            {/* Card Footer Actions */}
            <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-start' }}>
              <button 
                className="btn" 
                style={{ background: '#10b981', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '0.9rem' }}
                onClick={() => handleCopyDown(index)}
                title="Copy down (auto-increment register number)"
              >
                <Copy size={16} />
                Copy down
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '1.5rem 0', display: 'flex', justifyContent: 'center' }}>
        <button className="btn btn-secondary" onClick={handleAddStudent} style={{ width: '100%', maxWidth: '300px' }}>
          <Plus size={18} />
          Add Student Row
        </button>
      </div>
    </div>
  );
};

export default StudentsTab;
