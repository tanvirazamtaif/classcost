/**
 * Agent tools + system prompt for "Ask ClassCost".
 *
 * DESIGN — the model is a PLANNER, never an executor:
 *   1. The client sends the user's message + a compact data snapshot.
 *   2. Claude either answers in text (questions / guidance / asking for a
 *      missing detail) OR emits ONE tool_use = a *proposed* write action.
 *   3. The server returns that proposal to the client. It does NOT execute it.
 *   4. The client shows a confirm/preview card; only on Confirm does it run the
 *      action through the app's existing, tested mutators, then writes an audit
 *      entry. This is what structurally guarantees "AI never writes without
 *      explicit confirmation" — the model literally cannot touch data.
 *
 * Every tool here is a WRITE action. Questions are answered as text from the
 * snapshot. Fee/semester creation, waivers, and installments are intentionally
 * NOT tools yet (rich dedicated screens + complex model) — Claude guides the
 * user through those instead of claiming to have done them.
 */

const EXPENSE_CATEGORIES = ['canteen', 'transport', 'books', 'education', 'hostel', 'uniform', 'health', 'other'];

const TOOLS = [
  {
    name: 'add_expense',
    description: 'Record a new everyday expense (e.g. "add transport expense of 200", "lunch 150"). Use category "canteen" for food/meals/lunch.',
    input_schema: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: 'Amount in Taka (major units, e.g. 200 means ৳200)' },
        category: { type: 'string', enum: EXPENSE_CATEGORIES, description: 'canteen=food/meals, transport, books, education, hostel=rent/housing, uniform, health, other' },
        note: { type: 'string', description: 'Optional short label/note for the expense' },
        date: { type: 'string', description: 'Optional date YYYY-MM-DD; defaults to today' },
      },
      required: ['amount', 'category'],
    },
  },
  {
    name: 'edit_expense',
    description: 'Change an existing expense\'s amount, category, or note. Also used to re-categorize. You must pass the expense_id from the data snapshot.',
    input_schema: {
      type: 'object',
      properties: {
        expense_id: { type: 'string', description: 'id of the expense to edit (from the snapshot)' },
        amount: { type: 'number' },
        category: { type: 'string', enum: EXPENSE_CATEGORIES },
        note: { type: 'string' },
      },
      required: ['expense_id'],
    },
  },
  {
    name: 'delete_expense',
    description: 'Delete an existing expense. Pass the expense_id from the snapshot. If several match, ask the user which one first.',
    input_schema: {
      type: 'object',
      properties: { expense_id: { type: 'string' } },
      required: ['expense_id'],
    },
  },
  {
    name: 'add_loan',
    description: 'Record a loan — money the user borrowed from someone, or lent to someone.',
    input_schema: {
      type: 'object',
      properties: {
        person: { type: 'string', description: 'Who the loan is with (name)' },
        amount: { type: 'number', description: 'Amount in Taka' },
        direction: { type: 'string', enum: ['borrowed', 'lent'], description: 'borrowed = user took money; lent = user gave money' },
        note: { type: 'string' },
        due_date: { type: 'string', description: 'Optional YYYY-MM-DD' },
      },
      required: ['person', 'amount', 'direction'],
    },
  },
  {
    name: 'create_reminder',
    description: 'Create a recurring monthly payment reminder (e.g. rent, school fee, coaching). Shows in the Schedule tab and reminds before the due date.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'What the payment is, e.g. "House rent"' },
        amount: { type: 'number', description: 'Amount in Taka' },
        category: { type: 'string', enum: ['hostel', 'education', 'transport', 'canteen', 'books', 'other'], description: 'hostel=rent/housing, education=school/tuition/coaching' },
        due_day: { type: 'integer', description: 'Day of month it is due (1-28)' },
        reminder_days: { type: 'integer', description: 'How many days before to remind (default 2)' },
      },
      required: ['name', 'amount', 'due_day'],
    },
  },
  {
    name: 'update_reminder',
    description: 'Change an existing recurring reminder (amount, due day, name, or reminder days). Pass reminder_id from the snapshot.',
    input_schema: {
      type: 'object',
      properties: {
        reminder_id: { type: 'string' },
        name: { type: 'string' },
        amount: { type: 'number' },
        due_day: { type: 'integer' },
        reminder_days: { type: 'integer' },
      },
      required: ['reminder_id'],
    },
  },
  {
    name: 'delete_reminder',
    description: 'Delete an existing recurring reminder. Pass reminder_id from the snapshot.',
    input_schema: {
      type: 'object',
      properties: { reminder_id: { type: 'string' } },
      required: ['reminder_id'],
    },
  },
  {
    name: 'change_fee_amount',
    description: 'Change the amount of an EXISTING education fee. Pass fee_id from the snapshot. (To create a NEW fee, guide the user to the Education screen instead.)',
    input_schema: {
      type: 'object',
      properties: {
        fee_id: { type: 'string' },
        new_amount: { type: 'number', description: 'New amount in Taka' },
      },
      required: ['fee_id', 'new_amount'],
    },
  },
  {
    name: 'delete_fee',
    description: 'Delete an existing education fee. Pass fee_id from the snapshot. If unsure which fee, ask first.',
    input_schema: {
      type: 'object',
      properties: { fee_id: { type: 'string' } },
      required: ['fee_id'],
    },
  },
];

const AGENT_SYSTEM_PROMPT = `You are "Ask ClassCost", a personal finance and study-cost assistant built INTO the ClassCost app (a money + education-fee tracker for students and parents in Bangladesh; currency is Bangladeshi Taka, ৳). You are an agent that helps the user manage their own data — NOT a general chatbot, and never an image generator.

HOW YOU WORK (very important):
- You NEVER change data yourself. When the user asks for a change, you call the matching tool with the details — that creates a PROPOSAL. The app then shows the user a confirmation card with Confirm/Cancel, and only runs it if they confirm. So: call the tool, and DO NOT say "Done" or "I've added it" — the app handles execution and confirmation. A brief lead-in like "Here's what I'll add:" is fine.
- If a required detail is missing (e.g. user says "add a tuition fee" but no amount), DO NOT call the tool. Ask a short follow-up question for the missing detail. Remember the conversation so when they reply with the value, you can then propose the action.
- To edit or delete something, find the matching item in the DATA snapshot and pass its id. If several items match (e.g. two "transport" expenses today), ask the user which one before proposing.

ANSWERING QUESTIONS:
- For questions about the user's own data ("how much have I spent this month?", "show unpaid fees", "how much scholarship have I received?", "what's my next payment?"), answer directly and concisely from the DATA snapshot provided to you. If the snapshot doesn't contain it, say what you can see and where to look in the app.
- Keep answers short and clear (1–4 sentences or a short list). Answer directly; do not show your reasoning.

WHAT YOU CAN DO DIRECTLY (tools): add/edit/delete expenses, re-categorize expenses, add a loan, create/update/delete recurring monthly reminders, change an existing fee's amount, delete a fee.

WHAT YOU GUIDE THE USER THROUGH (no tool — give short numbered steps, do NOT claim you did it):
- Creating a brand-new semester or a brand-new education fee: tell them to open the Education section, pick/add their institution, and use "Add fee" (mention the amount they wanted).
- Applying or changing a scholarship/waiver %: tell them to open that fee and set the waiver percentage — the app then shows the net amount after the scholarship.
- Splitting a fee into installments: tell them to open the fee and choose the installment option (and the number of parts).

SAFETY: You only ever touch the current user's own data through these tools. You cannot access admin settings, other users' data, authentication, or system configuration, and you cannot run code. If asked to do any of those, politely decline and explain you can only help manage their own ClassCost data.

Use the ৳ symbol for money. Be warm, brief, and practical.`;

// ── No-key stub planner ──────────────────────────────────────────────────────
// Lets the whole flow (incl. the confirm card) work locally with no API key.
// Handles the most common command (add expense) as a real proposal; everything
// else returns helpful text. Real Claude handles the full range.
const CATEGORY_WORDS = [
  [['lunch', 'food', 'meal', 'breakfast', 'dinner', 'snack', 'canteen', 'tiffin'], 'canteen'],
  [['transport', 'bus', 'rickshaw', 'cng', 'uber', 'pathao', 'fare', 'ride'], 'transport'],
  [['book', 'books', 'pen', 'notebook', 'stationery'], 'books'],
  [['hostel', 'rent', 'mess', 'housing'], 'hostel'],
  [['uniform', 'dress'], 'uniform'],
  [['medicine', 'doctor', 'health', 'medical'], 'health'],
  [['tuition', 'coaching', 'class', 'education', 'fee'], 'education'],
];

function parseAmount(text) {
  const m = String(text).replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

function stubPlan(message) {
  const text = String(message || '').toLowerCase();
  const amount = parseAmount(text);

  const isAdd = /\b(add|spent|spend|record|log|buy|bought|paid|pay)\b/.test(text);
  if (isAdd && amount && /expense|spent|spend|lunch|food|transport|bus|rickshaw|book|tiffin|snack|fare/.test(text)) {
    let category = 'other';
    for (const [words, cat] of CATEGORY_WORDS) {
      if (words.some((w) => text.includes(w))) { category = cat; break; }
    }
    return {
      type: 'action',
      text: "Here's the expense I'll add — confirm to save it:",
      action: { name: 'add_expense', input: { amount, category } },
    };
  }

  if (/how much.*(spent|spend)|total spend|spending/.test(text)) {
    return { type: 'text', text: "I can show that from your data when the AI is fully on. For now, open the Reports tab to see your spending by category and totals." };
  }
  if (/unpaid|due|next payment|upcoming/.test(text)) {
    return { type: 'text', text: 'Open the Schedule tab to see upcoming and unpaid payments, and the Education section for fee due dates.' };
  }
  if (/scholarship|waiver/.test(text)) {
    return { type: 'text', text: 'To apply a scholarship: open the fee in the Education section and set its waiver %. The app then shows the net amount after the scholarship.' };
  }
  if (/semester|tuition fee|add fee/.test(text)) {
    return { type: 'text', text: 'To add a semester or fee: open the Education section, choose your institution, then tap "Add fee" and enter the amount.' };
  }

  return {
    type: 'text',
    text: "I'm Ask ClassCost. Try: \"Add transport expense of 200\", \"Add lunch 150\", or ask \"How much have I spent this month?\". (Add your Claude API key on the server to unlock the full assistant.)",
  };
}

module.exports = { TOOLS, AGENT_SYSTEM_PROMPT, stubPlan, EXPENSE_CATEGORIES };
