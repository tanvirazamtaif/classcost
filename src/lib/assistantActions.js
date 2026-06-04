/**
 * Client-side execution layer for the "Ask ClassCost" agent.
 *
 * The server (Claude) only PROPOSES an action: { name, input }. Nothing is
 * written until the user taps Confirm in the widget. On confirm, the widget
 * calls execute() here, which runs the change through the app's own existing,
 * tested mutators (so the UI updates instantly and server-sync paths are reused).
 *
 * Each action provides:
 *   buildPreview(input, ctx) -> { title, rows[[label,value]], before?, after? }
 *   execute(input, ctx)       -> performs the mutation (may be async)
 *
 * `ctx` is assembled by the widget from AppContext + EducationFeeContext.
 */

const CAT_LABEL = {
  canteen: '🍽️ Food', transport: '🚌 Transport', books: '📚 Books',
  education: '🎓 Education', hostel: '🏠 Housing', uniform: '👔 Uniform',
  health: '🩺 Health', other: '📦 Other',
};
const catLabel = (c) => CAT_LABEL[c] || c || 'Other';
const today = () => new Date().toISOString().slice(0, 10);
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const clampDay = (d) => Math.min(28, Math.max(1, Number(d) || 1));

// Best-effort "current amount" across the fee model's variants.
function feeAmount(fee) {
  if (!fee) return 0;
  return (
    fee.recurring?.amount ?? fee.semester?.totalAmount ?? fee.yearly?.amount ??
    fee.oneTime?.amount ?? fee.perClass?.ratePerClass ?? fee.amount ?? 0
  );
}
const feeName = (fee) => fee?.name || fee?.label || fee?.feeType || 'Fee';

export const ACTIONS = {
  add_expense: {
    buildPreview: ({ amount, category, note, date }, ctx) => ({
      title: 'Add Expense',
      rows: [
        ['Amount', ctx.fmt(Number(amount))],
        ['Category', catLabel(category)],
        ...(note ? [['Note', note]] : []),
        ['Date', date || 'Today'],
      ],
    }),
    execute: async ({ amount, category, note, date }, ctx) => {
      await ctx.addExpense({
        type: category || 'other',
        amount: Number(amount),
        label: note || catLabel(category).replace(/^[^\s]+\s/, ''),
        details: note || '',
        date: date || today(),
      });
    },
  },

  edit_expense: {
    buildPreview: ({ expense_id, amount, category, note }, ctx) => {
      const cur = ctx.expenses.find((e) => e.id === expense_id);
      if (!cur) throw new Error("I couldn't find that expense.");
      const fmtOne = (e) => `${ctx.fmt(Number(e.amount))} · ${catLabel(e.type)}${e.label ? ` · ${e.label}` : ''}`;
      const merged = {
        ...cur,
        ...(amount != null ? { amount: Number(amount) } : {}),
        ...(category ? { type: category } : {}),
        ...(note != null ? { label: note } : {}),
      };
      return { title: 'Edit Expense', before: fmtOne(cur), after: fmtOne(merged) };
    },
    execute: async ({ expense_id, amount, category, note }, ctx) => {
      await ctx.editExpense(expense_id, {
        ...(amount != null ? { amount: Number(amount) } : {}),
        ...(category ? { type: category } : {}),
        ...(note != null ? { label: note, details: note } : {}),
      });
    },
  },

  delete_expense: {
    buildPreview: ({ expense_id }, ctx) => {
      const cur = ctx.expenses.find((e) => e.id === expense_id);
      if (!cur) throw new Error("I couldn't find that expense.");
      return {
        title: 'Delete Expense',
        rows: [['Amount', ctx.fmt(Number(cur.amount))], ['Category', catLabel(cur.type)], ...(cur.label ? [['Note', cur.label]] : [])],
      };
    },
    execute: async ({ expense_id }, ctx) => { await ctx.removeExpense(expense_id); },
  },

  add_loan: {
    buildPreview: ({ person, amount, direction, due_date }, ctx) => ({
      title: 'Add Loan',
      rows: [
        ['Person', person],
        ['Amount', ctx.fmt(Number(amount))],
        ['Type', direction === 'borrowed' ? 'Borrowed (you owe)' : 'Lent (owed to you)'],
        ...(due_date ? [['Due', due_date]] : []),
      ],
    }),
    execute: async ({ person, amount, direction, note, due_date }, ctx) => {
      await ctx.addLoan({
        id: genId(),
        person,
        amount: Number(amount),
        type: direction,
        note: note || '',
        dueDate: due_date || null,
        date: today(),
        payments: [],
      });
    },
  },

  create_reminder: {
    buildPreview: ({ name, amount, category, due_day, reminder_days }, ctx) => ({
      title: 'Create Reminder',
      rows: [
        ['Name', name],
        ['Amount', ctx.fmt(Number(amount))],
        ['Category', catLabel(category || 'education')],
        ['Due day', `${clampDay(due_day)} of each month`],
        ['Remind', `${reminder_days || 2} days before`],
      ],
    }),
    execute: async ({ name, amount, category, due_day, reminder_days }, ctx) => {
      ctx.addScheduledPayment({
        name,
        amount: Number(amount),
        category: category || 'education',
        type: category || 'education',
        frequency: 'monthly',
        dueDay: clampDay(due_day),
        reminderDays: Number(reminder_days) || 2,
      });
    },
  },

  update_reminder: {
    buildPreview: ({ reminder_id, name, amount, due_day, reminder_days }, ctx) => {
      const cur = ctx.scheduledPayments.find((p) => p.id === reminder_id);
      if (!cur) throw new Error("I couldn't find that reminder.");
      const fmtOne = (p) => `${p.name} · ${ctx.fmt(Number(p.amount))} · due ${p.dueDay}`;
      const merged = {
        ...cur,
        ...(name ? { name } : {}),
        ...(amount != null ? { amount: Number(amount) } : {}),
        ...(due_day != null ? { dueDay: clampDay(due_day) } : {}),
      };
      return { title: 'Update Reminder', before: fmtOne(cur), after: fmtOne(merged) };
    },
    execute: async ({ reminder_id, name, amount, due_day, reminder_days }, ctx) => {
      ctx.updateScheduledPayment(reminder_id, {
        ...(name ? { name } : {}),
        ...(amount != null ? { amount: Number(amount) } : {}),
        ...(due_day != null ? { dueDay: clampDay(due_day) } : {}),
        ...(reminder_days != null ? { reminderDays: Number(reminder_days) } : {}),
      });
    },
  },

  delete_reminder: {
    buildPreview: ({ reminder_id }, ctx) => {
      const cur = ctx.scheduledPayments.find((p) => p.id === reminder_id);
      if (!cur) throw new Error("I couldn't find that reminder.");
      return { title: 'Delete Reminder', rows: [['Name', cur.name], ['Amount', ctx.fmt(Number(cur.amount))]] };
    },
    execute: async ({ reminder_id }, ctx) => { ctx.deleteScheduledPayment(reminder_id); },
  },

  change_fee_amount: {
    buildPreview: ({ fee_id, new_amount }, ctx) => {
      const cur = ctx.activeFees.find((f) => f.id === fee_id);
      if (!cur) throw new Error("I couldn't find that fee.");
      return {
        title: `Change ${feeName(cur)} Amount`,
        before: `Current: ${ctx.fmt(feeAmount(cur))}`,
        after: `New: ${ctx.fmt(Number(new_amount))}`,
      };
    },
    execute: async ({ fee_id, new_amount }, ctx) => {
      ctx.updateFeeAmount(fee_id, Number(new_amount), today(), 'Changed via Ask ClassCost');
    },
  },

  delete_fee: {
    buildPreview: ({ fee_id }, ctx) => {
      const cur = ctx.activeFees.find((f) => f.id === fee_id);
      if (!cur) throw new Error("I couldn't find that fee.");
      return { title: 'Delete Fee', rows: [['Fee', feeName(cur)], ['Amount', ctx.fmt(feeAmount(cur))]] };
    },
    execute: async ({ fee_id }, ctx) => { ctx.deleteFee(fee_id); },
  },
};

// Human summary of a completed action (for the audit log + chat confirmation).
export function describeAction(name, preview) {
  const t = preview?.title || name;
  if (preview?.before && preview?.after) return `${t}: ${preview.before} → ${preview.after}`;
  if (preview?.rows?.length) return `${t} (${preview.rows.map(([, v]) => v).join(', ')})`;
  return t;
}

// ── Audit log (localStorage) ─────────────────────────────────────────────────
const AUDIT_KEY = 'classcost_ai_audit';

export function getAuditLog() {
  try { return JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]'); } catch { return []; }
}

export function logAction({ command, summary }) {
  try {
    const entry = { id: genId(), ts: new Date().toISOString(), command, summary };
    const log = getAuditLog();
    log.unshift(entry);
    localStorage.setItem(AUDIT_KEY, JSON.stringify(log.slice(0, 100)));
    return entry;
  } catch { return null; }
}

export function clearAuditLog() {
  try { localStorage.removeItem(AUDIT_KEY); } catch { /* ignore */ }
}
