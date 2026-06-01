import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useV3 } from '../contexts/V3Context';
import { getThemeColors } from '../lib/themeColors';
import { haptics } from '../lib/haptics';
import { INSTITUTIONS } from '../constants/education';

const TYPES = [
  { id: 'INSTITUTION', label: 'Institution', icon: '🎓' },
  { id: 'RESIDENCE', label: 'Residence', icon: '🏠' },
  { id: 'COACHING', label: 'Coaching', icon: '📖' },
];

const EDU_LEVELS = [
  { id: 'school', label: 'School' },
  { id: 'college', label: 'College' },
  { id: 'university', label: 'University' },
  { id: 'madrasa', label: 'Madrasa' },
  { id: 'polytechnic', label: 'Polytechnic' },
];

const TYPE_LABELS = { INSTITUTION: 'institution', RESIDENCE: 'residence', COACHING: 'club' };

// Maps the coarse EDU_LEVELS the user picks to the fine-grained keys in
// INSTITUTIONS. A single level can span multiple keys (e.g. "School" covers
// primary, junior, secondary, and full-school institutions).
const LEVEL_TO_INSTITUTION_KEYS = {
  school: ['primary', 'junior', 'secondary', 'fullschool'],
  college: ['hsc', 'degree_college', 'honours_college', 'fullschool'],
  university: ['undergrad_private', 'undergrad_public', 'masters', 'research'],
  madrasa: ['madrasa'],
  polytechnic: ['polytechnic'],
};

function getSuggestionsFor(level) {
  if (!level) return [];
  const keys = LEVEL_TO_INSTITUTION_KEYS[level] || [];
  const all = keys.flatMap((k) => INSTITUTIONS[k] || []);
  return [...new Set(all)]; // dedup (fullschool overlaps with others)
}

export const AddEntityPage = () => {
  const { goBack, navigate, addToast, routeParams, user, theme = 'dark' } = useApp();
  const { addEntity } = useV3();
  const c = getThemeColors(theme === 'dark');

  const [type, setType] = useState(routeParams?.defaultType || 'INSTITUTION');
  const [name, setName] = useState('');
  const [eduLevel, setEduLevel] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [creating, setCreating] = useState(false);
  const creatingRef = useRef(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const blurTimerRef = useRef(null);

  // Filter institution suggestions by the picked level + what the user has
  // typed. Substring match (case-insensitive) so "shahin" finds "BAF Shaheen
  // College". Cap at 8 so the dropdown never gets ridiculously long.
  const suggestions = useMemo(() => {
    if (type !== 'INSTITUTION' || !eduLevel) return [];
    const pool = getSuggestionsFor(eduLevel);
    const query = name.trim().toLowerCase();
    if (!query) return pool.slice(0, 6);
    const exactMatch = pool.find((s) => s.toLowerCase() === query);
    const filtered = pool.filter((s) => s.toLowerCase().includes(query));
    // If the user has already typed the full name of a suggestion, don't show
    // the dropdown — it'd just be a one-row "you already typed me" noise.
    if (exactMatch && filtered.length === 1) return [];
    return filtered.slice(0, 8);
  }, [type, eduLevel, name]);

  const pickSuggestion = (value) => {
    haptics.light();
    setName(value);
    setShowSuggestions(false);
  };

  useEffect(() => () => clearTimeout(blurTimerRef.current), []);

  async function handleCreate() {
    // Ref-based reentrancy guard. The `creating` state is async, so two rapid
    // clicks can both pass the `disabled` check before the button repaints.
    if (creatingRef.current) return;
    if (!name.trim()) { addToast('Enter a name', 'error'); return; }
    creatingRef.current = true;
    setCreating(true);
    haptics.medium();
    try {
      await addEntity({
        type,
        name: name.trim(),
        eduLevel: type === 'INSTITUTION' ? eduLevel || null : null,
        startDate: startDate || null,
      });
      haptics.success();
      addToast(`${TYPE_LABELS[type] || 'entity'} added!`, 'success');
      navigate('dashboard');
    } catch (err) {
      console.error('Create entity error:', err);
      addToast('Failed to create', 'error');
    } finally {
      setCreating(false);
      creatingRef.current = false;
    }
  }

  return (
    <div className="min-h-screen pb-8" style={{ background: c.bg }}>
      <header className="sticky top-0 z-40 px-4 py-3 flex items-center gap-3 backdrop-blur-xl"
        style={{ background: c.headerBg, borderBottom: `0.5px solid ${c.border}` }}>
        <button onClick={() => { haptics.light(); goBack(); }} className="p-1">
          <ArrowLeft size={20} style={{ color: c.text2 }} />
        </button>
        <p className="text-[15px] font-medium" style={{ color: c.text1 }}>
          Add {TYPE_LABELS[type] || 'entity'}
        </p>
      </header>

      <div className="max-w-[420px] mx-auto px-4 pt-5 space-y-5">
        {/* Type selector */}
        <div>
          <label className="text-xs font-medium mb-2 block" style={{ color: c.text2 }}>Type</label>
          <div className="flex gap-2">
            {TYPES.map(t => (
              <button key={t.id} onClick={() => { haptics.light(); setType(t.id); }}
                className="flex-1 py-3 rounded-xl text-center text-xs font-medium"
                style={{
                  background: type === t.id ? c.accent : c.card,
                  color: type === t.id ? 'white' : c.text3,
                  border: `0.5px solid ${type === t.id ? c.accent : c.border}`,
                }}>
                <span className="block text-lg mb-1">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div className="relative">
          <label className="text-xs font-medium mb-1 block" style={{ color: c.text2 }}>Name</label>
          <input value={name}
            onChange={e => { setName(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              // Delay so a click on a suggestion lands before we hide the list.
              blurTimerRef.current = setTimeout(() => setShowSuggestions(false), 150);
            }}
            placeholder={type === 'INSTITUTION' ? 'Start typing — e.g. BRAC University' : type === 'RESIDENCE' ? 'Mirpur Hostel' : 'Udvash Coaching'}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: c.card, border: `0.5px solid ${c.border}`, color: c.text1 }}
            autoFocus />

          {/* Autocomplete dropdown — only for INSTITUTION + a selected level */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 rounded-xl overflow-hidden z-20 shadow-lg"
              style={{ background: c.card, border: `0.5px solid ${c.border}` }}>
              {!name.trim() && (
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide font-semibold"
                  style={{ color: c.text3, borderBottom: `0.5px solid ${c.border}` }}>
                  Popular {EDU_LEVELS.find(l => l.id === eduLevel)?.label.toLowerCase() || 'institutions'}s
                </div>
              )}
              {suggestions.map((s) => (
                <button key={s}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()} // keep input focused
                  onClick={() => pickSuggestion(s)}
                  className="w-full text-left px-3 py-2.5 text-sm transition hover:opacity-80"
                  style={{ color: c.text1, borderBottom: `0.5px solid ${c.border}` }}>
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Education level (institution only) */}
        {type === 'INSTITUTION' && (
          <div>
            <label className="text-xs font-medium mb-2 block" style={{ color: c.text2 }}>Education level</label>
            <div className="flex flex-wrap gap-2">
              {EDU_LEVELS.map(l => (
                <button key={l.id} onClick={() => { haptics.light(); setEduLevel(eduLevel === l.id ? '' : l.id); }}
                  className="px-4 py-2 rounded-xl text-xs font-medium"
                  style={{
                    background: eduLevel === l.id ? c.accent : c.card,
                    color: eduLevel === l.id ? 'white' : c.text3,
                    border: `0.5px solid ${eduLevel === l.id ? c.accent : c.border}`,
                  }}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Start date */}
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: c.text2 }}>Start date (optional)</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: c.card, border: `0.5px solid ${c.border}`, color: c.text1, colorScheme: theme }} />
        </div>

        {/* Create */}
        <button onClick={handleCreate} disabled={creating || !name.trim()}
          className="w-full py-3.5 rounded-xl text-sm font-medium text-white"
          style={{ background: creating || !name.trim() ? c.text3 : c.accent }}>
          {creating ? 'Creating...' : `Add ${TYPE_LABELS[type] || 'entity'}`}
        </button>
      </div>
    </div>
  );
};

export default AddEntityPage;
