export const GRADE_POINTS = {
  'A+': 5,
  'A': 4,
  'B': 3,
  'C': 2,
  'D': 1,
  'E': 0
};

export const DISSERTATION_WEIGHTS = {
  structural: 3,
  editing: 3,
  references: 3,
  title: 2,
  supporting: 2,
  results: 3,
  novelty: 2
};

export const calculateStudentScores = (student) => {
  let dissertationTotal = 0;
  
  // Dissertation
  for (const [key, weight] of Object.entries(DISSERTATION_WEIGHTS)) {
    const grade = student[key] || '';
    const points = GRADE_POINTS[grade.toUpperCase()] || 0;
    dissertationTotal += points * weight;
  }

  // Presentation (30 max -> weight 6 per examiner? No, 2 examiners avg. So weight 6 total)
  // Avg of (Ex1 * 6) + (Ex2 * 6) / 2 = (Ex1 + Ex2) * 3
  const presEx1 = GRADE_POINTS[(student.presentationEx1 || '').toUpperCase()] || 0;
  const presEx2 = GRADE_POINTS[(student.presentationEx2 || '').toUpperCase()] || 0;
  // If only one examiner entered, we don't want to halve the score incorrectly. Let's do standard avg of entered grades.
  let presAvgGrade = 0;
  if (student.presentationEx1 && student.presentationEx2) {
    presAvgGrade = (presEx1 + presEx2) / 2;
  } else if (student.presentationEx1) {
    presAvgGrade = presEx1;
  } else if (student.presentationEx2) {
    presAvgGrade = presEx2;
  }
  const presentationTotal = presAvgGrade * 6; // max 5 * 6 = 30

  // Viva (30 max)
  const vivaEx1 = GRADE_POINTS[(student.vivaEx1 || '').toUpperCase()] || 0;
  const vivaEx2 = GRADE_POINTS[(student.vivaEx2 || '').toUpperCase()] || 0;
  let vivaAvgGrade = 0;
  if (student.vivaEx1 && student.vivaEx2) {
    vivaAvgGrade = (vivaEx1 + vivaEx2) / 2;
  } else if (student.vivaEx1) {
    vivaAvgGrade = vivaEx1;
  } else if (student.vivaEx2) {
    vivaAvgGrade = vivaEx2;
  }
  const vivaTotal = vivaAvgGrade * 6;

  const total150 = dissertationTotal + presentationTotal + vivaTotal;
  const total200 = (total150 / 150) * 200;

  return {
    dissertationTotal,
    presentationTotal,
    vivaTotal,
    total150,
    total200
  };
};
