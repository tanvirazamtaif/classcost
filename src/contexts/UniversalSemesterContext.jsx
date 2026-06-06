import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useApp } from './AppContext';
import {
  DEFAULT_ELIGIBLE_TYPES,
  newSemesterId,
  newFeeId,
  newInstId,
  todayISO,
} from '../lib/installmentEngine';

// ═══════════════════════════════════════════════════════════════
// UNIVERSAL SEMESTER STORE
// ───────────────────────────────────────────────────────────────
// Self-contained, per-user localStorage store for the universal
// installment + waiver system ported from the Semester Setup mockups.
// Kept separate from the legacy EducationFeeContext so the richer
// shape (semester → profile + many fees → installments) is preserved
// without destabilising existing fee records.
//
// Shape of one universal semester:
// {
//   id, universityName, semesterName, createdAt, updatedAt,
//   profile: {
//     waiverPercent, scholarshipType, billingDay,
//     installmentPreference, semesterEndDate, eligibleFeeTypes: [..]
//   },
//   fees: [{
//     id, type, label, icon, originalAmount, waiverEligible,
//     waiverPctAtCreation, breakdown|null, note,
//     installments: [{ id, amount, dueDate, paid, paidDate }]
//   }]
// }
// ═══════════════════════════════════════════════════════════════

const STORAGE_PREFIX = 'classcost_universal_semesters_';
const keyFor = (uid) => `${STORAGE_PREFIX}${uid || 'anon'}`;

function read(uid) {
  try {
    const raw = localStorage.getItem(keyFor(uid));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(uid, list) {
  try {
    localStorage.setItem(keyFor(uid), JSON.stringify(list || []));
  } catch {
    /* quota — non-fatal */
  }
}

export function defaultProfile(overrides = {}) {
  return {
    waiverPercent: 0,
    scholarshipType: null,
    billingDay: 10,
    installmentPreference: 1, // 1 | 2 | 3 | 4 | 'custom'
    semesterEndDate: '',
    eligibleFeeTypes: [...DEFAULT_ELIGIBLE_TYPES],
    ...overrides,
  };
}

const UniversalSemesterContext = createContext(null);

export const UniversalSemesterProvider = ({ children }) => {
  const { user } = useApp();
  const uid = user?.id;
  const [semesters, setSemesters] = useState(() => read(uid));
  const isFirst = useRef(true);

  // Re-hydrate when the signed-in user changes (account switch / login).
  useEffect(() => {
    setSemesters(read(uid));
  }, [uid]);

  // Persist on every change.
  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    write(uid, semesters);
  }, [semesters, uid]);

  // ── Mutators ──────────────────────────────────────────────────

  /** Patch a single semester by id with an updater fn, stamping updatedAt. */
  const patchSemester = useCallback((id, updater) => {
    setSemesters((list) =>
      list.map((s) =>
        s.id === id ? { ...updater(s), id: s.id, updatedAt: new Date().toISOString() } : s
      )
    );
  }, []);

  /**
   * Create a semester. `fees` and `profile` are optional; a sensible
   * default profile is merged in. Returns the created record.
   */
  const createSemester = useCallback(({ universityName = '', semesterName = '', profile = {}, fees = [] } = {}) => {
    const now = new Date().toISOString();
    const record = {
      id: newSemesterId(),
      universityName,
      semesterName,
      createdAt: now,
      updatedAt: now,
      profile: defaultProfile(profile),
      fees: fees.map((f) => ({
        id: f.id || newFeeId(),
        type: f.type,
        label: f.label,
        icon: f.icon,
        originalAmount: Number(f.originalAmount) || 0,
        waiverEligible: !!f.waiverEligible,
        waiverPctAtCreation: Number(f.waiverPctAtCreation) || 0,
        breakdown: f.breakdown || null,
        note: f.note || null,
        installments: (f.installments || []).map((i) => ({
          id: i.id || newInstId(),
          amount: Number(i.amount) || 0,
          dueDate: i.dueDate || '',
          paid: !!i.paid,
          paidDate: i.paid ? (i.paidDate || todayISO()) : null,
        })),
      })),
    };
    setSemesters((list) => [...list, record]);
    return record;
  }, []);

  const updateProfile = useCallback((id, patch) => {
    patchSemester(id, (s) => ({ ...s, profile: { ...s.profile, ...patch } }));
  }, [patchSemester]);

  const updateSemesterMeta = useCallback((id, patch) => {
    patchSemester(id, (s) => ({ ...s, ...patch }));
  }, [patchSemester]);

  const deleteSemester = useCallback((id) => {
    setSemesters((list) => list.filter((s) => s.id !== id));
  }, []);

  const setFees = useCallback((id, feesOrFn) => {
    patchSemester(id, (s) => ({
      ...s,
      fees: typeof feesOrFn === 'function' ? feesOrFn(s.fees) : feesOrFn,
    }));
  }, [patchSemester]);

  const addFee = useCallback((id, fee) => {
    const built = {
      id: newFeeId(),
      type: fee.type,
      label: fee.label,
      icon: fee.icon,
      originalAmount: Number(fee.originalAmount) || 0,
      waiverEligible: !!fee.waiverEligible,
      waiverPctAtCreation: Number(fee.waiverPctAtCreation) || 0,
      breakdown: fee.breakdown || null,
      note: fee.note || null,
      installments: (fee.installments || []).map((i) => ({
        id: i.id || newInstId(),
        amount: Number(i.amount) || 0,
        dueDate: i.dueDate || '',
        paid: !!i.paid,
        paidDate: i.paid ? (i.paidDate || todayISO()) : null,
      })),
    };
    patchSemester(id, (s) => ({ ...s, fees: [...s.fees, built] }));
    return built;
  }, [patchSemester]);

  const updateFee = useCallback((id, feeId, patch) => {
    patchSemester(id, (s) => ({
      ...s,
      fees: s.fees.map((f) => (f.id === feeId ? { ...f, ...patch } : f)),
    }));
  }, [patchSemester]);

  const removeFee = useCallback((id, feeId) => {
    patchSemester(id, (s) => ({ ...s, fees: s.fees.filter((f) => f.id !== feeId) }));
  }, [patchSemester]);

  const getSemester = useCallback((id) => semesters.find((s) => s.id === id) || null, [semesters]);

  const value = useMemo(() => ({
    semesters,
    getSemester,
    createSemester,
    deleteSemester,
    updateProfile,
    updateSemesterMeta,
    setFees,
    addFee,
    updateFee,
    removeFee,
  }), [semesters, getSemester, createSemester, deleteSemester, updateProfile, updateSemesterMeta, setFees, addFee, updateFee, removeFee]);

  return (
    <UniversalSemesterContext.Provider value={value}>
      {children}
    </UniversalSemesterContext.Provider>
  );
};

export function useUniversalSemesters() {
  const ctx = useContext(UniversalSemesterContext);
  if (!ctx) throw new Error('useUniversalSemesters must be used within UniversalSemesterProvider');
  return ctx;
}

export default UniversalSemesterContext;
