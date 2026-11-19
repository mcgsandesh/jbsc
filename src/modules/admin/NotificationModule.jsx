// src/modules/admin/NotificationModule.jsx
import React, { useState } from "react";
import { Bell, Send, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { db } from "../../config/firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { showSuccess, showError } from "../../utils/alert";

export default function NotificationModule() {
  const { isSuperAdmin } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  // जर सुपरअॅडमिन नसेल तर मेसेज दाखवणे
  if (!isSuperAdmin) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-lg mx-auto mt-10 space-y-3">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-black text-slate-900">प्रवेश निषिद्ध (Access Denied)</h2>
        <p className="text-xs text-slate-500">
          पुश नोटिफिकेशन मॉड्यूल वापरण्याचा अधिकार फक्त Superadmin कडे आहे.
        </p>
      </div>
    );
  }

  // नोटिफिकेशन पाठवण्याची मुख्य फंक्शन
  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      showError("त्रुटी", "कृपया शीर्षक आणि संदेश दोन्ही भरा.");
      return;
    }

    setLoading(true);
    try {
      // १. Firestore मधील 'fcmTokens' मधून सर्व युझर्सचे टोकन गोळा करणे
      const tokensSnap = await getDocs(collection(db, "fcmTokens"));
      const tokens = [];
      tokensSnap.forEach((doc) => {
        const data = doc.data();
        if (data.token) tokens.push(data.token);
      });

      console.log("Found FCM Tokens:", tokens.length);

      // २. हिस्टरीत रेकॉर्ड जतन करणे
      await addDoc(collection(db, "sentNotifications"), {
        title,
        body,
        sentAt: new Date().toISOString(),
        totalTokens: tokens.length,
      });

      showSuccess("यशस्वी!", `${tokens.length} डिव्हाइसवर नोटिफिकेशन पाठवली जात आहे.`);
      setTitle("");
      setBody("");
    } catch (err) {
      console.error("Error sending notification:", err);
      showError("त्रुटी", "नोटिफिकेशन पाठवताना अडचण आली.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6 pb-10">
      
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-50 text-orange-600 border border-orange-100">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              पुश नोटिफिकेशन व्यवस्थापन (Notifications)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              ॲप इन्स्टॉल केलेल्या सर्व युझर्सना थेट मोबाईल/ब्राउझरवर महत्त्वाच्या घोषणा पाठवा.
            </p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-2xl">
        <form onSubmit={handleSendNotification} className="space-y-4">
          
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              नोटिफिकेशनचे शीर्षक (Title)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="उदा. JBSC दीपोत्सव २०२६ लाइव्ह ड्रॉ सुरू झाला!"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-orange-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              संदेश (Message / Body)
            </label>
            <textarea
              rows="4"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="सर्व सदस्यांनी मैदानावर वेळेवर उपस्थित राहावे..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:bg-white focus:border-orange-500 resize-none"
              required
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black shadow-lg shadow-orange-600/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>पाठवत आहे...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>सर्व युझर्सना नोटिफिकेशन पाठवा</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>

    </div>
  );
}