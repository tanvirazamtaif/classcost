import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { EDU, EDU_GROUPS, INSTITUTIONS, WAIVER_OPTIONS } from '../constants';
import { uid, todayStr } from '../utils';
import { Btn, Card } from '../components/ui';

const StageUpgradeWizard = () => {
  const { user, setUser, expenses, semesters, setSemesters, navigate, addToast } = useApp();
  const profile = user?.profile;
  const currentMod = EDU[profile?.educationLevel];
  const [step,setStep] = useState(0);
  const [closeResult,setCloseResult] = useState("");
  const [newEduLevel,setNewEduLevel] = useState("");
  const [selectedGroup,setSelectedGroup] = useState(null);
  const [newInst,setNewInst] = useState("");
  const [newClassYear,setNewClassYear] = useState("");
  const [newSemType,setNewSemType] = useState("tri");
  const [instQuery,setInstQuery] = useState("");
  const [showInstDrop,setShowInstDrop] = useState(false);

  const newMod = EDU[newEduLevel];
  const allInsts = INSTITUTIONS[newEduLevel]||[];
  const filteredInsts = allInsts.filter(u=>u.toLowerCase().includes(instQuery.toLowerCase()));

  const RESULTS = [
    {id:"passed",    icon:"🎉", label:"Passed / Graduated",    sub:"Completed this stage successfully",   color:"emerald"},
    {id:"transferred",icon:"🔄",label:"Transferred Institution", sub:"Moving to a different school/college", color:"blue"},
    {id:"dropped",   icon:"⏸️", label:"Taking a Break",          sub:"Gap year or temporary pause",         color:"amber"},
  ];

  const STEPS = ["Close Current Stage","Choose New Stage","New Institution","Confirm"];

  const handleFinish = () => {
    const admFee = Number(profile.admissionFee||0)*(1-(WAIVER_OPTIONS.find(w=>w.id===profile.admissionWaiver)?.pct||0)/100);
    const semFees = semesters.reduce((s,sem)=>s+Number(sem.semesterFee||0)+Number(sem.additionalFee||0)+sem.courses.reduce((c,co)=>c+Number(co.fee||0)*(1-(co.waiver||0)/100),0),0);
    const dailyTotal = expenses.reduce((s,e)=>s+Number(e.amount||0),0);
    const stageTotalAmount = dailyTotal + semFees + admFee;

    const archivedStage = {
      id: uid(),
      educationLevel: profile.educationLevel,
      institution:    profile.institutionName,
      classYear:      profile.classYear,
      variant:        profile.variant,
      from:           profile.enrolledAt || "—",
      to:             todayStr(),
      result:         closeResult,
      expenseCount:   expenses.length,
      semesterCount:  semesters.length,
      totalAmount:    stageTotalAmount,
      archivedAt:     todayStr(),
    };

    const newProfile = {
      fullName:        profile.fullName,
      currency:        profile.currency,
      familyCode:      profile.familyCode,
      educationLevel:  newEduLevel,
      institutionName: newInst,
      classYear:       newClassYear,
      semesterType:    newSemType,
      enrolledAt:      todayStr(),
      previousStages:  [...(profile.previousStages||[]), archivedStage],
      promotionHistory:[],
    };

    setUser(p=>({...p, profile: newProfile}));
    addToast("New stage started!","success");
    navigate("dashboard");
  };

  const ProgBar = () => (
    <div className="flex gap-1.5 mb-5">
      {STEPS.map((_,i)=><div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${i<=step?"bg-indigo-600":"bg-slate-100"}`}/>)}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-md mx-auto px-4 pt-6 pb-36">
        <button onClick={()=>step>0?setStep(s=>s-1):navigate("settings")}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm mb-5">← Back</button>
        <ProgBar/>
        <h2 className="text-xl font-bold text-slate-900 mb-0.5" style={{fontFamily:"'Fraunces',serif"}}>
          {STEPS[step]}
        </h2>

        {step===0&&(
          <div className="flex flex-col gap-4 mt-4">
            <div className={`${currentMod?.bgColor||"bg-indigo-50"} rounded-3xl p-5 border ${currentMod?.borderColor||"border-indigo-100"}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-white/70 rounded-2xl flex items-center justify-center text-2xl">{currentMod?.icon}</div>
                <div>
                  <p className="font-bold text-slate-800">{currentMod?.label}</p>
                  <p className="text-slate-500 text-xs">{profile?.institutionName||"—"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[["Current Level", profile?.classYear||"—"],["Since", profile?.enrolledAt||"—"]].map(([l,v])=>(
                  <div key={l} className="bg-white/60 rounded-xl p-2 text-center">
                    <p className="text-slate-400 text-xs">{l}</p>
                    <p className="font-bold text-slate-700 text-sm">{v}</p>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-slate-600 text-sm font-medium">How are you leaving this stage?</p>
            <div className="flex flex-col gap-3">
              {RESULTS.map(r=>(
                <button key={r.id} onClick={()=>setCloseResult(r.id)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition ${closeResult===r.id?`border-${r.color}-400 bg-${r.color}-50`:"border-slate-100 bg-white"}`}>
                  <span className="text-3xl">{r.icon}</span>
                  <div className="flex-1">
                    <p className={`font-bold text-sm ${closeResult===r.id?`text-${r.color}-700`:"text-slate-800"}`}>{r.label}</p>
                    <p className="text-slate-400 text-xs">{r.sub}</p>
                  </div>
                  {closeResult===r.id&&<span className={`text-${r.color}-600 font-bold`}>✓</span>}
                </button>
              ))}
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 text-xs text-slate-500">
              📁 All your expenses and fees from this stage are safely archived. You can view them anytime in Academic Journey History.
            </div>
          </div>
        )}

        {step===1&&(
          <div className="flex flex-col gap-3 mt-4">
            <p className="text-slate-500 text-sm">Where are you headed next?</p>
            {EDU_GROUPS.map(g=>(
              <div key={g.id}>
                <button onClick={()=>setSelectedGroup(selectedGroup===g.id?null:g.id)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition text-left ${selectedGroup===g.id?"border-indigo-500 bg-indigo-50":"border-slate-100 bg-white"}`}>
                  <span className="text-2xl">{g.icon}</span>
                  <div className="flex-1"><p className={`font-bold text-sm ${selectedGroup===g.id?"text-indigo-700":"text-slate-700"}`}>{g.label}</p></div>
                  <span className="text-slate-300">{selectedGroup===g.id?"▲":"▾"}</span>
                </button>
                {selectedGroup===g.id&&(
                  <div className="mt-2 ml-2 flex flex-col gap-2">
                    {g.ids.map(id=>{const m=EDU[id];return(
                      <button key={id} onClick={()=>setNewEduLevel(id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition ${newEduLevel===id?"border-indigo-500 bg-indigo-50":"border-slate-100 bg-slate-50"}`}>
                        <div className={`w-9 h-9 ${m.bgColor} rounded-xl flex items-center justify-center text-lg`}>{m.icon}</div>
                        <div className="flex-1">
                          <p className={`text-sm font-bold ${newEduLevel===id?"text-indigo-700":"text-slate-700"}`}>{m.label}</p>
                          <p className="text-xs text-slate-400">{m.desc}</p>
                        </div>
                        {newEduLevel===id&&<span className="text-indigo-600 font-bold">✓</span>}
                      </button>
                    );})}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {step===2&&newMod&&(
          <div className="flex flex-col gap-4 mt-4">
            <div className={`${newMod.bgColor} rounded-2xl p-3 border ${newMod.borderColor} flex items-center gap-2`}>
              <span className="text-2xl">{newMod.icon}</span>
              <div><p className="text-sm font-bold">{newMod.label}</p><p className="text-xs text-slate-500">{newMod.desc}</p></div>
            </div>

            <div className="flex flex-col gap-1.5 relative">
              <label className="text-sm font-semibold text-slate-700">{newMod.institutionLabel} *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{newMod.icon}</span>
                <input value={instQuery}
                  onChange={e=>{setInstQuery(e.target.value);setNewInst("");setShowInstDrop(true);}}
                  onFocus={()=>setShowInstDrop(true)}
                  placeholder={`Search ${newMod.institutionLabel.toLowerCase()}...`}
                  className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 py-3 pl-11 pr-4 text-sm font-medium text-slate-800 outline-none focus:border-indigo-400"/>
              </div>
              {showInstDrop&&(
                <div className="absolute top-20 left-0 right-0 z-20 bg-white rounded-2xl shadow-xl border border-slate-100 max-h-48 overflow-y-auto">
                  {(instQuery?filteredInsts:allInsts.slice(0,7)).map(u=>(
                    <button key={u} onClick={()=>{setNewInst(u);setInstQuery(u);setShowInstDrop(false);}}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-indigo-50 text-slate-700 font-medium border-b border-slate-50 last:border-0">
                      {newMod.icon} {u}
                    </button>
                  ))}
                  {instQuery&&!filteredInsts.includes(instQuery)&&(
                    <button onClick={()=>{setNewInst(instQuery);setShowInstDrop(false);}}
                      className="w-full text-left px-4 py-3 text-sm text-indigo-600 font-semibold border-t border-slate-100">
                      + Use "{instQuery}"
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Starting {newMod.periodLabel}</label>
              <div className="flex flex-wrap gap-2">
                {newMod.levels.map(lv=>(
                  <button key={lv} onClick={()=>setNewClassYear(lv)}
                    className={`px-3.5 py-2 rounded-xl text-sm font-semibold border-2 transition ${newClassYear===lv?"border-indigo-500 bg-indigo-50 text-indigo-700":"border-slate-100 bg-slate-50 text-slate-600"}`}>
                    {lv}
                  </button>
                ))}
              </div>
            </div>

            {newMod.hasSemesterChoice&&(
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">Semester System</label>
                <div className="grid grid-cols-2 gap-3">
                  {(newMod.semChoiceOptions||[{v:"tri",l:"Trimester"},{v:"bi",l:"Semester"}]).map(o=>(
                    <button key={o.v} onClick={()=>setNewSemType(o.v)}
                      className={`p-3 rounded-2xl text-left border-2 transition ${newSemType===o.v?"border-indigo-500 bg-indigo-50":"border-slate-100 bg-slate-50"}`}>
                      <p className={`text-sm font-bold ${newSemType===o.v?"text-indigo-700":"text-slate-700"}`}>{o.l}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step===3&&(
          <div className="flex flex-col gap-4 mt-4">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-5 border border-indigo-100">
              <p className="text-xs font-bold text-slate-400 mb-3">TRANSITION SUMMARY</p>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 ${currentMod?.bgColor} rounded-xl flex items-center justify-center text-xl`}>{currentMod?.icon}</div>
                <div className="flex-1">
                  <p className="text-xs text-slate-400">Closing</p>
                  <p className="font-bold text-slate-700 text-sm">{currentMod?.label}</p>
                  <p className="text-xs text-slate-500">{profile?.institutionName}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-xl font-bold ${closeResult==="passed"?"bg-emerald-100 text-emerald-700":closeResult==="transferred"?"bg-blue-100 text-blue-700":"bg-amber-100 text-amber-700"}`}>
                  {RESULTS.find(r=>r.id===closeResult)?.label||closeResult}
                </span>
              </div>

              <div className="flex items-center justify-center my-2 text-slate-300 text-2xl">↓</div>

              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${newMod?.bgColor} rounded-xl flex items-center justify-center text-xl`}>{newMod?.icon}</div>
                <div className="flex-1">
                  <p className="text-xs text-slate-400">Starting</p>
                  <p className="font-bold text-slate-700 text-sm">{newMod?.label}</p>
                  <p className="text-xs text-slate-500">{newInst}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-xl font-bold bg-indigo-100 text-indigo-700">{newClassYear}</span>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3.5 text-xs text-emerald-700">
              Your name, currency preference, and Family Code carry over automatically. All previous expenses are archived and accessible in Academic Journey.
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-4 flex gap-3 max-w-md mx-auto">
        {step>0&&<Btn variant="secondary" onClick={()=>setStep(s=>s-1)} className="flex-1">← Back</Btn>}
        {step<3?(
          <Btn onClick={()=>{
            if(step===0&&!closeResult){addToast("Select how you're leaving","error");return;}
            if(step===1&&!newEduLevel){addToast("Select new level","error");return;}
            if(step===2&&(!newInst||!newClassYear)){addToast("Fill institution and level","error");return;}
            setStep(s=>s+1);
          }} className="flex-1" size="lg">Continue →</Btn>
        ):(
          <Btn variant="success" onClick={handleFinish} className="flex-1" size="lg">Start New Stage!</Btn>
        )}
      </div>
    </div>
  );
};

export default StageUpgradeWizard;
