import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useV3 } from '../contexts/V3Context';
import { getThemeColors } from '../lib/themeColors';
import { haptics } from '../lib/haptics';

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

export const AddEntityPage = () => {
  const { goBack, navigate, addToast, routeParams, user, theme = 'dark' } = useApp();
  const { addEntity } = useV3();
  const c = getThemeColors(theme === 'dark');

  const [type, setType] = useState(routeParams?.defaultType || 'INSTITUTION');
  const [name, setName] = useState('');
  const [eduLevel, setEduLevel] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!name.trim()) { addToast('Enter a name', 'error'); return; }
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
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: c.text2 }}>Name</label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder={type === 'INSTITUTION' ? 'BRAC University' : type === 'RESIDENCE' ? 'Mirpur Hostel' : 'Udvash Coaching'}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: c.card, border: `0.5px solid ${c.border}`, color: c.text1 }}
            autoFocus />
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
