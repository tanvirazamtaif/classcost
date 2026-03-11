import { useRef, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

export const usePrivacy = () => {
  const [priv, setPriv] = useLocalStorage("ut_v3_privacy", {
    studentPIN: null,
    isLocked: false,
    parentPIN: null,
    budget: { monthly: 5000, transport: 1000, canteen: 800, hostel: 0 },
    hideCostTotals: false,
    loansLocked: false,
    loanSelectiveVisibility: { names: false, outstanding: false, emi: false, progress: false },
    sharePassword: null,
  });

  const revealTimer = useRef(null);

  const unlock = useCallback((pin) => {
    if (pin !== priv.studentPIN) return false;
    setPriv((p) => ({ ...p, isLocked: false }));
    clearTimeout(revealTimer.current);
    revealTimer.current = setTimeout(() => setPriv((p) => ({ ...p, isLocked: true })), 30000);
    return true;
  }, [priv.studentPIN, setPriv]);

  const lock = useCallback(() => {
    clearTimeout(revealTimer.current);
    setPriv((p) => ({ ...p, isLocked: true }));
  }, [setPriv]);

  const setPIN = useCallback((pin) => setPriv((p) => ({ ...p, studentPIN: pin, isLocked: false })), [setPriv]);
  const clearPIN = useCallback(() => setPriv((p) => ({ ...p, studentPIN: null, isLocked: false })), [setPriv]);

  const setParentPIN = useCallback((pin) => setPriv((p) => ({ ...p, parentPIN: pin })), [setPriv]);
  const clearParentPIN = useCallback(() => setPriv((p) => ({ ...p, parentPIN: null })), [setPriv]);

  const setParentSetting = useCallback((key, val) => setPriv((p) => ({ ...p, [key]: val })), [setPriv]);
  const setBudget = useCallback((b) => setPriv((p) => ({ ...p, budget: { ...p.budget, ...b } })), [setPriv]);

  return {
    priv, setPriv, unlock, lock, setPIN, clearPIN,
    setParentPIN, clearParentPIN, setParentSetting, setBudget,
  };
};
