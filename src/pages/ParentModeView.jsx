import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { EDU, EDU_GROUPS, CURRENCIES } from '../constants';
import { makeFmt } from '../utils';
import { usePrivacy } from '../hooks';
import { Btn } from '../components/ui';
import { PINPad } from '../components/feature';

const ParentModeView = () => {
  const { user, setUser, expenses, setExpenses, semesters, loans, setLoans, navigate, addToast, notifications, setNotifications } = useApp();
  const [tab,setTab] = useState("overview");
  const [authState,setAuthState] = useState("locked");
  const { priv, setParentPIN, clearParentPIN, setBudget, setParentSetting } = usePrivacy();
  const profile = user?.profile;
  const fmt = makeFmt(profile?.currency||"BDT");
  const budget = priv.budget||{monthly:5000,transport:1000,canteen:800,hostel:0};

  if(authState==="locked"){
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-br from-teal-950 via-teal-900 to-emerald-900">
        <div className="flex items-center gap-3 p-5 pt-10">
          <button onClick={()=>navigate("dashboard")} className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-white">←</button>
          <div>
            <p className="text-white font-bold text-sm">Parent Mode</p>
            <p className="text-white/50 text-xs">Enter PIN to unlock</p>
          </div>
          <div className="ml-auto text-3xl">👨‍👩‍👦</div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          {!priv.parentPIN ? (
            <div className="w-full max-w-xs bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
              <div className="text-center mb-5">
                <div className="text-4xl mb-2">🔐</div>
                <p className="text-white font-bold">Set a Parent PIN</p>
                <p className="text-white/60 text-xs mt-1">Protect parent settings from your child</p>
              </div>
              <PINPad mode="set" accentColor="teal"
                onSuccess={pin=>{setParentPIN(pin);setAuthState("unlocked");addToast("Parent PIN set ✓","success");}}
                onCancel={()=>navigate("dashboard")}/>
            </div>
          ) : (
            <div className="w-full max-w-xs bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
              <div className="text-center mb-5">
                <div className="text-4xl mb-2">🔐</div>
                <p className="text-white font-bold">Enter Parent PIN</p>
              </div>
              <PINPad mode="verify" storedPIN={priv.parentPIN} accentColor="teal"
                onSuccess={()=>setAuthState("unlocked")}
                onCancel={()=>navigate("dashboard")}/>
            </div>
          )}
        </div>
      </div>
    );
  }

  const thisMonth = new Date().toISOString().slice(0,7);
  const monthExp  = expenses.filter(e=>e.date?.startsWith(thisMonth));
  const monthTotal= monthExp.reduce((s,e)=>s+Number(e.amount||0),0);
  const totalAll  = expenses.reduce((s,e)=>s+Number(e.amount||0),0);
  const loanOutstanding = (loans||[]).reduce((s,l)=>s+Number(l.outstanding||l.principal||0),0);
  const byType = t => monthExp.filter(e=>e.type===t).reduce((s,e)=>s+Number(e.amount||0),0);

  const budgetPct = budget.monthly>0?Math.min(100,Math.round(monthTotal/budget.monthly*100)):0;
  const isOver    = monthTotal>budget.monthly && budget.monthly>0;

  const NAV = [{id:"overview",icon:"📊",label:"Overview"},{id:"budget",icon:"💰",label:"Budget"},{id:"loans",icon:"💳",label:"Loans"},{id:"settings",icon:"⚙️",label:"Settings"}];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50" style={{fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <div className="bg-gradient-to-r from-teal-700 to-emerald-700 text-white px-4 pt-10 pb-4">
        <div className="flex items-center gap-3 max-w-md mx-auto">
          <button onClick={()=>navigate("dashboard")} className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center text-lg">←</button>
          <div className="flex-1">
            <p className="font-bold text-sm" style={{fontFamily:"'Fraunces',serif"}}>Parent Mode</p>
            <p className="text-white/70 text-xs">{profile?.fullName||user?.email}</p>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center text-xl">👨‍👩‍👦</div>
        </div>
      </div>

      <div className="bg-white border-b border-slate-100 shadow-sm">
        <div className="flex max-w-md mx-auto">
          {NAV.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              className={`flex-1 py-3 flex flex-col items-center gap-0.5 text-xs font-semibold transition ${tab===t.id?"text-teal-600 border-b-2 border-teal-600":"text-slate-400"}`}>
              <span className="text-base">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto px-4 py-5 flex flex-col gap-4">

        {tab==="overview"&&(<>
          <div className="grid grid-cols-2 gap-3">
            {[
              {label:"This Month",  val:fmt(monthTotal),  sub:`${budgetPct}% of budget`, color:"teal",  icon:"📅"},
              {label:"All Time",    val:fmt(totalAll),    sub:`${expenses.length} entries`, color:"indigo", icon:"📈"},
              {label:"Loan Owed",   val:fmt(loanOutstanding), sub:`${(loans||[]).length} active loans`, color:"amber",icon:"💳"},
              {label:"Trial Left",  val:`${user?.trialStart?Math.max(0,60-Math.floor((Date.now()-user.trialStart)/86400000)):60}d`, sub:"Upgrade for more", color:"purple",icon:"⏰"},
            ].map(c=>(
              <div key={c.label} className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{c.label}</span>
                  <span className="text-lg">{c.icon}</span>
                </div>
                <p className={`text-lg font-bold text-${c.color}-600`}>{c.val}</p>
                <p className="text-xs text-slate-400 mt-0.5">{c.sub}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-sm text-slate-700">Monthly Budget</p>
              <span className={`text-xs font-bold px-2 py-1 rounded-xl ${isOver?"bg-red-100 text-red-600":"bg-teal-100 text-teal-600"}`}>
                {isOver?"Over Budget":"On Track"}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-400 mb-2">
              <span>Spent: {fmt(monthTotal)}</span>
              <span>Budget: {fmt(budget.monthly)}</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div style={{width:`${budgetPct}%`}} className={`h-full rounded-full transition-all ${isOver?"bg-red-500":"bg-teal-500"}`}/>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
            <p className="font-bold text-sm text-slate-700 mb-3">This Month by Category</p>
            {[["🚌","Transport",byType("transport"),budget.transport],
              ["🍽️","Canteen",byType("canteen"),budget.canteen],
              ["🏠","Hostel",byType("hostel"),budget.hostel],
              ["📚","Coaching",byType("coaching"),0],
              ["📦","Other",byType("other"),0],
            ].filter(([,,v])=>v>0).map(([icon,label,val,bud])=>(
              <div key={label} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                <span className="text-base w-6">{icon}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-600">{label}</span>
                    <span className="text-slate-500">{fmt(val)}{bud>0?` / ${fmt(bud)}`:""}</span>
                  </div>
                  {bud>0&&<div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div style={{width:`${Math.min(100,val/bud*100)}%`}} className={`h-full rounded-full ${val>bud?"bg-red-400":"bg-teal-400"}`}/>
                  </div>}
                </div>
              </div>
            ))}
            {monthExp.length===0&&<p className="text-xs text-slate-400 text-center py-3">No expenses this month yet</p>}
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
            <p className="font-bold text-sm text-slate-700 mb-3">Recent Entries</p>
            {expenses.slice(-5).reverse().map(e=>(
              <div key={e.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center text-base">
                  {EDU_GROUPS.find(g=>g.ids?.includes(e.type))?.icon||"💸"}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-slate-700">{e.label||e.type}</p>
                  <p className="text-xs text-slate-400">{e.date}</p>
                </div>
                <p className="text-sm font-bold text-teal-600">{fmt(Number(e.amount||0))}</p>
              </div>
            ))}
            {expenses.length===0&&<p className="text-xs text-slate-400 text-center py-3">No expenses logged yet</p>}
          </div>
        </>)}

        {tab==="budget"&&(<>
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
            <p className="font-bold text-sm text-slate-700 mb-1">Set Monthly Budgets</p>
            <p className="text-xs text-slate-400 mb-4">Student sees progress bars, not these exact numbers</p>
            {[
              {key:"monthly",  label:"Total Monthly Budget",  icon:"📅"},
              {key:"transport",label:"Transport Budget",       icon:"🚌"},
              {key:"canteen",  label:"Canteen Budget",         icon:"🍽️"},
              {key:"hostel",   label:"Hostel Budget",          icon:"🏠"},
            ].map(({key,label,icon})=>(
              <div key={key} className="mb-4">
                <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mb-1.5">
                  <span>{icon}</span>{label}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">৳</span>
                  <input type="number" value={budget[key]||""}
                    onChange={e=>setBudget({[key]:Number(e.target.value)})}
                    className="w-full pl-7 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 outline-none focus:border-teal-500 transition"/>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
            <p className="font-bold text-sm text-slate-700 mb-1">Student Visibility Controls</p>
            <p className="text-xs text-slate-400 mb-4">Choose what your child can see</p>
            {[
              {key:"hideCostTotals", label:"Hide cost totals", sub:"Student sees entries but not stage/life totals"},
              {key:"loansLocked",    label:"Hide loan details", sub:"Loan section shows locked message to student"},
            ].map(({key,label,sub})=>(
              <div key={key} className="flex items-start justify-between gap-3 py-3 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-slate-700">{label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
                </div>
                <button onClick={()=>setParentSetting(key,!priv[key])}
                  className={`w-11 h-6 rounded-full transition-all flex-shrink-0 relative ${priv[key]?"bg-teal-500":"bg-slate-200"}`}>
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${priv[key]?"left-5":"left-0.5"}`}/>
                </button>
              </div>
            ))}
          </div>
        </>)}

        {tab==="loans"&&(<>
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-bold text-sm text-slate-700">Loan Overview</p>
                <p className="text-xs text-slate-400">Full details visible only in Parent Mode</p>
              </div>
              <button onClick={()=>navigate("loans")}
                className="text-xs font-bold text-teal-600 bg-teal-50 px-3 py-1.5 rounded-xl">
                Add/Edit Loans →
              </button>
            </div>
            {(loans||[]).length===0?(
              <div className="text-center py-6">
                <div className="text-3xl mb-2">💳</div>
                <p className="text-sm text-slate-500">No loans yet</p>
                <button onClick={()=>navigate("loans")} className="mt-3 text-xs text-teal-600 font-bold">Add a loan →</button>
              </div>
            ):(
              <>
                <div className="bg-teal-50 rounded-2xl p-3.5 mb-4 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-teal-600 font-bold">Total Outstanding</p>
                    <p className="text-xl font-bold text-teal-700">{fmt(loanOutstanding)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-teal-600 font-bold">{(loans||[]).length} loan{(loans||[]).length!==1?"s":""}</p>
                  </div>
                </div>
                {(loans||[]).map(l=>(
                  <div key={l.id} className="py-3 border-b border-slate-50 last:border-0">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-bold text-slate-700">{l.name||"Unnamed Loan"}</p>
                      <p className="text-sm font-bold text-teal-600">{fmt(Number(l.outstanding||l.principal||0))}</p>
                    </div>
                    <div className="flex gap-4 text-xs text-slate-400">
                      <span>Lender: {l.lender||"—"}</span>
                      <span>EMI: {fmt(Number(l.emi||0))}/mo</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </>)}

        {tab==="settings"&&(<>
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
            <p className="font-bold text-sm text-slate-700 mb-4">Parent PIN</p>
            <div className="flex gap-3">
              <Btn variant="secondary" className="flex-1" size="sm"
                onClick={()=>{
                  const pin = prompt("Enter current PIN to change:");
                  if(pin===priv.parentPIN){const n=prompt("Enter new 4-digit PIN:");if(n?.length===4){setParentPIN(n);addToast("PIN updated ✓","success");}}
                  else addToast("Wrong PIN","error");
                }}>Change PIN</Btn>
              <Btn variant="danger" className="flex-1" size="sm"
                onClick={()=>{
                  const pin = prompt("Enter PIN to remove:");
                  if(pin===priv.parentPIN){clearParentPIN();setAuthState("locked");addToast("Parent PIN removed","info");}
                  else addToast("Wrong PIN","error");
                }}>Remove PIN</Btn>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
            <p className="font-bold text-sm text-slate-700 mb-4">Notifications</p>
            {[
              {key:"enabled",   label:"All notifications", sub:"Master toggle"},
              {key:"canteen",   label:"Canteen reminder",  sub:"If not logged for 2+ days"},
              {key:"transport", label:"Transport reminder", sub:"If not logged for 2+ days"},
            ].map(({key,label,sub})=>(
              <div key={key} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-slate-700">{label}</p>
                  <p className="text-xs text-slate-400">{sub}</p>
                </div>
                <button onClick={()=>setNotifications(p=>({...p,[key]:!p[key]}))}
                  className={`w-11 h-6 rounded-full transition-all relative ${notifications[key]?"bg-teal-500":"bg-slate-200"}`}>
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${notifications[key]?"left-5":"left-0.5"}`}/>
                </button>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
            <p className="font-bold text-sm text-slate-700 mb-1">Account</p>
            <p className="text-xs text-slate-400 mb-3">{user?.email}</p>
            <button onClick={()=>{setAuthState("locked");navigate("dashboard");}}
              className="text-sm font-bold text-teal-600 hover:text-teal-700">
              🔒 Lock Parent Mode
            </button>
          </div>
        </>)}

        </div>
      </div>
    </div>
  );
};

export default ParentModeView;
