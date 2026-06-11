// ClassCost v2 — app shell + screens. Theme from v1's getThemeColors() (light + dark), via CSS vars.
import React, { useState, useRef, useEffect } from 'react';
import { Plus, ChevronRight, ChevronLeft, ChevronDown, Utensils, Bus, Sparkles, Sun, Moon, Home as HomeIcon, CalendarDays, BarChart3, Settings as SettingsIcon, GraduationCap, Building2, Users, Bike, Repeat, Package, Menu, Bell, LogOut, Lock, Download, Newspaper, PenSquare, Search, Heart, MessageCircle, Share2, Image as ImageIcon, Flag, Send, User, MoreHorizontal, Trash2, Camera, Compass, Reply } from 'lucide-react';
import { motion } from 'framer-motion';
import { haptics } from '../lib/haptics';
import { V2Provider, useV2 } from './store';
import { fmt, MN, MNS, WD, split, iso, parse, today, inMonth, paidOf, remOf, statusOf, detectInstitute, monthlyDates } from './engine';
// ClassCost v2 palette — derived from the logo (ink #0F1537 + cream). Notion-calm: warm
// neutrals + one accent that inverts per mode (navy-on-cream / cream-on-navy) + muted gold.
const v2Palette = (d) => d ? {
  bg: '#0C0A1A', card: '#151421', border: '#FFFFFF',
  accent: '#F2EFE6', accentText: '#0A143F', accentLight: 'rgba(242,239,230,.12)', gold: '#F2EFE6',
  text1: '#F2EFE6', text2: '#A6ABC6', text3: '#6E7596',
  heroBg: '#151421', heroBorder: '#FFFFFF',
  pillBg: '#201E30', navBg: 'rgba(12,10,26,.92)', sheetBg: '#151421', cardShadow: 'none',
} : {
  bg: '#F5F4F0', card: '#FFFFFF', border: '#16181F',
  accent: '#0A143F', accentText: '#FFFFFF', accentLight: 'rgba(10,20,63,.07)', gold: '#0A143F',
  text1: '#0A143F', text2: '#5C6178', text3: '#9499A6',
  heroBg: '#FFFFFF', heroBorder: '#16181F',
  pillBg: '#EEEDE7', navBg: 'rgba(245,244,240,.95)', sheetBg: '#FFFFFF', cardShadow: 'none',
};
import { Logo } from '../components/ui/Logo';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Leeboon } from './Leeboon';
import { getMyFeedProfile, claimHandle, listFeedPosts, createFeedPost, likePost, unlikePost, getComments, addComment, followUser, unfollowUser, searchUsers, getFeedProfile, getUserPosts, uploadFeedImage, reportContent, listConversations, getThread, sendDm, updateMyProfile, deletePost, deleteComment, getFeedNotifications, markNotificationsRead, getFeedPost, listStories, createStory, deleteStory, getSuggestions, getFollowers, getFollowing } from '../api';
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
  const st = engStatus(d), rem = engRem(d);
  if (st === 'paid') return <span className="pill st-paid">Paid</span>;
  if (st === 'partial') return <span className="pill st-partial">{fmt(rem)} left</span>;
  if (st === 'overdue') return <span className="pill st-overdue">Overdue</span>;
  return <span className="pill st-pending">Upcoming</span>;
}
// Recurring-engine remaining: counts cash payments + amount drawn from the deposit/advance balance.
const engRem = (d) => Math.max(0, (d.amount || 0) - paidOf(d) - (d.fromBalance || 0));
const engStatus = (d) => (engRem(d) <= 0 ? 'paid' : statusOf(d));
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
  const remindDays = (() => { try { return Math.max(0, Math.min(30, parseInt(localStorage.getItem('cc_v2_remind_days'), 10) || 7)); } catch { return 7; } })();
  const notif = notifItems(allDues(), remindDays);
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
        <button onClick={() => nav('profile')} className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[14px] font-semibold shrink-0" style={{ background: avatarColor(user?.name) }} aria-label="Profile">{initial}</button>
      </header>
      <div className="px-4">
        {/* hero (matches v1 DashboardV3) */}
        <div className="rounded-md p-4 mb-4" style={{ background: 'var(--hero-bg)', border: '.5px solid var(--hero-border)' }}>
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
        <div className="overflow-hidden" style={{ minHeight: 320, background: 'var(--card)', border: '.5px solid var(--border)', borderRadius: '6px', boxShadow: 'var(--card-shadow)' }}>
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
      {notifOpen && <NotifSheet onClose={() => setNotifOpen(false)} leadDays={remindDays} />}
    </div>
  );
}
function QuickAddDaily({ info, onClose, fixedSectorId, onHistory }) {
  const { topSpaces, personalSpace, logDaily } = useV2();
  const [amt, setAmt] = useState('');
  const [sectorId, setSectorId] = useState(null);
  const sectors = topSpaces();
  const onlyPersonal = sectors.length === 1;
  const fixed = !!fixedSectorId;
  const eff = fixed ? fixedSectorId : (onlyPersonal ? personalSpace()?.id : sectorId);
  const canSave = +amt > 0 && eff;
  return (
    <div className="v2-backdrop" onClick={onClose}>
      <div className="v2-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'var(--border)' }} />
        <div className="flex items-center gap-2 mb-3">
          <p className="font-semibold t-hi flex-1">{info.icon} Add {info.category}</p>
          {onHistory && <button className="text-[12px] font-bold t-accent" onClick={() => { onClose(); onHistory(); }}>History →</button>}
        </div>
        <input className="field mb-3" type="number" placeholder="amount (৳)" value={amt} onChange={(e) => setAmt(e.target.value)} autoFocus />
        {!fixed && !onlyPersonal && (
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
        {/* masthead */}
        <div className="flex items-center gap-2.5 pb-3 mb-4 px-0.5" style={{ borderBottom: '.5px solid var(--border)' }}><Logo size={30} /><span className="text-[17px] font-bold t-hi t-serif">ClassCost</span></div>

        {/* profile — framed */}
        <button className="w-full text-left flex items-center gap-3 p-2.5 mb-5" onClick={() => go(() => nav('profile'))} style={{ border: '.5px solid var(--border)', borderRadius: 6, background: 'var(--card)' }}>
          <span className="w-10 h-10 rounded-full flex items-center justify-center text-white text-base font-semibold shrink-0" style={{ background: avatarColor(user?.name) }}>{initial}</span>
          <div className="flex-1 min-w-0"><p className="font-semibold t-hi truncate">{user?.name || 'Student'}</p><p className="text-[11px] t-mid truncate">{user?.email || 'View profile'}</p></div>
          <ChevronRight size={16} className="t-lo shrink-0" />
        </button>

        {/* spaces — framed group */}
        <p className="text-[10px] uppercase tracking-[0.14em] font-bold t-mid mb-2 px-0.5">Spaces</p>
        <div className="mb-5" style={{ border: '.5px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
          {spaces.length === 0 && <p className="text-[12px] t-mid px-3 py-3">No spaces yet.</p>}
          {SPACE_GROUPS.flatMap((g) => spaces.filter((s) => g.types.includes(s.type)).map((s) => {
            const linkedInst = s.linkedInstituteId ? spaces.find((x) => x.id === s.linkedInstituteId) : null;
            return (
            <button key={s.id} className="w-full text-left flex items-center gap-3 px-3 py-2.5" style={{ borderBottom: '.5px solid var(--border)' }} onClick={() => go(() => nav(s.type, { spaceId: s.id }))}>
              <span className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0" style={{ background: 'var(--accent-light)', border: '.5px solid var(--border)' }}>{s.icon}</span>
              <div className="flex-1 min-w-0"><p className="text-[13px] font-semibold t-hi truncate">{s.name}</p><p className="text-[10px] t-lo">{g.label}{linkedInst ? ' · ' + linkedInst.name : ''}</p></div>
            </button>
            );
          }))}
          <button className="w-full text-left flex items-center gap-3 px-3 py-2.5" onClick={() => go(() => nav('create'))}>
            <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-light)', border: '1.5px dashed var(--border)' }}><Plus size={16} className="t-accent" /></span>
            <span className="text-[13px] font-semibold t-accent">Create space</span>
          </button>
        </div>

        {/* go to — framed group */}
        <p className="text-[10px] uppercase tracking-[0.14em] font-bold t-mid mb-2 px-0.5">Go to</p>
        <div style={{ border: '.5px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
          {sections.map(({ v, label, Icon }, i) => (
            <button key={v} className="w-full text-left flex items-center gap-3 px-3 py-2.5 t-hi" style={i < sections.length - 1 ? { borderBottom: '.5px solid var(--border)' } : undefined} onClick={() => go(() => tab(v))}>
              <Icon size={18} className="t-mid" /><span className="text-[13px] font-semibold">{label}</span>
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
function NewResidence({ nav, back, params }) {
  const { createResidence, linkSpaceToInstitute } = useV2();
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
        <button className="btn btn-primary" onClick={() => { const s = createResidence({ name: f.name.trim() || 'Residence', rent: +f.rent || 0, deposit: +f.dep || 0, day: Math.min(28, Math.max(1, +f.day || 1)) }); if (params?.linkTo) linkSpaceToInstitute(s.id, params.linkTo); nav('residence', { spaceId: s.id }); }}>Create residence</button>
      </div>
    </div>
  );
}
function NewSimple({ nav, back, params }) {
  const { createSimple, linkSpaceToInstitute } = useV2();
  const stype = params.stype || 'club';
  const [name, setName] = useState('');
  return (
    <div className="v2-scroll">
      <Header title={`New ${stype}`} crumb={`Create › ${stype}`} onBack={back} />
      <div className="px-4 py-5 space-y-5">
        <Field label="Name" v={name} onC={setName} ph={stype === 'club' ? 'e.g. BUBEF' : stype === 'vehicle' ? 'e.g. My bikes' : 'Name'} />
        <button className="btn btn-primary" onClick={() => { const s = createSimple(stype, name.trim() || stype); if (params?.linkTo) linkSpaceToInstitute(s.id, params.linkTo); nav(stype, { spaceId: s.id }); }}>Create {stype}</button>
      </div>
    </div>
  );
}

/* ---------------- INSTITUTE + SEMESTER ---------------- */
function InstituteHero({ sm }) {
  return (
    <div className="rounded-md p-4 mb-4" style={{ background: 'var(--hero-bg)', border: '.5px solid var(--hero-border)' }}>
      <div className="grid grid-cols-2 gap-4">
        <div><p className="text-[10px] font-medium t-gold">Lifetime</p><p className="text-[22px] font-medium mt-0.5 t-hi t-serif">{fmt(sm.life)}</p></div>
        <div className="text-right"><p className="text-[10px] font-medium t-gold">This month</p><p className="text-[22px] font-medium mt-0.5 t-hi t-serif">{fmt(sm.month)}</p></div>
        <div><p className="text-[10px] t-lo">This year</p><p className="text-sm font-medium t-mid">{fmt(sm.year)}</p></div>
        <div className="text-right"><p className="text-[10px] t-lo">Last month</p><p className="text-sm font-medium t-mid">{fmt(sm.last)}</p></div>
      </div>
    </div>
  );
}
function InstituteTiles({ cats, onPick }) {
  const tiles = DAILY.filter((x) => x.cat !== 'Others');
  const maxDaily = Math.max(1, ...tiles.map((x) => cats[x.cat]?.total || 0));
  return (
    <div className="grid grid-cols-2 gap-2.5 mb-5">
      {tiles.map(({ cat, emoji, Icon, color }) => {
        const total = cats[cat]?.total || 0, pct = Math.min(100, total / maxDaily * 100);
        return (
          <button key={cat} className="ctile" onClick={() => onPick(cat, emoji)}>
            <Icon size={18} color={color} />
            <p className="text-[12px] t-mid mt-2">{cat}</p>
            <p className="t-hi font-semibold text-[15px] mt-0.5">{fmt(total)}</p>
            <div className="bar mt-2"><div style={{ height: '100%', width: pct + '%', background: color, borderRadius: 999 }} /></div>
          </button>
        );
      })}
    </div>
  );
}
function CostsBox({ costs, onOpen, onAdd }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('All');
  const tags = ['All', ...COST_CHIPS.map((c) => c[0]), 'Others'];
  const shown = costs.filter((b) => (tag === 'All' || (b.category || b.name) === tag) && (!q.trim() || (b.name || '').toLowerCase().includes(q.trim().toLowerCase())));
  const toggleSearch = () => setSearchOpen((o) => { if (o) { setQ(''); setTag('All'); } return !o; });
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold t-hi">Costs</h2>
        <button className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: searchOpen ? 'var(--accent-light)' : 'transparent', color: searchOpen ? 'var(--accent)' : 'var(--text2)' }} onClick={toggleSearch} aria-label="Search costs"><Search size={15} /></button>
      </div>
      {searchOpen && (
        <div className="mb-2">
          <input className="field mb-2" placeholder="Search costs…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          <div className="flex flex-wrap gap-1.5">{tags.map((t) => (<button key={t} className={`chipbtn ${tag === t ? 'active' : ''}`} style={{ width: 'auto', padding: '.3rem .6rem', fontSize: '.72rem' }} onClick={() => setTag(t)}>{t}</button>))}</div>
        </div>
      )}
      <div className="overflow-hidden" style={{ minHeight: 320, background: 'var(--card)', border: '.5px solid var(--border)', borderRadius: '6px', boxShadow: 'var(--card-shadow)' }}>
        <button className="w-full text-left px-4 py-3.5 flex items-center gap-3" onClick={onAdd}>
          <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-light)' }}><Plus size={18} className="t-accent" /></span>
          <span className="text-sm font-medium t-accent">Add cost</span>
        </button>
        {shown.length === 0 && <p className="text-[13px] t-mid text-center py-10" style={{ borderTop: '.5px solid var(--border)' }}>{costs.length ? 'No costs match.' : 'No costs yet.'}</p>}
        {shown.map((b) => {
          const tot = b.dues.reduce((a, dd) => a + (dd.amount || 0), 0), paid = b.dues.reduce((a, dd) => a + paidOf(dd), 0);
          return (
            <button key={b.id} className="w-full text-left px-4 py-3.5 flex items-center gap-3" style={{ borderTop: '.5px solid var(--border)' }} onClick={() => onOpen(b)}>
              <span className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0" style={{ background: 'var(--accent-light)' }}>{b.icon}</span>
              <div className="flex-1 min-w-0"><p className="font-semibold t-hi truncate">{b.name}</p><p className="text-[11px] t-mid">{b.category}</p></div>
              <div className="text-right mr-1"><p className="text-[10px] t-lo">paid / total</p><p className="text-sm font-semibold t-hi">{fmt(paid)} / {fmt(tot)}</p></div>
              <ChevronRight size={16} className="t-lo" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
function SemesterCard({ b, onClick }) {
  const paid = b.dues.reduce((a, dd) => a + paidOf(dd), 0), cnt = b.dues.filter((dd) => statusOf(dd) === 'paid').length;
  const net = b.items ? b.net : b.dues.reduce((a, dd) => a + (dd.amount || 0), 0);
  return (
    <button className="card w-full text-left p-4" onClick={onClick}>
      <div className="flex items-center justify-between"><p className="font-semibold t-hi">🎓 {b.name}</p><span className="pill st-partial">{b.plan > 1 ? b.plan + '× installments' : 'one-time'}</span></div>
      <div className="flex items-center justify-between mt-2 text-[12px]"><span className="t-mid">{fmt(paid)} / {fmt(net)}</span><span className="t-mid">{cnt}/{b.dues.length} paid</span></div>
      <div className="bar mt-2" style={{ height: 4 }}><div style={{ height: '100%', width: (net > 0 ? Math.min(100, paid / net * 100) : 0) + '%', background: '#22c55e', borderRadius: 999 }} /></div>
    </button>
  );
}
function Institute({ nav, back, params }) {
  const { spaceById, scopedSummary, scopedCategoryTotals, monthTotal, spaceDues } = useV2();
  const [pane, setPane] = useState(params.pane || 0);
  const [costSheet, setCostSheet] = useState(null); // null | 'normal' | 'previous'
  const [linkOpen, setLinkOpen] = useState(false);
  const [quick, setQuick] = useState(null);
  const [spaceSheet, setSpaceSheet] = useState(null); // null | 'residence' | 'club'
  const startX = useRef(0);
  const s = spaceById(params.spaceId);
  if (!s) return <Stub title="Not found" emoji="🤔" msg="That space is gone." />;
  const go = (p) => { setPane(Math.max(0, Math.min(3, p))); try { window.scrollTo(0, 0); } catch { /* noop */ } };
  const sems = s.blocks.filter((b) => b.kind === 'semester');
  const costs = s.blocks.filter((b) => b.kind === 'cost');
  const linked = (s.linkedSpaceIds || []).map(spaceById).filter(Boolean);
  const clubs = linked.filter((sp) => sp.type === 'club');
  const residences = linked.filter((sp) => sp.type === 'residence');
  const TABS = [{ i: 0, label: 'Main', Icon: HomeIcon }, { i: 1, label: 'Semesters', Icon: GraduationCap }, { i: 2, label: 'Club', Icon: Users }, { i: 3, label: 'Residence', Icon: Building2 }];
  const spaceList = (items, type) => (
    <div style={{ border: '.5px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
      {items.map((sp, i) => (
        <div key={sp.id} className="flex items-center gap-3 px-3 py-3" style={i > 0 ? { borderTop: '.5px solid var(--border)' } : undefined}>
          <button className="flex items-center gap-3 flex-1 min-w-0 text-left" onClick={() => nav(sp.type, { spaceId: sp.id })}>
            <span className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0" style={{ background: 'var(--accent-light)' }}>{sp.icon}</span>
            <div className="flex-1 min-w-0"><p className="font-semibold t-hi truncate">{sp.name}</p><p className="text-[11px] t-mid">{fmt(monthTotal(spaceDues(sp)))}/mo</p></div>
          </button>
          <button className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-light)', border: '.5px solid var(--border)' }} onClick={() => nav(sp.type, { spaceId: sp.id, openSheet: 'cost' })} aria-label="Add cost"><Plus size={16} className="t-accent" /></button>
        </div>
      ))}
      <button className="w-full text-left flex items-center gap-3 px-3 py-3" style={items.length ? { borderTop: '.5px solid var(--border)' } : undefined} onClick={() => setSpaceSheet(type)}>
        <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-light)', border: '1.5px dashed var(--border)' }}><Plus size={16} className="t-accent" /></span>
        <span className="text-[13px] font-semibold t-accent">Add {type}</span>
      </button>
    </div>
  );
  return (
    <div className="v2-scroll" style={{ overflowX: 'hidden', paddingBottom: 124 }}>
      <header className="sticky top-0 z-20 px-4 py-3" style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(10px)', borderBottom: '.5px solid var(--border)' }}>
        <div className="flex items-center gap-2.5">
          <button onClick={back} className="w-9 h-9 -ml-1.5 rounded-full flex items-center justify-center t-mid" aria-label="Back"><ChevronLeft size={20} /></button>
          <div className="min-w-0 flex-1"><p className="text-[11px] t-lo truncate">Home › Institutes</p><h1 className="text-lg font-semibold t-hi truncate">{s.name}</h1></div>
          <button className="text-[12px] font-medium t-accent shrink-0" onClick={() => setCostSheet('previous')}>+ Add previous</button>
        </div>
      </header>
      <div onPointerDown={(e) => { startX.current = e.clientX; }} onPointerUp={(e) => { const dx = e.clientX - startX.current; if (dx < -55 && pane < 3) go(pane + 1); else if (dx > 55 && pane > 0) go(pane - 1); }} style={{ overflow: 'hidden' }}>
        <motion.div className="flex items-start" style={{ width: '400%' }} animate={{ x: `-${pane * 25}%` }} transition={{ type: 'spring', stiffness: 320, damping: 34 }}>
          <div style={{ width: '25%' }} className="px-4 pt-4">
            <InstituteHero sm={scopedSummary(s.id)} />
            <InstituteTiles cats={scopedCategoryTotals(s.id)} onPick={(category, icon) => setQuick({ category, icon })} />
            <CostsBox costs={costs} onOpen={(b) => nav('semester', { spaceId: s.id, semId: b.id })} onAdd={() => setCostSheet('normal')} />
            {residences.length > 0 && (<><h2 className="text-sm font-semibold t-hi mb-2">Residence</h2><div className="mb-5">{spaceList(residences, 'residence')}</div></>)}
            {clubs.length > 0 && (<><h2 className="text-sm font-semibold t-hi mb-2">Club</h2><div className="mb-5">{spaceList(clubs, 'club')}</div></>)}
            <div className="h-4" />
          </div>
          <div style={{ width: '25%' }} className="px-4 pt-4">
            <h2 className="text-sm font-semibold t-hi mb-2">Semesters</h2>
            {sems.length === 0
              ? <div className="card p-6 text-center text-[13px] t-mid">No semesters yet.<br /><button className="font-medium t-accent mt-1" onClick={() => nav('create-semester', { spaceId: s.id })}>+ Add semester</button></div>
              : <div className="space-y-2.5">{sems.map((b) => <SemesterCard key={b.id} b={b} onClick={() => nav('semester', { spaceId: s.id, semId: b.id })} />)}<button className="btn btn-ghost" onClick={() => nav('create-semester', { spaceId: s.id })}>+ Add semester</button></div>}
            <div className="h-4" />
          </div>
          <div style={{ width: '25%' }} className="px-4 pt-4">
            <h2 className="text-sm font-semibold t-hi mb-2">Clubs</h2>
            {clubs.length === 0 ? <div className="card p-6 text-center text-[13px] t-mid">No club yet.<br /><button className="font-medium t-accent mt-1" onClick={() => setSpaceSheet('club')}>+ Add club</button></div> : spaceList(clubs, 'club')}
            <div className="h-4" />
          </div>
          <div style={{ width: '25%' }} className="px-4 pt-4">
            <h2 className="text-sm font-semibold t-hi mb-2">Residences</h2>
            {residences.length === 0 ? <div className="card p-6 text-center text-[13px] t-mid">No residence yet.<br /><button className="font-medium t-accent mt-1" onClick={() => setSpaceSheet('residence')}>+ Add residence</button></div> : spaceList(residences, 'residence')}
            <div className="h-4" />
          </div>
        </motion.div>
      </div>
      <div className="v2-feedfooter">
        <div className="flex" style={{ background: 'var(--sheet-bg)', borderTop: '.5px solid var(--border)', borderBottom: '.5px solid var(--border)' }}>
          {TABS.map(({ i, label, Icon }) => (
            <button key={i} onClick={() => go(i)} className="flex-1 flex flex-col items-center gap-0.5 py-2" style={{ background: pane === i ? 'var(--accent)' : 'transparent', color: pane === i ? 'var(--accent-text)' : 'var(--text2)', borderLeft: i ? '.5px solid var(--border)' : undefined, transition: 'background .15s' }}>
              <Icon size={17} /><span className="text-[10px] font-semibold tracking-wide">{label}</span>
            </button>
          ))}
        </div>
      </div>
      {quick && <QuickAddDaily info={quick} fixedSectorId={s.id} onHistory={() => nav('category-history', { spaceId: s.id, cat: quick.category })} onClose={() => setQuick(null)} />}
      {costSheet && <InstituteCostSheet spaceId={s.id} preset={costSheet === 'previous' ? 'previous' : null} goPane={go} onClose={() => setCostSheet(null)} />}
      {spaceSheet && <AddLinkedSpaceSheet nav={nav} instituteId={s.id} only={spaceSheet} onClose={() => setSpaceSheet(null)} onLinkExisting={() => { setSpaceSheet(null); setLinkOpen(true); }} />}
      {linkOpen && <LinkSpaceSheet instituteId={s.id} onClose={() => setLinkOpen(false)} />}
    </div>
  );
}
function CreateSemester({ nav, back, params }) {
  const { addSimpleSemester } = useV2();
  const seedRows = (n) => monthlyDates(n, 1, 0).map((dt) => ({ amount: '', date: dt }));
  const [name, setName] = useState('');
  const [mode, setMode] = useState('installments'); // installments | onetime
  const [plan, setPlan] = useState(3);
  const [rows, setRows] = useState(() => seedRows(3));
  const setPlanN = (n) => { setPlan(n); setRows(seedRows(n)); };
  const setModeV = (m) => { setMode(m); setRows(m === 'onetime' ? [{ amount: '', date: iso(today()) }] : seedRows(plan)); };
  const upd = (i, k, v) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const addRow = () => setRows((rs) => [...rs, { amount: '', date: iso(today()) }]);
  const delRow = (i) => setRows((rs) => rs.filter((_, j) => j !== i));
  const total = rows.reduce((a, r) => a + (+r.amount || 0), 0);
  const save = () => {
    const dues = rows.filter((r) => r.date).map((r) => ({ amount: +r.amount || 0, date: r.date }));
    const b = addSimpleSemester(params.spaceId, { name: name.trim() || 'Semester', plan: mode === 'onetime' ? 1 : dues.length, dues });
    nav('semester', { spaceId: params.spaceId, semId: b.id });
  };
  return (
    <div className="v2-scroll">
      <Header title="New semester" crumb="Add semester" onBack={back} />
      <div className="px-4 py-4 space-y-5">
        <Field label="Semester name" v={name} onC={setName} ph="e.g. Summer 2026" />
        <div>
          <p className="text-[12px] t-mid mb-2">Type</p>
          <div className="grid grid-cols-2 gap-2">
            <button className={`chipbtn ${mode === 'installments' ? 'active' : ''}`} onClick={() => setModeV('installments')}>Installments</button>
            <button className={`chipbtn ${mode === 'onetime' ? 'active' : ''}`} onClick={() => setModeV('onetime')}>One-time</button>
          </div>
        </div>
        {mode === 'installments' && (
          <div><p className="text-[12px] t-mid mb-2">How many installments</p><div className="grid grid-cols-3 gap-2">{[2, 3, 4].map((n) => (<button key={n} className={`chipbtn ${plan === n ? 'active' : ''}`} onClick={() => setPlanN(n)}>{n}×</button>))}</div></div>
        )}
        <div className="card p-4 space-y-2.5">
          <div className="flex items-center justify-between"><p className="text-[10px] uppercase tracking-wide font-semibold t-lo">Payments</p><span className="text-[12px] t-mid">Total {fmt(total)}</span></div>
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <input className="field" type="number" placeholder="amount" value={r.amount} onChange={(e) => upd(i, 'amount', e.target.value)} style={{ flex: 1 }} />
              <input className="field" type="date" value={r.date} onChange={(e) => upd(i, 'date', e.target.value)} style={{ flex: 1 }} />
              {rows.length > 1 && <button className="t-lo shrink-0 p-1" onClick={() => delRow(i)} aria-label="Remove"><Trash2 size={15} /></button>}
            </div>
          ))}
          {mode === 'installments' && <button className="text-[12px] font-medium t-accent" onClick={addRow}>+ Add installment</button>}
          <p className="text-[11px] t-lo">No need to know the total — fill amounts as you learn them, mark Paid as you pay.</p>
        </div>
        <button className="btn btn-primary" disabled={!name.trim()} onClick={save}>Create semester</button>
        <div className="h-2" />
      </div>
    </div>
  );
}
function EditableDue({ d, onUpdate, onDelete, onPay, onUnpay }) {
  const isPaid = statusOf(d) === 'paid';
  return (
    <div className="card p-3">
      <div className="flex items-center gap-2">
        <input className="field" type="number" placeholder="amount" defaultValue={d.amount || ''} onBlur={(e) => onUpdate({ amount: e.target.value })} style={{ flex: 1 }} />
        <input className="field" type="date" defaultValue={d.date} onChange={(e) => onUpdate({ date: e.target.value })} style={{ flex: 1 }} />
        <button className="t-lo shrink-0 p-1" onClick={onDelete} aria-label="Delete"><Trash2 size={15} /></button>
      </div>
      <div className="flex items-center justify-between mt-2">
        {statusPill(d)}
        {isPaid
          ? <button className="minibtn btn-ghost" style={{ width: 'auto' }} onClick={onUnpay}>Mark unpaid</button>
          : <button className="minibtn st-paid" style={{ width: 'auto' }} onClick={onPay}>Mark paid</button>}
      </div>
    </div>
  );
}
function Semester({ back, params }) {
  const { spaceById, blockById, updateDue, deleteDue, addDue, payDue, unpayDue } = useV2();
  const s = spaceById(params.spaceId), b = blockById(params.semId);
  if (!b) return <Stub title="Not found" emoji="🤔" msg="That item is gone." />;
  const paid = b.dues.reduce((a, dd) => a + paidOf(dd), 0);
  const net = b.items ? b.net : b.dues.reduce((a, dd) => a + (dd.amount || 0), 0);
  const addRow = () => addDue(b.id, { amount: 0, date: iso(today()), label: b.name });
  return (
    <div className="v2-scroll">
      <Header title={b.name} crumb={(s?.name || '') + ' › ' + (b.kind === 'semester' ? 'Semester' : 'Cost')} onBack={back} />
      <div className="px-4 py-4 space-y-4">
        {b.items && (
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
        )}
        <div className="card p-4 flex items-center justify-between">
          <div><p className="text-[10px] uppercase tracking-wide t-lo">Planned</p><p className="text-xl font-bold t-hi t-serif">{fmt(net)}</p></div>
          <div className="text-right"><p className="text-[10px] uppercase tracking-wide t-lo">Paid</p><p className="text-xl font-bold t-serif" style={{ color: '#22c55e' }}>{fmt(paid)}</p></div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2"><h2 className="text-sm font-semibold t-hi">Payments</h2><button className="text-[12px] font-medium t-accent" onClick={addRow}>+ Add</button></div>
          <div className="space-y-2">{b.dues.map((dd) => <EditableDue key={dd.id} d={dd} onUpdate={(p) => updateDue(dd.id, p)} onDelete={() => deleteDue(dd.id)} onPay={() => payDue(dd.id)} onUnpay={() => unpayDue(dd.id)} />)}</div>
          {b.dues.length === 0 && <div className="card p-5 text-center text-[13px] t-mid">No payments yet. <button className="font-medium t-accent" onClick={addRow}>+ Add one</button></div>}
        </div>
      </div>
    </div>
  );
}
const COST_CHIPS = [['Registration', '🧾'], ['Admission', '🎓'], ['Transport', '🚌'], ['Books', '📚'], ['Exam', '📝']];
function InstituteCostSheet({ spaceId, preset, onClose, goPane }) {
  const { addCost } = useV2();
  const isPrev = preset === 'previous';
  const [tag, setTag] = useState('');
  const [custom, setCustom] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => (isPrev ? iso(new Date(today().getFullYear(), today().getMonth() - 1, 1)) : iso(today())));
  const [paid, setPaid] = useState(isPrev);
  const [plan, setPlan] = useState(1);
  const name = tag && tag !== 'Other' ? tag : custom.trim();
  const valid = !!name && +amount > 0;
  const save = () => { if (!valid) return; addCost(spaceId, { name, tag: tag && tag !== 'Other' ? tag : undefined, amount: +amount, date, paid, plan }); onClose(); };
  return (
    <div className="v2-backdrop" onClick={onClose}>
      <div className="v2-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-3"><p className="font-bold t-hi flex-1">{isPrev ? 'Add a previous cost' : 'Add cost'}</p><button className="text-[13px] t-mid" onClick={onClose}>Close</button></div>
        {!isPrev && goPane && (
          <>
            <p className="text-[11px] uppercase tracking-wide t-lo mb-1.5">Add to a section</p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[['Semester', 1, GraduationCap], ['Club', 2, Users], ['Residence', 3, Building2]].map(([lbl, p, Icon]) => (
                <button key={lbl} className="chipbtn flex flex-col items-center gap-1 py-2.5" onClick={() => { onClose(); goPane(p); }}><Icon size={16} />{lbl} →</button>
              ))}
            </div>
            <div className="flex items-center gap-3 my-3"><div className="flex-1 h-px" style={{ background: 'var(--border)' }} /><span className="text-[11px] t-lo">or a quick cost</span><div className="flex-1 h-px" style={{ background: 'var(--border)' }} /></div>
          </>
        )}
        <p className="text-[11px] uppercase tracking-wide t-lo mb-1.5">{isPrev ? 'Suggested' : 'Quick cost'}</p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {COST_CHIPS.map(([t, ic]) => (<button key={t} className={`chipbtn ${tag === t ? 'active' : ''}`} style={{ width: 'auto', padding: '.4rem .7rem' }} onClick={() => { setTag(t); setCustom(''); }}>{ic} {t}</button>))}
          <button className={`chipbtn ${tag === 'Other' ? 'active' : ''}`} style={{ width: 'auto', padding: '.4rem .7rem' }} onClick={() => setTag('Other')}>＋ Other</button>
        </div>
        {(tag === 'Other' || !tag) && <input className="field mb-3" placeholder="Cost name (e.g. Bus pass)" value={custom} onChange={(e) => setCustom(e.target.value)} />}
        <div className="flex gap-2 mb-3">
          <input className="field" type="number" placeholder="amount ৳" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ flex: 1 }} />
          <input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ flex: 1 }} />
        </div>
        <p className="text-[11px] uppercase tracking-wide t-lo mb-1.5">Split</p>
        <div className="grid grid-cols-4 gap-2 mb-3">{[1, 2, 3, 4].map((n) => (<button key={n} className={`chipbtn ${plan === n ? 'active' : ''}`} onClick={() => setPlan(n)}>{n === 1 ? 'Full' : n + '×'}</button>))}</div>
        <label className="flex items-center gap-2 mb-4 text-[13px] t-hi"><input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="w-4 h-4" style={{ accentColor: 'var(--accent)' }} />Already paid</label>
        <button className="btn btn-primary" disabled={!valid} onClick={save}>{isPrev ? 'Add previous cost' : 'Add cost'}</button>
      </div>
    </div>
  );
}
function CategoryHistory({ back, params }) {
  const { spaceById, childrenOf } = useV2();
  const s = spaceById(params.spaceId);
  if (!s) return <Stub title="Not found" emoji="🤔" msg="That space is gone." />;
  const cat = params.cat;
  const rows = [];
  const eat = (sp) => sp.blocks.forEach((b) => {
    if ((b.kind === 'category' || b.kind === 'cost') && (b.category || b.name) === cat) b.dues.forEach((dd) => rows.push({ ...dd, spaceName: sp.name }));
  });
  eat(s); childrenOf(s).forEach(eat);
  (s.linkedSpaceIds || []).map(spaceById).filter(Boolean).forEach(eat);
  rows.sort((a, b) => parse(b.date) - parse(a.date));
  const total = rows.reduce((a, dd) => a + (dd.amount || 0), 0);
  return (
    <div className="v2-scroll">
      <Header title={cat} crumb={(s.name || '') + ' › History'} onBack={back} />
      <div className="px-4 py-4 space-y-3">
        <div className="card px-4 py-3"><p className="text-[10px] uppercase tracking-wide t-lo">Total · {cat}</p><p className="text-2xl font-bold t-accent">{fmt(total)}</p></div>
        {rows.length === 0
          ? <div className="card p-6 text-center text-[13px] t-mid">No {cat} entries yet.</div>
          : <div style={{ border: '.5px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>{rows.map((dd, i) => { const dt = parse(dd.date); return (
              <div key={dd.id || i} className="flex items-center gap-3 px-3 py-3" style={i > 0 ? { borderTop: '.5px solid var(--border)' } : undefined}>
                <div className="flex-1 min-w-0"><p className="text-[13px] t-hi truncate">{dd.label}</p><p className="text-[11px] t-lo">{dt.getDate()} {MNS[dt.getMonth()]} {dt.getFullYear()}{dd.spaceName !== s.name ? ' · ' + dd.spaceName : ''}</p></div>
                <p className="text-[13px] font-semibold t-hi">{fmt(dd.amount)}</p>
              </div>
            ); })}</div>}
        <div className="h-4" />
      </div>
    </div>
  );
}
function AddLinkedSpaceSheet({ nav, instituteId, onClose, onLinkExisting, only }) {
  const showRes = !only || only === 'residence', showClub = !only || only === 'club';
  const title = only === 'residence' ? 'Add a residence' : only === 'club' ? 'Add a club' : 'Add residence or club';
  return (
    <div className="v2-backdrop" onClick={onClose}>
      <div className="v2-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-1"><p className="font-bold t-hi flex-1">{title}</p><button className="text-[13px] t-mid" onClick={onClose}>Close</button></div>
        <p className="text-[12px] t-mid mb-3">Create a new one (tagged to this institute) or link one you already have.</p>
        <div className="space-y-2.5">
          {showRes && <button className="card w-full text-left p-3.5 flex items-center gap-3" onClick={() => { onClose(); nav('new-residence', { linkTo: instituteId }); }}><span className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#22c55e22' }}><Building2 size={20} color="#22c55e" /></span><div><p className="font-semibold t-hi text-[14px]">New residence</p><p className="text-[11px] t-mid">Hostel, mess, flat — rent + deposit</p></div></button>}
          {showClub && <button className="card w-full text-left p-3.5 flex items-center gap-3" onClick={() => { onClose(); nav('new-simple', { stype: 'club', linkTo: instituteId }); }}><span className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#ec489922' }}><Users size={20} color="#ec4899" /></span><div><p className="font-semibold t-hi text-[14px]">New club</p><p className="text-[11px] t-mid">Membership + event costs</p></div></button>}
          <button className="card w-full text-left p-3.5 flex items-center gap-3" onClick={onLinkExisting}><span className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-lg" style={{ background: 'var(--accent-light)' }}>🔗</span><div><p className="font-semibold t-hi text-[14px]">Link existing</p><p className="text-[11px] t-mid">Tag a residence/club you already made</p></div></button>
        </div>
      </div>
    </div>
  );
}
function LinkSpaceSheet({ instituteId, onClose }) {
  const { topSpaces, linkSpaceToInstitute, unlinkSpaceFromInstitute } = useV2();
  const cands = topSpaces().filter((sp) => (sp.type === 'residence' || sp.type === 'club') && sp.id !== instituteId);
  return (
    <div className="v2-backdrop" onClick={onClose}>
      <div className="v2-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-2"><p className="font-bold t-hi flex-1">Link a residence or club</p><button className="text-[13px] t-mid" onClick={onClose}>Close</button></div>
        <p className="text-[12px] t-mid mb-3">Tagged spaces roll their costs into this institute's totals — they stay independent.</p>
        {cands.length === 0
          ? <p className="text-[13px] t-mid text-center py-6">No residence or club spaces yet. Create one from Home first.</p>
          : <div style={{ border: '.5px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>{cands.map((sp, i) => {
              const linked = sp.linkedInstituteId === instituteId;
              return (
                <div key={sp.id} className="flex items-center gap-3 px-3 py-3" style={i > 0 ? { borderTop: '.5px solid var(--border)' } : undefined}>
                  <span className="text-lg shrink-0">{sp.icon}</span>
                  <div className="flex-1 min-w-0"><p className="text-[13px] font-semibold t-hi truncate">{sp.name}</p><p className="text-[10px] t-lo">{sp.type}{sp.linkedInstituteId && !linked ? ' · linked elsewhere' : ''}</p></div>
                  <button className={`minibtn ${linked ? 'btn-ghost' : 'btn-primary'}`} style={{ width: 'auto' }} onClick={() => (linked ? unlinkSpaceFromInstitute(sp.id) : linkSpaceToInstitute(sp.id, instituteId))}>{linked ? 'Linked' : 'Link'}</button>
                </div>
              );
            })}</div>}
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
  const [sheet, setSheet] = useState(params.openSheet || null);
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

/* ---------------- RESIDENCE / CLUB SYSTEM ---------------- */
function RentEngineBlock({ eng, onOpen, onPay, onPayBalance }) {
  const avail = Math.max(0, (eng.balance?.total || 0) - (eng.balance?.used || 0));
  const cur = eng.dues.find((d) => inMonth(parse(d.date)));
  const unpaid = cur && engRem(cur) > 0;
  const bword = (eng.balanceLabel || 'balance').split(' ')[0].toLowerCase();
  return (
    <div className="card p-3.5 flex flex-col">
      <button className="flex items-center gap-2 mb-2 text-left" onClick={onOpen}>
        <span className="text-lg">{eng.icon}</span>
        <div className="flex-1 min-w-0"><p className="font-semibold t-hi text-[14px] truncate">{eng.label}</p><p className="text-[11px] t-mid">{fmt(eng.amount)}/mo · due {eng.dueDay}</p></div>
        <ChevronRight size={15} className="t-lo" />
      </button>
      <div className="text-[11px] t-mid mb-1.5">{eng.balanceLabel}: <span className="t-hi font-medium">{fmt(avail)}</span> left</div>
      <div className="bar mb-2.5"><div style={{ height: '100%', width: ((eng.balance?.total || 0) > 0 ? (avail / eng.balance.total) * 100 : 0) + '%', background: 'var(--accent)', borderRadius: 999 }} /></div>
      {unpaid
        ? <div className="flex gap-1.5 mt-auto">
            <button className="minibtn st-paid" style={{ flex: 1 }} onClick={() => onPay(cur)}>Pay</button>
            <button className="minibtn btn-ghost" style={{ flex: 1, opacity: avail > 0 ? 1 : 0.5 }} disabled={avail <= 0} onClick={() => onPayBalance(cur)}>From {bword}</button>
          </div>
        : <p className="text-[11px] mt-auto" style={{ color: '#22c55e' }}>This month paid ✓</p>}
    </div>
  );
}
function OtherCostBlock({ spaceId, onAdd }) {
  const [open, setOpen] = useState(false);
  const [tag, setTag] = useState('');
  const [amt, setAmt] = useState('');
  const save = () => { const v = +amt; if (!tag.trim() || !(v > 0)) return; onAdd(spaceId, { name: tag.trim(), tag: tag.trim(), amount: v, date: iso(today()), paid: true, plan: 1 }); setTag(''); setAmt(''); setOpen(false); };
  return (
    <div className="card p-3.5 flex flex-col">
      <div className="flex items-center gap-2 mb-2"><span className="text-lg">🧾</span><p className="font-semibold t-hi text-[14px]">Other</p></div>
      <p className="text-[11px] t-mid mb-2">A tagged one-off cost.</p>
      {open ? (
        <div className="mt-auto space-y-1.5">
          <input className="field" style={{ padding: '.45rem .6rem' }} placeholder="tag (e.g. Annual fest)" value={tag} onChange={(e) => setTag(e.target.value)} autoFocus />
          <div className="flex gap-1.5">
            <input className="field" style={{ padding: '.45rem .6rem' }} type="number" placeholder="amount" value={amt} onChange={(e) => setAmt(e.target.value)} />
            <button className="minibtn btn-primary" style={{ width: 'auto' }} onClick={save}>Add</button>
          </div>
        </div>
      ) : <button className="minibtn btn-ghost mt-auto" onClick={() => setOpen(true)}>+ Add other</button>}
    </div>
  );
}
function SpaceDetailV2({ nav, back, params }) {
  const { spaceById, spaceDues, monthTotal, ensureRentEngine, addCost, payDue, payFromBalance } = useV2();
  const s = spaceById(params.spaceId);
  const isClub = s?.type === 'club';
  useEffect(() => { if (s) ensureRentEngine(s.id, isClub ? { label: 'Monthly fee', balanceLabel: 'Advance', icon: '🎟️' } : { label: 'Rent', balanceLabel: 'Security deposit', icon: '🏠' }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [s?.id]);
  if (!s) return <Stub title="Not found" emoji="🤔" msg="That space is gone." />;
  const eng = s.blocks.find((b) => b.kind === 'rentengine');
  const costBlocks = s.blocks.filter((b) => b.kind === 'cost');
  const crumb = s.linkedInstituteId ? (spaceById(s.linkedInstituteId)?.name || 'Home') : 'Home';
  const trackRows = [];
  if (eng) eng.dues.forEach((d) => trackRows.push({ d, from: eng }));
  costBlocks.forEach((b) => b.dues.forEach((d) => trackRows.push({ d, from: b })));
  trackRows.sort((a, b) => parse(b.d.date) - parse(a.d.date));
  return (
    <div className="v2-scroll">
      <Header title={`${s.icon || ''} ${s.name}`} crumb={crumb} onBack={back} />
      <div className="px-4 py-4 space-y-4">
        <div className="card px-4 py-3"><p className="text-[10px] uppercase tracking-wide t-lo">This month</p><p className="text-2xl font-bold t-accent">{fmt(monthTotal(spaceDues(s)))}</p></div>
        <div className="grid grid-cols-2 gap-3 items-stretch">
          {eng ? <RentEngineBlock eng={eng} onOpen={() => nav('rent-engine', { spaceId: s.id, blockId: eng.id })} onPay={(d) => payDue(d.id, engRem(d))} onPayBalance={(d) => payFromBalance(eng.id, d.id)} /> : <div className="card p-3 text-[12px] t-mid">Setting up…</div>}
          <OtherCostBlock spaceId={s.id} onAdd={addCost} />
        </div>
        <div>
          <h2 className="text-sm font-semibold t-hi mb-2">Costs</h2>
          {trackRows.length === 0
            ? <div className="card p-5 text-center text-[13px] t-mid">No costs tracked yet.</div>
            : <div style={{ border: '.5px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>{trackRows.slice(0, 80).map(({ d, from }, i) => { const dt = parse(d.date); const fromBal = (d.fromBalance || 0) > 0; const isEng = from.kind === 'rentengine'; return (
                <div key={d.id} className="flex items-center gap-3 px-3 py-3" style={i > 0 ? { borderTop: '.5px solid var(--border)' } : undefined}>
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0" style={{ background: 'var(--accent-light)' }}>{from.icon}</span>
                  <div className="flex-1 min-w-0"><p className="text-[13px] t-hi truncate">{d.label}</p><p className="text-[11px] t-lo">{dt.getDate()} {MNS[dt.getMonth()]} {dt.getFullYear()}{fromBal ? ' · from ' + (from.balanceLabel || 'balance').split(' ')[0].toLowerCase() : ''}</p></div>
                  <div className="text-right shrink-0"><p className="text-[13px] font-semibold t-hi">{fmt(d.amount)}</p>{isEng && engRem(d) <= 0 ? <span className="pill st-paid">Paid</span> : statusPill(d)}</div>
                </div>
              ); })}</div>}
        </div>
        <div className="h-4" />
      </div>
    </div>
  );
}
function RentMonthRow({ d, balanceLabel, avail, onPay, onUnpay, onAdjust, onPayBalance }) {
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState(d.amount);
  const dt = parse(d.date);
  const paid = engRem(d) <= 0;
  const fromBal = (d.fromBalance || 0) > 0;
  const bword = (balanceLabel || 'balance').split(' ')[0].toLowerCase();
  return (
    <div className="card p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] t-hi">{MNS[dt.getMonth()]} {dt.getFullYear()}</p>
          <p className="text-[11px] t-mid">{fmt(d.amount)}{fromBal ? ' · ' + fmt(d.fromBalance) + ' from ' + bword : ''}</p>
        </div>
        {paid ? <span className="pill st-paid shrink-0">Paid</span> : <span className="shrink-0">{statusPill(d)}</span>}
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {!paid && <button className="minibtn st-paid" onClick={onPay}>Mark paid</button>}
        {!paid && avail > 0 && <button className="minibtn btn-ghost" onClick={onPayBalance}>Pay from {bword}</button>}
        {paid && !fromBal && <button className="minibtn btn-ghost" onClick={onUnpay}>Unpay</button>}
        <button className="minibtn btn-ghost" onClick={() => { setV(d.amount); setEdit((x) => !x); }}>Adjust</button>
      </div>
      {edit && (
        <div className="flex gap-1.5 mt-2">
          <input className="field" type="number" value={v} onChange={(e) => setV(e.target.value)} autoFocus />
          <button className="minibtn btn-primary" style={{ width: 'auto' }} onClick={() => { onAdjust(v); setEdit(false); }}>Save</button>
        </div>
      )}
    </div>
  );
}
function RentEngine({ back, params }) {
  const { spaceById, blockById, setRentAmount, setRentBalance, setRentDueDay, payDue, unpayDue, updateDue, payFromBalance, extendRentMonths } = useV2();
  const s = spaceById(params.spaceId), b = blockById(params.blockId);
  if (!b) return <Stub title="Not found" emoji="🤔" msg="That engine is gone." />;
  const avail = Math.max(0, (b.balance?.total || 0) - (b.balance?.used || 0));
  return (
    <div className="v2-scroll">
      <Header title={b.label} crumb={(s?.name || '') + ' › ' + b.label} onBack={back} />
      <div className="px-4 py-4 space-y-4">
        <div className="card p-4 space-y-3">
          <p className="text-[10px] uppercase tracking-wide t-lo">Settings</p>
          <div className="flex items-center justify-between gap-3"><span className="text-[13px] t-mid">Monthly {b.label.toLowerCase()}</span><input className="field" style={{ maxWidth: 130, textAlign: 'right' }} type="number" defaultValue={b.amount || ''} onBlur={(e) => setRentAmount(b.id, e.target.value)} /></div>
          <div className="flex items-center justify-between gap-3"><span className="text-[13px] t-mid">{b.balanceLabel} total</span><input className="field" style={{ maxWidth: 130, textAlign: 'right' }} type="number" defaultValue={b.balance?.total || ''} onBlur={(e) => setRentBalance(b.id, e.target.value)} /></div>
          <div className="flex items-center justify-between gap-3"><span className="text-[13px] t-mid">Due day (1–28)</span><input className="field" style={{ maxWidth: 130, textAlign: 'right' }} type="number" defaultValue={b.dueDay || 1} onBlur={(e) => setRentDueDay(b.id, e.target.value)} /></div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-1"><p className="text-[10px] uppercase tracking-wide t-lo">{b.balanceLabel}</p><p className="text-[12px] t-mid">{fmt(avail)} of {fmt(b.balance?.total || 0)} left</p></div>
          <div className="bar"><div style={{ height: '100%', width: ((b.balance?.total || 0) > 0 ? (avail / b.balance.total) * 100 : 0) + '%', background: 'var(--accent)', borderRadius: 999 }} /></div>
        </div>
        <div>
          <h2 className="text-sm font-semibold t-hi mb-2">Months</h2>
          <div className="space-y-2">{b.dues.map((d) => <RentMonthRow key={d.id} d={d} balanceLabel={b.balanceLabel} avail={avail} onPay={() => payDue(d.id, engRem(d))} onUnpay={() => unpayDue(d.id)} onAdjust={(val) => updateDue(d.id, { amount: val })} onPayBalance={() => payFromBalance(b.id, d.id)} />)}</div>
          <button className="btn btn-ghost mt-2" onClick={() => extendRentMonths(b.id, 6)}>+ Add 6 more months</button>
        </div>
        <div className="h-4" />
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
    let dc = '#6366f1'; if (spend.some((dd) => engStatus(dd) === 'overdue')) dc = '#ef4444'; else if (spend.length && spend.every((dd) => engStatus(dd) === 'paid')) dc = '#22c55e';
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
                    <Tooltip cursor={{ fill: 'var(--pill-bg)' }} contentStyle={{ background: 'var(--card)', border: '.5px solid var(--border)', borderRadius: 6, fontSize: 12, color: 'var(--text1)' }} formatter={(v) => [fmt(v), 'Spent']} labelStyle={{ color: 'var(--text2)' }} />
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
function notifItems(dues, leadDays = 7) {
  const t = today(), horizon = new Date(t.getFullYear(), t.getMonth(), t.getDate() + (leadDays || 0));
  const overdue = [], soon = [];
  dues.filter((d) => !d.parked).forEach((d) => { if (engRem(d) <= 0) return; const st = statusOf(d); const dd = parse(d.date); if (st === 'overdue') overdue.push(d); else if (dd <= horizon) soon.push(d); });
  const byDate = (a, b) => parse(a.date) - parse(b.date);
  return { overdue: overdue.sort(byDate), soon: soon.sort(byDate) };
}
function NotifSheet({ onClose, leadDays = 7 }) {
  const { allDues, payDue } = useV2();
  const { overdue, soon } = notifItems(allDues(), leadDays);
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
// deterministic per-user avatar color (hash of name/handle) so people are visually distinct — no more everyone-green
const AVATAR_COLORS = ['#6366f1', '#ec4899', '#f97316', '#0ea5e9', '#8b5cf6', '#ef4444', '#14b8a6', '#f59e0b', '#10b981', '#d946ef', '#3b82f6', '#e11d48'];
const avatarColor = (name) => { const s = (name || 'S').toString().toLowerCase(); let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return AVATAR_COLORS[h % AVATAR_COLORS.length]; };
const fmtCount = (n) => { n = Number(n) || 0; if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'; if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K'; return String(n); };
function Avatar({ url, name, size = 36, ring = false }) {
  const initial = (name || 'S').toString().trim().charAt(0).toUpperCase() || 'S';
  const base = { width: size, height: size }; // 'ring' is intentionally a no-op — profile pictures stay borderless
  void ring;
  if (url) return <img src={url} alt="" className="rounded-full object-cover shrink-0 block" style={base} draggable={false} />;
  return <span className="rounded-full flex items-center justify-center text-white font-semibold shrink-0" style={{ ...base, background: avatarColor(name), fontSize: Math.round(size * 0.4) }}>{initial}</span>;
}
function ccToast(msg) {
  try {
    const el = document.createElement('div');
    el.textContent = msg;
    el.style.cssText = 'position:fixed;left:50%;bottom:96px;transform:translateX(-50%);max-width:80%;background:#15193C;color:#F2EFE6;border:1.5px solid rgba(255,255,255,.28);padding:.6rem 1rem;border-radius:11px;font-size:13px;font-weight:600;z-index:300;box-shadow:0 10px 30px rgba(0,0,0,.45);opacity:0;transition:opacity .25s;text-align:center;';
    document.body.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = '1'; });
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 280); }, 1900);
  } catch { /* noop */ }
}
function ReportSheet({ onClose, onSubmit }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => { if (busy) return; setBusy(true); await onSubmit(reason.trim()); setBusy(false); };
  return (
    <div className="v2-backdrop" onClick={onClose}>
      <div className="v2-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-2"><Flag size={16} className="t-mid" /><p className="font-bold t-hi flex-1">Report</p><button className="text-[13px] t-mid" onClick={onClose}>Close</button></div>
        <p className="text-[12px] t-mid mb-3">Tell us what's wrong (optional). Our team reviews every report.</p>
        <textarea className="field" rows={3} placeholder="Reason…" value={reason} onChange={(e) => setReason(e.target.value)} style={{ resize: 'none' }} autoFocus />
        <button className="btn btn-primary mt-3" disabled={busy} onClick={submit}>{busy ? 'Sending…' : 'Submit report'}</button>
      </div>
    </div>
  );
}
function FeedScreen({ nav, back, params }) {
  const { user } = useV2();
  const [handle, setHandle] = useState(() => { try { return localStorage.getItem(FEED_KEY) || ''; } catch { return ''; } });
  const [myAvatar, setMyAvatar] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [commentsFor, setCommentsFor] = useState(null);
  const [unread, setUnread] = useState({ dm: 0, other: 0 });
  const [storyView, setStoryView] = useState(null); // { groups, gi }
  const [storiesKey, setStoriesKey] = useState(0);
  useEffect(() => { // pull the server handle (covers other-device claims); silent if offline
    let on = true;
    getMyFeedProfile().then((r) => { if (on && r?.profile?.handle) { const hh = '@' + r.profile.handle; setHandle(hh); setMyAvatar(r.profile.avatarUrl || ''); try { localStorage.setItem(FEED_KEY, hh); } catch { /* ignore */ } } }).catch(() => {});
    return () => { on = false; };
  }, []);
  useEffect(() => { // unread badges — social (heart) vs texts (paper plane), refreshed every 45s
    let on = true;
    const pull = () => getFeedNotifications().then((r) => {
      if (!on) return;
      const fresh = (r?.notifications || []).filter((n) => !n.read);
      setUnread({ dm: fresh.filter((n) => n.type === 'dm').length, other: fresh.filter((n) => n.type !== 'dm').length });
    }).catch(() => {});
    pull();
    const id = setInterval(pull, 45000);
    window.addEventListener('cc-news-refresh', pull);
    return () => { on = false; clearInterval(id); window.removeEventListener('cc-news-refresh', pull); };
  }, []);
  if (!handle) return <FeedOnboard onDone={(h) => { try { localStorage.setItem(FEED_KEY, h); } catch { /* ignore */ } setHandle(h); }} />;
  const myHandle = handle.replace('@', '');
  // sub-pages ride the real router (history-aware): home · explore · messages · profile · edit-profile.
  // The open DM thread (params.dm) and viewed profile (params.user) live in params too, so they
  // survive reloads and the browser back button closes them one step at a time.
  const sub = params?.sub || 'home';
  const viewUser = params?.user || null;
  const dmOpen = params?.dm || null;
  const goSub = (s) => nav('feed', s === 'home' ? {} : { sub: s });
  const onComment = (p) => setCommentsFor(p);
  const onAuthor = (hh) => { setCommentsFor(null); nav('feed', { ...(params || {}), user: (hh || '').replace('@', '') }); };
  const openThread = (hh) => nav('feed', { ...(params || {}), dm: hh });
  const threadToProfile = (hh) => { const { dm, ...rest } = params || {}; nav('feed', { ...rest, user: (hh || '').replace('@', '') }); };
  const goEdit = () => nav('feed', { sub: 'edit-profile' });
  const openPost = async (pid) => { try { const r = await getFeedPost(pid); if (r?.post) setCommentsFor(r.post); } catch { ccToast('Post unavailable'); } };
  const openPosts = (hh, pid) => nav('feed', { sub: 'posts', pof: (hh || '').replace('@', ''), pid });
  const TITLES = { explore: 'Explore', messages: 'Messages', profile: 'Profile', notifications: 'Notifications', posts: 'Posts' };
  const ownHeader = sub === 'compose' || sub === 'edit-profile'; // these pages bring their own back+action bar
  const HeadIcon = ({ s, Icon, label, active }) => (
    <button onClick={() => goSub(s)} className="rounded-full flex items-center justify-center shrink-0" aria-label={label}
      style={{ width: 38, height: 38, background: active ? 'var(--accent)' : 'var(--pill-bg)', color: active ? 'var(--accent-text)' : 'var(--text2)', border: '.5px solid var(--border)', transition: 'background .15s, color .15s' }}>
      <Icon size={19} strokeWidth={2} />
    </button>
  );
  return (
    <div className="v2-scroll" style={{ overflowX: 'hidden', paddingBottom: ownHeader ? undefined : 156 }}>
      {/* sticky top bar — home: logo + breadcrumb + messages; sub-pages: back + title */}
      {!ownHeader && (
        <header className="px-4 py-3 flex items-center gap-2" style={{ position: 'sticky', top: 0, zIndex: 30, background: 'var(--nav-bg)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', borderBottom: '.5px solid var(--border)' }}>
          {sub === 'home' ? (
            <>
              <span className="flex items-center gap-2 flex-1 min-w-0">
                <Logo size={24} />
                <span className="text-[15px] t-serif truncate"><span className="t-mid">classcost</span><span className="t-lo"> › </span><span className="font-bold t-hi">feed</span></span>
              </span>
              <button onClick={() => goSub('messages')} className="relative rounded-full flex items-center justify-center shrink-0 t-mid" aria-label="Messages"
                style={{ width: 38, height: 38, background: 'var(--pill-bg)', border: '.5px solid var(--border)' }}>
                <Send size={18} strokeWidth={2} />
                {unread.dm > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: '#ef4444', animation: 'v2blink 1.2s ease-in-out infinite' }}>{unread.dm > 9 ? '9+' : unread.dm}</span>}
              </button>
            </>
          ) : (
            <>
              <button onClick={back} className="t-mid p-1 -ml-1 shrink-0" aria-label="Back to feed"><ChevronLeft size={22} /></button>
              <p className="font-bold t-hi t-serif text-[17px] flex-1">{TITLES[sub] || ''}</p>
            </>
          )}
        </header>
      )}

      {sub === 'home' && (
        <>
          <StoriesRail key={storiesKey} myAvatar={myAvatar} myName={user?.name || myHandle} onOpen={(gi, groups) => setStoryView({ groups, gi })} />
          <SuggestionsRow onOpenUser={onAuthor} />
          <FeedListPane reloadKey={reloadKey} onCompose={() => goSub('compose')} onComment={onComment} onAuthor={onAuthor} />
        </>
      )}
      {sub === 'explore' && <ExplorePane onOpenPost={onComment} onOpenUser={onAuthor} />}
      {sub === 'compose' && <ComposePage handle={handle} myAvatar={myAvatar} userName={user?.name || myHandle} onBack={back} onPosted={() => { setReloadKey((k) => k + 1); nav('feed', {}); }} />}
      {sub === 'messages' && <DMPane active reloadKey={reloadKey} onOpenThread={openThread} />}
      {sub === 'notifications' && <NotificationsPane onSeen={() => setUnread((u) => ({ ...u, other: 0 }))} onOpenUser={onAuthor} onOpenThread={openThread} onOpenPost={openPost} />}
      {sub === 'profile' && <FeedProfileView handle={myHandle} embedded onComment={onComment} onAuthor={onAuthor} onMessage={openThread} onEdit={goEdit} onOpenPosts={openPosts} />}
      {sub === 'posts' && <UserPostsPage handle={params?.pof || myHandle} focusId={params?.pid} onComment={onComment} onAuthor={onAuthor} />}
      {sub === 'edit-profile' && <EditProfilePage myHandle={myHandle} onBack={back} onSaved={(p) => { setMyAvatar(p?.avatarUrl || ''); back(); }} />}

      {/* secondary footer — off-white bar with side borders; persistent feed navigation */}
      {!ownHeader && (
        <div className="v2-feedfooter">
          <div className="flex items-center justify-center gap-8 py-2.5" style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', borderTop: '.5px solid var(--border)', borderLeft: '.5px solid var(--border)', borderRight: '.5px solid var(--border)' }}>
            <HeadIcon s="home" Icon={HomeIcon} label="Feed home" active={sub === 'home'} />
            <HeadIcon s="explore" Icon={Compass} label="Explore" active={sub === 'explore'} />
            <HeadIcon s="compose" Icon={Plus} label="New post" />
            <button onClick={() => goSub('notifications')} className="relative rounded-full flex items-center justify-center shrink-0" aria-label="Notifications"
              style={{ width: 38, height: 38, background: sub === 'notifications' ? 'var(--accent)' : 'var(--pill-bg)', color: sub === 'notifications' ? 'var(--accent-text)' : 'var(--text2)', border: '.5px solid var(--border)', transition: 'background .15s, color .15s' }}>
              <Heart size={19} strokeWidth={2} />
              {unread.other > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: '#ef4444' }}>{unread.other > 9 ? '9+' : unread.other}</span>}
            </button>
            <button onClick={() => goSub('profile')} className="shrink-0" aria-label="Your profile"
              style={(sub === 'profile' || sub === 'edit-profile') ? { outline: '2px solid var(--accent)', outlineOffset: 2, borderRadius: 999 } : undefined}>
              <Avatar url={myAvatar} name={user?.name || myHandle} size={38} />
            </button>
          </div>
        </div>
      )}

      {commentsFor && <FeedComments post={commentsFor} onClose={() => setCommentsFor(null)} onAuthor={onAuthor} />}
      {viewUser && <FeedProfileView handle={viewUser} onClose={back} onComment={onComment} onAuthor={onAuthor} onMessage={openThread} onEdit={goEdit} onOpenPosts={openPosts} />}
      {dmOpen && <DMThread handle={dmOpen} onClose={back} onSent={() => setReloadKey((k) => k + 1)} onProfile={threadToProfile} />}
      {storyView && <StoryViewer groups={storyView.groups} start={storyView.gi} onClose={() => setStoryView(null)} onChanged={() => { setStoryView(null); setStoriesKey((k) => k + 1); }} />}
    </div>
  );
}
function SuggestionsRow({ onOpenUser }) {
  const [users, setUsers] = useState(null);
  useEffect(() => {
    let on = true;
    getSuggestions().then((r) => { if (on) setUsers(r?.users || []); }).catch(() => { if (on) setUsers([]); });
    return () => { on = false; };
  }, []);
  const follow = async (h) => {
    setUsers((us) => (us || []).map((u) => (u.handle === h ? { ...u, isFollowing: true } : u)));
    try { await followUser(h); } catch { setUsers((us) => (us || []).map((u) => (u.handle === h ? { ...u, isFollowing: false } : u))); }
  };
  if (!users || users.length === 0) return null;
  return (
    <div style={{ borderBottom: '.5px solid var(--border)' }}>
      <p className="px-4 pt-3 text-[11px] uppercase tracking-wide t-lo font-semibold">suggested for you</p>
      <div className="v2-stories flex gap-3 overflow-x-auto px-4 py-3">
        {users.map((u, i) => (
          <motion.div key={u.handle} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.05, type: 'spring', stiffness: 380, damping: 28 }}
            className="flex flex-col items-center shrink-0 px-3 py-3" style={{ width: 132, border: '.5px solid var(--border)', borderRadius: 6, background: 'var(--card)' }}>
            <button onClick={() => onOpenUser(u.handle)} style={{ background: 'none', border: 'none' }} aria-label={`Open @${u.handle}`}>
              <Avatar url={u.avatarUrl} name={u.displayName || u.handle} size={56} />
            </button>
            <p className="text-[12.5px] font-semibold t-hi truncate mt-2" style={{ maxWidth: 110 }}>{u.displayName || ('@' + u.handle)}</p>
            <p className="text-[10.5px] t-lo truncate" style={{ maxWidth: 110 }}>{u.institute ? `🎓 ${u.institute}` : '@' + u.handle}</p>
            <button className={`minibtn mt-2 ${u.isFollowing ? 'btn-ghost' : 'btn-primary'}`} style={{ width: '100%', padding: '.42rem 0' }} onClick={() => !u.isFollowing && follow(u.handle)}>
              {u.isFollowing ? 'Following' : 'Follow'}
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
function StoriesRail({ myAvatar, myName, onOpen }) {
  const [groups, setGroups] = useState(null);
  const [upBusy, setUpBusy] = useState(false);
  const fileRef = useRef(null);
  useEffect(() => {
    let on = true;
    listStories().then((r) => { if (on) setGroups(r?.groups || []); }).catch(() => { if (on) setGroups([]); });
    return () => { on = false; };
  }, []);
  const pick = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (!f.type.startsWith('image/')) { ccToast('Pick an image'); return; }
    setUpBusy(true);
    try { const r = await uploadFeedImage(f); await createStory(r.url); ccToast('Story added'); const fresh = await listStories(); setGroups(fresh?.groups || []); }
    catch { ccToast('Could not add the story'); }
    finally { setUpBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  };
  const ring = (active) => ({ display: 'inline-flex', padding: 3, borderRadius: 999, background: active ? 'linear-gradient(45deg, #0A143F, #0ea5e9, #8b5cf6)' : 'var(--pill-bg)' });
  const inner = { display: 'inline-flex', padding: 2, borderRadius: 999, background: 'var(--bg)' };
  const mine = (groups || []).find((g) => g.isMe);
  const others = (groups || []).filter((g) => !g.isMe);
  return (
    <div className="v2-stories flex gap-4 overflow-x-auto px-4 py-3" style={{ borderBottom: '.5px solid var(--border)' }}>
      <button className="flex flex-col items-center gap-1 shrink-0" style={{ background: 'none', border: 'none' }}
        onClick={() => (mine ? onOpen(groups.indexOf(mine), groups) : fileRef.current?.click())} aria-label={mine ? 'View your story' : 'Add a story'}>
        <span className="relative">
          <span style={ring(!!mine)}><span style={inner}><Avatar url={myAvatar} name={myName} size={54} /></span></span>
          <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full flex items-center justify-center font-bold" style={{ background: 'var(--accent)', color: 'var(--accent-text)', border: '2px solid var(--bg)', fontSize: 13, lineHeight: 1 }}
            onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}>+</span>
        </span>
        <span className="text-[10.5px] t-mid">{upBusy ? 'uploading…' : 'your story'}</span>
      </button>
      {(groups === null ? [0, 1, 2] : []).map((i) => (
        <span key={i} className="flex flex-col items-center gap-1 shrink-0"><span className="v2-skel rounded-full" style={{ width: 64, height: 64 }} /><span className="v2-skel rounded" style={{ width: 44, height: 8 }} /></span>
      ))}
      {others.map((g) => (
        <button key={g.handle} onClick={() => onOpen(groups.indexOf(g), groups)} className="flex flex-col items-center gap-1 shrink-0" style={{ background: 'none', border: 'none' }}>
          <span style={ring(true)}><span style={inner}><Avatar url={g.avatarUrl} name={g.displayName || g.handle} size={54} /></span></span>
          <span className="text-[10.5px] t-mid truncate" style={{ maxWidth: 64 }}>{g.displayName || ('@' + g.handle)}</span>
        </button>
      ))}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pick} />
    </div>
  );
}
function StoryViewer({ groups, start, onClose, onChanged }) {
  const [gi, setGi] = useState(start);
  const [si, setSi] = useState(0);
  const g = groups[gi];
  const s = g?.stories?.[si];
  useEffect(() => { // auto-advance every 5s
    if (!s) return;
    const t = setTimeout(() => nextStory(), 5000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gi, si]);
  useEffect(() => { if (!g || !s) onClose(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [g, s]);
  if (!g || !s) return null;
  const nextStory = () => {
    if (si < g.stories.length - 1) setSi(si + 1);
    else if (gi < groups.length - 1) { setGi(gi + 1); setSi(0); }
    else onClose();
  };
  const prevStory = () => {
    if (si > 0) setSi(si - 1);
    else if (gi > 0) { setGi(gi - 1); setSi(groups[gi - 1].stories.length - 1); }
  };
  const removeStory = async () => {
    try { await deleteStory(s.id); ccToast('Story deleted'); onChanged && onChanged(); }
    catch { ccToast('Could not delete'); }
  };
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center" style={{ background: '#000' }}>
      <div className="relative w-full h-full" style={{ maxWidth: 480, margin: '0 auto' }}>
        {/* progress segments */}
        <div className="absolute top-2 left-2 right-2 z-10 flex gap-1">
          {g.stories.map((x, i) => (
            <div key={x.id} className="flex-1 rounded-full overflow-hidden" style={{ height: 2.5, background: 'rgba(255,255,255,.3)' }}>
              {i < si ? <div style={{ width: '100%', height: '100%', background: '#fff' }} />
                : i === si ? <div key={`${gi}-${si}`} style={{ height: '100%', background: '#fff', animation: 'v2storybar 5s linear forwards' }} /> : null}
            </div>
          ))}
        </div>
        {/* header */}
        <div className="absolute top-5 left-3 right-3 z-10 flex items-center gap-2.5">
          <Avatar url={g.avatarUrl} name={g.displayName || g.handle} size={34} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold truncate" style={{ color: '#fff' }}>{g.displayName || ('@' + g.handle)}</p>
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,.7)' }}>{timeAgo(s.createdAt)}</p>
          </div>
          {g.isMe && <button className="p-1.5" style={{ color: 'rgba(255,255,255,.85)', background: 'none', border: 'none' }} onClick={removeStory} aria-label="Delete story"><Trash2 size={18} /></button>}
          <button className="p-1.5 text-[20px] leading-none" style={{ color: '#fff', background: 'none', border: 'none' }} onClick={onClose} aria-label="Close">✕</button>
        </div>
        {/* image + tap zones */}
        <img src={s.imageUrl} alt="" className="absolute inset-0 w-full h-full select-none" style={{ objectFit: 'contain' }} draggable={false} />
        <button className="absolute left-0 top-0 bottom-0 z-[5]" style={{ width: '33%', background: 'none', border: 'none' }} onClick={prevStory} aria-label="Previous" />
        <button className="absolute right-0 top-0 bottom-0 z-[5]" style={{ width: '67%', background: 'none', border: 'none' }} onClick={nextStory} aria-label="Next" />
      </div>
    </div>
  );
}
function NotificationsPane({ onSeen, onOpenUser, onOpenThread, onOpenPost }) {
  const [st, setSt] = useState({ loading: true, items: [] });
  useEffect(() => {
    let on = true;
    getFeedNotifications()
      .then((r) => {
        if (on) setSt({ loading: false, items: (r?.notifications || []).filter((n) => n.type !== 'dm') }); // texts blink on the paper plane instead
        markNotificationsRead(['like', 'comment', 'follow', 'follow_post']).then(() => { onSeen && onSeen(); try { window.dispatchEvent(new CustomEvent('cc-news-refresh')); } catch { /* noop */ } }).catch(() => {});
      })
      .catch(() => { if (on) setSt({ loading: false, items: [] }); });
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const LABEL = { like: 'liked your post', comment: 'commented', dm: 'sent you a message', follow_post: 'shared a new post', follow: 'started following you' };
  const open = (n) => {
    if (!n.handle) return;
    if (n.type === 'dm') onOpenThread('@' + n.handle);
    else if (n.postId) onOpenPost(n.postId);
    else onOpenUser(n.handle);
  };
  return (
    <div className="px-4 py-2">
      {st.loading ? (
        <div className="space-y-1 pt-2">{[0, 1, 2, 3].map((i) => <div key={i} className="flex items-center gap-3 py-2"><div className="v2-skel rounded-full shrink-0" style={{ width: 42, height: 42 }} /><div className="flex-1"><div className="v2-skel rounded" style={{ height: 10, width: '70%', marginBottom: 6 }} /><div className="v2-skel rounded" style={{ height: 8, width: '30%' }} /></div></div>)}</div>
      ) : st.items.length === 0 ? (
        <div className="py-16 text-center">
          <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: 'var(--accent-light)' }}><Bell size={22} className="t-accent" /></div>
          <p className="font-semibold t-hi mb-1">nothing yet</p>
          <p className="text-[13px] t-mid">likes, comments, messages and new posts land here.</p>
        </div>
      ) : st.items.map((n, i) => (
        <motion.button key={n.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.035, type: 'spring', stiffness: 380, damping: 28 }} whileTap={{ scale: 0.98 }}
          className="w-full text-left flex items-center gap-3 py-2.5" style={{ background: 'none', border: 'none' }} onClick={() => open(n)}>
          <span className="relative shrink-0">
            <Avatar url={n.avatarUrl} name={n.displayName || n.handle} size={42} ring />
            {!n.read && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full" style={{ background: '#ef4444', border: '2px solid var(--bg)' }} />}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] t-hi" style={{ lineHeight: 1.35 }}>
              <span className="font-semibold">{n.displayName || ('@' + (n.handle || 'someone'))}</span> {LABEL[n.type] || 'did something'}
              {n.text ? <span className="t-mid">{': '}&ldquo;{n.text}&rdquo;</span> : ''}
            </p>
            <p className="text-[11px] t-lo mt-0.5">{timeAgo(n.createdAt)}</p>
          </div>
        </motion.button>
      ))}
    </div>
  );
}
function UserPostsPage({ handle, focusId, onComment, onAuthor }) {
  const [posts, setPosts] = useState(null);
  const focusRef = useRef(null);
  useEffect(() => {
    let on = true; setPosts(null);
    getUserPosts(handle).then((r) => { if (on) setPosts(r?.posts || []); }).catch(() => { if (on) setPosts([]); });
    return () => { on = false; };
  }, [handle]);
  useEffect(() => { // land on the tapped post, IG-style
    if (posts && posts.length && focusRef.current) focusRef.current.scrollIntoView({ block: 'start' });
  }, [posts]);
  if (!posts) return (
    <div>
      {[0, 1].map((i) => (
        <div key={i} className="pt-3 pb-4" style={{ borderBottom: '.5px solid var(--border)' }}>
          <div className="px-4 flex items-center gap-2.5 mb-3">
            <div className="v2-skel rounded-full shrink-0" style={{ width: 38, height: 38 }} />
            <div className="flex-1"><div className="v2-skel rounded" style={{ height: 10, width: '38%', marginBottom: 7 }} /><div className="v2-skel rounded" style={{ height: 8, width: '22%' }} /></div>
          </div>
          <div className="v2-skel" style={{ aspectRatio: '1 / 1' }} />
        </div>
      ))}
    </div>
  );
  if (!posts.length) return <div className="py-16 text-center text-[13px] t-mid">No posts here.</div>;
  return (
    <div>
      {posts.map((p) => (
        <div key={p.id} ref={p.id === focusId ? focusRef : undefined} style={{ scrollMarginTop: 56 }}>
          <FeedPostCard p={p} onComment={onComment} onAuthor={onAuthor} onDeleted={(id) => setPosts((ps) => (ps || []).filter((x) => x.id !== id))} />
        </div>
      ))}
    </div>
  );
}
function ExplorePane({ onOpenPost, onOpenUser }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null); // null = browsing the grid
  const [st, setSt] = useState({ loading: true, posts: [] });
  const cursorRef = useRef(null);
  const loadingRef = useRef(false);
  const sentinel = useRef(null);
  useEffect(() => {
    let on = true;
    listFeedPosts().then((r) => { if (on) { cursorRef.current = r?.nextCursor || null; setSt({ loading: false, posts: r?.posts || [] }); } })
      .catch(() => { if (on) setSt({ loading: false, posts: [] }); });
    return () => { on = false; };
  }, []);
  useEffect(() => { // debounced people search
    const term = q.trim().replace('@', '');
    if (!term) { setResults(null); return; }
    const t = setTimeout(() => { searchUsers(term).then((r) => setResults(r?.users || [])).catch(() => setResults([])); }, 250);
    return () => clearTimeout(t);
  }, [q]);
  const loadMore = async () => {
    if (loadingRef.current || !cursorRef.current) return;
    loadingRef.current = true;
    try { const r = await listFeedPosts(cursorRef.current); cursorRef.current = r?.nextCursor || null; setSt((s) => ({ ...s, posts: [...s.posts, ...(r?.posts || [])] })); }
    catch { /* ignore */ } finally { loadingRef.current = false; }
  };
  useEffect(() => {
    const node = sentinel.current; if (!node) return;
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) loadMore(); }, { rootMargin: '400px' });
    io.observe(node); return () => io.disconnect();
  }, [st.posts.length, results]);
  const tiles = st.posts.filter((p) => p.imageUrl);
  return (
    <div>
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-2" style={{ padding: '.6rem .9rem', borderRadius: 999, border: '.5px solid var(--border)', background: 'var(--card)' }}>
          <Search size={15} className="t-lo shrink-0" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search people…" className="flex-1 min-w-0 text-[14px] t-hi" style={{ border: 'none', outline: 'none', background: 'transparent', color: 'var(--text1)' }} />
          {q && <button className="t-lo text-[12px] shrink-0" onClick={() => setQ('')}>clear</button>}
        </div>
      </div>
      {results !== null ? (
        <div className="px-4 py-1">
          {results.length === 0
            ? <p className="text-[13px] t-mid text-center py-10">no one found for “{q.trim()}”</p>
            : results.map((u) => <FeedUserRow key={u.handle} u={u} onOpen={onOpenUser} />)}
        </div>
      ) : st.loading ? (
        <div className="grid grid-cols-3" style={{ gap: 2 }}>
          {Array.from({ length: 9 }).map((_, i) => <div key={i} className="v2-skel" style={{ aspectRatio: '1 / 1' }} />)}
        </div>
      ) : tiles.length === 0 ? (
        <div className="py-16 text-center"><div className="text-4xl mb-2">🧭</div><p className="font-semibold t-hi mb-1">{st.posts.length ? 'no photos yet' : 'nothing to explore yet'}</p><p className="text-[13px] t-mid">{st.posts.length ? 'text posts live on the feed — photos show up here.' : 'photos people post will show up here.'}</p></div>
      ) : (
        <>
          <div className="grid grid-cols-3" style={{ gap: 2 }}>
            {tiles.map((p) => (
              <button key={p.id} onClick={() => onOpenPost(p)} className="relative block overflow-hidden" style={{ aspectRatio: '1 / 1', background: 'var(--pill-bg)', padding: 0, border: 0 }} aria-label="Open post">
                <img src={p.imageUrl} alt="" loading="lazy" className="block" style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />
              </button>
            ))}
          </div>
          {cursorRef.current && <div ref={sentinel} className="py-4" />}
        </>
      )}
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
function FeedProfileView({ handle, onClose, embedded, onComment, onAuthor, onMessage, onEdit, onOpenPosts }) {
  const h = (handle || '').replace('@', '');
  const { topSpaces } = useV2();
  const [prof, setProf] = useState(null);
  const [posts, setPosts] = useState(null);
  const [err, setErr] = useState('');
  const [following, setFollowing] = useState(false);
  const [fBusy, setFBusy] = useState(false);
  const [followsOpen, setFollowsOpen] = useState(null); // 'followers' | 'following' | null
  useEffect(() => {
    let on = true; setErr(''); setProf(null); setPosts(null); setFollowsOpen(null);
    getFeedProfile(h).then((r) => { if (on) { setProf(r); setFollowing(!!r.isFollowing); } }).catch((x) => { if (on) setErr(x.message || 'offline'); });
    getUserPosts(h).then((r) => { if (on) setPosts(r?.posts || []); }).catch(() => { if (on) setPosts([]); });
    return () => { on = false; };
  }, [h]);
  useEffect(() => { // auto-adopt the user's academic institute (school/college/university — never coaching), once
    if (!prof?.isMe || prof?.institute) return;
    let done = false; try { done = localStorage.getItem('cc_inst_adopted') === '1'; } catch { /* ignore */ }
    if (done) return;
    const elig = (topSpaces() || []).filter((s) => s.type === 'institute' && s.system?.env !== 'coaching');
    if (!elig.length) return;
    updateMyProfile({ handle: prof.handle, institute: elig[0].name })
      .then(() => { setProf((c) => (c ? { ...c, institute: elig[0].name } : c)); try { localStorage.setItem('cc_inst_adopted', '1'); } catch { /* ignore */ } })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prof]);
  const toggleFollow = async () => {
    if (fBusy) return; setFBusy(true); const next = !following; setFollowing(next);
    try { next ? await followUser(h) : await unfollowUser(h); } catch { setFollowing(!next); } finally { setFBusy(false); }
  };
  const initial = ((prof?.displayName || h || 'S').charAt(0) || 'S').toUpperCase();
  const counts = prof?.counts || {};
  const gridIcon = (active = true) => (
    <span style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 4px)', gridAutoRows: '4px', gap: 2, opacity: active ? 1 : 0.4 }}>
      {Array.from({ length: 9 }).map((_, i) => <span key={i} style={{ width: 4, height: 4, background: 'currentColor', borderRadius: 1 }} />)}
    </span>
  );
  const body = (
    <div className="pt-3 pb-2">
      {/* avatar + stats */}
      <div className="px-4 flex items-center gap-5 mb-3">
        <Avatar url={prof?.avatarUrl} name={prof?.displayName || h} size={86} ring />
        <div className="flex-1 flex items-center justify-around text-center">
          {[[counts.posts ?? 0, 'posts'], [counts.followers ?? 0, 'followers'], [counts.following ?? 0, 'following']].map(([n, l]) => (
            <button key={l} onClick={() => (l === 'posts' ? undefined : setFollowsOpen(l))} style={{ background: 'none', border: 'none', cursor: l === 'posts' ? 'default' : 'pointer' }}>
              <p className="font-bold t-hi text-[18px] leading-none">{fmtCount(n)}</p><p className="text-[12px] t-mid mt-1">{l}</p>
            </button>
          ))}
        </div>
      </div>
      {/* name + bio */}
      <div className="px-4 mb-3">
        <p className="font-semibold t-hi text-[14px] leading-tight">{prof?.displayName || ('@' + h)}</p>
        {prof?.displayName && <p className="text-[12px] t-lo">@{h}</p>}
        {prof?.institute && <p className="text-[12.5px] t-mid mt-0.5">🎓 {prof.institute}</p>}
        {prof?.bio && <p className="text-[13px] t-hi mt-1" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{prof.bio}</p>}
        {prof?.isMe && !prof?.bio && <button className="text-[13px] t-accent mt-1 font-medium" onClick={onEdit}>+ Add a bio</button>}
      </div>
      {/* actions */}
      {prof && (
        <div className="px-4 flex gap-2 mb-4">
          {prof.isMe
            ? <button className="btn btn-ghost flex-1" style={{ padding: '.5rem' }} onClick={onEdit}>Edit profile</button>
            : (<>
                <button className={`btn flex-1 ${following ? 'btn-ghost' : 'btn-primary'}`} style={{ padding: '.5rem' }} onClick={toggleFollow}>{following ? 'Following' : 'Follow'}</button>
                {onMessage && <button className="btn btn-ghost flex-1" style={{ padding: '.5rem' }} onClick={() => onMessage('@' + h)}>Message</button>}
              </>)}
        </div>
      )}
      {/* divider above the grid (tab icon removed — only one content type) */}
      <div style={{ borderTop: '.5px solid var(--border)' }} />
      {/* post grid */}
      {err
        ? <div className="card p-6 text-center mx-4 mt-3"><div className="text-3xl mb-2">🐣</div><p className="text-[13px] t-mid">{import.meta.env.DEV ? 'Your feed profile lives on the server — it fills in once the backend is connected.' : "Couldn't load posts right now — try again in a moment."}</p></div>
        : !posts ? <div className="py-12 text-center text-[13px] t-mid">Loading…</div>
        : posts.length === 0 ? <div className="py-14 text-center"><span className="inline-block t-lo mb-2">{gridIcon(true)}</span><p className="text-[13px] t-mid">No posts yet.</p></div>
        : (
          <div className="grid grid-cols-3" style={{ gap: 2 }}>
            {posts.map((p) => (
              <button key={p.id} onClick={() => (onOpenPosts ? onOpenPosts(h, p.id) : onComment && onComment(p))} className="relative block overflow-hidden" style={{ aspectRatio: '1 / 1', background: 'var(--pill-bg)', padding: 0, border: 0 }}>
                {p.imageUrl
                  ? <img src={p.imageUrl} alt="" className="block" style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />
                  : <span className="absolute inset-0 flex items-center justify-center text-center p-2 text-[11px] font-medium t-hi" style={{ lineHeight: 1.3, overflow: 'hidden' }}>{p.text}</span>}
              </button>
            ))}
          </div>
        )}
      <div className="h-4" />
      {followsOpen && <FollowsSheet handle={h} initial={followsOpen} onClose={() => setFollowsOpen(null)} onOpenUser={(hh) => { setFollowsOpen(null); onAuthor && onAuthor(hh); }} />}
    </div>
  );
  if (embedded) return body;
  return (
    <div className="fixed z-[45] overflow-y-auto" style={{ inset: 0, background: 'var(--bg)' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100%', borderLeft: '.5px solid var(--border)', borderRight: '.5px solid var(--border)' }}>
        <Header title={'@' + h} onBack={onClose} />
        {body}
      </div>
    </div>
  );
}
function FollowsSheet({ handle, initial, onClose, onOpenUser }) {
  const [tab, setTab] = useState(initial); // 'followers' | 'following'
  const [lists, setLists] = useState({ followers: null, following: null });
  useEffect(() => {
    let on = true;
    if (lists[tab] !== null) return undefined;
    (tab === 'followers' ? getFollowers(handle) : getFollowing(handle))
      .then((r) => { if (on) setLists((s) => ({ ...s, [tab]: r?.users || [] })); })
      .catch(() => { if (on) setLists((s) => ({ ...s, [tab]: [] })); });
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, handle]);
  const cur = lists[tab];
  return (
    <div className="fixed z-[55] overflow-y-auto" style={{ inset: 0, background: 'var(--bg)' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100%', borderLeft: '.5px solid var(--border)', borderRight: '.5px solid var(--border)' }}>
        <div className="px-3 py-2.5 flex items-center gap-1.5" style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--nav-bg)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', borderBottom: '.5px solid var(--border)' }}>
          <button onClick={onClose} className="p-1.5 t-mid" aria-label="Back" style={{ background: 'none', border: 'none' }}><ChevronLeft size={20} /></button>
          <p className="font-bold t-hi t-serif text-[16px] flex-1">@{handle}</p>
        </div>
        <div className="flex" style={{ borderBottom: '.5px solid var(--border)' }}>
          {['followers', 'following'].map((t) => (
            <button key={t} onClick={() => setTab(t)} className="flex-1 py-2.5 text-[13px] font-semibold capitalize"
              style={{ background: 'none', border: 'none', color: tab === t ? 'var(--text1)' : 'var(--text3)', borderBottom: tab === t ? '1.5px solid var(--text1)' : '1.5px solid transparent' }}>
              {t}
            </button>
          ))}
        </div>
        <div className="px-4 py-2">
          {cur === null
            ? <div className="space-y-1 pt-2">{[0, 1, 2].map((i) => <div key={i} className="flex items-center gap-3 py-2"><div className="v2-skel rounded-full shrink-0" style={{ width: 40, height: 40 }} /><div className="flex-1"><div className="v2-skel rounded" style={{ height: 10, width: '45%', marginBottom: 6 }} /><div className="v2-skel rounded" style={{ height: 8, width: '28%' }} /></div></div>)}</div>
            : cur.length === 0
              ? <p className="text-[13px] t-mid text-center py-12">{tab === 'followers' ? 'no followers yet.' : 'not following anyone yet.'}</p>
              : cur.map((u) => <FeedUserRow key={u.handle} u={u} onOpen={onOpenUser} />)}
        </div>
      </div>
    </div>
  );
}
function EditProfilePage({ myHandle, onBack, onSaved }) {
  const { topSpaces } = useV2();
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [institute, setInstitute] = useState('');
  const [busy, setBusy] = useState(false);
  const [upBusy, setUpBusy] = useState(false);
  const fileRef = useRef(null);
  // academic institutes only — school/college/university; coaching never qualifies
  const eligible = (topSpaces() || []).filter((s) => s.type === 'institute' && s.system?.env !== 'coaching').map((s) => s.name);
  const options = institute && !eligible.includes(institute) ? [institute, ...eligible] : eligible;
  useEffect(() => {
    let on = true;
    getFeedProfile(myHandle).then((r) => { if (on) { setName(r?.displayName || ''); setBio(r?.bio || ''); setAvatar(r?.avatarUrl || ''); setInstitute(r?.institute || ''); setLoaded(true); } })
      .catch(() => { if (on) setLoaded(true); });
    return () => { on = false; };
  }, [myHandle]);
  const pick = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (!f.type.startsWith('image/')) { ccToast('Pick an image'); return; }
    setUpBusy(true);
    try { const r = await uploadFeedImage(f); setAvatar(r.url); } catch { ccToast('Upload failed — is the server live?'); } finally { setUpBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  };
  const save = async () => {
    if (busy) return; setBusy(true);
    try {
      const r = await updateMyProfile({ handle: myHandle, displayName: name.trim(), bio: bio.trim(), avatarUrl: avatar, institute });
      try { localStorage.setItem('cc_inst_adopted', '1'); } catch { /* ignore */ } // manual save wins — stop auto-adopting
      ccToast('Profile updated'); onSaved && onSaved(r?.profile);
    } catch (x) { ccToast(x.message || 'Could not save'); } finally { setBusy(false); }
  };
  return (
    <div>
      <div className="px-4 py-3 flex items-center gap-2" style={{ position: 'sticky', top: 0, zIndex: 30, background: 'var(--nav-bg)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', borderBottom: '.5px solid var(--border)' }}>
        <button onClick={onBack} className="t-mid p-1 -ml-1" aria-label="Back"><ChevronLeft size={20} /></button>
        <p className="font-bold t-hi flex-1">Edit profile</p>
        <button className="minibtn btn-primary" style={{ padding: '.45rem 1rem' }} disabled={busy || upBusy || !loaded} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
      <div className="px-4 py-6 flex flex-col items-center">
        <button onClick={() => fileRef.current?.click()} className="relative" aria-label="Change photo">
          <Avatar url={avatar} name={name || myHandle} size={96} ring />
          <span className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--accent)', color: 'var(--accent-text)', border: '2px solid var(--bg)' }}><Camera size={15} /></span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pick} />
        <button className="text-[13px] t-accent font-medium mt-3" onClick={() => fileRef.current?.click()}>{upBusy ? 'Uploading…' : 'Change photo'}</button>
      </div>
      <div className="px-4 space-y-4 pb-10" style={{ maxWidth: 420, margin: '0 auto' }}>
        <div>
          <label className="text-[11px] uppercase tracking-wide t-lo">Display name</label>
          <input className="field mt-1" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        </div>
        <div>
          <div className="flex items-baseline justify-between"><label className="text-[11px] uppercase tracking-wide t-lo">Bio</label><span className="text-[11px] t-lo">{bio.length}/200</span></div>
          <textarea className="field mt-1" rows={4} placeholder="say something about you…" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={200} style={{ resize: 'none' }} />
        </div>
        {(options.length > 0) && (
          <div>
            <label className="text-[11px] uppercase tracking-wide t-lo">Institute</label>
            <select className="field mt-1" value={institute} onChange={(e) => setInstitute(e.target.value)}>
              <option value="">none</option>
              {options.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <p className="text-[11px] t-lo mt-1">from your ClassCost institutes — schools, colleges & universities only.</p>
          </div>
        )}
        <div>
          <label className="text-[11px] uppercase tracking-wide t-lo">Handle</label>
          <div className="field mt-1 t-mid" style={{ cursor: 'default', userSelect: 'none' }}>@{myHandle}</div>
        </div>
        <button className="btn btn-primary" disabled={busy || upBusy || !loaded} onClick={save}>{busy ? 'Saving…' : 'Save changes'}</button>
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
    catch (x) { ccToast(x.message || 'Could not comment'); } finally { setBusy(false); }
  };
  const delComment = async (cid) => {
    if (!window.confirm('Delete this comment?')) return;
    setSt((s) => ({ ...s, list: s.list.filter((x) => x.id !== cid) }));
    try { await deleteComment(post.id, cid); } catch { ccToast('Could not delete'); }
  };
  return (
    <div className="v2-backdrop" onClick={onClose}>
      <div className="v2-sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div className="flex items-center gap-2 mb-1"><p className="font-semibold t-hi">Post</p><button className="ml-auto text-[13px] t-mid" onClick={onClose}>Close</button></div>
        <div className="flex-1 overflow-y-auto space-y-3 py-2" style={{ minHeight: 120 }}>
          {(post.imageUrl || post.text) && (
            <div className="pb-3 mb-1" style={{ borderBottom: '.5px solid var(--border)' }}>
              <button className="flex items-center gap-2 mb-2" onClick={() => onAuthor && post.handle && onAuthor(post.handle)}>
                <Avatar url={post.avatarUrl} name={post.displayName || post.handle} size={30} />
                <span className="text-[12px] font-semibold t-hi">{post.displayName || ('@' + post.handle)}</span>
              </button>
              {post.imageUrl && <img src={post.imageUrl} alt="" className="block w-full rounded-md mb-2" style={{ height: 'auto' }} draggable={false} />}
              {post.text && <p className="text-[13px] t-hi" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{post.text}</p>}
            </div>
          )}
          {st.loading ? <p className="text-[13px] t-mid text-center py-6">Loading…</p>
            : st.list.length === 0 ? <p className="text-[13px] t-mid text-center py-6">No comments yet — say something.</p>
              : st.list.map((c) => (
                <div key={c.id} className="flex gap-2.5">
                  <button onClick={() => onAuthor && c.handle && onAuthor(c.handle)} className="shrink-0 mt-0.5"><Avatar url={c.avatarUrl} name={c.displayName || c.handle} size={32} /></button>
                  <div className="min-w-0 flex-1"><p className="text-[12px]"><button className="font-semibold t-hi" onClick={() => onAuthor && c.handle && onAuthor(c.handle)}>{c.displayName || ('@' + c.handle)}</button> <span className="t-lo">· {timeAgo(c.createdAt)}</span></p><p className="text-[13px] t-hi" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c.text}</p></div>
                  {(c.mine || post.mine) && <button className="t-lo shrink-0 p-1" onClick={() => delComment(c.id)} aria-label="Delete comment"><Trash2 size={14} /></button>}
                </div>
              ))}
        </div>
        <div className="flex gap-2 pt-2"><input className="field" placeholder="Add a comment…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }} autoFocus /><button className="minibtn btn-primary" style={{ width: 'auto', padding: '.65rem 1rem' }} disabled={!text.trim() || busy} onClick={send}>Send</button></div>
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
      <Avatar url={u.avatarUrl} name={u.displayName || u.handle} size={36} />
      <div className="flex-1 min-w-0"><p className="text-[13px] font-semibold t-hi truncate">{u.displayName || ('@' + u.handle)}</p><p className="text-[11px] t-lo">@{u.handle}</p></div>
      {!u.isMe && <span className={`minibtn ${following ? 'btn-ghost' : 'btn-primary'}`} style={{ width: 'auto', padding: '.4rem .8rem' }} onClick={toggle}>{following ? 'Following' : 'Follow'}</span>}
    </button>
  );
}
function FeedPostCard({ p, onComment, onAuthor, onDeleted }) {
  const [liked, setLiked] = useState(!!p.likedByMe);
  const [likes, setLikes] = useState(p.likes || 0);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [pop, setPop] = useState(false);
  const lastTap = useRef(0);
  const doLike = async (force) => {
    const next = force === undefined ? !liked : force;
    if (busy || next === liked) return;
    setBusy(true); setLiked(next); setLikes((n) => Math.max(0, n + (next ? 1 : -1)));
    try { const r = next ? await likePost(p.id) : await unlikePost(p.id); if (typeof r?.likes === 'number') setLikes(r.likes); }
    catch { setLiked(!next); setLikes((n) => Math.max(0, n + (next ? -1 : 1))); }
    finally { setBusy(false); }
  };
  const onImageTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) { doLike(true); setPop(true); setTimeout(() => setPop(false), 750); }
    lastTap.current = now;
  };
  const share = async () => {
    const txt = `${p.displayName || ('@' + p.handle)} on ClassCost:\n${p.text || ''}`;
    try { if (navigator.share) await navigator.share({ text: txt }); else { await navigator.clipboard.writeText(txt); ccToast('Copied to clipboard'); } } catch { /* cancelled */ }
  };
  const del = async () => {
    setMenu(false);
    if (!window.confirm('Delete this post?')) return;
    try { await deletePost(p.id); ccToast('Post deleted'); onDeleted && onDeleted(p.id); } catch { ccToast('Could not delete'); }
  };
  return (
    <article className="pt-3 pb-2.5" style={{ borderBottom: '.5px solid var(--border)' }}>
      <div className="px-4 flex items-center gap-2 mb-2.5">
        <button className="flex items-center gap-2.5 flex-1 min-w-0 text-left" onClick={() => onAuthor && onAuthor(p.handle)}>
          <Avatar url={p.avatarUrl} name={p.displayName || p.handle} size={38} ring />
          <div className="min-w-0 flex-1"><p className="text-[13.5px] font-semibold t-hi truncate leading-tight">{p.displayName || ('@' + p.handle)}</p><p className="text-[11px] t-lo">@{p.handle} · {timeAgo(p.createdAt)}</p></div>
        </button>
        <div className="relative shrink-0">
          <button className="t-lo p-1" onClick={() => setMenu((m) => !m)} aria-label="More"><MoreHorizontal size={18} /></button>
          {menu && (
            <>
              <div className="fixed inset-0 z-[39]" onClick={() => setMenu(false)} />
              <div className="absolute right-0 top-7 z-40 card p-1" style={{ minWidth: 150, boxShadow: '0 10px 28px rgba(0,0,0,.35)' }}>
                {p.mine
                  ? <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium text-left" style={{ color: '#ef4444' }} onClick={del}><Trash2 size={15} />Delete post</button>
                  : <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium text-left t-hi" onClick={() => { setMenu(false); setReportOpen(true); }}><Flag size={15} />Report post</button>}
              </div>
            </>
          )}
        </div>
      </div>
      {p.text && !p.imageUrl && <p className="px-4 text-[15px] t-hi mb-2" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.45 }}>{p.text}</p>}
      {p.imageUrl && (
        <div className="relative overflow-hidden select-none" onClick={onImageTap}>
          <img src={p.imageUrl} alt="" loading="lazy" className="block" style={{ width: '100%', height: 'auto' }} draggable={false} />
          {pop && <span className="feed-heartpop" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}><Heart size={88} style={{ fill: '#fff', color: '#fff', filter: 'drop-shadow(0 2px 10px rgba(0,0,0,.5))' }} /></span>}
        </div>
      )}
      <div className="px-4 flex items-center gap-4 pt-2">
        <motion.button whileTap={{ scale: 1.3 }} transition={{ type: 'spring', stiffness: 500, damping: 14 }} className="p-0" onClick={() => doLike()} aria-label="Like" style={{ color: liked ? '#ef4444' : 'var(--text1)', background: 'none', border: 'none' }}>
          <Heart size={24} strokeWidth={2} style={liked ? { fill: '#ef4444' } : undefined} />
        </motion.button>
        <button className="t-hi p-0" onClick={() => onComment && onComment(p)} aria-label="Comments" style={{ background: 'none', border: 'none' }}><MessageCircle size={23} strokeWidth={2} /></button>
        <button className="t-hi p-0" onClick={share} aria-label="Share" style={{ background: 'none', border: 'none' }}><Send size={22} strokeWidth={2} /></button>
      </div>
      <div className="px-4 pt-1.5">
        {likes > 0 && <p className="text-[13px] font-semibold t-hi">{likes} like{likes === 1 ? '' : 's'}</p>}
        {p.imageUrl && p.text && <p className="text-[13.5px] t-hi mt-0.5" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.4 }}><button className="font-semibold" onClick={() => onAuthor && onAuthor(p.handle)}>{p.displayName || p.handle}</button> {p.text}</p>}
        {(p.comments || 0) > 0 && <button className="text-[12.5px] t-lo mt-0.5 block" onClick={() => onComment && onComment(p)}>view all {p.comments} comment{p.comments === 1 ? '' : 's'}</button>}
      </div>
      {reportOpen && <ReportSheet onClose={() => setReportOpen(false)} onSubmit={async (reason) => { try { await reportContent('post', p.id, reason); ccToast("Thanks — we'll review it"); } catch { ccToast('Could not report'); } setReportOpen(false); }} />}
    </article>
  );
}
function FeedListPane({ reloadKey, onCompose, onComment, onAuthor }) {
  const [st, setSt] = useState({ loading: true, posts: [], error: '' });
  const [more, setMore] = useState(false);
  const cursorRef = useRef(null);
  const loadingRef = useRef(false);
  const sentinel = useRef(null);
  useEffect(() => {
    let on = true; cursorRef.current = null;
    setSt((s) => ({ ...s, loading: true, error: '' }));
    listFeedPosts().then((r) => { if (on) { cursorRef.current = r?.nextCursor || null; setSt({ loading: false, posts: r?.posts || [], error: '' }); } })
      .catch((x) => { if (on) setSt({ loading: false, posts: [], error: x.message || 'offline' }); });
    return () => { on = false; };
  }, [reloadKey]);
  const loadMore = async () => {
    if (loadingRef.current || !cursorRef.current) return;
    loadingRef.current = true; setMore(true);
    try { const r = await listFeedPosts(cursorRef.current); cursorRef.current = r?.nextCursor || null; setSt((s) => ({ ...s, posts: [...s.posts, ...(r?.posts || [])] })); }
    catch { /* ignore */ } finally { loadingRef.current = false; setMore(false); }
  };
  useEffect(() => {
    const node = sentinel.current; if (!node) return;
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) loadMore(); }, { rootMargin: '400px' });
    io.observe(node); return () => io.disconnect();
  }, [st.posts.length]);
  const removePost = (id) => setSt((s) => ({ ...s, posts: s.posts.filter((p) => p.id !== id) }));
  if (st.loading) return (
    <div>
      {[0, 1].map((i) => (
        <div key={i} className="pt-3 pb-4" style={{ borderBottom: '.5px solid var(--border)' }}>
          <div className="px-4 flex items-center gap-2.5 mb-3">
            <div className="v2-skel rounded-full shrink-0" style={{ width: 38, height: 38 }} />
            <div className="flex-1"><div className="v2-skel rounded" style={{ height: 10, width: '38%', marginBottom: 7 }} /><div className="v2-skel rounded" style={{ height: 8, width: '22%' }} /></div>
          </div>
          <div className="v2-skel" style={{ aspectRatio: '1 / 1' }} />
        </div>
      ))}
    </div>
  );
  if (st.error) return <div className="card p-6 text-center mt-3 mx-4"><div className="text-3xl mb-2">📡</div><p className="text-[13px] t-mid">Couldn't load the feed{import.meta.env.DEV ? ' — no backend in local dev.' : '.'} It works once the server is live.</p></div>;
  if (!st.posts.length) return <div className="py-16 px-6 text-center"><div className="text-4xl mb-2">🌱</div><p className="font-semibold t-hi mb-1">quiet in here</p><p className="text-[13px] t-mid mb-4">be the first — say what's on your mind.</p><button className="btn btn-primary" style={{ maxWidth: 200, margin: '0 auto' }} onClick={onCompose}>write something</button></div>;
  return (
    <div>
      {st.posts.map((p) => <FeedPostCard key={p.id} p={p} onComment={onComment} onAuthor={onAuthor} onDeleted={removePost} />)}
      {cursorRef.current && <div ref={sentinel} className="py-4 text-center text-[12px] t-lo">{more ? 'Loading more…' : ' '}</div>}
    </div>
  );
}
function ComposePage({ handle, myAvatar, userName, onBack, onPosted }) {
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
    try { await createFeedPost(text.trim(), img?.url); setText(''); setImg(null); ccToast('Posted'); onPosted(); }
    catch (x) { setErr(x.message || 'Could not post. Is the server live?'); }
    finally { setBusy(false); }
  };
  return (
    <div>
      <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '.5px solid var(--border)' }}>
        <button onClick={onBack} className="t-mid p-1 -ml-1" aria-label="Back"><ChevronLeft size={20} /></button>
        <p className="font-bold t-hi flex-1">New post</p>
        <button className="minibtn btn-primary" style={{ padding: '.45rem 1.1rem' }} disabled={(!text.trim() && !img) || busy || upBusy} onClick={post}>{busy ? 'Posting…' : 'Post'}</button>
      </div>
      <div className="px-4 py-4">
        <div className="flex items-center gap-2.5 mb-3">
          <Avatar url={myAvatar} name={userName} size={38} ring />
          <p className="text-[13px] font-semibold t-accent">{handle}</p>
        </div>
        <textarea className="w-full t-hi" rows={6} placeholder="share something with your campus…" value={text} onChange={(e) => setText(e.target.value)}
          style={{ resize: 'none', border: 'none', outline: 'none', background: 'transparent', fontSize: 16, lineHeight: 1.5, minHeight: 130, color: 'var(--text1)' }} autoFocus />
        {img
          ? <div className="relative mt-2"><img src={img.preview} alt="" className="w-full block" style={{ borderRadius: 6, border: '.5px solid var(--border)' }} /><button className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-white text-[14px]" style={{ background: 'rgba(0,0,0,.55)' }} onClick={() => setImg(null)} aria-label="Remove image">✕</button></div>
          : <button className="w-full flex items-center justify-center gap-2 py-5 t-mid text-[13px] font-medium" style={{ border: '1.5px dashed var(--border)', borderRadius: 6, background: 'transparent' }} disabled={upBusy} onClick={() => fileRef.current?.click()}>
              <ImageIcon size={17} />{upBusy ? 'uploading…' : 'add a photo'}
            </button>}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickImage} />
        {err && <p className="text-[12px] mt-2" style={{ color: '#ef4444' }}>{err}</p>}
        <p className="text-[11px] t-lo text-center mt-3">Photos upload to host storage · all posts are public · a report system keeps it safe.</p>
      </div>
    </div>
  );
}

/* ---------------- direct messages ---------------- */
function DMPane({ active, reloadKey, onOpenThread }) {
  const [st, setSt] = useState({ loading: true, convos: [], err: false });
  const [q, setQ] = useState('');
  const [found, setFound] = useState([]);
  const searchRef = useRef(null);
  useEffect(() => {
    let on = true; setSt((s) => ({ ...s, loading: true }));
    const pull = (silent) => listConversations()
      .then((r) => { if (on) setSt({ loading: false, convos: r?.conversations || [], err: false }); })
      .catch(() => { if (on) setSt((s2) => ({ ...s2, loading: false, err: silent ? s2.err : true })); });
    pull(false);
    const id = setInterval(() => pull(true), 4000); // live list — new chats appear without reloading
    markNotificationsRead(['dm']).then(() => { try { window.dispatchEvent(new CustomEvent('cc-news-refresh')); } catch { /* noop */ } }).catch(() => {});
    return () => { on = false; clearInterval(id); };
  }, [reloadKey, active]);
  useEffect(() => { // people search beyond existing chats (debounced)
    const term = q.trim().replace('@', '');
    if (!term) { setFound([]); return; }
    const t = setTimeout(() => { searchUsers(term).then((r) => setFound(r?.users || [])).catch(() => setFound([])); }, 250);
    return () => clearTimeout(t);
  }, [q]);
  const ql = q.trim().toLowerCase().replace('@', '');
  const convos = ql ? st.convos.filter((c) => (c.displayName || '').toLowerCase().includes(ql) || (c.handle || '').toLowerCase().includes(ql)) : st.convos;
  const extra = ql ? found.filter((u) => !st.convos.some((c) => c.handle === u.handle)) : [];
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 mb-2" style={{ padding: '.6rem .9rem', borderRadius: 999, border: '.5px solid var(--border)', background: 'var(--card)' }}>
        <Search size={15} className="t-lo shrink-0" />
        <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="search chats & people…" className="flex-1 min-w-0 text-[14px]" style={{ border: 'none', outline: 'none', background: 'transparent', color: 'var(--text1)' }} />
        {q && <button className="t-lo text-[12px] shrink-0" onClick={() => setQ('')}>clear</button>}
      </div>
      {st.loading ? <div className="space-y-1">{[0, 1, 2].map((i) => <div key={i} className="flex items-center gap-3 py-2.5"><div className="v2-skel rounded-full shrink-0" style={{ width: 52, height: 52 }} /><div className="flex-1"><div className="v2-skel rounded" style={{ height: 11, width: '45%', marginBottom: 7 }} /><div className="v2-skel rounded" style={{ height: 9, width: '70%' }} /></div></div>)}</div>
        : st.err ? <div className="card p-6 text-center"><div className="text-3xl mb-2">✉️</div><p className="text-[13px] t-mid">{import.meta.env.DEV ? 'Messages work once the server is live.' : "Couldn't load messages — try again in a moment."}</p></div>
          : (!ql && st.convos.length === 0) ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: 'var(--accent-light)' }}><Send size={26} className="t-accent" /></div>
              <p className="font-semibold t-hi mb-1">your messages</p>
              <p className="text-[13px] t-mid mb-4">slide into anyone's DMs — search a name or @handle above.</p>
              <button className="btn btn-primary" style={{ maxWidth: 200, margin: '0 auto' }} onClick={() => searchRef.current?.focus()}>start a chat</button>
            </div>
          ) : (ql && convos.length === 0 && extra.length === 0) ? (
            <p className="text-[13px] t-mid text-center py-10">no one found for “{q.trim()}”</p>
          ) : (
            <div>
              {convos.map((c, i) => (
                <motion.button key={c.threadId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.045, type: 'spring', stiffness: 380, damping: 28 }} whileTap={{ scale: 0.98 }}
                  className="w-full text-left flex items-center gap-3 py-2.5" onClick={() => onOpenThread('@' + c.handle)} style={{ background: 'none', border: 'none' }}>
                  <Avatar url={c.avatarUrl} name={c.displayName || c.handle} size={52} ring />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <p className="text-[14px] font-semibold t-hi truncate">{c.displayName || ('@' + c.handle)}</p>
                      {c.lastAt && <span className="text-[11px] t-lo shrink-0 ml-auto">{timeAgo(c.lastAt)}</span>}
                    </div>
                    <p className="text-[12.5px] t-mid truncate mt-0.5">{c.mine ? 'you: ' : ''}{c.lastText || 'say hi 👋'}</p>
                  </div>
                </motion.button>
              ))}
              {extra.length > 0 && (
                <>
                  <p className="text-[11px] uppercase tracking-wide t-lo mt-3 mb-1 px-1">more people</p>
                  {extra.map((u) => <FeedUserRow key={u.handle} u={u} onOpen={onOpenThread} />)}
                </>
              )}
            </div>
          )}
    </div>
  );
}
function DMThread({ handle, onClose, onSent, onProfile }) {
  const h = (handle || '').replace('@', '');
  const [st, setSt] = useState({ loading: true, msgs: [], other: { handle: h }, err: false });
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [showJump, setShowJump] = useState(false);
  const [replyTo, setReplyTo] = useState(null); // message being replied to
  const [flashId, setFlashId] = useState(null); // briefly highlight the jumped-to original
  const scrollRef = useRef(null);
  const atBottomRef = useRef(true);
  const msgRefs = useRef({});
  const dragRef = useRef({ x: 0, id: null });
  const inputRef = useRef(null);
  useEffect(() => {
    let on = true;
    const load = (silent) => {
      if (!silent) setSt((s) => ({ ...s, loading: true }));
      getThread(h).then((r) => {
        if (!on) return;
        // keep locally pending/failed bubbles across polls (the server doesn't know them yet)
        setSt((s) => ({ loading: false, msgs: [...(r?.messages || []), ...s.msgs.filter((m) => m.pending || m.failed)], other: r?.other || { handle: h }, err: false }));
      }).catch(() => { if (on) setSt((s) => ({ ...s, loading: false, err: true })); });
    };
    load(false);
    const id = setInterval(() => load(true), 2000);
    return () => { on = false; clearInterval(id); };
  }, [h]);
  useEffect(() => {
    const el = scrollRef.current; if (!el) return;
    if (atBottomRef.current) el.scrollTop = el.scrollHeight;
    else setShowJump(true);
  }, [st.msgs.length]);
  const onScroll = () => {
    const el = scrollRef.current; if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (atBottomRef.current) setShowJump(false);
  };
  const jumpDown = () => { const el = scrollRef.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); setShowJump(false); };
  const send = async (override, ridOverride, imageUrl) => {
    const t = (override !== undefined ? override : text).trim(); if ((!t && !imageUrl) || busy) return; setBusy(true);
    haptics.light?.();
    atBottomRef.current = true; // sending always snaps you to the bottom
    const rid = ridOverride !== undefined ? ridOverride : (replyTo?.id && !String(replyTo.id).startsWith('tmp-') ? replyTo.id : null);
    setReplyTo(null);
    const tmp = { id: 'tmp-' + Date.now(), text: t, imageUrl: imageUrl || null, mine: true, createdAt: new Date().toISOString(), pending: true, replyToId: rid };
    setSt((s) => ({ ...s, msgs: [...s.msgs, tmp] })); if (override === undefined) setText('');
    try { const r = await sendDm(h, t, rid, imageUrl); setSt((s) => ({ ...s, msgs: s.msgs.map((m) => (m.id === tmp.id ? r.message : m)), err: false })); onSent && onSent(); }
    catch (x) {
      if (import.meta.env.DEV) { /* keep the bubble locally so DMs are demoable offline */ }
      else { setSt((s) => ({ ...s, msgs: s.msgs.map((m) => (m.id === tmp.id ? { ...m, pending: false, failed: true } : m)) })); ccToast(x.message || 'Could not send'); }
    } finally { setBusy(false); }
  };
  const retry = (m) => { setSt((s) => ({ ...s, msgs: s.msgs.filter((x) => x.id !== m.id) })); send(m.text, m.replyToId || null, m.imageUrl || undefined); };
  const [upBusy, setUpBusy] = useState(false);
  const fileRef = useRef(null);
  const pickImage = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (!f.type.startsWith('image/')) { ccToast('Pick an image'); return; }
    setUpBusy(true);
    try { const r = await uploadFeedImage(f); await send(undefined, undefined, r.url); }
    catch { ccToast('Could not send the photo'); }
    finally { setUpBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  };
  const startReply = (m) => { if (m.pending || m.failed) return; setReplyTo(m); haptics.light?.(); inputRef.current?.focus(); };
  const jumpToMsg = (id) => {
    const el = msgRefs.current[id]; if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFlashId(id); setTimeout(() => setFlashId(null), 1100);
  };
  const other = st.other || { handle: h };
  const name = other.displayName || ('@' + (other.handle || h));
  const GAP = 5 * 60 * 1000;
  const near = (a, b) => a && b && a.mine === b.mine && Math.abs(new Date(a.createdAt) - new Date(b.createdAt)) < GAP;
  const dayOf = (d) => new Date(d).toDateString();
  const dayLabel = (d) => {
    const ds = dayOf(d), now = new Date(), y = new Date(now); y.setDate(now.getDate() - 1);
    if (ds === now.toDateString()) return 'today';
    if (ds === y.toDateString()) return 'yesterday';
    return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };
  const fmtTime = (d) => new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const typed = !!text.trim();
  return (
    <div className="fixed z-[46] flex flex-col" style={{ inset: 0, background: 'var(--bg)' }}>
      <div className="flex flex-col relative" style={{ maxWidth: 480, margin: '0 auto', width: '100%', height: '100%', borderLeft: '.5px solid var(--border)', borderRight: '.5px solid var(--border)' }}>
        {/* chat header — identity, tappable to open the profile */}
        <div className="px-3 py-2.5 flex items-center gap-1.5" style={{ borderBottom: '.5px solid var(--border)', background: 'var(--nav-bg)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
          <button onClick={onClose} className="p-1.5 t-mid" aria-label="Back"><ChevronLeft size={20} /></button>
          <button className="flex items-center gap-2.5 flex-1 min-w-0 text-left" onClick={() => onProfile && onProfile(other.handle || h)}>
            <Avatar url={other.avatarUrl} name={other.displayName || other.handle || h} size={36} ring />
            <div className="min-w-0">
              <p className="text-[14px] font-semibold t-hi truncate leading-tight">{name}</p>
              <p className="text-[11px] t-lo truncate">@{other.handle || h}</p>
            </div>
          </button>
        </div>
        <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-3 py-3" style={{ backgroundImage: 'radial-gradient(rgba(120,124,150,.15) 1px, transparent 1.4px)', backgroundSize: '18px 18px' }}>
          {st.loading ? (
            <div className="space-y-2 pt-2">
              <div className="v2-skel rounded-2xl" style={{ height: 36, width: '55%' }} />
              <div className="v2-skel rounded-2xl ml-auto" style={{ height: 36, width: '45%' }} />
              <div className="v2-skel rounded-2xl" style={{ height: 36, width: '38%' }} />
            </div>
          ) : st.msgs.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center">
              <Avatar url={other.avatarUrl} name={other.displayName || other.handle || h} size={76} ring />
              <p className="font-semibold t-hi mt-3">{name}</p>
              <p className="text-[12px] t-lo mb-4">@{other.handle || h}</p>
              <motion.button whileTap={{ scale: 0.92 }} className="btn btn-ghost" style={{ maxWidth: 160 }} onClick={() => send('👋')}>say hi 👋</motion.button>
              {import.meta.env.DEV && <p className="text-[11px] t-lo mt-3">Messages persist once the server is live.</p>}
            </div>
          ) : st.msgs.map((m, i) => {
            const prev = st.msgs[i - 1], next = st.msgs[i + 1];
            const newDay = !prev || dayOf(prev.createdAt) !== dayOf(m.createdAt);
            const first = newDay || !near(prev, m);
            const last = !next || dayOf(next.createdAt) !== dayOf(m.createdAt) || !near(m, next);
            const R = 16, S = 5;
            const orig = m.replyToId ? st.msgs.find((x) => x.id === m.replyToId) : null;
            const replyBtn = !m.pending && !m.failed && (
              <button className="dm-reply-btn shrink-0 t-lo p-1" aria-label="Reply" onClick={() => startReply(m)} style={{ background: 'none', border: 'none' }}>
                <Reply size={15} />
              </button>
            );
            return (
              <div key={m.id} ref={(el) => { msgRefs.current[m.id] = el; }}>
                {newDay && <p className="text-center text-[10.5px] t-lo font-medium uppercase tracking-wide py-3">{dayLabel(m.createdAt)}</p>}
                <div className={`dm-row flex items-end gap-1.5 ${m.mine ? 'justify-end' : 'justify-start'}`}
                  style={{ marginTop: first && !newDay ? 12 : 2, background: flashId === m.id ? 'var(--accent-light)' : 'transparent', borderRadius: 10, transition: 'background .4s' }}>
                  {!m.mine && (last
                    ? <span className="shrink-0"><Avatar url={other.avatarUrl} name={other.displayName || other.handle || h} size={24} /></span>
                    : <span className="shrink-0" style={{ width: 24 }} />)}
                  {m.mine && replyBtn}
                  <motion.div initial={{ opacity: 0, y: 6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 480, damping: 30 }}
                    onClick={m.failed ? () => retry(m) : undefined}
                    onPointerDown={(e) => { dragRef.current = { x: e.clientX, id: m.id }; }}
                    onPointerUp={(e) => { if (dragRef.current.id === m.id && e.clientX - dragRef.current.x > 48) startReply(m); dragRef.current = { x: 0, id: null }; }}
                    className="max-w-[76%] px-3.5 py-2 text-[13.5px]"
                    style={{
                      background: m.mine ? 'var(--accent)' : 'var(--card)', color: m.mine ? 'var(--accent-text)' : 'var(--text1)',
                      border: m.failed ? '1px solid #ef4444' : (m.mine ? 'none' : '.5px solid var(--border)'),
                      borderRadius: R,
                      borderTopRightRadius: m.mine && !first ? S : R, borderBottomRightRadius: m.mine && !last ? S : (m.mine ? 4 : R),
                      borderTopLeftRadius: !m.mine && !first ? S : R, borderBottomLeftRadius: !m.mine && !last ? S : (!m.mine ? 4 : R),
                      opacity: m.pending ? 0.55 : 1, whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.4, cursor: m.failed ? 'pointer' : 'default', touchAction: 'pan-y',
                    }}>
                    {m.replyToId && (
                      <button onClick={(e) => { e.stopPropagation(); if (orig) jumpToMsg(orig.id); }} className="block w-full text-left mb-1.5 px-2 py-1 rounded-md"
                        style={{ background: 'rgba(127,127,127,.16)', border: 'none', borderLeft: `2px solid ${m.mine ? 'var(--accent-text)' : 'var(--accent)'}`, color: 'inherit', cursor: orig ? 'pointer' : 'default' }}>
                        <span className="block font-semibold" style={{ fontSize: 10.5, opacity: 0.85 }}>{orig ? (orig.mine ? 'You' : name) : 'earlier message'}</span>
                        <span className="block truncate" style={{ fontSize: 11.5, opacity: 0.8 }}>{orig ? (orig.text || '📷 photo') : '…'}</span>
                      </button>
                    )}
                    {m.imageUrl && <img src={m.imageUrl} alt="" className="block rounded-lg" style={{ maxWidth: '100%', maxHeight: 300, marginBottom: m.text ? 6 : 0 }} draggable={false} />}
                    {m.text}
                  </motion.div>
                  {!m.mine && replyBtn}
                </div>
                {last && (m.failed
                  ? <button className={`text-[10px] mt-1 block ${m.mine ? 'text-right pr-1 ml-auto' : 'pl-9'}`} style={{ color: '#ef4444' }} onClick={() => retry(m)}>failed — tap to retry</button>
                  : <p className={`text-[10px] t-lo mt-1 ${m.mine ? 'text-right pr-1' : 'pl-9'}`}>{m.pending ? 'sending…' : fmtTime(m.createdAt)}</p>)}
              </div>
            );
          })}
        </div>
        {showJump && (
          <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="absolute z-10 flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold"
            style={{ right: 14, bottom: 76, background: 'var(--accent)', color: 'var(--accent-text)', boxShadow: '0 6px 18px rgba(0,0,0,.3)' }} onClick={jumpDown}>
            <ChevronDown size={13} /> new
          </motion.button>
        )}
        <div style={{ borderTop: '.5px solid var(--border)', background: 'var(--sheet-bg)' }}>
          {replyTo && (
            <div className="px-3 pt-2 flex items-center gap-2">
              <div className="flex-1 min-w-0 px-2.5 py-1.5 rounded-md" style={{ background: 'var(--pill-bg)', borderLeft: '2px solid var(--accent)' }}>
                <p className="text-[10.5px] font-semibold t-accent">Replying to {replyTo.mine ? 'yourself' : name}</p>
                <p className="text-[12px] t-mid truncate">{replyTo.text}</p>
              </div>
              <button className="t-lo p-1.5 shrink-0" onClick={() => setReplyTo(null)} aria-label="Cancel reply" style={{ background: 'none', border: 'none' }}>✕</button>
            </div>
          )}
          <div className="px-3 py-2.5 flex items-center gap-2">
          <button className="t-mid p-1 shrink-0" style={{ background: 'none', border: 'none', opacity: upBusy ? 0.5 : 1 }} disabled={upBusy} onClick={() => fileRef.current?.click()} aria-label="Send a photo">
            <ImageIcon size={24} strokeWidth={2} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickImage} />
          <input ref={inputRef} className="field flex-1" style={{ borderRadius: 999, padding: '.7rem 1.1rem' }} placeholder={upBusy ? 'sending photo…' : (replyTo ? 'reply…' : 'message…')} autoFocus value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }} />
          {typed ? (
            <motion.button whileTap={{ scale: 0.8 }} className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'var(--accent)', color: 'var(--accent-text)', border: '.5px solid var(--border)' }}
              disabled={busy} onClick={() => send()} aria-label="Send"><Send size={17} /></motion.button>
          ) : (
            <motion.button whileTap={{ scale: 0.75 }} className="p-1 shrink-0" style={{ background: 'none', border: 'none', color: '#ef4444' }}
              disabled={busy} onClick={() => send('❤️')} aria-label="Send a heart"><Heart size={27} strokeWidth={2} style={{ fill: '#ef4444' }} /></motion.button>
          )}
          </div>
        </div>
      </div>
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
  const [remindDays, setRemindDays] = useState(() => { try { return Math.max(0, Math.min(30, parseInt(localStorage.getItem('cc_v2_remind_days'), 10) || 7)); } catch { return 7; } });
  const setRemindDaysVal = (v) => { const n = Math.max(0, Math.min(30, +v || 0)); setRemindDays(n); try { localStorage.setItem('cc_v2_remind_days', String(n)); } catch { /* noop */ } };
  const cur = user?.currency || '৳';
  const exportCSV = () => {
    const rows = [['date', 'space', 'label', 'amount', 'status']].concat(allDues().map((dd) => [dd.date, dd.space?.name || '', String(dd.label || '').replace(/,/g, ' '), dd.amount, engStatus(dd)]));
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
          {notify && (
            <div className="card p-4 mt-2">
              <div className="flex items-center justify-between mb-2"><p className="text-[13px] font-medium t-hi">Remind me before</p><span className="text-[13px] font-semibold t-accent">{remindDays === 0 ? 'On the day' : remindDays + (remindDays === 1 ? ' day' : ' days')}</span></div>
              <input type="range" min="0" max="30" value={remindDays} onChange={(e) => setRemindDaysVal(e.target.value)} className="w-full" style={{ accentColor: 'var(--accent)' }} />
              <p className="text-[11px] t-lo mt-1">Upcoming dues within this window show in your notifications.</p>
            </div>
          )}
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
          <span className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-3" style={{ background: avatarColor(user?.name) }}>{initial}</span>
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
  // restore the last route on reload — history.state survives a reload, sessionStorage is the fallback
  const navInit = useRef(undefined);
  if (navInit.current === undefined) {
    let snap = null;
    try { snap = (window.history.state && window.history.state.ccNav) || null; } catch { snap = null; }
    if (!snap) { try { const s = sessionStorage.getItem('cc_v2_nav'); if (s) snap = JSON.parse(s); } catch { snap = null; } }
    navInit.current = (snap && snap.route) ? snap : { route: { view: 'home', params: {} }, stack: [] };
  }
  const [route, setRoute] = useState(navInit.current.route);
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('cc_v2_theme') || 'light'; } catch { return 'light'; } });
  const [guest, setGuest] = useState(() => { try { return localStorage.getItem('cc_v2_guest') === '1'; } catch { return false; } });
  const stack = useRef(navInit.current.stack || []);
  const d = theme === 'dark';
  const c = v2Palette(d);
  const toggleTheme = () => setTheme((tm) => { const n = tm === 'dark' ? 'light' : 'dark'; try { localStorage.setItem('cc_v2_theme', n); } catch { /* noop */ } return n; });
  // mirror navigation into the browser History API: reload keeps the page, and the browser back button steps back one in-app screen instead of leaving the app
  const persistNav = (r, st) => {
    try { window.history.pushState({ ccNav: { route: r, stack: st } }, ''); } catch { /* noop */ }
    try { sessionStorage.setItem('cc_v2_nav', JSON.stringify({ route: r, stack: st })); } catch { /* noop */ }
  };
  const nav = (view, params = {}) => { if (route.view === view && JSON.stringify(route.params) === JSON.stringify(params)) return; const next = { view, params }; const st = [...stack.current, route]; stack.current = st; setRoute(next); persistNav(next, st); try { window.scrollTo(0, 0); } catch { /* noop */ } };
  const tab = (view) => { try { window.scrollTo(0, 0); } catch { /* noop */ } if (route.view === view && !Object.keys(route.params || {}).length) return; const next = { view, params: {} }; stack.current = []; setRoute(next); persistNav(next, []); };
  const back = () => { if (stack.current.length) { try { window.history.back(); return; } catch { /* fall through */ } } const p = stack.current.pop(); setRoute(p || { view: 'home', params: {} }); };
  useEffect(() => {
    try { window.history.replaceState({ ...(window.history.state || {}), ccNav: { route, stack: stack.current } }, ''); } catch { /* noop */ }
    const onPop = (e) => {
      let nv = null; try { nv = (e.state && e.state.ccNav) || null; } catch { nv = null; }
      const r = (nv && nv.route) ? nv.route : { view: 'home', params: {} };
      stack.current = (nv && nv.stack) ? nv.stack : [];
      setRoute(r);
      try { sessionStorage.setItem('cc_v2_nav', JSON.stringify({ route: r, stack: stack.current })); } catch { /* noop */ }
      try { window.scrollTo(0, 0); } catch { /* noop */ }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  // feed news (likes/comments/follows vs texts) — powers the Feed-tab dot and Leeboon's excitement
  const [news, setNews] = useState({ dm: 0, other: 0, latest: null });
  const authedNow = !!user?.id || guest;
  useEffect(() => {
    if (!authedNow) return undefined;
    let on = true;
    const pull = () => getFeedNotifications().then((r) => {
      if (!on) return;
      const items = r?.notifications || [];
      const fresh = items.filter((n) => !n.read);
      setNews({ dm: fresh.filter((n) => n.type === 'dm').length, other: fresh.filter((n) => n.type !== 'dm').length, latest: fresh[0] || null });
    }).catch(() => {});
    pull();
    const id = setInterval(pull, 30000);
    window.addEventListener('cc-news-refresh', pull);
    return () => { on = false; clearInterval(id); window.removeEventListener('cc-news-refresh', pull); };
  }, [authedNow]);
  const { view, params } = route;
  const P = { nav, back, tab, params, d, toggleTheme };
  let screen;
  switch (view) {
    case 'home': screen = <Home {...P} />; break;
    case 'create': screen = <Create {...P} />; break;
    case 'category-history': screen = <CategoryHistory {...P} />; break;
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
    case 'residence': case 'club': screen = <SpaceDetailV2 {...P} />; break;
    case 'vehicle': case 'personal': case 'asset': screen = <SpaceDetail {...P} />; break;
    case 'rent-engine': screen = <RentEngine {...P} />; break;
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
  const navItems = [['home', HomeIcon, 'Home'], ['calendar', CalendarDays, 'Calendar'], ['feed', Newspaper, 'Feed'], ['reports', BarChart3, 'Reports'], ['settings', SettingsIcon, 'Settings']];
  const firstName = (user?.name || 'there').trim().split(' ')[0];
  const initial = (user?.name || 'S').trim().charAt(0).toUpperCase();
  const hasNews = news.dm + news.other > 0;
  const NavIcon = ({ v, Icon, size }) => (
    <span className="relative inline-flex shrink-0">
      <Icon size={size} strokeWidth={2} style={v === 'feed' ? { stroke: 'url(#ccInsta)' } : undefined} />
      {v === 'feed' && hasNews && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full" style={{ background: '#ef4444', border: '2px solid var(--bg)' }} />}
    </span>
  );
  return (
    <div className="v2-app" style={vars}>
      {/* instagram-palette gradient for the feed icon (document-wide paint server) */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <linearGradient id="ccInsta" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f09433" /><stop offset="25%" stopColor="#e6683c" /><stop offset="50%" stopColor="#dc2743" /><stop offset="75%" stopColor="#cc2366" /><stop offset="100%" stopColor="#bc1888" />
          </linearGradient>
        </defs>
      </svg>
      {/* desktop left sidebar */}
      <aside className="v2-desk v2-sidebar">
        <div className="flex items-center gap-2.5 px-1 mb-6"><Logo size={30} /><span className="text-[18px] font-bold t-hi t-serif">ClassCost</span></div>
        {navItems.map(([v, Icon, label]) => (
          <button key={v} className={`v2-deskitem ${(v === 'home' ? homeActive : view === v) ? 'active' : ''}`} onClick={() => tab(v)}><NavIcon v={v} Icon={Icon} size={18} />{label}</button>
        ))}
        <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => nav('create')}>+ New cost</button>
        <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
          <button className="v2-deskitem" style={{ border: '.5px solid var(--border)' }} onClick={() => nav('profile')}>
            <span className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[13px] font-semibold shrink-0" style={{ background: avatarColor(user?.name) }}>{initial}</span>
            <span className="truncate">{user?.name || 'Student'}</span>
          </button>
          <button className="v2-deskitem" onClick={toggleTheme}>{d ? <Sun size={18} /> : <Moon size={18} />}{d ? 'Light mode' : 'Dark mode'}</button>
        </div>
      </aside>

      {/* centered content column */}
      <div className="v2-main">{screen}</div>
      <Leeboon nav={nav} d={d} news={news} inFeed={view === 'feed'} />

      {/* desktop right rail */}
      <aside className="v2-desk v2-rail">
        <div className="card p-4">
          <p className="font-bold t-hi t-serif text-[15px]">Hi, {firstName} 👋</p>
          <p className="text-[12px] t-mid mt-1">Your education money, sorted.</p>
        </div>
        <div className="card p-3">
          <p className="text-[10px] uppercase tracking-wide t-lo mb-1 px-1">Quick actions</p>
          <button className="v2-deskitem" onClick={() => nav('create')}><Plus size={16} />New cost block</button>
          <button className="v2-deskitem" onClick={() => tab('feed')}><Newspaper size={16} />Open feed</button>
          <button className="v2-deskitem" onClick={() => tab('reports')}><BarChart3 size={16} />Reports</button>
        </div>
      </aside>

      {/* mobile bottom nav */}
      <nav className="v2-nav">
        <div className="v2-navrow">
          {navItems.map(([v, Icon, label]) => (
            <button key={v} className={`v2-navbtn ${(v === 'home' ? homeActive : view === v) ? 'active' : ''}`} onClick={() => tab(v)}><NavIcon v={v} Icon={Icon} size={20} />{label}</button>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default function V2App() {
  return (<V2Provider><Shell /></V2Provider>);
}
