/**
 * Utility functions for merging Examiner 1 and Examiner 2 data
 * for ProjectVivaApp and ComprehensiveVivaApp.
 */

// Helper to normalize register numbers for matching
export const normalizeRegNo = (regNo) => {
  return regNo ? String(regNo).trim().toUpperCase() : '';
};

/**
 * Merges incoming student data into the target student list.
 * 
 * @param {Array} currentStudents - Existing students array
 * @param {Array} incomingStudents - Incoming students array from partner
 * @param {String} appType - 'ProjectVivaApp' or 'ComprehensiveVivaApp'
 * @param {String} mergeRole - 'ex1', 'ex2', or 'all'
 * @returns {Array} New merged students array
 */
export const mergeStudentData = (currentStudents = [], incomingStudents = [], appType, mergeRole = 'all') => {
  if (!Array.isArray(incomingStudents)) {
    return currentStudents;
  }

  // Create lookups by ID and by Register Number for existing students
  const idMap = new Map();
  const regMap = new Map();
  const mergedList = currentStudents.map(s => ({ ...s }));

  mergedList.forEach(s => {
    if (s.id) idMap.set(String(s.id), s);
    const reg = normalizeRegNo(s.registerNumber);
    if (reg) regMap.set(reg, s);
  });

  incomingStudents.forEach(incStudent => {
    // 1. Primary match: by immutable student ID
    let target = incStudent.id ? idMap.get(String(incStudent.id)) : null;

    // 2. Secondary match: by Register Number if ID didn't match and Reg No is non-empty
    const incReg = normalizeRegNo(incStudent.registerNumber);
    if (!target && incReg) {
      target = regMap.get(incReg);
    }

    if (!target) {
      // Truly a new student card added on partner device, append to list
      const newStudent = { ...incStudent };
      mergedList.push(newStudent);
      if (newStudent.id) idMap.set(String(newStudent.id), newStudent);
      if (incReg) regMap.set(incReg, newStudent);
    } else {
      // In-place update of existing student record
      if (incStudent.registerNumber !== undefined && incStudent.registerNumber !== '') {
        target.registerNumber = (incStudent.registerNumber || '').toUpperCase();
      }
      if (incStudent.name !== undefined && incStudent.name !== '') {
        target.name = incStudent.name;
      }

      if (appType === 'ProjectVivaApp') {
        if (incStudent.topic !== undefined && incStudent.topic !== '') {
          target.topic = incStudent.topic;
        }

        if (mergeRole === 'all') {
          ['structural', 'editing', 'references', 'title', 'supporting', 'results', 'novelty'].forEach(field => {
            if (incStudent[field] !== undefined && incStudent[field] !== null && incStudent[field] !== '') {
              target[field] = incStudent[field];
            }
          });
        }

        if (mergeRole === 'ex1' || mergeRole === 'all') {
          if (incStudent.presentationEx1 !== undefined && incStudent.presentationEx1 !== null && incStudent.presentationEx1 !== '') {
            target.presentationEx1 = incStudent.presentationEx1;
          }
          if (incStudent.vivaEx1 !== undefined && incStudent.vivaEx1 !== null && incStudent.vivaEx1 !== '') {
            target.vivaEx1 = incStudent.vivaEx1;
          }
        }

        if (mergeRole === 'ex2' || mergeRole === 'all') {
          if (incStudent.presentationEx2 !== undefined && incStudent.presentationEx2 !== null && incStudent.presentationEx2 !== '') {
            target.presentationEx2 = incStudent.presentationEx2;
          }
          if (incStudent.vivaEx2 !== undefined && incStudent.vivaEx2 !== null && incStudent.vivaEx2 !== '') {
            target.vivaEx2 = incStudent.vivaEx2;
          }
        }
      } else if (appType === 'ComprehensiveVivaApp') {
        if ((mergeRole === 'ex1' || mergeRole === 'all') && incStudent.ex1) {
          const targetEx1 = target.ex1 || {};
          const mergedEx1 = { ...targetEx1 };
          Object.keys(incStudent.ex1).forEach(k => {
            const incVal = incStudent.ex1[k];
            if (incVal !== undefined && incVal !== null && incVal !== '') {
              mergedEx1[k] = incVal;
            }
          });
          target.ex1 = mergedEx1;
        }

        if ((mergeRole === 'ex2' || mergeRole === 'all') && incStudent.ex2) {
          const targetEx2 = target.ex2 || {};
          const mergedEx2 = { ...targetEx2 };
          Object.keys(incStudent.ex2).forEach(k => {
            const incVal = incStudent.ex2[k];
            if (incVal !== undefined && incVal !== null && incVal !== '') {
              mergedEx2[k] = incVal;
            }
          });
          target.ex2 = mergedEx2;
        }
      }

      // Keep regMap updated if register number changed
      const updatedReg = normalizeRegNo(target.registerNumber);
      if (updatedReg) regMap.set(updatedReg, target);
    }
  });

  return mergedList;
};

/**
 * Creates a lightweight JSON payload suitable for data transfer.
 */
export const createCompressedPayload = (details, students, appType, examinerRole) => {
  const miniStudents = students.map(s => {
    const base = {
      id: s.id,
      r: (s.registerNumber || '').toUpperCase(),
      n: s.name || ''
    };

    if (appType === 'ProjectVivaApp') {
      if (s.topic) base.t = s.topic;
      if (examinerRole === 'ex1' || examinerRole === 'all') {
        base.p1 = s.presentationEx1;
        base.v1 = s.vivaEx1;
      }
      if (examinerRole === 'ex2' || examinerRole === 'all') {
        base.p2 = s.presentationEx2;
        base.v2 = s.vivaEx2;
      }
      if (examinerRole === 'all') {
        base.g = {
          st: s.structural, ed: s.editing, rf: s.references,
          ti: s.title, su: s.supporting, rs: s.results, nv: s.novelty
        };
      }
    } else if (appType === 'ComprehensiveVivaApp') {
      if ((examinerRole === 'ex1' || examinerRole === 'all') && s.ex1) {
        base.e1 = s.ex1;
      }
      if ((examinerRole === 'ex2' || examinerRole === 'all') && s.ex2) {
        base.e2 = s.ex2;
      }
    }
    return base;
  });

  return {
    v: 1,
    app: appType,
    role: examinerRole,
    ts: Date.now(),
    d: details,
    s: miniStudents
  };
};

/**
 * Unpacks a compressed payload back into standard app student format and merges it.
 */
export const decompressAndMergePayload = (payload, currentStudents, currentDetails, appType) => {
  if (!payload || payload.app !== appType || !Array.isArray(payload.s)) {
    throw new Error('Invalid or mismatched payload format.');
  }

  const role = payload.role || 'all';

  const expandedStudents = payload.s.map((s, idx) => {
    if (appType === 'ProjectVivaApp') {
      const res = {
        id: s.id || `inc_${idx}_${Date.now()}`,
        registerNumber: (s.r || '').toUpperCase(),
        name: s.n || '',
        topic: s.t || ''
      };
      if (s.p1) res.presentationEx1 = s.p1;
      if (s.v1) res.vivaEx1 = s.v1;
      if (s.p2) res.presentationEx2 = s.p2;
      if (s.v2) res.vivaEx2 = s.v2;

      if (s.g) {
        res.structural = s.g.st;
        res.editing = s.g.ed;
        res.references = s.g.rf;
        res.title = s.g.ti;
        res.supporting = s.g.su;
        res.results = s.g.rs;
        res.novelty = s.g.nv;
      }
      return res;
    } else {
      const res = {
        id: s.id || `inc_${idx}_${Date.now()}`,
        registerNumber: (s.r || '').toUpperCase(),
        name: s.n || ''
      };
      if (s.e1) res.ex1 = s.e1;
      if (s.e2) res.ex2 = s.e2;
      return res;
    }
  });

  // Merge details if existing fields are empty
  const mergedDetails = { ...currentDetails };
  if (payload.d) {
    if (!mergedDetails.centre && payload.d.centre) mergedDetails.centre = payload.d.centre;
    if (!mergedDetails.date && payload.d.date) mergedDetails.date = payload.d.date;
    if (!mergedDetails.courseCode && payload.d.courseCode) mergedDetails.courseCode = payload.d.courseCode;
  }

  const mergedStudents = mergeStudentData(currentStudents, expandedStudents, appType, role);

  return {
    details: mergedDetails,
    students: mergedStudents,
    role
  };
};
