import React from 'react';
import { Plus, Trash2, Copy } from 'lucide-react';

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
      <div className="table-container">
        <table className="marks-table">
          <thead>
            <tr>
              <th style={{ width: '50px' }}>#</th>
              <th>Register Number</th>
              <th>Name of the Candidate</th>
              <th style={{ width: '120px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, index) => (
              <tr key={student.id}>
                <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{index + 1}</td>
                <td className="input-cell" style={{ width: '250px' }}>
                  <input
                    type="text"
                    className="table-input text-left"
                    value={student.registerNumber}
                    onChange={(e) => handleChange(student.id, 'registerNumber', e.target.value)}
                    placeholder="e.g. VPABMBT001"
                  />
                </td>
                <td className="input-cell">
                  <input
                    type="text"
                    className="table-input text-left"
                    value={student.name}
                    onChange={(e) => handleChange(student.id, 'name', e.target.value)}
                    placeholder="Student Name"
                  />
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn btn-secondary btn-icon" 
                      onClick={() => handleCopyDown(index)}
                      title="Copy down (auto-increment register number)"
                    >
                      <Copy size={16} />
                    </button>
                    <button 
                      className="btn btn-danger btn-icon" 
                      onClick={() => handleRemoveStudent(student.id)}
                      title="Remove row"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ padding: '1rem 0' }}>
        <button className="btn btn-secondary" onClick={handleAddStudent}>
          <Plus size={18} />
          Add Student Row
        </button>
      </div>
    </div>
  );
};

export default StudentsTab;
