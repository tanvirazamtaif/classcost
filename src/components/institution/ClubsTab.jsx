import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { GButton } from '../ui';
import { AmountInput } from '../shared/AmountInput';
import { haptics } from '../../lib/haptics';

const CLUB_TYPES = ['Club', 'Committee', 'Organization', 'Team', 'Other'];
const CLUB_ICONS = ['⚽', '🏀', '🎭', '🎵', '🎨', '💻', '🔬', '📸', '🎮', '♟️', '📚', '✨'];

export const ClubsTab = ({ institutionName, clubs, addClub, updateClub, removeClub, dark, addToast }) => {
  const d = dark;
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('Club');
  const [icon, setIcon] = useState('⚽');
  const [fee, setFee] = useState('');

  // Selection + edit state
  const [selectedClub, setSelectedClub] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editFee, setEditFee] = useState('');

  const handleSave = () => {
    if (!name.trim()) { haptics.error(); addToast('Enter a name', 'error'); return; }
    haptics.success();
    addClub({
      id: `club_${Date.now().toString(36)}`,
      institutionName,
      name: name.trim(),
      type, icon,
      fee: parseFloat(fee) || null,
      isActive: true,
      createdAt: new Date().toISOString(),
    });
    addToast(`${name.trim()} added`, 'success');
    setShowAdd(false); setName(''); setType('Club'); setIcon('⚽'); setFee('');
  };

  const instClubs = (clubs || []).filter(c => c.institutionName === institutionName);

  const inputCls = `w-full p-3 border rounded-xl text-sm outline-none focus:border-primary-500 transition ${d ? 'bg-surface-800 border-surface-700 text-white' : 'bg-surface-50 border-surface-200 text-surface-900'}`;

  return (
    <div className="space-y-4">
      {/* Club list — clickable */}
      {instClubs.length > 0 && (
        <div className="space-y-2">
          {instClubs.map(club => (
            <motion.button key={club.id} whileTap={{ scale: 0.98 }}
              onClick={() => { haptics.light(); setSelectedClub(selectedClub?.id === club.id ? null : club); setEditMode(false); }}
              className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                selectedClub?.id === club.id
                  ? d ? 'bg-primary-900/20 border-primary-700' : 'bg-primary-50 border-primary-300'
                  : d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'
              }`}>
              <span className="text-xl">{club.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${d ? 'text-white' : 'text-surface-900'}`}>{club.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${d ? 'bg-surface-800 text-surface-400' : 'bg-surface-100 text-surface-600'}`}>{club.type}</span>
                  {club.fee && <span className={`text-xs ${d ? 'text-surface-500' : 'text-surface-400'}`}>৳{club.fee.toLocaleString()}</span>}
                </div>
              </div>
              <span className={`text-xs ${d ? 'text-surface-600' : 'text-surface-300'}`}>›</span>
            </motion.button>
          ))}
        </div>
      )}

      {/* Selected club action panel */}
      <AnimatePresence>
        {selectedClub && !showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className={`rounded-xl border overflow-hidden ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}>
            {!editMode ? (
              <div className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{selectedClub.icon}</span>
                  <div>
                    <p className={`text-base font-semibold ${d ? 'text-white' : 'text-surface-900'}`}>{selectedClub.name}</p>
                    <p className={`text-xs ${d ? 'text-surface-400' : 'text-surface-500'}`}>
                      {selectedClub.type}{selectedClub.fee ? ` · ৳${selectedClub.fee.toLocaleString()}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <GButton variant="secondary" fullWidth onClick={() => {
                    setEditMode(true);
                    setEditName(selectedClub.name); setEditType(selectedClub.type);
                    setEditIcon(selectedClub.icon); setEditFee(selectedClub.fee?.toString() || '');
                  }}>Edit</GButton>
                  <GButton variant="secondary" fullWidth onClick={() => {
                    haptics.medium();
                    removeClub(selectedClub.id);
                    addToast(`${selectedClub.name} removed`, 'success');
                    setSelectedClub(null);
                  }} className="!text-red-500">Remove</GButton>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                <p className={`text-sm font-medium ${d ? 'text-white' : 'text-surface-900'}`}>Edit Club</p>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className={inputCls} placeholder="Club name" />
                <div className="flex flex-wrap gap-1.5">
                  {CLUB_TYPES.map(t => (
                    <button key={t} onClick={() => setEditType(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${editType === t ? 'bg-primary-600 text-white' : d ? 'bg-surface-800 text-surface-400' : 'bg-surface-100 text-surface-600'}`}>{t}</button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {CLUB_ICONS.map(e => (
                    <button key={e} onClick={() => setEditIcon(e)}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition ${editIcon === e ? 'bg-primary-100 dark:bg-primary-900/30 ring-2 ring-primary-500' : d ? 'bg-surface-800' : 'bg-surface-100'}`}>{e}</button>
                  ))}
                </div>
                <AmountInput value={editFee} onChange={setEditFee} dark={d} size="sm" placeholder="Fee (optional)" />
                <div className="flex gap-2">
                  <GButton variant="secondary" fullWidth onClick={() => setEditMode(false)}>Cancel</GButton>
                  <GButton fullWidth onClick={() => {
                    if (!editName.trim()) { addToast('Enter a name', 'error'); return; }
                    haptics.success();
                    updateClub(selectedClub.id, { name: editName.trim(), type: editType, icon: editIcon, fee: parseFloat(editFee) || null });
                    addToast('Club updated', 'success');
                    setEditMode(false);
                    setSelectedClub({ ...selectedClub, name: editName.trim(), type: editType, icon: editIcon, fee: parseFloat(editFee) || null });
                  }}>Save</GButton>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {instClubs.length === 0 && !showAdd && (
        <div className={`text-center py-10 ${d ? 'text-surface-500' : 'text-surface-400'}`}>
          <span className="text-4xl block mb-3">🏆</span>
          <p className="text-sm">No clubs or activities yet</p>
          <p className="text-xs mt-1">Add your clubs, committees, and teams</p>
        </div>
      )}

      {/* Add button */}
      {!showAdd && !selectedClub && (
        <GButton fullWidth variant="secondary" onClick={() => { haptics.light(); setShowAdd(true); }}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Club / Activity
        </GButton>
      )}

      {/* Add form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className={`p-4 rounded-2xl border space-y-4 ${d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}>
            <p className={`text-sm font-medium ${d ? 'text-white' : 'text-surface-900'}`}>New Club / Activity</p>
            <input type="text" placeholder="e.g., Football Club, Debate Society" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} autoFocus />
            <div>
              <p className={`text-xs font-medium mb-2 ${d ? 'text-surface-400' : 'text-surface-500'}`}>Type</p>
              <div className="flex flex-wrap gap-1.5">
                {CLUB_TYPES.map(t => (
                  <button key={t} onClick={() => { haptics.light(); setType(t); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${type === t ? 'bg-primary-600 text-white' : d ? 'bg-surface-800 text-surface-400' : 'bg-surface-100 text-surface-600'}`}>{t}</button>
                ))}
              </div>
            </div>
            <div>
              <p className={`text-xs font-medium mb-2 ${d ? 'text-surface-400' : 'text-surface-500'}`}>Icon</p>
              <div className="flex flex-wrap gap-2">
                {CLUB_ICONS.map(e => (
                  <button key={e} onClick={() => { haptics.light(); setIcon(e); }}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition ${icon === e ? 'bg-primary-100 dark:bg-primary-900/30 ring-2 ring-primary-500' : d ? 'bg-surface-800' : 'bg-surface-100'}`}>{e}</button>
                ))}
              </div>
            </div>
            <div>
              <p className={`text-xs font-medium mb-2 ${d ? 'text-surface-400' : 'text-surface-500'}`}>Membership Fee <span className="text-surface-400 font-normal">(optional)</span></p>
              <AmountInput value={fee} onChange={setFee} dark={d} size="sm" placeholder="0" />
            </div>
            <div className="flex gap-2">
              <GButton variant="secondary" fullWidth onClick={() => { setShowAdd(false); setName(''); }}>Cancel</GButton>
              <GButton fullWidth onClick={handleSave} disabled={!name.trim()}>Save</GButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
