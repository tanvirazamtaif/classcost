import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import { GCard, GCardContent, GButton, BottomSheet } from '../components/ui';
import { pageTransition } from '../lib/animations';
import { makeFmt } from '../utils/format';
import { getClosures, closeSemester, settleClosure, getTrackers } from '../api';

/**
 * Phase 5 — Closure wizard + Story Cards. Behind ENABLE_CLOSURE_UI.
 * Close a semester (non-destructive: archived + immutable ClosureRecord), then
 * render the shareable Story Card. Wired to /api/closure.
 */

const REASONS = [
  { id: 'completed', label: 'Completed' },
  { id: 'dropped', label: 'Dropped' },
  { id: 'transferred', label: 'Transferred' },
  { id: 'other', label: 'Other' },
];
const todayISO = () => new Date().toISOString().slice(0, 10);

export function ClosuresView() {
  const { user, theme, addToast } = useApp();
  const d = theme === 'dark';
  const userId = user?.id;
  const fmt = makeFmt(user?.profile?.currency || 'BDT');
  const m = (minor) => fmt((Number(minor) || 0) / 100);

  const [closures, setClosures] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [wizardOpen, setWizardOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ trackerId: '', closureReason: 'completed', effectiveEndDate: todayISO(), refundable: '' });

  useEffect(() => { document.title = 'Closures — ClassCost'; }, []);

  useEffect(() => {
    let alive = true;
    if (!userId) return;
    Promise.allSettled([getClosures(userId), getTrackers(userId)]).then(([cl, tr]) => {
      if (!alive) return;
      setClosures(cl.status === 'fulfilled' ? (cl.value || []) : []);
      const trackers = tr.status === 'fulfilled' ? (tr.value || []) : [];
      setSemesters(trackers.filter((t) => t.type === 'SEMESTER' && t.status === 'ACTIVE'));
      setLoading(false);
    });
    return () => { alive = false; };
  }, [userId]);

  const submit = async () => {
    if (!form.trackerId || !userId) { addToast?.('Pick a semester to close', 'error'); return; }
    setSaving(true);
    try {
      const record = await closeSemester(userId, form.trackerId, {
        closureReason: form.closureReason,
        effectiveEndDate: form.effectiveEndDate,
        refundableMinor: form.refundable ? Math.round(Number(form.refundable) * 100) : 0,
      });
      setClosures((c) => [record, ...c]);
      setSemesters((s) => s.filter((x) => x.id !== form.trackerId));
      setWizardOpen(false);
      setForm({ trackerId: '', closureReason: 'completed', effectiveEndDate: todayISO(), refundable: '' });
      addToast?.('Semester closed', 'success');
    } catch (e) {
      addToast?.(e.message || 'Could not close', 'error');
    } finally {
      setSaving(false);
    }
  };

  const settle = async (rec) => {
    try {
      const updated = await settleClosure(userId, rec.id);
      setClosures((c) => c.map((x) => (x.id === rec.id ? { ...x, status: updated.status } : x)));
      addToast?.('Marked as received', 'success');
    } catch (e) {
      addToast?.(e.message || 'Failed', 'error');
    }
  };

  const share = async (rec) => {
    const card = rec.storyCard || {};
    const lines = [
      card.title || 'Closure',
      ...(card.narrative || []),
      rec.refundableMinor > 0 ? `Refundable to you: ${m(rec.refundableMinor)}` : '',
    ].filter(Boolean);
    const text = lines.join('\n');
    try {
      if (navigator.share) await navigator.share({ title: card.title || 'ClassCost', text });
      else { await navigator.clipboard.writeText(text); addToast?.('Copied to clipboard', 'success'); }
    } catch { /* user cancelled */ }
  };

  const sub = d ? 'text-surface-400' : 'text-surface-500';
  const faint = d ? 'text-surface-500' : 'text-surface-400';

  const StoryCard = ({ rec }) => {
    const card = rec.storyCard || {};
    return (
      <GCard>
        <GCardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>{card.title || 'Closed'}</p>
              <p className={`text-[11px] ${faint}`}>{card.reason}{rec.effectiveEndDate ? ` · ${new Date(rec.effectiveEndDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}</p>
            </div>
            {rec.refundableMinor > 0 && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${rec.status === 'settled' ? 'bg-emerald-500/18 text-emerald-400' : 'bg-amber-500/18 text-amber-400'}`}>
                {rec.status === 'settled' ? 'Refund received' : 'Awaiting refund'}
              </span>
            )}
          </div>

          <div className={`mt-3 rounded-xl border ${d ? 'border-surface-800' : 'border-surface-200'} p-3 space-y-1`}>
            {(card.stats || []).map((s) => (
              <div key={s.key} className="flex items-center justify-between text-sm">
                <span className={sub}>{s.label}</span>
                <span className={s.kind === 'credit' || s.kind === 'refund' ? 'text-emerald-400' : (d ? 'text-white' : 'text-surface-900')}>
                  {s.amountMinor < 0 ? '-' : ''}{m(Math.abs(s.amountMinor))}
                </span>
              </div>
            ))}
          </div>

          {(card.narrative || []).length > 0 && (
            <p className={`mt-3 text-[11px] leading-relaxed ${sub}`}>{card.narrative.join(' ')}</p>
          )}

          <div className="mt-3 flex items-center gap-2">
            <GButton size="sm" variant="secondary" onClick={() => share(rec)}>Share</GButton>
            {rec.refundableMinor > 0 && rec.status !== 'settled' && (
              <GButton size="sm" onClick={() => settle(rec)}>Mark refund received</GButton>
            )}
          </div>
        </GCardContent>
      </GCard>
    );
  };

  return (
    <motion.div {...pageTransition} className="flex flex-col gap-4 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-bold ${d ? 'text-white' : 'text-surface-900'}`} style={{ fontFamily: "'Fraunces',serif" }}>Closures</h2>
          <p className={`text-sm ${sub}`}>Settle & archive finished semesters</p>
        </div>
        <GButton onClick={() => setWizardOpen(true)} disabled={semesters.length === 0}>Close a semester</GButton>
      </div>

      {loading ? (
        <p className={`text-sm ${sub}`}>Loading…</p>
      ) : closures.length === 0 ? (
        <GCard><GCardContent className="py-8 text-center">
          <div className="text-3xl mb-2">📦</div>
          <p className={`text-sm ${sub}`}>No closures yet.</p>
          <p className={`text-xs mt-1 ${faint}`}>
            {semesters.length > 0 ? 'Close a finished semester to settle its balance and get a shareable summary.' : 'When you finish a semester, close it here to keep a clean record.'}
          </p>
        </GCardContent></GCard>
      ) : (
        closures.map((rec) => <StoryCard key={rec.id} rec={rec} />)
      )}

      {/* Closure wizard */}
      <BottomSheet isOpen={wizardOpen} onClose={() => setWizardOpen(false)} title="Close a semester">
        <div className="flex flex-col gap-4 pb-2">
          <div>
            <p className={`text-xs font-semibold ${sub} mb-1`}>Which semester?</p>
            <div className="flex flex-col gap-2">
              {semesters.map((s) => (
                <button key={s.id} onClick={() => setForm((f) => ({ ...f, trackerId: s.id }))}
                  className={`text-left px-3 py-2.5 rounded-xl text-sm border ${form.trackerId === s.id ? 'border-primary-500 bg-primary-500/10 text-primary-300' : (d ? 'border-surface-700 text-surface-300' : 'border-surface-200 text-surface-700')}`}>
                  {s.label}
                </button>
              ))}
              {semesters.length === 0 && <p className={`text-xs ${faint}`}>No active semesters to close.</p>}
            </div>
          </div>
          <div>
            <p className={`text-xs font-semibold ${sub} mb-1`}>What happened?</p>
            <div className="grid grid-cols-2 gap-2">
              {REASONS.map((r) => (
                <button key={r.id} onClick={() => setForm((f) => ({ ...f, closureReason: r.id }))}
                  className={`py-2 rounded-xl text-xs font-medium border ${form.closureReason === r.id ? 'border-primary-500 bg-primary-500/10 text-primary-300' : (d ? 'border-surface-700 text-surface-300' : 'border-surface-200 text-surface-600')}`}>{r.label}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className={`text-xs font-semibold ${sub} mb-1`}>End date</p>
              <input type="date" value={form.effectiveEndDate} onChange={(e) => setForm((f) => ({ ...f, effectiveEndDate: e.target.value }))}
                style={{ colorScheme: d ? 'dark' : 'light' }}
                className={`w-full rounded-xl px-3 py-2.5 text-sm outline-none border ${d ? 'bg-surface-900 border-surface-700 text-white' : 'bg-white border-surface-200 text-surface-900'}`} />
            </div>
            <div>
              <p className={`text-xs font-semibold ${sub} mb-1`}>Refundable ৳ (optional)</p>
              <input type="number" value={form.refundable} onChange={(e) => setForm((f) => ({ ...f, refundable: e.target.value }))} placeholder="deposit, etc."
                className={`w-full rounded-xl px-3 py-2.5 text-sm outline-none border ${d ? 'bg-surface-900 border-surface-700 text-white' : 'bg-white border-surface-200 text-surface-900'}`} />
            </div>
          </div>
          <GButton onClick={submit} disabled={saving || !form.trackerId}>{saving ? 'Closing…' : 'Close & generate Story Card'}</GButton>
          <p className={`text-[10px] text-center ${faint}`}>This archives the semester (never deletes) and freezes its final balance.</p>
        </div>
      </BottomSheet>
    </motion.div>
  );
}

export default ClosuresView;
