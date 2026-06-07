/**
 * Leeboon's "brain" — friendship, happiness, and memory, persisted locally.
 *
 * Pure helpers over a single localStorage record. No React. The widget calls
 * these on interactions and reads back a mood + the occasional memory line so
 * Leeboon feels like he remembers you between visits.
 */

const KEY = 'leboon_brain_v1';
const todayStr = () => new Date().toISOString().slice(0, 10);
const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

function fresh() {
  return {
    friendship: 40,      // 0..100
    happiness: 60,       // 0..100
    firstVisit: todayStr(),
    lastVisit: todayStr(),
    streak: 1,
    // per-day tallies (reset each calendar day)
    day: todayStr(),
    todayPets: 0,
    todayHits: 0,
    todayIgnored: false,
    // yesterday snapshot (for "you ignored me yesterday")
    prevDay: null,
    prevPets: 0,
    prevHits: 0,
    prevIgnored: false,
  };
}

export function loadBrain() {
  let s;
  try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { s = null; }
  if (!s || typeof s !== 'object') s = fresh();

  const t = todayStr();
  if (s.day !== t) {
    // roll the day: snapshot yesterday, reset today's tallies, update streak/visit
    const last = s.lastVisit || s.day;
    const dayMs = 86400000;
    const gap = Math.round((new Date(t) - new Date(last)) / dayMs);
    s.prevDay = s.day; s.prevPets = s.todayPets || 0; s.prevHits = s.todayHits || 0; s.prevIgnored = !!s.todayIgnored;
    s.day = t;
    s.todayPets = 0; s.todayHits = 0; s.todayIgnored = false;
    s.streak = gap === 1 ? (s.streak || 0) + 1 : 1; // consecutive-day visits
    s.lastVisit = t;
    // a daily visit is a small kindness; a long absence cools things slightly
    s.friendship = clamp((s.friendship || 40) + (gap === 1 ? 3 : gap > 3 ? -5 : 0));
    save(s);
  }
  return s;
}

export function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
  return s;
}

// ── interactions (mutate + persist, return the new state) ────────────────────
export function onPet(s) {
  s.todayPets = (s.todayPets || 0) + 1;
  s.happiness = clamp((s.happiness || 0) + 6);
  s.friendship = clamp((s.friendship || 0) + 3); // petting: +3
  return save(s);
}
// Hovering (cursor over Leboon, no click) — "you noticed me". +1.
// The caller cooldown-gates this so it can't be spammed.
export function onHover(s) {
  s.happiness = clamp((s.happiness || 0) + 2);
  s.friendship = clamp((s.friendship || 0) + 1); // hovering: +1
  return save(s);
}
export function onHit(s) {
  s.todayHits = (s.todayHits || 0) + 1;
  s.happiness = clamp((s.happiness || 0) - 12);
  s.friendship = clamp((s.friendship || 0) - 3);
  return save(s);
}
export function onTalk(s) {
  s.happiness = clamp((s.happiness || 0) + 3);
  s.friendship = clamp((s.friendship || 0) + 2); // talking: +2
  return save(s);
}
export function onIgnore(s) {
  s.todayIgnored = true;
  s.happiness = clamp((s.happiness || 0) - 4);
  s.friendship = clamp((s.friendship || 0) - 0.5);
  return save(s);
}

// friendship tier (unlocks warmer reactions)
export function tier(s) {
  const f = s?.friendship || 0;
  if (f >= 85) return { level: 5, name: 'Best Friend' };
  if (f >= 65) return { level: 4, name: 'Close Pal' };
  if (f >= 45) return { level: 3, name: 'Buddy' };
  if (f >= 25) return { level: 2, name: 'Friend' };
  return { level: 1, name: 'New Friend' };
}

// A memory-aware greeting line, chosen from what actually happened.
export function memoryLine(s) {
  const t = tier(s);
  const lines = [];
  if ((s.todayPets || 0) >= 5) lines.push('You petted me a lot today! 🥰');
  if (s.prevIgnored) lines.push('You ignored me yesterday… but you came back! 🥺');
  if ((s.streak || 0) >= 3) lines.push(`${s.streak} days in a row — you always check on me! 💛`);
  if ((s.prevHits || 0) >= 3) lines.push("Please be gentle today? 🙏");
  if (t.level >= 4) lines.push("You're my favourite human, you know that? 💕");
  if (!lines.length) lines.push('Thanks for checking on me! 🐣');
  // deterministic pick (no Math.random at module init issues)
  return lines[(s.todayPets + s.streak + (s.friendship | 0)) % lines.length];
}

export { clamp as clampPct };
