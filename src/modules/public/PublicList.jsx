// src/modules/public/PublicList.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
  Users, 
  Search, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  RefreshCw,
  AlertCircle,
  UtensilsCrossed,
  IndianRupee,
  Salad,
  Drumstick,
  Lock
} from "lucide-react";
import { getAllEvents } from "../../services/eventService";
import { showError } from "../../utils/alert";

export default function PublicList() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [eventData, setEventData] = useState(null);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchListData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    else setRefreshing(true);

    try {
      const allEvents = await getAllEvents();
      let matchedEvent = null;

      if (slug) {
        matchedEvent = allEvents.find(
          (e) => (e.slug && e.slug.toLowerCase() === slug.toLowerCase()) || e.id === slug
        );
      }

      if (!matchedEvent && allEvents.length > 0) {
        matchedEvent = allEvents[0];
      }

      setEventData(matchedEvent);

      // जर फॉर्म बंद असेल (isRegistrationOpen === false) तर शीट डेटा लोड न करता थेट थांबा
      if (matchedEvent && matchedEvent.isRegistrationOpen === false) {
        setList([]);
        return;
      }

      if (matchedEvent) {
        const scriptUrl = import.meta.env.VITE_GOOGLE_SHEET_API_URL;
        if (scriptUrl) {
          const response = await fetch(`${scriptUrl}?sheet=${encodeURIComponent(matchedEvent.title)}`);
          const result = await response.json();

          if (result && result.status === "success") {
            setList(result.data || []);
          } else {
            setList([]);
          }
        }
      }
    } catch (err) {
      console.error(err);
      showError("Error", "नोंदणी यादी लोड करता आली नाही.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchListData(true);
  }, [slug]);

  // Food type helper
  const getFoodType = (item) => {
    for (let key in item) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes("food") || lowerKey.includes("जेवण") || lowerKey.includes("meal")) {
        const val = String(item[key] || "").toLowerCase();
        if (val.includes("non") || val.includes("नॉन")) return "Non-Veg";
        if (val.includes("veg") || val.includes("व्हेज") || val.includes("शाकाहारी")) return "Veg";
        return item[key];
      }
    }
    for (let key in item) {
      const val = String(item[key] || "").toLowerCase();
      if (val === "non-veg" || val === "non veg" || val === "नॉनव्हेज") return "Non-Veg";
      if (val === "veg" || val === "व्हेज" || val === "शाकाहारी") return "Veg";
    }
    return null;
  };

  // Summary Card Statistics
  const stats = useMemo(() => {
    let vegCount = 0;
    let nonVegCount = 0;
    let paidCount = 0;
    let paidAmount = 0;
    let pendingCount = 0;
    let pendingAmount = 0;

    list.forEach((item) => {
      const food = getFoodType(item);
      if (food === "Veg") vegCount++;
      if (food === "Non-Veg") nonVegCount++;

      const amt = Number(item["Amount"]) || Number(eventData?.baseAmount) || 0;
      const status = String(item["Payment_Status"] || item["paymentStatus"] || "").toLowerCase();

      if (status === "paid" || status === "यशस्वी" || status === "free") {
        paidCount++;
        paidAmount += amt;
      } else {
        pendingCount++;
        pendingAmount += amt;
      }
    });

    return {
      total: list.length,
      hasFood: vegCount > 0 || nonVegCount > 0,
      vegCount,
      nonVegCount,
      paidCount,
      paidAmount,
      pendingCount,
      pendingAmount
    };
  }, [list, eventData]);

  // Search Filter
  const filteredList = list.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;

    const name = String(item["Full_Name"] || item["पूर्ण नाव (Full Name)"] || item["नाव"] || "").toLowerCase();
    const regId = String(item["Reg_ID"] || item["regId"] || "").toLowerCase();

    return name.includes(q) || regId.includes(q);
  });

  // १. लोडिंग अवस्था
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto my-12 px-4">
        <div className="py-16 text-center text-slate-400 text-xs sm:text-sm bg-white rounded-3xl border border-slate-200 shadow-sm">
          <div className="w-7 h-7 border-3 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          नोंदणी यादी तपासली जात आहे...
        </div>
      </div>
    );
  }

  // २. जर फॉर्म बंद असेल तर संपूर्ण यादी ब्लॉक करा (सुरक्षित गार्ड)
  if (eventData && eventData.isRegistrationOpen === false) {
    return (
      <div className="max-w-md mx-auto my-12 px-4">
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 text-center shadow-sm">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-100">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">
            नोंदणी यादी बंद आहे
          </h2>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            {eventData?.title ? `"${eventData.title}"` : "या इव्हेंट"} ची नोंदणी प्रक्रिया पूर्ण झाल्यामुळे अधिकृत यादी तात्पुरती बंद करण्यात आली आहे.
          </p>
          <div className="mt-6">
            <Link
              to="/"
              className="inline-flex items-center justify-center px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              मुख्य पानावर जा
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto my-4 px-3 sm:px-4 space-y-4 font-sans">
      
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate(slug ? `/${slug}` : "/register")}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="मागे जा"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
              {eventData?.title || "नोंदणी यादी"}
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              वर्ष {eventData?.year || 2026} • सहभागी सदस्यांची अधिकृत यादी
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchListData(false)}
          disabled={loading || refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-orange-600" : ""}`} />
          <span className="hidden sm:inline">रिफ्रेश</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-3">
        
        {/* Card 1: Total */}
        <div className="bg-white p-2.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-tight">एकूण</span>
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500" />
          </div>
          <div className="mt-1">
            <div className="text-lg sm:text-2xl font-black text-slate-900 leading-none">
              {stats.total}
            </div>
            <div className="text-[9px] sm:text-[11px] font-semibold text-slate-400 mt-0.5">नोंदणी</div>
          </div>
        </div>

        {/* Card 2: Food */}
        <div className="bg-white p-2.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-tight">जेवण</span>
            <UtensilsCrossed className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <div>
              <span className="text-xs sm:text-base font-black text-emerald-600">{stats.vegCount}</span>
              <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold ml-0.5">व्हेज</span>
            </div>
            <div className="border-l border-slate-200 pl-2">
              <span className="text-xs sm:text-base font-black text-rose-600">{stats.nonVegCount}</span>
              <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold ml-0.5">नॉनव्हेज</span>
            </div>
          </div>
        </div>

        {/* Card 3: Payments */}
        <div className="bg-white p-2.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-tight">फी जमा / बाकी</span>
            <IndianRupee className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <div>
              <span className="text-xs sm:text-base font-black text-emerald-700">₹{stats.paidAmount}</span>
              <span className="text-[9px] sm:text-[10px] text-emerald-600 font-bold block sm:inline sm:ml-0.5">({stats.paidCount})</span>
            </div>
            <div className="border-l border-slate-200 pl-1.5 sm:pl-2">
              <span className="text-xs sm:text-base font-black text-amber-700">₹{stats.pendingAmount}</span>
              <span className="text-[9px] sm:text-[10px] text-amber-600 font-bold block sm:inline sm:ml-0.5">({stats.pendingCount})</span>
            </div>
          </div>
        </div>

      </div>

      {/* Search Input */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-400 ml-1 shrink-0" />
        <input
          type="text"
          placeholder="सहभागी सदस्याचे नाव किंवा Reg ID शोधा..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-xs sm:text-sm font-medium focus:outline-none text-slate-800 placeholder-slate-400"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="px-2 text-xs font-bold text-slate-400 hover:text-slate-600 shrink-0 cursor-pointer"
          >
            साफ करा
          </button>
        )}
      </div>

      {/* Registration List */}
      <div className="space-y-2.5">
        {filteredList.length === 0 ? (
          <div className="py-14 text-center text-slate-400 text-xs sm:text-sm px-4 bg-white rounded-2xl border border-slate-200">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            {searchQuery ? "या नावाने कोणतीही नोंदणी सापडली नाही." : "या इव्हेंटसाठी अजून कोणतीही नोंदणी झालेली नाही."}
          </div>
        ) : (
          filteredList.map((row, index) => {
            const regId = row["Reg_ID"] || row["regId"] || "-";
            const fullName = row["Full_Name"] || row["पूर्ण नाव (Full Name)"] || row["नाव"] || "सहभागी सदस्य";
            const status = String(row["Payment_Status"] || row["paymentStatus"] || "").toLowerCase();
            const isPaid = status === "paid" || status === "यशस्वी" || status === "free";
            const foodType = getFoodType(row);

            return (
              <div 
                key={index}
                className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between gap-3 hover:border-orange-200 transition"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-slate-900 truncate leading-tight">
                      {fullName}
                    </h3>

                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="font-mono text-[10px] sm:text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                        {regId}
                      </span>

                      {foodType && (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${
                          foodType === "Veg"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}>
                          {foodType === "Veg" ? (
                            <Salad className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Drumstick className="w-3 h-3 text-rose-600" />
                          )}
                          {foodType}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  {isPaid ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      {status === "free" ? "मोफत" : "Paid"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] sm:text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                      <Clock className="w-3 h-3 text-amber-600" />
                      प्रलंबित
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}