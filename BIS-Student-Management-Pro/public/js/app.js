"use strict";
// يعمل مباشرة من المتصفح دون تشغيل server.js. تُحفظ البيانات في هذا المتصفح.
const STORAGE_KEY = "bis_student_records_v1";
let students = [];
const $ = id => document.getElementById(id);
const form = $("studentForm");
const formWrap = $("formWrap");
const messageBox = $("messageBox");

function notify(message, type = "success") {
  messageBox.textContent = message;
  messageBox.className = `message-box show ${type}`;
}
function clearNotify() { messageBox.className = "message-box"; messageBox.textContent = ""; }
function saveLocal() { localStorage.setItem(STORAGE_KEY, JSON.stringify(students)); }
function avg(s) { return (Number(s.grade1) + Number(s.grade2) + Number(s.grade3)) / 3; }
function level(value) {
  if (value >= 85) return ["ممتاز", "excellent", "excellent"];
  if (value >= 65) return ["جيد", "good", "good"];
  if (value >= 50) return ["مقبول", "acceptable", "acceptable"];
  return ["أقل من 50", "below", "below"];
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}
function loadAll() {
  try { students = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); if (!Array.isArray(students)) students = []; }
  catch { students = []; }
  $("apiStatus").textContent = "البيانات محفوظة على هذا الجهاز";
  $("apiDot").classList.add("online");
  renderStudents(); renderStats();
}
function renderStats() {
  const count = students.length;
  const average = count ? students.reduce((sum,s) => sum + avg(s),0) / count : 0;
  const attendance = count ? students.reduce((sum,s) => sum + Number(s.attendance),0) / count : 0;
  const passed = students.filter(s => avg(s) >= 50).length;
  $("totalStudents").textContent = count;
  $("overallAverage").textContent = average.toFixed(1) + "%";
  $("averageAttendance").textContent = attendance.toFixed(1) + "%";
  $("passRate").textContent = (count ? passed / count * 100 : 0).toFixed(1) + "%";
}
function renderStudents() {
  const query = $("searchInput").value.trim().toLowerCase();
  const filter = $("gradeFilter").value;
  const filtered = students.filter(s => [s.id,s.name,s.phone].some(v => String(v).toLowerCase().includes(query)) && (filter === "all" || level(avg(s))[1] === filter));
  $("studentsBody").innerHTML = filtered.length ? filtered.map((s,index) => {
    const a = avg(s), l = level(a);
    return `<tr><td>${index+1}</td><td><b>${escapeHTML(s.id)}</b></td><td>${escapeHTML(s.name)}</td><td dir="ltr">${escapeHTML(s.phone)}</td><td>${s.grade1} / ${s.grade2} / ${s.grade3}</td><td><b>${a.toFixed(1)}</b></td><td>${s.attendance}%</td><td><span class="grade-pill ${l[2]}">${l[0]}</span></td><td><button class="action-btn" data-edit="${encodeURIComponent(s.id)}" title="تعديل">✎</button><button class="action-btn delete" data-delete="${encodeURIComponent(s.id)}" title="حذف">×</button></td></tr>`;
  }).join("") : '<tr><td colspan="9" class="empty-row">لا توجد بيانات بعد. املأ النموذج أعلاه لإضافة أول طالب.</td></tr>';
}
function updateResultPreview() {
  const values = ["grade1","grade2","grade3"].map(id => $(id).value);
  const attendance = $("attendance").value;
  $("resultAttendance").value = attendance === "" ? "—" : `${attendance}%`;
  if (values.some(v => v === "")) { ["resultPercentage","resultGradeNumber","resultStatus","mercyAverage","mercyStatus"].forEach(id => $(id).value="—"); $("resultGrade").value="أدخل الدرجات"; return; }
  const a = values.reduce((sum,v)=>sum+Number(v),0)/3, eligible = a >= 40 && a < 50, after = eligible ? Math.min(100,a+5) : a;
  $("resultPercentage").value = a.toFixed(2)+"%";
  $("resultGrade").value = level(a)[0];
  $("resultGradeNumber").value = a.toFixed(2)+" / 100";
  $("resultStatus").value = a >= 50 ? "ناجح — Pass" : "راسب — Fail";
  $("mercyAverage").value = eligible ? after.toFixed(2)+" من 100" : "غير مستحق للرأفة";
  $("mercyStatus").value = eligible ? (after>=50 ? "ناجح بعد الرأفة — Pass" : "راسب بعد الرأفة — Fail") : (a>=50 ? "ناجح — Pass" : "راسب — Fail");
}
["grade1","grade2","grade3","attendance"].forEach(id => $(id).addEventListener("input",updateResultPreview));
function resetForm() { form.reset(); updateResultPreview(); $("editingId").value=""; $("saveBtn").textContent="حفظ بيانات الطالب"; formWrap.classList.add("show"); }
$("cancelEdit").addEventListener("click",resetForm);
form.addEventListener("submit",event => {
  event.preventDefault(); clearNotify();
  const payload = { id:$("studentId").value.trim(), name:$("studentName").value.trim(), phone:$("studentPhone").value.trim(), grade1:Number($("grade1").value), grade2:Number($("grade2").value), grade3:Number($("grade3").value), attendance:Number($("attendance").value) };
  if (students.some(s => s.id.toLowerCase()===payload.id.toLowerCase() && s.id!==$("editingId").value)) { notify("رقم ID مسجل بالفعل. أدخل رقمًا مختلفًا.","error"); return; }
  if ([payload.grade1,payload.grade2,payload.grade3,payload.attendance].some(n=>!Number.isFinite(n)||n<0||n>100)) { notify("تأكد أن الدرجات والحضور أرقام من 0 إلى 100.","error"); return; }
  const editing = $("editingId").value;
  if (editing) { const i=students.findIndex(s=>s.id===editing); if(i>=0) students[i]=payload; }
  else students.push(payload);
  saveLocal(); resetForm(); loadAll(); notify(editing ? "تم تحديث بيانات الطالب." : "تمت إضافة الطالب وحفظ بياناته على هذا الجهاز.");
});
$("studentsBody").addEventListener("click",event => {
  const edit=event.target.closest("[data-edit]"), del=event.target.closest("[data-delete]");
  if(edit){ const id=decodeURIComponent(edit.dataset.edit), s=students.find(x=>x.id===id); if(!s)return; $("editingId").value=s.id; $("studentId").value=s.id; $("studentName").value=s.name; $("studentPhone").value=s.phone; [1,2,3].forEach(n=>$("grade"+n).value=s["grade"+n]); $("attendance").value=s.attendance; updateResultPreview(); $("saveBtn").textContent="حفظ التعديلات"; formWrap.classList.add("show"); form.scrollIntoView({behavior:"smooth",block:"center"}); }
  if(del){ const id=decodeURIComponent(del.dataset.delete), s=students.find(x=>x.id===id); if(!s||!confirm(`هل تريد حذف بيانات الطالب ${s.name}؟`))return; students=students.filter(x=>x.id!==id); saveLocal(); loadAll(); notify("تم حذف الطالب."); }
});
$("searchInput").addEventListener("input",renderStudents);
$("gradeFilter").addEventListener("change",renderStudents);
$("mercyBtn").addEventListener("click",()=>{
  const list=students.map(s=>({...s,average:avg(s)})).filter(s=>s.average>=40&&s.average<50).map(s=>({...s,after:s.average+5}));
  if(!list.length){$("mercyReport").innerHTML='<div class="report-empty">لا يوجد طلاب متوسطهم بين 40 و49.</div>';return;}
  const overall=list.reduce((sum,s)=>sum+s.after,0)/list.length;
  $("mercyReport").innerHTML=`<div class="report-metrics"><span>عدد الطلاب المستحقين: ${list.length}</span><span>المتوسط بعد الرأفة: ${overall.toFixed(2)}</span></div><ol class="mercy-list">${list.map(s=>`<li><b>${escapeHTML(s.name)}</b> — ID: ${escapeHTML(s.id)} — قبل: ${s.average.toFixed(2)} — بعد إضافة 5: <b>${s.after.toFixed(2)}</b></li>`).join("")}</ol><div class="report-average">الحساب للتقرير فقط ولا يغيّر الدرجات الأصلية.</div>`;
});
$("exportBtn").addEventListener("click",()=>{
  const rows=[["ID","Name","Phone","Grade 1","Grade 2","Grade 3","Attendance","Average"],...students.map(s=>[s.id,s.name,s.phone,s.grade1,s.grade2,s.grade3,s.attendance,avg(s).toFixed(2)])];
  const csv="\uFEFF"+rows.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(",")).join("\r\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"})); const a=document.createElement("a"); a.href=url; a.download="bis-students.csv"; a.click(); URL.revokeObjectURL(url);
});
$("menuBtn").addEventListener("click",()=>$("sidebar").classList.toggle("open"));
document.querySelectorAll(".side-link").forEach(link=>link.addEventListener("click",()=>$("sidebar").classList.remove("open")));
$("todayLabel").textContent=new Intl.DateTimeFormat("ar-EG",{dateStyle:"full"}).format(new Date());
formWrap.classList.add("show"); updateResultPreview(); loadAll();
