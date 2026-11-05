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
  Lock, 
  CreditCard, 
  QrCode, 
  X, 
  Copy, 
  ExternalLink 
} from "lucide-react";
import { getAllEvents } from "../../services/eventService";
import { showError, showSuccess } from "../../utils/alert";

export default function PublicList() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [eventData, setEventData] = useState(null);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activePayItem, setActivePayItem] = useState(null);

  const fetchListData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    else setRefreshing(true);

    try {
      const allEvents = await getAllEvents();
      let matchedEvent = null;

      if (slug) {
        matchedEvent = allEvents.find(
          (e) => 
            (e.slug && String(e.slug).toLowerCase() === String(slug).toLowerCase()) || 
            (e.id && String(e.id).toLowerCase() === String(slug).toLowerCase())
        );
      }

      if (!matchedEvent && allEvents.length > 0) {
        matchedEvent = allEvents.find(e => e.isActive === true) || allEvents[0];
      }

      setEventData(matchedEvent);

      if (matchedEvent && matchedEvent.isActive === false) {
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
      showError("त्रुटी", "नोंदणी यादी लोड करता आली नाही.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchListData(true);
  }, [slug]);

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

  const filteredList = list.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;

    const name = String(item["Full_Name"] || item["पूर्ण नाव (Full Name)"] || item["नाव"] || "").toLowerCase();
    const regId = String(item["Reg_ID"] || item["regId"] || "").toLowerCase();

    return name.includes(q) || regId.includes(q);
  });

  const upiId = eventData?.upiSettings?.upiId || eventData?.upiId || "";
  const payeeName = eventData?.upiSettings?.payeeName || eventData?.title || "JBSC Events";

  const getUpiDeepLink = (amount, note) => {
    return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
  };

  const copyUpiId = (id) => {
    navigator.clipboard.writeText(id);
    showSuccess("कॉपी झाले!", "UPI ID क्लिपबोर्डवर कॉपी झाला आहे.");
  };

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

  if (eventData && eventData.isActive === false) {
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
    <div className="max-w-3xl mx-auto my-4 px-3 sm:px-4 space-y-3.5 font-sans">
      
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => navigate(slug ? `/${slug}` : "/register")}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer shrink-0"
            title="मागे जा"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight leading-tight truncate">
              {eventData?.title || "नोंदणी यादी"}
            </h1>
            <p className="text-[11px] text-slate-500 font-medium truncate">
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
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-white p-2.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-tight">एकूण</span>
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500" />
          </div>
          <div className="mt-1">
            <div className="text-base sm:text-2xl font-black text-slate-900 leading-none">
              {stats.total}
            </div>
            <div className="text-[9px] sm:text-[11px] font-semibold text-slate-400 mt-0.5">नोंदणी</div>
          </div>
        </div>

        <div className="bg-white p-2.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-tight">जेवण</span>
            <UtensilsCrossed className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5 sm:gap-2">
            <div>
              <span className="text-xs sm:text-base font-black text-emerald-600">{stats.vegCount}</span>
              <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold ml-0.5">व्हेज</span>
            </div>
            <div className="border-l border-slate-200 pl-1.5 sm:pl-2">
              <span className="text-xs sm:text-base font-black text-rose-600">{stats.nonVegCount}</span>
              <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold ml-0.5">नॉन</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-2.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-tight">फी जमा / बाकी</span>
            <IndianRupee className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5 sm:gap-2">
            <div>
              <span className="text-xs sm:text-base font-black text-emerald-700">₹{stats.paidAmount}</span>
              <span className="text-[9px] sm:text-[10px] text-emerald-600 font-bold block sm:inline sm:ml-0.5">({stats.paidCount})</span>
            </div>
            <div className="border-l border-slate-200 pl-1 sm:pl-2">
              <span className="text-xs sm:text-base font-black text-amber-700">₹{stats.pendingAmount}</span>
              <span className="text-[9px] sm:text-[10px] text-amber-600 font-bold block sm:inline sm:ml-0.5">({stats.pendingCount})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white p-2 sm:p-2.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2">
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

      {/* Registration List: 2-Row Optimized Compact Layout */}
      <div className="space-y-2">
        {filteredList.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs sm:text-sm px-4 bg-white rounded-2xl border border-slate-200">
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
            const amt = Number(row["Amount"]) || Number(eventData?.baseAmount) || 0;

            return (
              <div 
                key={index}
                className="bg-white px-3 py-2.5 sm:px-4 sm:py-3 rounded-2xl border border-slate-200/90 shadow-xs hover:border-orange-200 transition space-y-2"
              >
                {/* 1st Row: Sr No + Full Name (Left) & Reg ID (Right) */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-tight break-words">
                      {fullName}
                    </h3>
                  </div>

                  <span className="font-mono text-[9px] sm:text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100 shrink-0">
                    {regId}
                  </span>
                </div>

                {/* 2nd Row: Meal Badge (Left) & Status / Pay Button (Right) */}
                <div className="flex items-center justify-between gap-2 pt-0.5 border-t border-slate-50">
                  {/* Left: Food Badge */}
                  <div>
                    {foodType ? (
                      <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-md border ${
                        foodType === "Veg"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}>
                        {foodType === "Veg" ? (
                          <Salad className="w-2.5 h-2.5 text-emerald-600" />
                        ) : (
                          <Drumstick className="w-2.5 h-2.5 text-rose-600" />
                        )}
                        <span>{foodType}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-300 font-semibold">•</span>
                    )}
                  </div>

                  {/* Right: Payment Status / Pay Button */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isPaid ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>{status === "free" ? "Free" : "Paid"}</span>
                      </span>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-2.5 h-2.5 text-amber-600" />
                          <span>Pending</span>
                        </span>

                        <button
                          onClick={() => setActivePayItem({ regId, fullName, amount: amt })}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-orange-600 hover:bg-orange-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
                          title="UPI ने फी भरा"
                        >
                          <CreditCard className="w-2.5 h-2.5" />
                          <span>Pay ₹{amt}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* UPI Payment Modal */}
      {activePayItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  फी भरा (UPI Payment)
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  {activePayItem.fullName} • <span className="font-mono text-orange-600 font-bold">{activePayItem.regId}</span>
                </p>
              </div>
              <button 
                onClick={() => setActivePayItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center space-y-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                कोणत्याही UPI ॲपने स्कॅन करा
              </span>

              {upiId ? (
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=8&data=${encodeURIComponent(getUpiDeepLink(activePayItem.amount, `${eventData?.title || 'Event'} - ${activePayItem.regId}`))}`} 
                  alt="UPI QR Code" 
                  className="w-44 h-44 mx-auto object-contain rounded-xl border border-slate-200 bg-white p-2 shadow-xs"
                />
              ) : (
                <div className="w-44 h-44 mx-auto bg-white rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center p-3 text-center">
                  <QrCode className="w-10 h-10 text-slate-400 mb-1" />
                  <span className="text-[11px] font-bold text-slate-600">JBSC अधिकृत QR</span>
                </div>
              )}

              <div className="text-2xl font-black text-slate-900">
                ₹{activePayItem.amount}
              </div>

              {upiId && (
                <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                  <span className="font-mono text-slate-700 font-bold truncate">
                    {upiId}
                  </span>
                  <button
                    onClick={() => copyUpiId(upiId)}
                    className="p-1 text-slate-400 hover:text-orange-600 transition"
                    title="UPI ID कॉपी करा"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {upiId && (
              <a
                href={getUpiDeepLink(activePayItem.amount, `${eventData?.title || 'Event'} - ${activePayItem.regId}`)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs transition active:scale-95"
              >
                <ExternalLink className="w-4 h-4" />
                <span>GPay / PhonePe / Paytm ने भरा</span>
              </a>
            )}

            <p className="text-[10px] text-center text-slate-400 font-medium leading-relaxed">
              पेमेंट झाल्यावर स्क्रीनशॉट जतन करा किंवा कमिटी सदस्यांना दाखवा.
            </p>

          </div>
        </div>
      )}

    </div>
  );
}