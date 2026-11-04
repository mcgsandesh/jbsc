// src/modules/admin/Dashboard.jsx
import React from "react";
import { Link } from "react-router-dom";
import { 
  CalendarCheck, 
  Users, 
  IndianRupee, 
  Clock, 
  PlusCircle, 
  ArrowUpRight,
  Sparkles,
  FileSpreadsheet
} from "lucide-react";
import { APP_CONFIG } from "../../config/constants";

export default function Dashboard() {
  const storedUser = JSON.parse(sessionStorage.getItem("jbsc_admin_user") || "{}");

  const statCards = [
    { 
      title: "सक्रिय इव्हेंट", 
      value: "१", 
      sub: "दीपोत्सव २०२६", 
      icon: CalendarCheck, 
      color: "text-blue-600 bg-blue-50 border-blue-100" 
    },
    { 
      title: "एकूण नोंदणी", 
      value: "०", 
      sub: "सभासद अर्ज", 
      icon: Users, 
      color: "text-purple-600 bg-purple-50 border-purple-100" 
    },
    { 
      title: "जमा रक्कम", 
      value: "₹ ०", 
      sub: "Paid पेमेंट्स", 
      icon: IndianRupee, 
      color: "text-emerald-600 bg-emerald-50 border-emerald-100" 
    },
    { 
      title: "पेंडिंग पेमेंट्स", 
      value: "०", 
      sub: "तपासणी बाकी", 
      icon: Clock, 
      color: "text-amber-600 bg-amber-50 border-amber-100" 
    },
  ];

  return (
    <div className="w-full space-y-6">
      
      {/* Top Welcome Banner (Full Fluid Width) */}
      <div className="w-full bg-gradient-to-r from-orange-600 to-amber-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-orange-600/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" /> JBSC मॅनेजमेंट पॅनेल
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            स्वागत आहे, {storedUser?.name || "ऍडमिन"}!
          </h1>
          <p className="text-orange-100 text-sm mt-1 max-w-xl">
            {APP_CONFIG.FULL_CLUB_NAME} - सर्व उत्सव, स्पर्धा नोंदणी आणि जमा-खर्च एकाच डॅशबोर्डवर.
          </p>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end justify-between border-t border-white/20 sm:border-0 pt-3 sm:pt-0">
          <span className="text-xs uppercase tracking-wider text-orange-200 font-semibold">नियोजित वर्ष</span>
          <span className="text-3xl font-black text-white">२०२६</span>
        </div>
      </div>

      {/* Stats Cards: Mobile var 2 cards per line, Tablet var 2, Desktop var 4 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div 
              key={idx} 
              className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-semibold text-slate-500">{card.title}</span>
                <div className={`p-2 rounded-xl border ${card.color}`}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {card.value}
                </div>
                <span className="text-[11px] sm:text-xs text-slate-400 mt-1 block truncate">
                  {card.sub}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Action Grid (Desktop var poorn width cover karel) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Active Event Widget */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-base">सध्याचा चालू इव्हेंट</h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                नोंदणी चालू
              </span>
            </div>
            <h4 className="text-lg font-extrabold text-orange-600">दीपोत्सव २०२६</h4>
            <p className="text-xs text-slate-500 mt-1">
              सार्वजनिक नोंदणी फॉर्म सुरू आहे. सभासद अर्ज आणि देणग्यांची नोंद सुरू झाली आहे.
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <Link
              to="/admin/registrations"
              className="text-xs font-bold text-orange-600 hover:text-orange-700 inline-flex items-center gap-1"
            >
              नोंदणी यादी तपासा <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              to="/register"
              target="_blank"
              className="text-xs font-medium text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"
            >
              फॉर्म उघडा ↗
            </Link>
          </div>
        </div>

        {/* Quick Links Box */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base mb-3">जलद कृती (Quick Actions)</h3>
            <div className="space-y-2.5">
              <Link
                to="/admin/finance"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-orange-50 hover:text-orange-600 transition text-xs font-semibold text-slate-700"
              >
                <span className="flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-emerald-600" />
                  नवीन खर्च किंवा जमा जोडा
                </span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>

              <Link
                to="/admin/events"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-orange-50 hover:text-orange-600 transition text-xs font-semibold text-slate-700"
              >
                <span className="flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-blue-600" />
                  नवीन इव्हेंट व फॉर्म तयार करा
                </span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            JBSC सिस्टीम ऑटो-सिंक: Google Sheet सक्रिय आहे
          </div>
        </div>

        {/* System Information & Sync Box */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base mb-3">Google Sheet सिंक स्थिती</h3>
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-start gap-3">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-emerald-900">JBSC Events Master Sheet</div>
                <div className="text-[11px] text-emerald-700 mt-0.5">
                  सर्व डेटा वर्षनिहाय गुगल शीटमध्ये आपोआप जतन केला जात आहे.
                </div>
              </div>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Firestore कॅश: सक्रिय</span>
            <span className="text-[11px] font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-600">Zero Extra Reads</span>
          </div>
        </div>

      </div>

    </div>
  );
}