// src/services/fcmService.js
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { app, db } from "../config/firebase";
import { doc, setDoc } from "firebase/firestore";

const messaging = getMessaging(app);

let isRequestingToken = false;

export const requestNotificationPermission = async (userId = "guest") => {
  if (isRequestingToken) {
    console.log("⚠️ Token request is already in progress...");
    return;
  }
  isRequestingToken = true;

  try {
    console.log("🔍 STEP 1: Requesting browser notification permission...");
    const permission = await Notification.requestPermission();
    console.log("🔍 STEP 2: Browser permission result:", permission);

    if (permission === "granted") {
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      console.log("🔍 STEP 3: VAPID Key check:", vapidKey ? `Present (Length: ${vapidKey.length})` : "❌ MISSING VAPID KEY!");
      
      if (!vapidKey) {
        throw new Error("VITE_FIREBASE_VAPID_KEY is missing in .env file!");
      }

      console.log("🔍 STEP 4: Registering Service Worker...");
      let registration = null;
      if ('serviceWorker' in navigator) {
        const swUrl = `${import.meta.env.BASE_URL}firebase-messaging-sw.js`;
        registration = await navigator.serviceWorker.register(swUrl);
        console.log("✅ STEP 4.1: Service Worker registered with scope:", registration.scope);
        
        await navigator.serviceWorker.ready;
        console.log("✅ STEP 4.2: Service Worker is fully ready!");
      } else {
        throw new Error("Service workers are not supported in this browser.");
      }

      console.log("🔍 STEP 5: Calling Firebase getToken() with 10s Timeout...");
      
      //getToken आणि 10 सेकंदांचा Timeout तयार करणे
      const getTokenPromise = getToken(messaging, { 
        vapidKey,
        serviceWorkerRegistration: registration 
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("getToken() timed out after 10 seconds. (Check if VAPID Key & Firebase Project ID match properly!)")), 10000)
      );

      const token = await Promise.race([getTokenPromise, timeoutPromise]);

      if (token) {
        console.log("🔥 STEP 6: SUCCESS! FCM Token received:", token);
        await saveTokenToFirestore(token, userId);
        return token;
      } else {
        throw new Error("Firebase returned empty token (getToken() returned null/undefined).");
      }
    } else {
      throw new Error(`Permission not granted by user. Status: ${permission}`);
    }
  } catch (error) {
    console.error("❌ CRITICAL FCM ERROR:", error.code || error.message, error);
    throw error;
  } finally {
    isRequestingToken = false;
  }
};

const saveTokenToFirestore = async (token, userId) => {
  try {
    console.log("🔍 STEP 7: Saving token to Firestore...");
    const tokenRef = doc(db, "fcmTokens", token);
    await setDoc(tokenRef, {
      token: token,
      userId: userId,
      updatedAt: new Date().toISOString(),
      platform: "web-github-pages"
    }, { merge: true });
    console.log("✅ STEP 8: FCM Token successfully saved to Firestore `fcmTokens` collection!");
  } catch (err) {
    console.error("❌ Firestore Save Error:", err.message, err);
    throw err;
  }
};

export const onForegroundMessage = () => {
  onMessage(messaging, (payload) => {
    console.log("Foreground message received:", payload);
    const { title, body } = payload.notification || {};
    if (title) {
      new Notification(title, { body, icon: './favicon.ico' });
    }
  });
};