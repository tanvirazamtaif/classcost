import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { EDU, EDU_GROUPS } from '../constants';
import { makeFmt } from '../utils';

const AdminPanel = () => {
  const { navigate, expenses, semesters, user } = useApp();
  const [auth,setAuth] = useState(false);
  const [pass,setPass] = useState("");
  const [tab,setTab] = useState("overview");
  const fmt = makeFmt("BDT");

  if(!auth)return(
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <button onClick={()=>navigate("landing")} className="text-slate-500 hover:text-slate-300 mb-8 text-sm">← Back</button>
        <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 text-center">
          <div className="text-4xl mb-3">🛡️</div>
          <h2 className="text-xl font-bold text-white mb-4">Admin Panel</h2>
          <span className="inline-block px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-bold mb-4">Demo: admin123</span>
          <div className="relative mb-4"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔑</span>
            <input type="password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&pass==="admin123"&&setAuth(true)} placeholder="Admin password" className="w-full rounded-2xl bg-slate-800 border border-slate-700 py-3 pl-12 pr-4 text-white placeholder-slate-500 text-sm outline-none focus:border-indigo-500 transition"/>
          </div>
          <button onClick={()=>pass==="admin123"&&setAuth(true)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl py-3.5 text-sm transition">Enter →</button>
        </div>
      </div>
    </div>
  );

  const mockUsers=[
    {n:"Anika Rahman",e:"anika@gmail.com",mod:"preprimary",inst:"Maple Leaf",lv:"KG-1",role:"student",trial:true,cnt:8},
    {n:"Raihan Islam",e:"raihan@gmail.com",mod:"primary",inst:"Viqarunnisa",lv:"Class 4",role:"student",trial:true,cnt:22},
    {n:"Sadia Begum",e:"sadia_parent@gmail.com",mod:null,inst:"—",lv:"—",role:"parent",trial:true,cnt:0},
    {n:"Tanvir Ahmed",e:"tanvir@gmail.com",mod:"secondary",inst:"Ideal School",lv:"Class 10",role:"student",trial:true,cnt:45},
    {n:"Nusrat Jahan",e:"nusrat@gmail.com",mod:"hsc",inst:"Notre Dame",lv:"HSC 2nd Year",role:"student",trial:false,cnt:80},
    {n:"Rafiq Hassan",e:"rafiq@gmail.com",mod:"undergrad_private",inst:"NSU",lv:"3rd Year",role:"student",trial:true,cnt:120},
    {n:"Dr. Karim (Parent)",e:"drkarim@gmail.com",mod:null,inst:"—",lv:"—",role:"parent",trial:false,cnt:0},
    {n:"Rumana Akter",e:"rumana@gmail.com",mod:"masters",inst:"DU Graduate",lv:"2nd Semester",role:"student",trial:true,cnt:35},
    ...(user?.email?[{n:user?.profile?.fullName||"Demo",e:user.email,mod:user?.profile?.educationLevel||"undergrad_private",inst:user?.profile?.institutionName||"—",lv:user?.profile?.classYear||"—",role:user?.role||"student",trial:true,cnt:expenses.length}]:[]),
  ];

  const moduleDist = Object.values(EDU).map(m=>({name:m.shortLabel,icon:m.icon,count:mockUsers.filter(u=>u.mod===m.id).length})).filter(m=>m.count>0);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3"><div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">🎓</div><span className="font-bold text-sm">EduTrack Admin v3</span></div>
        <button onClick={()=>navigate("landing")} className="text-slate-400 hover:text-white text-sm">← App</button>
      </div>
      <div className="flex border-b border-slate-800 bg-slate-900 px-4 overflow-x-auto">
        {[{id:"overview",i:"📊",l:"Overview"},{id:"users",i:"👥",l:"Users"},{id:"modules",i:"🎓",l:"Modules"},{id:"api",i:"🔌",l:"API"}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition ${tab===t.id?"border-indigo-500 text-white":"border-transparent text-slate-400 hover:text-slate-200"}`}>{t.i} {t.l}</button>
        ))}
      </div>
      <div className="max-w-4xl mx-auto p-4 flex flex-col gap-5">
        {tab==="overview"&&(
          <>
            <div className="grid grid-cols-2 gap-3">
              {[{l:"Total Users",v:mockUsers.length,i:"👥"},{l:"Students",v:mockUsers.filter(u=>u.role==="student").length,i:"🎒"},{l:"Parents",v:mockUsers.filter(u=>u.role==="parent").length,i:"👨‍👩‍👦"},{l:"Active Trials",v:mockUsers.filter(u=>u.trial).length,i:"⏱️"}].map(({l,v,i})=>(
                <div key={l} className="bg-slate-900 rounded-2xl p-4 border border-slate-800"><div className="text-2xl mb-1">{i}</div><p className="text-2xl font-bold text-white">{v}</p><p className="text-slate-400 text-xs">{l}</p></div>
              ))}
            </div>
            <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800">
              <h3 className="text-sm font-bold text-slate-300 mb-4">Users by Education Module</h3>
              <div className="grid grid-cols-3 gap-2">{moduleDist.map(m=><div key={m.name} className="text-center bg-slate-800 rounded-xl p-3"><div className="text-2xl mb-1">{m.icon}</div><div className="text-white font-bold">{m.count}</div><div className="text-slate-400 text-xs">{m.name}</div></div>)}</div>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
              <p className="text-amber-400 font-bold text-sm">🤖 AI Analysis Pipeline — Ready</p>
              <p className="text-amber-300/70 text-xs mt-1">Collect cross-module behavioral data. Enable AI to compare spending across education stages.</p>
              <button className="mt-3 text-xs px-3 py-1.5 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-400 font-semibold">Enable AI Module (Coming Soon)</button>
            </div>
          </>
        )}
        {tab==="users"&&(
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between"><h3 className="font-bold text-slate-200">All Users ({mockUsers.length})</h3><button className="text-xs px-3 py-1.5 bg-indigo-600 rounded-xl text-white font-semibold">Export CSV</button></div>
            {mockUsers.map((u,i)=>{const m=EDU[u.mod];return(
              <div key={i} className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${u.role==="parent"?"bg-teal-800 text-teal-200":"bg-indigo-800 text-indigo-200"}`}>{u.role==="parent"?"👨‍👩‍👦":u.n[0]}</div>
                    <div><p className="font-semibold text-slate-100">{u.n}</p><p className="text-slate-400 text-xs">{u.e}</p></div>
                  </div>
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${u.role==="parent"?"bg-teal-900 text-teal-300":"bg-indigo-900 text-indigo-300"}`}>{u.role==="parent"?"👨‍👩‍👦 Parent":"🎒 Student"}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${u.trial?"bg-amber-900 text-amber-300":"bg-emerald-900 text-emerald-300"}`}>{u.trial?"Trial":"Paid"}</span>
                  </div>
                </div>
                {u.role==="student"&&m&&(
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {[[`${m.icon} ${m.shortLabel}`,""],[u.lv,""],[`${u.cnt} records`,""]].map(([v],j)=><div key={j} className="bg-slate-800 rounded-xl p-2 text-center"><p className="text-slate-200 font-semibold text-xs">{v}</p></div>)}
                  </div>
                )}
              </div>
            );})}
          </div>
        )}
        {tab==="modules"&&(
          <div className="flex flex-col gap-3">
            {EDU_GROUPS.map(g=>(
              <div key={g.id} className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
                <p className="font-bold text-slate-200 mb-3">{g.icon} {g.label}</p>
                {g.ids.map(id=>{const m=EDU[id];return(
                  <div key={id} className="flex items-center gap-3 py-2 border-b border-slate-800 last:border-0">
                    <div className={`w-8 h-8 ${m.bgColor} rounded-lg flex items-center justify-center text-base`}>{m.icon}</div>
                    <div className="flex-1"><p className="text-slate-200 text-sm font-semibold">{m.label}</p><p className="text-slate-400 text-xs">{m.desc}</p></div>
                    <div className="flex gap-1 flex-wrap">
                      {m.hasHostel&&<span className="text-xs bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">Hostel</span>}
                      {m.hasCoaching&&<span className="text-xs bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">Coaching</span>}
                      {m.hasWaiver&&<span className="text-xs bg-indigo-900 text-indigo-300 px-1.5 py-0.5 rounded">Waivers</span>}
                    </div>
                  </div>
                );})}
              </div>
            ))}
          </div>
        )}
        {tab==="api"&&(
          <div className="flex flex-col gap-3">
            {[{m:"GET",p:"/api/v1/expenses?role=student&module=hsc",d:"Filter by role and edu module"},
              {m:"GET",p:"/api/v1/users?role=parent",d:"All parent accounts"},
              {m:"GET",p:"/api/v1/analytics/by-module",d:"Spending segmented by all 12 modules"},
              {m:"GET",p:"/api/v1/linked-accounts",d:"Student-parent linked pairs"},
              {m:"POST",p:"/api/v1/export/csv?group=school",d:"Export school-level data only"},
            ].map(({m,p,d})=>(
              <div key={p} className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
                <div className="flex items-center gap-2 mb-1"><span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg ${m==="GET"?"bg-emerald-900 text-emerald-400":"bg-blue-900 text-blue-400"}`}>{m}</span><code className="text-slate-300 text-sm font-mono">{p}</code></div>
                <p className="text-slate-400 text-xs">{d}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
