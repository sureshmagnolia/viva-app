import React from 'react';

const GRADES = ['', 'A+', 'A', 'B', 'C', 'D', 'E'];

const PresentationVivaTab = ({ students, handleChange }) => {
  const renderDropdown = (student, field) => (
    <select
      className="table-input"
      value={student[field]}
      onChange={(e) => handleChange(student.id, field, e.target.value)}
      style={{ width: '100%', padding: '8px' }}
    >
      {GRADES.map(g => (
        <option key={g} value={g}>{g === '' ? '-' : g}</option>
      ))}
    </select>
  );

  return (
    <div className="animate-fade-in wide-table-scroll">
      <table className="marks-table wide-table">
        <thead>
          <tr>
            <th rowSpan={2} className="sticky-col sticky-col-1" style={{ width: '150px' }}>Register Number</th>
            <th rowSpan={2} className="sticky-col sticky-col-2" style={{ width: '200px' }}>Name</th>
            <th rowSpan={2} style={{ width: '250px' }}>Topic / Title of Project</th>
            <th colSpan={2} className="alt-bg">Presentation (30)</th>
            <th colSpan={2}>Viva Voce (30)</th>
          </tr>
          <tr>
            <th className="sub-header alt-bg">Examiner 1</th>
            <th className="sub-header alt-bg">Examiner 2</th>
            <th className="sub-header">Examiner 1</th>
            <th className="sub-header">Examiner 2</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student.id}>
              <td className="sticky-col sticky-col-1" style={{ background: 'rgba(30, 41, 59, 0.9)' }}>
                <strong>{student.registerNumber || '-'}</strong>
              </td>
              <td className="sticky-col sticky-col-2" style={{ background: 'rgba(30, 41, 59, 0.9)' }}>
                <span style={{ color: 'var(--text-muted)' }}>{student.name || '-'}</span>
              </td>
              <td className="input-cell" style={{ width: '250px' }}>
                <input
                  type="text"
                  className="table-input text-left"
                  value={student.topic || ''}
                  onChange={(e) => handleChange(student.id, 'topic', e.target.value)}
                  placeholder="Enter project topic"
                />
              </td>
              <td className="input-cell alt-bg-cell">{renderDropdown(student, 'presentationEx1')}</td>
              <td className="input-cell alt-bg-cell">{renderDropdown(student, 'presentationEx2')}</td>
              <td className="input-cell">{renderDropdown(student, 'vivaEx1')}</td>
              <td className="input-cell">{renderDropdown(student, 'vivaEx2')}</td>
            </tr>
          ))}
          {students.length === 0 && (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                No students added. Go to the "Students Data" tab to add students.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default PresentationVivaTab;
