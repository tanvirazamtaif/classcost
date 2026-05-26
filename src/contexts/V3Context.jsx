import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { useApp } from './AppContext';
import { isEnabled } from '../lib/featureFlags';
import * as api from '../api';

const V3Context = createContext(null);

// Date range helpers
function getMonthRange(year, month) {
  return { start: new Date(year, month, 1), end: new Date(year, month + 1, 0, 23, 59, 59, 999) };
}

function filterEntriesByRange(entries, start, end) {
  return (entries || []).filter(e => {
    const d = new Date(e.date);
    return d >= start && d <= end;
  });
}

function sumEntries(entries) {
  let debit = 0, credit = 0;
  for (const e of entries) {
    if (e.direction === 'DEBIT') debit += e.amountMinor;
    else credit += e.amountMinor;
  }
  return debit - credit;
}

function sumByCategory(entries) {
  const map = {};
  for (const e of entries) {
    if (!map[e.category]) map[e.category] = 0;
    map[e.category] += e.direction === 'DEBIT' ? e.amountMinor : -e.amountMinor;
  }
  return map;
}

export function V3Provider({ children }) {
  const { user } = useApp();

  const [entities, setEntities] = useState([]);
  const [trackers, setTrackers] = useState([]);
  const [upcomingObligations, setUpcomingObligations] = useState([]);
  const [ledgerSummary, setLedgerSummary] = useState(null);
  const [recentEntries, setRecentEntries] = useState([]);
  const [allEntries, setAllEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  const active = isEnabled('USE_NEW_ARCHITECTURE') && !!user?.id;

  // Local-fallback storage for users whose accounts don't exist on the backend
  // (e.g. signed in via client-side Google decode or demo email). Keyed by the
  // user id so multiple test accounts don't collide.
  const localEntitiesKey = (uid) => `classcost_v3_local_entities_${uid}`;
  const readLocalEntities = (uid) => {
    try { return JSON.parse(localStorage.getItem(localEntitiesKey(uid)) || '[]'); }
    catch { return []; }
  };
  const writeLocalEntities = (uid, list) => {
    try { localStorage.setItem(localEntitiesKey(uid), JSON.stringify(list)); } catch { /* quota */ }
  };

  const loadAll = useCallback(async (userId) => {
    setLoading(true);
    try {
      const [ent, trk, upcoming, summary, ledger] = await Promise.all([
        api.getEntities(userId),
        api.getTrackers(userId),
        api.getUpcomingObligations(userId),
        api.getLedgerSummary(userId),
        api.getLedgerEntries(userId),
      ]);
      // Merge any locally-only entities (saved during backend outage or for
      // demo users without a server account) with the server set.
      const local = readLocalEntities(userId);
      const byId = new Map();
      for (const e of (ent || [])) byId.set(e.id, e);
      for (const e of local) if (!byId.has(e.id)) byId.set(e.id, e);
      setEntities(Array.from(byId.values()));
      setTrackers(trk || []);
      setUpcomingObligations(upcoming || []);
      setLedgerSummary(summary || null);
      const entries = ledger?.data || [];
      setRecentEntries(entries.slice(0, 20));
      setAllEntries(entries);
    } catch (err) {
      console.error('V3Context loadAll error:', err);
      // Backend completely unreachable — still show local entities so the
      // user isn't staring at an empty dashboard.
      setEntities(readLocalEntities(userId));
    } finally {
      setLoading(false);
    }
  }, []);

  const addEntity = useCallback(async (data) => {
    try {
      const entity = await api.createEntity(user.id, data);
      setEntities((prev) => [entity, ...prev]);
      return entity;
    } catch (err) {
      // Backend rejected (commonly because this user has no server account —
      // happens with client-side Google decode + demo email). Save locally so
      // the user can still build out their data. Synced if/when their account
      // gets created on the server.
      console.warn('createEntity backend failed, saving locally:', err?.message);
      const localEntity = {
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        userId: user.id,
        ...data,
        createdAt: new Date().toISOString(),
        _local: true,
      };
      setEntities((prev) => {
        const next = [localEntity, ...prev];
        writeLocalEntities(user.id, next.filter((e) => e._local));
        return next;
      });
      return localEntity;
    }
  }, [user?.id]);

  const addTracker = useCallback(async (data) => {
    const tracker = await api.createTracker(user.id, data);
    setTrackers((prev) => [tracker, ...prev]);
    api.getUpcomingObligations(user.id).then((u) => setUpcomingObligations(u || []));
    return tracker;
  }, [user?.id]);

  const recordPayment = useCallback(async (data) => {
    const entry = await api.createLedgerEntry(user.id, data);
    const [summary, upcoming, ledger] = await Promise.all([
      api.getLedgerSummary(user.id),
      api.getUpcomingObligations(user.id),
      api.getLedgerEntries(user.id),
    ]);
    setLedgerSummary(summary || null);
    setUpcomingObligations(upcoming || []);
    const entries = ledger?.data || [];
    setRecentEntries(entries.slice(0, 20));
    setAllEntries(entries);
    return entry;
  }, [user?.id]);

  const voidEntry = useCallback(async (id, reason) => {
    const entry = await api.voidLedgerEntry(user.id, id, reason);
    const [summary, upcoming, ledger] = await Promise.all([
      api.getLedgerSummary(user.id),
      api.getUpcomingObligations(user.id),
      api.getLedgerEntries(user.id),
    ]);
    setLedgerSummary(summary || null);
    setUpcomingObligations(upcoming || []);
    const entries = ledger?.data || [];
    setRecentEntries(entries.slice(0, 20));
    setAllEntries(entries);
    return entry;
  }, [user?.id]);

  const refreshSummary = useCallback(async () => {
    if (!user?.id) return;
    const summary = await api.getLedgerSummary(user.id);
    setLedgerSummary(summary || null);
  }, [user?.id]);

  // Scope-filtered totals — computed from allEntries
  const scopedTotals = useMemo(() => {
    const now = new Date();
    const thisMonth = getMonthRange(now.getFullYear(), now.getMonth());
    const lastMonth = getMonthRange(
      now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(),
      now.getMonth() === 0 ? 11 : now.getMonth() - 1
    );
    const thisYear = { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999) };

    const thisMonthEntries = filterEntriesByRange(allEntries, thisMonth.start, thisMonth.end);
    const lastMonthEntries = filterEntriesByRange(allEntries, lastMonth.start, lastMonth.end);
    const thisYearEntries = filterEntriesByRange(allEntries, thisYear.start, thisYear.end);

    return {
      lifetime: { total: sumEntries(allEntries), byCategory: sumByCategory(allEntries) },
      thisMonth: { total: sumEntries(thisMonthEntries), byCategory: sumByCategory(thisMonthEntries) },
      lastMonth: { total: sumEntries(lastMonthEntries), byCategory: sumByCategory(lastMonthEntries) },
      thisYear: { total: sumEntries(thisYearEntries), byCategory: sumByCategory(thisYearEntries) },
    };
  }, [allEntries]);

  // Trend: this month vs last month
  const monthTrend = useMemo(() => {
    const curr = scopedTotals.thisMonth.total;
    const prev = scopedTotals.lastMonth.total;
    if (prev === 0) return { pct: 0, direction: 'flat' };
    const pct = Math.round(((curr - prev) / prev) * 100);
    return { pct: Math.abs(pct), direction: curr > prev ? 'up' : curr < prev ? 'down' : 'flat' };
  }, [scopedTotals]);

  useEffect(() => {
    if (active) loadAll(user.id);
  }, [active, user?.id, loadAll]);

  return (
    <V3Context.Provider
      value={{
        entities, trackers, upcomingObligations, ledgerSummary,
        recentEntries, allEntries, loading, scopedTotals, monthTrend,
        loadAll, addEntity, addTracker, recordPayment, voidEntry, refreshSummary,
      }}
    >
      {children}
    </V3Context.Provider>
  );
}

export function useV3() {
  const ctx = useContext(V3Context);
  if (!ctx) throw new Error('useV3 must be used within V3Provider');
  return ctx;
}
