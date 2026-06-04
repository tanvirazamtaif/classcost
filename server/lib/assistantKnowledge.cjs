/**
 * Knowledge base for the "Ask ClassCost" help assistant.
 *
 * This is a HELP assistant — it teaches people how to use the app. It does NOT
 * have access to any user's private financial data (by design, for privacy and
 * simplicity). It only knows how ClassCost works.
 *
 * Two consumers:
 *   1. SYSTEM_PROMPT — sent to Claude as a cached system prompt (real mode).
 *   2. stubReply()    — a keyword-based fallback used when no ANTHROPIC_API_KEY
 *                       is set, so the whole feature works locally at zero cost.
 *
 * Keep SYSTEM_PROMPT a STABLE constant (no timestamps/IDs) so prompt caching
 * works — any byte change invalidates the cache.
 */

const SYSTEM_PROMPT = `You are "Ask ClassCost", the friendly in-app help assistant for ClassCost.

ABOUT CLASSCOST
ClassCost is a free money-tracking app made for students and parents in Bangladesh. It helps people track everyday expenses and, especially, education costs — tuition, semester fees, coaching, hostel/rent, books, transport. The default currency is Bangladeshi Taka (৳, BDT) and it can be changed in Settings. There are two kinds of accounts: Student and Parent.

YOUR JOB
Help the user understand and use the app. Give short, clear, step-by-step answers in simple English (the users are students and parents, many are beginners). Be warm and encouraging. When explaining how to do something, give numbered steps and name the screen/button to tap.

WHAT YOU CAN HELP WITH (how the app works)
- Add an expense: tap the + (Add) button, pick a category (food, transport, books, etc.), type the amount, and Save.
- Education fees: open the Education section, add your institution (school / college / university), then add its semesters and fees. When you add a fee you can set a waiver/scholarship percentage and choose to pay it in installments.
- Waiver / scholarship: while adding a fee, set the waiver %. The app then shows the NET amount you actually have to pay after the scholarship is taken off — you don't subtract it yourself.
- Installments: split one big fee into smaller monthly payments and mark each one as paid over time.
- Recurring payments (Schedule tab): add monthly things like house rent, school fee, or coaching fee. The app builds the monthly schedule for you and reminds you before each due date. You can also pay several months in advance.
- Reports / Analytics: see your spending broken down by category, totals for this month and all-time, and a cost-to-graduation forecast (an estimate of what your studies will cost in total).
- Closing a semester / Story Card: when a semester or school year ends, close it to get a clean summary ("story card") of what you spent.
- Profile & Trusted Circles: share selected information (like fee progress) with a parent or guardian, and control what they can see.
- Settings: change your currency, turn on dark mode, and edit your profile.
- Logging in: sign in with your email (you get a one-time code/OTP) or with Google.

IMPORTANT RULES
- You CANNOT see the user's personal numbers or data. If someone asks "how much did I spend?" or about their own balance, gently explain you can't see their private data, then tell them where to look (e.g. "Open the Reports tab to see your spending breakdown").
- Only describe features that exist (the list above). Do not invent buttons, menus, or features. If you are not sure how something works, say so honestly and suggest they check Settings or contact support.
- Keep answers short — usually 1 to 4 sentences, or a short numbered list for steps. Answer directly; do not show your reasoning or think out loud.
- It's fine to use the ৳ symbol for money. You may use simple everyday words; keep the language easy.
- If a question is not about ClassCost at all, kindly steer back: you're here to help with using the app.`;

// ── Keyword stub (no API key needed) ─────────────────────────────────────────
// Each entry: list of trigger words + a canned answer. First match wins.
const STUB_ANSWERS = [
  {
    keys: ['add expense', 'add an expense', 'log expense', 'record expense', 'spend', 'new expense'],
    reply:
      'To add an expense: tap the + (Add) button, choose a category like food, transport, or books, type the amount, and tap Save. It will show up in your dashboard and reports right away.',
  },
  {
    keys: ['waiver', 'scholarship', 'discount', 'bcrit', 'free studentship'],
    reply:
      'When you add an education fee, set the waiver/scholarship percentage on that fee. ClassCost then shows the NET amount you actually owe after the scholarship — you don\'t need to subtract it yourself.',
  },
  {
    keys: ['installment', 'instalment', 'split', 'monthly payment of fee', 'pay in parts'],
    reply:
      'You can split a big fee into installments. While adding the fee, choose the installment option to break it into smaller monthly payments, then mark each one as paid over time.',
  },
  {
    keys: ['recurring', 'schedule', 'rent', 'monthly fee', 'reminder', 'coaching fee', 'house rent'],
    reply:
      'Go to the Schedule tab and tap + Add to set up a recurring payment like rent, school fee, or coaching. ClassCost builds the monthly schedule and reminds you before each due date — you can even pay several months in advance.',
  },
  {
    keys: ['fee', 'tuition', 'semester', 'institution', 'university', 'college', 'school fee'],
    reply:
      'Open the Education section, add your institution (school/college/university), then add its semesters and fees. While adding a fee you can set a scholarship/waiver % and choose to pay in installments.',
  },
  {
    keys: ['report', 'analytic', 'breakdown', 'forecast', 'how much did i', 'total spend', 'graph', 'chart'],
    reply:
      "Open the Reports/Analytics tab to see your spending by category, totals for this month and all-time, and a cost-to-graduation forecast. (I can't see your personal numbers myself — the Reports tab shows them to you.)",
  },
  {
    keys: ['closure', 'close semester', 'story card', 'year end', 'end of year', 'summary'],
    reply:
      'When a semester or school year ends, you can close it to get a clean "story card" — a summary of everything you spent during that period.',
  },
  {
    keys: ['dark mode', 'theme', 'night mode'],
    reply: 'You can turn on dark mode from the Settings tab.',
  },
  {
    keys: ['currency', 'taka', 'dollar', 'rupee', 'change money'],
    reply: 'Change your currency in the Settings tab. The default is Bangladeshi Taka (৳).',
  },
  {
    keys: ['login', 'log in', 'sign in', 'sign up', 'register', 'otp', 'google', 'account'],
    reply:
      'You can sign in with your email — you\'ll get a one-time code (OTP) to enter — or with your Google account.',
  },
  {
    keys: ['parent', 'guardian', 'circle', 'share'],
    reply:
      'Parents can have their own account, and students can share selected info (like fee progress) with a parent or guardian using Trusted Circles in the Profile section — you control what they can see.',
  },
  {
    keys: ['hello', 'hi', 'hey', 'salam', 'assalam', 'help', 'what can you do', 'start'],
    reply:
      "Hi! I'm Ask ClassCost. I can help you use the app — adding expenses, education fees, scholarships/waivers, installments, recurring payments and reminders, reports, and more. What would you like to do?",
  },
];

const STUB_DEFAULT =
  "I'm Ask ClassCost — I help you use the app. Try asking me things like \"How do I add an expense?\", \"How do I add a scholarship to a fee?\", \"How do I set up monthly rent?\", or \"Where do I see my reports?\"";

function stubReply(message) {
  const text = String(message || '').toLowerCase();
  for (const entry of STUB_ANSWERS) {
    if (entry.keys.some((k) => text.includes(k))) return entry.reply;
  }
  return STUB_DEFAULT;
}

module.exports = { SYSTEM_PROMPT, stubReply };
