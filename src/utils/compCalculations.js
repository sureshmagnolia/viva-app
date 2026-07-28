export const calculateExaminerWGP = (grades) => {
  if (!grades) return 150;
  let total = 0;
  const points = { 'A+': 10, 'A': 8, 'B': 6, 'C': 4, 'D': 2, 'E': 0 };
  for (let i = 1; i <= 15; i++) {
    const grade = (grades[`q${i}`] !== undefined && grades[`q${i}`] !== '') ? grades[`q${i}`] : 'A+';
    total += (points[grade] !== undefined ? points[grade] : 10);
  }
  return total;
};

export const calculateFinalWGP = (student) => {
  const ex1Wgp = calculateExaminerWGP(student.ex1);
  const ex2Wgp = calculateExaminerWGP(student.ex2);
  return Math.round((ex1Wgp + ex2Wgp) / 2);
};

export const calculateFinalGradePoint = (student) => {
  const finalWgp = calculateFinalWGP(student);
  const gradePoint = finalWgp / 30; // Out of 5
  return gradePoint;
};

export const getFinalGrade = (gradePoint) => {
  if (gradePoint >= 4.25) return 'O';
  if (gradePoint >= 3.75) return 'A+';
  if (gradePoint >= 3.25) return 'A';
  if (gradePoint >= 2.75) return 'B+';
  if (gradePoint >= 2.50) return 'B';
  if (gradePoint >= 2.25) return 'C';
  if (gradePoint >= 2.00) return 'P';
  return 'F\nI'; // The Excel has F\nI for fail
};
