import React from 'react';

const GRADES = ['', 'A+', 'A', 'B', 'C', 'D', 'E'];

const ProjectGradesTab = ({ students, handleChange }) => {
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
            <th className="sticky-col sticky-col-1" style={{ width: '150px' }}>Register Number</th>
            <th className="sticky-col sticky-col-2" style={{ width: '200px' }}>Name</th>
            <th title="Structural requirements WGP (15)">Structural<br/><small>(x3)</small></th>
            <th title="Editing & spelling WGP (15)">Editing<br/><small>(x3)</small></th>
            <th title="References WGP (15)">References<br/><small>(x3)</small></th>
            <th title="Title & Content WGP (10)">Title<br/><small>(x2)</small></th>
            <th title="Supporting evidences WGP (10)">Supporting<br/><small>(x2)</small></th>
            <th title="Results Discussion WGP (15)">Results<br/><small>(x3)</small></th>
            <th title="Novelty and Originality WGP (10)">Novelty<br/><small>(x2)</small></th>
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
              <td className="input-cell">{renderDropdown(student, 'structural')}</td>
              <td className="input-cell">{renderDropdown(student, 'editing')}</td>
              <td className="input-cell">{renderDropdown(student, 'references')}</td>
              <td className="input-cell">{renderDropdown(student, 'title')}</td>
              <td className="input-cell">{renderDropdown(student, 'supporting')}</td>
              <td className="input-cell">{renderDropdown(student, 'results')}</td>
              <td className="input-cell">{renderDropdown(student, 'novelty')}</td>
            </tr>
          ))}
          {students.length === 0 && (
            <tr>
              <td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}>
                No students added. Go to the "Students Data" tab to add students.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ProjectGradesTab;
