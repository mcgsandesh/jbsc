// src/modules/admin/Events.jsx
import React, { useState, useEffect } from "react";
// src/modules/admin/Events.jsx chya var:
import { 
  Plus, 
  Trash2, 
  Save, 
  Settings2, 
  ListPlus, 
  Layers, 
  Sparkles, 
  ToggleLeft, 
  ToggleRight, 
  Image as ImageIcon,
  Languages,
  QrCode,
  MessageSquareShare,
  Link as LinkIcon,
  Copy
} from "lucide-react";
import { getAllEvents, saveEventSchema } from "../../services/eventService";
import { showSuccess, showError } from "../../utils/alert";

export default function Events() {
  const [lang, setLang] = useState("mr"); // 'mr' = Marathi, 'en' = English
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const [slug, setSlug] = useState(""); // Custom URL Slug (e.g. dipotsav-26)

  // इव्हेंट मूलभूत माहिती
  const [eventId, setEventId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [year, setYear] = useState(2026);
  const [baseAmount, setBaseAmount] = useState(0);
  const [isActive, setIsActive] = useState(true);

  // UPI पेमेंट सेटिंग्स
  const [upiId, setUpiId] = useState("");
  const [payeeName, setPayeeName] = useState("");

  // व्हॉट्सॲप मेसेज टेम्पलेट
  const [whatsappTemplate, setWhatsappTemplate] = useState("");

  // डायनॅमिक फॉर्म फील्ड्स
  const [fields, setFields] = useState([]);

  // नवीन फील्डसाठी तात्पुरती स्टेट
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");
  const [newFieldRequired, setNewFieldRequired] = useState(true);
  const [newFieldOptions, setNewFieldOptions] = useState("");
  const [newFieldValidation, setNewFieldValidation] = useState("none");

  // डिक्शनरी (मराठी व इंग्रजी)
  const t = {
    mr: {
      pageTitle: "डायनॅमिक इव्हेंट व फॉर्म बिल्डर",
      pageSub: "Google Forms प्रमाणे फील्ड्स, UPI पेमेंट आणि WhatsApp टेम्पलेट सेट करा",
      newEventBtn: "नवीन इव्हेंट फॉर्म बनवा",
      noEvents: "कोणताही इव्हेंट सापडला नाही. नवीन इव्हेंट तयार करा.",
      loading: "इव्हेंट्स लोड होत आहेत...",
      year: "वर्ष",
      live: "सक्रिय (Live)",
      closed: "बंद",
      fee: "नोंदणी फी",
      fieldsCount: "फॉर्म फील्ड्स",
      editForm: "फॉर्म एडिट करा",
      sec1: "१. इव्हेंटची मूलभूत माहिती व बॅनर",
      eventTitle: "इव्हेंटचे नाव (Title)",
      eventTitlePh: "उदा. जेबीएससी दीपोत्सव २०२६ किंवा बॉक्स क्रिकेट चषक २०२६",
      regFee: "नोंदणी फी (₹)",
      bannerPh: "https://example.com/poster.jpg (बॅनर इमेज लिंक)",
      descLabel: "इव्हेंटचे नियम व माहिती (Description)",
      descPh: "इव्हेंटचे नियम, वेळ, पत्ता आणि महत्त्वाची माहिती येथे लिहा...",
      activeToggle: "हा फॉर्म लोकांच्या नोंदणीसाठी सुरू (Active) ठेवा",
      
      secUpi: "२. UPI पेमेंट तपशील (ऑनलाइन देणगी / फी)",
      upiIdLabel: "UPI आयडी (VPA)",
      upiIdPh: "उदा. jbsc@upi किंवा 9876543210@ybl",
      payeeLabel: "प्राप्तकर्त्याचे नाव (Payee Name)",
      payeePh: "उदा. Jagewala Baba Sports Club",

      secWa: "३. व्हॉट्सॲप मेसेज टेम्पलेट (WhatsApp Quick Response)",
      waLabel: "पूर्वनियोजित मेसेज (Pre-typed Message)",
      waPh: "नमस्कार {name}, {event} साठी आपली नोंदणी मिळाली आहे. आपली नोंदणी फी ₹{amount} असून स्थिती {status} आहे. धन्यवाद - JBSC",
      waHint: "वापरता येणारे शब्द: {name} (नाव), {event} (इव्हेंट), {amount} (रक्कम), {status} (पेमेंट स्थिती)",

      sec2: "४. या फॉर्ममधील फील्ड्सची यादी",
      required: "आवश्यक (Required)",
      optional: "ऐच्छिक (Optional)",
      rule: "नियम",
      options: "पर्याय",
      
      sec3: "५. नवीन फील्ड जोडा (Google Form प्रमाणे)",
      fieldLabel: "फील्डचे नाव (Field Label)",
      fieldLabelPh: "उदा. टी-शर्ट साईझ, खेळाडू प्रकार, पिनकोड",
      fieldType: "फील्ड प्रकार (Type)",
      validationRule: "व्हॅलिडेशन नियम",
      noRule: "कोणताही नियम नाही (साधे)",
      mobileRule: "१० अंकी मोबाईल नंबर (6-9 ने सुरू)",
      pinRule: "६ अंकी पिनकोड",
      textOnlyRule: "फक्त अक्षरे (Alphabet Only)",
      optionsLabel: "पर्याय (स्वल्पविरामाने / Comma ने वेगळे करा)",
      optionsPh: "उदा. S, M, L, XL, XXL किंवा क्रिकेट, धावणे, रस्सीखेच",
      mandatory: "हे फील्ड भरणे अनिवार्य (Mandatory) ठेवा",
      addFieldBtn: "+ फील्ड जोडा",
      cancel: "रद्द करा",
      saveBtn: "इव्हेंट व फॉर्म सेव्ह करा",
    },
    en: {
      pageTitle: "Dynamic Event & Form Builder",
      pageSub: "Configure Google Forms-style fields, UPI payments, and WhatsApp templates",
      newEventBtn: "Create New Event Form",
      noEvents: "No events found. Please create a new event.",
      loading: "Loading events...",
      year: "Year",
      live: "Live",
      closed: "Closed",
      fee: "Registration Fee",
      fieldsCount: "Form Fields",
      editForm: "Edit Form",
      sec1: "1. Event Basic Info & Banner",
      eventTitle: "Event Title",
      eventTitlePh: "e.g. JBSC Dipotsav 2026 or Box Cricket Cup 2026",
      regFee: "Registration Fee (₹)",
      bannerPh: "https://example.com/poster.jpg (Banner Image URL)",
      descLabel: "Event Rules & Description",
      descPh: "Enter event rules, timing, venue, and important guidelines...",
      activeToggle: "Keep form Active for public registrations",

      secUpi: "2. UPI Payment Settings",
      upiIdLabel: "UPI ID (VPA)",
      upiIdPh: "e.g. jbsc@upi or 9876543210@ybl",
      payeeLabel: "Payee Name",
      payeePh: "e.g. Jagewala Baba Sports Club",

      secWa: "3. WhatsApp Message Template",
      waLabel: "Pre-typed Message Template",
      waPh: "Hello {name}, your registration for {event} has been received. Fee: ₹{amount}, Status: {status}. - JBSC",
      waHint: "Placeholders: {name}, {event}, {amount}, {status}",

      sec2: "4. Form Fields List",
      required: "Required",
      optional: "Optional",
      rule: "Rule",
      options: "Options",

      sec3: "5. Add New Field (Google Form Style)",
      fieldLabel: "Field Label",
      fieldLabelPh: "e.g. T-Shirt Size, Player Role, Pincode",
      fieldType: "Field Type",
      validationRule: "Validation Rule",
      noRule: "No Rule (Standard)",
      mobileRule: "10-Digit Mobile (Starts with 6-9)",
      pinRule: "6-Digit Pincode",
      textOnlyRule: "Alphabets Only",
      optionsLabel: "Options (Comma Separated)",
      optionsPh: "e.g. S, M, L, XL, XXL or Cricket, Running, Tug of War",
      mandatory: "Make this field mandatory",
      addFieldBtn: "+ Add Field",
      cancel: "Cancel",
      saveBtn: "Save Event & Form",
    }
  }[lang];

  const fetchEventsList = async () => {
    setLoading(true);
    try {
      const data = await getAllEvents();
      setEvents(data);
    } catch (err) {
      console.error(err);
      showError("Error", "Events load karta aale nahit.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventsList();
  }, []);

  const handleAddNewEvent = () => {
    setEventId(`2026_Event_${Date.now().toString().slice(-4)}`);
    setTitle("");
    setDescription("");
    setBannerUrl("");
    setYear(2026);
    setBaseAmount(0);
    setIsActive(true);
    setUpiId("");
    setPayeeName("Jagewala Baba Sports Club");
    setWhatsappTemplate(
      "सस्नेह जय महाराष्ट्र {name}जी! 🚩\n\nJBSC आयोजित {event} मध्ये आपली नोंदणी यशस्वीरीत्या प्राप्त झाली आहे.\nनोंदणी फी: ₹{amount}\nपेमेंट स्थिती: {status}\n\nकाही अडचण असल्यास कमिटीशी संपर्क साधावा. धन्यवाद!"
    );
    
    // डीफॉल्ट मूलभूत फील्ड्स
    setFields([
      { id: "fullName", label: "पूर्ण नाव (Full Name)", type: "text", required: true, validation: "textOnly" },
      { id: "mobile", label: "व्हॉट्सॲप नंबर (WhatsApp No)", type: "tel", required: true, validation: "mobile10" },
      { id: "address", label: "पत्ता / रूम क्र. (Address)", type: "text", required: false, validation: "none" },
    ]);
    setIsEditing(true);
  };

  const handleAddField = () => {
    if (!newFieldLabel.trim()) {
      showError(lang === "mr" ? "आवश्यक" : "Required", lang === "mr" ? "कृपया फील्डचे नाव टाका." : "Please enter field label.");
      return;
    }

    const fieldKey = newFieldLabel
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]/g, "_")
      .slice(0, 18) + "_" + Date.now().toString().slice(-3);

    const formattedOptions = ["select", "radio", "checkbox"].includes(newFieldType)
      ? newFieldOptions.split(",").map((opt) => opt.trim()).filter(Boolean)
      : [];

    const fieldObject = {
      id: fieldKey,
      label: newFieldLabel.trim(),
      type: newFieldType,
      required: newFieldRequired,
      options: formattedOptions,
      validation: newFieldValidation,
    };

    setFields([...fields, fieldObject]);

    setNewFieldLabel("");
    setNewFieldType("text");
    setNewFieldRequired(true);
    setNewFieldOptions("");
    setNewFieldValidation("none");
  };

  const handleRemoveField = (fieldId) => {
    setFields(fields.filter((f) => f.id !== fieldId));
  };

  const handleSaveFullEvent = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      showError(lang === "mr" ? "अपूर्ण माहिती" : "Incomplete", lang === "mr" ? "कृपया इव्हेंटचे नाव टाका." : "Please enter event title.");
      return;
    }

    const finalSlug = slug.trim() 
        ? slug.trim().toLowerCase().replace(/[^a-zA-Z0-9-]/g, "")
        : `event-${Date.now().toString().slice(-4)}`;

    try {
      const payload = {
        title: title.trim(),
        slug: finalSlug, // <-- Ha navin slug
        description: description.trim(),
        bannerUrl: bannerUrl.trim(),
        year: Number(year),
        baseAmount: Number(baseAmount),
        isActive: Boolean(isActive),
        upiSettings: {
          upiId: upiId.trim(),
          payeeName: payeeName.trim(),
        },
        whatsappTemplate: whatsappTemplate.trim(),
        fields: fields,
      };

      await saveEventSchema(eventId, payload);
      showSuccess(lang === "mr" ? "यशस्वी!" : "Success!", lang === "mr" ? "इव्हेंट, UPI व WhatsApp टेम्पलेट जतन झाले." : "Event saved successfully.");
      setIsEditing(false);
      fetchEventsList();
    } catch (err) {
      console.error(err);
      showError("Error", "Event save kartana adchan aali.");
    }
  };

  const handleEditExisting = (item) => {
    setEventId(item.id);
    setTitle(item.title || "");
    setDescription(item.description || "");
    setBannerUrl(item.bannerUrl || "");
    setYear(item.year || 2026);
    setBaseAmount(item.baseAmount || 0);
    setIsActive(item.isActive !== undefined ? item.isActive : true);
    setUpiId(item.upiSettings?.upiId || "");
    setPayeeName(item.upiSettings?.payeeName || "Jagewala Baba Sports Club");
    setWhatsappTemplate(item.whatsappTemplate || "");
    setFields(item.fields || []);
    setIsEditing(true);
  };

  return (
    <div className="w-full space-y-6 font-sans">
      
      {/* Top Header Banner with Language Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-50 text-orange-600 border border-orange-100">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {t.pageTitle}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.pageSub}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setLang(lang === "mr" ? "en" : "mr")}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer border border-slate-200"
            title="भाषा बदला"
          >
            <Languages className="w-4 h-4 text-orange-600" />
            <span>{lang === "mr" ? "English" : "मराठी (देवनागरी)"}</span>
          </button>

          {!isEditing && (
            <button
              onClick={handleAddNewEvent}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-orange-600/20 active:scale-95 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" /> {t.newEventBtn}
            </button>
          )}
        </div>
      </div>

      {/* Mode 1: Event List View */}
      {!isEditing && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full py-16 text-center text-slate-400 text-sm">
              <div className="w-6 h-6 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              {t.loading}
            </div>
          ) : events.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
              {t.noEvents}
            </div>
          ) : (
            events.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
                {item.bannerUrl ? (
                  <div className="h-32 w-full bg-slate-100 overflow-hidden border-b border-slate-100">
                    <img src={item.bannerUrl} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                ) : null}
                
                <div className="p-5 flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-100">
                      {t.year} {item.year}
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${item.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                      {item.isActive ? t.live : t.closed}
                    </span>
                  </div>

                  <h3 className="font-black text-lg text-slate-900">{item.title}</h3>
                  {item.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                  )}

                  <div className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100 space-y-1">
                    <div>{t.fee}: <strong className="text-slate-800">₹{item.baseAmount || 0}</strong></div>
                    <div>UPI ID: <strong className="text-slate-800">{item.upiSettings?.upiId || "सेट नाही"}</strong></div>
                    <div>{t.fieldsCount}: <strong className="text-slate-800">{item.fields?.length || 0}</strong></div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
                  <button
                    onClick={() => handleEditExisting(item)}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-200 hover:border-orange-500 text-xs font-bold text-slate-700 hover:text-orange-600 bg-white transition cursor-pointer"
                  >
                    {t.editForm}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Mode 2: Live Form Builder Editor */}
      {isEditing && (
        <div className="space-y-6">
          
          {/* Section 1: Basic Info & Banner */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-orange-600" />
              {t.sec1}
            </h3>

            
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.eventTitle} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={t.eventTitlePh}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.regFee}</label>
                <input
                  type="number"
                  min="0"
                  value={baseAmount}
                  onChange={(e) => setBaseAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-orange-600" /> बॅनर इमेज (Poster URL)
              </label>
              <input
                type="url"
                placeholder={t.bannerPh}
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Custom URL Slug Box */}
                <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-200">
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-orange-600" />
                    Swatantra Nondani Link (Custom URL Slug)
                </label>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-500 bg-white px-3 py-2.5 rounded-xl border border-slate-200">
                    {window.location.origin}/#/
                    </span>
                    <input
                    type="text"
                    placeholder="dipotsav-26 kiva cricket-26"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-zA-Z0-9-]/g, ""))}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-mono font-bold text-orange-600 focus:outline-none focus:border-orange-500"
                    />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                    * Hi link tumhi WhatsApp var share karu shakta (Uda. #/dipotsav-26).
                </p>
                </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.descLabel}
              </label>
              <textarea
                rows="3"
                placeholder={t.descPh}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer"
              >
                {isActive ? (
                  <ToggleRight className="w-6 h-6 text-emerald-600" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-slate-400" />
                )}
                {t.activeToggle}
              </button>
            </div>
          </div>

          {/* Section 2: UPI Payment Details */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-600" />
              {t.secUpi}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.upiIdLabel}
                </label>
                <input
                  type="text"
                  placeholder={t.upiIdPh}
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.payeeLabel}
                </label>
                <input
                  type="text"
                  placeholder={t.payeePh}
                  value={payeeName}
                  onChange={(e) => setPayeeName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              * येथे भरलेल्या UPI आयडीनुसार पब्लिक फॉर्मवर "Pay with UPI" लिंक आणि QR कोड आपोआप तयार होईल.
            </p>
          </div>

          {/* Section 3: WhatsApp Template */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <MessageSquareShare className="w-5 h-5 text-green-600" />
              {t.secWa}
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.waLabel}
              </label>
              <textarea
                rows="4"
                placeholder={t.waPh}
                value={whatsappTemplate}
                onChange={(e) => setWhatsappTemplate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-green-500 font-sans"
              />
              <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
                {t.waHint}
              </p>
            </div>
          </div>

          {/* Section 4: Current Fields List */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-600" />
              {t.sec2} ({fields.length})
            </h3>

            <div className="space-y-2.5">
              {fields.map((f, index) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <div>
                      <div className="text-sm font-bold text-slate-900">{f.label}</div>
                      <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                        <span className="uppercase font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 text-[10px]">
                          {f.type}
                        </span>
                        {f.required ? (
                          <span className="text-rose-500 font-semibold">• {t.required}</span>
                        ) : (
                          <span className="text-slate-400">• {t.optional}</span>
                        )}
                        {f.validation && f.validation !== "none" && (
                          <span className="text-blue-600 font-semibold">• {t.rule}: {f.validation}</span>
                        )}
                        {f.options?.length > 0 && (
                          <span className="text-slate-600">• {t.options}: {f.options.join(", ")}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveField(f.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Add New Field Component */}
          <div className="bg-orange-50/50 border border-orange-200/80 p-6 rounded-2xl space-y-4">
            <h3 className="font-bold text-base text-orange-950 flex items-center gap-2">
              <ListPlus className="w-5 h-5 text-orange-600" />
              {t.sec3}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.fieldLabel}
                </label>
                <input
                  type="text"
                  placeholder={t.fieldLabelPh}
                  value={newFieldLabel}
                  onChange={(e) => setNewFieldLabel(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.fieldType}
                </label>
                <select
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-orange-500 font-medium"
                >
                  <option value="text">Short Text (नाव / लहान मजकूर)</option>
                  <option value="number">Number (वय / संख्या)</option>
                  <option value="tel">Phone (मोबाईल नंबर)</option>
                  <option value="textarea">Paragraph / मोठा पत्ता</option>
                  <option value="select">Dropdown (पर्याय निवडा)</option>
                  <option value="radio">Radio Buttons (एकच पर्याय)</option>
                  <option value="checkbox">Checkbox List (अनेक पर्याय)</option>
                  <option value="file">File Upload (स्क्रीनशॉट / फोटो)</option>
                </select>
              </div>

              {/* Validation Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.validationRule}
                </label>
                <select
                  value={newFieldValidation}
                  onChange={(e) => setNewFieldValidation(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-orange-500 font-medium"
                >
                  <option value="none">{t.noRule}</option>
                  <option value="mobile10">{t.mobileRule}</option>
                  <option value="pin6">{t.pinRule}</option>
                  <option value="textOnly">{t.textOnlyRule}</option>
                </select>
              </div>
            </div>

            {/* Options Input for Select / Radio / Checkbox */}
            {["select", "radio", "checkbox"].includes(newFieldType) && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.optionsLabel}
                </label>
                <input
                  type="text"
                  placeholder={t.optionsPh}
                  value={newFieldOptions}
                  onChange={(e) => setNewFieldOptions(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newFieldRequired}
                  onChange={(e) => setNewFieldRequired(e.target.checked)}
                  className="w-4 h-4 rounded text-orange-600 focus:ring-0"
                />
                {t.mandatory}
              </label>

              <button
                type="button"
                onClick={handleAddField}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                {t.addFieldBtn}
              </button>
            </div>
          </div>

          {/* Action Bottom Bar */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={handleSaveFullEvent}
              className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-orange-600/20 active:scale-95 transition cursor-pointer"
            >
              <Save className="w-4 h-4" /> {t.saveBtn}
            </button>
          </div>

        </div>
      )}

    </div>
  );
}