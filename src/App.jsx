import React, { useState, useEffect } from "react";

// ============================================================
// DESIGN SYSTEM
// ============================================================
const palette = {
  sky: "#4FC3F7",
  sun: "#FFD54F",
  grass: "#81C784",
  coral: "#FF8A65",
  lavender: "#CE93D8",
  mint: "#80CBC4",
  navy: "#1A2340",
  navyLight: "#253055",
  white: "#FFFFFF",
  offwhite: "#F7F9FC",
  muted: "#8892A4",
  border: "#E4EAF2",
  red: "#EF5350",
  green: "#66BB6A",
};

const classColors = {
  Playgroup: { bg: "#FFF3E0", accent: "#FF8A65", light: "#FFE0B2" },
  Nursery: { bg: "#E8F5E9", accent: "#66BB6A", light: "#C8E6C9" },
  LKG: { bg: "#E3F2FD", accent: "#42A5F5", light: "#BBDEFB" },
  UKG: { bg: "#F3E5F5", accent: "#AB47BC", light: "#E1BEE7" },
};

const roleColors = {
  admin: "#FF8A65",
  principal: "#AB47BC",
  teacher: "#42A5F5",
  parent: "#66BB6A",
};

// ============================================================
// MOCK DATA
// ============================================================
const CLASSES = ["Playgroup", "Nursery", "LKG", "UKG"];

const SUBJECTS = {
  Playgroup: ["Play & Learn", "Rhymes & Songs", "Art & Craft", "Physical Activity"],
  Nursery: ["English", "Math Basics", "EVS", "Art & Craft", "Rhymes"],
  LKG: ["English", "Mathematics", "EVS", "Hindi", "Art & Craft", "Physical Education"],
  UKG: ["English", "Mathematics", "EVS", "Hindi", "General Knowledge", "Art & Craft", "Physical Education"],
};

// enrollmentType: "full-year" | "term" | "custom-months"
// paymentMode: "monthly" | "termly" | "lump-sum"
// Term 1: Jun–Aug, Term 2: Sep–Nov, Term 3: Dec–Feb, Term 4: Mar
const TERMS = [
  { id: "T1", label: "Term 1", months: ["Jun","Jul","Aug"],    monthNums: [6,7,8],    dates: "Jun – Aug 2024" },
  { id: "T2", label: "Term 2", months: ["Sep","Oct","Nov"],    monthNums: [9,10,11],  dates: "Sep – Nov 2024" },
  { id: "T3", label: "Term 3", months: ["Dec","Jan","Feb"],    monthNums: [12,1,2],   dates: "Dec 2024 – Feb 2025" },
  { id: "T4", label: "Term 4", months: ["Mar"],               monthNums: [3],        dates: "Mar 2025" },
];
const ALL_MONTHS = [
  { key: "Jun-2024",  label: "June 2024",    term: "T1" },
  { key: "Jul-2024",  label: "July 2024",    term: "T1" },
  { key: "Aug-2024",  label: "August 2024",  term: "T1" },
  { key: "Sep-2024",  label: "September 2024", term: "T2" },
  { key: "Oct-2024",  label: "October 2024", term: "T2" },
  { key: "Nov-2024",  label: "November 2024",term: "T2" },
  { key: "Dec-2024",  label: "December 2024",term: "T3" },
  { key: "Jan-2025",  label: "January 2025", term: "T3" },
  { key: "Feb-2025",  label: "February 2025",term: "T3" },
  { key: "Mar-2025",  label: "March 2025",   term: "T4" },
];
const MONTHLY_FEE = 2500; // legacy fallback

// ── FEE CONFIGURATION ───────────────────────────────────────────────────────
const DEFAULT_FEE_CONFIG = {
  academicYear: "2024-25",
  yearLabel: "June 2024 – March 2025",
  classMonthlyFee: { Playgroup: 2000, Nursery: 2200, LKG: 2500, UKG: 2500 },
  termDiscountPct: 2,
  lumpSumDiscountPct: 5,
  registrationFee: 1000,
  lateFinePerMonth: 100,
  autoApplyLateFine: true,
};

// Per-student overrides keyed by student id
const DEFAULT_STUDENT_FEE_OVERRIDES = {
  3: { monthlyFee: 2500, lumpSumDiscountPct: 7, concessionPct: 0, concessionReason: "", feeNote: "Extra 2% head-discount on lump sum" },
  5: { monthlyFee: 2200, concessionPct: 10, concessionReason: "Sibling concession", feeNote: "" },
  6: { monthlyFee: 2300, concessionPct: 0, concessionReason: "", feeNote: "Custom rate at admission" },
};

function effectiveMonthlyFee(student, cfg, overrides) {
  const ov = overrides[student.id];
  const base = ov?.monthlyFee != null ? ov.monthlyFee : (cfg.classMonthlyFee[student.class] ?? 2500);
  const conc = ov?.concessionPct ?? 0;
  return Math.round(base * (1 - conc / 100));
}
function effectiveTermFee(student, cfg, overrides, numMonths) {
  const monthly = effectiveMonthlyFee(student, cfg, overrides);
  const disc = overrides[student.id]?.termDiscountPct ?? cfg.termDiscountPct;
  return Math.round(monthly * numMonths * (1 - disc / 100));
}
function effectiveLumpSumFee(student, cfg, overrides) {
  const monthly = effectiveMonthlyFee(student, cfg, overrides);
  const total = monthly * student.enrolledMonths.length;
  const disc = overrides[student.id]?.lumpSumDiscountPct ?? cfg.lumpSumDiscountPct;
  return Math.round(total * (1 - disc / 100));
}
function studentTotalDue(student, cfg, overrides) {
  if (student.paymentMode === "lump-sum") return effectiveLumpSumFee(student, cfg, overrides);
  const monthly = effectiveMonthlyFee(student, cfg, overrides);
  if (student.paymentMode === "termly") {
    const disc = overrides[student.id]?.termDiscountPct ?? cfg.termDiscountPct;
    return Math.round(monthly * student.enrolledMonths.length * (1 - disc / 100));
  }
  return monthly * student.enrolledMonths.length;
}


// ============================================================
// PERSISTENT DATA STORE (localStorage)
// ============================================================
const SEED_STUDENTS = [
  {
    id: 1, name: "Aarav Sharma", class: "UKG", rollNo: "UKG001", dob: "2019-03-15",
    parent: "Rajesh Sharma", phone: "9876543210", admissionDate: "2024-06-01", photo: "🧒",
    enrollmentType: "full-year", paymentMode: "monthly",
    enrolledMonths: ALL_MONTHS.map(m => m.key),
    payments: {
      "Jun-2024": { amount: 2500, status: "paid", date: "2024-06-05", txnId: "TXN001" },
      "Jul-2024": { amount: 2500, status: "paid", date: "2024-07-03", txnId: "TXN002" },
      "Aug-2024": { amount: 2500, status: "paid", date: "2024-08-07", txnId: "TXN003" },
      "Sep-2024": { amount: 2500, status: "paid", date: "2024-09-04", txnId: "TXN004" },
      "Oct-2024": { amount: 2500, status: "pending", date: null, txnId: null },
      "Nov-2024": { amount: 2500, status: "pending", date: null, txnId: null },
      "Dec-2024": { amount: 2500, status: "pending", date: null, txnId: null },
      "Jan-2025": { amount: 2500, status: "pending", date: null, txnId: null },
      "Feb-2025": { amount: 2500, status: "pending", date: null, txnId: null },
      "Mar-2025": { amount: 2500, status: "pending", date: null, txnId: null },
    }
  },
  {
    id: 2, name: "Priya Patel", class: "UKG", rollNo: "UKG002", dob: "2019-07-22",
    parent: "Suresh Patel", phone: "9876543211", admissionDate: "2024-06-01", photo: "👧",
    enrollmentType: "full-year", paymentMode: "termly",
    enrolledMonths: ALL_MONTHS.map(m => m.key),
    // termly: one payment covers 3 months
    payments: {
      "Jun-2024": { amount: 7500, status: "paid", date: "2024-06-02", txnId: "TXN010", installmentLabel: "Term 1 (Jun–Aug)" },
      "Jul-2024": { amount: 0,    status: "covered", date: null, txnId: null, coveredBy: "Jun-2024" },
      "Aug-2024": { amount: 0,    status: "covered", date: null, txnId: null, coveredBy: "Jun-2024" },
      "Sep-2024": { amount: 7500, status: "paid", date: "2024-09-01", txnId: "TXN011", installmentLabel: "Term 2 (Sep–Nov)" },
      "Oct-2024": { amount: 0,    status: "covered", date: null, txnId: null, coveredBy: "Sep-2024" },
      "Nov-2024": { amount: 0,    status: "covered", date: null, txnId: null, coveredBy: "Sep-2024" },
      "Dec-2024": { amount: 7500, status: "pending", date: null, txnId: null, installmentLabel: "Term 3 (Dec–Feb)" },
      "Jan-2025": { amount: 0,    status: "covered", date: null, txnId: null, coveredBy: "Dec-2024" },
      "Feb-2025": { amount: 0,    status: "covered", date: null, txnId: null, coveredBy: "Dec-2024" },
      "Mar-2025": { amount: 2500, status: "pending", date: null, txnId: null, installmentLabel: "Term 4 (Mar)" },
    }
  },
  {
    id: 3, name: "Rohan Kumar", class: "LKG", rollNo: "LKG001", dob: "2020-01-10",
    parent: "Anil Kumar", phone: "9876543212", admissionDate: "2024-06-01", photo: "🧒",
    enrollmentType: "full-year", paymentMode: "lump-sum",
    enrolledMonths: ALL_MONTHS.map(m => m.key),
    payments: {
      "Jun-2024": { amount: 25000, status: "paid", date: "2024-06-01", txnId: "TXN020", installmentLabel: "Full Year (Jun–Mar)" },
      "Jul-2024":  { amount: 0, status: "covered", coveredBy: "Jun-2024" },
      "Aug-2024":  { amount: 0, status: "covered", coveredBy: "Jun-2024" },
      "Sep-2024":  { amount: 0, status: "covered", coveredBy: "Jun-2024" },
      "Oct-2024":  { amount: 0, status: "covered", coveredBy: "Jun-2024" },
      "Nov-2024":  { amount: 0, status: "covered", coveredBy: "Jun-2024" },
      "Dec-2024":  { amount: 0, status: "covered", coveredBy: "Jun-2024" },
      "Jan-2025":  { amount: 0, status: "covered", coveredBy: "Jun-2024" },
      "Feb-2025":  { amount: 0, status: "covered", coveredBy: "Jun-2024" },
      "Mar-2025":  { amount: 0, status: "covered", coveredBy: "Jun-2024" },
    }
  },
  {
    id: 4, name: "Ananya Singh", class: "LKG", rollNo: "LKG002", dob: "2020-05-18",
    parent: "Vikram Singh", phone: "9876543213", admissionDate: "2024-09-01", photo: "👧",
    enrollmentType: "term", paymentMode: "termly",
    enrolledTerms: ["T2", "T3"],
    enrolledMonths: ["Sep-2024","Oct-2024","Nov-2024","Dec-2024","Jan-2025","Feb-2025"],
    payments: {
      "Sep-2024": { amount: 7500, status: "paid", date: "2024-09-02", txnId: "TXN030", installmentLabel: "Term 2 (Sep–Nov)" },
      "Oct-2024": { amount: 0, status: "covered", coveredBy: "Sep-2024" },
      "Nov-2024": { amount: 0, status: "covered", coveredBy: "Sep-2024" },
      "Dec-2024": { amount: 7500, status: "overdue", date: null, txnId: null, installmentLabel: "Term 3 (Dec–Feb)" },
      "Jan-2025": { amount: 0, status: "covered", coveredBy: "Dec-2024" },
      "Feb-2025": { amount: 0, status: "covered", coveredBy: "Dec-2024" },
    }
  },
  {
    id: 5, name: "Kabir Mehta", class: "Nursery", rollNo: "NUR001", dob: "2021-02-28",
    parent: "Deepak Mehta", phone: "9876543214", admissionDate: "2024-06-01", photo: "🧒",
    enrollmentType: "full-year", paymentMode: "monthly",
    enrolledMonths: ALL_MONTHS.map(m => m.key),
    payments: {
      "Jun-2024": { amount: 2500, status: "paid",    date: "2024-06-10", txnId: "TXN040" },
      "Jul-2024": { amount: 2500, status: "paid",    date: "2024-07-12", txnId: "TXN041" },
      "Aug-2024": { amount: 2500, status: "paid",    date: "2024-08-15", txnId: "TXN042" },
      "Sep-2024": { amount: 2500, status: "overdue", date: null, txnId: null },
      "Oct-2024": { amount: 2500, status: "overdue", date: null, txnId: null },
      "Nov-2024": { amount: 2500, status: "pending", date: null, txnId: null },
      "Dec-2024": { amount: 2500, status: "pending", date: null, txnId: null },
      "Jan-2025": { amount: 2500, status: "pending", date: null, txnId: null },
      "Feb-2025": { amount: 2500, status: "pending", date: null, txnId: null },
      "Mar-2025": { amount: 2500, status: "pending", date: null, txnId: null },
    }
  },
  {
    id: 6, name: "Ishaan Reddy", class: "Nursery", rollNo: "NUR002", dob: "2021-09-05",
    parent: "Ravi Reddy", phone: "9876543215", admissionDate: "2024-06-01", photo: "🧒",
    enrollmentType: "custom-months", paymentMode: "monthly",
    enrolledMonths: ["Jun-2024","Jul-2024","Aug-2024","Sep-2024","Oct-2024","Nov-2024"],
    payments: {
      "Jun-2024": { amount: 2500, status: "paid", date: "2024-06-08", txnId: "TXN050" },
      "Jul-2024": { amount: 2500, status: "paid", date: "2024-07-09", txnId: "TXN051" },
      "Aug-2024": { amount: 2500, status: "paid", date: "2024-08-11", txnId: "TXN052" },
      "Sep-2024": { amount: 2500, status: "paid", date: "2024-09-06", txnId: "TXN053" },
      "Oct-2024": { amount: 2500, status: "paid", date: "2024-10-05", txnId: "TXN054" },
      "Nov-2024": { amount: 2500, status: "pending", date: null, txnId: null },
    }
  },
  {
    id: 7, name: "Zara Khan", class: "Playgroup", rollNo: "PG001", dob: "2022-04-12",
    parent: "Imran Khan", phone: "9876543216", admissionDate: "2024-06-01", photo: "👧",
    enrollmentType: "full-year", paymentMode: "termly",
    enrolledMonths: ALL_MONTHS.map(m => m.key),
    payments: {
      "Jun-2024": { amount: 7500, status: "paid", date: "2024-06-03", txnId: "TXN060", installmentLabel: "Term 1 (Jun–Aug)" },
      "Jul-2024": { amount: 0, status: "covered", coveredBy: "Jun-2024" },
      "Aug-2024": { amount: 0, status: "covered", coveredBy: "Jun-2024" },
      "Sep-2024": { amount: 7500, status: "paid", date: "2024-09-03", txnId: "TXN061", installmentLabel: "Term 2 (Sep–Nov)" },
      "Oct-2024": { amount: 0, status: "covered", coveredBy: "Sep-2024" },
      "Nov-2024": { amount: 0, status: "covered", coveredBy: "Sep-2024" },
      "Dec-2024": { amount: 7500, status: "paid", date: "2024-12-04", txnId: "TXN062", installmentLabel: "Term 3 (Dec–Feb)" },
      "Jan-2025": { amount: 0, status: "covered", coveredBy: "Dec-2024" },
      "Feb-2025": { amount: 0, status: "covered", coveredBy: "Dec-2024" },
      "Mar-2025": { amount: 2500, status: "pending", date: null, txnId: null, installmentLabel: "Term 4 (Mar)" },
    }
  },
  {
    id: 8, name: "Dev Joshi", class: "Playgroup", rollNo: "PG002", dob: "2022-11-30",
    parent: "Manish Joshi", phone: "9876543217", admissionDate: "2024-09-01", photo: "🧒",
    enrollmentType: "term", paymentMode: "monthly",
    enrolledTerms: ["T2"],
    enrolledMonths: ["Sep-2024","Oct-2024","Nov-2024"],
    payments: {
      "Sep-2024": { amount: 2500, status: "paid",    date: "2024-09-05", txnId: "TXN070" },
      "Oct-2024": { amount: 2500, status: "paid",    date: "2024-10-07", txnId: "TXN071" },
      "Nov-2024": { amount: 2500, status: "pending", date: null, txnId: null },
    }
  },
];

const ENROLLMENT_LABELS = {
  "full-year":     { label: "Full Year",      color: "#1565C0", bg: "#E3F2FD" },
  "term":          { label: "Term-based",     color: "#6A1B9A", bg: "#F3E5F5" },
  "custom-months": { label: "Custom Months",  color: "#E65100", bg: "#FFF3E0" },
};
const PAYMENT_MODE_LABELS = {
  "monthly":   { label: "Monthly",    icon: "📅" },
  "termly":    { label: "Per Term",   icon: "📆" },
  "lump-sum":  { label: "Lump Sum",   icon: "💰" },
};

const SEED_MARKS = {
  1: { "English": 88, "Mathematics": 92, "EVS": 85, "Hindi": 78, "General Knowledge": 90, "Art & Craft": 95, "Physical Education": 88 },
  2: { "English": 72, "Mathematics": 68, "EVS": 75, "Hindi": 80, "General Knowledge": 65, "Art & Craft": 85, "Physical Education": 90 },
  3: { "English": 80, "Mathematics": 88, "EVS": 76, "Hindi": 72, "Art & Craft": 78, "Physical Education": 92 },
  4: { "English": 95, "Mathematics": 90, "EVS": 88, "Hindi": 85, "Art & Craft": 92, "Physical Education": 85 },
  5: { "English": 65, "Math Basics": 70, "EVS": 68, "Rhymes": 88, "Art & Craft": 82 },
  6: { "English": 78, "Math Basics": 82, "EVS": 79, "Rhymes": 90, "Art & Craft": 88 },
  7: { "Play & Learn": 85, "Rhymes & Songs": 92, "Art & Craft": 88, "Physical Activity": 95 },
  8: { "Play & Learn": 78, "Rhymes & Songs": 85, "Art & Craft": 90, "Physical Activity": 88 },
};

const SEED_SYLLABUS = {
  "UKG": {
    "English": [
      { topic: "Alphabet Recognition", done: true },
      { topic: "Vowels & Consonants", done: true },
      { topic: "Three Letter Words", done: true },
      { topic: "Simple Sentences", done: false },
      { topic: "Reading Comprehension", done: false },
    ],
    "Mathematics": [
      { topic: "Numbers 1–50", done: true },
      { topic: "Addition (single digit)", done: true },
      { topic: "Subtraction", done: true },
      { topic: "Shapes & Patterns", done: false },
      { topic: "Measurement Basics", done: false },
    ],
  },
  "LKG": {
    "English": [
      { topic: "Alphabet A–Z", done: true },
      { topic: "Phonics Introduction", done: true },
      { topic: "Two Letter Words", done: false },
      { topic: "Nursery Rhymes", done: true },
    ],
  },
};

const SEED_EXAMS = [
  { id: 1, name: "Unit Test 1", class: "All", date: "2025-02-15", time: "9:00 AM", subject: "All Subjects", status: "completed" },
  { id: 2, name: "Mid Term Exam", class: "All", date: "2025-04-10", time: "9:00 AM", subject: "All Subjects", status: "upcoming" },
  { id: 3, name: "Unit Test 2", class: "UKG,LKG", date: "2025-06-20", time: "9:00 AM", subject: "All Subjects", status: "upcoming" },
  { id: 4, name: "Annual Exam", class: "All", date: "2025-09-05", time: "9:00 AM", subject: "All Subjects", status: "upcoming" },
];



const SEED_ANNOUNCEMENTS = [
  { id: 1, title: "Annual Sports Day", date: "2025-01-25", content: "Annual Sports Day will be held on January 25th. Parents are invited!", category: "event" },
  { id: 2, title: "Parent-Teacher Meeting", date: "2025-01-18", content: "PTM scheduled for January 18th from 10 AM to 1 PM.", category: "meeting" },
  { id: 3, title: "Holiday Notice", date: "2025-01-26", content: "School will remain closed on Republic Day, January 26th.", category: "holiday" },
];

// ============================================================
// HELPER: fee status
// ============================================================
function studentFeeStatus(student) {
  const active = Object.entries(student.payments).filter(([, p]) => p.status !== "covered");
  if (active.some(([, p]) => p.status === "overdue")) return "overdue";
  if (active.some(([, p]) => p.status === "pending")) return "pending";
  return "paid";
}

// ============================================================
// LOCALSTORAGE DATA STORE
// ============================================================
const SEED_USERS = [
  { id: 1, name: "Mrs. Sunita Rao", email: "principal@aadyant.edu.in", role: "principal", phone: "9876500001", assignedClass: "", active: true, joinDate: "2023-06-01", passwordHash: null },
  { id: 2, name: "Ms. Priya Sharma", email: "priya@aadyant.edu.in", role: "teacher", phone: "9876500002", assignedClass: "UKG", active: true, joinDate: "2023-06-01", passwordHash: null },
  { id: 3, name: "Mr. Ravi Nair", email: "ravi@aadyant.edu.in", role: "teacher", phone: "9876500003", assignedClass: "LKG", active: true, joinDate: "2024-06-01", passwordHash: null },
  { id: 4, name: "Ms. Deepa Iyer", email: "deepa@aadyant.edu.in", role: "teacher", phone: "9876500004", assignedClass: "Nursery", active: true, joinDate: "2024-06-01", passwordHash: null },
  { id: 5, name: "Rajesh Sharma", email: "rajesh.s@gmail.com", role: "parent", phone: "9876543210", assignedClass: "", linkedStudentId: 1, active: true, joinDate: "2024-06-01", passwordHash: null },
  { id: 6, name: "Suresh Patel", email: "suresh.p@gmail.com", role: "parent", phone: "9876543211", assignedClass: "", linkedStudentId: 2, active: true, joinDate: "2024-06-01", passwordHash: null },
];

const LS_KEYS = { students: "ag_students", marks: "ag_marks", syllabus: "ag_syllabus", exams: "ag_exams", announcements: "ag_announcements", feeConfig: "ag_feeconfig", overrides: "ag_overrides", users: "ag_users" };

function lsGet(key, seed) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : seed; }
  catch { return seed; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// React context for global app data
const AppDataContext = React.createContext(null);

function AppDataProvider({ children }) {
  const [students, setStudentsRaw]     = useState(() => lsGet(LS_KEYS.students, SEED_STUDENTS));
  const [marks, setMarksRaw]           = useState(() => lsGet(LS_KEYS.marks, SEED_MARKS));
  const [syllabus, setSyllabusRaw]     = useState(() => lsGet(LS_KEYS.syllabus, SEED_SYLLABUS));
  const [exams, setExamsRaw]           = useState(() => lsGet(LS_KEYS.exams, SEED_EXAMS));
  const [announcements, setAnnouncementsRaw] = useState(() => lsGet(LS_KEYS.announcements, SEED_ANNOUNCEMENTS));
  const [feeConfig, setFeeConfigRaw]   = useState(() => lsGet(LS_KEYS.feeConfig, DEFAULT_FEE_CONFIG));
  const [studentOverrides, setOverridesRaw] = useState(() => lsGet(LS_KEYS.overrides, DEFAULT_STUDENT_FEE_OVERRIDES));
  const [users, setUsersRaw] = useState(() => lsGet(LS_KEYS.users, SEED_USERS));

  const setStudents = v => { const nv = typeof v === "function" ? v(students) : v; setStudentsRaw(nv); lsSet(LS_KEYS.students, nv); };
  const setMarks    = v => { const nv = typeof v === "function" ? v(marks) : v;    setMarksRaw(nv);    lsSet(LS_KEYS.marks, nv); };
  const setSyllabus = v => { const nv = typeof v === "function" ? v(syllabus) : v; setSyllabusRaw(nv); lsSet(LS_KEYS.syllabus, nv); };
  const setExams    = v => { const nv = typeof v === "function" ? v(exams) : v;    setExamsRaw(nv);    lsSet(LS_KEYS.exams, nv); };
  const setAnnouncements = v => { const nv = typeof v === "function" ? v(announcements) : v; setAnnouncementsRaw(nv); lsSet(LS_KEYS.announcements, nv); };
  const setFeeConfig = v => { const nv = typeof v === "function" ? v(feeConfig) : v; setFeeConfigRaw(nv); lsSet(LS_KEYS.feeConfig, nv); };
  const setStudentOverrides = v => { const nv = typeof v === "function" ? v(studentOverrides) : v; setOverridesRaw(nv); lsSet(LS_KEYS.overrides, nv); };
  const setUsers = v => { const nv = typeof v === "function" ? v(users) : v; setUsersRaw(nv); lsSet(LS_KEYS.users, nv); };

  const addUser = (userData) => {
    const nextId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
    const newUser = { ...userData, id: nextId, active: true, joinDate: new Date().toISOString().slice(0, 10) };
    setUsers(prev => [...prev, newUser]);
    return newUser;
  };
  const updateUser = (id, updates) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
  };
  const deleteUser = (id) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  // Add student
  const addStudent = (formData) => {
    const nextId = students.length > 0 ? Math.max(...students.map(s => s.id)) + 1 : 1;
    const newS = {
      ...formData, id: nextId,
      enrollmentType: "full-year", paymentMode: "monthly",
      enrolledMonths: ALL_MONTHS.map(m => m.key),
      payments: Object.fromEntries(ALL_MONTHS.map(m => [m.key, { amount: feeConfig.classMonthlyFee?.[formData.class] || 2000, status: "pending", date: null, txnId: null }]))
    };
    setStudents(prev => [...prev, newS]);
    return newS;
  };

  // Update student payment
  const recordPayment = (studentId, monthKey, paymentData) => {
    setStudents(prev => prev.map(s => s.id !== studentId ? s : {
      ...s, payments: { ...s.payments, [monthKey]: { ...s.payments[monthKey], ...paymentData, status: "paid", date: paymentData.date || new Date().toISOString().slice(0,10), txnId: paymentData.txnId || `TXN${Date.now()}` } }
    }));
  };

  // Toggle syllabus topic done
  const toggleSyllabusTopic = (cls, subject, topicIdx) => {
    setSyllabus(prev => {
      const updated = { ...prev };
      if (updated[cls]?.[subject]?.[topicIdx] !== undefined) {
        updated[cls] = { ...updated[cls], [subject]: updated[cls][subject].map((t, i) => i === topicIdx ? { ...t, done: !t.done } : t) };
      }
      return updated;
    });
  };

  // Save marks
  const saveMarks = (studentId, newMarks) => {
    setMarks(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), ...newMarks } }));
  };

  // Add announcement
  const addAnnouncement = (ann) => {
    const nextId = announcements.length > 0 ? Math.max(...announcements.map(a => a.id)) + 1 : 1;
    setAnnouncements(prev => [{ ...ann, id: nextId }, ...prev]);
  };
  const deleteAnnouncement = (id) => setAnnouncements(prev => prev.filter(a => a.id !== id));
  const deleteExam = (id) => setExams(prev => prev.filter(e => e.id !== id));

  // Add exam
  const addExam = (exam) => {
    const nextId = exams.length > 0 ? Math.max(...exams.map(e => e.id)) + 1 : 1;
    setExams(prev => [...prev, { ...exam, id: nextId }]);
  };

  const resetAllData = () => {
    setStudents(SEED_STUDENTS); setMarks(SEED_MARKS); setSyllabus(SEED_SYLLABUS);
    setExams(SEED_EXAMS); setAnnouncements(SEED_ANNOUNCEMENTS);
    setFeeConfig(DEFAULT_FEE_CONFIG); setStudentOverrides(DEFAULT_STUDENT_FEE_OVERRIDES);
    setUsers(SEED_USERS);
  };

  return (
    <AppDataContext.Provider value={{
      students, marks, syllabus, exams, announcements, feeConfig, studentOverrides, users,
      setStudents, setMarks, setSyllabus, setExams, setAnnouncements, setFeeConfig, setStudentOverrides, setUsers,
      addStudent, recordPayment, toggleSyllabusTopic, saveMarks, addExam, deleteExam, addAnnouncement, deleteAnnouncement, resetAllData,
      addUser, updateUser, deleteUser
    }}>
      {children}
    </AppDataContext.Provider>
  );
}

function useAppData() { return React.useContext(AppDataContext); }

// ============================================================
// CSS INJECTION
// ============================================================
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Fredoka+One&display=swap');
  
  * { box-sizing: border-box; margin: 0; padding: 0; }
  
  body { font-family: 'Nunito', sans-serif; background: #F0F4FA; }
  
  .app-shell {
    display: flex; min-height: 100vh; background: #F0F4FA;
  }
  
  /* SIDEBAR */
  .sidebar {
    width: 240px; background: ${palette.navy}; min-height: 100vh;
    display: flex; flex-direction: column; position: fixed; top: 0; left: 0; z-index: 100;
    box-shadow: 4px 0 20px rgba(0,0,0,0.15);
  }
  .sidebar-logo {
    padding: 24px 20px 16px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .logo-mark {
    font-family: 'Fredoka One', cursive;
    font-size: 22px; color: ${palette.sun};
    display: flex; align-items: center; gap: 8px;
  }
  .logo-sub { font-size: 10px; color: ${palette.muted}; letter-spacing: 2px; text-transform: uppercase; margin-top: 2px; }
  
  .role-badge {
    margin: 12px 16px;
    padding: 8px 12px;
    border-radius: 10px;
    font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;
    display: flex; align-items: center; gap: 6px;
  }
  
  .nav-section { padding: 8px 0; flex: 1; overflow-y: auto; }
  .nav-label { font-size: 9px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: ${palette.muted}; padding: 12px 20px 6px; }
  
  .nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 20px; cursor: pointer;
    font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.65);
    border-left: 3px solid transparent;
    transition: all 0.2s;
  }
  .nav-item:hover { color: white; background: rgba(255,255,255,0.06); }
  .nav-item.active { color: white; background: rgba(255,255,255,0.1); border-left-color: ${palette.sky}; }
  .nav-icon { width: 18px; text-align: center; font-size: 16px; }
  
  /* MAIN CONTENT */
  .main-content { margin-left: 240px; flex: 1; min-height: 100vh; }
  
  /* TOPBAR */
  .topbar {
    background: white; padding: 0 28px;
    height: 64px; display: flex; align-items: center; justify-content: space-between;
    border-bottom: 1px solid ${palette.border};
    position: sticky; top: 0; z-index: 50;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  }
  .topbar-title { font-size: 20px; font-weight: 800; color: ${palette.navy}; }
  .topbar-right { display: flex; align-items: center; gap: 16px; }
  .topbar-avatar {
    width: 38px; height: 38px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; cursor: pointer;
    background: ${palette.offwhite};
    border: 2px solid ${palette.border};
  }
  .notification-btn {
    width: 38px; height: 38px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    background: ${palette.offwhite}; cursor: pointer; position: relative;
    border: 1px solid ${palette.border}; font-size: 18px;
  }
  .notif-dot {
    width: 8px; height: 8px; border-radius: 50%; background: ${palette.coral};
    position: absolute; top: 6px; right: 6px;
    border: 2px solid white;
  }
  
  /* PAGE */
  .page { padding: 28px; }
  .page-header { margin-bottom: 24px; }
  .page-title { font-size: 26px; font-weight: 900; color: ${palette.navy}; }
  .page-sub { font-size: 13px; color: ${palette.muted}; margin-top: 4px; }
  
  /* CARDS */
  .card {
    background: white; border-radius: 16px;
    border: 1px solid ${palette.border};
    box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  }
  .card-header {
    padding: 18px 20px 14px;
    border-bottom: 1px solid ${palette.border};
    display: flex; align-items: center; justify-content: space-between;
  }
  .card-title { font-size: 15px; font-weight: 800; color: ${palette.navy}; }
  .card-body { padding: 20px; }
  
  /* STAT CARDS */
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
  .stat-card {
    background: white; border-radius: 16px; padding: 20px;
    border: 1px solid ${palette.border};
    box-shadow: 0 2px 12px rgba(0,0,0,0.04);
    position: relative; overflow: hidden;
  }
  .stat-card::before {
    content: ''; position: absolute; top: -20px; right: -20px;
    width: 80px; height: 80px; border-radius: 50%;
    opacity: 0.12;
  }
  .stat-icon { font-size: 26px; margin-bottom: 10px; }
  .stat-value { font-size: 32px; font-weight: 900; color: ${palette.navy}; line-height: 1; }
  .stat-label { font-size: 12px; color: ${palette.muted}; font-weight: 600; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
  .stat-change { font-size: 11px; font-weight: 700; margin-top: 8px; }
  .stat-change.up { color: ${palette.green}; }
  .stat-change.down { color: ${palette.red}; }
  
  /* GRID LAYOUTS */
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  
  /* STUDENT CARDS */
  .student-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
  .student-card {
    background: white; border-radius: 16px; padding: 20px;
    border: 1px solid ${palette.border}; cursor: pointer;
    transition: all 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  }
  .student-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
  .student-card-top { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
  .student-avatar {
    width: 52px; height: 52px; border-radius: 14px;
    display: flex; align-items: center; justify-content: center;
    font-size: 28px;
  }
  .student-name { font-size: 15px; font-weight: 800; color: ${palette.navy}; }
  .student-roll { font-size: 11px; color: ${palette.muted}; font-weight: 600; }
  .class-pill {
    display: inline-flex; align-items: center;
    padding: 3px 10px; border-radius: 20px;
    font-size: 11px; font-weight: 700;
  }
  .fee-badge {
    padding: 3px 10px; border-radius: 20px;
    font-size: 11px; font-weight: 700;
    display: inline-flex; align-items: center; gap: 4px;
  }
  .fee-paid { background: #E8F5E9; color: #388E3C; }
  .fee-pending { background: #FFF8E1; color: #F57F17; }
  .fee-overdue { background: #FFEBEE; color: #C62828; }
  
  /* TABLES */
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; }
  th {
    text-align: left; padding: 10px 14px;
    font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;
    color: ${palette.muted}; background: ${palette.offwhite};
    border-bottom: 1px solid ${palette.border};
  }
  td {
    padding: 12px 14px; font-size: 13px; color: ${palette.navy};
    border-bottom: 1px solid ${palette.border}; font-weight: 600;
  }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: #F8FAFF; }
  
  /* BUTTONS */
  .btn {
    padding: 9px 18px; border-radius: 10px; font-size: 13px; font-weight: 700;
    cursor: pointer; border: none; transition: all 0.2s;
    display: inline-flex; align-items: center; gap: 6px;
    font-family: 'Nunito', sans-serif;
  }
  .btn-primary { background: ${palette.navy}; color: white; }
  .btn-primary:hover { background: ${palette.navyLight}; transform: translateY(-1px); }
  .btn-success { background: ${palette.green}; color: white; }
  .btn-danger { background: ${palette.red}; color: white; }
  .btn-ghost { background: ${palette.offwhite}; color: ${palette.navy}; border: 1px solid ${palette.border}; }
  .btn-ghost:hover { background: ${palette.border}; }
  .btn-sm { padding: 6px 12px; font-size: 12px; border-radius: 8px; }
  
  /* INPUTS */
  .input {
    width: 100%; padding: 10px 14px; border-radius: 10px;
    border: 1.5px solid ${palette.border}; font-size: 13px; font-weight: 600;
    color: ${palette.navy}; background: white; outline: none;
    font-family: 'Nunito', sans-serif; transition: border 0.2s;
  }
  .input:focus { border-color: ${palette.sky}; box-shadow: 0 0 0 3px rgba(79,195,247,0.15); }
  .select {
    padding: 9px 14px; border-radius: 10px;
    border: 1.5px solid ${palette.border}; font-size: 13px; font-weight: 600;
    color: ${palette.navy}; background: white; outline: none;
    font-family: 'Nunito', sans-serif; cursor: pointer;
  }
  
  /* FORM */
  .form-group { margin-bottom: 16px; }
  .form-label { display: block; font-size: 12px; font-weight: 800; color: ${palette.navy}; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  
  /* PROGRESS BARS */
  .progress-bar { height: 8px; background: ${palette.offwhite}; border-radius: 4px; overflow: hidden; }
  .progress-fill { height: 100%; border-radius: 4px; transition: width 0.6s ease; }
  
  /* TABS */
  .tabs { display: flex; gap: 4px; margin-bottom: 20px; background: ${palette.offwhite}; padding: 4px; border-radius: 12px; width: fit-content; }
  .tab {
    padding: 8px 18px; border-radius: 9px; font-size: 13px; font-weight: 700;
    cursor: pointer; color: ${palette.muted}; transition: all 0.2s;
    border: none; background: none; font-family: 'Nunito', sans-serif;
  }
  .tab.active { background: white; color: ${palette.navy}; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  
  /* CLASS CARDS */
  .class-overview-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
  .class-card {
    border-radius: 16px; padding: 20px; cursor: pointer;
    transition: all 0.2s; border: 2px solid transparent;
    position: relative; overflow: hidden;
  }
  .class-card:hover { transform: translateY(-3px); box-shadow: 0 10px 30px rgba(0,0,0,0.12); }
  .class-card.selected { border-color: currentColor; }
  .class-card-icon { font-size: 36px; margin-bottom: 10px; }
  .class-card-name { font-family: 'Fredoka One', cursive; font-size: 20px; }
  .class-card-count { font-size: 13px; font-weight: 700; opacity: 0.7; margin-top: 4px; }
  
  /* PERFORMANCE BARS */
  .perf-subject { margin-bottom: 14px; }
  .perf-subj-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  .perf-subj-name { font-size: 13px; font-weight: 700; color: ${palette.navy}; }
  .perf-score { font-size: 14px; font-weight: 900; }
  
  /* SYLLABUS */
  .syllabus-item {
    display: flex; align-items: center; gap: 12px; padding: 10px 0;
    border-bottom: 1px solid ${palette.border};
  }
  .syllabus-item:last-child { border-bottom: none; }
  .check-circle {
    width: 24px; height: 24px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; flex-shrink: 0;
  }
  .check-done { background: #E8F5E9; color: #388E3C; }
  .check-todo { background: ${palette.offwhite}; color: ${palette.muted}; }
  
  /* ANNOUNCEMENT CARDS */
  .ann-card { padding: 16px; border-radius: 12px; margin-bottom: 12px; border: 1px solid ${palette.border}; }
  .ann-category-event { border-left: 4px solid ${palette.sky}; }
  .ann-category-meeting { border-left: 4px solid ${palette.lavender}; }
  .ann-category-holiday { border-left: 4px solid ${palette.coral}; }
  
  /* LOGIN SCREEN */
  .login-wrap {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, ${palette.navy} 0%, #2D4A8C 100%);
    position: relative; overflow: hidden;
  }
  .login-bubbles { position: absolute; inset: 0; pointer-events: none; }
  .bubble {
    position: absolute; border-radius: 50%; opacity: 0.06;
  }
  .login-card {
    background: white; border-radius: 24px; padding: 40px;
    width: 400px; position: relative; z-index: 1;
    box-shadow: 0 30px 80px rgba(0,0,0,0.3);
  }
  .login-logo { text-align: center; margin-bottom: 28px; }
  .login-logo-mark { font-family: 'Fredoka One', cursive; font-size: 32px; color: ${palette.navy}; }
  .login-logo-sub { font-size: 11px; color: ${palette.muted}; letter-spacing: 2px; text-transform: uppercase; margin-top: 2px; }
  .role-selector { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 20px; }
  .role-btn {
    padding: 10px; border-radius: 10px; border: 2px solid ${palette.border};
    cursor: pointer; text-align: center; transition: all 0.2s;
    font-size: 12px; font-weight: 700; color: ${palette.muted};
    background: white; font-family: 'Nunito', sans-serif;
  }
  .role-btn.selected { border-color: ${palette.navy}; background: ${palette.navy}; color: white; }
  
  /* MODAL */
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.5);
    display: flex; align-items: center; justify-content: center;
    z-index: 200; backdrop-filter: blur(4px);
  }
  .modal {
    background: white; border-radius: 20px; padding: 28px;
    width: 560px; max-height: 90vh; overflow-y: auto;
    box-shadow: 0 30px 80px rgba(0,0,0,0.2);
  }
  .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
  .modal-title { font-size: 20px; font-weight: 900; color: ${palette.navy}; }
  .close-btn { width: 32px; height: 32px; border-radius: 8px; border: none; cursor: pointer; background: ${palette.offwhite}; font-size: 18px; display: flex; align-items: center; justify-content: center; }
  
  /* CHART BARS (CSS only) */
  .chart-bars { display: flex; align-items: flex-end; gap: 8px; height: 120px; padding-bottom: 20px; position: relative; }
  .chart-bar-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; }
  .chart-bar { width: 100%; border-radius: 6px 6px 0 0; transition: height 0.6s ease; }
  .chart-bar-label { font-size: 10px; font-weight: 700; color: ${palette.muted}; margin-top: 6px; text-align: center; }
  
  /* BADGE */
  .badge { padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 700; }
  .badge-upcoming { background: #E3F2FD; color: #1565C0; }
  .badge-completed { background: #E8F5E9; color: #2E7D32; }
  
  /* RESPONSIVE NOTE */
  .mobile-note { display: none; }
  @media (max-width: 900px) {
    .sidebar { width: 60px; }
    .sidebar-logo, .nav-label, .nav-item span, .logo-sub, .role-badge { display: none; }
    .main-content { margin-left: 60px; }
    .stats-grid { grid-template-columns: 1fr 1fr; }
    .class-overview-grid { grid-template-columns: 1fr 1fr; }
  }
  
  /* SCROLLBAR */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${palette.border}; border-radius: 3px; }
  
  /* CHIP */
  .chip { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
`;

// ============================================================
// HELPERS
// ============================================================
function avg(marks) {
  const vals = Object.values(marks);
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
}
function grade(score) {
  if (score >= 90) return { label: "A+", color: palette.green };
  if (score >= 80) return { label: "A", color: "#4CAF50" };
  if (score >= 70) return { label: "B", color: palette.sky };
  if (score >= 60) return { label: "C", color: palette.sun };
  return { label: "D", color: palette.coral };
}
function scoreColor(score) {
  if (score >= 80) return palette.green;
  if (score >= 60) return palette.sky;
  return palette.coral;
}
function strengths(marks) {
  const sorted = Object.entries(marks).sort((a, b) => b[1] - a[1]);
  return sorted.slice(0, 2).map(([s]) => s);
}
function improvements(marks) {
  const sorted = Object.entries(marks).sort((a, b) => a[1] - b[1]);
  return sorted.slice(0, 2).filter(([, v]) => v < 80).map(([s]) => s);
}

// ============================================================
// COMPONENTS
// ============================================================

// Simple hash (not cryptographic — for demo/localStorage use only)
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return String(Math.abs(hash));
}

// Built-in admin account — always exists, cannot be deleted
const ADMIN_ACCOUNT = {
  id: 0, name: "Admin User", email: "admin@aadyant.edu.in",
  passwordHash: simpleHash("admin123"), role: "admin",
  phone: "", assignedClass: "", active: true, joinDate: "2023-01-01",
};

function LoginScreen({ onLogin, users }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  function handleSubmit() {
    if (!email.trim() || !pass.trim()) { setError("Please enter email and password."); return; }
    const hash = simpleHash(pass);
    // Check built-in admin first
    if (email.trim().toLowerCase() === ADMIN_ACCOUNT.email && hash === ADMIN_ACCOUNT.passwordHash) {
      onLogin("admin", ADMIN_ACCOUNT);
      return;
    }
    // Check users list
    const match = users.find(u => u.email.trim().toLowerCase() === email.trim().toLowerCase() && u.passwordHash === hash && u.active);
    if (match) {
      onLogin(match.role, match);
    } else {
      const emailMatch = users.find(u => u.email.trim().toLowerCase() === email.trim().toLowerCase());
      if (emailMatch && !emailMatch.active) {
        setError("This account has been disabled. Contact your admin.");
      } else if (emailMatch && emailMatch.passwordHash !== hash) {
        setError("Incorrect password.");
      } else if (emailMatch && !emailMatch.passwordHash) {
        setError("No password set for this account. Ask admin to set a password.");
      } else {
        setError("No account found with this email.");
      }
    }
  }

  return (
    <div className="login-wrap">
      <style>{CSS}</style>
      <div className="login-bubbles">
        {[
          { w: 300, top: "-10%", left: "-5%", c: palette.sky },
          { w: 200, top: "60%", right: "-5%", c: palette.sun },
          { w: 150, top: "40%", left: "10%", c: palette.lavender },
          { w: 400, bottom: "-15%", right: "10%", c: palette.mint },
        ].map((b, i) => (
          <div key={i} className="bubble" style={{ width: b.w, height: b.w, top: b.top, left: b.left, right: b.right, bottom: b.bottom, background: b.c }} />
        ))}
      </div>
      <div className="login-card">
        <div className="login-logo">
          <div style={{ fontSize: 50, marginBottom: 8 }}>🪔</div>
          <div className="login-logo-mark">Aadyant Gurukulam</div>
          <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 13, color: palette.coral }}>Deshpande Education Foundation</div>
          <div className="login-logo-sub">Management Portal</div>
        </div>

        {error && (
          <div style={{ background: "#FFEBEE", color: "#C62828", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            ⚠️ {error}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input className="input" type="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }}
            placeholder="Enter your email" onKeyDown={e => e.key === "Enter" && handleSubmit()} />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <div style={{ position: "relative" }}>
            <input className="input" type={showPass ? "text" : "password"} value={pass}
              onChange={e => { setPass(e.target.value); setError(""); }}
              placeholder="Enter your password" onKeyDown={e => e.key === "Enter" && handleSubmit()}
              style={{ paddingRight: 44 }} />
            <button onClick={() => setShowPass(s => !s)}
              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: palette.muted }}>
              {showPass ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: 15, marginTop: 8 }} onClick={handleSubmit}>
          Sign In →
        </button>
        <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: palette.muted, lineHeight: 1.6 }}>
          Default admin: <strong>admin@aadyant.edu.in</strong> / <strong>admin123</strong><br/>
          Other users must be created by the admin with a password.
        </div>
        <div style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: palette.border }}>
          © Deshpande Education Foundation
        </div>
      </div>
    </div>
  );
}

// ---- DASHBOARD ----
function Dashboard({ role }) {
  const { students: STUDENTS, exams: EXAMS, announcements: ANNOUNCEMENTS } = useAppData();
  const totalStudents = STUDENTS.length;
  const paidFees = STUDENTS.filter(s => studentFeeStatus(s) === "paid").length;
  const totalCollectedAmt = STUDENTS.reduce((sum, s) =>
    sum + Object.values(s.payments).filter(p => p.status === "paid").reduce((a, p) => a + p.amount, 0), 0);
  const upcomingExams = EXAMS.filter(e => e.status === "upcoming").length;

  const classCount = {};
  CLASSES.forEach(c => { classCount[c] = STUDENTS.filter(s => s.class === c).length; });

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Good Morning! 🌟</div>
        <div className="page-sub">Here's what's happening at Aadyant Gurukulam today</div>
      </div>

      <div className="stats-grid">
        {[
          { icon: "👦", value: totalStudents, label: "Total Students", change: "+2 this month", up: true, color: palette.sky },
          ...(role !== "teacher"
            ? [{ icon: "💰", value: `${Math.round((paidFees / totalStudents) * 100)}%`, label: "Fee Collection", change: `₹${totalCollectedAmt.toLocaleString()} collected`, up: true, color: palette.green }]
            : [{ icon: "📚", value: "60%", label: "Syllabus Coverage", change: "Across all classes", color: palette.green }]),
          { icon: "📝", value: upcomingExams, label: "Upcoming Exams", change: "Next: Apr 10", color: palette.lavender },
          { icon: "📢", value: ANNOUNCEMENTS.length, label: "Announcements", change: "2 new today", color: palette.coral },
        ].map((s, i) => (
          <div className="stat-card" key={i} style={{ borderTop: `4px solid ${s.color}` }}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
            <div className={`stat-change ${s.up ? "up" : ""}`}>{s.change}</div>
          </div>
        ))}
      </div>

      <div className="class-overview-grid">
        {CLASSES.map(cls => {
          const cc = classColors[cls];
          const count = classCount[cls];
          const icons = { Playgroup: "🎪", Nursery: "🌱", LKG: "📚", UKG: "🎓" };
          return (
            <div className="class-card" key={cls} style={{ background: cc.bg, color: cc.accent }}>
              <div className="class-card-icon">{icons[cls]}</div>
              <div className="class-card-name">{cls}</div>
              <div className="class-card-count">{count} students enrolled</div>
              <div style={{ marginTop: 12 }}>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${(count / 4) * 100}%`, background: cc.accent }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div className="card-title">📢 Announcements</div>
            <button className="btn btn-ghost btn-sm">View All</button>
          </div>
          <div className="card-body">
            {ANNOUNCEMENTS.map(a => (
              <div key={a.id} className={`ann-card ann-category-${a.category}`}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: palette.navy }}>{a.title}</div>
                  <div style={{ fontSize: 11, color: palette.muted }}>{a.date}</div>
                </div>
                <div style={{ fontSize: 12, color: palette.muted, marginTop: 4 }}>{a.content}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">📅 Exam Schedule</div>
          </div>
          <div className="card-body">
            {EXAMS.map(e => (
              <div key={e.id} style={{ padding: "12px 0", borderBottom: `1px solid ${palette.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13, color: palette.navy }}>{e.name}</div>
                  <div style={{ fontSize: 11, color: palette.muted, marginTop: 2 }}>{e.date} · {e.time} · {e.class}</div>
                </div>
                <span className={`badge badge-${e.status}`}>{e.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- STUDENTS ----
function StudentsPage({ role }) {
  const { students: STUDENTS, marks: MARKS, addStudent } = useAppData();
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("All");
  const [feeFilter, setFeeFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const ROLL_PREFIXES = { Playgroup: "PG", Nursery: "NUR", LKG: "LKG", UKG: "UKG" };
  const generateRollNo = (cls, admissionDate) => {
    if (!admissionDate) return "";
    const classStudents = STUDENTS.filter(s => s.class === cls);
    const seq = String(classStudents.length + 1).padStart(3, "0");
    const d = new Date(admissionDate);
    const yr = String(d.getFullYear()).slice(2);
    return `${ROLL_PREFIXES[cls] || cls.slice(0,3).toUpperCase()}${yr}${seq}`;
  };
  const EMPTY_STUDENT = { name: "", class: "UKG", rollNo: "", dob: "", admissionDate: "", fatherName: "", motherName: "", guardianName: "", guardianRelation: "", phone: "", altPhone: "", photo: null, photoPreview: null };
  const [newStudent, setNewStudent] = useState(EMPTY_STUDENT);
  const updateNewStudent = (field, val) => setNewStudent(prev => {
    const updated = { ...prev, [field]: val };
    if (field === "class" || field === "admissionDate") {
      updated.rollNo = generateRollNo(updated.class, updated.admissionDate);
    }
    return updated;
  });

  const filtered = STUDENTS.filter(s =>
    (classFilter === "All" || s.class === classFilter) &&
    (feeFilter === "All" || studentFeeStatus(s) === feeFilter) &&
    (s.name.toLowerCase().includes(search.toLowerCase()) || s.rollNo.toLowerCase().includes(search.toLowerCase()))
  );

  const canEdit = role === "admin" || role === "principal";

  return (
    <div className="page">
      <div className="page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div className="page-title">Student Registry 👦</div>
          <div className="page-sub">{filtered.length} students found</div>
        </div>
        {canEdit && <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Student</button>}
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input className="input" placeholder="🔍 Search by name or roll no..." style={{ maxWidth: 280 }} value={search} onChange={e => setSearch(e.target.value)} />
        <select className="select" value={classFilter} onChange={e => setClassFilter(e.target.value)}>
          <option>All</option>
          {CLASSES.map(c => <option key={c}>{c}</option>)}
        </select>
        {role !== "teacher" && (
          <select className="select" value={feeFilter} onChange={e => setFeeFilter(e.target.value)}>
            <option>All</option>
            <option>paid</option>
            <option>pending</option>
            <option>overdue</option>
          </select>
        )}
      </div>

      <div className="student-grid">
        {filtered.map(s => {
          const cc = classColors[s.class];
          const feeStatus = studentFeeStatus(s);
          return (
            <div className="student-card" key={s.id} onClick={() => setSelected(s)}>
              <div className="student-card-top">
                <div className="student-avatar" style={{ background: cc.light }}>{s.photo}</div>
                <div>
                  <div className="student-name">{s.name}</div>
                  <div className="student-roll">{s.rollNo}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span className="class-pill" style={{ background: cc.bg, color: cc.accent }}>{s.class}</span>
                {role !== "teacher" && (
                  <span className={`fee-badge fee-${feeStatus}`}>
                    {feeStatus === "paid" ? "✓" : feeStatus === "overdue" ? "⚠" : "○"} {feeStatus}
                  </span>
                )}
                {role !== "teacher" && (
                  <span className="chip" style={{ background: ENROLLMENT_LABELS[s.enrollmentType].bg, color: ENROLLMENT_LABELS[s.enrollmentType].color, fontSize: 10 }}>
                    {ENROLLMENT_LABELS[s.enrollmentType].label}
                  </span>
                )}
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: palette.muted, display: "flex", gap: 16 }}>
                <span>👨 {s.fatherName || s.parent}</span>
                <span>📱 {s.phone.slice(-4).padStart(10, '*')}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Student Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" style={{ maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: "50%", overflow: "hidden",
                  background: classColors[selected.class]?.light || palette.offwhite,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, flexShrink: 0
                }}>
                  {selected.photoPreview
                    ? <img src={selected.photoPreview} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                    : selected.photo}
                </div>
                <div>
                  <div className="modal-title">{selected.name}</div>
                  <div style={{ fontSize: 12, color: palette.muted }}>{selected.rollNo} · {selected.class}</div>
                </div>
              </div>
              <button className="close-btn" onClick={() => setSelected(null)}>✕</button>
            </div>

            <div style={{ fontSize: 12, fontWeight: 800, color: palette.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Student Details</div>
            <div className="form-row" style={{ marginBottom: 16 }}>
              {[
                { label: "Date of Birth", value: selected.dob },
                { label: "Admission Date", value: selected.admissionDate },
              ].map((f, i) => (
                <div key={i}>
                  <div className="form-label">{f.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: palette.navy }}>{f.value}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 12, fontWeight: 800, color: palette.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Parent / Guardian</div>
            <div className="form-row" style={{ marginBottom: 16 }}>
              {[
                { label: "Father's Name", value: selected.fatherName || selected.parent },
                { label: "Mother's Name", value: selected.motherName || "—" },
                { label: "Primary Mobile", value: selected.phone },
                { label: "Alternate Mobile", value: selected.altPhone || "—" },
              ].filter(f => f.value).map((f, i) => (
                <div key={i}>
                  <div className="form-label">{f.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: palette.navy }}>{f.value}</div>
                </div>
              ))}
              {selected.guardianName && (
                <div>
                  <div className="form-label">Guardian</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: palette.navy }}>{selected.guardianName} ({selected.guardianRelation || "Guardian"})</div>
                </div>
              )}
            </div>

            {MARKS[selected.id] && (
              <>
                <div style={{ fontWeight: 800, fontSize: 14, color: palette.navy, marginBottom: 12 }}>📊 Academic Performance</div>
                {Object.entries(MARKS[selected.id]).map(([subj, score]) => (
                  <div className="perf-subject" key={subj}>
                    <div className="perf-subj-header">
                      <span className="perf-subj-name">{subj}</span>
                      <span className="perf-score" style={{ color: scoreColor(score) }}>{score}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${score}%`, background: scoreColor(score) }} />
                    </div>
                  </div>
                ))}

                <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                  <div style={{ flex: 1, background: "#E8F5E9", borderRadius: 12, padding: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#388E3C", marginBottom: 8 }}>⭐ STRENGTHS</div>
                    {strengths(MARKS[selected.id]).map(s => <div key={s} style={{ fontSize: 12, fontWeight: 700, color: "#2E7D32" }}>✓ {s}</div>)}
                  </div>
                  <div style={{ flex: 1, background: "#FFF8E1", borderRadius: 12, padding: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#F57F17", marginBottom: 8 }}>📈 IMPROVE</div>
                    {improvements(MARKS[selected.id]).length > 0
                      ? improvements(MARKS[selected.id]).map(s => <div key={s} style={{ fontSize: 12, fontWeight: 700, color: "#E65100" }}>→ {s}</div>)
                      : <div style={{ fontSize: 12, color: palette.muted }}>All good! 🎉</div>}
                  </div>
                </div>

                <div style={{ marginTop: 14, padding: "10px 14px", background: palette.offwhite, borderRadius: 10, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: palette.muted }}>Overall Average</span>
                  <span style={{ fontSize: 16, fontWeight: 900, color: scoreColor(avg(MARKS[selected.id])) }}>{avg(MARKS[selected.id])}% — {grade(avg(MARKS[selected.id])).label}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAdd && canEdit && (
        <div className="modal-overlay" onClick={() => { setShowAdd(false); setNewStudent(EMPTY_STUDENT); }}>
          <div className="modal" style={{ maxWidth: 640, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Add New Student ✨</div>
              <button className="close-btn" onClick={() => { setShowAdd(false); setNewStudent(EMPTY_STUDENT); }}>✕</button>
            </div>

            {/* Photo Upload */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{
                  width: 100, height: 100, borderRadius: "50%", border: `3px dashed ${palette.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                  overflow: "hidden", background: palette.offwhite, margin: "0 auto 8px",
                  position: "relative"
                }} onClick={() => document.getElementById("student-photo-input").click()}>
                  {newStudent.photoPreview
                    ? <img src={newStudent.photoPreview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <div style={{ fontSize: 32, color: palette.muted }}>📷</div>
                  }
                </div>
                <input id="student-photo-input" type="file" accept="image/*" style={{ display: "none" }}
                  onChange={e => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = ev => updateNewStudent("photoPreview", ev.target.result);
                      reader.readAsDataURL(file);
                      updateNewStudent("photo", file.name);
                    }
                  }} />
                <div style={{ fontSize: 12, color: palette.muted }}>Click to upload photo</div>
              </div>
            </div>

            {/* Basic Info */}
            <div style={{ fontSize: 12, fontWeight: 800, color: palette.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Student Information</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="input" placeholder="Student's full name" value={newStudent.name} onChange={e => updateNewStudent("name", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Date of Birth *</label>
                <input className="input" type="date" value={newStudent.dob} onChange={e => updateNewStudent("dob", e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Class *</label>
                <select className="select" style={{ width: "100%" }} value={newStudent.class} onChange={e => updateNewStudent("class", e.target.value)}>
                  {CLASSES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Admission Date *</label>
                <input className="input" type="date" value={newStudent.admissionDate} onChange={e => updateNewStudent("admissionDate", e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Roll Number (auto-generated)</label>
                <input className="input" value={newStudent.rollNo} readOnly
                  style={{ background: "#f0f4ff", color: palette.navy, fontWeight: 700, cursor: "not-allowed" }}
                  placeholder="Select class & admission date" />
              </div>
            </div>

            {/* Parents Info */}
            <div style={{ fontSize: 12, fontWeight: 800, color: palette.muted, textTransform: "uppercase", letterSpacing: 1, margin: "16px 0 8px" }}>Parent / Guardian Information</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Father's Name</label>
                <input className="input" placeholder="Father's full name" value={newStudent.fatherName} onChange={e => updateNewStudent("fatherName", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Mother's Name</label>
                <input className="input" placeholder="Mother's full name" value={newStudent.motherName} onChange={e => updateNewStudent("motherName", e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Primary Mobile *</label>
                <input className="input" type="tel" placeholder="10-digit mobile number" maxLength={10} value={newStudent.phone} onChange={e => updateNewStudent("phone", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Alternate Mobile</label>
                <input className="input" type="tel" placeholder="Optional alternate number" maxLength={10} value={newStudent.altPhone} onChange={e => updateNewStudent("altPhone", e.target.value)} />
              </div>
            </div>
            <div style={{ padding: "10px 14px", background: "#f7f9fc", borderRadius: 8, border: `1px solid ${palette.border}`, marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: palette.muted, marginBottom: 8 }}>Guardian (if different from parents)</div>
              <div className="form-row" style={{ marginBottom: 0 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <input className="input" placeholder="Guardian's name" value={newStudent.guardianName} onChange={e => updateNewStudent("guardianName", e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <input className="input" placeholder="Relation (e.g. Uncle, Grandparent)" value={newStudent.guardianRelation} onChange={e => updateNewStudent("guardianRelation", e.target.value)} />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <button className="btn btn-ghost" onClick={() => { setShowAdd(false); setNewStudent(EMPTY_STUDENT); }}>Cancel</button>
              <button className="btn btn-primary" onClick={() => {
                if (!newStudent.name || !newStudent.dob || !newStudent.admissionDate || !newStudent.phone) {
                  alert("Please fill all required fields (Name, DOB, Admission Date, Phone)");
                  return;
                }
                const saved = addStudent(newStudent);
                setShowAdd(false);
                setNewStudent(EMPTY_STUDENT);
                alert(`✅ Student "${saved.name}" registered!\nRoll No: ${saved.rollNo}`);
              }}>Register Student</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- FEES ----
function FeesPage({ role }) {
  const { students: STUDENTS, feeConfig, studentOverrides, setFeeConfig, setStudentOverrides, recordPayment } = useAppData();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showRecord, setShowRecord] = useState(false);
  const [recordMonth, setRecordMonth] = useState(null);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const canManage = role === "admin" || role === "principal";
  const currentStudent = selectedStudent ? STUDENTS.find(s => s.id === selectedStudent.id) || STUDENTS[0] : STUDENTS[0];

  // Aggregates
  const totalExpected = STUDENTS.reduce((sum, s) => sum + s.enrolledMonths.length * MONTHLY_FEE, 0);
  const totalCollected = STUDENTS.reduce((sum, s) =>
    sum + Object.values(s.payments).filter(p => p.status === "paid").reduce((a, p) => a + p.amount, 0), 0);
  const totalOverdue = STUDENTS.filter(s => studentFeeStatus(s) === "overdue").length;
  const totalPending = STUDENTS.filter(s => studentFeeStatus(s) === "pending").length;

  // Per-student summary
  function studentSummary(s) {
    const active = Object.entries(s.payments).filter(([, p]) => p.status !== "covered");
    const paid   = active.filter(([, p]) => p.status === "paid").reduce((a, [, p]) => a + p.amount, 0);
    const due    = active.filter(([, p]) => p.status !== "paid").reduce((a, [, p]) => a + p.amount, 0);
    return { paid, due };
  }

  // Term-wise collection summary
  const termSummary = TERMS.map(term => {
    let collected = 0, pending = 0;
    STUDENTS.forEach(s => {
      term.months.forEach(mo => {
        const key = Object.keys(s.payments).find(k => k.startsWith(mo.slice(0,3)));
        // simplified: just scan enrolledMonths per term
      });
      s.enrolledMonths.forEach(mk => {
        const mo = ALL_MONTHS.find(m => m.key === mk);
        if (mo && mo.term === term.id) {
          const p = s.payments[mk];
          if (p && p.status === "paid") collected += p.amount;
          else if (p && (p.status === "pending" || p.status === "overdue")) pending += p.amount;
        }
      });
    });
    return { ...term, collected, pending };
  });

  return (
    <div className="page">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="page-title">Fee Management 💰</div>
          <div className="page-sub">Academic Year: June 2024 – March 2025 · Flexible enrollment & payment modes</div>
        </div>
        {canManage && (
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-ghost" onClick={() => setShowEnrollModal(true)}>⚙️ Enrollment Config</button>
            <button className="btn btn-primary">+ Record Payment</button>
          </div>
        )}
      </div>

      {/* KPI STRIP */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        {[
          { icon: "💵", value: `₹${totalCollected.toLocaleString()}`, label: "Total Collected",   color: palette.green },
          { icon: "📋", value: `₹${(totalExpected - totalCollected).toLocaleString()}`, label: "Balance Due", color: palette.coral },
          { icon: "⚠️", value: totalOverdue,  label: "Overdue Students", color: palette.red },
          { icon: "⏳", value: totalPending,  label: "Pending Students", color: palette.sun },
        ].map((s, i) => (
          <div className="stat-card" key={i} style={{ borderTop: `4px solid ${s.color}` }}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value" style={{ fontSize: 22 }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div className="tabs">
        {["overview","term-view","student-detail"].map(t => (
          <button key={t} className={`tab ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)}>
            {t === "overview" ? "📊 Overview" : t === "term-view" ? "📅 Term View" : "👤 Student Detail"}
          </button>
        ))}
      </div>

      {/* ── TAB: OVERVIEW ── */}
      {activeTab === "overview" && (
        <div>
          {/* Enrollment type legend */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            {Object.entries(ENROLLMENT_LABELS).map(([k, v]) => (
              <span key={k} className="chip" style={{ background: v.bg, color: v.color, padding: "5px 14px" }}>
                {v.label}: {STUDENTS.filter(s => s.enrollmentType === k).length} students
              </span>
            ))}
            <span style={{ marginLeft: "auto", fontSize: 12, color: palette.muted, alignSelf: "center" }}>
              Payment modes — {Object.entries(PAYMENT_MODE_LABELS).map(([k, v]) => `${v.icon} ${v.label}: ${STUDENTS.filter(s => s.paymentMode === k).length}`).join(" · ")}
            </span>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">All Students — Fee Status</div></div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Class</th>
                    <th>Enrollment</th>
                    <th>Payment Mode</th>
                    <th>Paid</th>
                    <th>Balance</th>
                    <th>Status</th>
                    {canManage && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {STUDENTS.map(s => {
                    const fs = studentFeeStatus(s);
                    const { paid, due } = studentSummary(s);
                    const el = ENROLLMENT_LABELS[s.enrollmentType];
                    const pm = PAYMENT_MODE_LABELS[s.paymentMode];
                    return (
                      <tr key={s.id} onClick={() => { setSelectedStudent(s); setActiveTab("student-detail"); }} style={{ cursor: "pointer" }}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 20 }}>{s.photo}</span>
                            <div>
                              <div style={{ fontWeight: 800 }}>{s.name}</div>
                              <div style={{ fontSize: 11, color: palette.muted }}>{s.rollNo}</div>
                            </div>
                          </div>
                        </td>
                        <td><span className="class-pill" style={{ background: classColors[s.class].bg, color: classColors[s.class].accent }}>{s.class}</span></td>
                        <td><span className="chip" style={{ background: el.bg, color: el.color, fontSize: 11 }}>{el.label}</span></td>
                        <td><span style={{ fontSize: 12, fontWeight: 700 }}>{pm.icon} {pm.label}</span></td>
                        <td><span style={{ fontWeight: 800, color: palette.green }}>₹{paid.toLocaleString()}</span></td>
                        <td><span style={{ fontWeight: 800, color: due > 0 ? palette.coral : palette.muted }}>₹{due.toLocaleString()}</span></td>
                        <td><span className={`fee-badge fee-${fs}`}>{fs === "paid" ? "✓ " : fs === "overdue" ? "⚠ " : "○ "}{fs}</span></td>
                        {canManage && (
                          <td>
                            <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); setSelectedStudent(s); setShowRecord(true); }}>
                              + Record
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: TERM VIEW ── */}
      {activeTab === "term-view" && (
        <div>
          <div className="grid-2" style={{ marginBottom: 20 }}>
            {termSummary.map((term, i) => {
              const colors = [palette.coral, palette.sky, palette.lavender, palette.green];
              const total = term.collected + term.pending;
              const pct = total > 0 ? Math.round((term.collected / total) * 100) : 0;
              return (
                <div className="card" key={term.id}>
                  <div className="card-header">
                    <div>
                      <div className="card-title" style={{ color: colors[i] }}>{term.label} — {term.dates}</div>
                      <div style={{ fontSize: 11, color: palette.muted, marginTop: 2 }}>{term.months.join(", ")}</div>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: colors[i] }}>{pct}%</div>
                  </div>
                  <div className="card-body">
                    <div className="progress-bar" style={{ height: 10, marginBottom: 14 }}>
                      <div className="progress-fill" style={{ width: `${pct}%`, background: colors[i] }} />
                    </div>
                    <div style={{ display: "flex", gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 11, color: palette.muted, fontWeight: 700 }}>COLLECTED</div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: palette.green }}>₹{term.collected.toLocaleString()}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: palette.muted, fontWeight: 700 }}>PENDING</div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: palette.coral }}>₹{term.pending.toLocaleString()}</div>
                      </div>
                    </div>
                    {/* Per-student term breakdown */}
                    <div style={{ marginTop: 14 }}>
                      {STUDENTS.map(s => {
                        const termMonths = s.enrolledMonths.filter(mk => {
                          const mo = ALL_MONTHS.find(m => m.key === mk);
                          return mo && mo.term === term.id;
                        });
                        if (termMonths.length === 0) return null;
                        const termPaid = termMonths.every(mk => {
                          const p = s.payments[mk];
                          return p && (p.status === "paid" || p.status === "covered");
                        });
                        const termOverdue = termMonths.some(mk => s.payments[mk]?.status === "overdue");
                        return (
                          <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${palette.border}` }}>
                            <span style={{ fontSize: 12, fontWeight: 700 }}>{s.photo} {s.name}</span>
                            <span className={`fee-badge fee-${termOverdue ? "overdue" : termPaid ? "paid" : "pending"}`} style={{ fontSize: 11 }}>
                              {termOverdue ? "⚠ overdue" : termPaid ? "✓ paid" : "○ pending"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB: STUDENT DETAIL ── */}
      {activeTab === "student-detail" && (
        <div className="grid-2">
          {/* Left: student picker */}
          <div className="card">
            <div className="card-header"><div className="card-title">Select Student</div></div>
            <div style={{ padding: "8px 0" }}>
              {STUDENTS.map(s => {
                const fs = studentFeeStatus(s);
                const active = s.id === selectedStudent?.id;
                return (
                  <div key={s.id} onClick={() => setSelectedStudent(s)}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", cursor: "pointer",
                      background: active ? palette.offwhite : "white", borderLeft: `3px solid ${active ? palette.sky : "transparent"}` }}>
                    <span style={{ fontSize: 24 }}>{s.photo}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 13 }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: palette.muted }}>{s.class} · {ENROLLMENT_LABELS[s.enrollmentType].label} · {PAYMENT_MODE_LABELS[s.paymentMode].icon} {PAYMENT_MODE_LABELS[s.paymentMode].label}</div>
                    </div>
                    <span className={`fee-badge fee-${fs}`} style={{ fontSize: 11 }}>{fs}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: payment schedule */}
          {selectedStudent && (
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">{currentStudent.photo} {currentStudent.name}</div>
                  <div style={{ fontSize: 11, color: palette.muted, marginTop: 2 }}>
                    {ENROLLMENT_LABELS[currentStudent.enrollmentType].label} ·
                    {PAYMENT_MODE_LABELS[currentStudent.paymentMode].icon} {PAYMENT_MODE_LABELS[currentStudent.paymentMode].label} ·
                    {currentStudent.enrolledMonths.length} months enrolled
                  </div>
                </div>
                {canManage && <button className="btn btn-primary btn-sm" onClick={() => setShowRecord(true)}>+ Record</button>}
              </div>
              <div className="card-body">
                {/* Summary bar */}
                {(() => {
                  const { paid, due } = studentSummary(currentStudent);
                  const total = paid + due;
                  const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
                  return (
                    <div style={{ marginBottom: 18, padding: 14, background: palette.offwhite, borderRadius: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <div><div style={{ fontSize: 11, color: palette.muted, fontWeight: 700 }}>PAID</div><div style={{ fontSize: 18, fontWeight: 900, color: palette.green }}>₹{paid.toLocaleString()}</div></div>
                        <div><div style={{ fontSize: 11, color: palette.muted, fontWeight: 700 }}>BALANCE</div><div style={{ fontSize: 18, fontWeight: 900, color: due > 0 ? palette.coral : palette.muted }}>₹{due.toLocaleString()}</div></div>
                        <div><div style={{ fontSize: 11, color: palette.muted, fontWeight: 700 }}>TOTAL</div><div style={{ fontSize: 18, fontWeight: 900, color: palette.navy }}>₹{total.toLocaleString()}</div></div>
                      </div>
                      <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%`, background: palette.green }} /></div>
                      <div style={{ fontSize: 11, color: palette.muted, marginTop: 4, textAlign: "right" }}>{pct}% paid</div>
                    </div>
                  );
                })()}

                {/* Month-wise schedule grouped by term */}
                {TERMS.map(term => {
                  const termMonths = currentStudent.enrolledMonths
                    .map(mk => ({ key: mk, mo: ALL_MONTHS.find(m => m.key === mk) }))
                    .filter(({ mo }) => mo && mo.term === term.id);
                  if (termMonths.length === 0) return null;
                  return (
                    <div key={term.id} style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: palette.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
                        {term.label} — {term.dates}
                      </div>
                      {termMonths.map(({ key, mo }) => {
                        const p = currentStudent.payments[key];
                        if (!p) return null;
                        if (p.status === "covered") {
                          return (
                            <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 8, background: "#F1F8E9", marginBottom: 4 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: palette.muted }}>{mo.label}</span>
                              <span style={{ fontSize: 11, color: "#558B2F", fontWeight: 700 }}>✓ Covered by installment</span>
                            </div>
                          );
                        }
                        const statusBg = { paid: "#E8F5E9", pending: "#FFF8E1", overdue: "#FFEBEE" };
                        const statusColor = { paid: "#388E3C", pending: "#F57F17", overdue: "#C62828" };
                        return (
                          <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 8, background: statusBg[p.status] || palette.offwhite, marginBottom: 4 }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 800, color: palette.navy }}>{p.installmentLabel || mo.label}</div>
                              {p.date && <div style={{ fontSize: 11, color: palette.muted }}>Paid on {p.date} · {p.txnId}</div>}
                              {!p.date && p.status !== "paid" && <div style={{ fontSize: 11, color: palette.muted }}>Due</div>}
                            </div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              {p.amount > 0 && <span style={{ fontWeight: 900, fontSize: 14 }}>₹{p.amount.toLocaleString()}</span>}
                              <span className="fee-badge" style={{ background: statusBg[p.status], color: statusColor[p.status] }}>
                                {p.status === "paid" ? "✓ " : p.status === "overdue" ? "⚠ " : "○ "}{p.status}
                              </span>
                              {canManage && p.status !== "paid" && (
                                <button className="btn btn-success btn-sm" style={{ fontSize: 11 }} onClick={() => { setRecordMonth(key); setShowRecord(true); }}>Pay</button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {showRecord && canManage && (() => {
        const payStudent = currentStudent;
        const [payMonth, setPayMonth] = React.useState(recordMonth || "");
        const [payAmount, setPayAmount] = React.useState("");
        const [payDate, setPayDate] = React.useState(new Date().toISOString().split("T")[0]);
        const [payMode, setPayMode] = React.useState("Cash");
        const [payTxn, setPayTxn] = React.useState("");
        const [payRemark, setPayRemark] = React.useState("");
        React.useEffect(() => {
          if (payMonth && payStudent?.payments?.[payMonth]) {
            setPayAmount(String(payStudent.payments[payMonth].amount || ""));
          }
        }, [payMonth]);
        return (
        <div className="modal-overlay" onClick={() => { setShowRecord(false); setRecordMonth(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 480 }}>
            <div className="modal-header">
              <div className="modal-title">Record Payment 💵</div>
              <button className="close-btn" onClick={() => { setShowRecord(false); setRecordMonth(null); }}>✕</button>
            </div>
            <div style={{ marginBottom: 16, padding: 14, background: palette.offwhite, borderRadius: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 800 }}>{payStudent?.photo} {payStudent?.name}</div>
              <div style={{ fontSize: 11, color: palette.muted, marginTop: 2 }}>{payStudent?.class} · {ENROLLMENT_LABELS[payStudent?.enrollmentType]?.label}</div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Payment For</label>
                <select className="select" style={{ width: "100%" }} value={payMonth} onChange={e => setPayMonth(e.target.value)}>
                  <option value="">Select month / installment</option>
                  {payStudent && Object.entries(payStudent.payments)
                    .filter(([, p]) => p.status !== "paid" && p.status !== "covered" && p.amount > 0)
                    .map(([k, p]) => {
                      const mo = ALL_MONTHS.find(m => m.key === k);
                      return <option key={k} value={k}>{p.installmentLabel || mo?.label} — ₹{p.amount.toLocaleString()}</option>;
                    })}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Amount (₹)</label>
                <input className="input" type="number" placeholder="Amount" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Payment Date</label>
                <input className="input" type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Payment Mode</label>
                <select className="select" style={{ width: "100%" }} value={payMode} onChange={e => setPayMode(e.target.value)}>
                  <option>Cash</option><option>UPI</option><option>Bank Transfer</option><option>Cheque</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Transaction / Receipt No.</label>
              <input className="input" placeholder="e.g. UPI ref or cheque no." value={payTxn} onChange={e => setPayTxn(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Remarks (optional)</label>
              <input className="input" placeholder="Any note" value={payRemark} onChange={e => setPayRemark(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => { setShowRecord(false); setRecordMonth(null); }}>Cancel</button>
              <button className="btn btn-success" onClick={() => {
                if (!payMonth) { alert("Please select a month/installment"); return; }
                if (!payAmount) { alert("Please enter amount"); return; }
                recordPayment(payStudent.id, payMonth, { amount: Number(payAmount), date: payDate, txnId: payTxn || `${payMode}-${Date.now()}`, mode: payMode, remarks: payRemark });
                alert(`✅ Payment of ₹${Number(payAmount).toLocaleString()} recorded for ${payStudent.name}`);
                setShowRecord(false); setRecordMonth(null);
              }}>✓ Confirm Payment</button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* ENROLLMENT CONFIG MODAL */}
      {showEnrollModal && canManage && (
        <div className="modal-overlay" onClick={() => setShowEnrollModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Enrollment & Fee Config ⚙️</div>
              <button className="close-btn" onClick={() => setShowEnrollModal(false)}>✕</button>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: palette.navy, marginBottom: 10 }}>Academic Year Structure</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {TERMS.map((term, i) => {
                  const colors = [palette.coral, palette.sky, palette.lavender, palette.green];
                  return (
                    <div key={term.id} style={{ padding: 14, borderRadius: 12, background: palette.offwhite, border: `2px solid ${colors[i]}22` }}>
                      <div style={{ fontWeight: 800, color: colors[i] }}>{term.label}</div>
                      <div style={{ fontSize: 12, color: palette.muted }}>{term.dates}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4 }}>₹{term.months.length * MONTHLY_FEE}/term</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="form-row" style={{ marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">Monthly Fee (₹)</label>
                <input className="input" defaultValue={2500} />
              </div>
              <div className="form-group">
                <label className="form-label">Registration Fee (₹)</label>
                <input className="input" defaultValue={1000} />
              </div>
            </div>
            <div style={{ padding: 14, borderRadius: 12, background: "#E8F5E9", marginBottom: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 12, color: "#388E3C", marginBottom: 6 }}>Payment Mode Options Available</div>
              {Object.entries(PAYMENT_MODE_LABELS).map(([k, v]) => (
                <div key={k} style={{ fontSize: 13, fontWeight: 600, color: palette.navy, marginBottom: 4 }}>
                  {v.icon} <strong>{v.label}</strong> — {k === "monthly" ? "Pay month by month" : k === "termly" ? "Pay once per term (3 months)" : "Pay full year upfront (discount applicable)"}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setShowEnrollModal(false)}>Close</button>
              <button className="btn btn-primary" onClick={() => { setFeeConfig({...feeConfig}); setShowEnrollModal(false); alert("✅ Fee configuration saved!"); }}>Save Config</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- SYLLABUS ----
function SyllabusPage({ role }) {
  const { syllabus: SYLLABUS, toggleSyllabusTopic } = useAppData();
  const [selectedClass, setSelectedClass] = useState("UKG");
  const [selectedSubject, setSelectedSubject] = useState("English");

  const subjects = SUBJECTS[selectedClass] || [];
  const syllabusData = SYLLABUS[selectedClass]?.[selectedSubject] || [];
  const done = syllabusData.filter(t => t.done).length;
  const canEdit = role === "admin" || role === "principal" || role === "teacher";
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Syllabus Tracker 📚</div>
        <div className="page-sub">Monitor academic coverage across all classes</div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {CLASSES.map(cls => {
          const cc = classColors[cls];
          return (
            <button key={cls} className="btn" onClick={() => { setSelectedClass(cls); setSelectedSubject(SUBJECTS[cls][0]); }}
              style={{ background: selectedClass === cls ? cc.accent : cc.bg, color: selectedClass === cls ? "white" : cc.accent, border: "none" }}>
              {cls}
            </button>
          );
        })}
      </div>

      <div className="grid-2">
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <div className="card-title">Subjects — {selectedClass}</div>
            </div>
            <div className="card-body" style={{ padding: 12 }}>
              {subjects.map(subj => {
                const items = SYLLABUS[selectedClass]?.[subj] || [];
                const d = items.filter(i => i.done).length;
                const pct = items.length ? Math.round((d / items.length) * 100) : 0;
                const clr = pct >= 80 ? palette.green : pct >= 50 ? palette.sky : palette.coral;
                return (
                  <div key={subj} onClick={() => setSelectedSubject(subj)}
                    style={{ padding: "12px 14px", borderRadius: 10, cursor: "pointer", marginBottom: 4, background: selectedSubject === subj ? palette.offwhite : "transparent", border: `1px solid ${selectedSubject === subj ? palette.border : "transparent"}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: palette.navy }}>{subj}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: clr }}>{pct}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: clr }} />
                    </div>
                    {items.length === 0 && <div style={{ fontSize: 11, color: palette.muted, marginTop: 4 }}>No topics added</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div className="card-title">{selectedSubject} — Topics</div>
              {syllabusData.length > 0 && <div style={{ fontSize: 12, color: palette.muted, marginTop: 2 }}>{done}/{syllabusData.length} covered</div>}
            </div>
            {canEdit && <button className="btn btn-primary btn-sm">+ Add Topic</button>}
          </div>
          <div className="card-body">
            {syllabusData.length === 0 ? (
              <div style={{ textAlign: "center", color: palette.muted, padding: 40 }}>
                <div style={{ fontSize: 40 }}>📋</div>
                <div style={{ fontWeight: 700, marginTop: 8 }}>No topics added yet</div>
                {canEdit && <button className="btn btn-primary" style={{ marginTop: 12 }}>Add First Topic</button>}
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 16 }}>
                  <div className="progress-bar" style={{ height: 12 }}>
                    <div className="progress-fill" style={{ width: `${Math.round((done / syllabusData.length) * 100)}%`, background: palette.green }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: palette.muted, fontWeight: 700 }}>
                    <span>{done} topics covered</span>
                    <span>{syllabusData.length - done} remaining</span>
                  </div>
                </div>
                {syllabusData.map((t, i) => (
                  <div key={i} className="syllabus-item">
                    <div className={`check-circle ${t.done ? "check-done" : "check-todo"}`}>{t.done ? "✓" : "○"}</div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: t.done ? palette.navy : palette.muted, textDecoration: t.done ? "none" : "none" }}>{t.topic}</span>
                    {canEdit && !t.done && <button className="btn btn-success btn-sm" style={{ marginLeft: "auto" }} onClick={() => toggleSyllabusTopic(selectedClass, selectedSubject, i)}>Mark Done</button>}
                    {canEdit && t.done && <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto", fontSize: 10 }} onClick={() => toggleSyllabusTopic(selectedClass, selectedSubject, i)}>Undo</button>}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- EXAMS ----
function ExamsPage({ role }) {
  const { exams: EXAMS, addExam } = useAppData();
  const canEdit = role === "admin" || role === "principal";
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="page">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="page-title">Exam Schedule 📝</div>
          <div className="page-sub">Manage all examination schedules</div>
        </div>
        {canEdit && <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Schedule Exam</button>}
      </div>

      <div className="stats-grid">
        {[
          { icon: "✅", value: EXAMS.filter(e => e.status === "completed").length, label: "Completed", color: palette.green },
          { icon: "⏰", value: EXAMS.filter(e => e.status === "upcoming").length, label: "Upcoming", color: palette.sky },
          { icon: "📅", value: "Apr 10", label: "Next Exam", color: palette.lavender },
          { icon: "🏫", value: "4", label: "Classes", color: palette.coral },
        ].map((s, i) => (
          <div className="stat-card" key={i} style={{ borderTop: `4px solid ${s.color}` }}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value" style={{ fontSize: 24 }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">All Examinations</div></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Exam Name</th>
                <th>Date</th>
                <th>Time</th>
                <th>Class</th>
                <th>Subject</th>
                <th>Status</th>
                {canEdit && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {EXAMS.map(e => (
                <tr key={e.id}>
                  <td><strong>{e.name}</strong></td>
                  <td>{e.date}</td>
                  <td>{e.time}</td>
                  <td><span className="chip" style={{ background: palette.offwhite }}>{e.class}</span></td>
                  <td>{e.subject}</td>
                  <td><span className={`badge badge-${e.status}`}>{e.status}</span></td>
                  {canEdit && (
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-ghost btn-sm">Edit</button>
                        <button className="btn btn-ghost btn-sm">Notify</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Schedule New Exam 📝</div>
              <button className="close-btn" onClick={() => setShowAdd(false)}>✕</button>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Exam Name</label>
                <input className="input" placeholder="e.g. Unit Test 3" />
              </div>
              <div className="form-group">
                <label className="form-label">Class</label>
                <select className="select" style={{ width: "100%" }}>
                  <option>All</option>
                  {CLASSES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date</label>
                <input className="input" type="date" />
              </div>
              <div className="form-group">
                <label className="form-label">Time</label>
                <input className="input" type="time" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Subjects</label>
              <input className="input" placeholder="e.g. All Subjects / English, Math" />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => {
                const form = document.getElementById("exam-form-modal");
                const inputs = form ? form.querySelectorAll("input,select") : [];
                const vals = {};
                inputs.forEach(el => { if (el.name) vals[el.name] = el.value; });
                addExam({ name: vals.name || "New Exam", class: vals.cls || "All", date: vals.date || "", time: vals.time || "9:00 AM", subject: vals.subject || "All Subjects", status: "upcoming" });
                setShowAdd(false);
                alert("✅ Exam scheduled and saved!");
              }}>Schedule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- MARKS & PERFORMANCE ----
function MarksPage({ role }) {
  const { students: STUDENTS, marks: MARKS, saveMarks } = useAppData();
  const [selectedClass, setSelectedClass] = useState("UKG");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedMarks, setEditedMarks] = useState({});
  const classStudents = STUDENTS.filter(s => s.class === selectedClass);
  const canEdit = role === "admin" || role === "principal" || role === "teacher";

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Marks & Performance 📊</div>
        <div className="page-sub">Detailed academic records and analysis</div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        {CLASSES.map(cls => {
          const cc = classColors[cls];
          return (
            <button key={cls} className="btn" onClick={() => { setSelectedClass(cls); setSelectedStudent(null); }}
              style={{ background: selectedClass === cls ? cc.accent : cc.bg, color: selectedClass === cls ? "white" : cc.accent, border: "none" }}>
              {cls}
            </button>
          );
        })}
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Students — {selectedClass}</div>
            {canEdit && <button className="btn btn-primary btn-sm">Enter Marks</button>}
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Average</th>
                  <th>Grade</th>
                </tr>
              </thead>
              <tbody>
                {classStudents.map(s => {
                  const marks = MARKS[s.id] || {};
                  const a = avg(marks);
                  const g = grade(a);
                  return (
                    <tr key={s.id} onClick={() => setSelectedStudent(s)} style={{ cursor: "pointer" }}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 20 }}>{s.photo}</span>
                          <span style={{ fontWeight: 700 }}>{s.name}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 80 }}>
                            <div className="progress-bar">
                              <div className="progress-fill" style={{ width: `${a}%`, background: scoreColor(a) }} />
                            </div>
                          </div>
                          <span style={{ fontWeight: 800, color: scoreColor(a) }}>{a}%</span>
                        </div>
                      </td>
                      <td><span style={{ fontWeight: 900, fontSize: 16, color: g.color }}>{g.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          {selectedStudent ? (
            <>
              <div className="card-header">
                <div className="card-title">{selectedStudent.name}'s Report</div>
                <div style={{ fontSize: 28 }}>{selectedStudent.photo}</div>
              </div>
              <div className="card-body">
                {Object.entries(MARKS[selectedStudent.id] || {}).map(([subj, score]) => (
                  <div className="perf-subject" key={subj}>
                    <div className="perf-subj-header">
                      <span className="perf-subj-name">{subj}</span>
                      <span className="perf-score" style={{ color: scoreColor(score) }}>{score}/100</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${score}%`, background: scoreColor(score) }} />
                    </div>
                  </div>
                ))}

                {MARKS[selectedStudent.id] && (
                  <>
                    <div style={{ marginTop: 20, padding: "12px 16px", background: palette.offwhite, borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 12, color: palette.muted, fontWeight: 700 }}>OVERALL AVERAGE</div>
                        <div style={{ fontSize: 26, fontWeight: 900, color: palette.navy }}>{avg(MARKS[selectedStudent.id])}%</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 12, color: palette.muted, fontWeight: 700 }}>GRADE</div>
                        <div style={{ fontSize: 32, fontWeight: 900, color: grade(avg(MARKS[selectedStudent.id])).color }}>{grade(avg(MARKS[selectedStudent.id])).label}</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                      <div style={{ flex: 1, background: "#E8F5E9", borderRadius: 10, padding: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: "#388E3C", marginBottom: 6 }}>⭐ TOP SUBJECTS</div>
                        {strengths(MARKS[selectedStudent.id]).map(s => <div key={s} style={{ fontSize: 12, fontWeight: 700, color: "#2E7D32", marginBottom: 2 }}>✓ {s}</div>)}
                      </div>
                      <div style={{ flex: 1, background: "#FFF8E1", borderRadius: 10, padding: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: "#F57F17", marginBottom: 6 }}>📈 NEEDS FOCUS</div>
                        {improvements(MARKS[selectedStudent.id]).length > 0
                          ? improvements(MARKS[selectedStudent.id]).map(s => <div key={s} style={{ fontSize: 12, fontWeight: 700, color: "#E65100", marginBottom: 2 }}>→ {s}</div>)
                          : <div style={{ fontSize: 12, color: palette.muted }}>Excellent! 🎉</div>}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="card-body" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, color: palette.muted }}>
              <div style={{ fontSize: 48 }}>👈</div>
              <div style={{ fontWeight: 700, marginTop: 12 }}>Select a student to view their report</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- ANALYTICS ----
function AnalyticsPage({ role }) {
  const { students: STUDENTS, marks: MARKS, feeConfig, studentOverrides } = useAppData();
  const classStats = CLASSES.map(cls => {
    const students = STUDENTS.filter(s => s.class === cls);
    const avgScore = students.length
      ? Math.round(students.reduce((sum, s) => sum + (MARKS[s.id] ? avg(MARKS[s.id]) : 0), 0) / students.length)
      : 0;
    return { cls, students: students.length, avgScore };
  });

  const maxScore = Math.max(...classStats.map(c => c.avgScore));
  const barColors = [palette.coral, palette.green, palette.sky, palette.lavender];

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Analytics & Insights 📈</div>
        <div className="page-sub">School-wide performance overview</div>
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-header"><div className="card-title">Average Score by Class</div></div>
          <div className="card-body">
            <div className="chart-bars">
              {classStats.map((cs, i) => (
                <div key={cs.cls} className="chart-bar-wrap">
                  <div style={{ fontSize: 12, fontWeight: 800, color: barColors[i], marginBottom: 4 }}>{cs.avgScore}%</div>
                  <div className="chart-bar" style={{ height: `${(cs.avgScore / maxScore) * 90}px`, background: barColors[i], opacity: 0.85, borderRadius: 6 }} />
                  <div className="chart-bar-label">{cs.cls}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {role !== "teacher" ? (
          <div className="card">
            <div className="card-header"><div className="card-title">Fee Collection Rate</div></div>
            <div className="card-body">
              {CLASSES.map((cls, i) => {
                const clsStudents = STUDENTS.filter(s => s.class === cls);
                const paid = clsStudents.filter(s => studentFeeStatus(s) === "paid").length;
                const pct = clsStudents.length ? Math.round((paid / clsStudents.length) * 100) : 0;
                return (
                  <div key={cls} style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{cls}</span>
                      <span style={{ fontWeight: 800, fontSize: 13, color: pct >= 80 ? palette.green : palette.coral }}>{pct}% ({paid}/{clsStudents.length})</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: barColors[i] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-header"><div className="card-title">Syllabus Coverage by Class</div></div>
            <div className="card-body">
              {CLASSES.map((cls, i) => {
                const pct = cls === "UKG" ? 60 : cls === "LKG" ? 45 : cls === "Nursery" ? 55 : 70;
                return (
                  <div key={cls} style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{cls}</span>
                      <span style={{ fontWeight: 800, fontSize: 13, color: pct >= 60 ? palette.green : palette.coral }}>{pct}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: barColors[i] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">Top Performers 🏆</div></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Rank</th><th>Student</th><th>Class</th><th>Average</th><th>Grade</th><th>Strengths</th></tr>
            </thead>
            <tbody>
              {STUDENTS
                .filter(s => MARKS[s.id])
                .map(s => ({ ...s, avgScore: avg(MARKS[s.id]) }))
                .sort((a, b) => b.avgScore - a.avgScore)
                .slice(0, 6)
                .map((s, idx) => {
                  const g = grade(s.avgScore);
                  const medals = ["🥇", "🥈", "🥉"];
                  return (
                    <tr key={s.id}>
                      <td><span style={{ fontSize: 20 }}>{medals[idx] || `#${idx + 1}`}</span></td>
                      <td><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 18 }}>{s.photo}</span><strong>{s.name}</strong></div></td>
                      <td><span className="class-pill" style={{ background: classColors[s.class].bg, color: classColors[s.class].accent }}>{s.class}</span></td>
                      <td><span style={{ fontWeight: 900, color: scoreColor(s.avgScore) }}>{s.avgScore}%</span></td>
                      <td><span style={{ fontWeight: 900, color: g.color, fontSize: 16 }}>{g.label}</span></td>
                      <td><span style={{ fontSize: 12, color: palette.muted }}>{strengths(MARKS[s.id]).join(", ")}</span></td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---- SETTINGS ----
// ---- ANNOUNCEMENTS PANEL ----
function AnnouncementsPanel({ announcements, addAnnouncement, deleteAnnouncement, role }) {
  const CATEGORIES = [
    { value: "event",   label: "Event",   icon: "🎉", color: palette.sky },
    { value: "meeting", label: "Meeting", icon: "🤝", color: palette.lavender },
    { value: "holiday", label: "Holiday", icon: "🏖️", color: palette.coral },
    { value: "notice",  label: "Notice",  icon: "📌", color: palette.sun },
  ];
  const EMPTY = { title: "", content: "", category: "event", date: new Date().toISOString().slice(0, 10) };
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [confirmDel, setConfirmDel] = useState(null);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  function handleSave() {
    if (!form.title.trim() || !form.content.trim()) { setErr("Title and content are required."); return; }
    addAnnouncement({ title: form.title.trim(), content: form.content.trim(), category: form.category, date: form.date });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
    setShowAdd(false); setForm(EMPTY); setErr("");
  }

  const catMeta = (cat) => CATEGORIES.find(c => c.value === cat) || CATEGORIES[0];

  return (
    <div>
      {saved && <div style={{ padding: "12px 16px", background: "#E8F5E9", borderRadius: 12, marginBottom: 16, fontWeight: 700, color: "#388E3C" }}>✅ Announcement posted!</div>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: palette.muted, fontWeight: 600 }}>{announcements.length} announcement{announcements.length !== 1 ? "s" : ""} total</div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setErr(""); setShowAdd(true); }}>+ New Announcement</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {announcements.length === 0 && (
          <div style={{ textAlign: "center", padding: 48, color: palette.muted, fontWeight: 700 }}>No announcements yet. Add one above.</div>
        )}
        {announcements.map(a => {
          const meta = catMeta(a.category);
          return (
            <div key={a.id} className="card" style={{ borderLeft: `5px solid ${meta.color}` }}>
              <div className="card-body" style={{ paddingTop: 16, paddingBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${meta.color}22`, color: meta.color }}>{meta.icon} {meta.label}</span>
                      <span style={{ fontSize: 12, color: palette.muted, fontWeight: 600 }}>{a.date}</span>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: palette.navy, marginBottom: 4 }}>{a.title}</div>
                    <div style={{ fontSize: 13, color: palette.muted, lineHeight: 1.5 }}>{a.content}</div>
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => setConfirmDel(a)}>🗑</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 520 }}>
            <div className="modal-header">
              <div className="modal-title">📢 New Announcement</div>
              <button className="close-btn" onClick={() => setShowAdd(false)}>✕</button>
            </div>
            {err && <div style={{ background: "#FFEBEE", color: "#C62828", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 700, marginBottom: 16 }}>⚠️ {err}</div>}
            <div className="form-group">
              <label className="form-label">Category</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {CATEGORIES.map(c => (
                  <button key={c.value} onClick={() => setForm(p => ({ ...p, category: c.value }))}
                    style={{ padding: "7px 14px", borderRadius: 20, border: `2px solid ${form.category === c.value ? c.color : palette.border}`,
                      background: form.category === c.value ? `${c.color}22` : "white", cursor: "pointer",
                      fontSize: 12, fontWeight: 700, color: form.category === c.value ? c.color : palette.muted, fontFamily: "'Nunito', sans-serif" }}>
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label className="form-label">Title *</label>
                <input className="input" placeholder="e.g. Annual Sports Day" value={form.title}
                  onChange={e => { setForm(p => ({ ...p, title: e.target.value })); setErr(""); }} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date</label>
                <input className="input" type="date" value={form.date}
                  onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Content *</label>
              <textarea className="input" rows={4} placeholder="Write announcement details here…" value={form.content}
                onChange={e => { setForm(p => ({ ...p, content: e.target.value })); setErr(""); }}
                style={{ resize: "vertical", lineHeight: 1.5 }} />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>Post Announcement</button>
            </div>
          </div>
        </div>
      )}

      {confirmDel && (
        <div className="modal-overlay" onClick={() => setConfirmDel(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 400, textAlign: "center" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🗑️</div>
            <div className="modal-title" style={{ marginBottom: 8 }}>Delete Announcement?</div>
            <div style={{ fontSize: 13, color: palette.muted, marginBottom: 24 }}>
              "<strong>{confirmDel.title}</strong>" will be permanently removed.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button className="btn btn-ghost" onClick={() => setConfirmDel(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => { deleteAnnouncement(confirmDel.id); setConfirmDel(null); }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- EXAM SCHEDULE PANEL ----
function ExamSchedulePanel({ exams, addExam, deleteExam, role }) {
  const EMPTY = { name: "", class: "All", date: "", time: "09:00", subject: "All Subjects" };
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [confirmDel, setConfirmDel] = useState(null);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  function handleSave() {
    if (!form.name.trim()) { setErr("Exam name is required."); return; }
    if (!form.date) { setErr("Please select a date."); return; }
    addExam({ name: form.name.trim(), class: form.class, date: form.date, time: form.time || "9:00 AM", subject: form.subject || "All Subjects", status: "upcoming" });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
    setShowAdd(false); setForm(EMPTY); setErr("");
  }

  const upcoming = exams.filter(e => e.status === "upcoming");
  const completed = exams.filter(e => e.status === "completed");

  return (
    <div>
      {saved && <div style={{ padding: "12px 16px", background: "#E8F5E9", borderRadius: 12, marginBottom: 16, fontWeight: 700, color: "#388E3C" }}>✅ Exam scheduled!</div>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 16 }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>⏰ {upcoming.length} upcoming</span>
          <span style={{ fontWeight: 700, fontSize: 13, color: palette.muted }}>✅ {completed.length} completed</span>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setErr(""); setShowAdd(true); }}>+ Schedule Exam</button>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">All Examinations</div></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Exam Name</th><th>Date</th><th>Time</th><th>Class</th><th>Subject</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {exams.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: "center", color: palette.muted, padding: 32 }}>No exams scheduled yet.</td></tr>
              )}
              {exams.map(e => (
                <tr key={e.id}>
                  <td><strong>{e.name}</strong></td>
                  <td>{e.date}</td>
                  <td>{e.time}</td>
                  <td><span className="chip" style={{ background: palette.offwhite }}>{e.class}</span></td>
                  <td>{e.subject}</td>
                  <td><span className={`badge badge-${e.status}`}>{e.status}</span></td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => setConfirmDel(e)}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 500 }}>
            <div className="modal-header">
              <div className="modal-title">📝 Schedule New Exam</div>
              <button className="close-btn" onClick={() => setShowAdd(false)}>✕</button>
            </div>
            {err && <div style={{ background: "#FFEBEE", color: "#C62828", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 700, marginBottom: 16 }}>⚠️ {err}</div>}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Exam Name *</label>
                <input className="input" placeholder="e.g. Unit Test 3" value={form.name}
                  onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setErr(""); }} />
              </div>
              <div className="form-group">
                <label className="form-label">Class</label>
                <select className="select" style={{ width: "100%" }} value={form.class}
                  onChange={e => setForm(p => ({ ...p, class: e.target.value }))}>
                  <option value="All">All Classes</option>
                  {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="UKG,LKG">UKG + LKG</option>
                  <option value="Nursery,Playgroup">Nursery + Playgroup</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input className="input" type="date" value={form.date}
                  onChange={e => { setForm(p => ({ ...p, date: e.target.value })); setErr(""); }} />
              </div>
              <div className="form-group">
                <label className="form-label">Time</label>
                <input className="input" type="time" value={form.time}
                  onChange={e => setForm(p => ({ ...p, time: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Subject(s)</label>
              <input className="input" placeholder="e.g. All Subjects / English, Math" value={form.subject}
                onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>Schedule Exam</button>
            </div>
          </div>
        </div>
      )}

      {confirmDel && (
        <div className="modal-overlay" onClick={() => setConfirmDel(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 400, textAlign: "center" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🗑️</div>
            <div className="modal-title" style={{ marginBottom: 8 }}>Remove Exam?</div>
            <div style={{ fontSize: 13, color: palette.muted, marginBottom: 24 }}>
              "<strong>{confirmDel.name}</strong>" on {confirmDel.date} will be removed.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button className="btn btn-ghost" onClick={() => setConfirmDel(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => { deleteExam(confirmDel.id); setConfirmDel(null); }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- USER MANAGEMENT PANEL ----
function UserManagementPanel({ users, students, addUser, updateUser, deleteUser }) {
  const ROLE_META = {
    principal: { label: "Principal", icon: "👩‍💼", color: "#6A1B9A", bg: "#F3E5F5" },
    teacher:   { label: "Teacher",   icon: "👩‍🏫", color: "#1565C0", bg: "#E3F2FD" },
    parent:    { label: "Parent",    icon: "👨‍👩‍👧", color: "#2E7D32", bg: "#E8F5E9" },
  };
  const EMPTY_FORM = { name: "", email: "", role: "teacher", phone: "", assignedClass: "", linkedStudentId: "", password: "", confirmPassword: "" };
  const [filterRole, setFilterRole] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saved, setSaved] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [formError, setFormError] = useState("");

  const filtered = filterRole === "all" ? users : users.filter(u => u.role === filterRole);

  function openAdd() { setForm(EMPTY_FORM); setEditUser(null); setFormError(""); setShowAdd(true); }
  function openEdit(u) {
    setForm({ name: u.name, email: u.email, role: u.role, phone: u.phone || "", assignedClass: u.assignedClass || "", linkedStudentId: u.linkedStudentId || "", password: "", confirmPassword: "" });
    setEditUser(u); setFormError(""); setShowAdd(true);
  }
  function closeModal() { setShowAdd(false); setEditUser(null); setFormError(""); }

  function handleSave() {
    if (!form.name.trim() || !form.email.trim()) { setFormError("Name and email are required."); return; }
    if (!editUser && !form.password.trim()) { setFormError("Password is required when creating a new user."); return; }
    if (form.password && form.password !== form.confirmPassword) { setFormError("Passwords do not match."); return; }
    if (form.password && form.password.length < 6) { setFormError("Password must be at least 6 characters."); return; }
    // Check email uniqueness
    const duplicate = users.find(u => u.email.trim().toLowerCase() === form.email.trim().toLowerCase() && (!editUser || u.id !== editUser.id));
    if (duplicate) { setFormError("A user with this email already exists."); return; }

    const updates = { name: form.name, email: form.email, role: form.role, phone: form.phone, assignedClass: form.assignedClass, linkedStudentId: form.linkedStudentId };
    if (form.password) updates.passwordHash = simpleHash(form.password);

    if (editUser) {
      updateUser(editUser.id, updates);
    } else {
      addUser(updates);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    closeModal();
  }

  const counts = { principal: users.filter(u => u.role === "principal").length, teacher: users.filter(u => u.role === "teacher").length, parent: users.filter(u => u.role === "parent").length };

  return (
    <div>
      {saved && (
        <div style={{ padding: "12px 16px", background: "#E8F5E9", borderRadius: 12, marginBottom: 16, fontWeight: 700, color: "#388E3C" }}>
          ✅ User saved successfully!
        </div>
      )}

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        {Object.entries(ROLE_META).map(([roleKey, meta]) => (
          <div key={roleKey} style={{ background: meta.bg, border: `2px solid ${meta.color}22`, borderRadius: 16, padding: "18px 20px", cursor: "pointer" }}
            onClick={() => setFilterRole(filterRole === roleKey ? "all" : roleKey)}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>{meta.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: meta.color }}>{counts[roleKey]}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>{meta.label}s</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">All Users</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <select className="select" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
              <option value="all">All Roles</option>
              <option value="principal">Principal</option>
              <option value="teacher">Teacher</option>
              <option value="parent">Parent</option>
            </select>
            <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add User</button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Role</th><th>Email</th><th>Phone</th><th>Class / Student</th><th>Password</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: "center", color: palette.muted, padding: 32 }}>No users found</td></tr>
              )}
              {filtered.map(u => {
                const meta = ROLE_META[u.role] || {};
                const linkedStudent = u.linkedStudentId ? students.find(s => s.id === Number(u.linkedStudentId)) : null;
                const hasPassword = !!u.passwordHash;
                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                          {meta.icon}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 13, color: palette.navy }}>{u.name}</div>
                          <div style={{ fontSize: 11, color: palette.muted }}>ID #{u.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: meta.bg, color: meta.color }}>
                        {meta.icon} {meta.label}
                      </span>
                    </td>
                    <td style={{ fontSize: 12 }}>{u.email}</td>
                    <td style={{ fontSize: 12 }}>{u.phone || "—"}</td>
                    <td style={{ fontSize: 12 }}>
                      {u.role === "teacher" && u.assignedClass
                        ? <span className="class-pill" style={{ background: classColors[u.assignedClass]?.bg || "#eee", color: classColors[u.assignedClass]?.accent || "#333" }}>{u.assignedClass}</span>
                        : u.role === "parent" && linkedStudent
                        ? <span style={{ fontWeight: 700, color: palette.navy }}>{linkedStudent.name}</span>
                        : <span style={{ color: palette.muted }}>—</span>
                      }
                    </td>
                    <td>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: hasPassword ? "#E8F5E9" : "#FFF8E1", color: hasPassword ? "#388E3C" : "#E65100" }}>
                        {hasPassword ? "🔒 Set" : "⚠️ Not set"}
                      </span>
                    </td>
                    <td>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: u.active ? "#E8F5E9" : "#FFEBEE", color: u.active ? "#388E3C" : "#C62828" }}>
                        {u.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)}>Edit</button>
                        <button className="btn btn-ghost btn-sm" style={{ color: u.active ? "#C62828" : "#388E3C" }}
                          onClick={() => updateUser(u.id, { active: !u.active })}>
                          {u.active ? "Disable" : "Enable"}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(u)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 540 }}>
            <div className="modal-header">
              <div className="modal-title">{editUser ? `Edit — ${editUser.name}` : "Add New User"}</div>
              <button className="close-btn" onClick={closeModal}>✕</button>
            </div>

            {formError && (
              <div style={{ background: "#FFEBEE", color: "#C62828", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
                ⚠️ {formError}
              </div>
            )}

            {/* Role selector */}
            <div className="form-group">
              <label className="form-label">Role</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {Object.entries(ROLE_META).map(([roleKey, meta]) => (
                  <button key={roleKey} onClick={() => setForm(p => ({ ...p, role: roleKey }))}
                    style={{ padding: "12px 8px", borderRadius: 12, border: `2px solid ${form.role === roleKey ? meta.color : palette.border}`,
                      background: form.role === roleKey ? meta.bg : "white", cursor: "pointer", fontFamily: "'Nunito', sans-serif",
                      fontWeight: 700, fontSize: 13, color: form.role === roleKey ? meta.color : palette.muted, textAlign: "center" }}>
                    <div style={{ fontSize: 24, marginBottom: 4 }}>{meta.icon}</div>
                    {meta.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="input" placeholder="Enter full name" value={form.name}
                  onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setFormError(""); }} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input className="input" placeholder="10-digit mobile" value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input className="input" type="email" placeholder="user@example.com" value={form.email}
                onChange={e => { setForm(p => ({ ...p, email: e.target.value })); setFormError(""); }} />
            </div>

            {form.role === "teacher" && (
              <div className="form-group">
                <label className="form-label">Assigned Class</label>
                <select className="select" style={{ width: "100%" }} value={form.assignedClass}
                  onChange={e => setForm(p => ({ ...p, assignedClass: e.target.value }))}>
                  <option value="">— No Class Assigned —</option>
                  {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}

            {form.role === "parent" && (
              <div className="form-group">
                <label className="form-label">Linked Student</label>
                <select className="select" style={{ width: "100%" }} value={form.linkedStudentId}
                  onChange={e => setForm(p => ({ ...p, linkedStudentId: e.target.value }))}>
                  <option value="">— Select Child —</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.class} - {s.rollNo})</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ borderTop: `1px solid ${palette.border}`, paddingTop: 16, marginTop: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: palette.navy, marginBottom: 12 }}>
                🔒 {editUser ? "Change Password" : "Set Password *"}
                {editUser && <span style={{ fontSize: 11, fontWeight: 600, color: palette.muted, marginLeft: 8 }}>(leave blank to keep existing)</span>}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{editUser ? "New Password" : "Password *"}</label>
                  <div style={{ position: "relative" }}>
                    <input className="input" type={showPass ? "text" : "password"} placeholder="Min. 6 characters"
                      value={form.password} onChange={e => { setForm(p => ({ ...p, password: e.target.value })); setFormError(""); }}
                      style={{ paddingRight: 44 }} />
                    <button onClick={() => setShowPass(s => !s)}
                      style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: palette.muted }}>
                      {showPass ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <input className="input" type={showPass ? "text" : "password"} placeholder="Re-enter password"
                    value={form.confirmPassword} onChange={e => { setForm(p => ({ ...p, confirmPassword: e.target.value })); setFormError(""); }} />
                </div>
              </div>
              {form.password && form.confirmPassword && form.password !== form.confirmPassword && (
                <div style={{ fontSize: 12, color: "#C62828", fontWeight: 700, marginTop: -8, marginBottom: 8 }}>Passwords do not match</div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>
                {editUser ? "Save Changes" : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 420, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <div className="modal-title" style={{ marginBottom: 8 }}>Remove User?</div>
            <div style={{ fontSize: 13, color: palette.muted, marginBottom: 24 }}>
              Are you sure you want to remove <strong style={{ color: palette.navy }}>{confirmDelete.name}</strong>?
              This cannot be undone.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => { deleteUser(confirmDelete.id); setConfirmDelete(null); setSaved(true); setTimeout(() => setSaved(false), 2000); }}>
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsPage({ role }) {
  const { feeConfig, setFeeConfig, studentOverrides, setStudentOverrides, students: STUDENTS, resetAllData, users, addUser, updateUser, deleteUser, announcements: ANNOUNCEMENTS, addAnnouncement, deleteAnnouncement, exams: EXAMS, addExam, deleteExam } = useAppData();
  const [settingsTab, setSettingsTab] = useState("school");
  const canManageContent = role === "admin" || role === "principal" || role === "teacher";
  const [localCfg, setLocalCfg] = useState({ ...feeConfig });
  const [localClassFee, setLocalClassFee] = useState({ ...feeConfig.classMonthlyFee });
  const [overrideStudent, setOverrideStudent] = useState(null);
  const [localOverride, setLocalOverride] = useState({});
  const [saved, setSaved] = useState(false);
  const canEdit = role === "admin" || role === "principal";

  function saveConfig() {
    setFeeConfig({ ...localCfg, classMonthlyFee: { ...localClassFee } });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function openOverride(student) {
    const existing = studentOverrides[student.id] || {};
    setLocalOverride({
      monthlyFee: existing.monthlyFee ?? feeConfig.classMonthlyFee[student.class] ?? 2500,
      concessionPct: existing.concessionPct ?? 0,
      concessionReason: existing.concessionReason ?? "",
      lumpSumDiscountPct: existing.lumpSumDiscountPct ?? feeConfig.lumpSumDiscountPct,
      termDiscountPct: existing.termDiscountPct ?? feeConfig.termDiscountPct,
      feeNote: existing.feeNote ?? "",
    });
    setOverrideStudent(student);
  }

  function saveOverride() {
    const updated = { ...studentOverrides };
    const base = feeConfig.classMonthlyFee[overrideStudent.class];
    const isDefault =
      Number(localOverride.monthlyFee) === base &&
      Number(localOverride.concessionPct) === 0 &&
      Number(localOverride.lumpSumDiscountPct) === feeConfig.lumpSumDiscountPct &&
      Number(localOverride.termDiscountPct) === feeConfig.termDiscountPct &&
      !localOverride.concessionReason && !localOverride.feeNote;
    if (isDefault) {
      delete updated[overrideStudent.id];
    } else {
      updated[overrideStudent.id] = {
        monthlyFee: Number(localOverride.monthlyFee),
        concessionPct: Number(localOverride.concessionPct),
        concessionReason: localOverride.concessionReason,
        lumpSumDiscountPct: Number(localOverride.lumpSumDiscountPct),
        termDiscountPct: Number(localOverride.termDiscountPct),
        feeNote: localOverride.feeNote,
      };
    }
    setStudentOverrides(updated);
    setOverrideStudent(null);
  }

  function clearOverride(studentId) {
    const updated = { ...studentOverrides };
    delete updated[studentId];
    setStudentOverrides(updated);
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Settings ⚙️</div>
        <div className="page-sub">School profile, fee config, announcements, exam schedule and user management</div>
      </div>

      <div className="tabs" style={{ flexWrap: "wrap" }}>
        {[
          { id: "school", label: "🏫 School Profile" },
          { id: "fees", label: "💰 Fee Config" },
          { id: "overrides", label: "👤 Student Overrides" },
          ...(canManageContent ? [
            { id: "announcements", label: "📢 Announcements" },
            { id: "examschedule", label: "📝 Exam Schedule" },
          ] : []),
          ...(role === "admin" ? [{ id: "users", label: "👥 User Management" }] : []),
        ].map(t => (
          <button key={t.id} className={`tab ${settingsTab === t.id ? "active" : ""}`} onClick={() => setSettingsTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {settingsTab === "school" && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header"><div className="card-title">School Profile</div></div>
            <div className="card-body">
              {[
                { label: "School Name", value: "Aadyant Gurukulam" },
                { label: "Managed By", value: "Deshpande Education Foundation" },
                { label: "Address", value: "123 Main Street, Bengaluru" },
                { label: "Phone", value: "+91 80 1234 5678" },
                { label: "Email", value: "info@aadyantgurukulam.edu.in" },
                { label: "Principal", value: "Mrs. Sunita Rao" },
              ].map((f, i) => (
                <div className="form-group" key={i}>
                  <label className="form-label">{f.label}</label>
                  <input className="input" defaultValue={f.value} disabled={!canEdit} />
                </div>
              ))}
              {canEdit && <button className="btn btn-primary">Save Profile</button>}
            </div>
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">Classes</div></div>
            <div className="card-body">
              {CLASSES.map(cls => {
                const cc = classColors[cls];
                return (
                  <div key={cls} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${palette.border}` }}>
                    <span style={{ fontWeight: 800 }}>{cls}</span>
                    <span style={{ fontSize: 12, color: palette.muted }}>{STUDENTS.filter(s => s.class === cls).length} students</span>
                    <span style={{ fontWeight: 700, color: palette.green }}>Rs.{feeConfig.classMonthlyFee[cls].toLocaleString()}/mo</span>
                    <span className="class-pill" style={{ background: cc.bg, color: cc.accent }}>Active</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {settingsTab === "fees" && (
        <div>
          {saved && (
            <div style={{ padding: "12px 16px", background: "#E8F5E9", borderRadius: 12, marginBottom: 16, fontWeight: 700, color: "#388E3C" }}>
              Fee configuration saved successfully!
            </div>
          )}
          <div style={{ padding: "16px 20px", background: "linear-gradient(135deg, #1A2340, #2D4A8C)", borderRadius: 16, marginBottom: 20, color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Academic Year</div>
              <div style={{ fontSize: 22, fontWeight: 900, fontFamily: "Fredoka One, cursive" }}>{localCfg.yearLabel}</div>
            </div>
            <div style={{ fontSize: 32 }}>📅</div>
          </div>

          <div className="grid-2" style={{ marginBottom: 20 }}>
            <div className="card">
              <div className="card-header">
                <div className="card-title">Monthly Fee by Class</div>
                <div style={{ fontSize: 11, color: palette.muted }}>School-wide defaults</div>
              </div>
              <div className="card-body">
                <div style={{ fontSize: 12, color: "#E65100", marginBottom: 14, padding: "10px 12px", background: "#FFF8E1", borderRadius: 10, fontWeight: 600 }}>
                  These are school-wide defaults. Individual students can have different rates in the Student Overrides tab.
                </div>
                {CLASSES.map(cls => {
                  const cc = classColors[cls];
                  return (
                    <div key={cls} style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                        <span className="class-pill" style={{ background: cc.bg, color: cc.accent }}>{cls}</span>
                        <span style={{ fontSize: 11, color: palette.muted }}>{STUDENTS.filter(s => s.class === cls).length} students</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>Rs.</span>
                        <input className="input" type="number" value={localClassFee[cls]} disabled={!canEdit}
                          onChange={e => setLocalClassFee(p => ({ ...p, [cls]: Number(e.target.value) }))}
                          style={{ maxWidth: 120 }} />
                        <span style={{ fontSize: 12, color: palette.muted }}>per month → Rs.{(localClassFee[cls] * 10).toLocaleString()} full year</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-header"><div className="card-title">Payment Mode Discounts</div></div>
                <div className="card-body">
                  <div className="form-group">
                    <label className="form-label">Term Payment Discount (%)</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input className="input" type="number" min="0" max="20" value={localCfg.termDiscountPct}
                        disabled={!canEdit}
                        onChange={e => setLocalCfg(p => ({ ...p, termDiscountPct: Number(e.target.value) }))}
                        style={{ maxWidth: 80 }} />
                      <span style={{ fontSize: 12, color: palette.muted }}>% off when paying per term</span>
                    </div>
                    <div style={{ fontSize: 11, color: palette.muted, marginTop: 4 }}>
                      UKG Term 1 example: Rs.{Math.round(localClassFee.UKG * 3 * (1 - localCfg.termDiscountPct / 100)).toLocaleString()} instead of Rs.{(localClassFee.UKG * 3).toLocaleString()}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Lump-Sum Full Year Discount (%)</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input className="input" type="number" min="0" max="30" value={localCfg.lumpSumDiscountPct}
                        disabled={!canEdit}
                        onChange={e => setLocalCfg(p => ({ ...p, lumpSumDiscountPct: Number(e.target.value) }))}
                        style={{ maxWidth: 80 }} />
                      <span style={{ fontSize: 12, color: palette.muted }}>% off full year upfront</span>
                    </div>
                    <div style={{ fontSize: 11, color: palette.muted, marginTop: 4 }}>
                      UKG full year example: Rs.{Math.round(localClassFee.UKG * 10 * (1 - localCfg.lumpSumDiscountPct / 100)).toLocaleString()} instead of Rs.{(localClassFee.UKG * 10).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="card-header"><div className="card-title">Other Fees and Fines</div></div>
                <div className="card-body">
                  <div className="form-group">
                    <label className="form-label">Registration / Admission Fee (Rs.)</label>
                    <input className="input" type="number" value={localCfg.registrationFee} disabled={!canEdit}
                      onChange={e => setLocalCfg(p => ({ ...p, registrationFee: Number(e.target.value) }))}
                      style={{ maxWidth: 160 }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Late Fine Per Month (Rs.)</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <input className="input" type="number" value={localCfg.lateFinePerMonth} disabled={!canEdit}
                        onChange={e => setLocalCfg(p => ({ ...p, lateFinePerMonth: Number(e.target.value) }))}
                        style={{ maxWidth: 120 }} />
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                        <input type="checkbox" checked={localCfg.autoApplyLateFine} disabled={!canEdit}
                          onChange={e => setLocalCfg(p => ({ ...p, autoApplyLateFine: e.target.checked }))} />
                        Auto-apply
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header"><div className="card-title">Fee Summary Preview - All Classes and Modes</div></div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Class</th><th>Monthly</th><th>Term 1-3 (3mo)</th><th>Term 4 (1mo)</th><th>Full Year Lump Sum</th><th>Savings</th>
                  </tr>
                </thead>
                <tbody>
                  {CLASSES.map(cls => {
                    const monthly = localClassFee[cls];
                    const termAmt = Math.round(monthly * 3 * (1 - localCfg.termDiscountPct / 100));
                    const term4Amt = Math.round(monthly * (1 - localCfg.termDiscountPct / 100));
                    const lumpAmt = Math.round(monthly * 10 * (1 - localCfg.lumpSumDiscountPct / 100));
                    const saving = monthly * 10 - lumpAmt;
                    const cc = classColors[cls];
                    return (
                      <tr key={cls}>
                        <td><span className="class-pill" style={{ background: cc.bg, color: cc.accent }}>{cls}</span></td>
                        <td style={{ fontWeight: 800 }}>Rs.{monthly.toLocaleString()}</td>
                        <td>Rs.{termAmt.toLocaleString()} <span style={{ fontSize: 10, color: palette.muted }}>({localCfg.termDiscountPct}% off)</span></td>
                        <td>Rs.{term4Amt.toLocaleString()}</td>
                        <td style={{ fontWeight: 800, color: palette.green }}>Rs.{lumpAmt.toLocaleString()} <span style={{ fontSize: 10, color: palette.muted }}>({localCfg.lumpSumDiscountPct}% off)</span></td>
                        <td style={{ fontWeight: 700, color: palette.coral }}>Rs.{saving.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {canEdit && (
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn btn-primary" onClick={saveConfig}>Save Fee Configuration</button>
              <button className="btn btn-ghost" onClick={() => { setLocalCfg({ ...feeConfig }); setLocalClassFee({ ...feeConfig.classMonthlyFee }); }}>Reset</button>
            </div>
          )}
        </div>
      )}

      {settingsTab === "overrides" && (
        <div>
          <div style={{ padding: "12px 16px", background: "#E3F2FD", borderRadius: 12, marginBottom: 16, fontWeight: 600, fontSize: 13, color: "#1565C0" }}>
            Override the school-wide fee for individual students - useful for sibling discounts, special cases, or negotiated rates.
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">All Students - Fee Rates</div></div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Student</th><th>Class</th><th>School Default</th><th>Effective Rate</th><th>Concession</th><th>Status</th><th>Note</th>
                    {canEdit && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {STUDENTS.map(s => {
                    const defaultRate = feeConfig.classMonthlyFee[s.class];
                    const effectiveRate = effectiveMonthlyFee(s, feeConfig, studentOverrides);
                    const ov = studentOverrides[s.id];
                    const hasOverride = !!ov;
                    const conc = ov?.concessionPct ?? 0;
                    return (
                      <tr key={s.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 18 }}>{s.photo}</span>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: 13 }}>{s.name}</div>
                              <div style={{ fontSize: 11, color: palette.muted }}>{s.rollNo}</div>
                            </div>
                          </div>
                        </td>
                        <td><span className="class-pill" style={{ background: classColors[s.class].bg, color: classColors[s.class].accent }}>{s.class}</span></td>
                        <td style={{ color: palette.muted, fontWeight: 700 }}>Rs.{defaultRate.toLocaleString()}/mo</td>
                        <td>
                          <span style={{ fontWeight: 900, fontSize: 15, color: effectiveRate !== defaultRate ? palette.coral : palette.navy }}>
                            Rs.{effectiveRate.toLocaleString()}/mo
                          </span>
                        </td>
                        <td>
                          {conc > 0
                            ? <span className="chip" style={{ background: "#FFF8E1", color: "#E65100" }}>-{conc}%{ov.concessionReason ? " - " + ov.concessionReason : ""}</span>
                            : <span style={{ color: palette.muted, fontSize: 12 }}>-</span>}
                        </td>
                        <td>
                          {hasOverride
                            ? <span className="chip" style={{ background: "#E8F5E9", color: "#388E3C" }}>Custom</span>
                            : <span className="chip" style={{ background: palette.offwhite, color: palette.muted }}>Default</span>}
                        </td>
                        <td style={{ fontSize: 12, color: palette.muted, maxWidth: 160 }}>{ov?.feeNote || "-"}</td>
                        {canEdit && (
                          <td>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button className="btn btn-ghost btn-sm" onClick={() => openOverride(s)}>
                                {hasOverride ? "Edit" : "+ Set"}
                              </button>
                              {hasOverride && (
                                <button className="btn btn-danger btn-sm" onClick={() => clearOverride(s.id)}>X</button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {settingsTab === "announcements" && canManageContent && (
        <AnnouncementsPanel announcements={ANNOUNCEMENTS} addAnnouncement={addAnnouncement} deleteAnnouncement={deleteAnnouncement} role={role} />
      )}

      {settingsTab === "examschedule" && canManageContent && (
        <ExamSchedulePanel exams={EXAMS} addExam={addExam} deleteExam={deleteExam} role={role} />
      )}

      {settingsTab === "users" && role === "admin" && (
        <UserManagementPanel users={users} students={STUDENTS} addUser={addUser} updateUser={updateUser} deleteUser={deleteUser} />
      )}

      {overrideStudent && canEdit && (
        <div className="modal-overlay" onClick={() => setOverrideStudent(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 500 }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">{overrideStudent.photo} Fee Override - {overrideStudent.name}</div>
                <div style={{ fontSize: 12, color: palette.muted }}>{overrideStudent.class} - {overrideStudent.rollNo}</div>
              </div>
              <button className="close-btn" onClick={() => setOverrideStudent(null)}>X</button>
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1, padding: 12, background: palette.offwhite, borderRadius: 10, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: palette.muted, fontWeight: 700 }}>SCHOOL DEFAULT</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: palette.muted }}>Rs.{feeConfig.classMonthlyFee[overrideStudent.class].toLocaleString()}/mo</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", color: palette.muted, fontSize: 20 }}>to</div>
              <div style={{ flex: 1, padding: 12, background: "#E8F5E9", borderRadius: 10, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#388E3C", fontWeight: 700 }}>EFFECTIVE RATE</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#388E3C" }}>
                  Rs.{Math.round(Number(localOverride.monthlyFee) * (1 - Number(localOverride.concessionPct) / 100)).toLocaleString()}/mo
                </div>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Base Monthly Fee (Rs.)</label>
                <input className="input" type="number" value={localOverride.monthlyFee}
                  onChange={e => setLocalOverride(p => ({ ...p, monthlyFee: e.target.value }))} />
                <div style={{ fontSize: 11, color: palette.muted, marginTop: 4 }}>Class default: Rs.{feeConfig.classMonthlyFee[overrideStudent.class]}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Concession (%)</label>
                <input className="input" type="number" min="0" max="100" value={localOverride.concessionPct}
                  onChange={e => setLocalOverride(p => ({ ...p, concessionPct: e.target.value }))} />
                <div style={{ fontSize: 11, color: palette.muted, marginTop: 4 }}>Applied on base fee</div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Concession Reason</label>
              <input className="input" placeholder="e.g. Sibling concession, Staff child, Need-based" value={localOverride.concessionReason}
                onChange={e => setLocalOverride(p => ({ ...p, concessionReason: e.target.value }))} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Term Discount (%) override</label>
                <input className="input" type="number" min="0" max="30" value={localOverride.termDiscountPct}
                  onChange={e => setLocalOverride(p => ({ ...p, termDiscountPct: e.target.value }))} />
                <div style={{ fontSize: 11, color: palette.muted, marginTop: 4 }}>School default: {feeConfig.termDiscountPct}%</div>
              </div>
              <div className="form-group">
                <label className="form-label">Lump-Sum Discount (%) override</label>
                <input className="input" type="number" min="0" max="50" value={localOverride.lumpSumDiscountPct}
                  onChange={e => setLocalOverride(p => ({ ...p, lumpSumDiscountPct: e.target.value }))} />
                <div style={{ fontSize: 11, color: palette.muted, marginTop: 4 }}>School default: {feeConfig.lumpSumDiscountPct}%</div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Internal Note</label>
              <input className="input" placeholder="e.g. Approved by principal on 01-Jun-2024" value={localOverride.feeNote}
                onChange={e => setLocalOverride(p => ({ ...p, feeNote: e.target.value }))} />
            </div>
            <div style={{ padding: 14, background: palette.offwhite, borderRadius: 12, marginBottom: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 12, color: palette.navy, marginBottom: 8 }}>Fee Preview for {overrideStudent.name}</div>
              {[
                { label: "Monthly", value: Math.round(Number(localOverride.monthlyFee) * (1 - Number(localOverride.concessionPct) / 100)) },
                { label: "Per Term (3mo)", value: Math.round(Number(localOverride.monthlyFee) * (1 - Number(localOverride.concessionPct) / 100) * 3 * (1 - Number(localOverride.termDiscountPct) / 100)) },
                { label: "Full Year Lump Sum (10mo)", value: Math.round(Number(localOverride.monthlyFee) * (1 - Number(localOverride.concessionPct) / 100) * 10 * (1 - Number(localOverride.lumpSumDiscountPct) / 100)) },
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 }}>
                  <span style={{ color: palette.muted, fontWeight: 700 }}>{row.label}</span>
                  <span style={{ fontWeight: 900, color: palette.navy }}>Rs.{row.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setOverrideStudent(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveOverride}>Save Override</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ============================================================
// MAIN APP
// ============================================================
const NAV = {
  admin: [
    { id: "dashboard", icon: "🏠", label: "Dashboard" },
    { id: "students", icon: "👦", label: "Students" },
    { id: "fees", icon: "💰", label: "Fees" },
    { id: "syllabus", icon: "📚", label: "Syllabus" },
    { id: "exams", icon: "📝", label: "Exams" },
    { id: "marks", icon: "📊", label: "Marks" },
    { id: "analytics", icon: "📈", label: "Analytics" },
    { id: "settings", icon: "⚙️", label: "Settings" },
  ],
  principal: [
    { id: "dashboard", icon: "🏠", label: "Dashboard" },
    { id: "students", icon: "👦", label: "Students" },
    { id: "fees", icon: "💰", label: "Fees" },
    { id: "syllabus", icon: "📚", label: "Syllabus" },
    { id: "exams", icon: "📝", label: "Exams" },
    { id: "marks", icon: "📊", label: "Marks" },
    { id: "analytics", icon: "📈", label: "Analytics" },
    { id: "settings", icon: "⚙️", label: "Settings" },
  ],
  teacher: [
    { id: "dashboard", icon: "🏠", label: "Dashboard" },
    { id: "students", icon: "👦", label: "Students" },
    { id: "syllabus", icon: "📚", label: "Syllabus" },
    { id: "exams", icon: "📝", label: "Exams" },
    { id: "marks", icon: "📊", label: "Marks" },
  ],
  parent: [
    { id: "dashboard", icon: "🏠", label: "Dashboard" },
    { id: "students", icon: "👦", label: "My Child" },
    { id: "fees", icon: "💰", label: "Fees" },
    { id: "syllabus", icon: "📚", label: "Syllabus" },
    { id: "exams", icon: "📝", label: "Exams" },
    { id: "marks", icon: "📊", label: "Report Card" },
  ],
};

const PAGE_TITLES = {
  dashboard: "Dashboard",
  students: "Students",
  fees: "Fee Management",
  syllabus: "Syllabus",
  exams: "Examinations",
  marks: "Marks & Reports",
  analytics: "Analytics",
  settings: "Settings",
};

const roleAvatars = { admin: "👨‍💼", principal: "👩‍🏫", teacher: "👩‍🏫", parent: "👨‍👩‍👧" };
const roleNames = { admin: "Admin User", principal: "Mrs. Sunita Rao", teacher: "Ms. Priya Nair", parent: "Rajesh Sharma" };

export default function App() {
  return (
    <AppDataProvider>
      <AppInner />
    </AppDataProvider>
  );
}

function AppInner() {
  const { users } = useAppData();
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState("admin");
  const [currentUser, setCurrentUser] = useState(null);
  const [page, setPage] = useState("dashboard");

  const handleLogin = (r, userObj) => { setRole(r); setCurrentUser(userObj); setLoggedIn(true); setPage("dashboard"); };
  if (!loggedIn) return <LoginScreen onLogin={handleLogin} users={users} />;

  const navItems = NAV[role] || NAV.admin;
  const rc = roleColors[role];
  const displayName = currentUser?.name || roleNames[role];
  const displayAvatar = roleAvatars[role];

  return (
    <>
      <style>{CSS}</style>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-mark">🪔 Aadyant</div>
            <div className="logo-sub">Gurukulam</div>
          </div>
          <div className="role-badge" style={{ background: `${rc}22`, color: rc }}>
            <span>{roleAvatars[role]}</span>
            <span style={{ textTransform: "capitalize" }}>{role}</span>
          </div>
          <nav className="nav-section">
            <div className="nav-label">Navigation</div>
            {navItems.map(item => (
              <div key={item.id} className={`nav-item ${page === item.id ? "active" : ""}`} onClick={() => setPage(item.id)}>
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </nav>
          <div style={{ padding: "16px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <div onClick={() => setLoggedIn(false)} className="nav-item" style={{ borderRadius: 8, borderLeft: "none" }}>
              <span className="nav-icon">🚪</span>
              <span>Logout</span>
            </div>
            <div style={{ padding: "8px 20px 0", fontSize: 10, color: "rgba(255,255,255,0.25)", fontWeight: 700, letterSpacing: 1 }}>v0.9.0</div>
          </div>
        </aside>

        <main className="main-content">
          <div className="topbar">
            <div className="topbar-title">{PAGE_TITLES[page] || "Dashboard"}</div>
            <div className="topbar-right">
              <div className="notification-btn">🔔<div className="notif-dot" /></div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="topbar-avatar">{displayAvatar}</div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: palette.navy }}>{displayName}</div>
                  <div style={{ fontSize: 11, color: palette.muted, textTransform: "capitalize" }}>{role}</div>
                </div>
              </div>
            </div>
          </div>
          {page === "dashboard" && <Dashboard role={role} />}
          {page === "students" && <StudentsPage role={role} />}
          {page === "fees" && <FeesPage role={role} />}
          {page === "syllabus" && <SyllabusPage role={role} />}
          {page === "exams" && <ExamsPage role={role} />}
          {page === "marks" && <MarksPage role={role} />}
          {page === "analytics" && <AnalyticsPage role={role} />}
          {page === "settings" && <SettingsPage role={role} />}
        </main>
      </div>
    </>
  );
}
