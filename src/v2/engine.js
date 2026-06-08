// ClassCost v2 — pure engine: paisa-exact money, dates, due status, institute environments.
// No React, no side effects. Mirrors the locked prototype logic.

export const MN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export const MNS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const WD = ['S','M','T','W','T','F','S'];
export const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export const uid = (p = 'id') =>
  p + '_' + ((typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID().slice(0, 8)
    : (Date.now().toString(36) + Math.random().toString(36).slice(2, 7)));

let CUR = '৳';
export const setCurrency = (s) => { CUR = s || '৳'; };
export const fmt = (a) => CUR + Math.round(Number(a) || 0).toLocaleString('en-IN');

// Split a final amount into n installments that sum EXACTLY (integer paisa, remainder on last).
export function split(final, n) {
  const t = Math.round((Number(final) || 0) * 100);
  n = Math.max(1, n | 0);
  const b = Math.trunc(t / n), r = t - b * n, o = [];
  for (let i = 0; i < n - 1; i++) o.push(b / 100);
  o.push((b + r) / 100);
  return o;
}

export const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
export const parse = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
export const today = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
export const todayISO = () => iso(today());

// n dates on `day`-of-month, starting `fromOffset` months from this month.
export function monthlyDates(n, day, fromOffset = 0) {
  const base = today(); const o = [];
  let y = base.getFullYear(), m = base.getMonth() + fromOffset;
  for (let i = 0; i < n; i++) {
    const last = new Date(y, m + 1, 0).getDate();
    o.push(iso(new Date(y, m, Math.min(day, last))));
    m++;
  }
  return o;
}
export const inMonth = (d, ref = today()) => d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();

// Generate a routine's dues across the current month on the given weekdays.
export function genWeekdayDues(amount, weekdays) {
  const t = today(), y = t.getFullYear(), m = t.getMonth(), last = new Date(y, m + 1, 0).getDate(), out = [];
  for (let day = 1; day <= last; day++) {
    const d = new Date(y, m, day);
    if (weekdays.includes(d.getDay())) out.push({ amount, date: iso(d), confirmed: d <= t });
  }
  return out;
}

export const paidOf = (d) => (d.payments || []).reduce((s, p) => s + p, 0);
export const remOf = (d) => Math.max(0, (d.amount || 0) - paidOf(d));
export function statusOf(d) {
  const r = remOf(d);
  if (r <= 0) return 'paid';
  if (paidOf(d) > 0) return 'partial';
  const dd = parse(d.date);
  if (dd < today()) return 'overdue';
  return 'pending';
}

// Detect an institute's environment + seed which fee blocks it pre-loads.
const ENV_PRESETS = {
  university: ['Semester fee', 'Semester registration', 'Admission'],
  college:    ['Tuition', 'HSC registration', 'Board exam'],
  school:     ['Monthly tuition', 'SSC registration', 'Board exam'],
  coaching:   ['Course / batch fee'],
  generic:    ['Tuition'],
};
export function detectInstitute(name) {
  const n = String(name || '').toLowerCase();
  let r;
  if (n.includes('brac')) r = { type: 'University', semesters: 3, note: 'Tri-semester · registration once', env: 'university' };
  else if (n.includes('dhaka') || n.trim() === 'du') r = { type: 'University', semesters: 2, note: '2 semesters / year', env: 'university' };
  else if (n.includes('monipur')) r = { type: 'School', monthly: true, note: 'Monthly fee · registration yearly', env: 'school' };
  else if (n.includes('college')) r = { type: 'College', monthly: true, note: 'Monthly / term · HSC registration', env: 'college' };
  else if (n.includes('coaching') || n.includes('udvash')) r = { type: 'Coaching', note: 'Course / batch fee', env: 'coaching' };
  else r = { type: 'Institute', semesters: 2, note: 'Generic · edit anytime', env: 'generic' };
  r.presets = ENV_PRESETS[r.env] || ENV_PRESETS.generic;
  return r;
}
