// src/components/common/DigitalPassModal.jsx
import React from "react";
import { X, CheckCircle2, Clock, Salad, Drumstick, QrCode, ShieldCheck } from "lucide-react";

export default function DigitalPassModal({ member, eventTitle, onClose }) {
  if (!member) return null;

  const regId = member["Reg_ID"] || member["regId"] || "-";
  const fullName = member["Full_Name"] || member["fullName"] || member["पूर्ण नाव (Full Name)"] || "सहभागी सदस्य";
  const status = String(member["Payment_Status"] || "Pending").toLowerCase();
  const isPaid = status === "paid" || status === "यशस्वी" || status === "free";
  const foodStatus = String(member["Food_Status"] || "").toLowerCase() === "served";

  // जेवण प्रकार शोधणे
  let foodType = null;
  for (let key in member) {
    const k = key.toLowerCase();
    const v = String(member[key] || "").toLowerCase();
    if (k.includes("food") || k.includes("जेवण") || v === "veg" || v === "non-veg") {
      if (v.includes("non") || v.includes("नॉन")) foodType = "Non-Veg";
      else if (v.includes("veg") || v.includes("व्हेज") || v.includes("शाकाहारी")) foodType = "Veg";
    }
  }

  // QR Code Image URL (Reg_ID एन्कोड केलेला)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(regId)}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200">
        
        {/* Top Ticket Header */}
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-4 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute right-3 top-3 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-200 block">
            जागेवाला बाबा स्पोर्ट्स क्लब
          </span>
          <h3 className="text-base font-black tracking-tight mt-0.5 line-clamp-1">
            {eventTitle || "दीपोत्सव सोहळा"}
          </h3>
          <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">
            अधिकृत डिजिटल प्रवेश व जेवण पास
          </span>
        </div>

        {/* Ticket Body */}
        <div className="p-5 text-center space-y-4">
          
          {/* Member Name & ID */}
          <div>
            <h4 className="text-lg font-black text-slate-900 leading-tight">{fullName}</h4>
            <div className="inline-block mt-1 px-3 py-0.5 rounded-lg bg-orange-50 border border-orange-200 font-mono text-sm font-black text-orange-600">
              {regId}
            </div>
          </div>

          {/* QR Code Box */}
          <div className="relative mx-auto w-48 h-48 p-2 bg-white rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center shadow-inner">
            <img
              src={qrUrl}
              alt={regId}
              className="w-full h-full object-contain rounded-xl"
            />
          </div>

          {/* Status Badges (Payment & Food) */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className={`p-2 rounded-xl border font-bold flex items-center justify-center gap-1.5 ${
              isPaid
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}>
              {isPaid ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              <span>{isPaid ? "पेमेंट जमा (Paid)" : "पेमेंट बाकी"}</span>
            </div>

            {foodType && (
              <div className={`p-2 rounded-xl border font-bold flex items-center justify-center gap-1.5 ${
                foodType === "Veg"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              }`}>
                {foodType === "Veg" ? <Salad className="w-4 h-4" /> : <Drumstick className="w-4 h-4" />}
                <span>{foodType}</span>
              </div>
            )}
          </div>

          {/* Meal Used Warning if already served */}
          {foodStatus && (
            <div className="p-2 rounded-xl bg-slate-100 text-slate-600 text-[11px] font-bold">
              ✅ या पासवरील जेवण कूपन वापरले गेले आहे.
            </div>
          )}

          {/* Footer Note */}
          <div className="pt-2 border-t border-dashed border-slate-200 text-[10px] text-slate-400 font-medium flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-orange-500" />
            <span>जेवण काउंटरवर हा QR कोड स्कॅन करण्यासाठी दाखवा.</span>
          </div>

        </div>
      </div>
    </div>
  );
}