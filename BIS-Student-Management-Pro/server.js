// BIS Student Results Management System - Backend
// Uses Node.js built-in modules only (no npm dependencies required).
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const DB_FILE = path.join(DATA_DIR, "students.json");

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, "[]", "utf8");

function readStudents() {
  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
function writeStudents(students) {
  fs.writeFileSync(DB_FILE, JSON.stringify(students, null, 2), "utf8");
}
function send(res, status, payload, contentType = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": contentType,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(contentType.startsWith("application/json") ? JSON.stringify(payload) : payload);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", chunk => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("حجم البيانات أكبر من المسموح."));
        req.destroy();
      }
    });
    req.on("end", () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch { reject(new Error("صيغة البيانات المرسلة غير صحيحة.")); }
    });
    req.on("error", reject);
  });
}
function validateStudent(body, students, currentId = null) {
  const required = ["id", "name", "phone", "grade1", "grade2", "grade3", "attendance"];
  for (const field of required) {
    if (body[field] === undefined || body[field] === null || String(body[field]).trim() === "") {
      return `الحقل ${field} مطلوب.`;
    }
  }
  const id = String(body.id).trim();
  const name = String(body.name).trim();
  const phone = String(body.phone).trim();
  if (id.length > 30) return "الرقم التعريفي يجب ألا يزيد عن 30 حرفًا.";
  if (name.length > 100) return "اسم الطالب طويل جدًا.";
  if (!/^[0-9+\-\s]{8,15}$/.test(phone)) return "رقم الهاتف غير صحيح.";
  if (students.some(s => s.id.toLowerCase() === id.toLowerCase() && s.id !== currentId)) {
    return "هذا الرقم التعريفي موجود بالفعل.";
  }
  for (const field of ["grade1", "grade2", "grade3", "attendance"]) {
    const n = Number(body[field]);
    if (!Number.isFinite(n) || n < 0 || n > 100) return `${field}: يجب إدخال رقم من 0 إلى 100.`;
  }
  return null;
}
function average(s) {
  return (Number(s.grade1) + Number(s.grade2) + Number(s.grade3)) / 3;
}
function analytics(students) {
  const count = students.length;
  const avg = count ? students.reduce((sum, s) => sum + average(s), 0) / count : 0;
  const attendance = count ? students.reduce((sum, s) => sum + Number(s.attendance), 0) / count : 0;
  const pass = students.filter(s => average(s) >= 50).length;
  const atRisk = students.filter(s => average(s) >= 40 && average(s) <= 49).length;
  const subjectAverages = [1, 2, 3].map(i =>
    count ? students.reduce((sum, s) => sum + Number(s["grade" + i]), 0) / count : 0
  );
  const excellent = students.filter(s => average(s) >= 85).length;
  const good = students.filter(s => average(s) >= 65 && average(s) < 85).length;
  const acceptable = students.filter(s => average(s) >= 50 && average(s) < 65).length;
  const below = students.filter(s => average(s) < 50).length;
  return {
    totalStudents: count,
    overallAverage: Number(avg.toFixed(2)),
    averageAttendance: Number(attendance.toFixed(2)),
    passRate: count ? Number((pass / count * 100).toFixed(1)) : 0,
    atRiskCount: atRisk,
    subjectAverages: subjectAverages.map(n => Number(n.toFixed(2))),
    gradeDistribution: { excellent, good, acceptable, below },
    passedStudents: pass,
    failedStudents: count - pass
  };
}
function mime(file) {
  return ({
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
    ".svg": "image/svg+xml", ".ico": "image/x-icon", ".json": "application/json; charset=utf-8"
  })[path.extname(file).toLowerCase()] || "application/octet-stream";
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, {});
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const route = url.pathname;

  try {
    if (route === "/api/health" && req.method === "GET") {
      return send(res, 200, { status: "ok", service: "BIS API", storage: "JSON file", timestamp: new Date().toISOString() });
    }

    if (route === "/api/students" && req.method === "GET") {
      const students = readStudents().map(s => ({ ...s, average: Number(average(s).toFixed(2)) }));
      return send(res, 200, students);
    }

    if (route === "/api/students" && req.method === "POST") {
      const body = await readBody(req);
      const students = readStudents();
      const error = validateStudent(body, students);
      if (error) return send(res, 400, { error });
      const student = {
        id: String(body.id).trim(),
        name: String(body.name).trim(),
        phone: String(body.phone).trim(),
        grade1: Number(body.grade1),
        grade2: Number(body.grade2),
        grade3: Number(body.grade3),
        attendance: Number(body.attendance),
        createdAt: new Date().toISOString()
      };
      students.push(student);
      writeStudents(students);
      return send(res, 201, { message: "تمت إضافة الطالب بنجاح.", student: { ...student, average: Number(average(student).toFixed(2)) } });
    }

    if (route.startsWith("/api/students/") && req.method === "PUT") {
      const id = decodeURIComponent(route.split("/").pop());
      const body = await readBody(req);
      const students = readStudents();
      const index = students.findIndex(s => s.id === id);
      if (index < 0) return send(res, 404, { error: "الطالب غير موجود." });
      const error = validateStudent(body, students, id);
      if (error) return send(res, 400, { error });
      students[index] = {
        ...students[index],
        id: String(body.id).trim(), name: String(body.name).trim(), phone: String(body.phone).trim(),
        grade1: Number(body.grade1), grade2: Number(body.grade2), grade3: Number(body.grade3),
        attendance: Number(body.attendance), updatedAt: new Date().toISOString()
      };
      writeStudents(students);
      return send(res, 200, { message: "تم تحديث بيانات الطالب.", student: { ...students[index], average: Number(average(students[index]).toFixed(2)) } });
    }

    if (route.startsWith("/api/students/") && req.method === "DELETE") {
      const id = decodeURIComponent(route.split("/").pop());
      const students = readStudents();
      const filtered = students.filter(s => s.id !== id);
      if (filtered.length === students.length) return send(res, 404, { error: "الطالب غير موجود." });
      writeStudents(filtered);
      return send(res, 200, { message: "تم حذف الطالب بنجاح." });
    }

    if (route === "/api/analytics" && req.method === "GET") {
      return send(res, 200, analytics(readStudents()));
    }

    if (route === "/api/mercy-report" && req.method === "GET") {
      const struggling = readStudents().map(s => ({ ...s, average: average(s) }))
        .filter(s => s.average >= 40 && s.average <= 49)
        .map(s => ({ id: s.id, name: s.name, averageBefore: Number(s.average.toFixed(2)), averageAfter: Number((s.average + 5).toFixed(2)) }));
      const overall = struggling.length
        ? struggling.reduce((sum, s) => sum + s.averageAfter, 0) / struggling.length : 0;
      return send(res, 200, {
        count: struggling.length,
        students: struggling,
        generalAverageAfterMercy: Number(overall.toFixed(2)),
        note: "تمت إضافة 5 درجات إلى متوسط التقرير فقط دون تغيير الدرجات الأصلية."
      });
    }

    if (route === "/api/export.csv" && req.method === "GET") {
      const rows = readStudents();
      const csv = ["ID,Name,Phone,Grade 1,Grade 2,Grade 3,Attendance,Average",
        ...rows.map(s => [s.id, s.name, s.phone, s.grade1, s.grade2, s.grade3, s.attendance, average(s).toFixed(2)]
          .map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\r\n");
      res.writeHead(200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=bis-students.csv"
      });
      return res.end("\uFEFF" + csv);
    }

    // Static frontend
    let requested = route === "/" ? "/index.html" : decodeURIComponent(route);
    const target = path.normalize(path.join(PUBLIC_DIR, requested));
    if (!target.startsWith(PUBLIC_DIR)) return send(res, 403, { error: "Forbidden" });
    fs.readFile(target, (err, content) => {
      if (err) return send(res, 404, { error: "الصفحة أو الملف غير موجود." });
      res.writeHead(200, { "Content-Type": mime(target) });
      res.end(content);
    });
  } catch (error) {
    console.error("Server error:", error);
    send(res, 500, { error: error.message || "حدث خطأ داخلي في الخادم." });
  }
});

server.listen(PORT, () => {
  console.log(`BIS Student Management System running at http://localhost:${PORT}`);
});
