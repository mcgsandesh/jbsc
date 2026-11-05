// src/modules/admin/FinanceModule.jsx
import React, { useState, useEffect, useMemo } from "react";
import { 
  IndianRupee, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Plus, 
  Search, 
  Layers,
  Calendar,
  CreditCard,
  Banknote,
  Printer,
  Download,
  X,
  Clock,
  Trash2,
  Pencil
} from "lucide-react";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc 
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";
import { getAllEvents } from "../../services/eventService";
import { showSuccess, showError, showConfirm } from "../../utils/alert";
import { printFinanceStatement } from "../../utils/financePrintHelper";
import { exportFinanceToExcel } from "../../utils/financeExcelExport";

export default function FinanceModule() {
  const { currentUser, isSuperAdmin, hasEventAccess } = useAuth();
  
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("ALL");
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeChip, setActiveChip] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const getTodayDate = () => new Date().toISOString().split("T")[0];

  // Default: Expense, UPI, Today Date
  const initialFormState = {
    eventId: "",
    type: "expense",
    category: "Food / Nasta",
    amount: "",
    description: "",
    paymentMode: "UPI",
    date: getTodayDate()
  };

  const [formData, setFormData] = useState(initialFormState);

  // 1. Load Events based on Role
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const allEv = await getAllEvents();
        if (isSuperAdmin) {
          setEvents(allEv);
          setSelectedEventId("ALL");
        } else {
          const userAssigned = currentUser?.assignedEvents || [];
          const allowed = allEv.filter(e => 
            hasEventAccess(e.id) || 
            hasEventAccess(e.slug) ||
            userAssigned.includes(e.id) ||
            userAssigned.includes(e.slug)
          );
          setEvents(allowed);
          if (allowed.length > 0) {
            setSelectedEventId(allowed[0].id || allowed[0].slug);
          }
        }
      } catch (err) {
        console.error("Events error:", err);
      }
    };
    fetchEvents();
  }, [isSuperAdmin, currentUser]);

  // 2. Fetch Transactions (Compound index शिवाय robust client-side sort)
  const loadTransactions = async () => {
    setLoading(true);
    try {
      const transRef = collection(db, "transactions");
      let snap;

      if (isSuperAdmin && selectedEventId === "ALL") {
        snap = await getDocs(transRef);
      } else {
        const activeEv = events.find(ev => ev.id === selectedEventId || ev.slug === selectedEventId);
        const possibleIds = [selectedEventId];
        if (activeEv?.id) possibleIds.push(activeEv.id);
        if (activeEv?.slug) possibleIds.push(activeEv.slug);
        const uniqueIds = [...new Set(possibleIds.filter(Boolean))];

        const q = query(transRef, where("eventId", "in", uniqueIds));
        snap = await getDocs(q);
      }

      let data = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));

      data.sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt || 0);
        const dateB = new Date(b.date || b.createdAt || 0);
        return dateB - dateA;
      });

      setTransactions(data);
    } catch (err) {
      console.error("Fetch transactions error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEventId) {
      loadTransactions();
    }
  }, [selectedEventId]);

  // 3. Stats Calculation (Cash vs UPI Split)
  const stats = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let cashIncome = 0;
    let cashExpense = 0;
    let upiIncome = 0;
    let upiExpense = 0;

    transactions.forEach(t => {
      const amt = Number(t.amount) || 0;
      const isCash = t.paymentMode === "Cash";

      if (t.type === "income") {
        totalIncome += amt;
        if (isCash) cashIncome += amt;
        else upiIncome += amt;
      }
      if (t.type === "expense") {
        totalExpense += amt;
        if (isCash) cashExpense += amt;
        else upiExpense += amt;
      }
    });

    return {
      income: totalIncome,
      expense: totalExpense,
      balance: totalIncome - totalExpense,
      cashBalance: cashIncome - cashExpense,
      upiBalance: upiIncome - upiExpense,
      cashIncome,
      cashExpense,
      upiIncome,
      upiExpense
    };
  }, [transactions]);

  // 4. Modal उघडणे - नवीन नोंद (New Add)
  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({
      ...initialFormState,
      eventId: selectedEventId !== "ALL" ? selectedEventId : (events[0]?.id || events[0]?.slug || ""),
      date: getTodayDate(),
      paymentMode: "UPI"
    });
    setIsModalOpen(true);
  };

  // 5. Modal उघडणे - संपादन (Edit - फक्त Superadmin)
  const handleOpenEditModal = (item) => {
    if (!isSuperAdmin) {
      showError("परवानगी नाही", "फक्त Superadmin नोंद संपादित करू शकतो.");
      return;
    }
    setEditingId(item.id);
    setFormData({
      eventId: item.eventId || "",
      type: item.type || "expense",
      category: item.category || "",
      amount: item.amount || "",
      description: item.description || "",
      paymentMode: item.paymentMode || "UPI",
      date: item.date || item.createdAt?.split("T")[0] || getTodayDate()
    });
    setIsModalOpen(true);
  };

  // 6. Save (Add / Update) Transaction
  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) {
      showError("चूक", "कृपया योग्य रक्कम प्रविष्ट करा.");
      return;
    }

    const targetEvent = events.find(ev => (ev.id === formData.eventId || ev.slug === formData.eventId));
    const eventKey = targetEvent?.id || targetEvent?.slug || formData.eventId;

    try {
      if (editingId) {
        const docRef = doc(db, "transactions", editingId);
        await updateDoc(docRef, {
          ...formData,
          eventId: eventKey,
          amount: Number(formData.amount),
          eventTitle: targetEvent?.title || "General Event",
          updatedAt: new Date().toISOString(),
          updatedBy: {
            uid: currentUser?.uid || "",
            name: currentUser?.name || "Admin",
            email: currentUser?.email || ""
          }
        });
        showSuccess("यशस्वी", "नोंद यशस्वीरित्या अपडेट केली.");
      } else {
        await addDoc(collection(db, "transactions"), {
          ...formData,
          eventId: eventKey,
          amount: Number(formData.amount),
          eventTitle: targetEvent?.title || "General Event",
          recordedBy: {
            uid: currentUser?.uid || "",
            name: currentUser?.name || "Admin",
            email: currentUser?.email || "",
            role: currentUser?.role || "admin"
          },
          createdAt: new Date().toISOString()
        });
        showSuccess("नोंद पूर्ण", "हिशोब यशस्वीरित्या जतन केला.");
      }

      setIsModalOpen(false);
      setEditingId(null);
      loadTransactions();
    } catch (err) {
      console.error(err);
      showError("त्रुटी", "नोंद सेव्ह करता आली नाही.");
    }
  };

  // 7. Delete with showConfirm (SweetAlert)
  const handleDelete = async (id) => {
    if (!isSuperAdmin) {
      showError("परवानगी नाही", "फक्त Superadmin ही नोंद हटवू शकतो.");
      return;
    }

    const isConfirmed = await showConfirm(
      "खात्री करा",
      "ही आर्थिक नोंद कायमची हटवायची आहे का?"
    );

    if (isConfirmed) {
      try {
        await deleteDoc(doc(db, "transactions", id));
        showSuccess("हटवले", "नोंद यशस्वीरित्या हटवली गेली.");
        loadTransactions();
      } catch (err) {
        console.error(err);
        showError("त्रुटी", "नोंद हटवता आली नाही.");
      }
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const matchChip = activeChip === "ALL" || t.type === activeChip;
    const matchSearch = !searchQuery || 
      (t.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.category || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.paymentMode || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.eventTitle || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.recordedBy?.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchChip && matchSearch;
  });

  const activeEventObj = events.find(ev => ev.id === selectedEventId || ev.slug === selectedEventId);

  return (
    <div className="space-y-3.5 font-sans w-full">
      
      {/* 1. Header Card (Fluid Full Width) */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="p-2 bg-orange-50 text-orange-600 rounded-xl shrink-0">
            <Wallet className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
              जमा - खर्च हिशोब <span className="text-xs font-bold text-slate-400 font-normal">(Finance)</span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium truncate">
              {isSuperAdmin ? "सर्व इव्हेंट्सचा मध्यवर्ती हिशोब" : "तुमच्या इव्हेंटचा अधिकृत हिशोब"}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between md:justify-end">
          <div className="flex-1 sm:flex-initial flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 min-w-[140px]">
            <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              disabled={!isSuperAdmin && events.length <= 1}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer w-full disabled:opacity-80"
            >
              {isSuperAdmin && (
                <option value="ALL">सर्व इव्हेंट्स एकत्र</option>
              )}
              {events.map((ev) => (
                <option key={ev.id} value={ev.id || ev.slug}>
                  {ev.title} ({ev.year || 2026})
                </option>
              ))}
            </select>
          </div>

          {isSuperAdmin && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => {
                  printFinanceStatement({
                    clubName: "जागेवाला बाबा स्पोर्ट्स क्लब",
                    eventTitle: selectedEventId === "ALL" ? "सर्व इव्हेंट्स एकत्रित पत्रक" : (activeEventObj?.title || "दीपोत्सव २०२६"),
                    year: activeEventObj?.year || "२०२६",
                    transactions: filteredTransactions
                  });
                }}
                className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="A4 Portrait पत्रक प्रिंट करा"
              >
                <Printer className="w-4 h-4 text-slate-700" />
                <span className="hidden md:inline">प्रिंट</span>
              </button>

              <button
                onClick={() => {
                  exportFinanceToExcel({
                    eventTitle: selectedEventId === "ALL" ? "All_Events" : (activeEventObj?.title || "Event"),
                    transactions: filteredTransactions
                  });
                }}
                className="p-2 sm:px-3 sm:py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Excel / CSV डाउनलोड करा"
              >
                <Download className="w-4 h-4 text-emerald-700" />
                <span className="hidden md:inline">Excel</span>
              </button>
            </div>
          )}

          <button
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-1 px-3 sm:px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-xs transition cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="font-black">नोंद करा</span>
          </button>
        </div>
      </div>

      {/* 2. Three Compact Stats Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3.5">
        <div className="bg-white p-2.5 sm:p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-tight">खर्च</span>
            <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1">
            <div className="text-sm sm:text-2xl font-black text-rose-600 tracking-tight leading-tight">
              ₹{stats.expense.toLocaleString("en-IN")}
            </div>
            <div className="text-[9px] sm:text-[10px] text-slate-400 font-medium truncate mt-0.5">
              C: ₹{stats.cashExpense} • U: ₹{stats.upiExpense}
            </div>
          </div>
        </div>

        <div className="bg-white p-2.5 sm:p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-tight">जमा</span>
            <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1">
            <div className="text-sm sm:text-2xl font-black text-emerald-600 tracking-tight leading-tight">
              ₹{stats.income.toLocaleString("en-IN")}
            </div>
            <div className="text-[9px] sm:text-[10px] text-slate-400 font-medium truncate mt-0.5">
              C: ₹{stats.cashIncome} • U: ₹{stats.upiIncome}
            </div>
          </div>
        </div>

        <div className="bg-white p-2.5 sm:p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-tight truncate">शिल्लक</span>
            <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <IndianRupee className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1">
            <div className={`text-sm sm:text-2xl font-black tracking-tight leading-tight ${stats.balance >= 0 ? "text-slate-900" : "text-rose-600"}`}>
              ₹{stats.balance.toLocaleString("en-IN")}
            </div>
            <div className="text-[9px] sm:text-[10px] text-slate-500 font-medium truncate mt-0.5">
              <span className="text-emerald-700 font-bold">C: ₹{stats.cashBalance}</span> • <span className="text-blue-700 font-bold">U: ₹{stats.upiBalance}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search & Chips Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 bg-white p-2 sm:p-2.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveChip("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeChip === "ALL" 
                ? "bg-slate-900 text-white shadow-xs" 
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            सर्व ({transactions.length})
          </button>
          <button
            onClick={() => setActiveChip("expense")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1 ${
              activeChip === "expense" 
                ? "bg-rose-600 text-white shadow-xs" 
                : "bg-rose-50 text-rose-700 hover:bg-rose-100"
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>खर्च</span>
          </button>
          <button
            onClick={() => setActiveChip("income")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1 ${
              activeChip === "income" 
                ? "bg-emerald-600 text-white shadow-xs" 
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>जमा</span>
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-64 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="तपशील, नोंद करणारा किंवा वर्गवारी..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-transparent outline-none text-slate-800"
          />
        </div>
      </div>

      {/* 4. Sleek Card-List View */}
      <div className="space-y-2">
        {loading ? (
          <div className="py-12 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400 font-medium">
            हिशोब लोड होत आहे...
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-12 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400 font-medium">
            कोणतीही नोंद सापडली नाही.
          </div>
        ) : (
          filteredTransactions.map((item) => {
            const isExpense = item.type === "expense";
            const isCash = item.paymentMode === "Cash";

            return (
              <div 
                key={item.id} 
                className="bg-white px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl border border-slate-200/90 hover:border-slate-300 shadow-xs transition flex items-center justify-between gap-3"
              >
                {/* Left Side: Type Icon + Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isExpense ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                  }`}>
                    {isExpense ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                        {item.category}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        • {item.eventTitle}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 font-medium flex-wrap">
                      <span className="flex items-center gap-0.5 text-slate-400">
                        <Clock className="w-2.5 h-2.5" />
                        {item.date || item.createdAt?.split("T")[0]}
                      </span>
                      <span>•</span>
                      <span className={`font-semibold inline-flex items-center gap-0.5 ${
                        isCash ? "text-amber-700" : "text-blue-700"
                      }`}>
                        {isCash ? <Banknote className="w-2.5 h-2.5" /> : <CreditCard className="w-2.5 h-2.5" />}
                        {item.paymentMode || "UPI"}
                      </span>
                      {item.description && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span className="hidden sm:inline truncate max-w-sm text-slate-400 italic">
                            "{item.description}"
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Side: Amount & Superadmin Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div className={`text-xs sm:text-base font-black tracking-tight leading-tight ${
                      isExpense ? "text-rose-600" : "text-emerald-600"
                    }`}>
                      {isExpense ? "-" : "+"} ₹{Number(item.amount).toLocaleString("en-IN")}
                    </div>
                    <div className="text-[9px] text-slate-400 font-medium">
                      नोंद: {item.recordedBy?.name || "Admin"}
                    </div>
                    {item.description && (
                      <div className="sm:hidden text-[9px] text-slate-400 truncate max-w-[100px] mt-0.5">
                        {item.description}
                      </div>
                    )}
                  </div>

                  {/* Superadmin: Edit & Delete Buttons */}
                  {isSuperAdmin && (
                    <div className="flex items-center gap-0.5 pl-1.5 border-l border-slate-200">
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer active:scale-95"
                        title="नोंद संपादित करा (Edit)"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer active:scale-95"
                        title="नोंद हटवा (Delete)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* 5. Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-100 space-y-3.5 max-h-[92vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm sm:text-base font-black text-slate-900">
                {editingId ? "नोंद संपादित करा (Edit)" : "नवीन नोंद करा"}
              </h2>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingId(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              
              <div>
                <label className="font-bold text-slate-600 block mb-1">नोंद प्रकार</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: "expense" })}
                    className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      formData.type === "expense"
                        ? "bg-rose-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <TrendingDown className="w-4 h-4" />
                    <span>खर्च (Expense)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: "income" })}
                    className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      formData.type === "income"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span>जमा (Income)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">इव्हेंट निवडा</label>
                <select
                  value={formData.eventId}
                  onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none cursor-pointer"
                  required
                >
                  <option value="">-- इव्हेंट निवडा --</option>
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id || ev.slug}>{ev.title}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">रक्कम (₹)</label>
                  <input
                    type="number"
                    placeholder="उदा. 1500"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-black text-slate-900 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1">तारीख</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-700 outline-none"
                    required
                  />
                </div>
              </div>

              {/* Payment Mode: By default UPI first */}
              <div>
                <label className="font-bold text-slate-600 block mb-1">पेमेंट मोड (Payment Mode)</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentMode: "UPI" })}
                    className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      formData.paymentMode === "UPI"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>UPI / Online</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentMode: "Cash" })}
                    className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      formData.paymentMode === "Cash"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>Cash (रोख)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">वर्गवारी (Category)</label>
                <input
                  type="text"
                  placeholder="उदा. जेवण, साउंड, ग्राउंड, चषक, देणगी"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-medium"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">तपशील / शेरा</label>
                <textarea
                  rows="2"
                  placeholder="खर्चाचे कारण किंवा कोणाकडून आले..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-medium"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingId(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-slate-600 hover:bg-slate-200 cursor-pointer active:scale-95"
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black cursor-pointer shadow-xs active:scale-95"
                >
                  {editingId ? "बदल जतन करा" : "जतन करा"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}