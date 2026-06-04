import { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { Card, Btn, Input, Badge, BottomSheet } from '../components/ui';
import { getCircles, createCircle, setCircleStatus } from '../api';

/**
 * Phase 6 — Layered profile section (Wholeness ring + Trusted Circles).
 * Behind ENABLE_PROFILE_V2. Trusted Circles are wired to /api/circles.
 * Rendered as an additive section in SettingsView — never replaces existing settings.
 */

const PETALS = [
  { key: 'identity', label: 'Identity', emoji: '🧑' },
  { key: 'academic', label: 'Academic', emoji: '🎓' },
  { key: 'living', label: 'Living', emoji: '🏠' },
  { key: 'money', label: 'Money', emoji: '💳' },
];

const PRESETS = [
  { id: 'fee_buddy', label: 'Fee Buddy', sub: 'Fees, dues & forecast only' },
  { id: 'full_picture', label: 'Full Picture', sub: 'Everything except private zones' },
  { id: 'custodian', label: 'Custodian', sub: 'Fee Buddy + can mark paid' },
  { id: 'custom', label: 'Custom', sub: 'You pick each section' },
];

const STATUS_COLOR = { active: 'emerald', paused: 'amber', revoked: 'rose' };

function identityLine({ institutionName }) {
  if (institutionName) return `Student at ${institutionName}`;
  return "Let's set up your profile";
}

export function ProfileV2() {
  const { user, addToast } = useApp();
  const { institutionName, currency } = useUserProfile();
  const userId = user?.id;
  const profile = user?.profile || {};

  // Wholeness petals (gentle — never nags, 0/4 is valid).
  const lit = {
    identity: Boolean(profile.fullName),
    academic: Boolean(institutionName),
    living: Boolean(profile.livesWithFamily || profile.residenceName),
    money: Boolean(currency),
  };
  const litCount = Object.values(lit).filter(Boolean).length;

  const [circles, setCircles] = useState([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState({ label: '', relation: '', phoneE164: '', preset: 'fee_buddy' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!userId) return;
    getCircles(userId)
      .then((rows) => { if (alive) { setCircles(rows || []); setLoading(false); } })
      .catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [userId]);

  const submit = async () => {
    if (!form.label.trim() || !userId) return;
    setSaving(true);
    try {
      const created = await createCircle(userId, form);
      setCircles((c) => [created, ...c]);
      setSheetOpen(false);
      setForm({ label: '', relation: '', phoneE164: '', preset: 'fee_buddy' });
      addToast?.(`${created.label} added`, 'success');
    } catch (e) {
      addToast?.(e.message || 'Could not add circle', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (circle) => {
    const next = circle.status === 'active' ? 'paused' : 'active';
    try {
      const updated = await setCircleStatus(userId, circle.id, next);
      setCircles((c) => c.map((x) => (x.id === circle.id ? { ...x, status: updated.status } : x)));
    } catch (e) {
      addToast?.(e.message || 'Failed', 'error');
    }
  };

  const visibleSections = (circle) =>
    (circle.permissions || []).filter((p) => p.visibility === 'visible').map((p) => p.section);

  return (
    <div className="flex flex-col gap-5">
      {/* Identity + Wholeness */}
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-primary-500/20 flex items-center justify-center text-2xl font-bold text-indigo-600 dark:text-primary-300">
            {profile.fullName?.[0] || user?.email?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 dark:text-white">{profile.fullName || 'Student'}</p>
            <p className="text-indigo-600 dark:text-primary-300 text-xs truncate">{identityLine({ institutionName })}</p>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-400 dark:text-surface-500">Wholeness</p>
            <p className="text-[11px] text-slate-400 dark:text-surface-500">{litCount} of 4</p>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {PETALS.map((p) => (
              <div key={p.key}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl border ${
                  lit[p.key]
                    ? 'border-primary-500/40 bg-primary-500/10'
                    : 'border-slate-200 dark:border-surface-800 opacity-50'
                }`}>
                <span className="text-lg">{p.emoji}</span>
                <span className="text-[10px] text-slate-600 dark:text-surface-300">{p.label}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Trusted Circles */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-1">
          <p className="font-semibold text-slate-800 dark:text-white">Trusted Circles</p>
          <Btn size="sm" variant="ghost" onClick={() => setSheetOpen(true)}>+ Add</Btn>
        </div>
        <p className="text-xs text-slate-500 dark:text-surface-400 mb-4">
          Share selected sections with family. You decide what they see — food, transit & other stay private by default.
        </p>

        {loading ? (
          <p className="text-sm text-slate-400 dark:text-surface-500">Loading…</p>
        ) : circles.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-surface-500">No circles yet. Add a parent or guardian to share your fees & forecast.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {circles.map((c) => (
              <div key={c.id} className="rounded-2xl border border-slate-100 dark:border-surface-800 p-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-800 dark:text-white truncate">{c.label}</p>
                      <Badge color={STATUS_COLOR[c.status] || 'slate'}>{c.status}</Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-surface-400 mt-0.5">
                      {PRESETS.find((p) => p.id === c.preset)?.label || c.preset} · sees {visibleSections(c).length} section(s)
                    </p>
                  </div>
                  <Btn size="sm" variant="ghost" onClick={() => toggleStatus(c)}>
                    {c.status === 'active' ? 'Pause' : 'Resume'}
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add-circle sheet */}
      <BottomSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} title="Add a Trusted Circle">
        <div className="flex flex-col gap-4 pb-2">
          <Input label="Name" value={form.label} onChange={(v) => setForm((f) => ({ ...f, label: v }))} placeholder="e.g. Abba" />
          <Input label="Relation (optional)" value={form.relation} onChange={(v) => setForm((f) => ({ ...f, relation: v }))} placeholder="father / mother / guardian" />
          <Input label="Phone (optional)" value={form.phoneE164} onChange={(v) => setForm((f) => ({ ...f, phoneE164: v }))} placeholder="+8801XXXXXXXXX" />
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-surface-400 mb-2">What can they see?</p>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button key={p.id} onClick={() => setForm((f) => ({ ...f, preset: p.id }))}
                  className={`text-left p-3 rounded-xl border transition ${
                    form.preset === p.id
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-slate-200 dark:border-surface-700'
                  }`}>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">{p.label}</p>
                  <p className="text-[10px] text-slate-500 dark:text-surface-400 mt-0.5">{p.sub}</p>
                </button>
              ))}
            </div>
          </div>
          <Btn onClick={submit} disabled={saving || !form.label.trim()}>
            {saving ? 'Adding…' : 'Add circle'}
          </Btn>
          <p className="text-[10px] text-center text-slate-400 dark:text-surface-500">
            You'll be able to pause or revoke access anytime.
          </p>
        </div>
      </BottomSheet>
    </div>
  );
}

export default ProfileV2;
