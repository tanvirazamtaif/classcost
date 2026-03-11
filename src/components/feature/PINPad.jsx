import React, { useState } from 'react';

const NUMS = [1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, "⌫"];

export const PINPad = React.memo(({ mode = "verify", storedPIN, onSuccess, onCancel, accentColor = "indigo", label }) => {
  const [digits, setDigits] = useState([]);
  const [shake, setShake] = useState(false);
  const [confirmDigits, setConfirmDigits] = useState(null);

  const press = (val) => {
    if (val === "⌫") { setDigits((d) => d.slice(0, -1)); return; }
    if (val === null) return;
    const next = [...digits, val];
    setDigits(next);
    if (next.length < 4) return;

    const pin = next.join("");
    if (mode === "verify" || mode === "verify-parent") {
      if (pin === storedPIN) { onSuccess(pin); }
      else { setShake(true); setTimeout(() => { setShake(false); setDigits([]); }, 600); }
    } else if (mode === "set") {
      if (!confirmDigits) {
        setConfirmDigits(next);
        setDigits([]);
      } else {
        if (pin === confirmDigits.join("")) { onSuccess(pin); }
        else { setShake(true); setTimeout(() => { setShake(false); setDigits([]); setConfirmDigits(null); }, 600); }
      }
    }
  };

  const isConfirming = mode === "set" && confirmDigits !== null;
  const ring = accentColor === "teal" ? "bg-teal-600" : "bg-indigo-600";

  return (
    <div className="flex flex-col items-center gap-6 py-2">
      <div>
        <p className="text-center text-slate-600 text-sm font-medium mb-1">
          {label || (mode === "set" ? (isConfirming ? "Confirm your PIN" : "Set a 4-digit PIN") : "Enter your PIN")}
        </p>
        {mode === "set" && !isConfirming && <p className="text-center text-xs text-slate-400">You'll use this to reveal hidden costs</p>}
      </div>

      <div className={`flex gap-4 transition-all ${shake ? "animate-shake" : ""}`} aria-label="PIN digits">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${digits.length > i ? `${ring} border-transparent scale-110` : "border-slate-300 bg-transparent"}`} />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 w-64" role="group" aria-label="PIN keypad">
        {NUMS.map((n, i) => (
          <button
            key={i}
            onClick={() => n !== null && press(n)}
            aria-label={n === "⌫" ? "Backspace" : n === null ? "" : String(n)}
            className={`h-14 rounded-2xl font-bold text-xl transition active:scale-90 ${n === null ? "invisible" : n === "⌫" ? "bg-slate-100 text-slate-500 hover:bg-slate-200" : "bg-slate-50 text-slate-800 hover:bg-slate-100 active:bg-slate-200"}`}
          >
            {n}
          </button>
        ))}
      </div>

      <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 text-sm font-medium">Cancel</button>
    </div>
  );
});

PINPad.displayName = 'PINPad';
