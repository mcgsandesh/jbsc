// src/components/common/NotificationButton.jsx
import React, { useState } from "react";
import { Bell } from "lucide-react";
import { requestNotificationPermission } from "../../services/fcmService";
import { showSuccess, showError } from "../../utils/alert";

export default function NotificationButton() {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const token = await requestNotificationPermission();
      if (token) {
        showSuccess("यशस्वी!", "महत्त्वाच्या सूचनांचे अपडेट्स आता सुरू झाले आहेत.");
      }
    } catch (err) {
      console.error("Caught error in NotificationButton:", err);
      // आता आपण जेनेरिक मेसेज ऐवजी नक्की काय एरर आलाय तो दाखवणार
      showError("FCM एरर", err.message || "नोटिफिकेशन सुरू करताना तांत्रिक अडचण आली.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="my-4 text-center">
      <button
        onClick={handleSubscribe}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 text-white text-xs sm:text-sm font-black shadow-lg shadow-orange-600/20 hover:shadow-xl transition transform active:scale-95 cursor-pointer"
      >
        <Bell className="w-4 h-4 animate-bounce text-orange-200" />
        <span>
          {loading ? "सुरू होत आहे..." : "🔔 महत्त्वाच्या सूचनांचे अपडेट्स मिळवण्यासाठी येथे क्लिक करा"}
        </span>
      </button>
    </div>
  );
}