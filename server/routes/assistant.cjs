const express = require('express');
const router = express.Router();
const { SYSTEM_PROMPT, stubReply } = require('../lib/assistantKnowledge.cjs');
const { TOOLS, AGENT_SYSTEM_PROMPT, stubPlan } = require('../lib/assistantTools.cjs');

/**
 * "Ask ClassCost" help assistant — POST /api/assistant  { message, history }
 *
 * Two modes, chosen automatically:
 *   • Real    — when ANTHROPIC_API_KEY is set, calls Claude server-side.
 *   • Stub    — when no key is set, returns keyword-based canned help. This is
 *               what runs locally by default, so the whole feature works with
 *               zero cost and no key.
 *
 * The API key NEVER leaves the server. This is a help assistant: it is told how
 * the app works and is NOT given any user's private data.
 *
 * Not a USERID_FIRST route, so it is never blocked by userAuthGuard.
 */

const MODEL = process.env.ASSISTANT_MODEL || 'claude-opus-4-8';
const MAX_MESSAGE_CHARS = 1500;   // cap a single question
const MAX_HISTORY_TURNS = 10;     // cap context we send to Claude (cost guard)

// ── Lazy SDK load — the stub path needs no package, so local dev works even if
//    @anthropic-ai/sdk isn't installed. Loaded once, only when a key is present.
let _Anthropic;
let _client;
function getClient() {
  if (_client) return _client;
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    if (!_Anthropic) _Anthropic = require('@anthropic-ai/sdk');
    _client = new _Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    return _client;
  } catch (err) {
    console.error('[assistant] @anthropic-ai/sdk not available, using stub:', err.message);
    return null;
  }
}

// ── Tiny in-memory per-IP rate limit (cost/abuse guard). Resets each window. ──
const RATE_MAX = Number(process.env.ASSISTANT_RATE_MAX || 20); // requests
const RATE_WINDOW_MS = Number(process.env.ASSISTANT_RATE_WINDOW_MS || 60_000); // per minute
const hits = new Map(); // ip -> { count, resetAt }
function rateLimited(ip) {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now > rec.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  rec.count += 1;
  return rec.count > RATE_MAX;
}
// Opportunistic cleanup so the Map can't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [ip, rec] of hits) if (now > rec.resetAt) hits.delete(ip);
}, RATE_WINDOW_MS).unref?.();

// Keep only valid {role:'user'|'assistant', content:string} turns, last N.
// The Claude messages array must begin with a user turn, so drop any leading
// assistant turns (e.g. the widget's canned greeting) after trimming.
function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  const cleaned = history
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_HISTORY_TURNS)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }));
  while (cleaned.length && cleaned[0].role === 'assistant') cleaned.shift();
  return cleaned;
}

router.post('/', async (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
  if (rateLimited(ip)) {
    return res.status(429).json({ error: 'Too many messages. Please wait a minute and try again.' });
  }

  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message) return res.status(400).json({ error: 'Please type a question.' });
  if (message.length > MAX_MESSAGE_CHARS) {
    return res.status(400).json({ error: 'That message is too long — please shorten it.' });
  }

  const client = getClient();

  // ── Stub mode (no key) ──────────────────────────────────────────────────
  if (!client) {
    return res.json({ reply: stubReply(message), source: 'stub' });
  }

  // ── Real mode (Claude) ──────────────────────────────────────────────────
  try {
    const history = sanitizeHistory(req.body?.history);
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      // A help bot is simple Q&A — thinking off keeps it fast and cheap. The
      // system prompt already tells it to answer directly (no reasoning dump).
      thinking: { type: 'disabled' },
      // Stable system prompt → cache it (prefix match). Volatile turns go after.
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [...history, { role: 'user', content: message }],
    });

    const reply = (resp.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    return res.json({ reply: reply || "Sorry, I couldn't find an answer to that.", source: 'claude' });
  } catch (err) {
    // Don't break the chat UI on a transient API error — log it, reply gracefully.
    console.error('[assistant] Claude error:', err.status || '', err.message);
    return res.json({
      reply: "Sorry, I'm having trouble answering right now. Please try again in a moment.",
      source: 'error',
    });
  }
});

// ── Agent mode — POST /api/assistant/agent  { message, history, snapshot } ───
// Returns a PROPOSED action (tool_use) or a text reply. Never executes writes;
// the client confirms + executes. See server/lib/assistantTools.cjs.
const MAX_SNAPSHOT_CHARS = 12_000;

router.post('/agent', async (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
  if (rateLimited(ip)) {
    return res.status(429).json({ error: 'Too many messages. Please wait a minute and try again.' });
  }

  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message) return res.status(400).json({ error: 'Please type a command or question.' });
  if (message.length > MAX_MESSAGE_CHARS) {
    return res.status(400).json({ error: 'That message is too long — please shorten it.' });
  }

  const client = getClient();

  // ── Stub mode (no key): pattern-based planner so the flow works locally ──
  if (!client) {
    return res.json(stubPlan(message));
  }

  // ── Real mode (Claude with tools) ────────────────────────────────────────
  try {
    const history = sanitizeHistory(req.body?.history);
    let snapshotStr = '';
    if (req.body?.snapshot && typeof req.body.snapshot === 'object') {
      try { snapshotStr = JSON.stringify(req.body.snapshot).slice(0, MAX_SNAPSHOT_CHARS); } catch { /* ignore */ }
    }

    const system = [
      { type: 'text', text: AGENT_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
    ];
    if (snapshotStr) {
      system.push({ type: 'text', text: `CURRENT USER DATA (snapshot, JSON). Use it to answer questions and to find the id of an item to edit/delete:\n${snapshotStr}` });
    }

    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      thinking: { type: 'disabled' },
      system,
      tools: TOOLS,
      messages: [...history, { role: 'user', content: message }],
    });

    const blocks = resp.content || [];
    const text = blocks.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    const toolUse = blocks.find((b) => b.type === 'tool_use');

    if (toolUse) {
      return res.json({ type: 'action', action: { name: toolUse.name, input: toolUse.input || {} }, text });
    }
    return res.json({ type: 'text', text: text || "I'm not sure how to help with that. Try asking about your expenses, fees, or reminders." });
  } catch (err) {
    console.error('[assistant/agent] Claude error:', err.status || '', err.message);
    return res.json({ type: 'text', text: "Sorry, I'm having trouble right now. Please try again in a moment." });
  }
});

module.exports = router;
