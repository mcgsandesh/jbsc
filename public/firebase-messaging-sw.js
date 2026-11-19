// public/firebase-messaging-sw.js

console.log("🚀 [SW] Service Worker script starting execution...");

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

console.log("📦 [SW] Firebase compat scripts imported successfully.");

try {
  // ⚠️ खात्री करा की इथे तुमच्या खऱ्या Firebase कीज आहेत (xxx नाही)
// GitHub Pages साठी इथे तुमच्या Firebase च्या पब्लिक कीज टाका
firebase.initializeApp({
  apiKey: "AIzaSyCxmYvJdsWdk6Yr-QkYgBfH-9YkHtQeiAo",
  authDomain: "jbsc-events-app.firebaseapp.com",
  projectId: "jbsc-events-app",
  storageBucket: "jbsc-events-app.firebasestorage.app",
  messagingSenderId: "21345813425",
  appId: "1:21345813425:web:f0c95da417003ca4c3f390"
});


  console.log("🔥 [SW] Firebase App initialized successfully inside Service Worker!");
} catch (initErr) {
  console.error("❌ [SW] Firebase initialization error:", initErr);
}

const messaging = firebase.messaging();
console.log("messaging [SW] Firebase Messaging instance created.");

messaging.onBackgroundMessage((payload) => {
  console.log('📩 [SW] Background message received:', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: './favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});