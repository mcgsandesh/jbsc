  // src/modules/public/Registration.jsx
  import React, { useState, useEffect } from "react";
  import { useSearchParams, useParams,useNavigate, } from "react-router-dom";
  import { 
    CalendarDays, 
    IndianRupee, 
    CheckCircle2, 
    AlertCircle, 
    QrCode, 
    ArrowLeft, 
    Send,
    ExternalLink,
    Info
  } from "lucide-react";
  import { getAllEvents, getEventById } from "../../services/eventService";
  import { validateField } from "../../utils/validators";
  import { showError, showSuccess } from "../../utils/alert";
  import { APP_CONFIG } from "../../config/constants";

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

    // सबमिशन यशस्वी झाल्यावर UPI स्क्रीन स्टेट
    const [submittedData, setSubmittedData] = useState(null);

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
              (e) => (e.slug && e.slug.toLowerCase() === slug.toLowerCase()) || e.id === slug
            );
          }

          if (eventIdParam) {
            current = activeEvents.find((e) => e.id === eventIdParam);
          }
          if (!current && activeEvents.length > 0) {
            current = activeEvents[0]; // पहिला ऍक्टिव्ह इव्हेंट डीफॉल्ट
          }

          setSelectedEvent(current);

          // डीफॉल्ट फॉर्म स्टेट इनिशियलाइझ करणे
          if (current && current.fields) {
            const initial = {};
            current.fields.forEach((f) => {
              initial[f.id] = f.type === "checkbox" ? [] : "";
            });
            setFormData(initial);
          }
        } catch (err) {
          console.error(err);
          showError("एरर", "इव्हेंट माहिती लोड करताना अडचण आली.");
        } finally {
          setLoading(false);
        }
      };

      initData();
    }, [slug,searchParams]);

    // इव्हेंट बदलल्यास फॉर्म रीसेट करणे
    const handleEventChange = (e) => {
      const ev = events.find((item) => item.id === e.target.value);
      setSelectedEvent(ev);
      setFormErrors({});
      if (ev && ev.fields) {
        const initial = {};
        ev.fields.forEach((f) => {
          initial[f.id] = f.type === "checkbox" ? [] : "";
        });
        setFormData(initial);
      }
    };

    // इनपुट व्हॅल्यू हँडलर
    const handleInputChange = (fieldId, value) => {
      setFormData((prev) => ({ ...prev, [fieldId]: value }));
      // जर जुनी एरर असेल तर ती काढणे
      if (formErrors[fieldId]) {
        setFormErrors((prev) => {
          const copy = { ...prev };
          delete copy[fieldId];
          return copy;
        });
      }
    };

    // चेकबॉक्स लिस्ट हँडलर
    const handleCheckboxChange = (fieldId, option, checked) => {
      const currentList = Array.isArray(formData[fieldId]) ? formData[fieldId] : [];
      let updated;
      if (checked) {
        updated = [...currentList, option];
      } else {
        updated = currentList.filter((item) => item !== option);
      }
      handleInputChange(fieldId, updated);
    };

  // २. फॉर्म सबमिशन व व्हॅलिडेशन
    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!selectedEvent) return;

      const errors = {};

      // सर्व फील्ड्सचे व्हॅलिडेशन तपासणे
      selectedEvent.fields.forEach((field) => {
        const val = formData[field.id];

        // Required Check
        if (field.required) {
          if (field.type === "checkbox") {
            if (!val || val.length === 0) {
              errors[field.id] = "कृपया किमान एक पर्याय निवडा.";
            }
          } else if (!val || String(val).trim() === "") {
            errors[field.id] = "हे फील्ड भरणे आवश्यक आहे.";
          }
        }

        // Format / Regex Rule Check
        if (!errors[field.id] && field.validation && field.validation !== "none" && val) {
          const ruleError = validateField(String(val), field.validation);
          if (ruleError) {
            errors[field.id] = ruleError;
          }
        }
      });

      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        showError("अपूर्ण अर्ज", "कृपया फॉर्ममधील लाल रंगात दर्शवलेल्या त्रुटी तपासा.");
        return;
      }

      setSubmitting(true);
      try {
        const uniqueRegId = `REG_${Date.now().toString().slice(-6)}`;
        const finalAmount = Number(selectedEvent.baseAmount || 0);

        // १. Google Sheet साठी फील्ड आयडी ऐवजी स्वच्छ लेबल मॅप करणे (उदा. ___food__291 ऐवजी 'जेवण पर्याय')
        const dynamicFieldsData = {};
        selectedEvent.fields?.forEach((f) => {
          const cleanLabel = f.label.replace(/[:\\/?*\[\]]/g, "").trim();
          dynamicFieldsData[cleanLabel] = formData[f.id] !== undefined ? formData[f.id] : "";
        });

        // २. Google Sheet ला जाणारा पेलोड
        const submissionPayload = {
          Timestamp: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
          Reg_ID: uniqueRegId,
          Event_Title: selectedEvent.title,
          Amount: finalAmount,
          Payment_Status: finalAmount > 0 ? "Pending" : "Free",
          ...dynamicFieldsData,
        };

        const scriptUrl = import.meta.env.VITE_GOOGLE_SHEET_API_URL;

        if (scriptUrl) {
          await fetch(scriptUrl, {
            method: "POST",
            mode: "no-cors",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(submissionPayload),
          });
        }

        // ३. सबमिशन स्क्रीनसाठी स्टेट सेट करणे (यात amount आणि regId दोन्ही बरोबर मिळतील)
        setSubmittedData({
          regId: uniqueRegId,
          amount: finalAmount,
          fullName: formData.fullName || Object.values(formData)[0] || "सहभागी सदस्य",
        });

        showSuccess("नोंदणी यशस्वी!", "आपला अर्ज स्वीकारण्यात आला आहे.");
      } catch (err) {
        console.error(err);
        showError("सबमिशन अयशस्वी", "तांत्रिक अडचण आली आहे. पुन्हा प्रयत्न करा.");
      } finally {
        setSubmitting(false);
      }
    };

    // ३. UPI पेमेंट लिंक तयार करणे
    const getUpiPaymentUrl = () => {
      if (!selectedEvent?.upiSettings?.upiId || !submittedData?.amount) return "";
      const { upiId, payeeName } = selectedEvent.upiSettings;
      const amount = submittedData.amount;
      const note = encodeURIComponent(`${selectedEvent.title} - ${submittedData.regId}`);
      const name = encodeURIComponent(payeeName || APP_CONFIG.FULL_CLUB_NAME);

      // स्टँडर्ड Deep Link जे GPay, PhonePe, Paytm, BHIM मध्ये उघडते
      return `upi://pay?pa=${upiId}&pn=${name}&am=${amount}&cu=INR&tn=${note}`;
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
          <h2 className="text-xl font-bold text-slate-900">सध्या कोणतीही नोंदणी सुरू नाही</h2>
          <p className="text-sm text-slate-500 mt-2">
            कमिटीकडून नवीन इव्हेंट सुरू झाल्यानंतर येथे फॉर्म उपलब्ध होईल.
          </p>
        </div>
      );
    }

    // ४. सबमिशननंतर दिसणारी UPI पेमेंट स्क्रीन
    if (submittedData) {
      const upiId = selectedEvent?.upiSettings?.upiId;
      const hasUpi = Boolean(upiId && submittedData.amount > 0);
     const upiUrl = hasUpi ? getUpiPaymentUrl() : "";

      return (
        <div className="max-w-xl mx-auto my-6 px-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xl shadow-orange-600/5 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-slate-900">नोंदणी यशस्वी झाली!</h2>
              <p className="text-sm text-slate-500 mt-1">
                आपला नोंदणी क्रमांक: <span className="font-mono font-bold text-orange-600 text-base">{submittedData.regId}</span>
              </p>
            </div>

            {/* तपशील बॉक्स */}
            <div className="bg-slate-50 rounded-2xl p-4 text-left text-xs sm:text-sm space-y-2 border border-slate-100">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">इव्हेंट:</span>
                <strong className="text-slate-800">{selectedEvent.title}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">नाव:</span>
                <strong className="text-slate-800">{submittedData.fullName || "नोंदणीकृत सदस्य"}</strong>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">नोंदणी फी:</span>
                <strong className="text-emerald-700 text-base font-black">₹{submittedData.amount}</strong>
              </div>
            </div>

            {/* UPI पेमेंट पर्याय */}
            {hasUpi ? (
              <div className="space-y-4 pt-2">
                <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200 text-left flex items-start gap-3">
                  <QrCode className="w-6 h-6 text-orange-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-orange-950">ऑनलाइन पेमेंट करा</div>
                    <div className="text-[11px] text-orange-800 mt-0.5 leading-relaxed">
                      खालील बटणावर क्लिक केल्यास थेट GPay, PhonePe किंवा Paytm ॲप उघडेल.
                    </div>
                  </div>
                </div>

                {/* UPI Intent Button */}
                <a
                  href={upiUrl}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-lg shadow-emerald-600/20 active:scale-98 transition text-sm cursor-pointer"
                >
                  <IndianRupee className="w-5 h-5" />
                  Pay ₹{submittedData.amount} via UPI (GPay / PhonePe)
                </a>

                <div className="text-[11px] text-slate-400 font-mono">
                  UPI ID: {selectedEvent.upiSettings.upiId} ({selectedEvent.upiSettings.payeeName})
                </div>
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
                  setFormData({});
                }}
                className="text-xs font-bold text-slate-600 hover:text-slate-900"
              >
                दुसरी नोंदणी करा
              </button>
              <button
                onClick={() => navigate("/public-list")}
                className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700"
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
      <div className="max-w-2xl mx-auto my-6 px-4 space-y-6">
        
        {/* इव्हेंट निवड व बॅनर */}
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          {selectedEvent?.bannerUrl && (
            <div className="w-full h-44 sm:h-56 bg-slate-100 overflow-hidden">
              <img
                src={selectedEvent.bannerUrl}
                alt={selectedEvent.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-6 space-y-4">
            {/* इव्हेंट सिलेक्ट ड्रॉपडाउन (एकापेक्षा जास्त इव्हेंट्स असतील तर) */}
            {events.length > 1 && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  इव्हेंट निवडा
                </label>
                <select
                  value={selectedEvent?.id}
                  onChange={handleEventChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 bg-slate-50 focus:outline-none focus:border-orange-500"
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
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                {selectedEvent?.title}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs font-semibold text-slate-500">
                <span className="px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 border border-orange-100">
                  वर्ष {selectedEvent?.year}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                  फी: ₹{selectedEvent?.baseAmount || 0}
                </span>
              </div>
            </div>

            {selectedEvent?.description && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1">
                  <Info className="w-3.5 h-3.5 text-orange-600" /> नियम व माहिती:
                </div>
                {selectedEvent.description}
              </div>
            )}
          </div>
        </div>

        {/* डायनॅमिक फील्ड्स फॉर्म */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
          <h2 className="text-base font-black text-slate-900 pb-2 border-b border-slate-100">
            सहभागी सदस्याची माहिती भरा
          </h2>

          {selectedEvent?.fields?.map((field) => {
            const hasError = Boolean(formErrors[field.id]);

            return (
              <div key={field.id} className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  {field.label}{" "}
                  {field.required && <span className="text-rose-500">*</span>}
                </label>

                {/* Short Text / Tel / Number */}
                {["text", "tel", "number"].includes(field.type) && (
                  <input
                    type={field.type}
                    value={formData[field.id] || ""}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    placeholder={`${field.label} प्रविष्ट करा...`}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm transition focus:outline-none ${
                      hasError
                        ? "border-rose-400 bg-rose-50/30 focus:border-rose-500"
                        : "border-slate-200 bg-white focus:border-orange-500"
                    }`}
                  />
                )}

                {/* Paragraph / Textarea */}
                {field.type === "textarea" && (
                  <textarea
                    rows="3"
                    value={formData[field.id] || ""}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    placeholder={`${field.label} सविस्तर लिहा...`}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm transition focus:outline-none ${
                      hasError
                        ? "border-rose-400 bg-rose-50/30 focus:border-rose-500"
                        : "border-slate-200 bg-white focus:border-orange-500"
                    }`}
                  />
                )}

                {/* Select Dropdown */}
                {field.type === "select" && (
                  <select
                    value={formData[field.id] || ""}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-white transition focus:outline-none ${
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

                {/* Radio Group */}
                {field.type === "radio" && (
                  <div className="flex flex-wrap gap-3 pt-1">
                    {field.options?.map((opt, i) => (
                      <label
                        key={i}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-orange-50/30 cursor-pointer text-xs font-semibold text-slate-700 transition"
                      >
                        <input
                          type="radio"
                          name={field.id}
                          value={opt}
                          checked={formData[field.id] === opt}
                          onChange={(e) => handleInputChange(field.id, e.target.value)}
                          className="text-orange-600 focus:ring-0"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Checkbox List (Multiple choices) */}
                {field.type === "checkbox" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {field.options?.map((opt, i) => {
                      const checked = (formData[field.id] || []).includes(opt);
                      return (
                        <label
                          key={i}
                          className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer text-xs font-semibold transition ${
                            checked
                              ? "border-orange-500 bg-orange-50/50 text-orange-950"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => handleCheckboxChange(field.id, opt, e.target.checked)}
                            className="w-4 h-4 rounded text-orange-600 focus:ring-0"
                          />
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* File Upload Placeholder */}
                {field.type === "file" && (
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center bg-slate-50">
                    <input
                      type="file"
                      onChange={(e) => handleInputChange(field.id, e.target.files[0]?.name || "")}
                      className="text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 cursor-pointer"
                    />
                    <div className="text-[10px] text-slate-400 mt-1">
                      स्क्रीनशॉट किंवा फोटो अपलोड करा (Max 5MB)
                    </div>
                  </div>
                )}

                {/* Validation Error Message */}
                {hasError && (
                  <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {formErrors[field.id]}
                  </p>
                )}
              </div>
            );
          })}

          {/* Submit Button */}
          <div className="pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-orange-600 hover:bg-orange-700 active:scale-98 text-white font-bold text-sm shadow-lg shadow-orange-600/20 transition disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  नोंदणी अर्ज सबमिट करा {selectedEvent?.baseAmount > 0 ? `(₹${selectedEvent.baseAmount})` : ""}
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    );
  }