import { useState, useCallback } from 'react';

export const useLocalStorage = (key, initialValue, override) => {
  const [storedValue, setStoredValue] = useState(() => {
    // If an override is provided (e.g. from URL hash), use it and persist immediately
    if (override !== undefined && override !== null) {
      try { localStorage.setItem(key, JSON.stringify(override)); } catch {}
      return override;
    }
    try {
      const item = localStorage.getItem(key);
      if (item === null || item === undefined) return initialValue;
      const parsed = JSON.parse(item);
      // If parsed is null/undefined but we have a default, use the default
      if (parsed === null || parsed === undefined) return initialValue;
      return parsed;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    setStoredValue((prev) => {
      const nextValue = typeof value === 'function' ? value(prev ?? initialValue) : value;
      try {
        localStorage.setItem(key, JSON.stringify(nextValue));
      } catch (e) {
        console.warn(`Failed to save to localStorage key "${key}":`, e);
      }
      return nextValue;
    });
  }, [key, initialValue]);

  return [storedValue ?? initialValue, setValue];
};
