import { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { EDU, CURRENCIES, WAIVER_OPTIONS } from '../constants';
import { makeFmt, uid } from '../utils';
import { Btn, Card, Input, Badge, Modal } from '../components/ui';

const SemesterView = () => {
  useEffect(() => { document.title = "ClassCost — Semesters"; }, []);
  const { user, semesters, setSemesters, addToast } = useApp();
  const profile = user?.profile;
  const mod = EDU[profile?.educationLevel||"undergrad_private"];
  const fmt = makeFmt(profile?.currency||"BDT");
  const sym = (CURRENCIES.find(c=>c.id===(profile?.currency||"BDT"))||CURRENCIES[0]).symbol;
  const [addModal,setAddModal] = useState(false);
  const [courseModal,setCourseModal] = useState(null);
  const [form,setForm] = useState({name:"",type:"regular",semesterFee:"",additionalFee:"",dropped:false});
  const [cF,setCF] = useState({name:"",fee:"",waiver:"none"});

  const getTotal = sem => Number(sem.semesterFee||0)+sem.courses.reduce((t,c)=>t+Number(c.fee||0)*(1-(WAIVER_OPTIONS.find(w=>w.id===c.waiver)?.pct||0)/100),0)+Number(sem.additionalFee||0);

  const semLabel = mod?.semLabel||"Semester";
  const courseLabel = mod?.courseLabel||"Course";
  const suggNames = {preprimary:["1st Term 2025","2nd Term 2025","3rd Term 2025"],primary:["1st Term","2nd Term","3rd Term","Annual 2025"],junior:["Term 1","Term 2","Annual Exam"],secondary:["Class 9 Session","Class 10 / SSC Year"],fullschool:["Primary Term","SSC Year","HSC Year 1","HSC Year 2"],hsc:["HSC 1st Year","HSC 2nd Year"],degree_college:["1st Year","2nd Year","Final Year"],honours_college:["1st Year","2nd Year","3rd Year","Honours Final"],undergrad_private:["Spring 2025","Summer 2025","Fall 2025","Spring 2026"],undergrad_public:["1st Year Session","2nd Year","3rd Year","4th Year"],masters:["Spring 2025","Fall 2025","Thesis Semester"],research:["Year 1","Year 2","Year 3 (Extension)"]};
  const suggestions = suggNames[profile?.educationLevel||"undergrad_private"]||[];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900" style={{fontFamily:"'Fraunces',serif"}}>{semLabel}s</h2>
          <p className="text-slate-400 text-sm">{mod?.icon} {mod?.label} · {semesters.length} recorded</p>
        </div>
        <Btn size="sm" onClick={()=>setAddModal(true)}>+ New</Btn>
      </div>

      {semesters.length===0?(
        <div className="text-center py-16">
          <div className="text-6xl mb-4">{mod?.icon||"📚"}</div>
          <p className="text-slate-500 font-semibold">No {semLabel.toLowerCase()}s yet</p>
          <Btn onClick={()=>setAddModal(true)} className="mt-4">Add {semLabel} →</Btn>
        </div>
      ):(
        <div className="flex flex-col gap-4">
          {semesters.map(sem=>(
            <Card key={sem.id} className={`p-5 ${sem.dropped?"opacity-60":""}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-800">{sem.name}</h3>
                    {sem.dropped&&<Badge color="red">Dropped</Badge>}
                  </div>
                  <p className="text-indigo-600 font-bold mt-1 text-lg">{fmt(getTotal(sem))}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>setSemesters(p=>p.map(s=>s.id===sem.id?{...s,dropped:!s.dropped}:s))}
                    className="text-xs px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 font-semibold">{sem.dropped?"Restore":"Drop"}</button>
                  <button onClick={()=>setSemesters(p=>p.filter(s=>s.id!==sem.id))} className="text-xs px-3 py-1.5 rounded-xl border border-red-100 bg-red-50 text-red-500 font-semibold">✕</button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[[`${semLabel} Fee`,fmt(sem.semesterFee||0)],[`${courseLabel}s`,sem.courses.length],["Extra",fmt(sem.additionalFee||0)]].map(([l,v])=>(
                  <div key={l} className="bg-slate-50 rounded-xl p-2 text-center">
                    <p className="text-slate-400 text-xs">{l}</p><p className="font-bold text-slate-700 text-sm">{v}</p>
                  </div>
                ))}
              </div>
              {sem.courses.length>0&&(
                <div className="mb-3">
                  <p className="text-xs font-bold text-slate-500 mb-2">{courseLabel.toUpperCase()}S</p>
                  {sem.courses.map(c=>{const w=WAIVER_OPTIONS.find(o=>o.id===c.waiver);const net=Number(c.fee||0)*(1-(w?.pct||0)/100);return(
                    <div key={c.id} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                      <div><p className="text-sm font-semibold text-slate-700">{c.name}</p>{c.waiver!=="none"&&<Badge color="emerald">{w?.label}</Badge>}</div>
                      <div className="text-right">{c.waiver!=="none"&&<p className="text-xs text-slate-400 line-through">{fmt(c.fee)}</p>}<p className="text-sm font-bold">{fmt(net)}</p></div>
                    </div>
                  );})}
                </div>
              )}
              <button onClick={()=>setCourseModal(sem.id)} className="w-full py-2.5 rounded-xl border-2 border-dashed border-indigo-200 text-indigo-600 text-sm font-semibold hover:bg-indigo-50 transition">
                + Add {courseLabel}
              </button>
            </Card>
          ))}
        </div>
      )}

      <Modal open={addModal} onClose={()=>setAddModal(false)} title={`📚 New ${semLabel}`}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2 mb-1">
            {suggestions.map(n=><button key={n} onClick={()=>setForm(p=>({...p,name:n}))} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition ${form.name===n?"border-indigo-500 bg-indigo-50 text-indigo-700":"border-slate-100 bg-slate-50 text-slate-500"}`}>{n}</button>)}
          </div>
          <Input label={`${semLabel} Name *`} value={form.name} onChange={v=>setForm(p=>({...p,name:v}))} placeholder={`Custom ${semLabel.toLowerCase()} name`} icon="📅"/>
          <Input label={`${semLabel} Fee (${sym})`} type="number" value={form.semesterFee} onChange={v=>setForm(p=>({...p,semesterFee:v}))} icon={sym} placeholder="e.g. 12000"/>
          <Input label={`Additional Fees (${sym})`} type="number" value={form.additionalFee} onChange={v=>setForm(p=>({...p,additionalFee:v}))} icon="🧾" placeholder="Lab, library, activity..."/>
          <Btn onClick={()=>{if(!form.name){addToast("Enter name","error");return;}setSemesters(p=>[...p,{id:uid(),...form,courses:[],createdAt:Date.now()}]);setAddModal(false);setForm({name:"",type:"regular",semesterFee:"",additionalFee:"",dropped:false});addToast(`${semLabel} added!`,"success");}} className="w-full" size="lg">Create {semLabel} ✓</Btn>
        </div>
      </Modal>

      <Modal open={!!courseModal} onClose={()=>setCourseModal(null)} title={`📗 Add ${courseLabel}`}>
        <div className="flex flex-col gap-4">
          <Input label={`${courseLabel} Name *`} value={cF.name} onChange={v=>setCF(p=>({...p,name:v}))} placeholder={courseLabel==="Subject"?"e.g. Mathematics, Physics":"e.g. CSE301 - Data Structures"} icon="📖"/>
          <Input label={`${courseLabel} Fee (${sym})`} type="number" value={cF.fee} onChange={v=>setCF(p=>({...p,fee:v}))} icon={sym} placeholder="e.g. 8000"/>
          {mod?.hasWaiver&&(
            <div className="flex flex-col gap-1.5"><label className="text-sm font-semibold text-slate-700">Waiver</label>
              <div className="flex flex-wrap gap-2">{WAIVER_OPTIONS.map(w=><button key={w.id} onClick={()=>setCF(p=>({...p,waiver:w.id}))} className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition ${cF.waiver===w.id?"border-indigo-500 bg-indigo-50 text-indigo-700":"border-slate-100 bg-slate-50 text-slate-600"}`}>{w.label}</button>)}</div>
            </div>
          )}
          <Btn onClick={()=>{if(!cF.name){addToast("Enter name","error");return;}setSemesters(p=>p.map(s=>s.id===courseModal?{...s,courses:[...s.courses,{id:uid(),...cF}]}:s));setCourseModal(null);setCF({name:"",fee:"",waiver:"none"});addToast(`${courseLabel} added!`,"success");}} className="w-full" size="lg">Add {courseLabel} ✓</Btn>
        </div>
      </Modal>
    </div>
  );
};

export default SemesterView;
