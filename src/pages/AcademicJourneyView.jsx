import { useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { EDU } from '../constants';
import { makeFmt } from '../utils';
import { Card } from '../components/ui';

const AcademicJourneyView = () => {
  const { user, expenses, semesters, navigate } = useApp();
  useEffect(() => { document.title = "Academic Journey — ClassCost"; }, []);
  const profile = user?.profile;
  const fmt = makeFmt(profile?.currency||"BDT");
  const currentMod = EDU[profile?.educationLevel];
  const previousStages = profile?.previousStages || [];

  const allStages = [
    ...previousStages,
    {
      id:"current",
      educationLevel: profile?.educationLevel,
      institution:    profile?.institutionName,
      classYear:      profile?.classYear,
      from:           profile?.enrolledAt||"—",
      to:             null,
      result:         "active",
      expenseCount:   expenses.length,
      semesterCount:  semesters.length,
    }
  ].filter(s=>s.educationLevel);

  const resultBadge = r => ({
    passed:     {bg:"bg-emerald-100",text:"text-emerald-700",label:"Graduated ✓"},
    transferred:{bg:"bg-blue-100",   text:"text-blue-700",   label:"Transferred"},
    dropped:    {bg:"bg-amber-100",  text:"text-amber-700",  label:"On Break"},
    active:     {bg:"bg-indigo-100", text:"text-indigo-700", label:"Active Now ●"},
  }[r]||{bg:"bg-slate-100",text:"text-slate-500",label:r});

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-md mx-auto px-4 pt-6 pb-24">
        <button onClick={()=>navigate("settings")} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm mb-5">← Settings</button>
        <h2 className="text-xl font-bold text-slate-900 mb-1" style={{fontFamily:"'Fraunces',serif"}}>Academic Journey 📜</h2>
        <p className="text-slate-400 text-sm mb-6">{profile?.fullName} · {allStages.length} stage{allStages.length!==1?"s":""}</p>

        {allStages.length===0?(
          <div className="text-center py-16">
            <div className="text-5xl mb-3">📭</div>
            <p className="text-slate-400">No stages recorded yet</p>
          </div>
        ):(
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-200 via-slate-200 to-transparent"/>
            <div className="flex flex-col gap-0">
              {[...allStages].reverse().map((stage,i)=>{
                const mod = EDU[stage.educationLevel];
                const badge = resultBadge(stage.result);
                const isActive = stage.result==="active";
                return (
                  <div key={stage.id||i} className="flex gap-4 pb-6 relative">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 z-10 border-4 ${isActive?"border-indigo-500 bg-indigo-50":"border-white bg-slate-100"} shadow-sm`}>
                      {mod?.icon||"🎓"}
                    </div>
                    <Card className={`flex-1 p-4 ${isActive?"border-indigo-200 shadow-indigo-50 shadow-md":""}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className={`font-bold text-sm ${isActive?"text-indigo-700":"text-slate-700"}`}>{mod?.label||stage.educationLevel}</p>
                          <p className="text-slate-500 text-xs">{stage.institution||"—"}</p>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-xl font-bold ${badge.bg} ${badge.text}`}>{badge.label}</span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {stage.classYear&&<span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-xl font-medium">{stage.classYear}</span>}
                        {stage.from&&<span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-xl font-medium">{stage.from}{stage.to?` → ${stage.to}`:" → now"}</span>}
                        {stage.expenseCount>0&&<span className="text-xs bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-xl font-medium">{stage.expenseCount} expenses</span>}
                        {stage.semesterCount>0&&<span className="text-xs bg-purple-50 text-purple-600 px-2.5 py-1 rounded-xl font-medium">{stage.semesterCount} {mod?.semLabel||"semester"}s</span>}
                      </div>
                      {isActive&&(
                        <button onClick={()=>navigate("stage-upgrade")}
                          className="mt-3 w-full py-2.5 rounded-xl border-2 border-dashed border-indigo-200 text-indigo-600 text-xs font-bold hover:bg-indigo-50 transition">
                          + Move to Next Stage →
                        </button>
                      )}
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AcademicJourneyView;
