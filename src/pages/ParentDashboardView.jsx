import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { useSubscription } from '../hooks/useSubscription';
import { makeFmt } from '../utils/format';
import { Btn } from '../components/ui';

export const ParentDashboardView = () => {
  const { user, navigate, theme, toggleTheme, addToast } = useApp();
  const { isPro } = useSubscription();
  const profile = user?.profile;
  const fmt = makeFmt(profile?.currency || 'BDT');
  const d = theme === 'dark';

  useEffect(() => { document.title = 'Parent Dashboard — ClassCost'; }, []);

  const [menuOpen, setMenuOpen] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkCode, setLinkCode] = useState('');
  const [linking, setLinking] = useState(false);

  const linked = user?.linkedAccounts || [];

  const handleLinkChild = async () => {
    if (!linkCode || linkCode.length < 6) {
      addToast('Enter a valid 6-digit invite code', 'error');
      return;
    }
    setLinking(true);
    try {
      // TODO: Replace with real API call
      console.log('Linking child with code:', linkCode);
      addToast('Child linked successfully!', 'success');
      setShowLinkModal(false);
      setLinkCode('');
    } catch (e) {
      addToast(e.message || 'Failed to link child', 'error');
    } finally {
      setLinking(false);
    }
  };

  // Placeholder child data for linked accounts
  const childCards = linked.map((child, i) => ({
    id: child.id || `child-${i}`,
    name: child.name || `Child ${i + 1}`,
    totalThisMonth: child.totalThisMonth || 0,
    topCategory: child.topCategory || 'No data yet',
    topCategoryIcon: child.topCategoryIcon || '📊',
  }));

  const gradients = [
    { from: 'from-indigo-600', to: 'to-purple-600', shadow: 'shadow-indigo-600/20' },
    { from: 'from-sky-600', to: 'to-cyan-600', shadow: 'shadow-sky-600/20' },
    { from: 'from-emerald-600', to: 'to-teal-600', shadow: 'shadow-emerald-600/20' },
  ];

  return (
    <div className={`min-h-screen transition-colors ${d ? 'bg-slate-950' : 'bg-slate-50'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-30 backdrop-blur-xl border-b transition-colors ${d ? 'bg-slate-950/90 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setMenuOpen(true)} className={`w-10 h-10 flex flex-col items-center justify-center gap-[5px] rounded-xl transition ${d ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
              <span className={`w-5 h-[2px] rounded-full ${d ? 'bg-white' : 'bg-slate-800'}`} />
              <span className={`w-5 h-[2px] rounded-full ${d ? 'bg-white' : 'bg-slate-800'}`} />
              <span className={`w-5 h-[2px] rounded-full ${d ? 'bg-white' : 'bg-slate-800'}`} />
            </button>
            <h1 className={`text-lg font-bold ${d ? 'text-white' : 'text-slate-900'}`}>ClassCost</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${d ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>Parent</span>
          </div>
          <button onClick={toggleTheme} className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition ${d ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
            {d ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* Slide-out menu */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className={`fixed top-0 left-0 bottom-0 w-72 sm:w-80 z-50 shadow-2xl flex flex-col ${d ? 'bg-slate-900' : 'bg-white'}`} style={{ animation: 'slideRight .2s ease-out' }}>
            <div className={`p-5 border-b ${d ? 'border-slate-800' : 'border-slate-100'}`}>
              <div className="flex items-center justify-between mb-4">
                <span className={`font-bold ${d ? 'text-white' : 'text-slate-900'}`}>Menu</span>
                <button onClick={() => setMenuOpen(false)} className={`w-8 h-8 rounded-lg flex items-center justify-center ${d ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>✕</button>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold ${d ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
                  {(profile?.fullName || user?.email)?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold truncate text-sm ${d ? 'text-white' : 'text-slate-900'}`}>{profile?.fullName || 'Parent'}</p>
                  <p className={`text-xs truncate ${d ? 'text-slate-500' : 'text-slate-400'}`}>{user?.email}</p>
                </div>
              </div>
            </div>
            <nav className="flex-1 p-2 overflow-y-auto">
              {[
                { label: 'Home', icon: '🏠', view: 'dashboard' },
                { label: 'Reports', icon: '📊', view: 'reports' },
                { label: 'Settings', icon: '⚙️', view: 'settings' },
              ].map((item) => (
                <button key={item.view} onClick={() => { setMenuOpen(false); navigate(item.view); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition ${d ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                  <span className="text-lg w-6 text-center">{item.icon}</span>
                  <span className={`text-sm font-medium ${d ? 'text-slate-300' : 'text-slate-700'}`}>{item.label}</span>
                </button>
              ))}
            </nav>
            <div className={`p-4 border-t ${d ? 'border-slate-800' : 'border-slate-100'}`}>
              <button onClick={toggleTheme} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition ${d ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                <span className="text-lg w-6 text-center">{d ? '☀️' : '🌙'}</span>
                <span className={`text-sm font-medium ${d ? 'text-slate-300' : 'text-slate-700'}`}>{d ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-24">
        {/* Welcome */}
        <div className="mb-6">
          <h2 className={`text-2xl font-bold ${d ? 'text-white' : 'text-slate-900'}`}>
            Hello, {profile?.fullName?.split(' ')[0] || 'Parent'}
          </h2>
          <p className={`text-sm mt-1 ${d ? 'text-slate-400' : 'text-slate-500'}`}>
            {linked.length > 0
              ? `Monitoring ${linked.length} child${linked.length !== 1 ? 'ren' : ''}`
              : 'Link your child to start monitoring'}
          </p>
        </div>

        {/* Children section */}
        {childCards.length > 0 ? (
          <div className="flex flex-col gap-4 mb-6">
            {childCards.map((child, i) => {
              const g = gradients[i % gradients.length];
              return (
                <div
                  key={child.id}
                  className={`bg-gradient-to-br ${g.from} ${g.to} rounded-3xl p-6 shadow-xl ${g.shadow}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                        <span className="text-2xl font-bold text-white">{child.name[0]}</span>
                      </div>
                      <div>
                        <p className="text-white font-bold text-lg">{child.name}</p>
                        <p className="text-white/60 text-xs">This month</p>
                      </div>
                    </div>
                    <button
                      onClick={() => console.log('View details for', child.id)}
                      className="px-3 py-1.5 rounded-xl bg-white/20 text-white text-xs font-semibold hover:bg-white/30 transition"
                    >
                      View Details
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/10 rounded-xl p-3">
                      <p className="text-white/60 text-xs mb-1">Total Spent</p>
                      <p className="text-white text-xl font-bold">{fmt(child.totalThisMonth)}</p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-3">
                      <p className="text-white/60 text-xs mb-1">Top Category</p>
                      <p className="text-white text-sm font-semibold flex items-center gap-1.5">
                        <span>{child.topCategoryIcon}</span>
                        {child.topCategory}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Link another child */}
            {isPro && linked.length < 3 && (
              <button
                onClick={() => setShowLinkModal(true)}
                className={`w-full py-4 rounded-2xl border-2 border-dashed text-sm font-semibold transition ${
                  d
                    ? 'border-slate-700 text-slate-400 hover:border-indigo-500 hover:text-indigo-400'
                    : 'border-slate-200 text-slate-400 hover:border-indigo-400 hover:text-indigo-600'
                }`}
              >
                + Link Another Child
              </button>
            )}
          </div>
        ) : (
          /* Empty state */
          <div className={`rounded-3xl p-8 text-center mb-6 ${d ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-100 shadow-sm'}`}>
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-indigo-500/30">
              <span className="text-4xl">👨‍👩‍👧</span>
            </div>
            <h3 className={`text-lg font-bold mb-2 ${d ? 'text-white' : 'text-slate-900'}`}>
              No children linked yet
            </h3>
            <p className={`text-sm mb-6 max-w-xs mx-auto ${d ? 'text-slate-400' : 'text-slate-500'}`}>
              Ask your child to generate an invite code from their ClassCost app, then enter it here to start monitoring their expenses.
            </p>
            <Btn onClick={() => setShowLinkModal(true)} size="lg" className="mx-auto">
              Link a Child
            </Btn>
            <div className={`flex items-center justify-center gap-4 mt-6 ${d ? 'text-slate-500' : 'text-slate-400'}`}>
              {['Settings > Invite Code', 'Share code with parent', 'Start monitoring'].map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${d ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{i + 1}</span>
                  <span className="text-xs">{step}</span>
                  {i < 2 && <span className="text-slate-300 ml-2">→</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upgrade banner — show for free plan parents */}
        {!isPro && (
          <div className={`rounded-3xl p-6 ${d ? 'bg-gradient-to-br from-indigo-950 to-purple-950 border border-indigo-800/50' : 'bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100'}`}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">✨</span>
              </div>
              <div className="flex-1">
                <h3 className={`font-bold mb-1 ${d ? 'text-white' : 'text-slate-900'}`}>Upgrade to Parent Pro</h3>
                <p className={`text-xs mb-3 ${d ? 'text-slate-400' : 'text-slate-500'}`}>
                  Get more control over your children's education expenses
                </p>
                <ul className="space-y-1.5 mb-4">
                  {['Monitor up to 3 children', 'Set spending budgets', 'Get real-time alerts', 'PDF expense reports'].map((feat, i) => (
                    <li key={i} className={`text-xs flex items-center gap-2 ${d ? 'text-slate-300' : 'text-slate-600'}`}>
                      <span className="text-indigo-500">✓</span>
                      {feat}
                    </li>
                  ))}
                </ul>
                <Btn onClick={() => addToast('Payment integration coming soon!', 'info')} size="sm">
                  Upgrade Now
                </Btn>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Link Child Modal */}
      {showLinkModal && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setShowLinkModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl ${d ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}
              onClick={e => e.stopPropagation()}>
              <div className="text-center mb-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">🔗</span>
                </div>
                <h3 className={`text-lg font-bold ${d ? 'text-white' : 'text-slate-900'}`}>Link a Child</h3>
                <p className={`text-xs mt-1 ${d ? 'text-slate-400' : 'text-slate-500'}`}>
                  Enter the invite code from your child's ClassCost app
                </p>
              </div>

              <input
                value={linkCode}
                onChange={e => setLinkCode(e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                autoFocus
                className={`w-full rounded-2xl border-2 py-3.5 px-4 text-center text-2xl font-bold tracking-[0.3em] outline-none transition mb-4 ${
                  d
                    ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500'
                    : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-400'
                }`}
              />

              <Btn onClick={handleLinkChild} disabled={linking || linkCode.length < 6} className="w-full" size="lg">
                {linking ? 'Linking...' : 'Link Child'}
              </Btn>
              <button
                onClick={() => { setShowLinkModal(false); setLinkCode(''); }}
                className={`w-full py-3 mt-2 rounded-xl text-sm font-medium transition ${
                  d ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ParentDashboardView;
