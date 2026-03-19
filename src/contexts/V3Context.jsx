import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useApp } from './AppContext';
import { isEnabled } from '../lib/featureFlags';
import * as api from '../api';

const V3Context = createContext(null);

export function V3Provider({ children }) {
  const { user } = useApp();

  const [entities, setEntities] = useState([]);
  const [trackers, setTrackers] = useState([]);
  const [upcomingObligations, setUpcomingObligations] = useState([]);
  const [ledgerSummary, setLedgerSummary] = useState(null);
  const [recentEntries, setRecentEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  const active = isEnabled('USE_NEW_ARCHITECTURE') && !!user?.id;

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
      setEntities(ent || []);
      setTrackers(trk || []);
      setUpcomingObligations(upcoming || []);
      setLedgerSummary(summary || null);
      setRecentEntries((ledger?.data || []).slice(0, 20));
    } catch (err) {
      console.error('V3Context loadAll error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addEntity = useCallback(async (data) => {
    const entity = await api.createEntity(user.id, data);
    setEntities((prev) => [entity, ...prev]);
    return entity;
  }, [user?.id]);

  const addTracker = useCallback(async (data) => {
    const tracker = await api.createTracker(user.id, data);
    setTrackers((prev) => [tracker, ...prev]);
    // Refresh upcoming since tracker creation may generate obligations
    api.getUpcomingObligations(user.id).then((u) => setUpcomingObligations(u || []));
    return tracker;
  }, [user?.id]);

  const recordPayment = useCallback(async (data) => {
    const entry = await api.createLedgerEntry(user.id, data);
    // Refresh summary, upcoming, and recent entries
    const [summary, upcoming, ledger] = await Promise.all([
      api.getLedgerSummary(user.id),
      api.getUpcomingObligations(user.id),
      api.getLedgerEntries(user.id),
    ]);
    setLedgerSummary(summary || null);
    setUpcomingObligations(upcoming || []);
    setRecentEntries((ledger?.data || []).slice(0, 20));
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
    setRecentEntries((ledger?.data || []).slice(0, 20));
    return entry;
  }, [user?.id]);

  const refreshSummary = useCallback(async () => {
    if (!user?.id) return;
    const summary = await api.getLedgerSummary(user.id);
    setLedgerSummary(summary || null);
  }, [user?.id]);

  // Auto-load on mount when feature flag is on and user is logged in
  useEffect(() => {
    if (active) {
      loadAll(user.id);
    }
  }, [active, user?.id, loadAll]);

  return (
    <V3Context.Provider
      value={{
        entities,
        trackers,
        upcomingObligations,
        ledgerSummary,
        recentEntries,
        loading,
        loadAll,
        addEntity,
        addTracker,
        recordPayment,
        voidEntry,
        refreshSummary,
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
