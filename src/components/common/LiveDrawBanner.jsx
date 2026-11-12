// src/components/common/LiveDrawBanner.jsx
import React, { useState, useEffect } from "react";
import { db } from "../../config/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { Gift, Sparkles, Clock, Trophy, AlertTriangle } from "lucide-react";

export default function LiveDrawBanner() {
  const [drawData, setDrawData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [rollingNumber, setRollingNumber] = useState("REG_000000");

  // १. Firestore वरील Live Draw स्टेट ऐकणे
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "live_draw"), (snap) => {
      if (snap.exists()) {
        setDrawData(snap.data());
      } else {
        setDrawData(null);
      }
    });
    return () => unsub();
  }, []);

  // २. स्पिनिंग अ‍ॅनिमेशनसाठी रँडम नंबर्स फिरवणे
  useEffect(() => {
    if (drawData?.status !== "spinning") return;
    const spinInterval = setInterval(() => {
      const rand = Math.floor(100000 + Math.random() * 900000);
      setRollingNumber(`REG_${rand}`);
    }, 80);
    return () => clearInterval(spinInterval);
  }, [drawData?.status]);

  // ३. २० सेकंद काउंटडाउन टाइमर
  useEffect(() => {
    if (drawData?.status !== "counting" || !drawData?.expiresAt) {
      setTimeLeft(0);
      return;
    }

    const timer = setInterval(() => {
      const rem = Math.max(0, Math.ceil((drawData.expiresAt - Date.now()) / 1000));
      setTimeLeft(rem);
      if (rem === 0) clearInterval(timer);
    }, 200);

    return () => clearInterval(timer);
  }, [drawData]);

  // जर लकी ड्रॉ सुरू नसेल तर काहीही दाखवू नये
  if (!drawData || drawData.status === "idle") return null;

  return (
    <div className="max-w-4xl mx-auto my-4 px-3 sm:px-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="relative rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 border-2 border-amber-400 shadow-2xl p-5 sm:p-7 text-center text-white overflow-hidden">
        
        {/* Top Tag */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs font-black uppercase tracking-wider mb-3">
          <Gift className="w-4 h-4 text-amber-400 animate-bounce" />
          <span>LIVE LUCKY DRAW • {drawData.eventTitle}</span>
        </div>

        {/* १. स्पिनिंग अवस्था */}
        {drawData.status === "spinning" && (
          <div className="py-4 space-y-2">
            <p className="text-sm font-bold text-amber-200 animate-pulse">
              भाग्यवान नोंदणी क्रमांक निवडला जात आहे...
            </p>
            <div className="text-3xl sm:text-5xl font-mono font-black tracking-widest text-amber-400 bg-black/50 py-3 px-6 rounded-2xl border border-amber-500/40 inline-block">
              {rollingNumber}
            </div>
          </div>
        )}

        {/* २. विजेता निवडला गेला आणि २० सेकंद सुरू */}
        {(drawData.status === "counting" || drawData.status === "expired") && (
          <div className="space-y-3">
            <div className="inline-block px-4 py-1 rounded-xl bg-amber-400 text-slate-950 font-mono font-black text-lg sm:text-xl shadow-md">
              {drawData.winnerRegId}
            </div>

            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              🎉 {drawData.winnerName} 🎉
            </h2>

            {drawData.status === "counting" && timeLeft > 0 ? (
              <div className="pt-2">
                <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-rose-600 text-white font-black text-lg sm:text-2xl shadow-lg shadow-rose-600/40 animate-pulse">
                  <Clock className="w-6 h-6" />
                  <span>स्टेजजवळ या! उरलेला वेळ: {timeLeft} सेकंद</span>
                </div>
              </div>
            ) : (
              <div className="pt-2">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-950/90 border border-rose-500 text-rose-300 font-black text-xs sm:text-sm">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>वेळ संपली! २० सेकंदांत स्टेजवर न आल्यामुळे पुढील नंबर काढला जाईल.</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ३. बक्षीस मिळाल्याचे जाहीर */}
        {drawData.status === "claimed" && (
          <div className="space-y-2 py-2">
            <div className="inline-flex items-center gap-1.5 text-emerald-400 font-black text-sm">
              <Trophy className="w-5 h-5" />
              <span>हार्दिक अभिनंदन! बक्षीस विजेते</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              {drawData.winnerName} ({drawData.winnerRegId})
            </h2>
          </div>
        )}

      </div>
    </div>
  );
}