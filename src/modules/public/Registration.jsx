// src/modules/public/Registration.jsx
import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import {
  Calendar,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  Send,
  ExternalLink,
  Info,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  UserCheck,
  Mail,
  Camera
} from "lucide-react";
import { getAllEvents } from "../../services/eventService";
import {
  isJbscManagedEvent,
  lookupJbscPlayerByMobile,
  upsertJbscMasterPlayer,
  normalizeMobile10
} from "../../services/playerMasterService";
import { uploadToImgbb } from "../../services/imageUploadService";
import { validateField } from "../../utils/validators";
import { showError, showSuccess } from "../../utils/alert";
import { APP_CONFIG } from "../../config/constants";
import Boxt20Splash from "../../components/common/Boxt20Splash";

const normalizeRoleKey = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097f]/g, "");

export default function Registration() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // फॉर्म डेटा आणि एरर्स
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});

  // JBSC Master Profile Pre-fill, Gmail & Photo State
  const [matchedMasterPlayer, setMatchedMasterPlayer] = useState(null);
  const [playerGmail, setPlayerGmail] = useState("");
  const [playerPhotoUrl, setPlayerPhotoUrl] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const lastLookedUpMobileRef = useRef("");

  // नियम व माहिती टॉगल
  const [showRules, setShowRules] = useState(false);

  // सबमिशन यशस्वी झाल्यावर UPI स्क्रीन स्टेट
  const [submittedData, setSubmittedData] = useState(null);

  const isJbscEvent = isJbscManagedEvent(selectedEvent);

  // १. इव्हेंट्स आणि सिलेक्टेड इव्हेंट लोड करणे
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        const all = await getAllEvents();
        const activeEvents = all.filter((ev) => ev.isActive !== false);
        setEvents(activeEvents);

        const eventIdParam = searchParams.get("eventId");
        let current = null;

        if (slug) {
          current = activeEvents.find(
            (e) =>
              (e.slug && e.slug.toLowerCase() === slug.toLowerCase()) ||
              e.id === slug
          );
        }

        if (eventIdParam) {
          current = activeEvents.find((e) => e.id === eventIdParam);
        }
        if (!current && activeEvents.length > 0) {
          current = activeEvents[0];
        }

        setSelectedEvent(current);

        if (current && current.fields) {
          const initial = {};
          current.fields.forEach((f) => {
            initial[f.id] = f.type === "checkbox" ? [] : "";
          });
          setFormData(initial);
        }
      } catch (err) {
        console.error(err);
        showError("त्रुटी", "इव्हेंट माहिती लोड करताना अडचण आली.");
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [slug, searchParams]);

  const handleEventChange = (e) => {
    const ev = events.find((item) => item.id === e.target.value);
    setSelectedEvent(ev);
    setFormErrors({});
    setMatchedMasterPlayer(null);
    setPlayerGmail("");
    setPlayerPhotoUrl("");
    lastLookedUpMobileRef.current = "";
    if (ev && ev.fields) {
      const initial = {};
      ev.fields.forEach((f) => {
        initial[f.id] = f.type === "checkbox" ? [] : "";
      });
      setFormData(initial);
    }
  };

  const formatEventDateTime = () => {
    if (!selectedEvent) return "";
    if (selectedEvent.eventDateTimeText) return selectedEvent.eventDateTimeText;

    const start = selectedEvent.startDate || selectedEvent.date;
    const end = selectedEvent.endDate;
    const time = selectedEvent.time || selectedEvent.eventTime || "";

    if (start && end && start !== end) {
      return `${start} ते ${end} ${time ? "• " + time : ""}`;
    }
    return `${start || "तारीख लवकरच"} ${time ? "• " + time : ""}`;
  };

  // मोबाईल १० अंकी होताच JBSC Master Profile मधून ऑटो प्री-फिल करणे
  const tryPrefillFromJbscMaster = async (rawMobileValue, currentFormSnapshot) => {
    if (!isJbscEvent || !selectedEvent?.fields) return;
    const mob10 = normalizeMobile10(rawMobileValue);
    if (mob10.length !== 10 || lastLookedUpMobileRef.current === mob10) return;

    lastLookedUpMobileRef.current = mob10;
    try {
      const profile = await lookupJbscPlayerByMobile(mob10);
      if (!profile) {
        setMatchedMasterPlayer(null);
        return;
      }

      setMatchedMasterPlayer(profile);
      if (profile.gmail) {
        setPlayerGmail(profile.gmail);
      }
      if (profile.photoUrl) {
        setPlayerPhotoUrl(profile.photoUrl);
      }

      const patched = { ...currentFormSnapshot };
      selectedEvent.fields.forEach((f) => {
        const lowerId = String(f.id || "").toLowerCase();
        const lowerLabel = String(f.label || "").toLowerCase();

        // नाव रिकामा असेल तर प्री-फिल करा
        if (
          (lowerId.includes("name") ||
            lowerLabel.includes("name") ||
            lowerLabel.includes("नाव")) &&
          !String(patched[f.id] || "").trim() &&
          profile.fullName
        ) {
          patched[f.id] = profile.fullName;
        }

        // Role / भूमिका / ओळख फील्ड प्री-फिल करणे (Select आणि Radio दोन्हीसाठी)
        if (
          (lowerId.includes("role") ||
            lowerLabel.includes("role") ||
            lowerLabel.includes("भूमिका") ||
            lowerLabel.includes("ओळख")) &&
          profile.role
        ) {
          const targetKey = normalizeRoleKey(profile.role);
          if (
            (f.type === "select" || f.type === "radio") &&
            Array.isArray(f.options)
          ) {
            const matchedOpt = f.options.find(
              (o) => normalizeRoleKey(o) === targetKey
            );
            if (matchedOpt) {
              patched[f.id] = matchedOpt;
            }
          } else if (!String(patched[f.id] || "").trim()) {
            patched[f.id] = profile.role;
          }
        }

        // Gmail फील्ड आधीच डायनॅमिक फॉर्ममध्ये असेल तर प्री-फिल करा
        if (
          (lowerId.includes("email") ||
            lowerId.includes("gmail") ||
            lowerLabel.includes("email") ||
            lowerLabel.includes("gmail") ||
            lowerLabel.includes("ईमेल")) &&
          !String(patched[f.id] || "").trim() &&
          profile.gmail
        ) {
          patched[f.id] = profile.gmail;
        }
      });

      setFormData(patched);
    } catch (err) {
      console.warn("JBSC Master lookup skipped:", err);
    }
  };

  const handleInputChange = (fieldId, value) => {
    const nextData = { ...formData, [fieldId]: value };
    setFormData(nextData);

    if (formErrors[fieldId]) {
      setFormErrors((prev) => {
        const copy = { ...prev };
        delete copy[fieldId];
        return copy;
      });
    }

    const fieldObj = selectedEvent?.fields?.find((item) => item.id === fieldId);
    const lowerId = String(fieldId || "").toLowerCase();
    const lowerLabel = String(fieldObj?.label || "").toLowerCase();
    const isMobileField =
      fieldObj?.type === "tel" ||
      lowerId.includes("mobile") ||
      lowerLabel.includes("mobile") ||
      lowerLabel.includes("व्हॉट्सॲप") ||
      lowerLabel.includes("मोबाईल");

    if (isMobileField) {
      tryPrefillFromJbscMaster(value, nextData);
    }
  };

  const handleCheckboxChange = (fieldId, option, checked) => {
    const currentList = Array.isArray(formData[fieldId]) ? formData[fieldId] : [];
    const updated = checked
      ? [...currentList, option]
      : currentList.filter((item) => item !== option);
    handleInputChange(fieldId, updated);
  };

  // फोटो कॉम्प्रेस करून JBSC Player ID सह imgbb वर अपलोड करणे
  const handlePlayerPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // सध्या फॉर्ममध्ये भरलेले नाव व मोबाईल ओळखणे
    let currentName = "";
    let currentMob = "";
    selectedEvent?.fields?.forEach((f) => {
      const s = `${f.id || ""} ${f.label || ""}`.toLowerCase();
      const val = String(formData[f.id] || "").trim();
      if (!currentName && (s.includes("name") || s.includes("नाव"))) {
        currentName = val;
      }
      if (
        !currentMob &&
        (f.type === "tel" ||
          s.includes("mobile") ||
          s.includes("मोबाईल") ||
          s.includes("व्हॉट्सॲप"))
      ) {
        currentMob = normalizeMobile10(val);
      }
    });

    setUploadingPhoto(true);
    try {
      // जुना ID असेल तर तोच, नसेल तर मोबाईल/नावानुसार नवीन ID तयार करून फोटोला नाव देणे
      let idTag = matchedMasterPlayer?.playerId || "";
      if (!idTag && currentMob.length === 10 && currentName) {
        const created = await upsertJbscMasterPlayer({
          mobile: currentMob,
          fullName: toProperCase(currentName),
          gmail: playerGmail,
          eventId: selectedEvent?.id
        });
        if (created?.playerId) {
          idTag = created.playerId;
          setMatchedMasterPlayer((prev) => ({
            ...(prev || {}),
            playerId: created.playerId,
            mobile: currentMob,
            fullName: toProperCase(currentName)
          }));
        }
      }

      const namePrefix = `${idTag || "JBSC_PLAYER"}_${
        currentName || currentMob || "PHOTO"
      }`;
      const uploadedUrl = await uploadToImgbb(file, {
        maxWidth: 500,
        quality: 0.78,
        namePrefix
      });

      setPlayerPhotoUrl(uploadedUrl);
      showSuccess(
        "फोटो अपलोड झाला!",
        idTag
          ? `फोटो कॉम्प्रेस होऊन ${idTag} प्रोफाइलसाठी सेव्ह झाला.`
          : "खेळाडूचा फोटो कॉम्प्रेस होऊन अपलोड झाला."
      );
    } catch (err) {
      console.error(err);
      showError("फोटो अपलोड त्रुटी", err.message || "फोटो अपलोड करता आला नाही.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const toProperCase = (str) => {
    return String(str || "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const checkDuplicateEntry = async (
    scriptUrl,
    eventTitle,
    cleanName,
    cleanMobile
  ) => {
    try {
      const res = await fetch(
        `${scriptUrl}?sheet=${encodeURIComponent(eventTitle)}`
      );
      const result = await res.json();
      if (result && result.status === "success" && Array.isArray(result.data)) {
        const targetName = cleanName.toLowerCase().trim();
        const targetMob = cleanMobile.replace(/\D/g, "").slice(-10);

        return result.data.find((row) => {
          const rowName = String(
            row["Full_Name"] ||
              row["fullName"] ||
              row["पूर्ण नाव (Full Name)"] ||
              row["नाव"] ||
              ""
          )
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim();

          const rowMob = String(
            row["Mobile"] ||
              row["mobile"] ||
              row["व्हॉट्सॲप नंबर (WhatsApp No)"] ||
              ""
          )
            .replace(/\D/g, "")
            .slice(-10);

          return (
            rowName === targetName &&
            rowMob === targetMob &&
            targetMob.length === 10
          );
        });
      }
    } catch (e) {
      console.warn("Duplicate pre-check skipped:", e);
    }
    return null;
  };

  const hasDynamicGmailField = Boolean(
    selectedEvent?.fields?.some((f) => {
      const s = `${f.id || ""} ${f.label || ""}`.toLowerCase();
      return s.includes("email") || s.includes("gmail") || s.includes("ईमेल");
    })
  );

  // २. फॉर्म सबमिशन व व्हॅलिडेशन
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEvent || submitting || uploadingPhoto) return;

    const errors = {};

    selectedEvent.fields.forEach((field) => {
      const val = formData[field.id];

      if (field.required) {
        if (field.type === "checkbox") {
          if (!val || val.length === 0) {
            errors[field.id] = "कृपया किमान एक पर्याय निवडा.";
          }
        } else if (!val || String(val).trim() === "") {
          errors[field.id] = "हे फील्ड भरणे आवश्यक आहे.";
        }
      }

      if (
        !errors[field.id] &&
        field.validation &&
        field.validation !== "none" &&
        val
      ) {
        const ruleError = validateField(String(val), field.validation);
        if (ruleError) {
          errors[field.id] = ruleError;
        }
      }
    });

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showError(
        "अपूर्ण अर्ज",
        "कृपया फॉर्ममधील लाल रंगात दर्शवलेल्या त्रुटी तपासा."
      );
      return;
    }

    setSubmitting(true);
    try {
      const uniqueRegId = `REG_${Date.now().toString().slice(-6)}`;
      const finalAmount = Number(selectedEvent.baseAmount || 0);

      const dynamicFieldsData = {};
      let detectedFullName = "";
      let detectedMobile = "";
      let detectedRole = "";
      let detectedPhotoUrl = playerPhotoUrl.trim();
      let detectedGmail = playerGmail.trim();

      selectedEvent.fields?.forEach((f) => {
        const cleanLabel = f.label.replace(/[:\\/?*\[\]]/g, "").trim();
        let val = formData[f.id] !== undefined ? formData[f.id] : "";

        const lowerLabel = cleanLabel.toLowerCase();
        const lowerId = String(f.id || "").toLowerCase();

        if (
          lowerId.includes("name") ||
          lowerLabel.includes("name") ||
          lowerLabel.includes("नाव")
        ) {
          val = toProperCase(val);
          if (!detectedFullName) detectedFullName = val;
        }

        if (
          f.type === "tel" ||
          lowerId.includes("mobile") ||
          lowerLabel.includes("mobile") ||
          lowerLabel.includes("व्हॉट्सॲप") ||
          lowerLabel.includes("मोबाईल")
        ) {
          detectedMobile = String(val).trim();
        }

        if (
          lowerId.includes("role") ||
          lowerLabel.includes("role") ||
          lowerLabel.includes("भूमिका") ||
          lowerLabel.includes("ओळख")
        ) {
          detectedRole = String(val).trim();
        }

        if (
          lowerId.includes("photo") ||
          lowerLabel.includes("photo") ||
          lowerLabel.includes("फोटो")
        ) {
          if (String(val).trim()) detectedPhotoUrl = String(val).trim();
        }

        if (
          lowerId.includes("email") ||
          lowerId.includes("gmail") ||
          lowerLabel.includes("email") ||
          lowerLabel.includes("gmail") ||
          lowerLabel.includes("ईमेल")
        ) {
          if (String(val).trim()) detectedGmail = String(val).trim();
        }

        dynamicFieldsData[cleanLabel] = val;
      });

      const scriptUrl = import.meta.env.VITE_GOOGLE_SHEET_API_URL;

      // डुप्लिकेट तपासणी
      if (scriptUrl && detectedFullName && detectedMobile) {
        const existingEntry = await checkDuplicateEntry(
          scriptUrl,
          selectedEvent.title,
          detectedFullName,
          detectedMobile
        );

        if (existingEntry) {
          const existingRegId =
            existingEntry["Reg_ID"] || existingEntry["regId"] || "";
          setSubmitting(false);
          showError(
            "नोंदणी आधीच झाली आहे! ⚠️",
            `${detectedFullName} (${detectedMobile}) यांची नोंदणी या इव्हेंटसाठी आधीच पूर्ण झाली आहे (Reg ID: ${existingRegId}).\n\nजर तुम्ही कुटुंबातील इतर सदस्याची नोंदणी करत असाल, तर कृपया त्यांचे नाव टाका.`
          );
          return;
        }
      }

      // JBSC Master Profile मध्ये Unique Player ID + Gmail + Photo + Mobile सेव्ह करणे
      let masterResult = null;
      if (isJbscEvent && detectedMobile && detectedFullName) {
        try {
          masterResult = await upsertJbscMasterPlayer({
            mobile: detectedMobile,
            gmail: detectedGmail,
            fullName: detectedFullName,
            role: detectedRole || "All-rounder",
            photoUrl: detectedPhotoUrl || matchedMasterPlayer?.photoUrl || "",
            eventId: selectedEvent.id
          });
        } catch (mpErr) {
          console.warn("Master profile save skipped:", mpErr);
        }
      }

      const finalSavedPhoto =
        masterResult?.photoUrl ||
        detectedPhotoUrl ||
        matchedMasterPlayer?.photoUrl ||
        "";

      const submissionPayload = {
        Timestamp: new Date().toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata"
        }),
        Reg_ID: uniqueRegId,
        ...(masterResult?.playerId
          ? { JBSC_Player_ID: masterResult.playerId }
          : {}),
        ...(detectedGmail ? { Gmail: detectedGmail } : {}),
        ...(finalSavedPhoto ? { Photo_URL: finalSavedPhoto } : {}),
        Event_Title: selectedEvent.title,
        Amount: finalAmount,
        Payment_Status: finalAmount > 0 ? "Pending" : "Free",
        ...dynamicFieldsData
      };

      if (scriptUrl) {
        await fetch(scriptUrl, {
          method: "POST",
          mode: "no-cors",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(submissionPayload)
        });
      }

      setSubmittedData({
        regId: uniqueRegId,
        playerId: masterResult?.playerId || "",
        amount: finalAmount,
        fullName: detectedFullName || "सहभागी सदस्य"
      });

      showSuccess(
        "नोंदणी यशस्वी!",
        `${detectedFullName} यांचा अर्ज स्वीकारण्यात आला आहे.`
      );
    } catch (err) {
      console.error(err);
      showError("सबमिशन अयशस्वी", "तांत्रिक अडचण आली आहे. पुन्हा प्रयत्न करा.");
    } finally {
      setSubmitting(false);
    }
  };

  // ३. UPI पेमेंट डीप लिंक
  const upiId = selectedEvent?.upiSettings?.upiId || "";
  const payeeName =
    selectedEvent?.upiSettings?.payeeName ||
    selectedEvent?.title ||
    APP_CONFIG.FULL_CLUB_NAME;

  const getUpiPaymentUrl = () => {
    if (!upiId || !submittedData?.amount) return "";
    const note = encodeURIComponent(
      `${selectedEvent.title} - ${submittedData.regId}`
    );
    const name = encodeURIComponent(payeeName);
    return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${name}&am=${
      submittedData.amount
    }&cu=INR&tn=${note}`;
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-500">
        <div className="w-8 h-8 border-3 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        नोंदणी फॉर्म लोड होत आहे...
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 text-center shadow-sm">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900">
          सध्या कोणतीही नोंदणी सुरू नाही
        </h2>
        <p className="text-sm text-slate-500 mt-2">
          कमिटकडून नवीन इव्हेंट सुरू झाल्यानंतर येथे फॉर्म उपलब्ध होईल.
        </p>
      </div>
    );
  }

  // ४. सबमिशननंतर दिसणारी UPI पेमेंट स्क्रीन
  if (submittedData) {
    const hasUpi = Boolean(upiId && submittedData.amount > 0);
    const upiUrl = hasUpi ? getUpiPaymentUrl() : "";
    const dynamicQrUrl = hasUpi
      ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=8&data=${encodeURIComponent(
          upiUrl
        )}`
      : "";

    return (
      <div className="max-w-xl mx-auto my-6 px-4">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mx-auto">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-900">
              नोंदणी यशस्वी झाली!
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              आपला नोंदणी क्रमांक:{" "}
              <span className="font-mono font-bold text-orange-600 text-base">
                {submittedData.regId}
              </span>
            </p>
            {submittedData.playerId && (
              <p className="text-xs text-emerald-700 font-mono font-bold mt-1">
                JBSC Player ID: {submittedData.playerId}
              </p>
            )}
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 text-left text-xs sm:text-sm space-y-2 border border-slate-100">
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500">इव्हेंट:</span>
              <strong className="text-slate-800">{selectedEvent.title}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500">नाव:</span>
              <strong className="text-slate-800">
                {submittedData.fullName || "नोंदणीकृत सदस्य"}
              </strong>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">नोंदणी फी:</span>
              <strong className="text-emerald-700 text-base font-black">
                ₹{submittedData.amount}
              </strong>
            </div>
          </div>

          {hasUpi ? (
            <div className="space-y-4 pt-2">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center space-y-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  कोणत्याही UPI ॲपने स्कॅन करा
                </span>
                <img
                  src={dynamicQrUrl}
                  alt="UPI QR Code"
                  className="w-44 h-44 mx-auto object-contain rounded-2xl border border-slate-200 bg-white p-2 shadow-xs"
                />
                <div className="text-[11px] font-mono font-bold text-slate-700">
                  {upiId}
                </div>
              </div>

              <a
                href={upiUrl}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-lg shadow-emerald-600/20 active:scale-98 transition text-sm cursor-pointer"
              >
                <IndianRupee className="w-5 h-5" />
                Pay ₹{submittedData.amount} via UPI (GPay / PhonePe)
              </a>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 text-xs font-semibold">
              या इव्हेंटसाठी ऑनलाइन फी आकारली जात नाही. आपली नोंदणी पूर्ण झाली आहे.
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => {
                setSubmittedData(null);
                setMatchedMasterPlayer(null);
                setPlayerGmail("");
                setPlayerPhotoUrl("");
                lastLookedUpMobileRef.current = "";
                setFormData({});
              }}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              दुसरी नोंदणी करा
            </button>
            <button
              onClick={() => navigate("/public-list")}
              className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
            >
              नोंदणी यादी पहा <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ५. मुख्य नोंदणी फॉर्म UI
  return (
    <>
     

      <div className="w-full min-h-screen bg-slate-50 font-sans pb-16">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 pt-4 sm:pt-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 items-start">
            {/* ================= डावी बाजू: इव्हेंट माहिती व बॅनर ================= */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
                {selectedEvent?.bannerUrl && (
                  <div className="w-full h-36 sm:h-48 bg-slate-100 overflow-hidden">
                    <img
                      src={selectedEvent.bannerUrl}
                      alt={selectedEvent.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="p-4 sm:p-5 space-y-3">
                  {events.length > 1 && (
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                        इव्हेंट बदला
                      </label>
                      <select
                        value={selectedEvent?.id}
                        onChange={handleEventChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 outline-none focus:border-orange-500 cursor-pointer"
                      >
                        {events.map((ev) => (
                          <option key={ev.id} value={ev.id}>
                            {ev.title} ({ev.year})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200/60">
                        वर्ष {selectedEvent?.year || 2026}
                      </span>
                      <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200/60">
                        फी: ₹{selectedEvent?.baseAmount || 0}
                      </span>
                    </div>

                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                      {selectedEvent?.title}
                    </h1>
                  </div>

                  <div className="flex items-center gap-2 bg-orange-50/70 border border-orange-200/60 p-2.5 rounded-2xl text-xs text-orange-950 font-bold">
                    <Calendar className="w-4 h-4 text-orange-600 shrink-0" />
                    <span className="truncate">{formatEventDateTime()}</span>
                  </div>

                  {selectedEvent?.description && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setShowRules(!showRules)}
                        className="lg:hidden w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5 text-orange-600">
                          <Info className="w-4 h-4" />
                          <span>नियम व माहिती (पहा)</span>
                        </div>
                        {showRules ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </button>

                      <div
                        className={`mt-2 lg:mt-0 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs text-slate-600 leading-relaxed whitespace-pre-line ${
                          showRules ? "block" : "hidden lg:block"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 mb-1.5">
                          <ShieldCheck className="w-4 h-4 text-orange-600" />
                          नियम व महत्त्वाच्या सूचना:
                        </div>
                        <p className="text-[11px] sm:text-xs text-slate-600">
                          {selectedEvent.description}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ================= उजवी बाजू: सहभागी सदस्याचा फॉर्म ================= */}
            <div className="lg:col-span-7">
              <form
                onSubmit={handleSubmit}
                className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-7 shadow-sm space-y-4"
              >
                <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900">
                      सहभागी सदस्याची माहिती भरा
                    </h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {isJbscEvent
                        ? "JBSC सदस्य असल्यास १० अंकी मोबाईल नंबर टाकताच जुनी माहिती प्री-फिल होईल."
                        : "सर्व आवश्यक माहिती अचूक भरा."}
                    </p>
                  </div>
                  <span className="text-[10px] text-rose-500 font-bold">
                    * आवश्यक
                  </span>
                </div>

                {/* JBSC Master Profile सापडल्याचा बॅज */}
                {isJbscEvent && matchedMasterPlayer && (
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950">
                    {playerPhotoUrl || matchedMasterPlayer.photoUrl ? (
                      <img
                        src={playerPhotoUrl || matchedMasterPlayer.photoUrl}
                        alt={matchedMasterPlayer.fullName}
                        className="w-11 h-11 rounded-xl object-cover object-top border border-emerald-300 shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <UserCheck className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-black text-emerald-900 truncate">
                        JBSC प्रोफाइल सापडले • ID:{" "}
                        <span className="font-mono">
                          {matchedMasterPlayer.playerId}
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-700">
                        तुमची जुनी माहिती प्री-फिल केली आहे (कुटुंबातील इतर सदस्यासाठी नाव बदलू शकता).
                      </div>
                    </div>
                  </div>
                )}

                {/* डायनॅमिक फील्ड्स */}
                {selectedEvent?.fields?.map((field) => {
                  const hasError = Boolean(formErrors[field.id]);

                  return (
                    <div key={field.id} className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">
                        {field.label}{" "}
                        {field.required && (
                          <span className="text-rose-500">*</span>
                        )}
                      </label>

                      {["text", "tel", "number", "email"].includes(field.type) && (
                        <input
                          type={field.type}
                          value={formData[field.id] || ""}
                          onChange={(e) =>
                            handleInputChange(field.id, e.target.value)
                          }
                          placeholder={`${field.label} प्रविष्ट करा...`}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm transition focus:outline-none ${
                            hasError
                              ? "border-rose-400 bg-rose-50/30 focus:border-rose-500"
                              : "border-slate-200 bg-slate-50/50 focus:bg-white focus:border-orange-500"
                          }`}
                        />
                      )}

                      {field.type === "textarea" && (
                        <textarea
                          rows="2"
                          value={formData[field.id] || ""}
                          onChange={(e) =>
                            handleInputChange(field.id, e.target.value)
                          }
                          placeholder={`${field.label} सविस्तर लिहा...`}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm transition focus:outline-none ${
                            hasError
                              ? "border-rose-400 bg-rose-50/30 focus:border-rose-500"
                              : "border-slate-200 bg-slate-50/50 focus:bg-white focus:border-orange-500"
                          }`}
                        />
                      )}

                      {field.type === "select" && (
                        <select
                          value={formData[field.id] || ""}
                          onChange={(e) =>
                            handleInputChange(field.id, e.target.value)
                          }
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm bg-white transition focus:outline-none cursor-pointer ${
                            hasError
                              ? "border-rose-400 bg-rose-50/30 focus:border-rose-500"
                              : "border-slate-200 focus:border-orange-500"
                          }`}
                        >
                          <option value="">-- पर्याय निवडा --</option>
                          {field.options?.map((opt, i) => (
                            <option key={i} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      )}

                      {field.type === "radio" && (
                        <div className="grid grid-cols-2 gap-2 pt-0.5">
                          {field.options?.map((opt, i) => {
                            const isChecked = formData[field.id] === opt;
                            return (
                              <label
                                key={i}
                                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer text-xs font-bold transition ${
                                  isChecked
                                    ? "border-orange-500 bg-orange-50/60 text-orange-950"
                                    : "border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={field.id}
                                  value={opt}
                                  checked={isChecked}
                                  onChange={(e) =>
                                    handleInputChange(field.id, e.target.value)
                                  }
                                  className="w-3.5 h-3.5 text-orange-600 focus:ring-0"
                                />
                                <span>{opt}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {field.type === "checkbox" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                          {field.options?.map((opt, i) => {
                            const checked = (formData[field.id] || []).includes(
                              opt
                            );
                            return (
                              <label
                                key={i}
                                className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs font-bold transition ${
                                  checked
                                    ? "border-orange-500 bg-orange-50/50 text-orange-950"
                                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) =>
                                    handleCheckboxChange(
                                      field.id,
                                      opt,
                                      e.target.checked
                                    )
                                  }
                                  className="w-3.5 h-3.5 rounded text-orange-600 focus:ring-0"
                                />
                                <span>{opt}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {hasError && (
                        <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1 mt-0.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {formErrors[field.id]}
                        </p>
                      )}
                    </div>
                  );
                })}

                {/* JBSC इव्हेंटसाठी फोटो अपलोड (ऑटो कॉम्प्रेस + ID सह सेव्ह) */}
                {isJbscEvent && (
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <Camera className="w-3.5 h-3.5 text-orange-600" />
                      <span>
                        खेळाडूचा फोटो (पर्यायी — लिलाव व प्रोफाइल कार्डसाठी)
                      </span>
                    </label>

                    <div className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 bg-slate-50/60">
                      {playerPhotoUrl ? (
                        <img
                          src={playerPhotoUrl}
                          alt="Player Preview"
                          className="w-14 h-14 rounded-xl object-cover object-top border border-slate-300 shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-slate-200/80 text-slate-400 flex items-center justify-center shrink-0">
                          <Camera className="w-5 h-5" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0 space-y-1">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-black text-slate-800 cursor-pointer transition">
                          <Camera className="w-3.5 h-3.5 text-orange-600" />
                          <span>
                            {uploadingPhoto
                              ? "फोटो कॉम्प्रेस व अपलोड होत आहे..."
                              : playerPhotoUrl
                              ? "फोटो बदला"
                              : "फोटो निवडा / अपलोड करा"}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={uploadingPhoto}
                            onChange={handlePlayerPhotoUpload}
                            className="hidden"
                          />
                        </label>
                        <p className="text-[10px] text-slate-500">
                          {matchedMasterPlayer?.playerId
                            ? `हा फोटो ${matchedMasterPlayer.playerId} ID वर सेव्ह होईल.`
                            : "आधी नाव व मोबाईल नंबर टाकल्यास फोटोला तुमचा JBSC ID जोडला जाईल."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* JBSC इव्हेंटसाठी Gmail ID फील्ड (भविष्यातील Player Login व Scoring App साठी) */}
                {isJbscEvent && !hasDynamicGmailField && (
                  <div className="space-y-1">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <Mail className="w-3.5 h-3.5 text-orange-600" />
                      <span>Gmail ID (पर्यायी — Player Profile व Scoring साठी)</span>
                    </label>
                    <input
                      type="email"
                      value={playerGmail}
                      onChange={(e) => setPlayerGmail(e.target.value)}
                      placeholder="example@gmail.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-orange-500 text-xs sm:text-sm transition focus:outline-none"
                    />
                  </div>
                )}

                {/* Submit Button */}
                <div className="pt-3 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={submitting || uploadingPhoto}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-orange-600 hover:bg-orange-700 active:scale-98 text-white font-black text-sm shadow-lg shadow-orange-600/20 transition disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>
                          नोंदणी अर्ज सबमिट करा{" "}
                          {selectedEvent?.baseAmount > 0
                            ? `(₹${selectedEvent.baseAmount})`
                            : ""}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}