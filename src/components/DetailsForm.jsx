import React from 'react';

const DetailsForm = ({ details, setDetails }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setDetails(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="glass-panel form-grid animate-fade-in">
      <div className="form-group">
        <label className="form-label" htmlFor="centre">Name of the centre</label>
        <input
          id="centre"
          name="centre"
          type="text"
          className="glass-input"
          placeholder="e.g. Example College, Example District"
          value={details.centre}
          onChange={handleChange}
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="date">Date of examination</label>
        <input
          id="date"
          name="date"
          type="date"
          className="glass-input"
          value={details.date}
          onChange={handleChange}
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="courseCode">Course name / Course code</label>
        <input
          id="courseCode"
          name="courseCode"
          type="text"
          className="glass-input"
          placeholder="e.g. BOT4D01"
          value={details.courseCode}
          onChange={handleChange}
        />
      </div>
    </div>
  );
};

export default DetailsForm;
