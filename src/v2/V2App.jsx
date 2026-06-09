// ClassCost v2 — app shell + screens. Theme from v1's getThemeColors() (light + dark), via CSS vars.
import React, { useState, useRef, useEffect } from 'react';
import { Plus, ChevronRight, ChevronLeft, Utensils, Bus, Sparkles, Sun, Moon, Home as HomeIcon, CalendarDays, BarChart3, Settings as SettingsIcon, GraduationCap, Building2, Users, Bike, Repeat, Package, Menu, Bell, LogOut, Lock, Download, Newspaper, PenSquare, Search, Heart, MessageCircle, Share2, Image as ImageIcon, Flag } from 'lucide-react';
import { motion } from 'framer-motion';
import { V2Provider, useV2 } from './store';
import { fmt, MN, MNS, WD, split, iso, parse, today, inMonth, paidOf, remOf, statusOf, detectInstitute } from './engine';
// ClassCost v2 palette — derived from the logo (ink #0F1537 + cream). Notion-calm: warm
// neutrals + one accent that inverts per mode (navy-on-cream / cream-on-navy) + muted gold.
const v2Palette = (d) => d ? {
  bg: '#0F1537', card: '#171E42', border: '#262E55',
  accent: '#EAD9B0', accentText: '#0F1537', accentLight: 'rgba(234,217,176,.14)', gold: '#E3C078',
  text1: '#F4EEE1', text2: '#A6ACC9', text3: '#6B7299',
  heroBg: '#141B3E', heroBorder: 'rgba(234,217,176,.18)',
  pillBg: '#141B3E', navBg: 'rgba(15,21,55,.92)', sheetBg: '#171E42', cardShadow: 'none',
} : {
  bg: '#F4EEE1', card: '#FCF9F2', border: '#E6DFCE',
  accent: '#16204A', accentText: '#FBF7EF', accentLight: 'rgba(22,32,74,.10)', gold: '#9A6A12',
  text1: '#1B2138', text2: '#6E6755', text3: '#9C957F',
  heroBg: '#FCF9F2', heroBorder: '#E6DFCE',
  pillBg: '#EFE8D7', navBg: 'rgba(244,238,225,.92)', sheetBg: '#FCF9F2', cardShadow: '0 1px 2px rgba(20,25,50,.05)',
};
import { Logo } from '../components/ui/Logo';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Leeboon } from './Leeboon';
import { getMyFeedProfile, claimHandle, listFeedPosts, createFeedPost, likePost, unlikePost, getComments, addComment, followUser, unfollowUser, searchUsers, getFeedProfile, getUserPosts, uploadFeedImage, reportContent } from '../api';
import { V2Landing } from './V2Landing';
import './v2.css';

/* ---------------- shared UI ---------------- */
function Header({ title, crumb, onBack }) {
  return (
    <header className="sticky top-0 z-20 px-4 py-3" style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(10px)', borderBottom: '.5px solid var(--border)' }}>
      <div className="flex items-center gap-2.5">
        {onBack && <button onClick={onBack} className="w-9 h-9 -ml-1.5 rounded-full flex items-center justify-center t-mid" aria-label="Back"><ChevronLeft size={20} /></button>}
        <div className="min-w-0">{crumb && <p className="text-[11px] t-lo truncate">{crumb}</p>}<h1 className="text-lg font-semibold t-hi truncate">{title}</h1></div>
      </div>
    </header>
  );
}
const Row = ({ l, v, danger }) => (<div className="flex justify-between"><span className="t-mid">{l}</span><span className={danger ? '' : 't-hi'} style={danger ? { color: '#ef4444' } : undefined}>{v}</span></div>);
const Field = ({ label, v, onC, ph, type = 'text' }) => (
  <div><label className="text-[12px] block mb-1.5 t-mid">{label}</label><input className="field" type={type} value={v} placeholder={ph} onChange={(e) => onC(e.target.value)} /></div>
);
function statusPill(d) {
  const st = statusOf(d), rem = remOf(d);
  if (st === 'paid') return <span className="pill st-paid">Paid</span>;
  if (st === 'partial') return <span className="pill st-partial">{fmt(rem)} left</span>;
  if (st === 'overdue') return <span className="pill st-overdue">Overdue</span>;
  return <span className="pill st-pending">Upcoming</span>;
}
function DueRow({ d, label }) {
  const { payDue } = useV2();
  const [partial, setPartial] = useState(false);
  const [amt, setAmt] = useState('');
  const st = statusOf(d), paid = paidOf(d), date = parse(d.date);
  return (
    <div className="card p-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] t-hi truncate">{label || d.label}</p>
          <p className="text-[11px] t-mid">{date.getDate()} {MNS[date.getMonth()]} {date.getFullYear()} · {fmt(d.amount)}{paid > 0 && st !== 'paid' ? ' · paid ' + fmt(paid) : ''}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {statusPill(d)}
          {st !== 'paid' && (
            <div className="flex gap-1.5">
              <button className="minibtn st-paid" onClick={() => payDue(d.id)}>Paid</button>
              <button className="minibtn btn-ghost" onClick={() => setPartial((p) => !p)}>Part…</button>
            </div>
          )}
        </div>
      </div>
      {(d.payments || []).length > 0 && <div className="flex flex-wrap gap-1 mt-2">{d.payments.map((p, i) => <span key={i} className="pill st-paid">{fmt(p)} ✓</span>)}</div>}
      {partial && (
        <div className="flex gap-1.5 mt-2">
          <input className="field" type="number" placeholder="amount paid" value={amt} onChange={(e) => setAmt(e.target.value)} autoFocus />
          <button className="minibtn btn-primary" style={{ width: 'auto' }} onClick={() => { const v = Math.max(0, +amt || 0); if (v > 0) payDue(d.id, v); setPartial(false); setAmt(''); }}>Add</button>
        </div>
      )}
    </div>
  );
}

/* ---------------- HOME ---------------- */
const DAILY = [
  { cat: 'Food', emoji: '🍔', Icon: Utensils, color: '#f97316' },
  { cat: 'Transport', emoji: '🚌', Icon: Bus, color: '#3b82f6' },
  { cat: 'Others', emoji: '📦', Icon: Sparkles, color: '#64748b' },
];
function Home({ nav, tab, d }) {
  const { summary, topSpaces, spaceDues, monthTotal, categoryTotals, allDues, user } = useV2();
  const sm = summary(), cats = categoryTotals();
  const [quick, setQuick] = useState(null);
  const [drawer, setDrawer] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const tops = topSpaces();
  const maxDaily = Math.max(1, ...DAILY.map((x) => cats[x.cat]?.total || 0));
  const greeting = (() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; })();
  const initial = (user?.name || 'S').trim().charAt(0).toUpperCase() || 'S';
  const remind = (() => { try { return localStorage.getItem('cc_v2_notify') !== '0'; } catch { return true; } })();
  const notif = notifItems(allDues());
  const notifCount = remind ? notif.overdue.length + notif.soon.length : 0;
  return (
    <div className="v2-scroll">
      <header className="px-4 pt-5 pb-3 flex items-center gap-3">
        <button onClick={() => setDrawer(true)} className="w-9 h-9 -ml-1.5 rounded-lg flex items-center justify-center t-hi" aria-label="Menu"><Menu size={22} /></button>
        <Logo size={26} className="shrink-0" />
        <p className="flex-1 text-[13px] t-mid truncate">{greeting}, <span className="t-hi font-semibold">{user?.name || 'Student'}</span> 👋</p>
        <button onClick={() => setNotifOpen(true)} className="relative w-9 h-9 rounded-full flex items-center justify-center t-mid" aria-label="Notifications" style={{ background: 'var(--pill-bg)', border: '.5px solid var(--border)' }}>
          <Bell size={17} />
          {notifCount > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: '#ef4444' }}>{notifCount > 9 ? '9+' : notifCount}</span>}
        </button>
        <button onClick={() => nav('profile')} className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[14px] font-semibold shrink-0" style={{ background: '#22c55e' }} aria-label="Profile">{initial}</button>
      </header>
      <div className="px-4">
        {/* hero (matches v1 DashboardV3) */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: 'var(--hero-bg)', border: '.5px solid var(--hero-border)' }}>
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-[10px] font-medium t-gold">Lifetime</p><p className="text-[22px] font-medium mt-0.5 t-hi t-serif">{fmt(sm.life)}</p></div>
            <div className="text-right"><p className="text-[10px] font-medium t-gold">This month</p><p className="text-[22px] font-medium mt-0.5 t-hi t-serif">{fmt(sm.month)}</p></div>
            <div><p className="text-[10px] t-lo">This year</p><p className="text-sm font-medium t-mid">{fmt(sm.year)}</p></div>
            <div className="text-right"><p className="text-[10px] t-lo">Last month</p><p className="text-sm font-medium t-mid">{fmt(sm.last)}</p></div>
          </div>
        </div>

        {/* daily category tiles */}
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          {DAILY.map(({ cat, emoji, Icon, color }) => {
            const total = cats[cat]?.total || 0, pct = Math.min(100, total / maxDaily * 100);
            return (
              <button key={cat} className="ctile" onClick={() => setQuick({ category: cat, icon: emoji })}>
                <Icon size={18} color={color} />
                <p className="text-[12px] t-mid mt-2">{cat}</p>
                <p className="t-hi font-semibold text-[15px] mt-0.5">{fmt(total)}</p>
                <div className="bar mt-2"><div style={{ height: '100%', width: pct + '%', background: color, borderRadius: 999 }} /></div>
              </button>
            );
          })}
        </div>

        {/* spaces — one big box */}
        <h2 className="text-sm font-semibold t-hi mb-2">Your spaces</h2>
        <div className="overflow-hidden" style={{ minHeight: 320, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1rem', boxShadow: 'var(--card-shadow)' }}>
          {tops.map((s, i) => {
            const mo = monthTotal(spaceDues(s));
            return (
              <button key={s.id} className="w-full text-left px-4 py-3.5 flex items-center gap-3" style={i > 0 ? { borderTop: '.5px solid var(--border)' } : undefined} onClick={() => nav(s.type, { spaceId: s.id })}>
                <span className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0" style={{ background: 'var(--accent-light)' }}>{s.icon}</span>
                <div className="flex-1 min-w-0"><p className="font-semibold t-hi truncate">{s.name}</p><p className="text-[11px] t-mid">{s.system?.type || (s.type === 'personal' ? 'Daily spend & bills' : s.type)}</p></div>
                <div className="text-right mr-1"><p className="text-[10px] t-lo">this month</p><p className="text-sm font-semibold t-hi">{fmt(mo)}</p></div>
                <ChevronRight size={16} className="t-lo" />
              </button>
            );
          })}
          <button className="w-full text-left px-4 py-3.5 flex items-center gap-3" style={{ borderTop: '.5px solid var(--border)' }} onClick={() => nav('create')}>
            <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-light)' }}><Plus size={18} className="t-accent" /></span>
            <span className="text-sm font-medium t-accent">New</span>
          </button>
        </div>
        <div className="h-4" />
      </div>
      {quick && <QuickAddDaily info={quick} onClose={() => setQuick(null)} />}
      {drawer && <Drawer onClose={() => setDrawer(false)} nav={nav} tab={tab} spaces={tops} user={user} />}
      {notifOpen && <NotifSheet onClose={() => setNotifOpen(false)} />}
    </div>
  );
}
function QuickAddDaily({ info, onClose }) {
  const { topSpaces, personalSpace, logDaily } = useV2();
  const [amt, setAmt] = useState('');
  const [sectorId, setSectorId] = useState(null);
  const sectors = topSpaces();
  const onlyPersonal = sectors.length === 1;
  const eff = onlyPersonal ? personalSpace()?.id : sectorId;
  const canSave = +amt > 0 && eff;
  return (
    <div className="v2-backdrop" onClick={onClose}>
      <div className="v2-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'var(--border)' }} />
        <p className="font-semibold t-hi mb-3">{info.icon} Add {info.category}</p>
        <input className="field mb-3" type="number" placeholder="amount (৳)" value={amt} onChange={(e) => setAmt(e.target.value)} autoFocus />
        {!onlyPersonal && (
          <>
            <p className="text-[12px] t-mid mb-2">Where does it belong?</p>
            <div className="grid grid-cols-2 gap-2 mb-4">{sectors.map((s) => (<button key={s.id} className={`chipbtn ${sectorId === s.id ? 'active' : ''}`} onClick={() => setSectorId(s.id)}>{s.icon} {s.name}</button>))}</div>
          </>
        )}
        <button className="btn btn-primary" disabled={!canSave} onClick={() => { logDaily(info.category, info.icon, eff, Math.max(0, +amt)); onClose(); }}>Add {info.category}</button>
      </div>
    </div>
  );
}

/* ---------------- HAMBURGER DRAWER ---------------- */
const SPACE_GROUPS = [
  { types: ['institute'], label: 'Institute' },
  { types: ['residence'], label: 'Residence' },
  { types: ['club'], label: 'Club' },
  { types: ['vehicle'], label: 'Vehicle' },
  { types: ['personal'], label: 'Personal' },
];
function Drawer({ onClose, nav, tab, spaces, user }) {
  const go = (fn) => { onClose(); fn(); };
  const initial = (user?.name || 'S').trim().charAt(0).toUpperCase() || 'S';
  const sections = [
    { v: 'home', label: 'Home', Icon: HomeIcon },
    { v: 'calendar', label: 'Calendar', Icon: CalendarDays },
    { v: 'reports', label: 'Reports', Icon: BarChart3 },
    { v: 'settings', label: 'Settings', Icon: SettingsIcon },
  ];
  return (
    <div className="v2-drawer-backdrop" onClick={onClose}>
      <aside className="v2-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 mb-5 px-1.5"><Logo size={30} /><span className="text-[17px] font-bold t-hi t-serif">ClassCost</span></div>
        <button className="w-full text-left flex items-center gap-3 mb-5 rounded-lg" onClick={() => go(() => nav('profile'))}>
          <span className="w-11 h-11 rounded-full flex items-center justify-center text-white text-lg font-semibold shrink-0" style={{ background: '#22c55e' }}>{initial}</span>
          <div className="min-w-0"><p className="font-semibold t-hi truncate">{user?.name || 'Student'}</p><p className="text-[11px] t-mid truncate">{user?.email || 'View profile'}</p></div>
        </button>
        <p className="text-[10px] uppercase tracking-wide t-lo mb-2 px-1.5">Spaces</p>
        <div className="space-y-0.5 mb-4">
          {spaces.length === 0 && <p className="text-[12px] t-mid px-1.5 py-2">No spaces yet.</p>}
          {SPACE_GROUPS.flatMap((g) => spaces.filter((s) => g.types.includes(s.type)).map((s) => (
            <button key={s.id} className="w-full text-left flex items-center gap-3 px-1.5 py-2 rounded-lg" onClick={() => go(() => nav(s.type, { spaceId: s.id }))}>
              <span className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0" style={{ background: 'var(--accent-light)' }}>{s.icon}</span>
              <div className="flex-1 min-w-0"><p className="text-[13px] font-medium t-hi truncate">{s.name}</p><p className="text-[10px] t-lo">{g.label}</p></div>
            </button>
          )))}
          <button className="w-full text-left flex items-center gap-3 px-1.5 py-2 rounded-lg" onClick={() => go(() => nav('create'))}>
            <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-light)' }}><Plus size={16} className="t-accent" /></span>
            <span className="text-[13px] font-medium t-accent">Create space</span>
          </button>
        </div>
        <p className="text-[10px] uppercase tracking-wide t-lo mb-2 px-1.5">Go to</p>
        <div className="space-y-0.5">
          {sections.map(({ v, label, Icon }) => (
            <button key={v} className="w-full text-left flex items-center gap-3 px-1.5 py-2 rounded-lg t-hi" onClick={() => go(() => tab(v))}>
              <Icon size={18} className="t-mid" /><span className="text-[13px] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}

/* ---------------- CREATE ---------------- */
function Create({ nav, back }) {
  const opt = (Icon, color, t, s, onClick) => (
    <button className="card w-full text-left p-4 flex items-center gap-3" onClick={onClick}><span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + '22' }}><Icon size={22} color={color} strokeWidth={2} /></span><div className="flex-1"><p className="font-semibold t-hi">{t}</p><p className="text-[12px] t-mid">{s}</p></div><ChevronRight size={16} className="t-lo" /></button>
  );
  return (
    <div className="v2-scroll">
      <Header title="Create" crumb="what do you want to add?" onBack={back} />
      <div className="px-4 py-5 space-y-3">
        {opt(GraduationCap, '#6366f1', 'Institute', 'University, school, coaching — auto-detects the system', () => nav('new-institute'))}
        {opt(Building2, '#22c55e', 'Residence', 'Hostel, mess, flat — rent + deposit', () => nav('new-residence'))}
        {opt(Users, '#ec4899', 'Club', 'Membership + event costs', () => nav('new-simple', { stype: 'club' }))}
        {opt(Bike, '#3b82f6', 'Vehicle', 'Motorcycle, cycle — service + parts', () => nav('new-simple', { stype: 'vehicle' }))}
      </div>
    </div>
  );
}
function NewInstitute({ nav, back }) {
  const { createInstitute } = useV2();
  const [name, setName] = useState('');
  const sys = name.trim() ? detectInstitute(name) : null;
  return (
    <div className="v2-scroll">
      <Header title="New institute" crumb="Create › Institute" onBack={back} />
      <div className="px-4 py-5 space-y-5">
        <Field label="Institute name" v={name} onC={setName} ph="e.g. BRAC University" />
        {sys && (
          <div className="card p-4">
            <p className="text-[10px] uppercase tracking-wide t-lo mb-1">Auto-detected system</p>
            <p className="font-semibold t-hi">{sys.type}{sys.semesters ? ` · ${sys.semesters} semesters/year` : sys.monthly ? ' · monthly fee' : ''}</p>
            <p className="text-[12px] t-mid mt-0.5">{sys.note}</p>
            <p className="text-[11px] t-lo mt-2">Fee blocks: {sys.presets.join(' · ')} — try “BRAC”, “Dhaka University”, “Monipur”.</p>
          </div>
        )}
        <button className="btn btn-primary" onClick={() => { const n = name.trim(); if (!n) return; const s = createInstitute(n); nav('institute', { spaceId: s.id }); }}>Create institute</button>
      </div>
    </div>
  );
}
function NewResidence({ nav, back }) {
  const { createResidence } = useV2();
  const [f, setF] = useState({ name: '', rent: '', dep: '', day: '1' });
  const up = (k, v) => setF((p) => ({ ...p, [k]: v }));
  return (
    <div className="v2-scroll">
      <Header title="New residence" crumb="Create › Residence" onBack={back} />
      <div className="px-4 py-5 space-y-5">
        <Field label="Residence name" v={f.name} onC={(v) => up('name', v)} ph="e.g. Sunrise Hostel" />
        <Field label="Monthly rent (৳)" type="number" v={f.rent} onC={(v) => up('rent', v)} ph="8000" />
        <Field label="Security deposit (৳)" type="number" v={f.dep} onC={(v) => up('dep', v)} ph="16000" />
        <Field label="Rent due day" type="number" v={f.day} onC={(v) => up('day', v)} ph="1" />
        <button className="btn btn-primary" onClick={() => { const s = createResidence({ name: f.name.trim() || 'Residence', rent: +f.rent || 0, deposit: +f.dep || 0, day: Math.min(28, Math.max(1, +f.day || 1)) }); nav('residence', { spaceId: s.id }); }}>Create residence</button>
      </div>
    </div>
  );
}
function NewSimple({ nav, back, params }) {
  const { createSimple } = useV2();
  const stype = params.stype || 'club';
  const [name, setName] = useState('');
  return (
    <div className="v2-scroll">
      <Header title={`New ${stype}`} crumb={`Create › ${stype}`} onBack={back} />
      <div className="px-4 py-5 space-y-5">
        <Field label="Name" v={name} onC={setName} ph={stype === 'club' ? 'e.g. BUBEF' : stype === 'vehicle' ? 'e.g. My bikes' : 'Name'} />
        <button className="btn btn-primary" onClick={() => { const s = createSimple(stype, name.trim() || stype); nav(stype, { spaceId: s.id }); }}>Create {stype}</button>
      </div>
    </div>
  );
}

/* ---------------- INSTITUTE + SEMESTER ---------------- */
function Institute({ nav, back, params }) {
  const { spaceById } = useV2();
  const s = spaceById(params.spaceId);
  if (!s) return <Stub title="Not found" emoji="🤔" msg="That space is gone." />;
  const sems = s.blocks.filter((b) => b.kind === 'semester');
  return (
    <div className="v2-scroll">
      <Header title={s.name} crumb="Home › Institutes" onBack={back} />
      <div className="px-4 py-4">
        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between"><span className="text-[10px] uppercase tracking-wide t-lo">System (auto)</span><span className="pill st-partial">{s.system?.type}</span></div>
          <p className="font-semibold t-hi mt-1">{s.system?.note}</p>
          {s.system?.presets && <p className="text-[11px] t-mid mt-1">Fee blocks: {s.system.presets.join(' · ')}</p>}
        </div>
        <div className="flex items-center justify-between mb-2"><h2 className="text-sm font-semibold t-hi">Semesters</h2><button className="text-[12px] font-medium t-accent" onClick={() => nav('create-semester', { spaceId: s.id })}>+ Add semester</button></div>
        {sems.length === 0 ? (
          <div className="card p-5 text-center text-[13px] t-mid">No semesters yet. <button className="font-medium t-accent" onClick={() => nav('create-semester', { spaceId: s.id })}>+ Create one</button></div>
        ) : sems.map((b) => {
          const paid = b.dues.reduce((a, dd) => a + paidOf(dd), 0), cnt = b.dues.filter((dd) => statusOf(dd) === 'paid').length;
          return (
            <button key={b.id} className="card w-full text-left p-4 mb-2.5" onClick={() => nav('semester', { spaceId: s.id, semId: b.id })}>
              <div className="flex items-center justify-between"><p className="font-semibold t-hi">🎓 {b.name}</p><span className="pill st-partial">{b.plan}× installments</span></div>
              <div className="flex items-center justify-between mt-2 text-[12px]"><span className="t-mid">Net {fmt(b.net)}</span><span className="t-mid">{cnt}/{b.dues.length} Dues paid</span></div>
              <div className="bar mt-2" style={{ height: 4 }}><div style={{ height: '100%', width: (b.net > 0 ? Math.min(100, paid / b.net * 100) : 0) + '%', background: '#22c55e', borderRadius: 999 }} /></div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
function CreateSemester({ nav, back, params }) {
  const { addSemester } = useV2();
  const [name, setName] = useState('Summer 2026');
  const [tuition, setTuition] = useState('18000');
  const [labOn, setLabOn] = useState(true);
  const lab = 3500, fixed = 2500;
  const [waiver, setWaiver] = useState(10);
  const [plan, setPlan] = useState(3);
  const sub = (+tuition || 0) + (labOn ? lab : 0) + fixed;
  const net = Math.max(0, sub - sub * waiver / 100);
  const parts = split(net, plan);
  return (
    <div className="v2-scroll">
      <Header title="New semester" crumb="Semester fee" onBack={back} />
      <div className="px-4 py-4 space-y-5">
        <Field label="Semester name" v={name} onC={setName} ph="Summer 2026" />
        <div className="card p-4 space-y-4">
          <p className="text-[10px] uppercase tracking-wide font-semibold t-lo">Fee dials — set for this term</p>
          <Field label="Tuition (৳)" type="number" v={tuition} onC={setTuition} ph="18000" />
          <div className="flex items-center justify-between"><label className="text-[13px] t-mid">Lab fee — ৳{lab.toLocaleString('en-IN')} <span className="text-[11px] t-lo">(if lab courses)</span></label><input type="checkbox" checked={labOn} onChange={(e) => setLabOn(e.target.checked)} className="w-4 h-4" style={{ accentColor: '#6366f1' }} /></div>
          <div className="flex items-center justify-between text-[13px] t-mid"><span>Library · Dev · Exam · Registration</span><span>৳2,500</span></div>
        </div>
        <div><p className="text-[12px] t-mid mb-2">Waiver / scholarship</p><div className="grid grid-cols-4 gap-2">{[0, 10, 25, 50].map((w) => (<button key={w} className={`chipbtn ${w === waiver ? 'active' : ''}`} onClick={() => setWaiver(w)}>{w}%</button>))}</div></div>
        <div className="card p-4">
          <div className="flex justify-between text-[13px] mb-1"><span className="t-mid">Subtotal</span><span className="t-hi">{fmt(sub)}</span></div>
          <div className="flex justify-between text-[13px] mb-1"><span className="t-mid">Waiver ({waiver}%)</span><span style={{ color: '#ef4444' }}>−{fmt(sub * waiver / 100)}</span></div>
          <div className="flex justify-between pt-2" style={{ borderTop: '.5px solid var(--border)' }}><span className="font-semibold t-accent">Net payable</span><span className="text-lg font-bold t-hi">{fmt(net)}</span></div>
        </div>
        <div><p className="text-[12px] t-mid mb-2">Installments — how many Dues</p><div className="grid grid-cols-4 gap-2">{[1, 2, 3, 4].map((n) => (<button key={n} className={`chipbtn ${n === plan ? 'active' : ''}`} onClick={() => setPlan(n)}>{n === 1 ? 'Full' : n + '×'}</button>))}</div>
          <p className="text-[11px] t-lo mt-2">{plan === 1 ? `1 Due of ${fmt(net)}` : `${plan} Dues of ~${fmt(parts[0])}, starting next 1st`}</p></div>
        <button className="btn btn-primary" onClick={() => { const b = addSemester(params.spaceId, { name: name.trim() || 'Semester', tuition: +tuition || 0, labOn, lab, fixed, waiver, plan }); nav('semester', { spaceId: params.spaceId, semId: b.id }); }}>Create semester &amp; print Dues</button>
        <div className="h-2" />
      </div>
    </div>
  );
}
function Semester({ back, params }) {
  const { spaceById, blockById } = useV2();
  const s = spaceById(params.spaceId), b = blockById(params.semId);
  if (!b) return <Stub title="Not found" emoji="🤔" msg="That semester is gone." />;
  const paid = b.dues.reduce((a, dd) => a + paidOf(dd), 0);
  return (
    <div className="v2-scroll">
      <Header title={b.name} crumb={(s?.name || '') + ' › Semester'} onBack={back} />
      <div className="px-4 py-4 space-y-4">
        <div className="card p-4">
          <p className="text-[10px] uppercase tracking-wide t-lo mb-2">Breakdown</p>
          <div className="space-y-1 text-[13px]">
            <Row l="Tuition" v={fmt(b.items.tuition)} />
            {b.items.lab > 0 && <Row l="Lab fee" v={fmt(b.items.lab)} />}
            <Row l="Library · Dev · Exam · Reg" v={fmt(b.items.fixed)} />
            <Row l={`Waiver (${b.waiver}%)`} v={'−' + fmt(b.sub * b.waiver / 100)} danger />
            <div className="flex justify-between pt-1.5 mt-1" style={{ borderTop: '.5px solid var(--border)' }}><span className="font-semibold t-accent">Net</span><span className="font-bold t-hi">{fmt(b.net)}</span></div>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2"><h2 className="text-sm font-semibold t-hi">Dues (installments)</h2><span className="text-[11px] t-mid">Paid {fmt(paid)} / {fmt(b.net)}</span></div>
          <div className="space-y-2">{b.dues.map((dd, i) => (<DueRow key={dd.id} d={dd} label={'Installment ' + (i + 1)} />))}</div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- SPACE DETAIL (Phase 2) ---------------- */
function WeekdayPicker({ days, onToggle }) {
  return (<div className="flex gap-1.5">{WD.map((w, i) => (<button key={i} type="button" onClick={() => onToggle(i)} className={`chipbtn ${days.includes(i) ? 'active' : ''}`} style={{ flex: 1, padding: '.5rem 0' }}>{w}</button>))}</div>);
}
function CategoryBlockCard({ b }) {
  const { logExpense } = useV2();
  const [open, setOpen] = useState(false);
  const [amt, setAmt] = useState('');
  const monthTot = b.dues.filter((dd) => inMonth(parse(dd.date))).reduce((a, dd) => a + dd.amount, 0);
  const recent = b.dues.slice(-4).reverse();
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><span className="text-lg">{b.icon || '🍔'}</span><div><p className="font-semibold t-hi">{b.name}</p><p className="text-[10px] t-lo">{b.schedule ? `Auto ৳${b.schedule.amount}/day · routine` : 'daily spend'}</p></div></div>
        <div className="text-right"><p className="font-semibold t-hi">{fmt(monthTot)}</p><button className="text-[11px] t-accent" onClick={() => setOpen((o) => !o)}>+ log</button></div>
      </div>
      {recent.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{recent.map((dd) => <span key={dd.id} className="pill" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>{fmt(dd.amount)}</span>)}</div>}
      {open && (
        <div className="flex gap-1.5 mt-2">
          <input className="field" type="number" placeholder="amount spent" value={amt} onChange={(e) => setAmt(e.target.value)} autoFocus />
          <button className="minibtn btn-primary" style={{ width: 'auto' }} onClick={() => { const v = Math.max(0, +amt || 0); if (v > 0) logExpense(b.id, v); setAmt(''); setOpen(false); }}>Add</button>
        </div>
      )}
    </div>
  );
}
function BlockCard({ b }) {
  if (b.kind === 'category') return <CategoryBlockCard b={b} />;
  if (b.parked) return (<div className="card p-4 flex items-center justify-between"><div><p className="font-semibold t-hi">{b.icon || '🔒'} {b.name}</p><p className="text-[11px]" style={{ color: '#3b82f6' }}>{fmt(b.amount)} · parked, excluded from spend</p></div><span className="pill st-parked">refundable</span></div>);
  return (
    <div><p className="text-sm font-semibold t-hi mb-1.5">{b.icon || ''} {b.name} <span className="text-[10px] t-lo">· {b.kind}</span></p>
      <div className="space-y-2">{b.dues.map((dd) => (<DueRow key={dd.id} d={dd} />))}</div></div>
  );
}
function SpaceDetail({ nav, back, params }) {
  const { spaceById, spaceDues, monthTotal, childrenOf } = useV2();
  const [sheet, setSheet] = useState(null);
  const s = spaceById(params.spaceId);
  if (!s) return <Stub title="Not found" emoji="🤔" msg="That space is gone." />;
  const kids = childrenOf(s);
  const canHaveAssets = s.type === 'personal' || s.type === 'vehicle';
  const crumb = s.parentId ? (spaceById(s.parentId)?.name || 'Home') : 'Home';
  return (
    <div className="v2-scroll">
      <Header title={`${s.icon || ''} ${s.name}`} crumb={crumb} onBack={back} />
      <div className="px-4 py-4 space-y-3">
        <div className="card px-4 py-3"><p className="text-[10px] uppercase tracking-wide t-lo">This month</p><p className="text-2xl font-bold t-accent">{fmt(monthTotal(spaceDues(s)))}</p></div>
        {s.type === 'residence' && s.system && (
          <div className="card p-4"><p className="text-[10px] uppercase tracking-wide t-lo mb-1">Profile</p>
            <div className="flex justify-between text-[13px]"><span className="t-mid">Rent</span><span className="t-hi">{fmt(s.system.rent)}/mo · due {s.system.day}</span></div>
            <div className="flex justify-between text-[13px]"><span className="t-mid">Deposit</span><span className="t-hi">{fmt(s.system.deposit)} · offsets final rent</span></div></div>
        )}
        {s.blocks.map((b) => <BlockCard key={b.id} b={b} />)}
        {canHaveAssets && kids.map((k) => (
          <button key={k.id} className="card w-full text-left p-4 flex items-center gap-3" onClick={() => nav('asset', { spaceId: k.id })}>
            <span className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0" style={{ background: 'var(--accent-light)' }}>{k.icon}</span>
            <div className="flex-1 min-w-0"><p className="font-semibold t-hi truncate">{k.name}</p><p className="text-[11px] t-mid">{k.blocks.length} cost block{k.blocks.length !== 1 ? 's' : ''}</p></div>
            <p className="text-sm font-semibold t-hi mr-1">{fmt(monthTotal(spaceDues(k)))}</p><ChevronRight size={16} className="t-lo" />
          </button>
        ))}
        {s.blocks.length === 0 && kids.length === 0 && <div className="card p-6 text-center text-[13px] t-mid">Nothing here yet — add a cost block{canHaveAssets ? ' or an asset' : ''} below.</div>}
        <button className="btn btn-ghost" onClick={() => setSheet('cost')}>+ Add cost block</button>
        {canHaveAssets && <button className="btn btn-ghost" onClick={() => setSheet('asset')}>+ Add {s.type === 'vehicle' ? 'vehicle' : 'asset'}</button>}
        <div className="h-4" />
      </div>
      {sheet === 'cost' && <AddCostSheet spaceId={s.id} onClose={() => setSheet(null)} />}
      {sheet === 'asset' && <AddAssetSheet parentId={s.id} vtype={s.type} onClose={() => setSheet(null)} onCreated={(a) => nav('asset', { spaceId: a.id })} />}
    </div>
  );
}
function AddCostSheet({ spaceId, onClose }) {
  const { addCategory, addRecurring, addOneTime, addScheduledCategory } = useV2();
  const [mode, setMode] = useState(null);
  const [dName, setDName] = useState('Food');
  const [auto, setAuto] = useState(false);
  const [dAmt, setDAmt] = useState('');
  const [days, setDays] = useState([0, 1, 2, 3, 4]);
  const [bName, setBName] = useState(''); const [bAmt, setBAmt] = useState(''); const [bDay, setBDay] = useState('1');
  const [oName, setOName] = useState(''); const [oAmt, setOAmt] = useState('');
  const toggleDay = (i) => setDays((p) => p.includes(i) ? p.filter((x) => x !== i) : [...p, i]);
  const tmpl = (Icon, color, t, sub, m) => (<button className="card w-full text-left p-3.5 flex items-center gap-3" onClick={() => setMode(m)}><span className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + '22' }}><Icon size={20} color={color} /></span><div><p className="font-semibold t-hi text-[14px]">{t}</p><p className="text-[11px] t-mid">{sub}</p></div></button>);
  return (
    <div className="v2-backdrop" onClick={onClose}>
      <div className="v2-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'var(--border)' }} />
        {!mode ? (
          <><p className="font-semibold t-hi mb-3">Add a cost block</p><div className="space-y-2.5">
            {tmpl(Utensils, '#f59e0b', 'Daily spend', 'Food, transport — log or auto-fill', 'daily')}
            {tmpl(Repeat, '#6366f1', 'Recurring bill', 'Electricity, wifi, data — monthly', 'bill')}
            {tmpl(Package, '#22c55e', 'One-time', 'Admission, event, a repair', 'onetime')}
          </div></>
        ) : mode === 'daily' ? (
          <><p className="font-semibold t-hi mb-3">🍔 Daily spend</p>
            <div className="grid grid-cols-3 gap-2 mb-3">{['Food', 'Transport', 'Snacks', 'Books', 'Health', 'Other'].map((n) => (<button key={n} className={`chipbtn ${dName === n ? 'active' : ''}`} onClick={() => setDName(n)}>{n}</button>))}</div>
            <div className="flex items-center justify-between mb-3"><label className="text-[13px] t-mid">Auto-fill (routine)</label><input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="w-4 h-4" style={{ accentColor: '#6366f1' }} /></div>
            {auto && (<><input className="field mb-2" type="number" placeholder="amount per day (৳)" value={dAmt} onChange={(e) => setDAmt(e.target.value)} /><p className="text-[12px] t-mid mb-1.5">On these days</p><div className="mb-3"><WeekdayPicker days={days} onToggle={toggleDay} /></div></>)}
            <button className="btn btn-primary" onClick={() => { if (auto) addScheduledCategory(spaceId, dName, '🍔', Math.max(0, +dAmt || 0), days); else addCategory(spaceId, dName, '🍔'); onClose(); }}>{auto ? 'Add & auto-fill' : 'Add category'}</button></>
        ) : mode === 'bill' ? (
          <><p className="font-semibold t-hi mb-3">🔁 Recurring bill</p>
            <input className="field mb-2" placeholder="name (e.g. Electricity)" value={bName} onChange={(e) => setBName(e.target.value)} autoFocus />
            <input className="field mb-2" type="number" placeholder="amount / month" value={bAmt} onChange={(e) => setBAmt(e.target.value)} />
            <input className="field mb-3" type="number" placeholder="due day (1–28)" value={bDay} onChange={(e) => setBDay(e.target.value)} />
            <button className="btn btn-primary" onClick={() => { addRecurring(spaceId, bName.trim() || 'Bill', Math.max(0, +bAmt || 0), Math.min(28, Math.max(1, +bDay || 1))); onClose(); }}>Add bill</button></>
        ) : (
          <><p className="font-semibold t-hi mb-3">📦 One-time cost</p>
            <input className="field mb-2" placeholder="name (e.g. Admission)" value={oName} onChange={(e) => setOName(e.target.value)} autoFocus />
            <input className="field mb-3" type="number" placeholder="amount" value={oAmt} onChange={(e) => setOAmt(e.target.value)} />
            <button className="btn btn-primary" onClick={() => { addOneTime(spaceId, oName.trim() || 'Cost', Math.max(0, +oAmt || 0)); onClose(); }}>Add one-time</button></>
        )}
      </div>
    </div>
  );
}
function AddAssetSheet({ parentId, vtype, onClose, onCreated }) {
  const { createAsset } = useV2();
  const icons = vtype === 'vehicle' ? [['🏍️', 'Motorcycle'], ['🚲', 'Cycle'], ['🚗', 'Car'], ['🛵', 'Scooter']] : [['🏍️', 'Motorcycle'], ['🚲', 'Cycle'], ['💻', 'Laptop'], ['📱', 'Phone']];
  const [icon, setIcon] = useState(icons[0][0]);
  const [name, setName] = useState(icons[0][1]);
  return (
    <div className="v2-backdrop" onClick={onClose}>
      <div className="v2-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'var(--border)' }} />
        <p className="font-semibold t-hi mb-3">Add {vtype === 'vehicle' ? 'a vehicle' : 'an asset'}</p>
        <div className="grid grid-cols-4 gap-2 mb-3">{icons.map(([ic, nm]) => (<button key={ic} className={`chipbtn ${icon === ic ? 'active' : ''}`} onClick={() => { setIcon(ic); setName(nm); }}><div style={{ fontSize: '1.3rem' }}>{ic}</div><div className="text-[9px] mt-0.5">{nm}</div></button>))}</div>
        <input className="field mb-3" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn btn-primary" onClick={() => { const a = createAsset(parentId, name.trim() || 'Asset', icon); onClose(); if (onCreated) onCreated(a); }}>Create</button>
      </div>
    </div>
  );
}

/* ---------------- CALENDAR ---------------- */
function CalendarScreen() {
  const { allDues } = useV2();
  const t = today();
  const [cal, setCal] = useState({ y: t.getFullYear(), m: t.getMonth() });
  const [sel, setSel] = useState(iso(t));
  const { y, m } = cal;
  const first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
  const md = allDues().filter((dd) => { const x = parse(dd.date); return x.getFullYear() === y && x.getMonth() === m; });
  const byDay = {};
  md.forEach((dd) => { const k = parse(dd.date).getDate(); (byDay[k] = byDay[k] || []).push(dd); });
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(<div key={'e' + i} />);
  for (let day = 1; day <= days; day++) {
    const list = byDay[day] || [], isT = (y === t.getFullYear() && m === t.getMonth() && day === t.getDate()), selA = sel === iso(new Date(y, m, day));
    const spend = list.filter((dd) => !dd.parked);
    let dc = '#6366f1'; if (spend.some((dd) => statusOf(dd) === 'overdue')) dc = '#ef4444'; else if (spend.length && spend.every((dd) => statusOf(dd) === 'paid')) dc = '#22c55e';
    cells.push(<div key={day} className={`v2-cell ${list.length ? 'has' : ''} ${isT ? 'today' : ''} ${selA ? 'sel' : ''}`} onClick={() => setSel(iso(new Date(y, m, day)))}><span className={list.length ? 't-hi font-medium' : 't-lo'}>{day}</span>{list.length > 0 && <span className="v2-dot" style={{ background: dc }} />}</div>);
  }
  const selD = sel ? parse(sel) : null;
  const selList = selD && selD.getFullYear() === y && selD.getMonth() === m ? (byDay[selD.getDate()] || []) : [];
  const selTotal = selList.filter((dd) => !dd.parked).reduce((a, dd) => a + dd.amount, 0);
  const prev = () => { let { y, m } = cal; m--; if (m < 0) { m = 11; y--; } setCal({ y, m }); };
  const next = () => { let { y, m } = cal; m++; if (m > 11) { m = 0; y++; } setCal({ y, m }); };
  return (
    <div className="v2-scroll">
      <header className="px-4 pt-6 pb-2"><h1 className="text-2xl font-bold t-hi">Calendar</h1><p className="text-[11px] t-mid">Every Due, pinned on its date</p></header>
      <div className="px-4">
        <div className="flex items-center justify-between mb-3"><button className="minibtn btn-ghost" onClick={prev}>‹</button><p className="font-semibold t-hi">{MN[m]} {y}</p><button className="minibtn btn-ghost" onClick={next}>›</button></div>
        <div className="grid grid-cols-7 gap-1 mb-1 text-center text-[10px] t-lo">{WD.map((w, i) => (<div key={i}>{w}</div>))}</div>
        <div className="grid grid-cols-7 gap-1">{cells}</div>
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2"><h2 className="text-sm font-semibold t-hi">{selD ? selD.getDate() + ' ' + MNS[selD.getMonth()] : 'Pick a day'}</h2>{selList.length > 0 && <span className="text-[12px] t-mid">due {fmt(selTotal)}</span>}</div>
          {selList.length > 0 ? <div className="space-y-2">{selList.map((dd) => (<DueRow key={dd.id} d={dd} label={(dd.space ? dd.space.name + ' · ' : '') + dd.label} />))}</div>
            : <div className="card p-6 text-center text-[13px] t-mid">{md.length ? 'Nothing due this day.' : 'No Dues this month yet — create a semester or residence.'}</div>}
        </div>
        <div className="h-4" />
      </div>
    </div>
  );
}

/* ---------------- REPORTS ---------------- */
const CAT_COLORS = { Food: '#f97316', Transport: '#3b82f6', Snacks: '#f59e0b', Books: '#8b5cf6', Health: '#22c55e', Rent: '#22c55e', Others: '#64748b', Other: '#64748b' };
const PALETTE = ['#6366f1', '#22c55e', '#f97316', '#3b82f6', '#ec4899', '#eab308', '#06b6d4', '#64748b'];
const catColor = (name, i) => CAT_COLORS[name] || PALETTE[i % PALETTE.length];
function ReportsScreen() {
  const { summary, categoryTotals, topSpaces, spaceDues, monthTotal, allDues } = useV2();
  const sm = summary(), cats = categoryTotals();
  const catData = Object.entries(cats).map(([name, v], i) => ({ name, value: v.total, color: catColor(name, i) })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value);
  const spaceData = topSpaces().map((s) => ({ name: s.name, value: monthTotal(spaceDues(s)) })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value);
  const spaceMax = Math.max(1, ...spaceData.map((x) => x.value));
  const catTotal = catData.reduce((a, x) => a + x.value, 0);
  const t = today(), months = [];
  for (let i = 5; i >= 0; i--) { const dt = new Date(t.getFullYear(), t.getMonth() - i, 1); months.push({ y: dt.getFullYear(), m: dt.getMonth() }); }
  const duesNP = allDues().filter((x) => !x.parked);
  const trend = months.map((mo) => ({ name: MNS[mo.m], total: duesNP.filter((x) => { const p = parse(x.date); return p.getFullYear() === mo.y && p.getMonth() === mo.m; }).reduce((a, x) => a + (x.amount || 0), 0) }));
  return (
    <div className="v2-scroll">
      <Header title="Reports" />
      <div className="px-4 py-4 space-y-5">
        <div className="grid grid-cols-3 gap-2.5">
          {[['This month', sm.month], ['This year', sm.year], ['Lifetime', sm.life]].map(([l, v]) => (
            <div key={l} className="card p-3"><p className="text-[10px] t-lo">{l}</p><p className="text-[15px] font-bold t-hi mt-0.5">{fmt(v)}</p></div>
          ))}
        </div>
        {sm.life <= 0 ? (
          <div className="card p-8 text-center"><div className="text-4xl mb-2">📊</div><p className="text-[13px] t-mid">No spending yet. Log a few costs and your reports fill in here.</p></div>
        ) : (
          <>
            <div className="card p-4">
              <p className="text-[10px] uppercase tracking-wide t-lo mb-3">Last 6 months</p>
              <div style={{ width: '100%', height: 160 }}>
                <ResponsiveContainer>
                  <BarChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text2)' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'var(--pill-bg)' }} contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text1)' }} formatter={(v) => [fmt(v), 'Spent']} labelStyle={{ color: 'var(--text2)' }} />
                    <Bar dataKey="total" radius={[5, 5, 0, 0]} fill="var(--accent)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            {catData.length > 0 && (
              <div className="card p-4">
                <p className="text-[10px] uppercase tracking-wide t-lo mb-2">By category · this month</p>
                <div className="flex items-center gap-4">
                  <div style={{ width: 120, height: 120, position: 'relative' }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={catData} dataKey="value" nameKey="name" innerRadius={38} outerRadius={56} paddingAngle={2} stroke="none">
                          {catData.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"><span className="text-[9px] t-lo">total</span><span className="text-[12px] font-bold t-hi">{fmt(catTotal)}</span></div>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {catData.slice(0, 5).map((e, i) => (
                      <div key={i} className="flex items-center gap-2 text-[12px]">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: e.color }} />
                        <span className="t-mid flex-1 truncate">{e.name}</span>
                        <span className="t-hi font-medium">{fmt(e.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {spaceData.length > 0 && (
              <div className="card p-4">
                <p className="text-[10px] uppercase tracking-wide t-lo mb-3">By space · this month</p>
                <div className="space-y-2.5">
                  {spaceData.map((s, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-[12px] mb-1"><span className="t-mid">{s.name}</span><span className="t-hi font-medium">{fmt(s.value)}</span></div>
                      <div className="bar" style={{ height: 6 }}><div style={{ height: '100%', width: (s.value / spaceMax * 100) + '%', background: PALETTE[i % PALETTE.length], borderRadius: 999 }} /></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        <div className="h-4" />
      </div>
    </div>
  );
}

/* ---------------- NOTIFICATIONS ---------------- */
function notifItems(dues) {
  const t = today(), horizon = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 7);
  const overdue = [], soon = [];
  dues.filter((d) => !d.parked).forEach((d) => { const st = statusOf(d); if (st === 'paid') return; const dd = parse(d.date); if (st === 'overdue') overdue.push(d); else if (dd <= horizon) soon.push(d); });
  const byDate = (a, b) => parse(a.date) - parse(b.date);
  return { overdue: overdue.sort(byDate), soon: soon.sort(byDate) };
}
function NotifSheet({ onClose }) {
  const { allDues, payDue } = useV2();
  const { overdue, soon } = notifItems(allDues());
  const none = !overdue.length && !soon.length;
  const Item = ({ d, tone }) => {
    const dd = parse(d.date);
    return (
      <div className="flex items-center gap-2.5 py-2.5" style={{ borderTop: '.5px solid var(--border)' }}>
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: tone }} />
        <div className="min-w-0 flex-1"><p className="text-[13px] t-hi truncate">{d.label}</p><p className="text-[11px] t-mid">{d.space?.name ? d.space.name + ' · ' : ''}{dd.getDate()} {MNS[dd.getMonth()]} · {fmt(d.amount)}</p></div>
        <button className="minibtn st-paid" onClick={() => payDue(d.id)}>Paid</button>
      </div>
    );
  };
  return (
    <div className="v2-backdrop" onClick={onClose}>
      <div className="v2-sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div className="flex items-center gap-2 mb-1"><Bell size={18} className="t-mid" /><p className="font-semibold t-hi">Notifications</p><button className="ml-auto text-[13px] t-mid" onClick={onClose}>Close</button></div>
        <div className="flex-1 overflow-y-auto">
          {none ? (
            <div className="py-10 text-center"><div className="text-3xl mb-2">🎉</div><p className="text-[13px] t-mid">You're all caught up.</p></div>
          ) : (
            <>
              {overdue.length > 0 && (<><p className="text-[10px] uppercase tracking-wide mt-2 mb-0.5" style={{ color: '#ef4444' }}>Overdue · {overdue.length}</p>{overdue.map((d) => <Item key={d.id} d={d} tone="#ef4444" />)}</>)}
              {soon.length > 0 && (<><p className="text-[10px] uppercase tracking-wide mt-3 mb-0.5" style={{ color: '#f59e0b' }}>Due soon · {soon.length}</p>{soon.map((d) => <Item key={d.id} d={d} tone="#f59e0b" />)}</>)}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- FEED (Phase 4) ---------------- */
const FEED_KEY = 'cc_v2_feed_id';
const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  return Math.floor(s / 86400) + 'd';
};
function FeedScreen() {
  const { user } = useV2();
  const [handle, setHandle] = useState(() => { try { return localStorage.getItem(FEED_KEY) || ''; } catch { return ''; } });
  const [pane, setPane] = useState(1); // 0 profile · 1 feed · 2 compose
  const [reloadKey, setReloadKey] = useState(0);
  const [commentsFor, setCommentsFor] = useState(null);
  const [viewHandle, setViewHandle] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const startX = useRef(0);
  useEffect(() => { // pull the server handle (covers other-device claims); silent if offline
    let on = true;
    getMyFeedProfile().then((r) => { if (on && r?.profile?.handle) { const hh = '@' + r.profile.handle; setHandle(hh); try { localStorage.setItem(FEED_KEY, hh); } catch { /* ignore */ } } }).catch(() => {});
    return () => { on = false; };
  }, []);
  if (!handle) return <FeedOnboard onDone={(h) => { try { localStorage.setItem(FEED_KEY, h); } catch { /* ignore */ } setHandle(h); }} />;
  const myHandle = handle.replace('@', '');
  const initial = (user?.name || myHandle || 'S').trim().charAt(0).toUpperCase();
  const go = (p) => setPane(Math.max(0, Math.min(2, p)));
  const onComment = (p) => setCommentsFor(p);
  const onAuthor = (h) => setViewHandle(h);
  return (
    <div className="v2-scroll" style={{ overflowX: 'hidden' }}>
      <header className="px-4 pt-5 pb-3 flex items-center gap-2.5">
        <button onClick={() => go(0)} className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[14px] font-semibold shrink-0" style={{ background: '#22c55e' }} aria-label="Your profile">{initial}</button>
        <button onClick={() => go(1)} className="flex-1 flex items-center justify-center gap-2"><Logo size={22} /><span className="font-bold t-hi">Feed</span></button>
        <button onClick={() => go(2)} className="w-9 h-9 rounded-full flex items-center justify-center t-mid shrink-0" style={{ background: 'var(--pill-bg)', border: '.5px solid var(--border)' }} aria-label="New post"><PenSquare size={17} /></button>
        <button onClick={() => setSearchOpen(true)} className="w-9 h-9 rounded-full flex items-center justify-center t-mid shrink-0" style={{ background: 'var(--pill-bg)', border: '.5px solid var(--border)' }} aria-label="Search people"><Search size={17} /></button>
      </header>
      <div onPointerDown={(e) => { startX.current = e.clientX; }} onPointerUp={(e) => { const dx = e.clientX - startX.current; if (dx < -55 && pane < 2) go(pane + 1); else if (dx > 55 && pane > 0) go(pane - 1); }} style={{ overflow: 'hidden' }}>
        <motion.div className="flex" style={{ width: '300%' }} animate={{ x: `-${pane * (100 / 3)}%` }} transition={{ type: 'spring', stiffness: 320, damping: 34 }}>
          <div style={{ width: '33.3333%' }} className="px-2"><FeedProfileView handle={myHandle} embedded onComment={onComment} onAuthor={onAuthor} /></div>
          <div style={{ width: '33.3333%' }} className="px-4"><FeedListPane reloadKey={reloadKey} onCompose={() => go(2)} onComment={onComment} onAuthor={onAuthor} /></div>
          <div style={{ width: '33.3333%' }} className="px-4"><FeedComposePane handle={handle} onPosted={() => { setReloadKey((k) => k + 1); go(1); }} /></div>
        </motion.div>
      </div>
      <div className="flex justify-center gap-1.5 mt-4">{['Profile', 'Feed', 'Post'].map((l, i) => (<button key={i} onClick={() => go(i)} className="rounded-full" style={{ width: pane === i ? 18 : 6, height: 6, background: pane === i ? 'var(--accent)' : 'var(--border)', transition: 'all .2s' }} aria-label={l} />))}</div>
      {searchOpen && <FeedSearch onClose={() => setSearchOpen(false)} onOpen={(h) => { setSearchOpen(false); setViewHandle(h); }} />}
      {commentsFor && <FeedComments post={commentsFor} onClose={() => setCommentsFor(null)} onAuthor={(h) => { setCommentsFor(null); setViewHandle(h); }} />}
      {viewHandle && <FeedProfileView handle={viewHandle} onClose={() => setViewHandle(null)} onComment={onComment} onAuthor={(h) => setViewHandle(h)} />}
    </div>
  );
}
function FeedOnboard({ onDone }) {
  const [h, setH] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const clean = h.trim().replace(/^@/, '').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
  const claim = async () => {
    if (clean.length < 3 || busy) return;
    setBusy(true); setErr('');
    try { const r = await claimHandle(clean); onDone('@' + (r?.profile?.handle || clean)); }
    catch (x) {
      const msg = x.message || 'Could not claim that handle.';
      if (import.meta.env.DEV && !/taken|3-20|a-z/i.test(msg)) onDone('@' + clean); // offline dev preview
      else setErr(msg);
    } finally { setBusy(false); }
  };
  return (
    <div className="v2-scroll flex flex-col items-center justify-center px-6" style={{ minHeight: '70vh' }}>
      <Logo size={48} />
      <h1 className="text-lg font-bold t-hi mt-4">Join the ClassCost feed</h1>
      <p className="text-[13px] t-mid mb-5 mt-1 text-center max-w-[280px]">Pick a handle other students will find you by. You can change it later.</p>
      <div className="w-full max-w-[320px] space-y-3">
        <div className="field flex items-center" style={{ gap: 4 }}><span className="t-mid">@</span><input className="flex-1 bg-transparent outline-none t-hi" placeholder="yourname" value={h} onChange={(e) => setH(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') claim(); }} autoFocus /></div>
        {clean && <p className="text-[12px] t-lo">Your handle: <span className="t-accent font-medium">@{clean}</span></p>}
        <button className="btn btn-primary" disabled={clean.length < 3 || busy} onClick={claim}>{busy ? 'Claiming…' : `Claim @${clean || 'handle'}`}</button>
        {err && <p className="text-[12px] text-center" style={{ color: '#ef4444' }}>{err}</p>}
      </div>
    </div>
  );
}
function FeedProfileView({ handle, onClose, embedded, onComment, onAuthor }) {
  const h = (handle || '').replace('@', '');
  const [prof, setProf] = useState(null);
  const [posts, setPosts] = useState(null);
  const [err, setErr] = useState('');
  const [following, setFollowing] = useState(false);
  const [fBusy, setFBusy] = useState(false);
  useEffect(() => {
    let on = true; setErr(''); setProf(null); setPosts(null);
    getFeedProfile(h).then((r) => { if (on) { setProf(r); setFollowing(!!r.isFollowing); } }).catch((x) => { if (on) setErr(x.message || 'offline'); });
    getUserPosts(h).then((r) => { if (on) setPosts(r?.posts || []); }).catch(() => { if (on) setPosts([]); });
    return () => { on = false; };
  }, [h]);
  const toggleFollow = async () => {
    if (fBusy) return; setFBusy(true); const next = !following; setFollowing(next);
    try { next ? await followUser(h) : await unfollowUser(h); } catch { setFollowing(!next); } finally { setFBusy(false); }
  };
  const initial = ((prof?.displayName || h || 'S').charAt(0) || 'S').toUpperCase();
  const body = (
    <div className="py-3">
      <div className="flex flex-col items-center text-center mb-4 px-2">
        <span className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-3" style={{ background: '#22c55e' }}>{initial}</span>
        <p className="text-lg font-bold t-hi">{prof?.displayName || ('@' + h)}</p>
        <p className="text-[13px] t-accent">@{h}</p>
        {prof?.bio && <p className="text-[12px] t-mid mt-1 max-w-[260px]">{prof.bio}</p>}
        <div className="flex gap-7 mt-3">
          {[[prof?.counts?.posts, 'posts'], [prof?.counts?.followers, 'followers'], [prof?.counts?.following, 'following']].map(([n, l]) => (<div key={l} className="text-center"><p className="font-bold t-hi">{n ?? '—'}</p><p className="text-[11px] t-mid">{l}</p></div>))}
        </div>
        {prof && !prof.isMe && <button className={`btn ${following ? 'btn-ghost' : 'btn-primary'} mt-4`} style={{ maxWidth: 200 }} onClick={toggleFollow}>{following ? 'Following' : 'Follow'}</button>}
      </div>
      <div className="px-2 space-y-3">
        {err && <div className="card p-6 text-center text-[13px] t-mid">Couldn't load this profile{import.meta.env.DEV ? ' — no backend in local dev.' : '.'}</div>}
        {!err && posts && posts.length === 0 && <div className="card p-6 text-center text-[13px] t-mid">No posts yet.</div>}
        {posts && posts.map((p) => <FeedPostCard key={p.id} p={p} onComment={onComment} onAuthor={onAuthor} />)}
      </div>
      <div className="h-4" />
    </div>
  );
  if (embedded) return body;
  return (
    <div className="fixed z-[45] overflow-y-auto" style={{ inset: 0, background: 'var(--bg)' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100%' }}>
        <Header title={'@' + h} onBack={onClose} />
        {body}
      </div>
    </div>
  );
}
function FeedComments({ post, onClose, onAuthor }) {
  const [st, setSt] = useState({ loading: true, list: [] });
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let on = true;
    getComments(post.id).then((r) => { if (on) setSt({ loading: false, list: r?.comments || [] }); }).catch(() => { if (on) setSt({ loading: false, list: [] }); });
    return () => { on = false; };
  }, [post.id]);
  const send = async () => {
    const t = text.trim(); if (!t || busy) return; setBusy(true);
    try { const r = await addComment(post.id, t); setSt((s) => ({ ...s, list: [...s.list, r.comment] })); setText(''); }
    catch (x) { window.alert(x.message || 'Could not comment'); } finally { setBusy(false); }
  };
  return (
    <div className="v2-backdrop" onClick={onClose}>
      <div className="v2-sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div className="flex items-center gap-2 mb-1"><p className="font-semibold t-hi">Comments</p><button className="ml-auto text-[13px] t-mid" onClick={onClose}>Close</button></div>
        <div className="flex-1 overflow-y-auto space-y-3 py-2" style={{ minHeight: 120 }}>
          {st.loading ? <p className="text-[13px] t-mid text-center py-6">Loading…</p>
            : st.list.length === 0 ? <p className="text-[13px] t-mid text-center py-6">No comments yet — say something.</p>
              : st.list.map((c) => (
                <div key={c.id} className="flex gap-2.5">
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-semibold shrink-0" style={{ background: '#22c55e' }}>{(c.displayName || c.handle || 'S').charAt(0).toUpperCase()}</span>
                  <div className="min-w-0"><p className="text-[12px]"><button className="font-semibold t-hi" onClick={() => onAuthor && c.handle && onAuthor(c.handle)}>@{c.handle}</button> <span className="t-lo">· {timeAgo(c.createdAt)}</span></p><p className="text-[13px] t-hi" style={{ whiteSpace: 'pre-wrap' }}>{c.text}</p></div>
                </div>
              ))}
        </div>
        <div className="flex gap-2 pt-2"><input className="field" placeholder="Add a comment…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }} autoFocus /><button className="minibtn btn-primary" style={{ width: 'auto', padding: '.65rem 1rem' }} disabled={!text.trim() || busy} onClick={send}>Send</button></div>
      </div>
    </div>
  );
}
function FeedSearch({ onClose, onOpen }) {
  const [q, setQ] = useState('');
  const [st, setSt] = useState({ loading: false, users: [] });
  useEffect(() => {
    const t = q.trim(); if (!t) { setSt({ loading: false, users: [] }); return; }
    setSt((s) => ({ ...s, loading: true }));
    let on = true;
    const id = setTimeout(() => { searchUsers(t).then((r) => { if (on) setSt({ loading: false, users: r?.users || [] }); }).catch(() => { if (on) setSt({ loading: false, users: [] }); }); }, 300);
    return () => { on = false; clearTimeout(id); };
  }, [q]);
  return (
    <div className="v2-backdrop" onClick={onClose}>
      <div className="v2-sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div className="flex items-center gap-2 mb-3"><Search size={18} className="t-mid shrink-0" /><input className="field" placeholder="Search @handles…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus /><button className="text-[13px] t-mid shrink-0" onClick={onClose}>Close</button></div>
        <div className="flex-1 overflow-y-auto" style={{ minHeight: 120 }}>
          {st.loading ? <p className="text-[13px] t-mid text-center py-6">Searching…</p>
            : !q.trim() ? <p className="text-[13px] t-lo text-center py-6">Find students by their @handle.</p>
              : st.users.length === 0 ? <p className="text-[13px] t-mid text-center py-6">No one found.</p>
                : st.users.map((u) => <FeedUserRow key={u.handle} u={u} onOpen={onOpen} />)}
        </div>
      </div>
    </div>
  );
}
function FeedUserRow({ u, onOpen }) {
  const [following, setFollowing] = useState(!!u.isFollowing);
  const [busy, setBusy] = useState(false);
  const toggle = async (e) => {
    e.stopPropagation(); if (busy) return; setBusy(true);
    const next = !following; setFollowing(next);
    try { next ? await followUser(u.handle) : await unfollowUser(u.handle); } catch { setFollowing(!next); } finally { setBusy(false); }
  };
  return (
    <button className="w-full flex items-center gap-3 p-2 rounded-lg text-left" onClick={() => onOpen(u.handle)}>
      <span className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-semibold shrink-0" style={{ background: '#22c55e' }}>{(u.displayName || u.handle).charAt(0).toUpperCase()}</span>
      <div className="flex-1 min-w-0"><p className="text-[13px] font-semibold t-hi truncate">{u.displayName || ('@' + u.handle)}</p><p className="text-[11px] t-lo">@{u.handle}</p></div>
      {!u.isMe && <span className={`minibtn ${following ? 'btn-ghost' : 'btn-primary'}`} style={{ width: 'auto', padding: '.4rem .8rem' }} onClick={toggle}>{following ? 'Following' : 'Follow'}</span>}
    </button>
  );
}
function FeedPostCard({ p, onComment, onAuthor }) {
  const [liked, setLiked] = useState(!!p.likedByMe);
  const [likes, setLikes] = useState(p.likes || 0);
  const [busy, setBusy] = useState(false);
  const initial = (p.displayName || p.handle || 'S').trim().charAt(0).toUpperCase();
  const toggleLike = async () => {
    if (busy) return; setBusy(true);
    const next = !liked; setLiked(next); setLikes((n) => Math.max(0, n + (next ? 1 : -1)));
    try { const r = next ? await likePost(p.id) : await unlikePost(p.id); if (typeof r?.likes === 'number') setLikes(r.likes); }
    catch { setLiked(!next); setLikes((n) => Math.max(0, n + (next ? -1 : 1))); }
    finally { setBusy(false); }
  };
  const share = async () => {
    const txt = `${p.displayName || ('@' + p.handle)} on ClassCost:\n${p.text || ''}`;
    try { if (navigator.share) await navigator.share({ text: txt }); else { await navigator.clipboard.writeText(txt); window.alert('Copied to clipboard'); } } catch { /* cancelled */ }
  };
  const report = async () => {
    const reason = window.prompt('Report this post — reason (optional):');
    if (reason === null) return;
    try { await reportContent('post', p.id, reason || ''); window.alert("Thanks — we'll review it."); } catch { window.alert('Could not report right now.'); }
  };
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-2.5">
        <button className="flex items-center gap-2.5 flex-1 min-w-0 text-left" onClick={() => onAuthor && onAuthor(p.handle)}>
          <span className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-semibold shrink-0" style={{ background: '#22c55e' }}>{initial}</span>
          <div className="min-w-0 flex-1"><p className="text-[13px] font-semibold t-hi truncate">{p.displayName || ('@' + p.handle)}</p><p className="text-[11px] t-lo">@{p.handle} · {timeAgo(p.createdAt)}</p></div>
        </button>
        <button className="t-lo shrink-0 p-1" onClick={report} aria-label="Report post"><Flag size={15} /></button>
      </div>
      {p.text && <p className="text-[14px] t-hi mb-2" style={{ whiteSpace: 'pre-wrap' }}>{p.text}</p>}
      {p.imageUrl && <img src={p.imageUrl} alt="" className="rounded-xl w-full mb-2" />}
      <div className="flex gap-5 mt-1 text-[12px]">
        <button className="flex items-center gap-1.5" onClick={toggleLike} style={{ color: liked ? '#ef4444' : 'var(--text2)' }}><Heart size={16} style={liked ? { fill: '#ef4444' } : undefined} />{likes}</button>
        <button className="flex items-center gap-1.5 t-mid" onClick={() => onComment && onComment(p)}><MessageCircle size={16} />{p.comments || 0}</button>
        <button className="flex items-center gap-1.5 t-mid" onClick={share}><Share2 size={16} /></button>
      </div>
    </div>
  );
}
function FeedListPane({ reloadKey, onCompose, onComment, onAuthor }) {
  const [st, setSt] = useState({ loading: true, posts: [], error: '' });
  useEffect(() => {
    let on = true;
    setSt((s) => ({ ...s, loading: true, error: '' }));
    listFeedPosts().then((r) => { if (on) setSt({ loading: false, posts: r?.posts || [], error: '' }); })
      .catch((x) => { if (on) setSt({ loading: false, posts: [], error: x.message || 'offline' }); });
    return () => { on = false; };
  }, [reloadKey]);
  if (st.loading) return <div className="py-12 text-center text-[13px] t-mid">Loading the feed…</div>;
  if (st.error) return <div className="card p-6 text-center mt-2"><div className="text-3xl mb-2">📡</div><p className="text-[13px] t-mid">Couldn't load the feed{import.meta.env.DEV ? ' — no backend in local dev.' : '.'} It works once the server is live.</p></div>;
  if (!st.posts.length) return <div className="card p-6 text-center mt-2"><div className="text-4xl mb-2">🐥</div><p className="font-semibold t-hi mb-1">Quiet in here</p><p className="text-[13px] t-mid mb-3">No posts yet — start the conversation.</p><button className="btn btn-primary" style={{ maxWidth: 200, margin: '0 auto' }} onClick={onCompose}>Write the first post</button></div>;
  return <div className="py-2 space-y-3">{st.posts.map((p) => <FeedPostCard key={p.id} p={p} onComment={onComment} onAuthor={onAuthor} />)}</div>;
}
function FeedComposePane({ handle, onPosted }) {
  const [text, setText] = useState('');
  const [img, setImg] = useState(null); // { url, preview }
  const [busy, setBusy] = useState(false);
  const [upBusy, setUpBusy] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef(null);
  const pickImage = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith('image/')) { setErr('Pick an image file'); return; }
    setUpBusy(true); setErr('');
    try { const r = await uploadFeedImage(file); setImg({ url: r.url, preview: URL.createObjectURL(file) }); }
    catch (x) { setErr(x.message || 'Upload failed. Is the server live?'); }
    finally { setUpBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  };
  const post = async () => {
    if ((!text.trim() && !img) || busy) return;
    setBusy(true); setErr('');
    try { await createFeedPost(text.trim(), img?.url); setText(''); setImg(null); onPosted(); }
    catch (x) { setErr(x.message || 'Could not post. Is the server live?'); }
    finally { setBusy(false); }
  };
  return (
    <div className="py-2">
      <div className="card p-4">
        <p className="text-[13px] t-accent font-medium mb-3">{handle}</p>
        <textarea className="field" rows={4} placeholder="Share something with your campus…" value={text} onChange={(e) => setText(e.target.value)} style={{ resize: 'none' }} />
        {img && <div className="relative mt-3"><img src={img.preview} alt="" className="rounded-xl w-full" /><button className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-white text-[13px]" style={{ background: 'rgba(0,0,0,.55)' }} onClick={() => setImg(null)} aria-label="Remove image">✕</button></div>}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickImage} />
        <div className="flex items-center gap-2 mt-3">
          <button className="minibtn btn-ghost" style={{ width: 'auto', padding: '.5rem .8rem' }} disabled={upBusy} onClick={() => fileRef.current?.click()}><ImageIcon size={15} className="inline mr-1" />{upBusy ? 'Uploading…' : (img ? 'Change' : 'Photo')}</button>
          <button className="btn btn-primary" style={{ width: 'auto', marginLeft: 'auto', padding: '.6rem 1.2rem' }} disabled={(!text.trim() && !img) || busy} onClick={post}>{busy ? 'Posting…' : 'Post'}</button>
        </div>
        {err && <p className="text-[12px] mt-2" style={{ color: '#ef4444' }}>{err}</p>}
      </div>
      <p className="text-[11px] t-lo text-center mt-3">Photos upload to host storage · all posts are public · a report system keeps it safe.</p>
    </div>
  );
}

/* ---------------- stubs ---------------- */
function Stub({ title, emoji, msg }) {
  return (<div className="v2-scroll"><Header title={title} /><div className="px-8 py-16 text-center"><div className="text-5xl mb-3">{emoji}</div><p className="text-[14px] t-mid">{msg}</p></div></div>);
}
const CURRENCIES = [['৳', 'BDT'], ['₹', 'INR'], ['$', 'USD'], ['€', 'EUR'], ['£', 'GBP']];
function SettingsScreen({ d, toggleTheme }) {
  const { user, setUser, resetAll, allDues } = useV2();
  const [notify, setNotify] = useState(() => { try { return localStorage.getItem('cc_v2_notify') !== '0'; } catch { return true; } });
  const toggleNotify = () => setNotify((n) => { const v = !n; try { localStorage.setItem('cc_v2_notify', v ? '1' : '0'); } catch { /* noop */ } return v; });
  const cur = user?.currency || '৳';
  const exportCSV = () => {
    const rows = [['date', 'space', 'label', 'amount', 'status']].concat(allDues().map((dd) => [dd.date, dd.space?.name || '', String(dd.label || '').replace(/,/g, ' '), dd.amount, statusOf(dd)]));
    const csv = rows.map((r) => r.join(',')).join('\n');
    try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'classcost-v2.csv'; a.click(); } catch { /* noop */ }
  };
  return (
    <div className="v2-scroll"><Header title="Settings" />
      <div className="px-4 py-5 space-y-5">
        <div>
          <p className="text-[10px] uppercase tracking-wide t-lo mb-2 px-1">Appearance</p>
          <button className="card w-full p-4 flex items-center justify-between" onClick={toggleTheme}>
            <div className="text-left"><p className="font-semibold t-hi">Theme</p><p className="text-[12px] t-mid">{d ? 'Dark' : 'Light'} · tap to switch</p></div>
            <span className="w-9 h-9 rounded-full flex items-center justify-center t-mid" style={{ background: 'var(--pill-bg)', border: '.5px solid var(--border)' }}>{d ? <Sun size={16} /> : <Moon size={16} />}</span>
          </button>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide t-lo mb-2 px-1">Money</p>
          <div className="card p-4">
            <p className="font-semibold t-hi mb-1">Currency</p>
            <p className="text-[12px] t-mid mb-3">Shown everywhere amounts appear.</p>
            <div className="grid grid-cols-5 gap-2">{CURRENCIES.map(([sym, code]) => (<button key={code} className={`chipbtn ${cur === sym ? 'active' : ''}`} onClick={() => setUser({ currency: sym })}><div className="text-base">{sym}</div><div className="text-[9px] mt-0.5">{code}</div></button>))}</div>
          </div>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide t-lo mb-2 px-1">Notifications</p>
          <button className="card w-full p-4 flex items-center justify-between" onClick={toggleNotify}>
            <div className="flex items-center gap-3"><Bell size={18} className="t-mid" /><div className="text-left"><p className="font-semibold t-hi">Due reminders</p><p className="text-[12px] t-mid">Nudge me before a Due date</p></div></div>
            <span className="v2-switch" data-on={notify ? '1' : '0'}><span className="v2-knob" /></span>
          </button>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide t-lo mb-2 px-1">Data</p>
          <div className="card overflow-hidden">
            <button className="w-full flex items-center gap-3 p-4" onClick={exportCSV}><Download size={18} className="t-mid" /><span className="flex-1 text-left text-[14px] font-medium t-hi">Export as CSV</span><ChevronRight size={16} className="t-lo" /></button>
            <button className="w-full flex items-center gap-3 p-4" style={{ borderTop: '.5px solid var(--border)' }} onClick={() => { if (window.confirm('Reset all v2 demo data?')) resetAll(); }}><span className="flex-1 text-left text-[14px] font-medium" style={{ color: '#ef4444' }}>Reset demo data</span></button>
          </div>
        </div>
        <div className="card p-4"><p className="font-semibold t-hi mb-1">ClassCost v2 — preview</p><p className="text-[12px] t-mid">Behind a flag · v0.2. Parent view and cloud sync come in later phases.</p></div>
      </div>
    </div>
  );
}
function Profile({ back }) {
  const { user, setUser, logout } = useV2();
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [pwOpen, setPwOpen] = useState(false);
  const initial = (user?.name || 'S').trim().charAt(0).toUpperCase() || 'S';
  const saveProfile = () => { setUser({ name: name.trim() || 'Student', email: email.trim() }); setEdit(false); };
  return (
    <div className="v2-scroll">
      <Header title="Profile" onBack={back} />
      <div className="px-4 py-5 space-y-4">
        <div className="card p-5 flex flex-col items-center text-center">
          <span className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-3" style={{ background: '#22c55e' }}>{initial}</span>
          {!edit ? (
            <>
              <p className="text-lg font-bold t-hi">{user?.name || 'Student'}</p>
              <p className="text-[13px] t-mid">{user?.email || 'No email set'}</p>
              <button className="minibtn btn-ghost mt-3" style={{ width: 'auto', padding: '.5rem 1rem' }} onClick={() => { setName(user?.name || ''); setEmail(user?.email || ''); setEdit(true); }}>Edit profile</button>
            </>
          ) : (
            <div className="w-full space-y-3 mt-1 text-left">
              <Field label="Name" v={name} onC={setName} ph="Your name" />
              <Field label="Email" v={email} onC={setEmail} ph="you@email.com" type="email" />
              <div className="flex gap-2"><button className="btn btn-primary" onClick={saveProfile}>Save</button><button className="btn btn-ghost" onClick={() => setEdit(false)}>Cancel</button></div>
            </div>
          )}
        </div>
        <div className="card overflow-hidden">
          <button className="w-full flex items-center gap-3 p-4" onClick={() => setPwOpen(true)}>
            <Lock size={18} className="t-mid" /><span className="flex-1 text-left text-[14px] font-medium t-hi">{user?.hasPassword ? 'Change password' : 'Create password'}</span><ChevronRight size={16} className="t-lo" />
          </button>
          <button className="w-full flex items-center gap-3 p-4" style={{ borderTop: '.5px solid var(--border)' }} onClick={() => { if (window.confirm('Log out of ClassCost?')) logout(); }}>
            <LogOut size={18} style={{ color: '#ef4444' }} /><span className="flex-1 text-left text-[14px] font-medium" style={{ color: '#ef4444' }}>Log out</span>
          </button>
        </div>
        <p className="text-[11px] t-lo px-1">Password &amp; email verification connect to your ClassCost account once the backend is wired — in this preview they're stored on this device.</p>
      </div>
      {pwOpen && <PasswordSheet onClose={() => setPwOpen(false)} />}
    </div>
  );
}
function PasswordSheet({ onClose }) {
  const { user, setUser } = useV2();
  const has = !!user?.hasPassword;
  const [cur, setCur] = useState(''); const [pw, setPw] = useState(''); const [pw2, setPw2] = useState('');
  const ok = pw.length >= 6 && pw === pw2 && (!has || cur.length > 0);
  return (
    <div className="v2-backdrop" onClick={onClose}>
      <div className="v2-sheet" onClick={(e) => e.stopPropagation()}>
        <p className="font-semibold t-hi mb-3">{has ? 'Change password' : 'Create password'}</p>
        {has && <input className="field mb-2" type="password" placeholder="current password" value={cur} onChange={(e) => setCur(e.target.value)} />}
        <input className="field mb-2" type="password" placeholder="new password (min 6)" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
        <input className="field mb-3" type="password" placeholder="confirm new password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        <button className="btn btn-primary" disabled={!ok} onClick={() => { setUser({ hasPassword: true }); onClose(); }}>{has ? 'Update password' : 'Set password'}</button>
      </div>
    </div>
  );
}

/* ---------------- LOGIN (require-login gate) ---------------- */
/* ---------------- shell + router ---------------- */
function Shell() {
  const { user } = useV2();
  const [route, setRoute] = useState({ view: 'home', params: {} });
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('cc_v2_theme') || 'light'; } catch { return 'light'; } });
  const [guest, setGuest] = useState(() => { try { return localStorage.getItem('cc_v2_guest') === '1'; } catch { return false; } });
  const stack = useRef([]);
  const d = theme === 'dark';
  const c = v2Palette(d);
  const toggleTheme = () => setTheme((tm) => { const n = tm === 'dark' ? 'light' : 'dark'; try { localStorage.setItem('cc_v2_theme', n); } catch { /* noop */ } return n; });
  const nav = (view, params = {}) => { stack.current.push(route); setRoute({ view, params }); try { window.scrollTo(0, 0); } catch { /* noop */ } };
  const back = () => { const p = stack.current.pop(); setRoute(p || { view: 'home', params: {} }); };
  const tab = (view) => { stack.current = []; setRoute({ view, params: {} }); try { window.scrollTo(0, 0); } catch { /* noop */ } };
  const { view, params } = route;
  const P = { nav, back, tab, params, d, toggleTheme };
  let screen;
  switch (view) {
    case 'home': screen = <Home {...P} />; break;
    case 'create': screen = <Create {...P} />; break;
    case 'new-institute': screen = <NewInstitute {...P} />; break;
    case 'new-residence': screen = <NewResidence {...P} />; break;
    case 'new-simple': screen = <NewSimple {...P} />; break;
    case 'institute': screen = <Institute {...P} />; break;
    case 'create-semester': screen = <CreateSemester {...P} />; break;
    case 'semester': screen = <Semester {...P} />; break;
    case 'calendar': screen = <CalendarScreen {...P} />; break;
    case 'feed': screen = <FeedScreen {...P} />; break;
    case 'reports': screen = <ReportsScreen {...P} />; break;
    case 'settings': screen = <SettingsScreen {...P} />; break;
    case 'profile': screen = <Profile {...P} />; break;
    case 'residence': case 'club': case 'vehicle': case 'personal': case 'asset': screen = <SpaceDetail {...P} />; break;
    default: screen = <Home {...P} />;
  }
  const homeActive = !['calendar', 'feed', 'reports', 'settings'].includes(view);
  const vars = {
    '--bg': c.bg, '--card': c.card, '--border': c.border, '--accent': c.accent, '--accent-text': c.accentText, '--accent-light': c.accentLight, '--gold': c.gold,
    '--text1': c.text1, '--text2': c.text2, '--text3': c.text3, '--hero-bg': c.heroBg, '--hero-border': c.heroBorder,
    '--pill-bg': c.pillBg, '--nav-bg': c.navBg, '--sheet-bg': c.sheetBg, '--card-shadow': c.cardShadow,
  };
  const authed = !!user?.id || guest;
  const guestBtn = import.meta.env.DEV ? () => { try { localStorage.setItem('cc_v2_guest', '1'); } catch { /* ignore */ } setGuest(true); } : null;
  if (!authed) return <V2Landing onGuest={guestBtn} />;
  return (
    <div className="v2-app" style={vars}>
      {screen}
      <Leeboon nav={nav} d={d} />
      <nav className="v2-nav">
        <div className="v2-navrow">
          <button className={`v2-navbtn ${homeActive ? 'active' : ''}`} onClick={() => tab('home')}><HomeIcon size={20} strokeWidth={2} />Home</button>
          <button className={`v2-navbtn ${view === 'calendar' ? 'active' : ''}`} onClick={() => tab('calendar')}><CalendarDays size={20} strokeWidth={2} />Calendar</button>
          <button className={`v2-navbtn ${view === 'feed' ? 'active' : ''}`} onClick={() => tab('feed')}><Newspaper size={20} strokeWidth={2} />Feed</button>
          <button className={`v2-navbtn ${view === 'reports' ? 'active' : ''}`} onClick={() => tab('reports')}><BarChart3 size={20} strokeWidth={2} />Reports</button>
          <button className={`v2-navbtn ${view === 'settings' ? 'active' : ''}`} onClick={() => tab('settings')}><SettingsIcon size={20} strokeWidth={2} />Settings</button>
        </div>
      </nav>
    </div>
  );
}

export default function V2App() {
  return (<V2Provider><Shell /></V2Provider>);
}
