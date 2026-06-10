// ClassCost v2 — data store. One mutable tree (spaces → blocks → dues → payments),
// persisted to localStorage. React reads via useV2(); actions mutate then commit().
import React, { createContext, useContext, useRef, useReducer, useEffect } from 'react';
import { uid, split, monthlyDates, genWeekdayDues, iso, parse, today, inMonth, remOf, detectInstitute, setCurrency, MNS } from './engine';
import { setAuthToken, getV2Data, saveV2Data } from '../api';

const KEY = 'cc_v2_data';
function load() { try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && Array.isArray(d.spaces)) return d; } catch { /* ignore */ } return { spaces: [] }; }
function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* ignore */ } }

// Cost tags: the chip a cost is filed under. 'Others' matches the DAILY tile key (not 'Other').
const OTHER_CAT = 'Others';
const TAG_ICONS = { Registration: '🧾', Admission: '🎓', Transport: '🚌', Hostel: '🏠', Books: '📚', Exam: '📝', Club: '🎟️', Food: '🍔' };
const iconForTag = (t) => TAG_ICONS[t] || '📦';

const Ctx = createContext(null);

export function V2Provider({ children }) {
  const ref = useRef(load());
  const [, bump] = useReducer((x) => x + 1, 0);
  const db = ref.current;
  const saveTimer = useRef(null);
  const pickUser = (u) => ({ name: u?.name || 'Student', email: u?.email || '', currency: u?.currency || '৳' });
  // Push the whole tree to the server (best-effort; silent when signed-out or offline).
  const pushToServer = async () => { if (!db.user?.id) return; try { await saveV2Data(db.user.id, { spaces: db.spaces, user: pickUser(db.user) }); } catch { /* offline — retried on next change */ } };
  const scheduleSync = () => { if (!db.user?.id) return; clearTimeout(saveTimer.current); saveTimer.current = setTimeout(pushToServer, 1200); };
  const commit = () => { save(db); bump(); scheduleSync(); };

  // Personal is auto-created (the always-on daily row needs a home from day one).
  useEffect(() => {
    if (!db.user) db.user = { name: 'Student', email: '', currency: '৳' };
    setCurrency(db.user.currency || '৳');
    if (!db.spaces.some((s) => s.type === 'personal')) {
      db.spaces.push({ id: uid('sp'), type: 'personal', name: 'Personal', icon: '👤', blocks: [] });
    }
    commit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hydrate from the server on load if already signed in.
  useEffect(() => { if (db.user?.id) pullFromServer(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // ---- selectors (pure reads over db) ----
  const spaceById = (i) => db.spaces.find((s) => s.id === i);
  const blockById = (i) => { for (const s of db.spaces) { const b = s.blocks.find((x) => x.id === i); if (b) return b; } return null; };
  const findDue = (i) => { for (const s of db.spaces) for (const b of s.blocks) { const d = b.dues.find((x) => x.id === i); if (d) return d; } return null; };
  const childrenOf = (sp) => db.spaces.filter((s) => s.parentId === sp.id);
  const topSpaces = () => db.spaces.filter((s) => !s.parentId);
  const personalSpace = () => db.spaces.find((s) => s.type === 'personal');

  const allDues = () => {
    const o = [];
    db.spaces.forEach((s) => s.blocks.forEach((b) => b.dues.forEach((d) => o.push({ ...d, parked: d.parked || b.parked, space: s, block: b }))));
    return o;
  };
  const spaceDues = (sp) => {
    let ds = sp.blocks.flatMap((b) => b.dues.map((d) => ({ ...d, parked: d.parked || b.parked })));
    childrenOf(sp).forEach((c) => { ds = ds.concat(c.blocks.flatMap((b) => b.dues.map((d) => ({ ...d, parked: d.parked || b.parked })))); });
    return ds;
  };
  const monthTotal = (ds) => ds.filter((d) => !d.parked && inMonth(parse(d.date))).reduce((a, d) => a + (d.amount || 0), 0);
  const sumWindow = (pred) => allDues().filter((d) => !d.parked && pred(parse(d.date))).reduce((s, d) => s + (d.amount || 0), 0);
  const summary = () => {
    const t = today(), y = t.getFullYear(), m = t.getMonth();
    return {
      month: sumWindow((d) => d.getFullYear() === y && d.getMonth() === m),
      year: sumWindow((d) => d.getFullYear() === y),
      last: sumWindow((d) => { const pm = m === 0 ? 11 : m - 1, py = m === 0 ? y - 1 : y; return d.getFullYear() === py && d.getMonth() === pm; }),
      life: sumWindow(() => true),
    };
  };
  const categoryTotals = () => {
    const map = {};
    db.spaces.forEach((s) => s.blocks.forEach((b) => {
      if (b.kind !== 'category' && b.kind !== 'cost') return;
      const cat = b.category || b.name;
      const e = map[cat] = map[cat] || { icon: b.icon, total: 0, bySector: {} };
      b.dues.forEach((d) => { if (!b.parked && !d.parked && inMonth(parse(d.date))) { e.total += (d.amount || 0); e.bySector[s.name] = (e.bySector[s.name] || 0) + (d.amount || 0); } });
    }));
    return map;
  };
  // ---- institute scoped views (read-only; linked spaces are a VIEW, counted once globally) ----
  const instituteScoped = (instituteId) => {
    const inst = spaceById(instituteId);
    if (!inst) return { instituteDues: [], linkedSpacesDues: [], combined: [] };
    const instituteDues = spaceDues(inst);
    const linkedSpacesDues = (inst.linkedSpaceIds || []).map(spaceById).filter(Boolean)
      .flatMap((sp) => spaceDues(sp).map((d) => ({ ...d, linkedSpace: sp })));
    return { instituteDues, linkedSpacesDues, combined: instituteDues.concat(linkedSpacesDues) };
  };
  const scopedSummary = (instituteId) => {
    const ds = instituteScoped(instituteId).combined.filter((d) => !d.parked);
    const t = today(), y = t.getFullYear(), m = t.getMonth();
    const sum = (pred) => ds.filter((d) => pred(parse(d.date))).reduce((a, d) => a + (d.amount || 0), 0);
    return {
      month: sum((d) => d.getFullYear() === y && d.getMonth() === m),
      year: sum((d) => d.getFullYear() === y),
      last: sum((d) => { const pm = m === 0 ? 11 : m - 1, py = m === 0 ? y - 1 : y; return d.getFullYear() === py && d.getMonth() === pm; }),
      life: sum(() => true),
    };
  };
  const scopedCategoryTotals = (instituteId) => {
    const inst = spaceById(instituteId);
    if (!inst) return {};
    const map = {};
    const eat = (sp) => sp.blocks.forEach((b) => {
      if (b.kind !== 'category' && b.kind !== 'cost') return;
      const cat = b.category || b.name;
      const e = map[cat] = map[cat] || { icon: b.icon, total: 0 };
      b.dues.forEach((d) => { if (!b.parked && !d.parked && inMonth(parse(d.date))) e.total += (d.amount || 0); });
    });
    eat(inst); childrenOf(inst).forEach(eat);
    (inst.linkedSpaceIds || []).map(spaceById).filter(Boolean).forEach(eat);
    return map;
  };

  // ---- actions (mutate db, then commit) ----
  const createInstitute = (name) => { const s = { id: uid('sp'), type: 'institute', name, icon: '🎓', system: detectInstitute(name), blocks: [] }; db.spaces.push(s); commit(); return s; };
  const createResidence = ({ name, rent, deposit, day }) => {
    const rd = monthlyDates(4, day, 0);
    const rentB = { id: uid('blk'), kind: 'recurring', name: 'Rent', icon: '🏠', amount: rent, dues: rd.map((dt) => ({ id: uid('due'), amount: rent, date: dt, label: 'Rent · ' + MNS[parse(dt).getMonth()], payments: [] })) };
    const depB = { id: uid('blk'), kind: 'onetime', name: 'Security Deposit', icon: '🔒', parked: true, amount: deposit, dues: [{ id: uid('due'), amount: deposit, date: iso(today()), label: 'Security deposit', payments: [], parked: true }] };
    const s = { id: uid('sp'), type: 'residence', name, icon: '🏠', system: { rent, deposit, day }, blocks: [rentB, depB] };
    db.spaces.push(s); commit(); return s;
  };
  const createSimple = (type, name) => { const s = { id: uid('sp'), type, name, icon: type === 'club' ? '🎭' : type === 'vehicle' ? '🛵' : '👤', blocks: [] }; db.spaces.push(s); commit(); return s; };
  const createAsset = (parentId, name, icon) => { const s = { id: uid('sp'), type: 'asset', parentId, name, icon, blocks: [] }; db.spaces.push(s); commit(); return s; };
  const addSemester = (spaceId, o) => {
    const sub = o.tuition + (o.labOn ? o.lab : 0) + o.fixed;
    const net = Math.max(0, sub - sub * o.waiver / 100);
    const parts = split(net, o.plan), dates = monthlyDates(o.plan, 1, 0);
    const dues = parts.map((a, i) => ({ id: uid('due'), amount: a, date: dates[i], label: o.name + ' · installment ' + (i + 1) + '/' + o.plan, payments: [] }));
    const blk = { id: uid('blk'), kind: 'semester', name: o.name, icon: '🎓', sub, net, waiver: o.waiver, plan: o.plan, items: { tuition: o.tuition, lab: o.labOn ? o.lab : 0, fixed: o.fixed }, dues };
    spaceById(spaceId).blocks.push(blk); commit(); return blk;
  };
  const addCategory = (spaceId, name, icon) => { const b = { id: uid('blk'), kind: 'category', name, icon, category: name, dues: [] }; spaceById(spaceId).blocks.push(b); commit(); return b; };
  const addRecurring = (spaceId, name, amount, day) => {
    const rd = monthlyDates(4, day, 0);
    const b = { id: uid('blk'), kind: 'recurring', name, icon: '🔁', amount, dues: rd.map((dt) => ({ id: uid('due'), amount, date: dt, label: name + ' · ' + MNS[parse(dt).getMonth()], payments: [] })) };
    spaceById(spaceId).blocks.push(b); commit(); return b;
  };
  const addOneTime = (spaceId, name, amount) => { const b = { id: uid('blk'), kind: 'onetime', name, icon: '📦', amount, dues: [{ id: uid('due'), amount, date: iso(today()), label: name, payments: [] }] }; spaceById(spaceId).blocks.push(b); commit(); return b; };
  const logExpense = (blockId, amount, sectorName) => { const b = blockById(blockId); if (b) { b.dues.push({ id: uid('due'), amount, date: iso(today()), label: b.name, sector: sectorName, payments: [amount] }); commit(); } };
  // Quick daily log: find-or-create the category block in the chosen sector, then append today's spend.
  const logDaily = (category, icon, sectorId, amount) => {
    const sp = spaceById(sectorId); if (!sp) return;
    let b = sp.blocks.find((x) => x.kind === 'category' && (x.category || x.name) === category);
    if (!b) { b = { id: uid('blk'), kind: 'category', name: category, icon, category, dues: [] }; sp.blocks.push(b); }
    b.dues.push({ id: uid('due'), amount, date: iso(today()), label: category, payments: [amount] });
    commit();
  };
  // Routine: a daily-spend category that auto-fills weekdays up to today (confirmed/paid).
  const addScheduledCategory = (spaceId, name, icon, amount, weekdays) => {
    const sp = spaceById(spaceId); if (!sp) return;
    const dues = genWeekdayDues(amount, weekdays).filter((x) => x.confirmed).map((x) => ({ id: uid('due'), amount: x.amount, date: x.date, label: name, payments: [x.amount] }));
    const b = { id: uid('blk'), kind: 'category', name, icon, category: name, schedule: { amount, weekdays }, dues };
    sp.blocks.push(b); commit(); return b;
  };
  const removeBlock = (blockId) => { for (const sp of db.spaces) { const i = sp.blocks.findIndex((b) => b.id === blockId); if (i >= 0) { sp.blocks.splice(i, 1); commit(); return; } } };
  const payDue = (dueId, amount) => { const d = findDue(dueId); if (d) { d.payments.push(amount == null ? remOf(d) : Math.min(amount, remOf(d))); commit(); } };
  const unpayDue = (dueId) => { const d = findDue(dueId); if (d) { d.payments = []; commit(); } };
  const addDue = (blockId, o) => { const b = blockById(blockId); if (!b) return null; const amt = +o.amount || 0; const d = { id: uid('due'), amount: amt, date: o.date || iso(today()), label: o.label || b.name, payments: o.paid ? [amt] : [] }; b.dues.push(d); commit(); return d; };
  const updateDue = (dueId, patch) => { const d = findDue(dueId); if (!d) return; if (patch.amount != null) d.amount = +patch.amount || 0; if (patch.date != null) d.date = patch.date; if (patch.label != null) d.label = patch.label; commit(); };
  const deleteDue = (dueId) => { for (const s of db.spaces) for (const b of s.blocks) { const i = b.dues.findIndex((x) => x.id === dueId); if (i >= 0) { b.dues.splice(i, 1); commit(); return; } } };
  // Simple semester: just a name + editable dated dues (no tuition/lab/waiver). Backward-compatible with legacy semester blocks.
  const addSimpleSemester = (spaceId, o) => {
    const plan = o.plan || (o.dues ? o.dues.length : 1);
    let dues;
    if (o.dues && o.dues.length) {
      dues = o.dues.map((d, i) => ({ id: uid('due'), amount: +d.amount || 0, date: d.date, label: o.name + ' · installment ' + (i + 1), payments: d.paid ? [+d.amount || 0] : (d.payments || []) }));
    } else {
      dues = monthlyDates(plan, 1, 0).map((dt, i) => ({ id: uid('due'), amount: 0, date: dt, label: o.name + ' · installment ' + (i + 1), payments: [] }));
    }
    const blk = { id: uid('blk'), kind: 'semester', name: o.name, icon: '🎓', plan, dues };
    spaceById(spaceId).blocks.push(blk); commit(); return blk;
  };
  // Generic tagged cost (registration, transport, hostel, …) — one-time or split into installments.
  const addCost = (spaceId, o) => {
    const cat = o.tag || OTHER_CAT, amt = +o.amount || 0, plan = o.plan && o.plan > 1 ? o.plan : 1;
    let dues;
    if (plan === 1) {
      dues = [{ id: uid('due'), amount: amt, date: o.date || iso(today()), label: o.name, payments: o.paid ? [amt] : [] }];
    } else {
      const parts = split(amt, plan), dates = monthlyDates(plan, parse(o.date || iso(today())).getDate(), 0);
      dues = parts.map((a, i) => ({ id: uid('due'), amount: a, date: dates[i], label: o.name + ' · ' + (i + 1) + '/' + plan, payments: o.paid ? [a] : [] }));
    }
    const blk = { id: uid('blk'), kind: 'cost', name: o.name, icon: iconForTag(o.tag), category: cat, dues };
    spaceById(spaceId).blocks.push(blk); commit(); return blk;
  };
  const linkSpaceToInstitute = (spaceId, instituteId) => {
    const sp = spaceById(spaceId), inst = spaceById(instituteId);
    if (!sp || !inst) return;
    sp.linkedInstituteId = instituteId;
    inst.linkedSpaceIds = [...new Set([...(inst.linkedSpaceIds || []), spaceId])];
    commit();
  };
  const unlinkSpaceFromInstitute = (spaceId) => {
    const sp = spaceById(spaceId); if (!sp) return;
    const old = sp.linkedInstituteId; delete sp.linkedInstituteId;
    if (old) { const inst = spaceById(old); if (inst) inst.linkedSpaceIds = (inst.linkedSpaceIds || []).filter((x) => x !== spaceId); }
    commit();
  };
  const deleteSpace = (id) => { db.spaces = db.spaces.filter((s) => s.id !== id && s.parentId !== id); ref.current = db; commit(); };
  // ---- auth + cloud sync ----
  const ensurePersonal = () => { if (!db.spaces.some((s) => s.type === 'personal')) db.spaces.push({ id: uid('sp'), type: 'personal', name: 'Personal', icon: '👤', blocks: [] }); };
  // Adopt server data if present, else seed the server with local data. Always keeps a Personal space.
  const pullFromServer = async () => {
    if (!db.user?.id) return;
    try {
      const res = await getV2Data(db.user.id);
      const remote = res && res.data && Array.isArray(res.data.spaces) ? res.data : null;
      if (remote && remote.spaces.length) {
        db.spaces = remote.spaces;
        if (remote.user) db.user = { ...db.user, ...remote.user, id: db.user.id };
        if (db.user.currency) setCurrency(db.user.currency);
        ensurePersonal();
        commit();
      } else {
        ensurePersonal();
        commit();
        await pushToServer(); // server empty → seed it
      }
    } catch { ensurePersonal(); commit(); /* offline — keep local */ }
  };
  const login = async (result) => {
    if (!result?.id) return;
    if (result.token) setAuthToken(result.token);
    db.user = { ...(db.user || {}), id: result.id, email: result.email || db.user?.email || '', name: result.name || db.user?.name || 'Student', currency: db.user?.currency || '৳' };
    db.spaces = []; // clean slate — the server is the source of truth for this account
    try { localStorage.removeItem('cc_v2_guest'); } catch { /* ignore */ }
    commit();
    await pullFromServer();
  };
  const logout = () => {
    setAuthToken(null);
    try { localStorage.removeItem('cc_v2_guest'); } catch { /* ignore */ }
    db.user = { name: 'Student', email: '', currency: db.user?.currency || '৳' };
    db.spaces = []; // don't leak one account's data into the next sign-in on a shared device
    save(db);
    window.location.reload(); // full reset so the login gate (incl. the in-memory guest flag) re-evaluates
  };
  const resetAll = () => { db.spaces = []; save(db); if (db.user?.id) saveV2Data(db.user.id, { spaces: [], user: pickUser(db.user) }).catch(() => {}); window.location.reload(); };
  const setUser = (patch) => { db.user = { ...(db.user || { name: 'Student', email: '', currency: '৳' }), ...patch }; if (patch.currency) setCurrency(patch.currency); commit(); };

  const value = {
    db, spaces: db.spaces, user: db.user || { name: 'Student', email: '', currency: '৳' },
    // selectors
    spaceById, blockById, findDue, childrenOf, topSpaces, personalSpace,
    allDues, spaceDues, monthTotal, summary, categoryTotals, instituteScoped, scopedSummary, scopedCategoryTotals,
    // actions
    createInstitute, createResidence, createSimple, createAsset, addSemester,
    addCategory, addRecurring, addOneTime, logExpense, logDaily, addScheduledCategory, removeBlock, payDue, deleteSpace, resetAll, setUser,
    addSimpleSemester, addDue, updateDue, deleteDue, unpayDue, addCost, linkSpaceToInstitute, unlinkSpaceFromInstitute,
    // auth + sync
    login, logout, pullFromServer, isLoggedIn: !!db.user?.id,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useV2 = () => useContext(Ctx);
