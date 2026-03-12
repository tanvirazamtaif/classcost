import { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { EDU, CURRENCIES, LOAN_TYPES, LOAN_PURPOSES } from '../constants';
import { makeFmt, todayStr, uid, calcLoanSummary, calcPaidVsSchedule, buildAmortization } from '../utils';
import { Btn, Card, Input } from '../components/ui';

const LoansView = () => {
  useEffect(() => { document.title = "Loans — ClassCost"; }, []);
  const { user, loans, setLoans, navigate, addToast } = useApp();
  const profile      = user?.profile;
  const fmt          = makeFmt(profile?.currency || "BDT");
  const sym          = (CURRENCIES.find(c => c.id === (profile?.currency || "BDT")) || CURRENCIES[0]).symbol;

  const [screen,    setScreen]    = useState("list");
  const [selected,  setSelected]  = useState(null);
  const [showAmort, setShowAmort] = useState(false);
  const [payForm,   setPayForm]   = useState({ amount:"", date: new Date().toISOString().slice(0,10), note:"" });

  const blankForm = { name:"", loanType:"bank_emi", lender:"", principal:"", annualRate:"", tenureMonths:"", gracePeriodMonths:"0", purpose:"Tuition / Semester Fees", disbursedDate: new Date().toISOString().slice(0,10), notes:"" };
  const [form, setForm] = useState(blankForm);
  const [formStep, setFormStep] = useState(0);

  const totalBorrowed  = loans.reduce((s, l) => s + Number(l.principal || 0), 0);
  const totalPaid      = loans.reduce((s, l) => s + (l.payments||[]).reduce((ps,p)=>ps+Number(p.amount||0),0), 0);
  const totalRemaining = loans.reduce((s, l) => { const {remaining} = calcPaidVsSchedule(l); return s + remaining; }, 0);
  const totalInterest  = loans.reduce((s, l) => { const {totalInterest} = calcLoanSummary(l); return s + totalInterest; }, 0);

  const selectedLoan = loans.find(l => l.id === selected);

  const saveLoan = () => {
    if (!form.name || !form.principal || Number(form.principal) <= 0) {
      addToast("Please fill required fields", "warn"); return;
    }
    const newLoan = { ...form, id: uid(), principal: Number(form.principal), annualRate: Number(form.annualRate || 0),
      tenureMonths: Number(form.tenureMonths || 12), gracePeriodMonths: Number(form.gracePeriodMonths || 0),
      payments: [], createdAt: todayStr() };
    setLoans(p => [...p, newLoan]);
    setForm(blankForm); setFormStep(0); setScreen("list");
    addToast("Loan added", "success");
  };

  const savePayment = () => {
    if (!payForm.amount || Number(payForm.amount) <= 0) { addToast("Enter valid amount","warn"); return; }
    const payment = { id: uid(), ...payForm, amount: Number(payForm.amount) };
    setLoans(p => p.map(l => l.id === selected ? {...l, payments:[...l.payments, payment]} : l));
    setPayForm({ amount:"", date: new Date().toISOString().slice(0,10), note:"" });
    setScreen("detail"); addToast("Payment recorded", "success");
  };

  const deleteLoan = (id) => { setLoans(p => p.filter(l => l.id !== id)); setScreen("list"); addToast("Loan removed","info"); };

  // SCREEN: LIST
  if (screen === "list") return (
    <div className="flex flex-col gap-5 pb-24">
      <div className="bg-gradient-to-br from-rose-600 via-rose-500 to-orange-500 rounded-3xl p-5 text-white shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/60 text-xs font-medium uppercase tracking-wide">Education Loans</p>
            <h2 className="text-2xl font-bold" style={{fontFamily:"'Fraunces',serif"}}>Debt Overview 💳</h2>
          </div>
          <button onClick={()=>{setScreen("add");setFormStep(0);setForm(blankForm);}}
            className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-2xl flex items-center justify-center text-xl transition active:scale-90">
            ＋
          </button>
        </div>

        {loans.length === 0 ? (
          <div className="bg-white/10 rounded-2xl p-5 text-center">
            <p className="text-white/60 text-sm">No loans added yet</p>
            <p className="text-white/40 text-xs mt-1">Track any education loan you've taken</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {[
              { l:"Total Borrowed",  v:totalBorrowed,  sub:"principal" },
              { l:"Outstanding",     v:totalRemaining, sub:"left to pay", highlight:true },
              { l:"Total Paid",      v:totalPaid,      sub:"repaid so far" },
              { l:"Total Interest",  v:totalInterest,  sub:"cost of borrowing" },
            ].map(({l,v,sub,highlight})=>(
              <div key={l} className={`rounded-2xl p-3 ${highlight?"bg-white/20":"bg-white/10"}`}>
                <p className="text-white/60 text-xs mb-0.5">{l}</p>
                <p className={`text-base font-bold tabular-nums ${highlight?"text-white":"text-white/90"}`}>{fmt(v)}</p>
                <p className="text-white/40 text-xs">{sub}</p>
              </div>
            ))}
          </div>
        )}

        {totalBorrowed > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-white/60 mb-1.5">
              <span>Repayment Progress</span>
              <span>{Math.round((totalPaid/totalBorrowed)*100)}%</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all"
                style={{width:`${Math.min(100,(totalPaid/totalBorrowed)*100)}%`}}/>
            </div>
          </div>
        )}
      </div>

      {loans.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-3">🏦</div>
          <p className="text-slate-700 font-bold">No loans tracked yet</p>
          <p className="text-slate-400 text-sm mt-1 mb-5">Add a bank loan, family loan, or any education debt</p>
          <Btn onClick={()=>{setScreen("add");setFormStep(0);setForm(blankForm);}}>
            + Add First Loan
          </Btn>
        </div>
      ) : (
        loans.map(loan => {
          const ltype = LOAN_TYPES.find(t => t.id === loan.loanType) || LOAN_TYPES[0];
          const { paid, remaining, pct, totalPayable } = calcPaidVsSchedule(loan);
          const { emi } = calcLoanSummary(loan);
          const isDone  = remaining <= 0;
          return (
            <button key={loan.id} onClick={()=>{setSelected(loan.id);setScreen("detail");setShowAmort(false);}}
              className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 text-left w-full active:scale-98 transition hover:border-rose-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl ${isDone?"bg-emerald-100":"bg-rose-100"}`}>
                    {ltype.icon}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{loan.name}</p>
                    <p className="text-slate-400 text-xs">{loan.lender || ltype.label} · {loan.purpose}</p>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-xl font-bold ${isDone?"bg-emerald-100 text-emerald-700":"bg-rose-100 text-rose-700"}`}>
                  {isDone ? "Paid Off ✓" : `${Math.round(pct)}%`}
                </span>
              </div>

              <div className="h-1.5 bg-slate-100 rounded-full mb-3 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${isDone?"bg-emerald-500":"bg-rose-500"}`}
                  style={{width:`${pct}%`}}/>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-slate-400">Borrowed</p>
                  <p className="text-sm font-bold text-slate-700 tabular-nums">{fmt(loan.principal)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Remaining</p>
                  <p className={`text-sm font-bold tabular-nums ${isDone?"text-emerald-600":"text-rose-600"}`}>{fmt(remaining)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">{loan.loanType==="deferred"?"Est. Total":"Monthly EMI"}</p>
                  <p className="text-sm font-bold text-slate-700 tabular-nums">{loan.loanType==="deferred"?fmt(totalPayable):fmt(emi)}</p>
                </div>
              </div>
            </button>
          );
        })
      )}

      {loans.length > 0 && (
        <button onClick={()=>{setScreen("add");setFormStep(0);setForm(blankForm);}}
          className="border-2 border-dashed border-rose-200 rounded-3xl p-4 text-rose-400 font-semibold text-sm flex items-center justify-center gap-2 hover:border-rose-400 hover:text-rose-600 transition">
          + Add Another Loan
        </button>
      )}
    </div>
  );

  // SCREEN: ADD LOAN (3-step)
  if (screen === "add") {
    const ltype = LOAN_TYPES.find(t => t.id === form.loanType) || LOAN_TYPES[0];
    const preview = (form.principal && Number(form.principal) > 0) ? calcLoanSummary({...form, principal:Number(form.principal), annualRate:Number(form.annualRate||0), tenureMonths:Number(form.tenureMonths||12), gracePeriodMonths:Number(form.gracePeriodMonths||0)}) : null;

    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <button onClick={()=>formStep>0?setFormStep(s=>s-1):setScreen("list")}
            className="w-9 h-9 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">←</button>
          <div>
            <h2 className="text-lg font-bold text-slate-900" style={{fontFamily:"'Fraunces',serif"}}>Add Loan</h2>
            <p className="text-slate-400 text-xs">Step {formStep+1} of 3</p>
          </div>
        </div>

        <div className="flex gap-2">
          {["Loan Type","Loan Details","Terms & Review"].map((s,i)=>(
            <div key={s} className={`flex-1 h-1.5 rounded-full transition-all ${i<=formStep?"bg-rose-500":"bg-slate-200"}`}/>
          ))}
        </div>

        {formStep === 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-bold text-slate-700">What kind of loan is this?</p>
            {LOAN_TYPES.map(t => (
              <button key={t.id} onClick={()=>setForm(p=>({...p,loanType:t.id}))}
                className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition active:scale-98 ${form.loanType===t.id?"border-rose-400 bg-rose-50":"border-slate-100 bg-white hover:border-slate-200"}`}>
                <span className="text-2xl">{t.icon}</span>
                <div>
                  <p className={`font-bold text-sm ${form.loanType===t.id?"text-rose-700":"text-slate-800"}`}>{t.label}</p>
                  <p className="text-slate-400 text-xs">{t.sub}</p>
                </div>
                {form.loanType===t.id&&<span className="ml-auto text-rose-500 text-lg">✓</span>}
              </button>
            ))}
            <Btn onClick={()=>setFormStep(1)} className="w-full mt-2">Next →</Btn>
          </div>
        )}

        {formStep === 1 && (
          <div className="flex flex-col gap-4">
            <Input label="Loan Name *" value={form.name} onChange={v=>setForm(p=>({...p,name:v}))}
              placeholder={`e.g. ${ltype.label} for University`} icon={ltype.icon}/>
            <Input label="Lender / Bank Name" value={form.lender} onChange={v=>setForm(p=>({...p,lender:v}))}
              placeholder="e.g. BRAC Bank, Dutch-Bangla" icon="🏦"/>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Purpose</label>
              <div className="flex flex-wrap gap-2">
                {LOAN_PURPOSES.map(p=>(
                  <button key={p} onClick={()=>setForm(f=>({...f,purpose:p}))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition ${form.purpose===p?"border-rose-400 bg-rose-50 text-rose-700":"border-slate-100 bg-white text-slate-500 hover:border-slate-200"}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <Input label={`Principal Amount (${sym}) *`} type="number" value={form.principal}
              onChange={v=>setForm(p=>({...p,principal:v}))} placeholder="e.g. 300000" icon={sym}/>
            <Input label="Disbursed Date" type="date" value={form.disbursedDate}
              onChange={v=>setForm(p=>({...p,disbursedDate:v}))}/>
            <Btn onClick={()=>{ if(!form.name||!form.principal){addToast("Fill required fields","warn");return;} setFormStep(2);}} className="w-full">
              Next →
            </Btn>
          </div>
        )}

        {formStep === 2 && (
          <div className="flex flex-col gap-4">
            {form.loanType !== "deferred" && (
              <Input label={`${ltype.interestLabel} (% per year)`} type="number" value={form.annualRate}
                onChange={v=>setForm(p=>({...p,annualRate:v}))} placeholder="e.g. 9" icon="%"/>
            )}
            {form.loanType !== "deferred" && (
              <Input label="Repayment Period (months)" type="number" value={form.tenureMonths}
                onChange={v=>setForm(p=>({...p,tenureMonths:v}))} placeholder="e.g. 60" icon="📅"/>
            )}
            {(form.loanType === "bank_emi" || form.loanType === "islamic" || form.loanType === "govt") && (
              <Input label="Grace Period (months, 0 if none)" type="number" value={form.gracePeriodMonths}
                onChange={v=>setForm(p=>({...p,gracePeriodMonths:v}))} placeholder="e.g. 24 while studying" icon="⏸️"/>
            )}
            {form.loanType === "deferred" && (
              <Input label="Expected Repayment Start (months from now)" type="number" value={form.tenureMonths}
                onChange={v=>setForm(p=>({...p,tenureMonths:v}))} placeholder="e.g. 48" icon="📅"/>
            )}
            <Input label="Notes (optional)" value={form.notes} onChange={v=>setForm(p=>({...p,notes:v}))}
              placeholder="e.g. Co-signed by father" icon="✏️"/>

            {preview && Number(form.principal) > 0 && (
              <div className="bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-100 rounded-2xl p-4">
                <p className="text-xs font-bold text-rose-700 mb-3 uppercase tracking-wide">Loan Preview</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { l: form.loanType==="deferred"?"Est. Total":"Monthly EMI",
                      v: form.loanType==="deferred"?fmt(preview.totalPayable):fmt(preview.emi), highlight:true },
                    { l:"Total Payable",    v: fmt(preview.totalPayable) },
                    { l:`Total ${ltype.interestLabel}`, v: fmt(preview.totalInterest) },
                    { l:"Repayment Period", v: `${form.loanType==="deferred"?"~":""} ${form.tenureMonths||0} mo` },
                  ].map(({l,v,highlight})=>(
                    <div key={l} className={`rounded-xl p-3 ${highlight?"bg-rose-100":"bg-white/70"}`}>
                      <p className="text-xs text-slate-500 mb-0.5">{l}</p>
                      <p className={`text-sm font-bold tabular-nums ${highlight?"text-rose-700":"text-slate-800"}`}>{v}</p>
                    </div>
                  ))}
                </div>
                {Number(form.gracePeriodMonths) > 0 && (
                  <p className="text-xs text-rose-500 mt-2">
                    Grace period: {form.gracePeriodMonths} months of no payment (interest still accrues)
                  </p>
                )}
                <div className="mt-3 pt-3 border-t border-rose-100">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">You borrow</span>
                    <span className="font-bold text-slate-700">{fmt(form.principal)}</span>
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-slate-500">You pay back</span>
                    <span className="font-bold text-rose-600">{fmt(preview.totalPayable)}</span>
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-slate-500">Extra cost of borrowing</span>
                    <span className="font-bold text-orange-600">{fmt(preview.totalInterest)}</span>
                  </div>
                </div>
              </div>
            )}

            <Btn onClick={saveLoan} className="w-full" size="lg">Save Loan</Btn>
          </div>
        )}
      </div>
    );
  }

  // SCREEN: DETAIL
  if (screen === "detail" && selectedLoan) {
    const loan  = selectedLoan;
    const ltype = LOAN_TYPES.find(t => t.id === loan.loanType) || LOAN_TYPES[0];
    const { emi, totalPayable, totalInterest, graceInterest, repayMonths } = calcLoanSummary(loan);
    const { paid, remaining, pct } = calcPaidVsSchedule(loan);
    const isDone    = remaining <= 0;
    const amortRows = buildAmortization(loan);

    const gracePast = Number(loan.gracePeriodMonths || 0);
    const disburse  = new Date(loan.disbursedDate || loan.createdAt || todayStr());
    const startRepay= new Date(disburse); startRepay.setMonth(startRepay.getMonth() + gracePast + 1);
    const paysMade  = (loan.payments || []).length;
    const nextDue   = new Date(startRepay); nextDue.setMonth(nextDue.getMonth() + paysMade);
    const nextDueStr= nextDue.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});

    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <button onClick={()=>setScreen("list")}
            className="w-9 h-9 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-slate-500">←</button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-slate-900 truncate" style={{fontFamily:"'Fraunces',serif"}}>{loan.name}</h2>
            <p className="text-slate-400 text-xs">{loan.lender || ltype.label} · {loan.purpose}</p>
          </div>
          <button onClick={()=>deleteLoan(loan.id)} className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center text-red-400 hover:bg-red-100">🗑</button>
        </div>

        <div className={`rounded-3xl p-5 shadow-lg ${isDone?"bg-gradient-to-br from-emerald-600 to-teal-600":"bg-gradient-to-br from-rose-600 to-orange-500"} text-white`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white/60 text-xs uppercase tracking-wide">{ltype.icon} {ltype.label}</p>
              <p className="text-3xl font-bold tabular-nums">{fmt(remaining)}</p>
              <p className="text-white/60 text-xs">remaining of {fmt(totalPayable)}</p>
            </div>
            <div className={`w-16 h-16 rounded-2xl ${isDone?"bg-white/20":"bg-white/10"} flex flex-col items-center justify-center`}>
              <p className="text-2xl font-black">{Math.round(pct)}%</p>
              <p className="text-white/60 text-xs">paid</p>
            </div>
          </div>
          <div className="h-2 bg-white/20 rounded-full mb-4 overflow-hidden">
            <div className="h-full rounded-full bg-white" style={{width:`${pct}%`}}/>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              {l:"Paid", v:fmt(paid)},
              {l: loan.loanType==="deferred"?"Est. Total":"Monthly EMI", v: loan.loanType==="deferred"?"—":fmt(emi)},
              {l:"Next Due", v: isDone?"Done ✓":nextDueStr.split(" ")[0]+" "+nextDueStr.split(" ")[1]},
            ].map(({l,v})=>(
              <div key={l} className="bg-white/10 rounded-xl py-2 px-1">
                <p className="text-white/50 text-xs">{l}</p>
                <p className="text-white text-xs font-bold mt-0.5">{v}</p>
              </div>
            ))}
          </div>
        </div>

        <Card className="p-5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Loan Terms</p>
          <div className="flex flex-col gap-2">
            {[
              ["Principal",          fmt(loan.principal)],
              [ltype.interestLabel,  `${loan.annualRate||0}% p.a.`],
              ["Tenure",             `${loan.tenureMonths||0} months`],
              ...(Number(loan.gracePeriodMonths)>0?[["Grace Period",`${loan.gracePeriodMonths} months`],["Interest during grace",fmt(graceInterest||0)]]:[] ),
              ["Effective principal",fmt(totalPayable - totalInterest)],
              [`Total ${ltype.interestLabel}`, fmt(totalInterest)],
              ["Total payable",      fmt(totalPayable)],
              ["Disbursed",          loan.disbursedDate||"—"],
            ].map(([k,v])=>(
              <div key={k} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0">
                <span className="text-slate-500 text-sm">{k}</span>
                <span className="font-bold text-slate-800 text-sm tabular-nums">{v}</span>
              </div>
            ))}
          </div>
        </Card>

        {!isDone && (
          <Btn onClick={()=>{ setPayForm({amount:"",date:new Date().toISOString().slice(0,10),note:""}); setScreen("payment"); }}
            className="w-full" size="lg" variant="primary">
            Record a Payment
          </Btn>
        )}
        {isDone && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
            <p className="text-emerald-700 font-bold">This loan is fully paid off!</p>
          </div>
        )}

        {(loan.payments||[]).length > 0 && (
          <Card className="p-5">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
              Payment History ({loan.payments.length})
            </p>
            {[...(loan.payments||[])].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(p=>(
              <div key={p.id} className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
                <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center text-sm">💰</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-700">{p.note || "Payment"}</p>
                  <p className="text-xs text-slate-400">{p.date}</p>
                </div>
                <p className="text-sm font-bold text-emerald-600 tabular-nums">{fmt(p.amount)}</p>
              </div>
            ))}
          </Card>
        )}

        {loan.loanType !== "deferred" && amortRows.length > 0 && (
          <Card className="overflow-hidden">
            <button onClick={()=>setShowAmort(v=>!v)}
              className="w-full flex items-center justify-between p-5 text-left">
              <div>
                <p className="text-sm font-bold text-slate-700">Amortization Schedule</p>
                <p className="text-xs text-slate-400">{amortRows.length} payment rows</p>
              </div>
              <span className={`text-slate-400 transition-transform ${showAmort?"rotate-180":""}`}>▾</span>
            </button>
            {showAmort && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50">
                      {["Month","Payment","Principal","Interest","Balance"].map(h=>(
                        <th key={h} className="py-2 px-3 text-slate-500 font-bold text-left whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {amortRows.map((row,i)=>(
                      <tr key={i} className={`border-t border-slate-50 ${row.isGrace?"bg-amber-50/50":""}`}>
                        <td className={`py-2 px-3 font-semibold ${row.isGrace?"text-amber-600":"text-slate-700"}`}>
                          {row.label}{row.isGrace?" ⏸️":""}
                        </td>
                        <td className="py-2 px-3 text-slate-600 tabular-nums">{fmt(row.payment)}</td>
                        <td className="py-2 px-3 text-indigo-600 tabular-nums">{fmt(row.principal)}</td>
                        <td className="py-2 px-3 text-rose-500 tabular-nums">{fmt(row.interest)}</td>
                        <td className="py-2 px-3 font-bold text-slate-800 tabular-nums">{fmt(row.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>
    );
  }

  // SCREEN: RECORD PAYMENT
  if (screen === "payment" && selectedLoan) {
    const loan  = selectedLoan;
    const { emi } = calcLoanSummary(loan);
    const { remaining } = calcPaidVsSchedule(loan);
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <button onClick={()=>setScreen("detail")}
            className="w-9 h-9 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-slate-500">←</button>
          <div>
            <h2 className="text-lg font-bold text-slate-900" style={{fontFamily:"'Fraunces',serif"}}>Record Payment</h2>
            <p className="text-slate-400 text-xs">{loan.name}</p>
          </div>
        </div>

        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex justify-between items-center">
          <div>
            <p className="text-rose-700 font-bold text-sm">Outstanding</p>
            <p className="text-rose-500 text-xs">Remaining balance</p>
          </div>
          <p className="text-2xl font-black text-rose-600 tabular-nums">{sym}{Math.round(remaining).toLocaleString()}</p>
        </div>

        {emi > 0 && (
          <div>
            <p className="text-xs font-bold text-slate-500 mb-2">QUICK SELECT</p>
            <div className="flex gap-2 flex-wrap">
              {[emi, emi*3, emi*6, remaining].filter((v,i,a)=>v>0&&a.indexOf(v)===i).map(v=>(
                <button key={v} onClick={()=>setPayForm(p=>({...p,amount:String(Math.round(v))}))}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border-2 transition ${Number(payForm.amount)===Math.round(v)?"border-rose-400 bg-rose-50 text-rose-700":"border-slate-100 bg-white text-slate-600 hover:border-rose-200"}`}>
                  {v===emi?"1x EMI":v===emi*3?"3x EMI":v===emi*6?"6x EMI":"Full Balance"} {fmt(v)}
                </button>
              ))}
            </div>
          </div>
        )}

        <Input label={`Amount (${sym}) *`} type="number" value={payForm.amount}
          onChange={v=>setPayForm(p=>({...p,amount:v}))} placeholder="Enter payment amount" icon={sym}/>
        <Input label="Payment Date" type="date" value={payForm.date}
          onChange={v=>setPayForm(p=>({...p,date:v}))}/>
        <Input label="Note (optional)" value={payForm.note}
          onChange={v=>setPayForm(p=>({...p,note:v}))} placeholder="e.g. EMI #3, extra payment" icon="✏️"/>

        <Btn onClick={savePayment} className="w-full" size="lg">Record Payment</Btn>
      </div>
    );
  }

  return null;
};

export default LoansView;
