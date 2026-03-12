import { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { EDU, CURRENCIES, TRANSPORT_TYPES, HOSTEL_TYPES, COURSE_TYPES, ADMISSION_TYPES, MODULE_CATEGORY_SUGGESTIONS } from '../constants';
import { makeFmt, todayStr, uid } from '../utils';
import { useLocalStorage } from '../hooks';
import { Btn, Card, Input, Modal } from '../components/ui';

const AddExpenseView = () => {
  useEffect(() => { document.title = "Add Expense — ClassCost"; }, []);
  const { user, expenses, setExpenses, addToast } = useApp();
  const profile = user?.profile;
  const mod = EDU[profile?.educationLevel||"undergrad_private"];
  const fmt = makeFmt(profile?.currency||"BDT");
  const sym = (CURRENCIES.find(c=>c.id===(profile?.currency||"BDT"))||CURRENCIES[0]).symbol;

  const [active,setActive]   = useState(null);
  const [tF,setTF]   = useState({amount:"",type:"",date:todayStr()});
  const [cF,setCF]   = useState({amount:"",desc:"",date:todayStr()});
  const [hF,setHF]   = useState({amount:"",type:"monthly",note:"",date:todayStr()});
  const [coF,setCoF] = useState({amount:"",name:"",date:todayStr()});
  const [baF,setBaF] = useState({amount:"",name:"",date:todayStr()});
  const [oF,setOF]   = useState({reason:"",amount:"",date:todayStr()});
  const [crF,setCrF] = useState({courseType:"",name:"",amount:"",date:todayStr()});
  const [adF,setAdF] = useState({admType:"",name:"",amount:"",date:todayStr()});
  const [cmF,setCmF] = useState({amount:"",date:todayStr()});

  const [customModules,setCustomModules] = useLocalStorage("ut_v3_custom_modules",[]);
  const [addModModal,setAddModModal] = useState(false);
  const [modStep,setModStep] = useState(0);
  const [newMod,setNewMod]   = useState({name:"",icon:"✨",frequency:"monthly",category:"",amount:""});

  const addExp = (type,label,extra) => setExpenses(p=>[...p,{id:uid(),type,label,...extra}]);

  const todayExp   = expenses.filter(e=>e.date===todayStr());
  const todayTotal = todayExp.reduce((s,e)=>s+Number(e.amount),0);

  const btns = [
    {id:"transport",label:"Transport Fare",     sub:"Taxi, Bus, Rickshaw...",      icon:"🚌", show:mod?.hasTransport!==false},
    {id:"canteen",  label:"Canteen / Food",     sub:"Meals, drinks, snacks",       icon:"🍽️", show:mod?.hasCanteen!==false},
    ...(mod?.hasTiffin?[{id:"tiffin",label:"Tiffin Service",sub:"Daily tiffin or lunch box",icon:"🥪",show:true}]:[]),
    {id:"hostel",   label:"Hostel / Hall",      sub:"Rent, mess, advance",         icon:"🏠", show:mod?.hasHostel},
    {id:"coaching", label:"Coaching Fee",       sub:"Private tutor or center",     icon:"📖", show:mod?.hasCoaching},
    {id:"batch",    label:"Batch Fee",          sub:"Group coaching fee",          icon:"👥", show:mod?.hasBatch},
    {id:"course",   label:"Courses & Activities",sub:"IELTS, computer, sports...", icon:"🎯", show:true},
    {id:"admission",label:"Varsity Admission",  sub:"Coaching, mock tests, forms", icon:"🏛️", show:true},
    {id:"other",    label:"Other Expense",      sub:"Club, penalty, events...",    icon:"💸", show:true},
  ].filter(b=>b.show);

  const confirm = (id) => {
    if(id==="transport"){if(!tF.amount){addToast("Enter amount","error");return;}
      addExp("transport",TRANSPORT_TYPES.find(t=>t.id===tF.type)?.label||"Transport",{amount:tF.amount,transportType:tF.type,date:tF.date});
      setTF({amount:"",type:"",date:todayStr()});}
    else if(id==="canteen"||id==="tiffin"){if(!cF.amount){addToast("Enter amount","error");return;}
      addExp("canteen",id==="tiffin"?"Tiffin":cF.desc||"Canteen",{amount:cF.amount,date:cF.date});setCF({amount:"",desc:"",date:todayStr()});}
    else if(id==="hostel"){if(!hF.amount){addToast("Enter amount","error");return;}
      addExp("hostel",`Hostel (${hF.type})`,{amount:hF.amount,hostelType:hF.type,note:hF.note,date:hF.date});setHF({amount:"",type:"monthly",note:"",date:todayStr()});}
    else if(id==="coaching"){if(!coF.amount){addToast("Enter amount","error");return;}
      addExp("coaching",coF.name||profile?.coachingName||"Coaching",{amount:coF.amount,date:coF.date});setCoF({amount:"",name:"",date:todayStr()});}
    else if(id==="batch"){if(!baF.amount){addToast("Enter amount","error");return;}
      addExp("batch",baF.name||profile?.batchName||"Batch",{amount:baF.amount,date:baF.date});setBaF({amount:"",name:"",date:todayStr()});}
    else if(id==="other"){if(!oF.reason||!oF.amount){addToast("Fill all fields","error");return;}
      addExp("other",oF.reason,{amount:oF.amount,date:oF.date});setOF({reason:"",amount:"",date:todayStr()});}
    else if(id==="course"){
      if(!crF.amount){addToast("Enter amount","error");return;}
      const ct = COURSE_TYPES.find(t=>t.id===crF.courseType);
      const label = crF.name||(ct?.label)||"Course";
      addExp("course",label,{amount:crF.amount,courseType:crF.courseType,date:crF.date});
      setCrF({courseType:"",name:"",amount:"",date:todayStr()});}
    else if(id==="admission"){
      if(!adF.amount){addToast("Enter amount","error");return;}
      const at = ADMISSION_TYPES.find(t=>t.id===adF.admType);
      const label = adF.name||(at?.label)||"Admission Prep";
      addExp("admission",label,{amount:adF.amount,admType:adF.admType,date:adF.date});
      setAdF({admType:"",name:"",amount:"",date:todayStr()});}
    else if(id?.startsWith("custom_")){
      if(!cmF.amount){addToast("Enter amount","error");return;}
      const cm = customModules.find(m=>m.id===id.slice(7));
      addExp("custom",cm?.name||"Custom",{amount:cmF.amount,moduleId:cm?.id,category:cm?.category,date:cmF.date||todayStr()});
      setCmF({amount:"",date:todayStr()});}
    setActive(null);
    addToast("Added!","success");
  };

  const saveCustomModule = () => {
    if(!newMod.name){addToast("Enter a name","error");return;}
    if(!newMod.category){addToast("Pick or enter a category","error");return;}
    const m = {...newMod, id:uid()};
    setCustomModules(p=>[...p,m]);
    setAddModModal(false);
    setNewMod({name:"",icon:"✨",frequency:"monthly",category:"",amount:""});
    setModStep(0);
    addToast(`"${m.name}" module added!`,"success");
  };

  const expIcon = t=>({transport:"🚌",canteen:"🍽️",hostel:"🏠",coaching:"📖",batch:"👥",other:"💸",course:"🎯",admission:"🏛️",custom:"✨"})[t]||"📝";

  const FREQ_ICONS = {monthly:"🔁",yearly:"📅",onetime:"⚡"};
  const FREQ_LABELS = {monthly:"Monthly",yearly:"Yearly",onetime:"One-time"};
  const MOD_ICON_OPTIONS = ["✨","💻","🎨","⚽","🎵","📸","🤖","🎙️","🏆","📚","🔬","🗺️","🕌","🌍","💃","📜","🧪","🏋️","🎭","🖥️"];

  return (
    <div className="pb-24">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-900" style={{fontFamily:"'Fraunces',serif"}}>Add Expense</h2>
        <p className="text-slate-400 text-sm">Log daily spending</p>
      </div>

      <Card className="p-4 mb-5 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100">
        <div className="flex justify-between">
          <div><p className="text-xs font-bold text-indigo-600">TODAY'S TOTAL</p><p className="text-2xl font-bold text-indigo-700">{fmt(todayTotal)}</p></div>
          <div className="text-right text-xs text-slate-400"><div>{todayExp.length} entries</div><div>{todayStr()}</div></div>
        </div>
      </Card>

      <div className="flex flex-col gap-3">
        {btns.map(b=>(
          <button key={b.id} onClick={()=>setActive(b.id)}
            className={`flex items-center gap-4 p-4 bg-white rounded-2xl border-2 active:scale-99 transition text-left shadow-sm ${
              b.id==="course"?"border-violet-100 hover:border-violet-200":
              b.id==="admission"?"border-amber-100 hover:border-amber-200":
              "border-slate-100 hover:border-slate-200"}`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${
              b.id==="course"?"bg-violet-50":b.id==="admission"?"bg-amber-50":"bg-slate-100"}`}>{b.icon}</div>
            <div className="flex-1"><p className="font-bold text-slate-800">{b.label}</p><p className="text-slate-400 text-xs">{b.sub}</p></div>
            {b.id==="course"&&<span className="text-xs bg-violet-100 text-violet-600 font-bold px-2 py-0.5 rounded-lg">New</span>}
            {b.id==="admission"&&<span className="text-xs bg-amber-100 text-amber-600 font-bold px-2 py-0.5 rounded-lg">New</span>}
            {b.id!=="course"&&b.id!=="admission"&&<span className="text-slate-300 text-xl">›</span>}
          </button>
        ))}

        {customModules.map(m=>(
          <button key={m.id} onClick={()=>{setCmF({amount:m.amount||"",date:todayStr()});setActive(`custom_${m.id}`);}}
            className="flex items-center gap-4 p-4 bg-white rounded-2xl border-2 border-emerald-100 hover:border-emerald-200 active:scale-99 transition text-left shadow-sm">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-2xl">{m.icon}</div>
            <div className="flex-1">
              <p className="font-bold text-slate-800">{m.name}</p>
              <p className="text-slate-400 text-xs">{m.category} · {FREQ_LABELS[m.frequency]}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={e=>{e.stopPropagation();setCustomModules(p=>p.filter(x=>x.id!==m.id));addToast("Module removed","info");}}
                className="text-slate-300 hover:text-red-400 text-xs font-bold p-1">✕</button>
              <span className="text-emerald-300 text-xl">›</span>
            </div>
          </button>
        ))}

        <button onClick={()=>{setModStep(0);setNewMod({name:"",icon:"✨",frequency:"monthly",category:"",amount:""});setAddModModal(true);}}
          className="flex items-center gap-4 p-4 bg-white rounded-2xl border-2 border-dashed border-indigo-200 hover:border-indigo-400 active:scale-99 transition text-left shadow-sm">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-2xl">➕</div>
          <div className="flex-1">
            <p className="font-bold text-indigo-600">Add Custom Module</p>
            <p className="text-slate-400 text-xs">Library fee, tournament, any recurring cost</p>
          </div>
        </button>
      </div>

      {todayExp.length>0&&(
        <Card className="p-4 mt-5">
          <p className="text-xs font-bold text-slate-500 mb-3">ADDED TODAY</p>
          {todayExp.map(e=>(
            <div key={e.id} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
              <span className="text-lg">{expIcon(e.type)}</span>
              <div className="flex-1"><p className="text-sm font-semibold text-slate-700">{e.label}</p><p className="text-xs text-slate-400 capitalize">{e.type}</p></div>
              <p className="font-bold text-slate-800 text-sm">{fmt(e.amount)}</p>
            </div>
          ))}
        </Card>
      )}

      {/* Transport modal */}
      <Modal open={active==="transport"} onClose={()=>setActive(null)} title="🚌 Transport Expense">
        <div className="flex flex-col gap-4">
          <Input label={`Amount (${sym}) *`} type="number" value={tF.amount} onChange={v=>setTF(p=>({...p,amount:v}))} icon={sym} placeholder="e.g. 120"/>
          <div className="flex flex-col gap-1.5"><label className="text-sm font-semibold text-slate-700">Type (optional)</label>
            <div className="grid grid-cols-2 gap-2">{TRANSPORT_TYPES.map(t=>(
              <button key={t.id} onClick={()=>setTF(p=>({...p,type:t.id}))}
                className={`py-2.5 px-3 rounded-xl text-sm font-medium border-2 flex items-center gap-2 transition ${tF.type===t.id?"border-indigo-500 bg-indigo-50 text-indigo-700":"border-slate-100 bg-slate-50 text-slate-600"}`}>
                {t.icon} {t.label}
              </button>
            ))}</div>
          </div>
          <Input label="Date" type="date" value={tF.date} onChange={v=>setTF(p=>({...p,date:v}))}/>
          <Btn onClick={()=>confirm("transport")} className="w-full" size="lg">Add ✓</Btn>
        </div>
      </Modal>

      {/* Canteen */}
      <Modal open={active==="canteen"||active==="tiffin"} onClose={()=>setActive(null)} title={active==="tiffin"?"🥪 Tiffin":"🍽️ Canteen / Food"}>
        <div className="flex flex-col gap-4">
          <Input label={`Amount (${sym}) *`} type="number" value={cF.amount} onChange={v=>setCF(p=>({...p,amount:v}))} icon={sym} placeholder="e.g. 80"/>
          <Input label="Description (optional)" value={cF.desc} onChange={v=>setCF(p=>({...p,desc:v}))} placeholder="Lunch, Tiffin, Snacks..." icon="📝"/>
          <Input label="Date" type="date" value={cF.date} onChange={v=>setCF(p=>({...p,date:v}))}/>
          <Btn onClick={()=>confirm(active)} className="w-full" size="lg">Add ✓</Btn>
        </div>
      </Modal>

      {/* Hostel */}
      <Modal open={active==="hostel"} onClose={()=>setActive(null)} title="🏠 Hostel / Hall Fee">
        <div className="flex flex-col gap-4">
          <Input label={`Amount (${sym}) *`} type="number" value={hF.amount} onChange={v=>setHF(p=>({...p,amount:v}))} icon={sym} placeholder="e.g. 5000"/>
          <div className="flex flex-wrap gap-2">{HOSTEL_TYPES.map(t=>(
            <button key={t.id} onClick={()=>setHF(p=>({...p,type:t.id}))}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition ${hF.type===t.id?"border-sky-500 bg-sky-50 text-sky-700":"border-slate-100 bg-slate-50 text-slate-600"}`}>
              {t.label}
            </button>
          ))}</div>
          <Input label="Note" value={hF.note} onChange={v=>setHF(p=>({...p,note:v}))} placeholder="e.g. March rent"/>
          <Input label="Date" type="date" value={hF.date} onChange={v=>setHF(p=>({...p,date:v}))}/>
          <Btn onClick={()=>confirm("hostel")} className="w-full" size="lg">Add ✓</Btn>
        </div>
      </Modal>

      {/* Coaching */}
      <Modal open={active==="coaching"} onClose={()=>setActive(null)} title="📖 Coaching Fee">
        <div className="flex flex-col gap-4">
          <Input label="Center Name" value={coF.name||profile?.coachingName||""} onChange={v=>setCoF(p=>({...p,name:v}))} placeholder={profile?.coachingName||"Coaching center name"} icon="🏫"/>
          <Input label={`Amount (${sym}) *`} type="number" value={coF.amount} onChange={v=>setCoF(p=>({...p,amount:v}))} icon={sym} placeholder="e.g. 3000"/>
          <Input label="Date" type="date" value={coF.date} onChange={v=>setCoF(p=>({...p,date:v}))}/>
          <Btn onClick={()=>confirm("coaching")} className="w-full" size="lg">Add ✓</Btn>
        </div>
      </Modal>

      {/* Batch */}
      <Modal open={active==="batch"} onClose={()=>setActive(null)} title="👥 Batch Fee">
        <div className="flex flex-col gap-4">
          <Input label="Batch Name" value={baF.name||profile?.batchName||""} onChange={v=>setBaF(p=>({...p,name:v}))} placeholder={profile?.batchName||"Batch name"} icon="📋"/>
          <Input label={`Amount (${sym}) *`} type="number" value={baF.amount} onChange={v=>setBaF(p=>({...p,amount:v}))} icon={sym} placeholder="e.g. 1500"/>
          <Input label="Date" type="date" value={baF.date} onChange={v=>setBaF(p=>({...p,date:v}))}/>
          <Btn onClick={()=>confirm("batch")} className="w-full" size="lg">Add ✓</Btn>
        </div>
      </Modal>

      {/* Other */}
      <Modal open={active==="other"} onClose={()=>setActive(null)} title="💸 Other Expense">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {["Club Fee","Iftar Party","Sports","Penalty","Friend Treat","Event","Stationery","Photocopy","Medical","Fest","Books"].map(s=>(
              <button key={s} onClick={()=>setOF(p=>({...p,reason:s}))}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition ${oF.reason===s?"border-indigo-500 bg-indigo-50 text-indigo-700":"border-slate-100 bg-slate-50 text-slate-600"}`}>
                {s}
              </button>
            ))}
          </div>
          <Input label="Reason *" value={oF.reason} onChange={v=>setOF(p=>({...p,reason:v}))} placeholder="What was this for?" icon="✏️"/>
          <Input label={`Amount (${sym}) *`} type="number" value={oF.amount} onChange={v=>setOF(p=>({...p,amount:v}))} icon={sym} placeholder="e.g. 300"/>
          <Input label="Date" type="date" value={oF.date} onChange={v=>setOF(p=>({...p,date:v}))}/>
          <Btn onClick={()=>confirm("other")} className="w-full" size="lg">Add ✓</Btn>
        </div>
      </Modal>

      {/* Courses & Activities */}
      <Modal open={active==="course"} onClose={()=>setActive(null)} title="🎯 Courses & Activities">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-bold text-slate-500 mb-2">WHAT TYPE?</p>
            <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
              {COURSE_TYPES.map(t=>(
                <button key={t.id} onClick={()=>setCrF(p=>({...p,courseType:t.id}))}
                  className={`p-3 rounded-2xl border-2 text-left transition ${crF.courseType===t.id?"border-violet-500 bg-violet-50":"border-slate-100 bg-slate-50"}`}>
                  <div className="text-xl mb-1">{t.icon}</div>
                  <div className={`text-xs font-bold ${crF.courseType===t.id?"text-violet-700":"text-slate-700"}`}>{t.label}</div>
                  <div className="text-xs text-slate-400 leading-tight mt-0.5">{t.sub}</div>
                </button>
              ))}
            </div>
          </div>
          <Input label="Name (optional)" value={crF.name} onChange={v=>setCrF(p=>({...p,name:v}))}
            placeholder={COURSE_TYPES.find(t=>t.id===crF.courseType)?.label||"e.g. Tamim Computer Center"} icon="📝"/>
          <Input label={`Amount (${sym}) *`} type="number" value={crF.amount} onChange={v=>setCrF(p=>({...p,amount:v}))} icon={sym} placeholder="e.g. 2500"/>
          <Input label="Date" type="date" value={crF.date} onChange={v=>setCrF(p=>({...p,date:v}))}/>
          <Btn onClick={()=>confirm("course")} className="w-full" size="lg">Add ✓</Btn>
        </div>
      </Modal>

      {/* Varsity Admission Phase */}
      <Modal open={active==="admission"} onClose={()=>setActive(null)} title="🏛️ Varsity Admission Phase">
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 mb-4">
          <p className="text-xs text-amber-700 font-semibold">Preparing for university admission tests?</p>
          <p className="text-xs text-amber-600 mt-0.5">Log all your coaching, materials & test fees here.</p>
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-bold text-slate-500 mb-2">EXPENSE TYPE</p>
            <div className="grid grid-cols-2 gap-2">
              {ADMISSION_TYPES.map(t=>(
                <button key={t.id} onClick={()=>setAdF(p=>({...p,admType:t.id}))}
                  className={`p-3 rounded-2xl border-2 text-left transition ${adF.admType===t.id?"border-amber-500 bg-amber-50":"border-slate-100 bg-slate-50"}`}>
                  <div className="text-xl mb-1">{t.icon}</div>
                  <div className={`text-xs font-bold leading-tight ${adF.admType===t.id?"text-amber-700":"text-slate-700"}`}>{t.label}</div>
                </button>
              ))}
            </div>
          </div>
          <Input label="Details (optional)" value={adF.name} onChange={v=>setAdF(p=>({...p,name:v}))}
            placeholder="e.g. Udvash, Sohel Sir batch..." icon="📝"/>
          <Input label={`Amount (${sym}) *`} type="number" value={adF.amount} onChange={v=>setAdF(p=>({...p,amount:v}))} icon={sym} placeholder="e.g. 5000"/>
          <Input label="Date" type="date" value={adF.date} onChange={v=>setAdF(p=>({...p,date:v}))}/>
          <Btn onClick={()=>confirm("admission")} className="w-full" size="lg" variant="primary">Add ✓</Btn>
        </div>
      </Modal>

      {/* Custom module log modals */}
      {customModules.map(m=>(
        <Modal key={m.id} open={active===`custom_${m.id}`} onClose={()=>setActive(null)} title={`${m.icon} ${m.name}`}>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 bg-emerald-50 rounded-2xl p-3 border border-emerald-100">
              <span className="text-2xl">{m.icon}</span>
              <div>
                <p className="text-sm font-bold text-emerald-700">{m.name}</p>
                <p className="text-xs text-emerald-600">{m.category} · {FREQ_ICONS[m.frequency]} {FREQ_LABELS[m.frequency]}</p>
              </div>
            </div>
            <Input label={`Amount (${sym}) *`} type="number" value={cmF.amount} onChange={v=>setCmF(p=>({...p,amount:v}))} icon={sym}
              placeholder={m.amount?`Default: ${sym}${m.amount}`:`e.g. 500`}/>
            <Input label="Date" type="date" value={cmF.date||todayStr()} onChange={v=>setCmF(p=>({...p,date:v}))}/>
            <Btn onClick={()=>confirm(`custom_${m.id}`)} className="w-full" size="lg">Add ✓</Btn>
          </div>
        </Modal>
      ))}

      {/* Add Custom Module wizard */}
      {addModModal&&(
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={()=>setAddModModal(false)}/>
          <div style={{animation:"slideup .35s cubic-bezier(.22,.61,.36,1)"}}
            className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl p-6 pb-8">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4"/>
            <div className="flex items-center gap-2 mb-5">
              {[0,1,2].map(i=>(
                <div key={i} className={`h-1.5 rounded-full flex-1 transition-all ${i<=modStep?"bg-indigo-500":"bg-slate-200"}`}/>
              ))}
              <span className="text-xs text-slate-400 ml-1">{modStep+1}/3</span>
            </div>

            {modStep===0&&(
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1" style={{fontFamily:"'Fraunces',serif"}}>How often do you pay?</h3>
                <p className="text-slate-400 text-xs mb-5">Choose the payment frequency for this module</p>
                <div className="flex flex-col gap-3 mb-6">
                  {[
                    {id:"monthly", icon:"🔁", label:"Monthly",  sub:"Paid every month"},
                    {id:"yearly",  icon:"📅", label:"Yearly",   sub:"Once a year"},
                    {id:"onetime", icon:"⚡", label:"One-time", sub:"Single payment"},
                  ].map(f=>(
                    <button key={f.id} onClick={()=>setNewMod(p=>({...p,frequency:f.id}))}
                      className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition text-left ${newMod.frequency===f.id?"border-indigo-500 bg-indigo-50":"border-slate-100 bg-slate-50"}`}>
                      <span className="text-2xl w-8">{f.icon}</span>
                      <div><p className={`font-bold text-sm ${newMod.frequency===f.id?"text-indigo-700":"text-slate-700"}`}>{f.label}</p>
                      <p className="text-xs text-slate-400">{f.sub}</p></div>
                      {newMod.frequency===f.id&&<span className="ml-auto text-indigo-600 font-bold text-sm">✓</span>}
                    </button>
                  ))}
                </div>
                <Btn onClick={()=>setModStep(1)} className="w-full" size="lg">Next →</Btn>
              </div>
            )}

            {modStep===1&&(
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1" style={{fontFamily:"'Fraunces',serif"}}>What is this for?</h3>
                <p className="text-slate-400 text-xs mb-4">Name your module and pick or type a category</p>
                <p className="text-xs font-bold text-slate-400 mb-2">QUICK PICK</p>
                <div className="flex flex-wrap gap-2 mb-4 max-h-28 overflow-y-auto">
                  {MODULE_CATEGORY_SUGGESTIONS.map(s=>(
                    <button key={s.label} onClick={()=>setNewMod(p=>({...p,category:s.label,name:p.name||s.label,icon:s.icon||p.icon}))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition ${newMod.category===s.label?"border-indigo-500 bg-indigo-50 text-indigo-700":"border-slate-100 bg-slate-50 text-slate-600"}`}>
                      {s.icon} {s.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col gap-3 mb-5">
                  <Input label="Module Name *" value={newMod.name} onChange={v=>setNewMod(p=>({...p,name:v}))} placeholder="e.g. Library Fee, Sports Club..." icon="✏️"/>
                  <Input label="Category" value={newMod.category} onChange={v=>setNewMod(p=>({...p,category:v}))} placeholder="e.g. Fee, Activity, Subscription" icon="🏷️"/>
                </div>
                <p className="text-xs font-bold text-slate-400 mb-2">PICK AN ICON</p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {MOD_ICON_OPTIONS.map(ic=>(
                    <button key={ic} onClick={()=>setNewMod(p=>({...p,icon:ic}))}
                      className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center border-2 transition ${newMod.icon===ic?"border-indigo-500 bg-indigo-50 scale-110":"border-slate-100 bg-slate-50"}`}>{ic}</button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Btn variant="secondary" onClick={()=>setModStep(0)} className="flex-1">← Back</Btn>
                  <Btn onClick={()=>{if(!newMod.name){addToast("Enter a name","error");return;}if(!newMod.category){addToast("Pick or type a category","error");return;}setModStep(2);}} className="flex-1">Next →</Btn>
                </div>
              </div>
            )}

            {modStep===2&&(
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1" style={{fontFamily:"'Fraunces',serif"}}>Default amount?</h3>
                <p className="text-slate-400 text-xs mb-5">Optional — pre-fills when you log this expense</p>
                <div className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-2xl p-4 flex items-center gap-3 mb-5 border border-indigo-100">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">{newMod.icon}</div>
                  <div>
                    <p className="font-bold text-slate-800">{newMod.name||"My Module"}</p>
                    <p className="text-xs text-slate-500">{newMod.category} · {FREQ_ICONS[newMod.frequency]} {FREQ_LABELS[newMod.frequency]}</p>
                  </div>
                </div>
                <div className="mb-5">
                  <Input label={`Default Amount (${sym}) — optional`} type="number" value={newMod.amount}
                    onChange={v=>setNewMod(p=>({...p,amount:v}))} icon={sym} placeholder="Leave blank to enter each time"/>
                </div>
                <div className="flex gap-3">
                  <Btn variant="secondary" onClick={()=>setModStep(1)} className="flex-1">← Back</Btn>
                  <Btn onClick={saveCustomModule} className="flex-1" size="lg">Save Module</Btn>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AddExpenseView;
