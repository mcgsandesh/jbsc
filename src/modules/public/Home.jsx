// src/modules/public/Home.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Trophy, 
  Sparkles, 
  Flame, 
  HeartHandshake, 
  ArrowRight, 
  CheckCircle2,
  Users,
  QrCode,
  CreditCard,
  Copy,
  ExternalLink,
  X
} from "lucide-react";
import { getAllEvents } from "../../services/eventService";
import { showSuccess } from "../../utils/alert";
import Boxt20Splash from "../../components/common/Boxt20Splash";
import LiveDrawBanner from "../../components/common/LiveDrawBanner";

export default function Home() {
  const base = import.meta.env.BASE_URL;

  const [liveEvent, setLiveEvent] = useState(null);
  const [isUpiModalOpen, setIsUpiModalOpen] = useState(false);

  // 1. Fetch Live Event (Strictly isActive === true only)
  useEffect(() => {
    const fetchLiveEvent = async () => {
      try {
        const events = await getAllEvents();
        if (events && events.length > 0) {
          // Fakt aani fakt isActive: true asel tarach ghyaycha, kontehi fallback 'events[0]' nako
          const active = events.find(e => e.isActive === true);
          setLiveEvent(active || null);
        } else {
          setLiveEvent(null);
        }
      } catch (err) {
        console.error("Live event load error:", err);
        setLiveEvent(null);
      }
    };
    fetchLiveEvent();
  }, []);

  // Firestore exact path: upiSettings.upiId aani upiSettings.payeeName
  const upiId = 
    liveEvent?.upiSettings?.upiId || 
    liveEvent?.upiId || 
    "";

  const payeeName = 
    liveEvent?.upiSettings?.payeeName || 
    liveEvent?.upiPayeeName || 
    liveEvent?.title || 
    "JBSC Events";

  const amount = Number(liveEvent?.baseAmount) || 200;

  // Realtime UPI Link
  const upiDeepLink = upiId 
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent((liveEvent?.title || "Event") + " Fee")}`
    : "";

  // Dynamic Realtime QR Code
  const qrCodeUrl = upiDeepLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=8&data=${encodeURIComponent(upiDeepLink)}`
    : "";

  const copyUpiId = () => {
    if (!upiId) return;
    navigator.clipboard.writeText(upiId);
    showSuccess("कॉपी झाले!", "UPI ID क्लिपबोर्डवर कॉपी झाला आहे.");
  };

  const cricketTeams = [
    {
      name: "लोहगड लायन्स",
      subtitle: "Lohagad Lions",
      img: `${base}teams/lohagad-lions.jpg`,
      tag: "शौर्य आणि ताकद",
      border: "border-amber-400/40"
    },
    {
      name: "तोरणा टायटन्स",
      subtitle: "Torna Titans",
      img: `${base}teams/torna-titans.jpg`,
      tag: "पहिला विजय",
      border: "border-red-400/40"
    },
    {
      name: "शिवनेरी शिलेदार",
      subtitle: "Shivneri Shiledar",
      img: `${base}teams/shivneri-shiledar.jpg`,
      tag: "जन्मभूमीचा स्वाभिमान",
      border: "border-orange-400/40"
    },
    {
      name: "कोंढाणा पलटण",
      subtitle: "Kondhana Paltan",
      img: `${base}teams/kondhana-paltan.jpg`,
      tag: "अजिंक्य योद्धा",
      border: "border-yellow-400/40"
    },
    {
      name: "रायगड रॉयल्स",
      subtitle: "Raygad Royals",
      img: `${base}teams/raygad-royals.jpg`,
      tag: "राजधानीचा रुबाब",
      border: "border-rose-400/40"
    },
    {
      name: "प्रतापगड फायटर्स",
      subtitle: "Pratapgad Fighters",
      img: `${base}teams/pratapgad-fighters.jpg`,
      tag: "रणधुरंधर लढाऊ",
      border: "border-amber-500/40"
    }
  ];

  const otherEvents = [
    {
      id: "shivjayanti",
      title: "शिवजयंती जन्मोत्सव सोहळा",
      tagline: "संस्कृती, प्रेरणा आणि स्वाभिमान",
      desc: "छत्रपती शिवाजी महाराजांच्या विचारांचा जागर, प्रेरणादायी व्याख्याने आणि सांस्कृतिक कार्यक्रम.",
      badge: "सांस्कृतिक उत्सव",
      icon: Flame,
      badgeColor: "bg-orange-50 text-orange-700 border-orange-200"
    },
    {
      id: "holi",
      title: "रंगोत्सव आणि धुलिवंदन",
      tagline: "सलोखा, बंधुभाव आणि प्रेम",
      desc: "पर्यावरणपूरक रंगांची उधळण आणि समाजातील सर्व थरांतील नागरिकांना एकत्र आणणारा उत्सव.",
      badge: "आनंदोत्सव",
      icon: Sparkles,
      badgeColor: "bg-pink-50 text-pink-700 border-pink-200"
    },
    {
      id: "dipostav",
      title: liveEvent?.title || "दीपोत्सव २०२६",
      tagline: "एकत्रित प्रकाश, एकत्रित आनंद",
      desc: "हजारो दिव्यांची रोषणाई, विविध स्पर्धा, महिलांसाठी विशेष खेळ व स्नेहभोजन सोहळा.",
      badge: liveEvent?.isActive !== false ? "नोंदणी सुरू आहे" : "नोंदणी बंद",
      icon: HeartHandshake,
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse",
      featured: true,
      actionLink: liveEvent?.slug ? `/${liveEvent.slug}` : "/register"
    }
  ];

  return (
    <> <Boxt20Splash />

    <div className="w-full font-sans pb-16 selection:bg-orange-500 selection:text-white">
      
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden pt-6 pb-12 sm:pt-10 sm:pb-16 bg-gradient-to-b from-orange-50/70 via-white to-slate-50 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 sm:gap-12">
            
            <div className="text-center lg:text-left flex-1">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100/70 border border-orange-200 text-orange-800 text-xs sm:text-sm font-black mb-4">
                <span>🚩</span>
                <span>|| श्री जागेवाला बाबा प्रसन्न ||</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                जागेवाला बाबा <br className="hidden sm:inline" />
                <span className="text-orange-600">स्पोर्ट्स क्लब</span>
              </h1>
              
              <p className="mt-4 text-sm sm:text-base text-slate-600 font-medium leading-relaxed max-w-xl mx-auto lg:mx-0">
                आम्ही एकत्र येतो खेळण्यासाठी, सण साजरे करण्यासाठी आणि प्रत्येकाच्या जीवनात आपुलकी व निखळ आनंद निर्माण करण्यासाठी.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-3">
                <Link
                  to={liveEvent?.slug ? `/${liveEvent.slug}` : "/register"}
                  className="px-6 py-3 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-orange-600/30 transition transform active:scale-95 flex items-center gap-2"
                >
                  <span>{liveEvent?.title || "दीपोत्सव २०२६"} सहभाग नोंदवा</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                
                {/* Navbar pramane direct /public-list pathva jyane list 100% load hote */}
                <Link
                  to="/public-list"
                  className="px-5 py-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs sm:text-sm shadow-xs transition"
                >
                  सहभागी यादी पहा
                </Link>
              </div>
            </div>

            <div className="w-full max-w-xs sm:max-w-sm shrink-0">
              <div className="relative group">
                <div className="absolute -inset-1.5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl blur-md opacity-40 group-hover:opacity-60 transition duration-300"></div>
                <div className="relative bg-slate-900 rounded-3xl overflow-hidden border-2 border-orange-300 shadow-2xl">
                  <img 
                    src={`${base}jagewala-baba.jpg`} 
                    alt="श्री जागेवाला बाबा" 
                    className="w-full h-80 sm:h-96 object-cover object-center transform transition duration-500 group-hover:scale-105"
                    onError={(e) => {
                      if (!e.target.dataset.triedPng) {
                        e.target.dataset.triedPng = "true";
                        e.target.src = `${base}jagewala-baba.png`;
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4 text-center">
                    <span className="text-amber-300 font-black text-base sm:text-lg tracking-wide drop-shadow-md">
                      श्री जागेवाला बाबा
                    </span>
                    <span className="text-white/80 text-[11px] font-semibold mt-0.5">
                      आमचे श्रद्धास्थान आणि प्रेरणा
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>
<LiveDrawBanner/>
      {/* 2. Quick Dynamic UPI Payment Widget (Fakt Event Active Aslyas Disel) */}
      {liveEvent && liveEvent.isActive && upiId && (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 -mt-6 sm:-mt-8 relative z-20">
          <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white p-4 sm:p-5 rounded-3xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-orange-400/40">
            <div className="flex items-center gap-3.5 text-center sm:text-left">
              <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20">
                <QrCode className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-white/25 px-2 py-0.5 rounded-full">
                    थेट फी भरा
                  </span>
                  <span className="text-sm sm:text-base font-black">{liveEvent.title}</span>
                </div>
                <p className="text-xs text-orange-100 font-medium mt-0.5">
                  फॉर्म भरला आहे पण फी बाकी राहिली असल्यास थेट UPI किंवा QR कोडने भरा.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsUpiModalOpen(true)}
              className="w-full sm:w-auto px-5 py-2.5 bg-white text-orange-600 hover:bg-orange-50 font-black text-xs sm:text-sm rounded-xl shadow-md transition transform active:scale-95 shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>QR कोड व UPI पेमेंट</span>
            </button>
          </div>
        </section>
      )}

      {/* 3. Sankalp Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-6">
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="max-w-xl text-center md:text-left">
              <span className="text-xs font-black uppercase tracking-wider text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
                आमचा संकल्प
              </span>
              <h2 className="text-xl sm:text-2xl font-black mt-3 leading-snug">
                लोकांना एकत्र आणणे आणि प्रत्येकाच्या चेहऱ्यावर आनंद निर्माण करणे!
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 font-normal leading-relaxed">
                धावपळीच्या आयुष्यात आपुलकी टिकून राहावी म्हणून आम्ही क्रिकेट स्पर्धा, सांस्कृतिक उत्सव आणि स्नेहभोजन अशा विविध उपक्रमांतून संपूर्ण वस्ती आणि समाजाला एका कुटुंबाप्रमाणे एकत्र बांधतो.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full md:w-auto shrink-0">
              <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 text-center">
                <Users className="w-6 h-6 text-orange-400 mx-auto mb-1" />
                <div className="text-lg font-black text-white">१००%</div>
                <div className="text-[10px] text-slate-400 font-semibold">सामाजिक एकता</div>
              </div>
              <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 text-center">
                <HeartHandshake className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                <div className="text-lg font-black text-white">सलोखा</div>
                <div className="text-[10px] text-slate-400 font-semibold">निखळ आनंद</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Events & Cricket Leagues */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-4 space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
            जागेवाला बाबा स्पोर्ट्स क्लबचे मुख्य उत्सव व स्पर्धा
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            एकत्र येऊन आनंद वाटण्याचे आमचे माध्यम
          </p>
        </div>

        <div className="bg-white rounded-3xl p-5 sm:p-8 border border-orange-200/90 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-amber-50 text-amber-700 border border-amber-200 mb-2">
                <Trophy className="w-3.5 h-3.5 text-amber-600" />
                <span>KVCUP/BOXT20</span>
              </div>
              <h3 className="text-lg sm:text-2xl font-black text-slate-900 leading-snug">
                JBSC बॉक्स क्रिकेट लीग
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                छत्रपती शिवाजी महाराजांच्या ऐतिहासिक किल्ल्यांच्या नावाने गर्जणारे आमचे ६ अधिकृत संघ:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {cricketTeams.map((team, idx) => (
              <div 
                key={idx}
                className={`bg-slate-950 text-white rounded-2xl p-2.5 sm:p-3 border ${team.border} shadow-sm flex flex-col items-center text-center transition transform hover:-translate-y-1`}
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-black flex items-center justify-center p-1 border border-slate-800">
                  <img 
                    src={team.img} 
                    alt={team.name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="hidden w-full h-full items-center justify-center font-black text-[10px] text-orange-400">
                    {team.name}
                  </div>
                </div>

                <h4 className="mt-2 text-xs sm:text-sm font-black text-white tracking-tight">
                  {team.name}
                </h4>
                <div className="text-[9px] sm:text-[10px] text-orange-400 font-bold font-sans">
                  {team.subtitle}
                </div>
                <span className="mt-1.5 text-[8px] sm:text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded-full border border-slate-700">
                  {team.tag}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {otherEvents.map((ev) => {
            const Icon = ev.icon;
            return (
              <div
                key={ev.id}
                className={`bg-white rounded-3xl p-5 sm:p-6 border transition flex flex-col justify-between ${
                  ev.featured 
                    ? "border-orange-300 shadow-md ring-2 ring-orange-500/10" 
                    : "border-slate-200/90 shadow-xs hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-xl border ${ev.badgeColor}`}>
                      {ev.badge}
                    </span>
                    <div className="p-2 rounded-xl bg-slate-50 text-slate-700 border border-slate-100">
                      <Icon className="w-4 h-4 text-orange-600" />
                    </div>
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                    {ev.title}
                  </h3>
                  <div className="text-xs font-bold text-orange-600 mt-0.5">
                    {ev.tagline}
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">
                    {ev.desc}
                  </p>
                </div>

                {ev.featured && (
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      नोंदणी चालू आहे
                    </span>
                    <Link
                      to={ev.actionLink}
                      className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                    >
                      आता नोंदणी करा
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. UPI Modal (Realtime Live QR Code) */}
      {isUpiModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  फी भरा (UPI Payment)
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  {liveEvent?.title || "दीपोत्सव २०२६"}
                </p>
              </div>
              <button 
                onClick={() => setIsUpiModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center space-y-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                कोणत्याही UPI ॲपने स्कॅन करा
              </span>

              {/* Realtime QR Code */}
              {qrCodeUrl ? (
                <img 
                  src={qrCodeUrl} 
                  alt="UPI QR Code" 
                  className="w-48 h-48 mx-auto object-contain rounded-2xl border border-slate-200 bg-white p-2 shadow-xs"
                />
              ) : (
                <div className="w-48 h-48 mx-auto bg-white rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center p-3 text-center">
                  <QrCode className="w-10 h-10 text-slate-400 mb-1" />
                  <span className="text-[11px] font-bold text-slate-600">QR Code तयार होत आहे...</span>
                </div>
              )}

              <div className="text-2xl font-black text-slate-900">
                ₹{amount}
              </div>

              {/* Firestore data: upiSettings.upiId */}
              {upiId && (
                <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                  <span className="font-mono text-slate-700 font-bold truncate">
                    {upiId}
                  </span>
                  <button
                    onClick={copyUpiId}
                    className="p-1 text-slate-400 hover:text-orange-600 transition cursor-pointer"
                    title="UPI ID कॉपी करा"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {upiDeepLink && (
              <a
                href={upiDeepLink}
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

      {/* 6. Footer */}
      <footer className="mt-12 text-center text-slate-400 text-xs border-t border-slate-200 pt-6">
        <p className="font-bold text-slate-600">
          © १९९६ जागेवाला बाबा स्पोर्ट्स क्लब (JBSC) • सर्व हक्क राखीव.
        </p>
        <p className="text-[11px] text-slate-400 mt-1">
          JBSC Event App | Developed by Sandesh Mahadik
        </p>
      </footer>

    </div>
    </>
  );

}