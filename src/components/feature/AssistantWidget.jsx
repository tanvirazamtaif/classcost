import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { askAssistant } from '../../api';
import { haptics } from '../../lib/haptics';

/**
 * "Ask ClassCost" — floating help assistant.
 *
 * A help/how-to chat that teaches people to use the app. Talks to /api/assistant,
 * which uses Claude when an API key is set on the server, or a built-in keyword
 * stub otherwise (so it works locally with no key and no cost). It does NOT read
 * the user's private data — it only knows how the app works.
 *
 * Gated by the ENABLE_ASSISTANT flag and mounted globally in App.jsx.
 */

const GREETING = {
  role: 'assistant',
  content:
    "Hi! I'm Ask ClassCost. I can help you use the app — adding expenses, education fees, scholarships, monthly reminders, reports, and more. What would you like to do?",
  greeting: true,
};

const SUGGESTIONS = [
  'How do I add an expense?',
  'How do I add a scholarship to a fee?',
  'How do I set up monthly rent?',
];

export function AssistantWidget() {
  const { theme } = useApp();
  const d = theme === 'dark';

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending, open]);

  const send = async (text) => {
    const question = (text ?? input).trim();
    if (!question || sending) return;
    haptics.light?.();
    setInput('');

    // History = real exchanges only (skip the canned greeting).
    const history = messages.filter((m) => !m.greeting).map(({ role, content }) => ({ role, content }));
    const next = [...messages, { role: 'user', content: question }];
    setMessages(next);
    setSending(true);

    try {
      const { reply } = await askAssistant(question, history);
      setMessages((m) => [...m, { role: 'assistant', content: reply || 'Sorry, please try again.' }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', content: err.message || "Sorry, I couldn't reach the assistant. Please try again." }]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => { haptics.medium?.(); setOpen(true); }}
            aria-label="Ask ClassCost"
            className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-primary-600 text-white shadow-lg shadow-primary-600/30 flex items-center justify-center hover:bg-primary-700 transition"
          >
            <MessageCircle className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className={`fixed z-50 bottom-24 right-4 left-4 sm:left-auto sm:w-[22rem] flex flex-col rounded-2xl overflow-hidden shadow-2xl border ${
              d ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'
            }`}
            style={{ maxHeight: 'min(70vh, 32rem)' }}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 ${d ? 'bg-surface-800' : 'bg-primary-600'}`}>
              <div className="flex items-center gap-2">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center ${d ? 'bg-primary-600/30 text-primary-300' : 'bg-white/20 text-white'}`}>
                  <MessageCircle className="w-4 h-4" />
                </span>
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-white" style={{ fontFamily: "'Fraunces',serif" }}>Ask ClassCost</p>
                  <p className={`text-[10px] ${d ? 'text-surface-400' : 'text-white/70'}`}>Help with using the app</p>
                </div>
              </div>
              <button onClick={() => { haptics.light?.(); setOpen(false); }} aria-label="Close" className="text-white/80 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className={`flex-1 overflow-y-auto px-3 py-3 space-y-3 ${d ? 'bg-surface-900' : 'bg-surface-50'}`}>
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'bg-primary-600 text-white rounded-br-sm'
                        : d
                          ? 'bg-surface-800 text-surface-100 rounded-bl-sm'
                          : 'bg-white text-surface-800 border border-surface-200 rounded-bl-sm'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {/* Suggestions — shown only before the first question */}
              {messages.length === 1 && !sending && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition ${
                        d ? 'border-surface-700 text-surface-300 hover:bg-surface-800' : 'border-surface-200 text-surface-600 hover:bg-surface-100'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {sending && (
                <div className="flex justify-start">
                  <div className={`px-3 py-2.5 rounded-2xl rounded-bl-sm ${d ? 'bg-surface-800' : 'bg-white border border-surface-200'}`}>
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-surface-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-surface-400 animate-bounce" style={{ animationDelay: '120ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-surface-400 animate-bounce" style={{ animationDelay: '240ms' }} />
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className={`flex items-center gap-2 px-3 py-2.5 border-t ${d ? 'border-surface-800 bg-surface-900' : 'border-surface-200 bg-white'}`}>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask a question…"
                className={`flex-1 px-3 py-2 rounded-xl text-sm outline-none border ${
                  d ? 'bg-surface-800 border-surface-700 text-white placeholder:text-surface-500' : 'bg-surface-50 border-surface-200 text-surface-900 placeholder:text-surface-400'
                } focus:border-primary-500`}
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || sending}
                aria-label="Send"
                className="w-10 h-10 shrink-0 rounded-xl bg-primary-600 text-white flex items-center justify-center disabled:opacity-40 hover:bg-primary-700 transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default AssistantWidget;
