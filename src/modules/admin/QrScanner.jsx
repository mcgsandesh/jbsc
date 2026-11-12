// src/modules/admin/QrScanner.jsx
import React, { useState, useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { 
  QrCode, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Salad, 
  Drumstick, 
  RefreshCw,
  Utensils
} from "lucide-react";
import { getAllEvents } from "../../services/eventService";
import { showError, showSuccess } from "../../utils/alert";
import { useAuth } from "../../context/AuthContext";

export default function QrScanner() {
  const { currentUser } = useAuth();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Scanned Member State
  const [scannedMember, setScannedMember] = useState(null);
  const [scanError, setScanError] = useState("");
  const [serving, setServing] = useState(false);

  const scannerRef = useRef(null);

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

  // २. इव्हेंटची नोंदणी यादी लोड करणे (फास्ट लोकल मॅचिंगसाठी)
  const fetchList = async () => {
    if (!selectedEvent) return;
    try {
      const scriptUrl = import.meta.env.VITE_GOOGLE_SHEET_API_URL;
      const res = await fetch(`${scriptUrl}?sheet=${encodeURIComponent(selectedEvent.title)}`);
      const result = await res.json();
      if (result?.status === "success") {
        setRegistrations(result.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (selectedEvent) fetchList();
  }, [selectedEvent]);

  // ३. कॅमेरा QR स्कॅनर सुरू करणे
  useEffect(() => {
    if (loading || !selectedEvent) return;

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1.0 },
      false
    );

    scanner.render(
      (decodedText) => {
        const cleanId = String(decodedText).trim().toLowerCase();
        const found = registrations.find(
          (r) => String(r["Reg_ID"] || r["regId"] || "").trim().toLowerCase() === cleanId
        );

        if (found) {
          setScannedMember(found);
          setScanError("");
        } else {
          setScannedMember(null);
          setScanError(`अवैध किंवा न सापडलेला पास ID: ${decodedText}`);
        }
      },
      (err) => {
        // Scanning frame errors ignore करा
      }
    );

    scannerRef.current = scanner;

    return () => {
      scanner.clear().catch((err) => console.warn("Scanner clear error:", err));
    };
  }, [loading, selectedEvent, registrations]);

  // ४. जेवण दिले म्हणून मार्क करणे (Mark Food Served)
  const handleMarkFoodServed = async () => {
    if (!scannedMember) return;
    const regId = scannedMember["Reg_ID"] || scannedMember["regId"];
    setServing(true);

    try {
      const scriptUrl = import.meta.env.VITE_GOOGLE_SHEET_API_URL;
      await fetch(scriptUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateFoodStatus",
          Event_Title: selectedEvent.title,
          regId: regId,
          newFoodStatus: "Served",
          servedBy: currentUser?.name || "QR Gate Volunteer"
        }),
      });

      // लोकल स्टेट अपडेट
      setScannedMember({ ...scannedMember, Food_Status: "Served" });
      setRegistrations((prev) =>
        prev.map((item) =>
          (item["Reg_ID"] || item["regId"]) === regId ? { ...item, Food_Status: "Served" } : item
        )
      );

      showSuccess("जेवण नोंदवले!", `${regId} चे जेवण कूपन यशस्वीरित्या स्कॅन झाले.`);
    } catch (err) {
      showError("त्रुटी", "डेटा सेव्ह करताना अडचण आली.");
    } finally {
      setServing(false);
    }
  };

  // जेवण प्रकार हेल्पर
  const getFoodType = (item) => {
    for (let key in item) {
      const v = String(item[key] || "").toLowerCase();
      if (v.includes("non") || v.includes("नॉन")) return "Non-Veg";
      if (v.includes("veg") || v.includes("व्हेज") || v.includes("शाकाहारी")) return "Veg";
    }
    return "Veg";
  };

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-12 font-sans">
      
      {/* Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900">डिजिटल पास स्कॅनर</h1>
            <p className="text-[11px] text-slate-500">जेवण व प्रवेश पडताळणी (Live Gate Check)</p>
          </div>
        </div>
        <button
          onClick={fetchList}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
          title="यादी रिफ्रेश करा"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Camera Reader Box */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div id="qr-reader" className="w-full rounded-2xl overflow-hidden" />
      </div>

      {/* Error Alert if Invalid QR */}
      {scanError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-3">
          <XCircle className="w-6 h-6 shrink-0 text-rose-600" />
          <div className="text-xs font-bold">{scanError}</div>
        </div>
      )}

      {/* Scanned Member Result Card */}
      {scannedMember && (() => {
        const regId = scannedMember["Reg_ID"] || scannedMember["regId"];
        const name = scannedMember["Full_Name"] || scannedMember["fullName"] || "सदस्य";
        const isPaid = String(scannedMember["Payment_Status"] || "").toLowerCase() === "paid";
        const isAlreadyServed = String(scannedMember["Food_Status"] || "").toLowerCase() === "served";
        const foodType = getFoodType(scannedMember);

        return (
          <div className={`p-5 rounded-3xl border-2 shadow-lg space-y-4 transition ${
            isAlreadyServed
              ? "bg-rose-50/70 border-rose-400"
              : isPaid
              ? "bg-emerald-50/60 border-emerald-500"
              : "bg-amber-50/70 border-amber-400"
          }`}>
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-xs font-black text-orange-600 bg-white px-2 py-0.5 rounded border border-orange-200">
                  {regId}
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-1">{name}</h2>
              </div>
              <span className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1 ${
                foodType === "Veg" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
              }`}>
                {foodType === "Veg" ? <Salad className="w-4 h-4" /> : <Drumstick className="w-4 h-4" />}
                {foodType}
              </span>
            </div>

            {/* Payment & Food Status Alerts */}
            <div className="space-y-2 text-xs font-bold">
              {!isPaid && (
                <div className="p-2.5 rounded-xl bg-amber-100 text-amber-900 flex items-center gap-2 border border-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>सावधान: यांचे पेमेंट अद्याप Pending आहे!</span>
                </div>
              )}

              {isAlreadyServed ? (
                <div className="p-3 rounded-xl bg-rose-600 text-white flex items-center gap-2 shadow-sm">
                  <XCircle className="w-5 h-5 shrink-0" />
                  <span>या पासवर जेवण आधीच दिले गेले आहे! (Duplicate Scan)</span>
                </div>
              ) : (
                <button
                  onClick={handleMarkFoodServed}
                  disabled={serving}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition"
                >
                  <Utensils className="w-4 h-4" />
                  <span>{serving ? "नोंदवत आहे..." : "जेवण द्या (Mark Served)"}</span>
                </button>
              )}
            </div>
          </div>
        );
      })()}

    </div>
  );
}