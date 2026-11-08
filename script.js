// 1) كلاس الطالب
class Student {
  constructor(id, name, grades, attendance) {
    this.id = id;
    this.name = name;
    this.grades = grades;
    this.attendance = attendance;
  }

  // حساب المتوسط باستخدام reduce
  calculateAverage() {
    const total = this.grades.reduce((sum, grade) => sum + grade, 0);
    return total / this.grades.length;
  }

  // تحديد التقدير بالحروف
  getGrade(average) {
    if (average >= 90) return "A";
    else if (average >= 80) return "B";
    else if (average >= 70) return "C";
    else if (average >= 60) return "D";
    else if (average >= 50) return "E";
    else return "F";
  }

  // النجاح يتطلب متوسط 50 وحضور 75% على الأقل
  getFinalResult(average) {
    if (average >= 50 && this.attendance >= 75) return "ناجح";
    else return "يحتاج مراجعة";
  }
}

// 2) مصفوفة الطلاب: يوجد طالبان متوسطهما بين 40 و49
const studentsList = [
  new Student(1001, "ايه محمود", [85, 90, 80], 95),
  new Student(1002, "احمدمحمد ", [45, 48, 42], 88),
  new Student(1003, "محمود حسن", [70, 75, 68], 80),
  new Student(1004, "ايه سمير", [40, 46, 43], 70)
];

// 3) filter لاستخراج الطلاب المتعثرين
const strugglingStudents = studentsList.filter(student => {
  const average = student.calculateAverage();
  return average >= 40 && average <= 49;
});

// 4) map لإضافة خمس درجات إلى متوسط كل طالب متعثر
const mercyResults = strugglingStudents.map(student => ({
  id: student.id,
  name: student.name,
  oldAverage: student.calculateAverage(),
  newAverage: student.calculateAverage() + 5
}));

// 5) reduce لجمع المتوسطات الجديدة
const totalAfterMercy = mercyResults.reduce(
  (sum, student) => sum + student.newAverage, 0
);

// حماية من القسمة على صفر
const mercyAverage = mercyResults.length > 0
  ? totalAfterMercy / mercyResults.length
  : 0;

// 6) طباعة التقرير في Console
console.log("===== تقرير جميع الطلاب =====");
studentsList.forEach(student => {
  const average = student.calculateAverage();
  console.log({
    الاسم: student.name,
    المتوسط: average.toFixed(2),
    التقدير: student.getGrade(average),
    النتيجة: student.getFinalResult(average)
  });
});

console.log("===== الطلاب المستفيدون من لجنة الرأفة =====");
console.table(mercyResults);
console.log("متوسط المتعثرين بعد الرأفة:", mercyAverage.toFixed(2));

// 7) عرض النتائج في واجهة الموقع
const studentsTable = document.getElementById("studentsTable");
const mercyTable = document.getElementById("mercyTable");

studentsList.forEach(student => {
  const average = student.calculateAverage();
  const result = student.getFinalResult(average);
  const statusClass = result === "ناجح" ? "status-pass" : "status-review";

  studentsTable.innerHTML += `
    <tr>
      <td>${student.id}</td>
      <td><b>${student.name}</b></td>
      <td class="grade-list">${student.grades.join(" - ")}</td>
      <td>${student.attendance}%</td>
      <td><b>${average.toFixed(2)}</b></td>
      <td><span class="badge">${student.getGrade(average)}</span></td>
      <td><span class="status-badge ${statusClass}">${result}</span></td>
    </tr>`;
});

if (mercyResults.length) {
  mercyResults.forEach(student => {
    mercyTable.innerHTML += `
      <tr>
        <td>${student.id}</td>
        <td><b>${student.name}</b></td>
        <td>${student.oldAverage.toFixed(2)}</td>
        <td style="color:#6de1dc;font-weight:800">${student.newAverage.toFixed(2)}</td>
      </tr>`;
  });
} else {
  mercyTable.innerHTML = '<tr><td colspan="4" class="empty-row">لا يوجد طلاب مستحقون للرأفة.</td></tr>';
}

const passedCount = studentsList.filter(student =>
  student.getFinalResult(student.calculateAverage()) === "ناجح"
).length;
const reviewCount = studentsList.length - passedCount;

document.getElementById("totalStudents").textContent = studentsList.length;
document.getElementById("tableCount").textContent = String(studentsList.length).padStart(2, "0");
document.getElementById("passedStudents").textContent = passedCount;
document.getElementById("reviewStudents").textContent = reviewCount;
document.getElementById("mercyStudents").textContent = mercyResults.length;
document.getElementById("passedBar").style.width = `${passedCount / studentsList.length * 100}%`;
document.getElementById("reviewBar").style.width = `${reviewCount / studentsList.length * 100}%`;
document.getElementById("mercyBar").style.width = `${mercyResults.length / studentsList.length * 100}%`;
document.getElementById("mercyAverage").textContent = mercyResults.length
  ? mercyAverage.toFixed(2)
  : "لا يوجد طلاب";
