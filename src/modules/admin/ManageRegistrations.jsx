// src/modules/admin/ManageRegistrations.jsx
import React, { useState, useEffect, useMemo } from "react";
import { 
  Users, 
  Search, 
  Phone, 
  MessageCircle, 
  RefreshCw, 
  IndianRupee, 
  CheckCircle2, 
  Clock, 
  Salad, 
  Drumstick, 
  AlertCircle, 
  Printer, 
  CreditCard, 
  Banknote, 
  X,
  Pencil,
  Shirt,
  Tag
} from "lucide-react";
import { getAllEvents } from "../../services/eventService";
import { showError, showSuccess, showConfirm } from "../../utils/alert";
import { useAuth } from "../../context/AuthContext";
import { getPermissions } from "../../utils/permissions";
import { printReport } from "../../utils/printHelper";

export default function ManageRegistrations() {
  const { currentUser, isSuperAdmin } = useAuth();
  const perms = getPermissions(currentUser);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState(null);
  const [updatingFoodId, setUpdatingFoodId] = useState(null);

  // Payment Mode Selector State (UPI vs Cash Modal)
  const [paymentModalData, setPaymentModalData] = useState(null);

  // Superadmin Dynamic Edit Member Modal State
  const [editModalData, setEditModalData] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // 1. Events Load Karne
  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true);
      try {
        const all = await getAllEvents();
        setEvents(all);
        if (all.length > 0) {
          setSelectedEvent(all[0]);
        }
      } catch (err) {
        console.error(err);
        showError("त्रुटी", "इव्हेंट्स लोड करता आले नाहीत.");
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, []);

  // 2. Google Sheet Data Load Karne
  const fetchSheetData = async (showLoader = true) => {
    if (!selectedEvent) return;
    if (showLoader) setLoading(true);
    else setRefreshing(true);

    try {
      const scriptUrl = import.meta.env.VITE_GOOGLE_SHEET_API_URL;
      if (scriptUrl) {
        const response = await fetch(`${scriptUrl}?sheet=${encodeURIComponent(selectedEvent.title)}`);
        const result = await response.json();

        if (result && result.status === "success") {
          setList(result.data || []);
        } else {
          setList([]);
        }
      }
    } catch (err) {
      console.error(err);
      showError("त्रुटी", "नोंदणी डेटा लोड करता आला नाही.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (selectedEvent) {
      fetchSheetData(true);
    }
  }, [selectedEvent]);

  // 3. Smart User Input Dynamic Badges (Column G सह युझरने फॉर्ममध्ये भरलेला सर्व डेटा दाखवणे, ॲडमिन लॉग्स व सिस्टम कीज गाळणे)
  const getDynamicBadges = (row) => {
    const badges = [];
    const excludedKeys = [
      "reg_id", "regid", "timestamp", "full_name", "fullname", "पूर्ण नाव (Full Name)", 
      "नाव", "name", "mobile", "phone", "whatsapp", "व्हॉट्सॲप नंबर (WhatsApp No)", "amount", 
      "payment_status", "payment_mode", "food_status", "paymentstatus", "paymentmode", 
      "foodstatus", "updatedat", "updatedby", "createdat", "createdby", "food_served_at", 
      "food_served_by", "payment_time", "payment_updated_by", "event_title", "eventtitle",
      "updatedby", "recordedby"
    ];

    for (let key in row) {
      const lowerKey = String(key).toLowerCase().trim().replace(/[\s_]+/g, "");
      const val = String(row[key] || "").trim();

      if (!val) continue;

      // सिस्टीम कीज, मोबाईल नंबर किंवा तारीख असलेले लॉग्ज गाळणे
      const isExcluded = excludedKeys.some(ex => lowerKey.includes(ex));
      if (isExcluded) continue;

      if (
        val.match(/^\d{2}\/\d{2}\/\d{4}/) ||
        val.match(/^\d{4}-\d{2}-\d{2}/) ||
        val.replace(/\D/g, "").length === 10
      ) {
        continue;
      }

      let badgeColor = "bg-amber-50 text-amber-800 border-amber-200";
      let IconComponent = Tag;

      if (lowerKey.includes("food") || lowerKey.includes("जेवण") || lowerKey.includes("meal")) {
        if (val.toLowerCase().includes("non") || val.includes("नॉन")) {
          badgeColor = "bg-rose-50 text-rose-700 border-rose-200";
          IconComponent = Drumstick;
        } else {
          badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
          IconComponent = Salad;
        }
      } else if (lowerKey.includes("shirt") || lowerKey.includes("tshirt") || lowerKey.includes("टी-शर्ट") || lowerKey.includes("size")) {
        badgeColor = "bg-blue-50 text-blue-700 border-blue-200";
        IconComponent = Shirt;
      }

      // Column G किंवा इतर सर्व कस्टम फील्ड्स (उदा. मैदानावर तुमची ओळख काय: Batsman) स्पष्ट दाखवणे
      badges.push({ key, label: `${key}: ${val}`, color: badgeColor, Icon: IconComponent });
    }
    return badges;
  };

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
    return null;
  };

  // 4. Summary Stats Calculation & Dynamic Field Detection
  const stats = useMemo(() => {
    let vegCount = 0;
    let nonVegCount = 0;
    let paidCount = 0;
    let paidAmount = 0;
    let pendingCount = 0;
    let pendingAmount = 0;
    let upiCount = 0;
    let cashCount = 0;

    let hasFoodField = false;
    let tshirtSizes = {};

    list.forEach((item) => {
      for (let key in item) {
        const lowerKey = key.toLowerCase();
        const val = String(item[key] || "").trim();
        if (lowerKey.includes("food") || lowerKey.includes("जेवण") || lowerKey.includes("meal")) {
          hasFoodField = true;
          const lowerVal = val.toLowerCase();
          if (lowerVal.includes("non") || lowerVal.includes("नॉन")) {
            nonVegCount++;
          } else if (val) {
            vegCount++;
          }
        }
        if (lowerKey.includes("shirt") || lowerKey.includes("tshirt") || lowerKey.includes("टी-शर्ट") || lowerKey.includes("size") || lowerKey.includes("साइज")) {
          if (val) {
            tshirtSizes[val] = (tshirtSizes[val] || 0) + 1;
          }
        }
      }

      const amt = Number(item["Amount"]) || Number(selectedEvent?.baseAmount) || 0;
      const status = String(item["Payment_Status"] || item["paymentStatus"] || "").toLowerCase();
      const mode = String(item["Payment_Mode"] || item["paymentMode"] || "").toLowerCase();

      if (status === "paid" || status === "यशस्वी" || status === "free") {
        paidCount++;
        paidAmount += amt;
        if (mode.includes("cash") || mode.includes("रोख")) {
          cashCount++;
        } else {
          upiCount++;
        }
      } else {
        pendingCount++;
        pendingAmount += amt;
      }
    });

    const tshirtArray = Object.entries(tshirtSizes).map(([size, count]) => ({ size, count }));

    return {
      total: list.length,
      hasFoodField,
      vegCount,
      nonVegCount,
      tshirtArray,
      paidCount,
      paidAmount,
      pendingCount,
      pendingAmount,
      upiCount,
      cashCount
    };
  }, [list, selectedEvent]);

  // 5. WhatsApp Link Builder
  const getWhatsAppLink = (item) => {
    let mobile = String(item["Mobile"] || item["mobile"] || item["व्हॉट्सॲप नंबर (WhatsApp No)"] || "").replace(/[^0-9]/g, "");
    if (!mobile) return "#";
    if (mobile.length === 10) mobile = `91${mobile}`;

    const fullName = item["Full_Name"] || item["fullName"] || item["पूर्ण नाव (Full Name)"] || "सदस्य";
    const regId = item["Reg_ID"] || item["regId"] || "-";
    const amt = item["Amount"] || selectedEvent?.baseAmount || 0;
    const status = String(item["Payment_Status"] || "Pending");

    let msg = selectedEvent?.whatsappTemplate || "नमस्कार {name}, {event} नोंदणीसाठी धन्यवाद. Reg ID: {regId}, फी: ₹{amount}, स्थिती: {status}.";
    
    msg = msg
      .replace(/{name}/g, fullName)
      .replace(/{event}/g, selectedEvent?.title || "")
      .replace(/{regId}/g, regId)
      .replace(/{amount}/g, String(amt))
      .replace(/{status}/g, status);

    return `https://wa.me/${mobile}?text=${encodeURIComponent(msg)}`;
  };

  // 6. Payment Action Handler
  const handlePaymentClick = async (row, index) => {
    if (!perms.canEditPayment) {
      showError("अस्वीकृत", "पेमेंट स्थिती बदलण्याची परवानगी फक्त Desk किंवा Finance Admin ला आहे.");
      return;
    }

    const regId = row["Reg_ID"] || row["regId"];
    const currentStatus = String(row["Payment_Status"] || "").toLowerCase();
    const isCurrentlyPaid = currentStatus === "paid" || currentStatus === "यशस्वी";
    const currentAmt = Number(row["Amount"]) || Number(selectedEvent?.baseAmount) || 0;

    if (isCurrentlyPaid) {
      const confirmPending = await showConfirm(
        "पेमेंट बाकी करायचे?",
        `${regId} चे पेमेंट पुन्हा 'Pending' म्हणून चिन्हांकित करायचे आहे का?`
      );
      if (confirmPending) {
        await executePaymentUpdate(regId, "Pending", "-", index, currentAmt);
      }
      return;
    }

    setPaymentModalData({
      regId,
      fullName: row["Full_Name"] || row["fullName"] || "सदस्य",
      amount: currentAmt,
      index
    });
  };

  const executePaymentUpdate = async (regId, newStatus, paymentMode, index, finalAmount) => {
    const updatedAmount = Number(finalAmount) || 0;

    const updated = [...list];
    if (updated[index]) {
      updated[index]["Payment_Status"] = newStatus;
      updated[index]["Payment_Mode"] = paymentMode;
      updated[index]["Amount"] = updatedAmount;
      setList(updated);
    }

    setUpdatingId(regId);
    setPaymentModalData(null);

    try {
      const scriptUrl = import.meta.env.VITE_GOOGLE_SHEET_API_URL;
      if (scriptUrl) {
        await fetch(scriptUrl, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "updatePayment",
            Event_Title: selectedEvent.title,
            regId: String(regId).trim(),
            newStatus: newStatus,
            paymentMode: paymentMode,
            amount: updatedAmount,
            updatedBy: currentUser?.name || currentUser?.email || "Desk Admin"
          }),
        });

        setTimeout(() => {
          fetchSheetData(false);
        }, 1200);
      }
      showSuccess("यशस्वी", `${regId} चे पेमेंट ${newStatus} (₹${updatedAmount}) नोंदवले गेले.`);
    } catch (err) {
      console.error(err);
      showError("त्रुटी", "Sheet मध्ये अपडेट करताना अडचण आली.");
      fetchSheetData(false);
    } finally {
      setUpdatingId(null);
    }
  };

  // Food Status Toggle
  const handleToggleFood = async (regId, currentFoodStatus, index) => {
    const isCurrentlyServed = String(currentFoodStatus || "").toLowerCase() === "served";
    const newStatus = isCurrentlyServed ? "Pending" : "Served";

    const updated = [...list];
    if (updated[index]) {
      updated[index]["Food_Status"] = newStatus;
      setList(updated);
    }
    setUpdatingFoodId(regId);

    try {
      const scriptUrl = import.meta.env.VITE_GOOGLE_SHEET_API_URL;
      if (scriptUrl) {
        await fetch(scriptUrl, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "updateFoodStatus",
            Event_Title: selectedEvent.title,
            regId: String(regId).trim(),
            newFoodStatus: newStatus,
            servedBy: currentUser?.name || currentUser?.email || "Volunteer"
          }),
        });

        setTimeout(() => {
          fetchSheetData(false);
        }, 1200);
      }
      showSuccess("अपडेट", `${regId} चे जेवण स्थिती: ${newStatus === "Served" ? "मिळाले (Served)" : "बाकी"}`);
    } catch (err) {
      console.error(err);
      showError("त्रुटी", "Sheet मध्ये जेवण स्थिती सेव्ह करता आली नाही.");
      fetchSheetData(false);
    } finally {
      setUpdatingFoodId(null);
    }
  };

  // 7. Superadmin Dynamic Edit Registration Handler
  const handleOpenEditModal = (row, index) => {
    if (!isSuperAdmin) {
      showError("परवानगी नाही", "नोंदणीतील माहिती बदलण्याचे अधिकार फक्त Superadmin ला आहेत.");
      return;
    }

    const regId = row["Reg_ID"] || row["regId"] || "-";

    setEditModalData({
      index,
      regId,
      fields: { ...row }
    });
  };

  const handleSaveEditMember = async (e) => {
    e.preventDefault();
    if (!editModalData || !selectedEvent) return;

    setSavingEdit(true);
    const { index, regId, fields } = editModalData;

    const updated = [...list];
    updated[index] = { ...updated[index], ...fields };
    setList(updated);

    try {
      const scriptUrl = import.meta.env.VITE_GOOGLE_SHEET_API_URL;
      if (scriptUrl) {
        await fetch(scriptUrl, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "editRegistration",
            Event_Title: selectedEvent.title,
            regId: String(regId).trim(),
            ...fields,
            updatedBy: currentUser?.name || currentUser?.email || "Superadmin"
          }),
        });

        setTimeout(() => {
          fetchSheetData(false);
        }, 1200);
      }
      showSuccess("बदल जतन झाले!", `Reg ID: ${regId} ची सर्व माहिती यशस्वीरित्या अपडेट झाली.`);
      setEditModalData(null);
    } catch (err) {
      console.error(err);
      showError("त्रुटी", "Sheet मध्ये माहिती अपडेट करताना अडचण आली.");
      fetchSheetData(false);
    } finally {
      setSavingEdit(false);
    }
  };

  // 8. Search & Filter
  const filteredList = list.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    const name = String(item["Full_Name"] || item["fullName"] || item["पूर्ण नाव (Full Name)"] || "").toLowerCase();
    const regId = String(item["Reg_ID"] || item["regId"] || "").toLowerCase();
    const mob = String(item["Mobile"] || item["mobile"] || item["व्हॉट्सॲप नंबर (WhatsApp No)"] || "");

    const matchQuery = !q || name.includes(q) || regId.includes(q) || mob.includes(q);

    const status = String(item["Payment_Status"] || "").toLowerCase();
    const isPaid = status === "paid" || status === "यशस्वी" || status === "free";

    let matchStatus = true;
    if (statusFilter === "paid") matchStatus = isPaid;
    if (statusFilter === "pending") matchStatus = !isPaid;

    return matchQuery && matchStatus;
  });

  // 9. PDF Print
  const handlePrintList = () => {
    printReport({
      clubName: "जागेवाला बाबा स्पोर्ट्स क्लब",
      title: selectedEvent?.title || "Event Registrations",
      subtitle: "A to Z वर्णानुक्रमे हजेरी व जेवण यादी",
      sortFn: (row) => 
        row["Full_Name"] || 
        row["fullName"] || 
        row["पूर्ण नाव (Full Name)"] || 
        row["नाव"] || 
        row["Name"] || 
        "",
      footerNote: "अधिकृत कमिटी प्रत • गोपनीयता कारणास्तव मोबाईल नंबर वगळण्यात आला आहे",
      stats: [
        { label: "एकूण अर्ज", value: stats.total },
        { label: "व्हेज", value: stats.vegCount },
        { label: "नॉनव्हेज", value: stats.nonVegCount },
        { label: "Paid", value: stats.paidCount },
        { label: "Pending", value: `${stats.pendingCount} (₹${stats.pendingAmount})` },
        { label: "एकूण जमा", value: `₹${stats.paidAmount}` }
      ],
      columns: [
        { 
          header: "Reg ID", 
          key: "Reg_ID", 
          width: "90px",
          render: (row) => `<b style="font-family: monospace; color: #ea580c;">${row["Reg_ID"] || row["regId"] || "-"}</b>`
        },
        { 
          header: "सहभागी सदस्याचे नाव", 
          key: "Full_Name",
          render: (row) => {
            const name = 
              row["Full_Name"] || 
              row["fullName"] || 
              row["पूर्ण नाव (Full Name)"] || 
              row["नाव"] || 
              row["Name"] || 
              "-";
            return `<b style="font-size: 11.5px;">${name}</b>`;
          }
        },
        { 
          header: "जेवण", 
          align: "center", 
          width: "65px",
          render: (row) => {
            const food = getFoodType(row);
            if (!food) return "-";
            const isVeg = food === "Veg";
            return `<span style="font-size: 9px; font-weight: bold; padding: 2px 6px; border-radius: 4px; ${isVeg ? 'background:#dcfce7; color:#15803d;' : 'background:#ffe4e6; color:#be123c;'}">${food}</span>`;
          }
        },
        { 
          header: "पेमेंट", 
          align: "center", 
          width: "75px",
          render: (row) => {
            const status = String(row["Payment_Status"] || "Pending").toLowerCase();
            const isPaid = status === "paid" || status === "यशस्वी" || status === "free";
            const mode = row["Payment_Mode"] ? ` (${row["Payment_Mode"]})` : "";
            return `<span style="font-weight: bold; color: ${isPaid ? '#15803d' : '#b45309'};">${isPaid ? 'Paid' + mode : 'Pending'}</span>`;
          }
        },
        { 
          header: "जेवण कूपन", 
          align: "center", 
          width: "65px",
          render: (row) => {
            const served = String(row["Food_Status"] || "").toLowerCase() === "served";
            return served ? "<b style='color:#15803d; font-size: 9px;'>मिळाले</b>" : `<div style="width:14px; height:14px; border:1.5px solid #94a3b8; border-radius:3px; margin:0 auto;"></div>`;
          }
        },
        { 
          header: "प्रवेश सही", 
          align: "center", 
          width: "55px",
          render: () => `<div style="width:14px; height:14px; border:1.5px solid #94a3b8; border-radius:3px; margin:0 auto;"></div>`
        }
      ],
      data: list
    });
  };

  return (
    <div className="w-full space-y-4 font-sans pb-10">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-orange-50 text-orange-600 border border-orange-100">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              नोंदणी व्यवस्थापन (Admin View)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              कॉल, व्हॉट्सॲप मेसेज आणि पेमेंट पडताळणी (UPI / Cash)
            </p>
          </div>
        </div>

        {/* Buttons Group */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handlePrintList}
            disabled={loading || list.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50"
            title="A to Z सॉर्ट केलेली PDF प्रिंट करा"
          >
            <Printer className="w-3.5 h-3.5 text-orange-400" />
            <span>Print PDF (A-Z)</span>
          </button>

          <button
            onClick={() => fetchSheetData(false)}
            disabled={loading || refreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-orange-600" : ""}`} />
            <span className="hidden sm:inline">डेटा रिफ्रेश</span>
          </button>
        </div>
      </div>

      {/* Event Selection Tabs */}
      {events.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {events.map((ev) => {
            const isSelected = selectedEvent?.id === ev.id;
            return (
              <button
                key={ev.id}
                onClick={() => setSelectedEvent(ev)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer border ${
                  isSelected
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {ev.title}
              </button>
            );
          })}
        </div>
      )}

      {/* Dynamic Summary Stats Cards (मोबाईलसाठी कॉम्पॅक्ट आणि रिस्पॉन्सिव्ह) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        
        {/* Card 1: एकूण अर्ज */}
        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">एकूण अर्ज</span>
            <Users className="w-4 h-4 text-orange-500" />
          </div>
          <div className="mt-1 sm:mt-2">
            <div className="text-xl sm:text-3xl font-black text-slate-900 leading-none">
              {stats.total}
            </div>
            <div className="text-[10px] sm:text-xs font-semibold text-slate-400 mt-1">नोंदणीकृत</div>
          </div>
        </div>

        {/* Card 2: जेवण पर्याय (फक्त जेवण फील्ड असल्यास दिसेल) */}
        {stats.hasFoodField && (
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">जेवण पर्याय</span>
              <Salad className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-1 sm:mt-2 flex items-baseline gap-2 sm:gap-4">
              <div>
                <span className="text-sm sm:text-2xl font-black text-emerald-600 leading-none">{stats.vegCount}</span>
                <span className="text-[9px] sm:text-xs font-bold text-slate-500 ml-1">व्हेज</span>
              </div>
              <div className="border-l border-slate-200 pl-2 sm:pl-4">
                <span className="text-sm sm:text-2xl font-black text-rose-600 leading-none">{stats.nonVegCount}</span>
                <span className="text-[9px] sm:text-xs font-bold text-slate-500 ml-1">नॉनव्हेज</span>
              </div>
            </div>
          </div>
        )}

        {/* Card 3: टी-शर्ट वितरण (फक्त टी-शर्ट/साईज फील्ड असल्यास दिसेल) */}
        {stats.tshirtArray.length > 0 && (
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">टी-शर्ट साईज</span>
              <Shirt className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-1 sm:mt-2 flex items-center gap-1.5 flex-wrap">
              {stats.tshirtArray.map((t, i) => (
                <div key={i} className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-lg text-[10px] sm:text-xs font-bold text-blue-800">
                  {t.size}: <span className="font-black text-blue-900">{t.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Card Last: जमा / बाकी */}
        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">जमा / बाकी</span>
            <IndianRupee className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-1 sm:mt-2 flex items-baseline justify-between">
            <div>
              <div className="text-sm sm:text-xl font-black text-emerald-700 leading-none">
                ₹{stats.paidAmount} <span className="text-[9px] font-bold text-emerald-600">({stats.paidCount})</span>
              </div>
              <div className="text-[9px] text-slate-400 font-semibold mt-0.5">
                UPI: {stats.upiCount} • Cash: {stats.cashCount}
              </div>
            </div>
            <div className="text-xs sm:text-base font-black text-amber-700 text-right">
              ₹{stats.pendingAmount} <span className="text-[9px] font-bold text-amber-600">({stats.pendingCount})</span>
            </div>
          </div>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="flex-1 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400 ml-1 shrink-0" />
          <input
            type="text"
            placeholder="नाव, मोबाईल किंवा Reg ID शोधा..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs sm:text-sm font-medium focus:outline-none text-slate-800 placeholder-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="px-2 text-xs font-bold text-slate-400 hover:text-slate-600 shrink-0"
            >
              साफ करा
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm self-start sm:self-auto">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              statusFilter === "all" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            सर्व ({list.length})
          </button>
          <button
            onClick={() => setStatusFilter("paid")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              statusFilter === "paid" ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Paid ({stats.paidCount})
          </button>
          <button
            onClick={() => setStatusFilter("pending")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              statusFilter === "pending" ? "bg-amber-600 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Pending ({stats.pendingCount})
          </button>
        </div>
      </div>

      {/* Registrations List */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs sm:text-sm bg-white rounded-2xl border border-slate-200">
            <div className="w-6 h-6 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            नोंदणी डेटा लोड होत आहे...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-14 text-center text-slate-400 text-xs sm:text-sm px-4 bg-white rounded-2xl border border-slate-200">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            कोणतीही नोंदणी सापडली नाही.
          </div>
        ) : (
          filteredList.map((row, index) => {
            const regId = row["Reg_ID"] || row["regId"] || "-";
            const fullName = row["Full_Name"] || row["fullName"] || row["पूर्ण नाव (Full Name)"] || "सहभागी सदस्य";
            const mobile = row["Mobile"] || row["mobile"] || row["व्हॉट्सॲप नंबर (WhatsApp No)"] || "";
            const status = String(row["Payment_Status"] || row["paymentStatus"] || "").toLowerCase();
            const isPaid = status === "paid" || status === "यशस्वी" || status === "free";
            const paymentMode = row["Payment_Mode"] || row["paymentMode"] || "";
            const dynamicBadges = getDynamicBadges(row);
            const waLink = getWhatsAppLink(row);
            const isUpdating = updatingId === regId;

            return (
              <div
                key={index}
                className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:border-orange-200 transition space-y-2.5"
              >
                {/* 1st Row: Name & Reg ID */}
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs sm:text-base font-black text-slate-900 truncate">
                    {fullName}
                  </h3>
                  <span className="font-mono text-[9px] sm:text-xs font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 shrink-0">
                    {regId}
                  </span>
                </div>

                {/* 2nd Row: Sr No, User Form Inputs (Column G, T-Shirt, Batsman/Bowler etc.) & Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 border-t border-slate-100">
                  
                  {/* Left Side: Index & User Form Input Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>

                    {/* युझरने फॉर्ममध्ये भरलेले सर्व डेटा बॅजेस (Column G सह सर्व कस्टम फील्ड्स) */}
                    {dynamicBadges.map((b, bIdx) => {
                      const IconTag = b.Icon;
                      return (
                        <span key={bIdx} className={`inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${b.color}`}>
                          {IconTag && <IconTag className="w-2.5 h-2.5" />}
                          <span>{b.label}</span>
                        </span>
                      );
                    })}
                  </div>

                  {/* Right Side: Action Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0">
                    
                    {/* Superadmin Edit Button */}
                    {isSuperAdmin && (
                      <button
                        onClick={() => handleOpenEditModal(row, index)}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 flex items-center justify-center transition cursor-pointer active:scale-95"
                        title="माहिती संपादित करा"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Food Served Toggle Button */}
                    {stats.hasFoodField && (
                      <button
                        disabled={updatingFoodId === regId}
                        onClick={() => handleToggleFood(regId, row["Food_Status"], index)}
                        className={`h-7 sm:h-8 px-2 rounded-lg text-[9px] sm:text-[11px] font-bold transition flex items-center gap-1 border cursor-pointer ${
                          String(row["Food_Status"] || "").toLowerCase() === "served"
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                        title="जेवण दिले का ते मार्क करा"
                      >
                        {updatingFoodId === regId ? (
                          <RefreshCw className="w-2.5 h-2.5 sm:w-3 sm:h-3 animate-spin" />
                        ) : String(row["Food_Status"] || "").toLowerCase() === "served" ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-white" />
                            <span>जेवण झाले</span>
                          </>
                        ) : (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span>जेवण बाकी</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Call Button */}
                    {mobile && (
                      <a
                        href={`tel:${mobile}`}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer"
                        title="कॉल करा"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}

                    {/* WhatsApp Button */}
                    {mobile && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center transition cursor-pointer"
                        title="व्हॉट्सॲपवर मेसेज पाठवा"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </a>
                    )}

                    {/* Payment Button */}
                    <button
                      disabled={isUpdating || !perms.canEditPayment}
                      onClick={() => handlePaymentClick(row, index)}
                      className={`h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg text-[10px] sm:text-xs font-bold transition flex items-center gap-1 border ${
                        !perms.canEditPayment
                          ? "opacity-50 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200"
                          : isPaid
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                          : "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100 cursor-pointer"
                      }`}
                      title="पेमेंट स्थिती बदला"
                    >
                      {isUpdating ? (
                        <RefreshCw className="w-3 h-3 animate-spin text-slate-600" />
                      ) : isPaid ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Paid</span>
                          {paymentMode && (
                            <span className="text-[9px] font-extrabold uppercase px-1 py-0.2 bg-emerald-200/60 rounded text-emerald-800">
                              {paymentMode}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Pending</span>
                        </>
                      )}
                    </button>
                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Payment Mode Selector Modal */}
      {paymentModalData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  पेमेंट पद्धत व रक्कम पडताळणी
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  {paymentModalData.fullName} • <span className="font-mono text-orange-600 font-bold">{paymentModalData.regId}</span>
                </p>
              </div>
              <button 
                onClick={() => setPaymentModalData(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                जमा झालेली एकूण रक्कम (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base font-black text-slate-400">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  value={paymentModalData.amount}
                  onChange={(e) => setPaymentModalData({ ...paymentModalData, amount: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-8 pr-3 py-2 text-xl font-black text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 font-mono"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => executePaymentUpdate(paymentModalData.regId, "Paid", "UPI", paymentModalData.index, paymentModalData.amount)}
                className="p-3.5 rounded-2xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 hover:border-blue-600 transition flex flex-col items-center justify-center gap-1.5 group cursor-pointer active:scale-95 shadow-xs"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-100 group-hover:bg-blue-500 flex items-center justify-center transition">
                  <CreditCard className="w-5 h-5 text-blue-600 group-hover:text-white" />
                </div>
                <span className="text-xs font-black tracking-tight">UPI / Online</span>
                <span className="text-[10px] font-black text-blue-800 group-hover:text-blue-100 font-mono">
                  ₹{Number(paymentModalData.amount) || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => executePaymentUpdate(paymentModalData.regId, "Paid", "Cash", paymentModalData.index, paymentModalData.amount)}
                className="p-3.5 rounded-2xl bg-amber-50 hover:bg-amber-600 text-amber-700 hover:text-white border border-amber-200 hover:border-amber-600 transition flex flex-col items-center justify-center gap-1.5 group cursor-pointer active:scale-95 shadow-xs"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-100 group-hover:bg-amber-500 flex items-center justify-center transition">
                  <Banknote className="w-5 h-5 text-amber-600 group-hover:text-white" />
                </div>
                <span className="text-xs font-black tracking-tight">Cash (रोख)</span>
                <span className="text-[10px] font-black text-amber-800 group-hover:text-amber-100 font-mono">
                  ₹{Number(paymentModalData.amount) || 0}
                </span>
              </button>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setPaymentModalData(null)}
                className="w-full py-2.5 rounded-xl bg-slate-100 font-bold text-slate-600 hover:bg-slate-200 text-xs transition cursor-pointer"
              >
                रद्द करा
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Superadmin Fully Dynamic Edit Registration Modal */}
      {editModalData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] flex flex-col">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <Pencil className="w-4 h-4 text-orange-600" />
                  सर्व माहिती संपादित करा (Dynamic Edit)
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Reg ID: <span className="font-mono text-orange-600 font-bold">{editModalData.regId}</span>
                </p>
              </div>
              <button 
                onClick={() => setEditModalData(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dynamic Fields Form Scrollable Area */}
            <form onSubmit={handleSaveEditMember} className="space-y-3 overflow-y-auto pr-1 flex-1 text-xs">
              
              {Object.keys(editModalData.fields).map((key) => {
                const isReadOnly = ["Reg_ID", "Timestamp"].includes(key);

                return (
                  <div key={key} className="space-y-1">
                    <label className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">
                      {key} {isReadOnly && <span className="text-slate-400 font-normal">(Read-only)</span>}
                    </label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={editModalData.fields[key] !== undefined ? editModalData.fields[key] : ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditModalData(prev => ({
                          ...prev,
                          fields: {
                            ...prev.fields,
                            [key]: val
                          }
                        }));
                      }}
                      className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-slate-900 outline-none focus:bg-white focus:border-orange-500 ${isReadOnly ? 'opacity-60 cursor-not-allowed bg-slate-100' : ''}`}
                    />
                  </div>
                );
              })}

              {/* Action Buttons inside Form */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 sticky bottom-0 bg-white py-2">
                <button
                  type="button"
                  onClick={() => setEditModalData(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-slate-600 hover:bg-slate-200 cursor-pointer"
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black cursor-pointer shadow-xs active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingEdit ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>अपडेट होत आहे...</span>
                    </>
                  ) : (
                    <span>बदल जतन करा</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}