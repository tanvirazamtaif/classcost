import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { EDU, CURRENCIES, PROMOTION_CONFIG } from '../constants';
import { makeFmt, todayStr } from '../utils';
import { usePrivacy } from '../hooks';
import { Btn, Card, Input, Badge, Toggle } from '../components/ui';
import { PINPad } from '../components/feature';
import { redeemPromoCode } from '../api';

const SettingsView = () => {
  const { user, setUser, notifications, setNotifications, navigate, addToast } = useApp();
  const profile = user?.profile;
  const mod = EDU[profile?.educationLevel||"undergrad_private"];
  const trialDays=user?.trialStart?Math.max(0,90-Math.floor((Date.now()-user.trialStart)/86400000)):90;
  const cfg = PROMOTION_CONFIG[profile?.educationLevel] || {};
  const [showLevelPicker, setShowLevelPicker] = useState(false);
  const [privModal, setPrivModal] = useState(null);
  const { priv, setPIN, clearPIN, unlock } = usePrivacy();

  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const isPremium = user?.premiumUntil && new Date(user.premiumUntil) > new Date();
  const premDays = isPremium ? Math.ceil((new Date(user.premiumUntil) - new Date()) / 86400000) : 0;

  const handleRedeem = async () => {
    if (!promoCode.trim() || !user?.id) return;
    setPromoLoading(true);
    try {
      const result = await redeemPromoCode(user.id, promoCode.trim());
      setUser(p => ({ ...p, premiumUntil: result.premiumUntil, premiumSource: promoCode.toUpperCase() }));
      addToast(result.message, "success");
      setPromoCode("");
    } catch (e) {
      addToast(e.message || "Invalid promo code", "error");
    } finally {
      setPromoLoading(false);
    }
  };

  const setCurrency=id=>{setUser(p=>({...p,profile:{...p.profile,currency:id}}));addToast(`Currency: ${id}`,"success");};
  const setLevel=lv=>{
    const prev=profile?.classYear;
    setUser(p=>({...p,profile:{...p.profile,classYear:lv,lastPromotedDate:todayStr(),
      promotionHistory:[...(p.profile?.promotionHistory||[]),{from:prev,to:lv,date:todayStr(),manual:true}]
    }}));
    setShowLevelPicker(false);
    addToast(`Updated to ${lv}`,"success");
  };

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-xl font-bold text-slate-900" style={{fontFamily:"'Fraunces',serif"}}>Settings</h2>
      <Card className="p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-600">{profile?.fullName?.[0]||user?.email?.[0]?.toUpperCase()||"?"}</div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800">{profile?.fullName||"Student"}</p>
            <p className="text-slate-500 text-sm truncate">{user?.email}</p>
            <p className="text-indigo-600 text-xs truncate">{profile?.institutionName||""}</p>
          </div>
          <Badge color={mod?.color||"indigo"}>{mod?.icon} {mod?.shortLabel}</Badge>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[["Class/Year",profile?.classYear||"—"],["Currency",(CURRENCIES.find(c=>c.id===(profile?.currency||"BDT"))||CURRENCIES[0]).flag+" "+(profile?.currency||"BDT")],["Level",mod?.shortLabel||"—"]].map(([l,v])=>(
            <div key={l} className="bg-slate-50 rounded-xl p-2"><p className="text-slate-400 text-xs">{l}</p><p className="font-bold text-slate-700 text-sm">{v}</p></div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-2">🔗 Family Code</h3>
        <p className="text-slate-400 text-xs mb-3">Share with your parent to let them monitor your expenses</p>
        <div className="flex items-center gap-3 bg-indigo-50 rounded-xl p-3 border border-indigo-100">
          <span className="text-2xl font-bold text-indigo-700 font-mono tracking-widest flex-1">{profile?.familyCode||"------"}</span>
          <button onClick={()=>addToast("Code copied!","success")} className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg">Copy</button>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-700">🎓 Class / Level</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {cfg.mode==="smart"  && "App will remind you at end of academic year"}
              {cfg.mode==="manual" && "Update manually — " + (cfg.manualNote||"no auto-detection for this programme")}
              {cfg.mode==="never"  && "Open-ended programme — update year manually"}
            </p>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-xl font-bold ${cfg.mode==="smart"?"bg-emerald-100 text-emerald-700":cfg.mode==="manual"?"bg-amber-100 text-amber-700":"bg-slate-100 text-slate-500"}`}>
            {cfg.mode==="smart"?"🤖 Smart":cfg.mode==="manual"?"✋ Manual":"🔓 Open"}
          </span>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 rounded-2xl p-3.5 border border-slate-100 mb-3">
          <div className={`w-10 h-10 ${mod?.bgColor||"bg-indigo-50"} rounded-xl flex items-center justify-center text-xl`}>{mod?.icon}</div>
          <div className="flex-1">
            <p className="text-xs text-slate-400">{mod?.periodLabel}</p>
            <p className="font-bold text-slate-800">{profile?.classYear || "Not set"}</p>
          </div>
          <button onClick={()=>setShowLevelPicker(v=>!v)}
            className="text-xs px-3 py-2 bg-indigo-50 border-2 border-indigo-100 hover:border-indigo-300 text-indigo-700 font-bold rounded-xl transition">
            Change
          </button>
        </div>

        {showLevelPicker && (
          <div className="flex flex-wrap gap-2 mb-3 animate-slideDown">
            {(mod?.levels||[]).map(lv=>(
              <button key={lv} onClick={()=>setLevel(lv)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border-2 transition ${profile?.classYear===lv?"border-indigo-500 bg-indigo-50 text-indigo-700":"border-slate-100 bg-white text-slate-600 hover:border-slate-300"}`}>
                {lv}
                {profile?.classYear===lv && " ✓"}
              </button>
            ))}
            <button onClick={()=>setShowLevelPicker(false)} className="px-3 py-2 rounded-xl text-xs font-medium text-slate-400 border border-slate-100">Cancel</button>
          </div>
        )}

        {profile?.promotionHistory?.length > 0 && (
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs font-bold text-slate-400 mb-2">PROMOTION HISTORY</p>
            <div className="flex flex-col gap-1.5">
              {[...(profile.promotionHistory)].reverse().slice(0,5).map((h,i)=>(
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span>{h.result==="held_back"?"😞":"✅"}</span>
                  <span className="text-slate-500 font-medium">{h.from}</span>
                  <span className="text-slate-300">→</span>
                  <span className={`font-bold ${h.result==="held_back"?"text-amber-600":"text-emerald-600"}`}>{h.to}</span>
                  {h.manual && <span className="text-slate-300 text-xs">(manual)</span>}
                  <span className="ml-auto text-slate-300">{h.date}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-3">💱 Currency</h3>
        <div className="grid grid-cols-2 gap-2">
          {CURRENCIES.map(c=>(
            <button key={c.id} onClick={()=>setCurrency(c.id)}
              className={`flex items-center gap-2 p-3 rounded-2xl border-2 transition ${(profile?.currency||"BDT")===c.id?"border-indigo-500 bg-indigo-50":"border-slate-100 bg-white"}`}>
              <span className="text-xl">{c.flag}</span>
              <div className="text-left"><div className={`text-sm font-bold ${(profile?.currency||"BDT")===c.id?"text-indigo-700":"text-slate-700"}`}>{c.symbol} {c.id}</div><div className="text-xs text-slate-400 truncate">{c.name}</div></div>
              {(profile?.currency||"BDT")===c.id&&<span className="ml-auto text-indigo-600 text-sm">✓</span>}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-3">🔔 Notifications</h3>
        <Toggle label="Enable All" value={notifications.enabled} onChange={v=>setNotifications(p=>({...p,enabled:v}))}/>
        <Toggle label="Transport Reminder" sub="If not logged for 2+ days" value={notifications.transport} onChange={v=>setNotifications(p=>({...p,transport:v}))}/>
        <Toggle label="Canteen Reminder" sub="If not logged for 2+ days" value={notifications.canteen} onChange={v=>setNotifications(p=>({...p,canteen:v}))}/>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-700">🔒 Cost Privacy</h3>
            <p className="text-xs text-slate-400 mt-0.5">Set a PIN to hide cost totals from others</p>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-xl font-bold ${priv.studentPIN?"bg-emerald-100 text-emerald-700":"bg-slate-100 text-slate-500"}`}>
            {priv.studentPIN ? "PIN Set ✓" : "Not Set"}
          </span>
        </div>

        <div className="bg-slate-50 rounded-2xl p-3.5 mb-4">
          <p className="text-xs font-bold text-slate-500 mb-2">WHAT THE PIN HIDES</p>
          <div className="flex flex-col gap-1.5">
            {[["Always visible (never hidden)", "Current month / semester / class cost", "✅"],
              ["Hidden with your PIN", "Stage total, Student Life Cost, category amounts","🔒"],
              ["Hidden if parent set restriction", "Marked with 🔒 separately — needs parent PIN","👨‍👩‍👦"]].map(([title,desc,icon])=>(
              <div key={title} className="flex gap-2.5">
                <span className="text-sm mt-0.5 flex-shrink-0">{icon}</span>
                <div><p className="text-xs font-semibold text-slate-600">{title}</p><p className="text-xs text-slate-400">{desc}</p></div>
              </div>
            ))}
          </div>
        </div>

        {!priv.studentPIN ? (
          <Btn onClick={()=>setPrivModal("set")} className="w-full" size="md">Set Privacy PIN</Btn>
        ) : (
          <div className="flex gap-3">
            <Btn onClick={()=>setPrivModal("change")} variant="secondary" className="flex-1" size="sm">Change PIN</Btn>
            <Btn onClick={()=>setPrivModal("verify-clear")} variant="danger" className="flex-1" size="sm">Remove PIN</Btn>
          </div>
        )}

        {profile?.parentRestrictions?.hideLockable && (
          <div className="mt-3 bg-amber-50 border border-amber-100 rounded-2xl p-3 text-xs text-amber-700">
            🔒 Your parent has restricted some cost totals. Contact them to change this.
          </div>
        )}
      </Card>

      {privModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={()=>setPrivModal(null)}/>
          <div style={{animation:"slideup .35s cubic-bezier(.22,.61,.36,1)"}}
            className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl p-6">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4"/>
            {privModal==="set"&&<PINPad mode="set" accentColor="indigo"
              onSuccess={pin=>{setPIN(pin);setPrivModal(null);addToast("Privacy PIN set ✓","success");}}
              onCancel={()=>setPrivModal(null)}/>}
            {privModal==="change"&&<PINPad mode="verify" storedPIN={priv.studentPIN} accentColor="indigo"
              label="Enter current PIN to change it"
              onSuccess={()=>{setPrivModal("set-new");}}
              onCancel={()=>setPrivModal(null)}/>}
            {privModal==="set-new"&&<PINPad mode="set" accentColor="indigo"
              label="Set new PIN"
              onSuccess={pin=>{setPIN(pin);setPrivModal(null);addToast("PIN updated ✓","success");}}
              onCancel={()=>setPrivModal(null)}/>}
            {privModal==="verify-clear"&&<PINPad mode="verify" storedPIN={priv.studentPIN} accentColor="indigo"
              label="Enter PIN to remove it"
              onSuccess={()=>{clearPIN();setPrivModal(null);addToast("Privacy PIN removed","info");}}
              onCancel={()=>setPrivModal(null)}/>}
          </div>
        </div>
      )}

      <Card className="p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-3">🎫 Promo Code</h3>
        {isPremium ? (
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-amber-50 border border-amber-100 mb-3">
            <span className="text-xl">⭐</span>
            <div>
              <p className="font-bold text-sm text-amber-700">Premium Active</p>
              <p className="text-xs text-amber-600">{premDays} days remaining</p>
            </div>
          </div>
        ) : (
          <p className="text-slate-400 text-xs mb-3">Enter a promo code to unlock premium features</p>
        )}
        <div className="flex gap-2">
          <input value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === "Enter" && handleRedeem()}
            placeholder="Enter promo code"
            className="flex-1 rounded-xl bg-slate-50 border border-slate-200 py-2.5 px-4 text-slate-800 placeholder-slate-400 text-sm outline-none focus:border-indigo-400 font-mono tracking-wider" />
          <Btn onClick={handleRedeem} disabled={promoLoading || !promoCode.trim()} size="sm">
            {promoLoading ? "..." : "Redeem"}
          </Btn>
        </div>
      </Card>

      <Card className="p-5">
        <div className={`flex items-center gap-3 p-3 rounded-2xl mb-3 ${trialDays<10?"bg-amber-50":"bg-emerald-50"}`}>
          <span className="text-xl">{trialDays<10?"⏰":"🎉"}</span>
          <div><p className={`font-bold text-sm ${trialDays<10?"text-amber-700":"text-emerald-700"}`}>{trialDays}d trial left</p><p className="text-xs text-slate-400">Upgrade to continue after trial</p></div>
          {trialDays<30&&<Btn size="sm" className="ml-auto">Upgrade</Btn>}
        </div>
        <button onClick={()=>navigate("onboarding")} className="flex justify-between w-full py-3 border-b border-slate-50 text-sm font-medium text-slate-700 hover:text-indigo-600">Edit Profile <span>›</span></button>
        <button onClick={()=>navigate("stage-upgrade")} className="flex justify-between w-full py-3 border-b border-slate-50 text-sm font-medium text-indigo-600 font-semibold hover:text-indigo-800">🎓 Move to New Institution <span>›</span></button>
        <button onClick={()=>navigate("academic-journey")} className="flex justify-between w-full py-3 border-b border-slate-50 text-sm font-medium text-slate-700 hover:text-indigo-600">📜 Academic Journey History <span>›</span></button>
        <button onClick={()=>{setUser(null);navigate("landing");addToast("Signed out","info");}} className="flex justify-between w-full py-3 text-sm font-semibold text-red-500">Sign Out <span>›</span></button>
      </Card>

      <button onClick={()=>navigate("parent-mode")}
        className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-3xl p-4 flex items-center gap-4 shadow-lg active:scale-98 transition">
        <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">👨‍👩‍👦</div>
        <div className="text-left flex-1">
          <p className="font-bold text-sm">Switch to Parent Mode</p>
          <p className="text-white/70 text-xs">View budgets, loans & full analytics</p>
        </div>
        <span className="text-white/60 text-lg">›</span>
      </button>

      <div className="text-center text-slate-300 text-xs py-2">EduTrack v3.0 · Playgroup → PhD</div>
    </div>
  );
};

export default SettingsView;
