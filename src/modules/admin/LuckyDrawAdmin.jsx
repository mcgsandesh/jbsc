// src/modules/admin/LuckyDrawAdmin.jsx
import React, { useState, useEffect } from "react";
import { db } from "../../config/firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { 
  Gift, 
  Sparkles, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Users, 
  RefreshCw,
  Trophy,
  Clock
} from "lucide-react";
import { getAllEvents } from "../../services/eventService";
import { showError, showSuccess } from "../../utils/alert";

export default function LuckyDrawAdmin() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eligibleMembers, setEligibleMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Live Firestore Draw State
  const [liveDraw, setLiveDraw] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  // याआधी जिंकलेले Reg_IDs (पुन्हा त्याच व्यक्तीचा नंबर येऊ नये म्हणून)
  const [claimedIds, setClaimedIds] = useState([]);

  // १. इव्हेंट्स लोड करणे
  useEffect(() => {
    const init = async () => {
      try {
        const all = await getAllEvents();
        setEvents(all);
        if (all.length > 0) setSelectedEvent(all[0]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // २. फक्त Paid सदस्यांची यादी Google Sheet मधून आणणे
  const fetchEligibleMembers = async () => {
    if (!selectedEvent) return;
    try {
      const scriptUrl = import.meta.env.VITE_GOOGLE_SHEET_API_URL;
      const res = await fetch(`${scriptUrl}?sheet=${encodeURIComponent(selectedEvent.title)}`);
      const result = await res.json();

      if (result?.status === "success" && Array.isArray(result.data)) {
        const paidOnly = result.data.filter((row) => {
          const st = String(row["Payment_Status"] || row["paymentStatus"] || "").toLowerCase();
          return st === "paid" || st === "यशस्वी" || st === "free";
        });
        setEligibleMembers(paidOnly);
      }
    } catch (e) {
      console.error(e);
      showError("त्रुटी", "सदस्यांची यादी लोड करता आली नाही.");
    }
  };

  useEffect(() => {
    if (selectedEvent) fetchEligibleMembers();
  }, [selectedEvent]);

  // ३. Firestore वरील Live Draw स्टेट ऐकणे
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "live_draw"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setLiveDraw(data);
        if (Array.isArray(data.claimedIds)) {
          setClaimedIds(data.claimedIds);
        }
      }
    });
    return () => unsub();
  }, []);

  // ४. २० सेकंदांचा रिअल-टाइम टाइमर मोजणे
  useEffect(() => {
    if (!liveDraw || liveDraw.status !== "counting" || !liveDraw.expiresAt) {
      setTimeLeft(0);
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((liveDraw.expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        // वेळ संपल्यावर आपोआप Expired मार्क करणे
        setDoc(doc(db, "settings", "live_draw"), {
          ...liveDraw,
          status: "expired"
        }, { merge: true });
      }
    }, 250);

    return () => clearInterval(interval);
  }, [liveDraw]);

  // ५. रँडम विजेता निवडणे आणि २० सेकंद टाइमर सुरू करणे
  const handleDrawWinner = async () => {
    const pool = eligibleMembers.filter((m) => {
      const id = String(m["Reg_ID"] || m["regId"] || "").trim();
      return id && !claimedIds.includes(id);
    });

    if (pool.length === 0) {
      showError("यादी पूर्ण!", "सर्व पात्र सदस्यांचा लकी ड्रॉ पूर्ण झाला आहे.");
      return;
    }

    setSpinning(true);

    // ३ सेकंद सस्पेन्स रोलिंग अ‍ॅनिमेशन
    await setDoc(doc(db, "settings", "live_draw"), {
      status: "spinning",
      eventTitle: selectedEvent?.title || "दीपोत्सव लकी ड्रॉ",
      claimedIds: claimedIds
    });

    setTimeout(async () => {
      const randomIndex = Math.floor(Math.random() * pool.length);
      const winner = pool[randomIndex];

      const regId = String(winner["Reg_ID"] || winner["regId"] || "-").trim();
      const fullName = winner["Full_Name"] || winner["पूर्ण नाव (Full Name)"] || winner["नाव"] || "सहभागी सदस्य";

      // २० सेकंदांचा काउंटडाउन सेट करणे
      const expiresAt = Date.now() + 20000;

      await setDoc(doc(db, "settings", "live_draw"), {
        status: "counting",
        eventTitle: selectedEvent?.title || "दीपोत्सव लकी ड्रॉ",
        winnerRegId: regId,
        winnerName: fullName,
        expiresAt: expiresAt,
        claimedIds: claimedIds
      });

      setSpinning(false);
    }, 3000);
  };

  // ६. विजेता स्टेजवर आल्यास बक्षीस कन्फर्म करणे
  const handleConfirmPrize = async () => {
    if (!liveDraw?.winnerRegId) return;
    const updatedClaimed = [...claimedIds, liveDraw.winnerRegId];

    await setDoc(doc(db, "settings", "live_draw"), {
      ...liveDraw,
      status: "claimed",
      claimedIds: updatedClaimed
    }, { merge: true });

    showSuccess("अभिनंदन!", `${liveDraw.winnerName} (${liveDraw.winnerRegId}) यांना बक्षीस प्रदान केले!`);
  };

  // ७. होम पेजवरून लकी ड्रॉ बॅनर लपवणे (Hide/Reset)
  const handleHideBanner = async () => {
    await setDoc(doc(db, "settings", "live_draw"), {
      status: "idle",
      claimedIds: claimedIds
    });
  };

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-16 font-sans">
      
      {/* Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900">लाईव्ह लकी ड्रॉ नियंत्रण</h1>
            <p className="text-[11px] text-slate-500">फक्त Paid सदस्यांमधून २० सेकंद स्टेज चॅलेंज</p>
          </div>
        </div>
        <button
          onClick={fetchEligibleMembers}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
          title="यादी रिफ्रेश करा"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">पात्र सदस्य (Paid)</span>
            <span className="text-xl font-black text-slate-900">{eligibleMembers.length}</span>
          </div>
          <Users className="w-6 h-6 text-emerald-500" />
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">बक्षीस विजेते</span>
            <span className="text-xl font-black text-orange-600">{claimedIds.length}</span>
          </div>
          <Trophy className="w-6 h-6 text-amber-500" />
        </div>
      </div>

      {/* Main Action Card */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800 text-center space-y-5">
        
        {/* Current Active Winner Status */}
        {liveDraw?.status === "spinning" && (
          <div className="py-8 space-y-2 animate-pulse">
            <Sparkles className="w-10 h-10 text-amber-400 mx-auto animate-spin" />
            <h2 className="text-xl font-black text-amber-300">भाग्यवान विजेता निवडला जात आहे...</h2>
            <p className="text-xs text-slate-400">कृपया मुख्य स्क्रीनकडे लक्ष द्या!</p>
          </div>
        )}

        {(liveDraw?.status === "counting" || liveDraw?.status === "expired") && (
          <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-3">
            <span className="inline-block px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-mono font-black">
              {liveDraw.winnerRegId}
            </span>
            <h2 className="text-2xl font-black text-white">{liveDraw.winnerName}</h2>

            {liveDraw.status === "counting" ? (
              <div className="flex items-center justify-center gap-2 text-rose-400 font-black text-xl">
                <Clock className="w-5 h-5 animate-bounce" />
                <span>उरलेला वेळ: {timeLeft} सेकंद</span>
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-black">
                ⏰ २० सेकंद पूर्ण झाले! सदस्य स्टेजवर न आल्यास नवीन नंबर काढा.
              </div>
            )}

            {/* Confirm Prize Button */}
            <button
              onClick={handleConfirmPrize}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>विजेता स्टेजवर आला! (Confirm Prize)</span>
            </button>
          </div>
        )}

        {liveDraw?.status === "claimed" && (
          <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 space-y-1">
            <span className="text-xs font-bold text-emerald-400">🎉 बक्षीस सुपूर्द केले!</span>
            <h3 className="text-lg font-black text-white">{liveDraw.winnerName} ({liveDraw.winnerRegId})</h3>
          </div>
        )}

        {/* Draw Button */}
        <button
          onClick={handleDrawWinner}
          disabled={spinning || eligibleMembers.length === 0}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 hover:from-orange-500 hover:to-amber-400 text-slate-950 font-black text-sm sm:text-base shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <Play className="w-5 h-5 fill-slate-950" />
          <span>{spinning ? "नंबर फिरत आहे..." : "नवीन विजेता काढा (Spin Lucky Draw)"}</span>
        </button>

        {/* Hide Banner from Home Page */}
        {liveDraw && liveDraw.status !== "idle" && (
          <button
            onClick={handleHideBanner}
            className="text-xs font-bold text-slate-400 hover:text-white flex items-center justify-center gap-1 mx-auto cursor-pointer"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>होम पेजवरून बॅनर बंद करा</span>
          </button>
        )}

      </div>
    </div>
  );
}