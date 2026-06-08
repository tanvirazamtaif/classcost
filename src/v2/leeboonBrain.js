// ClassCost v2 — Leeboon's brain (client stub). Understands meaning (lunch=food), light NL,
// and maps to v2 store actions. Returns { text, confirm? }. confirm = { label, run } for money
// actions; navigation happens inline. Swap interpret() for a Claude /api call in production.

const FOOD = /\b(food|lunch|dinner|breakfast|meal|snack|snacks|eat|ate|khabar|canteen|coffee|tea|biryani)\b/i;
const TRANSPORT = /\b(transport|bus|rickshaw|cng|uber|pathao|ride|fare|travel|taxi|auto|metro)\b/i;
const GREET = /\b(hi|hello|hey|hii+|yo|salam|assalam|help|what can you|who are you)\b/i;
const HELLOS = ['Hey! 👋', 'Hiii! 🐥', 'Yo — what do you need?', 'Hey there, ready when you are.'];

const num = (t) => { const m = t.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/); return m ? +m[1] : null; };
const pick = (arr, seed) => arr[Math.abs(seed || 0) % arr.length];
const categoryOf = (t) => (FOOD.test(t) ? ['Food', '🍔'] : TRANSPORT.test(t) ? ['Transport', '🚌'] : ['Others', '📦']);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function interpret(raw, ctx) {
  const text = (raw || '').trim();
  const low = text.toLowerCase();
  if (!text) return { text: 'Say something 🙂' };

  // greeting / help
  if (GREET.test(low) && low.length < 26) {
    return { text: `${pick(HELLOS, text.length)} I can log spends ("spent 200 on lunch"), create things ("create BRAC"), answer "how much on food this month", or take you anywhere ("go to calendar").` };
  }

  // navigation
  const navM = low.match(/\b(go to|open|take me to|show|navigate to)\b\s+(.+)/);
  if (navM) {
    const dest = navM[2].replace(/\b(the|my|page|screen)\b/g, '').trim();
    const tab = ['home', 'calendar', 'reports', 'settings'].find((t) => dest.includes(t));
    if (tab) { ctx.nav(tab); return { text: `Taking you to ${cap(tab)} →` }; }
    const sp = ctx.spaces.find((s) => dest.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(dest));
    if (sp) { ctx.nav(sp.type, { spaceId: sp.id }); return { text: `Opening ${sp.name} →` }; }
    return { text: `I couldn't find "${dest}". Try a space name, or Home / Calendar / Reports / Settings.` };
  }

  // create
  const createM = low.match(/\b(create|add|new|make)\b\s+(.+)/);
  if (createM) {
    const rest = createM[2];
    if (/\b(brac|dhaka|du|monipur|udvash|university|college|school|coaching|institute)\b/i.test(rest)) {
      const name = text.replace(/.*\b(create|add|new|make)\b/i, '').replace(/\b(an?|institute|university|college|school|coaching|the)\b/gi, '').trim() || 'New institute';
      return { text: `Create an institute called "${name}"?`, confirm: { label: 'Create institute', run: () => { const s = ctx.createInstitute(name); ctx.nav('institute', { spaceId: s.id }); } } };
    }
    if (/\b(residence|hostel|mess|flat|room)\b/i.test(rest)) { ctx.nav('new-residence'); return { text: 'Opening the new-residence form — set rent & deposit there →' }; }
    if (/\bclub\b/i.test(rest)) { ctx.nav('new-simple', { stype: 'club' }); return { text: 'Opening the new-club form →' }; }
    if (/\b(vehicle|bike|motorcycle|cycle|scooter)\b/i.test(rest)) { ctx.nav('new-simple', { stype: 'vehicle' }); return { text: 'Opening the new-vehicle form →' }; }
    ctx.nav('create'); return { text: 'What do you want to create? →' };
  }

  // query
  if (/\b(how much|total|spent|spend)\b/.test(low) && num(text) == null) {
    const cats = ctx.categoryTotals(), sm = ctx.summary();
    if (FOOD.test(low)) return { text: `Food this month: ${ctx.fmt(cats.Food?.total || 0)}.` };
    if (TRANSPORT.test(low)) return { text: `Transport this month: ${ctx.fmt(cats.Transport?.total || 0)}.` };
    if (low.includes('year')) return { text: `This year: ${ctx.fmt(sm.year)}.` };
    if (low.includes('last')) return { text: `Last month: ${ctx.fmt(sm.last)}.` };
    if (low.includes('life')) return { text: `Lifetime: ${ctx.fmt(sm.life)}.` };
    return { text: `This month you've spent ${ctx.fmt(sm.month)}.` };
  }

  // log daily spend (number + spend word)
  const amount = num(text);
  if (amount != null) {
    const [catName, icon] = categoryOf(low);
    let sector = ctx.personalSpace();
    const secM = low.match(/\b(?:at|under|for|in)\s+([a-z0-9 ]+)/);
    if (secM) { const q = secM[1].trim(); const hit = ctx.spaces.find((s) => q.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(q)); if (hit) sector = hit; }
    const sname = sector?.name || 'Personal';
    return { text: `Add ${ctx.fmt(amount)} ${catName} under ${sname}?`, confirm: { label: `Add ${ctx.fmt(amount)} ${catName}`, run: () => sector && ctx.logDaily(catName, icon, sector.id, amount) } };
  }

  return { text: `Hmm, didn't catch that. Try "spent 200 on lunch", "create BRAC", "how much on food", or "go to calendar".` };
}
