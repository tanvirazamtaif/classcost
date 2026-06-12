// ClassCost v2 — app shell + screens. Theme from v1's getThemeColors() (light + dark), via CSS vars.
import React, { useState, useRef, useEffect } from 'react';
import { Plus, ChevronRight, ChevronLeft, ChevronDown, Utensils, Bus, Sparkles, Sun, Moon, Home as HomeIcon, CalendarDays, BarChart3, Settings as SettingsIcon, GraduationCap, Building2, Users, Bike, Repeat, Package, Menu, Bell, LogOut, Lock, Download, Newspaper, PenSquare, Search, Heart, MessageCircle, Share2, Image as ImageIcon, Flag, Send, User, MoreHorizontal, Trash2, Camera, Compass, Reply, UserPlus, Pause, Play, Pin, EyeOff, Link as LinkIcon, Smile } from 'lucide-react';
import { motion, useDragControls } from 'framer-motion';
import { haptics } from '../lib/haptics';
import { V2Provider, useV2 } from './store';
import { fmt, MN, MNS, WD, split, iso, parse, today, inMonth, paidOf, remOf, statusOf, detectInstitute, monthlyDates } from './engine';
// ClassCost v2 palette — derived from the logo (ink #0F1537 + cream). Notion-calm: warm
// neutrals + one accent that inverts per mode (navy-on-cream / cream-on-navy) + muted gold.
const v2Palette = (d) => d ? {
  bg: '#0C0A1A', card: '#151421', border: 'rgba(255,255,255,.35)',
  accent: '#F2EFE6', accentText: '#0A143F', accentLight: 'rgba(242,239,230,.12)', gold: '#F2EFE6',
  text1: '#F2EFE6', text2: '#A6ABC6', text3: '#6E7596',
  heroBg: '#151421', heroBorder: 'rgba(255,255,255,.35)',
  pillBg: '#201E30', navBg: 'rgba(12,10,26,.92)', sheetBg: '#151421', cardShadow: 'none',
} : {
  bg: '#F5F4F0', card: '#FFFFFF', border: '#2B3148',
  accent: '#0A143F', accentText: '#FFFFFF', accentLight: 'rgba(10,20,63,.07)', gold: '#0A143F',
  text1: '#0A143F', text2: '#5C6178', text3: '#9499A6',
  heroBg: '#FFFFFF', heroBorder: '#2B3148',
  pillBg: '#EEEDE7', navBg: 'rgba(245,244,240,.95)', sheetBg: '#FFFFFF', cardShadow: 'none',
};
import { Logo } from '../components/ui/Logo';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Leeboon } from './Leeboon';
import { getMyFeedProfile, claimHandle, listFeedPosts, createFeedPost, likePost, unlikePost, getComments, addComment, followUser, unfollowUser, searchUsers, getFeedProfile, getUserPosts, uploadFeedImage, reportContent, listConversations, getThread, sendDm, updateMyProfile, deletePost, deleteComment, getFeedNotifications, markNotificationsRead, getFeedPost, listStories, createStory, deleteStory, getSuggestions, getFollowers, getFollowing, getNotes, setNote, pinPost } from '../api';
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
        <p className="flex-1 text-[13px] t-mid truncate">{greeting}, <span className="t-hi font-semibold">{user?.name || 'Student'}</span></p>
        <button onClick={() => setNotifOpen(true)} className="relative w-9 h-9 rounded-full flex items-center justify-center t-mid" aria-label="Notifications" style={{ background: 'var(--pill-bg)', border: '.5px solid var(--border)' }}>
          <Bell size={17} />
          {notifCount > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: '#ef4444' }}>{notifCount > 9 ? '9+' : notifCount}</span>}
        </button>
        <button onClick={() => nav('profile')} className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[14px] font-semibold shrink-0" style={{ background: avatarColor(user?.name) }} aria-label="Profile">{initial}</button>
      </header>
      <div className="px-2.5">
        {/* hero (matches v1 DashboardV3) */}
        <div className="rounded-md p-4 mb-2.5" style={{ background: 'var(--hero-bg)', border: '.5px solid var(--hero-border)' }}>
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-[10px] font-medium t-gold">Lifetime</p><p className="text-[22px] font-medium mt-0.5 t-hi t-serif">{fmt(sm.life)}</p></div>
            <div className="text-right"><p className="text-[10px] font-medium t-gold">This month</p><p className="text-[22px] font-medium mt-0.5 t-hi t-serif">{fmt(sm.month)}</p></div>
            <div><p className="text-[10px] t-lo">This year</p><p className="text-sm font-medium t-mid">{fmt(sm.year)}</p></div>
            <div className="text-right"><p className="text-[10px] t-lo">Last month</p><p className="text-sm font-medium t-mid">{fmt(sm.last)}</p></div>
          </div>
        </div>

        {/* daily category tiles */}
        <div className="grid grid-cols-3 gap-2 mb-2.5">
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
        <h2 className="text-sm font-semibold t-hi mb-1.5 mt-1">Your spaces</h2>
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
            <div className="grid grid-cols-3 gap-2 mb-3">{['✨','🌸','🤍','🫶','🥹','😭','💀','😂','😌','🥰','🦋','🌷','🌙','☁️','🌊','🍓','🍃','🌻','💗','💌','🎀','🧸','🕊️','⭐','🔥','👀','🙈','🫰','🤌','🥲','😎','❤️‍🔥']].map((e) => (
                <button key={e} className="text-[22px] leading-none p-1" style={{ background: 'none', border: 'none' }} onClick={() => { setText((t) => t + e); inputRef.current?.focus(); }}>{e}</button>
              ))}
            </div>
          )}
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
          <button className="p-1 shrink-0" style={{ background: 'none', border: 'none', color: emojiOpen ? 'var(--accent)' : 'var(--text2)' }} onClick={() => setEmojiOpen((v) => !v)} aria-label="Emojis">
            <Smile size={24} strokeWidth={2} />
          </button>
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
    let deepUser = null, deepPost = null;
    try { const q = new URLSearchParams(window.location.search); deepUser = q.get('u'); deepPost = q.get('p'); } catch { deepUser = null; deepPost = null; }
    if (deepPost) { // shared post link: classcost.com/?p=postId
      navInit.current = { route: { view: 'feed', params: { post: deepPost } }, stack: [{ view: 'feed', params: {} }] };
    } else if (deepUser) { // shared profile link: classcost.com/?u=handle
      navInit.current = { route: { view: 'feed', params: { user: deepUser.replace('@', '') } }, stack: [{ view: 'feed', params: {} }] };
    } else {
      let snap = null;
      try { snap = (window.history.state && window.history.state.ccNav) || null; } catch { snap = null; }
      if (!snap) { try { const s = sessionStorage.getItem('cc_v2_nav'); if (s) snap = JSON.parse(s); } catch { snap = null; } }
      navInit.current = (snap && snap.route) ? snap : { route: { view: 'home', params: {} }, stack: [] };
    }
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
    try {
      let cleanUrl;
      try { const uu = new URL(window.location); if (uu.searchParams.has('u') || uu.searchParams.has('p')) { uu.searchParams.delete('u'); uu.searchParams.delete('p'); cleanUrl = uu.toString(); } } catch { cleanUrl = undefined; }
      window.history.replaceState({ ...(window.history.state || {}), ccNav: { route, stack: stack.current } }, '', cleanUrl);
    } catch { /* noop */ }
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
          <button key={v} {...(v === 'feed' ? { 'data-cc-feedtab': '1' } : {})} className={`v2-deskitem ${(v === 'home' ? homeActive : view === v) ? 'active' : ''}`} onClick={() => tab(v)}><NavIcon v={v} Icon={Icon} size={18} />{label}</button>
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
      <Leeboon nav={nav} d={d} news={news} inFeed={view === 'feed'} inChat={view === 'feed' && !!(params && params.dm)} />

      {/* desktop right rail */}
      <aside className="v2-desk v2-rail">
        <div className="card p-4">
          <p className="font-bold t-hi t-serif text-[15px]">Hi, {firstName}</p>
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
            <button key={v} {...(v === 'feed' ? { 'data-cc-feedtab': '1' } : {})} className={`v2-navbtn ${(v === 'home' ? homeActive : view === v) ? 'active' : ''}`} onClick={() => tab(v)}><NavIcon v={v} Icon={Icon} size={20} />{label}</button>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default function V2App() {
  return (<V2Provider><Shell /></V2Provider>);
}
