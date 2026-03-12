import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import * as api from '../api';

const AdminPanel = () => {
  const { navigate } = useApp();
  useEffect(() => { document.title = "Admin — ClassCost"; }, []);
  const [auth, setAuth] = useState(false);
  const [pass, setPass] = useState("");
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Data
  const [stats, setStats] = useState({ userCount: 0, expenseCount: 0, semesterCount: 0, loanCount: 0, promoCount: 0, premiumCount: 0 });
  const [users, setUsers] = useState([]);
  const [promos, setPromos] = useState([]);

  // Create promo form
  const [showCreate, setShowCreate] = useState(false);
  const [promoForm, setPromoForm] = useState({ code: "", description: "", durationDays: 30, maxUses: 100 });
  const [creating, setCreating] = useState(false);

  const adminPass = pass;

  const loadData = useCallback(async (password) => {
    setLoading(true);
    try {
      const [s, u, p] = await Promise.all([
        api.getAdminStats(password),
        api.getAdminUsers(password),
        api.getAdminPromos(password),
      ]);
      setStats(s);
      setUsers(u);
      setPromos(p);
      setError("");
    } catch (e) {
      console.error('Admin load error:', e);
      setError(e.message || 'Failed to load data. Check your admin password.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogin = () => {
    if (!pass) return;
    setAuth(true);
    loadData(pass);
  };

  const handleCreatePromo = async () => {
    if (!promoForm.code.trim()) return;
    setCreating(true);
    try {
      await api.createAdminPromo(adminPass, promoForm);
      setPromoForm({ code: "", description: "", durationDays: 30, maxUses: 100 });
      setShowCreate(false);
      const p = await api.getAdminPromos(adminPass);
      setPromos(p);
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleTogglePromo = async (id) => {
    try {
      await api.toggleAdminPromo(adminPass, id);
      const p = await api.getAdminPromos(adminPass);
      setPromos(p);
    } catch (e) { setError(e.message); }
  };

  const handleDeletePromo = async (id) => {
    try {
      await api.deleteAdminPromo(adminPass, id);
      setPromos(prev => prev.filter(p => p.id !== id));
    } catch (e) { setError(e.message); }
  };

  // Login screen
  if (!auth) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <button onClick={() => navigate("landing")} className="text-slate-500 hover:text-slate-300 mb-8 text-sm">&larr; Back</button>
        <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 text-center">
          <div className="text-4xl mb-3">🛡️</div>
          <h2 className="text-xl font-bold text-white mb-6">Admin Panel</h2>
          <div className="relative mb-4">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔑</span>
            <input type="password" value={pass} onChange={e => setPass(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="Admin password"
              className="w-full rounded-2xl bg-slate-800 border border-slate-700 py-3 pl-12 pr-4 text-white placeholder-slate-500 text-sm outline-none focus:border-indigo-500 transition" />
          </div>
          <button onClick={handleLogin}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl py-3.5 text-sm transition">
            Enter &rarr;
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">🎓</div>
          <span className="font-bold text-sm">ClassCost Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => loadData(adminPass)} className="text-slate-400 hover:text-white text-sm">Refresh</button>
          <button onClick={() => navigate("landing")} className="text-slate-400 hover:text-white text-sm">&larr; App</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900 px-4 overflow-x-auto">
        {[{ id: "overview", i: "📊", l: "Overview" }, { id: "users", i: "👥", l: "Users" }, { id: "promos", i: "🎫", l: "Promos" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition ${tab === t.id ? "border-indigo-500 text-white" : "border-transparent text-slate-400 hover:text-slate-200"}`}>
            {t.i} {t.l}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-3 bg-red-500/10 border border-red-500/30 rounded-2xl p-3 text-red-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-red-300 hover:text-white ml-2">✕</button>
        </div>
      )}

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 flex flex-col gap-5">
        {loading && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Loading...</p>
          </div>
        )}

        {/* OVERVIEW TAB */}
        {!loading && tab === "overview" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {[
                { l: "Total Users", v: stats.userCount, i: "👥" },
                { l: "Expenses Logged", v: stats.expenseCount, i: "💰" },
                { l: "Active Premium", v: stats.premiumCount, i: "⭐" },
                { l: "Promo Codes", v: stats.promoCount, i: "🎫" },
                { l: "Semesters", v: stats.semesterCount, i: "🎓" },
                { l: "Loans", v: stats.loanCount, i: "🏦" },
              ].map(({ l, v, i }) => (
                <div key={l} className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
                  <div className="text-2xl mb-1">{i}</div>
                  <p className="text-2xl font-bold text-white">{v}</p>
                  <p className="text-slate-400 text-xs">{l}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* USERS TAB */}
        {!loading && tab === "users" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-200">All Users ({users.length})</h3>
            </div>
            {users.length === 0 && <p className="text-slate-500 text-sm text-center py-8">No users yet</p>}
            {users.map((u) => {
              const isPremium = u.premiumUntil && new Date(u.premiumUntil) > new Date();
              const premDays = isPremium ? Math.ceil((new Date(u.premiumUntil) - new Date()) / 86400000) : 0;
              return (
                <div key={u.id} className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg bg-indigo-800 text-indigo-200">
                        {(u.name || u.email)?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-100">{u.name || "No name"}</p>
                        <p className="text-slate-400 text-xs">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-wrap justify-end">
                      {isPremium && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-900 text-amber-300">
                          ⭐ {premDays}d premium
                        </span>
                      )}
                      {u.profileComplete && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-emerald-900 text-emerald-300">
                          Profile ✓
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {[
                      [`${u._count.expenses} exp`, "💰"],
                      [`${u._count.semesters} sem`, "🎓"],
                      [`${u._count.loans} loans`, "🏦"],
                      [u.eduType || "—", "📚"],
                    ].map(([v, icon], j) => (
                      <div key={j} className="bg-slate-800 rounded-xl p-2 text-center">
                        <p className="text-xs mb-0.5">{icon}</p>
                        <p className="text-slate-200 font-semibold text-xs">{v}</p>
                      </div>
                    ))}
                  </div>
                  {u.institution && (
                    <p className="text-slate-500 text-xs mt-2">🏫 {u.institution} {u.classLevel ? `· ${u.classLevel}` : ""}</p>
                  )}
                  <p className="text-slate-600 text-xs mt-1">Joined: {new Date(u.createdAt).toLocaleDateString()}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* PROMOS TAB */}
        {!loading && tab === "promos" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-200">Promo Codes ({promos.length})</h3>
              <button onClick={() => setShowCreate(v => !v)}
                className="text-xs px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-white font-semibold transition">
                {showCreate ? "Cancel" : "+ Create"}
              </button>
            </div>

            {/* Create form */}
            {showCreate && (
              <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800">
                <h4 className="text-sm font-bold text-slate-200 mb-4">New Promo Code</h4>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Code *</label>
                    <input value={promoForm.code}
                      onChange={e => setPromoForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                      placeholder="e.g. CLASSCOST30"
                      className="w-full rounded-xl bg-slate-800 border border-slate-700 py-2.5 px-4 text-white placeholder-slate-500 text-sm outline-none focus:border-indigo-500 font-mono tracking-wider" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Description</label>
                    <input value={promoForm.description}
                      onChange={e => setPromoForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="e.g. Launch offer - 1 month free"
                      className="w-full rounded-xl bg-slate-800 border border-slate-700 py-2.5 px-4 text-white placeholder-slate-500 text-sm outline-none focus:border-indigo-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Duration (days)</label>
                      <input type="number" value={promoForm.durationDays}
                        onChange={e => setPromoForm(p => ({ ...p, durationDays: parseInt(e.target.value) || 30 }))}
                        className="w-full rounded-xl bg-slate-800 border border-slate-700 py-2.5 px-4 text-white text-sm outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Max Uses</label>
                      <input type="number" value={promoForm.maxUses}
                        onChange={e => setPromoForm(p => ({ ...p, maxUses: parseInt(e.target.value) || 100 }))}
                        className="w-full rounded-xl bg-slate-800 border border-slate-700 py-2.5 px-4 text-white text-sm outline-none focus:border-indigo-500" />
                    </div>
                  </div>
                  <button onClick={handleCreatePromo} disabled={creating || !promoForm.code.trim()}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl py-3 text-sm transition mt-1">
                    {creating ? "Creating..." : "Create Promo Code"}
                  </button>
                </div>
              </div>
            )}

            {/* Promo list */}
            {promos.length === 0 && !showCreate && (
              <p className="text-slate-500 text-sm text-center py-8">No promo codes yet. Create one to get started!</p>
            )}
            {promos.map(p => (
              <div key={p.id} className={`bg-slate-900 rounded-2xl p-4 border ${p.active ? "border-slate-800" : "border-red-900/50"}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-mono font-bold text-indigo-400 tracking-wider">{p.code}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${p.active ? "bg-emerald-900 text-emerald-300" : "bg-red-900 text-red-300"}`}>
                        {p.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    {p.description && <p className="text-slate-400 text-xs">{p.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleTogglePromo(p.id)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition ${p.active ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30" : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"}`}>
                      {p.active ? "Disable" : "Enable"}
                    </button>
                    <button onClick={() => handleDeletePromo(p.id)}
                      className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-red-500/20 text-red-400 hover:bg-red-500/30 transition">
                      Delete
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-800 rounded-xl p-2 text-center">
                    <p className="text-slate-400 text-xs">Duration</p>
                    <p className="text-white font-bold text-sm">{p.durationDays}d</p>
                  </div>
                  <div className="bg-slate-800 rounded-xl p-2 text-center">
                    <p className="text-slate-400 text-xs">Used</p>
                    <p className="text-white font-bold text-sm">{p.usedCount} / {p.maxUses}</p>
                  </div>
                  <div className="bg-slate-800 rounded-xl p-2 text-center">
                    <p className="text-slate-400 text-xs">Created</p>
                    <p className="text-white font-bold text-sm">{new Date(p.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
