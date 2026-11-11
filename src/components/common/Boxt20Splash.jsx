import React, { useState, useEffect } from "react";
import { Trophy, X, ChevronRight } from "lucide-react";

export default function Boxt20Splash() {
  const [isOpen, setIsOpen] = useState(true);
  const [timeLeft, setTimeLeft] = useState(5);

  const base = import.meta.env.BASE_URL || "/";

  const cricketTeams = [
    {
      name: "लोहगड लायन्स",
      subtitle: "Lohagad Lions",
      img: `${base}teams/lohagad-lions.jpg`,
      tag: "शौर्य आणि ताकद",
      border: "border-amber-500/60"
    },
    {
      name: "तोरणा टायटन्स",
      subtitle: "Torna Titans",
      img: `${base}teams/torna-titans.jpg`,
      tag: "पहिला विजय",
      border: "border-red-500/60"
    },
    {
      name: "शिवनेरी शिलेदार",
      subtitle: "Shivneri Shiledar",
      img: `${base}teams/shivneri-shiledar.jpg`,
      tag: "जन्मभूमीचा स्वाभिमान",
      border: "border-orange-500/60"
    },
    {
      name: "कोंढाणा पलटण",
      subtitle: "Kondhana Paltan",
      img: `${base}teams/kondhana-paltan.jpg`,
      tag: "अजिंक्य योद्धा",
      border: "border-yellow-500/60"
    },
    {
      name: "रायगड रॉयल्स",
      subtitle: "Raygad Royals",
      img: `${base}teams/raygad-royals.jpg`,
      tag: "राजधानीचा रुबाब",
      border: "border-rose-500/60"
    },
    {
      name: "प्रतापगड फायटर्स",
      subtitle: "Pratapgad Fighters",
      img: `${base}teams/pratapgad-fighters.jpg`,
      tag: "रणधुरंधर लढाऊ",
      border: "border-amber-500/60"
    }
  ];

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsOpen(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* मुख्य मोडल कंटेनर (Dark Premium Solid Background) */}
      <div className="relative w-full max-w-md sm:max-w-lg bg-slate-950 rounded-3xl border-2 border-amber-500 shadow-2xl p-4 sm:p-5 text-center text-white overflow-hidden">
        
        {/* Top Header: JBSC + Skip Timer */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
          <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-400">
            <Trophy className="w-4 h-4 text-amber-400" /> JBSC क्रीडा पर्व २०२६
          </span>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700 cursor-pointer"
          >
            <span>Skip ({timeLeft}s)</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* COMING SOON + BOXT20 Headline */}
        <div className="my-3 space-y-1.5">
          {/* Blinking Badge */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-rose-600 text-white font-black text-xs sm:text-sm tracking-wider uppercase border border-rose-400 shadow-lg shadow-rose-600/40 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            🔥 COMING SOON • DEC 2026 🔥
          </div>

          {/* Solid Glowing BOXT20 Title (कधीही गायब होणार नाही) */}
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-amber-400 drop-shadow-[0_4px_16px_rgba(251,191,36,0.5)] my-1">
            🏏 BOXT20
          </h1>

          {/* 6 Overs Highlight */}
          <div className="inline-block px-3.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-300 font-black text-xs sm:text-sm tracking-wide">
            ⚡ ह्या वर्षी LONG FORMAT मध्ये — <span className="text-white underline decoration-amber-400 font-extrabold">६ षटकांचे थरारक सामने!</span> ⚡
          </div>
        </div>

        {/* ६ किल्लेदार संघ (Logos Grid) */}
        <div className="my-3 bg-slate-900/90 p-2.5 sm:p-3 rounded-2xl border border-slate-800">
          <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 block mb-2">
            मैदानात भिडणारे ६ अधिकृत किल्लेदार संघ
          </span>

          <div className="grid grid-cols-3 gap-2">
            {cricketTeams.map((team, idx) => (
              <div
                key={idx}
                className={`p-1.5 sm:p-2 rounded-xl bg-slate-950 border ${team.border} shadow-md flex flex-col items-center justify-center transform hover:scale-105 transition`}
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-slate-800 border border-slate-700 mb-1 flex items-center justify-center shrink-0">
                  <img
                    src={team.img}
                    alt={team.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                </div>
                <span className="text-[10px] sm:text-[11px] font-black leading-tight text-white line-clamp-1">
                  {team.name}
                </span>
                <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 truncate max-w-full">
                  {team.tag}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Slogan Card */}
        <div className="space-y-1 my-2">
          <div className="py-1.5 px-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-xs sm:text-sm">
            ✨ "Save Your Sundays For Cricket!" ✨
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 font-semibold">
            नियम व खेळाडू नोंदणीची तारीख लवकरच जाहीर होईल. Stay Tuned!
          </p>
        </div>

        {/* Solid Visible Action Button */}
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="w-full mt-2 py-3 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-black text-sm shadow-lg shadow-orange-600/40 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
        >
          <span>दीपोत्सव नोंदणी फॉर्म भरा</span>
          <ChevronRight className="w-4 h-4" />
        </button>

      </div>
    </div>
  );
}