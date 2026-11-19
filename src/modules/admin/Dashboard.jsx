// src/modules/admin/Dashboard.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  CalendarCheck, 
  Users, 
  IndianRupee, 
  PlusCircle, 
  ArrowUpRight,
  Sparkles,
  QrCode,
  FileText,
  Layers,
  TrendingUp,
  Clock,
  Wallet,
  UserPlus
} from "lucide-react";
import { APP_CONFIG } from "../../config/constants";
import { db } from "../../config/firebase";
import { collection, getDocs } from "firebase/firestore";

export default function Dashboard() {
  const storedUser = JSON.parse(sessionStorage.getItem("jbsc_admin_user") || "{}");

  const [activeEvents, setActiveEvents] = useState([]);
  const [eventMetrics, setEventMetrics] = useState({});
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Firestore आणि Google Sheet मधून अचूक लाईव्ह डेटा फेच करणे
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // १. एकूण युझर्सची संख्या फेच करणे (Users Module Count)
        try {
          const usersSnap = await getDocs(collection(db, "users"));
          setTotalUsersCount(usersSnap.size);
        } catch (e) {
          console.log("Users collection error:", e);
        }

        // २. सर्व सक्रिय इव्हेंट्स फेच करणे
        const eventsSnap = await getDocs(collection(db, "events"));
        let activeList = [];
        
        eventsSnap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.isActive === true || data.isActive === "true" || data.isActive === 1) {
            activeList.push({
              id: docSnap.id,
              ...data
            });
          }
        });

        setActiveEvents(activeList);

        // ३. ट्रान्झॅक्शन्स (जमा आणि खर्च) फेच करणे
        const transSnap = await getDocs(collection(db, "transactions"));
        const metricsMap = {};

        // प्रत्येक इव्हेंटसाठी मॅप इनिशिअलाइज करणे
        activeList.forEach(ev => {
          metricsMap[ev.id] = {
            income: 0,
            expense: 0,
            balance: 0,
            totalRegistrations: 0,
            pendingPayments: 0
          };
        });

        // ट्रान्झॅक्शन्सची मोजदाद (जमा आणि खर्च)
        transSnap.forEach((docSnap) => {
          const trans = docSnap.data();
          const eId = trans.eventId;
          const amount = Number(trans.amount || 0);

          if (eId && metricsMap[eId]) {
            if (trans.type === "income" || trans.category?.includes("जमा")) {
              metricsMap[eId].income += amount;
            } else if (trans.type === "expense" || trans.category?.includes("खर्च")) {
              metricsMap[eId].expense += amount;
            }
          }
        });

        // ४. गुगल शीट API मधून प्रत्येक इव्हेंटचा नोंदणी व पेंडिंग डेटा फेच करणे
        const scriptUrl = import.meta.env.VITE_GOOGLE_SHEET_API_URL;
        
        if (scriptUrl) {
          for (const ev of activeList) {
            try {
              const res = await fetch(`${scriptUrl}?sheet=${encodeURIComponent(ev.title)}`);
              const result = await res.json();

              if (result && result.status === "success" && Array.isArray(result.data)) {
                const sheetRows = result.data;
                metricsMap[ev.id].totalRegistrations = sheetRows.length;

                let pendingCount = 0;
                sheetRows.forEach(row => {
                  const status = String(row["Payment_Status"] || row["paymentStatus"] || "").toLowerCase();
                  // जर Paid नसेल तर पेंडिंग मोजणे
                  if (status !== "paid" && status !== "यशस्वी" && status !== "free") {
                    pendingCount++;
                  }
                });
                metricsMap[ev.id].pendingPayments = pendingCount;
              }
            } catch (sheetErr) {
              console.error(`Error fetching sheet for event ${ev.title}:`, sheetErr);
            }
          }
        }

        // शिल्लक रक्कम (Balance = Income - Expense) कॅलक्युलेट करणे
        Object.keys(metricsMap).forEach(eId => {
          metricsMap[eId].balance = metricsMap[eId].income - metricsMap[eId].expense;
        });

        setEventMetrics(metricsMap);

      } catch (err) {
        console.error("Error fetching dashboard metrics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="w-full space-y-6">
      
      {/* Top Welcome Banner */}
      <div className="w-full bg-gradient-to-r from-orange-600 to-amber-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-orange-600/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" /> JBSC इव्हेंट मॅनेजमेंट पॅनेल
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            स्वागत आहे, {storedUser?.name || "ऍडमिन"}!
          </h1>
          <p className="text-orange-100 text-sm mt-1 max-w-xl">
            {APP_CONFIG.FULL_CLUB_NAME} - गुगल शीट सिंक डेटा, इव्हेंटनिहाय शिल्लक आणि नोंदणी तपशील.
          </p>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end justify-between border-t border-white/20 sm:border-0 pt-3 sm:pt-0">
          <span className="text-xs uppercase tracking-wider text-orange-200 font-semibold">एकूण ऍडमिन युझर्स</span>
          <span className="text-3xl font-black text-white">{totalUsersCount}</span>
        </div>
      </div>

      {/* Section Title */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
          <Layers className="w-5 h-5 text-orange-600" />
          सक्रिय इव्हेंटनुसार गुगल शीट नोंदणी आणि फायनान्स तपशील
        </h2>
        <span className="text-xs font-bold px-3 py-1 bg-orange-50 text-orange-700 rounded-full border border-orange-200">
          सक्रिय इव्हेंट्स: {activeEvents.length}
        </span>
      </div>

      {/* Event-wise Detailed Summary Cards */}
      {loading ? (
        <div className="text-center py-10 text-slate-400 font-medium">गुगल शीटवरून डेटा लोड होत आहे...</div>
      ) : activeEvents.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500">
          सध्या कोणताच इव्हेंट सक्रिय नाही. कृपया 'इव्हेंट्स' मधून नवीन इव्हेंट सक्रिय करा.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {activeEvents.map((event) => {
            const m = eventMetrics[event.id] || { income: 0, expense: 0, balance: 0, totalRegistrations: 0, pendingPayments: 0 };
            
            return (
              <div 
                key={event.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition p-6 flex flex-col justify-between"
              >
                <div>
                  {/* Event Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                        सक्रिय इव्हेंट
                      </span>
                      <h3 className="text-xl font-black text-slate-900">{event.title}</h3>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">वर्ष</span>
                      <span className="text-sm font-bold text-slate-700">{event.year || "२०२६"}</span>
                    </div>
                  </div>

                  {/* Finance & Registration Summary Grid */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {/* जमा रक्कम */}
                    <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
                      <div className="text-[11px] text-emerald-800 font-medium mb-1 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-emerald-600" /> एकूण जमा
                      </div>
                      <div className="text-base font-black text-emerald-700 truncate">
                        ₹ {m.income}
                      </div>
                    </div>

                    {/* खर्च रक्कम */}
                    <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-100">
                      <div className="text-[11px] text-rose-800 font-medium mb-1 flex items-center gap-1">
                        <IndianRupee className="w-3 h-3 text-rose-600" /> एकूण खर्च
                      </div>
                      <div className="text-base font-black text-rose-700 truncate">
                        ₹ {m.expense}
                      </div>
                    </div>

                    {/* शिल्लक रक्कम (Net Balance) */}
                    <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100">
                      <div className="text-[11px] text-blue-800 font-medium mb-1 flex items-center gap-1">
                        <Wallet className="w-3 h-3 text-blue-600" /> शिल्लक (हात उरले)
                      </div>
                      <div className={`text-base font-black truncate ${m.balance < 0 ? "text-rose-600" : "text-blue-700"}`}>
                        ₹ {m.balance}
                      </div>
                    </div>
                  </div>

                  {/* Google Sheet Registrations & Pending Count Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-purple-600" /> शीटमधील एकूण नोंदणी
                        </div>
                        <div className="text-lg font-black text-slate-900 mt-0.5">
                          {m.totalRegistrations}
                        </div>
                      </div>
                      <FileText className="w-5 h-5 text-purple-300" />
                    </div>

                    <div className={`p-3 rounded-xl border flex items-center justify-between ${m.pendingPayments > 0 ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-100"}`}>
                      <div>
                        <div className={`text-[11px] font-medium flex items-center gap-1 ${m.pendingPayments > 0 ? "text-amber-800 font-bold" : "text-slate-500"}`}>
                          <Clock className="w-3.5 h-3.5 text-amber-600" /> पेमेंट पेंडिंग लोक
                        </div>
                        <div className={`text-lg font-black mt-0.5 ${m.pendingPayments > 0 ? "text-amber-700" : "text-slate-900"}`}>
                          {m.pendingPayments}
                        </div>
                      </div>
                      <Clock className={`w-5 h-5 ${m.pendingPayments > 0 ? "text-amber-400 animate-pulse" : "text-slate-300"}`} />
                    </div>
                  </div>
                </div>

                {/* Event Actions Footer */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Link
                    to="/admin/finance"
                    className="text-xs font-bold text-orange-600 hover:text-orange-700 inline-flex items-center gap-1 bg-orange-50 px-3 py-2 rounded-xl transition"
                  >
                    जमा/खर्च जोडा <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>

                  <Link
                    to="/admin/registrations"
                    className="text-xs font-bold text-slate-700 hover:text-slate-900 inline-flex items-center gap-1 bg-slate-100 px-3 py-2 rounded-xl transition"
                  >
                    यादी व पेंडिंग तपासा <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>

                  <Link
                    to="/register"
                    target="_blank"
                    className="text-xs font-medium text-slate-500 hover:text-slate-800"
                  >
                    फॉर्म ↗
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick General Control Hub with Add User Shortcut */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-900 text-base mb-3">इतर जलद नियंत्रणे (General Quick Actions & Shortcuts)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Link
            to="/admin/users"
            className="flex items-center gap-2.5 p-3.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 transition text-xs font-bold border border-orange-200"
          >
            <UserPlus className="w-4 h-4 text-orange-600 shrink-0" />
            नवीन युजर जोडा ({totalUsersCount})
          </Link>

          <Link
            to="/admin/events"
            className="flex items-center gap-2.5 p-3.5 rounded-xl bg-slate-50 hover:bg-orange-50 hover:text-orange-600 transition text-xs font-semibold text-slate-700 border border-slate-100"
          >
            <PlusCircle className="w-4 h-4 text-blue-600 shrink-0" />
            नवीन इव्हेंट बनवा
          </Link>

          <Link
            to="/admin/scanner"
            className="flex items-center gap-2.5 p-3.5 rounded-xl bg-slate-50 hover:bg-orange-50 hover:text-orange-600 transition text-xs font-semibold text-slate-700 border border-slate-100"
          >
            <QrCode className="w-4 h-4 text-purple-600 shrink-0" />
            QR स्कॅनर
          </Link>

          <Link
            to="/admin/finance"
            className="flex items-center gap-2.5 p-3.5 rounded-xl bg-slate-50 hover:bg-orange-50 hover:text-orange-600 transition text-xs font-semibold text-slate-700 border border-slate-100"
          >
            <IndianRupee className="w-4 h-4 text-emerald-600 shrink-0" />
            फायनान्स मॉड्यूल
          </Link>

          <Link
            to="/admin/registrations"
            className="flex items-center gap-2.5 p-3.5 rounded-xl bg-slate-50 hover:bg-orange-50 hover:text-orange-600 transition text-xs font-semibold text-slate-700 border border-slate-100"
          >
            <FileText className="w-4 h-4 text-amber-600 shrink-0" />
            सर्व नोंदणी
          </Link>
        </div>
      </div>

    </div>
  );
}