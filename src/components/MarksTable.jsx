import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { calculateStudentScores, DISSERTATION_WEIGHTS } from '../utils/calculations';

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

  const renderDropdown = (student, field) => (
    <select
      className="table-input"
      value={student[field]}
      onChange={(e) => handleChange(student.id, field, e.target.value)}
      style={{ minWidth: '70px', padding: '6px' }}
    >
      {GRADES.map(g => (
        <option key={g} value={g}>{g === '' ? '-' : g}</option>
      ))}
    </select>
  );

  return (
    <div className="glass-panel animate-fade-in" style={{ animationDelay: '0.1s' }}>
      <div className="table-container wide-table-scroll">
        <table className="marks-table wide-table">
          <thead>
            <tr>
              <th rowSpan={2} className="sticky-col sticky-col-1">Register Number</th>
              <th rowSpan={2} className="sticky-col sticky-col-2">Name of Candidate</th>
              
              <th colSpan={7} className="group-header">Dissertation / Project Work (90)</th>
              <th colSpan={2} className="group-header alt-bg">Presentation (30)</th>
              <th colSpan={2} className="group-header">Viva Voce (30)</th>
              
              <th colSpan={5} className="group-header results-bg">Consolidated Totals</th>
              
              <th rowSpan={2} className="sticky-col-right">Actions</th>
            </tr>
            <tr>
              {/* Dissertation */}
              <th className="sub-header" title="Structural requirements WGP (15)">Struct.<br/><small>(x3)</small></th>
              <th className="sub-header" title="Editing & spelling WGP (15)">Editing<br/><small>(x3)</small></th>
              <th className="sub-header" title="References WGP (15)">Refs.<br/><small>(x3)</small></th>
              <th className="sub-header" title="Title & Content WGP (10)">Title<br/><small>(x2)</small></th>
              <th className="sub-header" title="Supporting evidences WGP (10)">Support.<br/><small>(x2)</small></th>
              <th className="sub-header" title="Results Discussion WGP (15)">Results<br/><small>(x3)</small></th>
              <th className="sub-header" title="Novelty and Originality WGP (10)">Novelty<br/><small>(x2)</small></th>
              
              {/* Presentation */}
              <th className="sub-header alt-bg">Ex 1</th>
              <th className="sub-header alt-bg">Ex 2</th>
              
              {/* Viva */}
              <th className="sub-header">Ex 1</th>
              <th className="sub-header">Ex 2</th>
              
              {/* Totals */}
              <th className="sub-header results-bg">Diss.<br/><small>(90)</small></th>
              <th className="sub-header results-bg">Pres.<br/><small>(30)</small></th>
              <th className="sub-header results-bg">Viva<br/><small>(30)</small></th>
              <th className="sub-header results-bg">Total<br/><small>(150)</small></th>
              <th className="sub-header results-bg">In 200</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
              const scores = calculateStudentScores(student);

              return (
                <tr key={student.id}>
                  <td className="input-cell sticky-col sticky-col-1">
                    <input
                      type="text"
                      className="table-input text-left"
                      value={student.registerNumber}
                      onChange={(e) => handleChange(student.id, 'registerNumber', e.target.value)}
                      placeholder="e.g. TESTBT001"
                      style={{ minWidth: '130px' }}
                    />
                  </td>
                  <td className="input-cell sticky-col sticky-col-2">
                    <input
                      type="text"
                      className="table-input text-left"
                      value={student.name}
                      onChange={(e) => handleChange(student.id, 'name', e.target.value)}
                      placeholder="Student Name"
                      style={{ minWidth: '160px' }}
                    />
                  </td>
                  
                  {/* Dissertation */}
                  <td className="input-cell">{renderDropdown(student, 'structural')}</td>
                  <td className="input-cell">{renderDropdown(student, 'editing')}</td>
                  <td className="input-cell">{renderDropdown(student, 'references')}</td>
                  <td className="input-cell">{renderDropdown(student, 'title')}</td>
                  <td className="input-cell">{renderDropdown(student, 'supporting')}</td>
                  <td className="input-cell">{renderDropdown(student, 'results')}</td>
                  <td className="input-cell">{renderDropdown(student, 'novelty')}</td>
                  
                  {/* Presentation */}
                  <td className="input-cell alt-bg-cell">{renderDropdown(student, 'presentationEx1')}</td>
                  <td className="input-cell alt-bg-cell">{renderDropdown(student, 'presentationEx2')}</td>
                  
                  {/* Viva */}
                  <td className="input-cell">{renderDropdown(student, 'vivaEx1')}</td>
                  <td className="input-cell">{renderDropdown(student, 'vivaEx2')}</td>
                  
                  {/* Calculated Totals */}
                  <td className="calculated-cell results-bg-cell">{scores.dissertationTotal > 0 ? scores.dissertationTotal : '-'}</td>
                  <td className="calculated-cell results-bg-cell">{scores.presentationTotal > 0 ? scores.presentationTotal : '-'}</td>
                  <td className="calculated-cell results-bg-cell">{scores.vivaTotal > 0 ? scores.vivaTotal : '-'}</td>
                  <td className="calculated-cell results-bg-cell" style={{ color: '#10b981' }}>{scores.total150 > 0 ? scores.total150 : '-'}</td>
                  <td className="calculated-cell results-bg-cell" style={{ color: '#60a5fa' }}>{scores.total200 > 0 ? scores.total200.toFixed(2) : '-'}</td>
                  
                  <td className="sticky-col-right">
                    <button 
                      className="btn btn-danger btn-icon" 
                      onClick={() => handleRemoveStudent(student.id)}
                      title="Remove row"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ padding: '1rem' }}>
        <button className="btn btn-secondary" onClick={handleAddStudent}>
          <Plus size={18} />
          Add Student Row
        </button>
      </div>
    </div>
  );
};

export default MarksTable;
