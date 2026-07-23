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
  if (!Array.isArray(incomingStudents) || incomingStudents.length === 0) {
    return currentStudents;
  }

  // Map existing students by normalized registerNumber and ID for fast lookup
  const mergedMap = new Map();
  const currentList = [...currentStudents];

  currentList.forEach((student, index) => {
    const key = normalizeRegNo(student.registerNumber) || `id_${student.id || index}`;
    mergedMap.set(key, { ...student });
  });

  incomingStudents.forEach((incStudent, index) => {
    const key = normalizeRegNo(incStudent.registerNumber) || `id_${incStudent.id || index}`;
    const existing = mergedMap.get(key);

    if (!existing) {
      // New student added on partner device, append
      mergedMap.set(key, { ...incStudent });
      return;
    }

    // Merge onto existing student record based on app type and merge role
    if (appType === 'ProjectVivaApp') {
      const updated = { ...existing };
      
      // Copy student basic details if blank in existing
      if (!updated.registerNumber && incStudent.registerNumber) updated.registerNumber = incStudent.registerNumber;
      if (!updated.name && incStudent.name) updated.name = incStudent.name;
      if (!updated.topic && incStudent.topic) updated.topic = incStudent.topic;

      // Copy project grades if mergeRole is 'all' or existing has default/blank
      if (mergeRole === 'all') {
        ['structural', 'editing', 'references', 'title', 'supporting', 'results', 'novelty'].forEach(field => {
          if (incStudent[field]) updated[field] = incStudent[field];
        });
      }

      // Merge Examiner 1 fields
      if (mergeRole === 'ex1' || mergeRole === 'all') {
        if (incStudent.presentationEx1) updated.presentationEx1 = incStudent.presentationEx1;
        if (incStudent.vivaEx1) updated.vivaEx1 = incStudent.vivaEx1;
      }

      // Merge Examiner 2 fields
      if (mergeRole === 'ex2' || mergeRole === 'all') {
        if (incStudent.presentationEx2) updated.presentationEx2 = incStudent.presentationEx2;
        if (incStudent.vivaEx2) updated.vivaEx2 = incStudent.vivaEx2;
      }

      mergedMap.set(key, updated);
    } else if (appType === 'ComprehensiveVivaApp') {
      const updated = { ...existing };

      // Copy student basic details if blank in existing
      if (!updated.registerNumber && incStudent.registerNumber) updated.registerNumber = incStudent.registerNumber;
      if (!updated.name && incStudent.name) updated.name = incStudent.name;

      // Merge Examiner 1
      if ((mergeRole === 'ex1' || mergeRole === 'all') && incStudent.ex1) {
        updated.ex1 = { ...(updated.ex1 || {}), ...incStudent.ex1 };
      }

      // Merge Examiner 2
      if ((mergeRole === 'ex2' || mergeRole === 'all') && incStudent.ex2) {
        updated.ex2 = { ...(updated.ex2 || {}), ...incStudent.ex2 };
      }

      mergedMap.set(key, updated);
    }
  });

  return Array.from(mergedMap.values());
};

/**
 * Creates a lightweight JSON payload suitable for QR codes or Bluetooth/P2P data transfer.
 */
export const createCompressedPayload = (details, students, appType, examinerRole) => {
  const miniStudents = students.map(s => {
    const base = {
      r: s.registerNumber || '',
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
    v: 1, // payload version
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
        id: `inc_${idx}_${Date.now()}`,
        registerNumber: s.r || '',
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
        id: `inc_${idx}_${Date.now()}`,
        registerNumber: s.r || '',
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
