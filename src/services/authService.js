// src/services/authService.js
import { auth, googleProvider, db } from "../config/firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { showError } from "../utils/alert";

// Google Popup Login & Permission Check
export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const userEmail = user.email.toLowerCase();

    // Firestore मधील 'users' collection मध्ये ईमेल तपासणे
    const userRef = doc(db, "users", userEmail);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await signOut(auth);
      showError("प्रवेश नाकारला", "हा ईमेल ऍडमिन म्हणून नोंदणीकृत नाही. कृपया सुपर ऍडमिनशी संपर्क साधा.");
      return null;
    }

    const userData = userSnap.data();

    if (!userData.active) {
      await signOut(auth);
      showError("खाते निष्क्रिय आहे", "तुमचे ऍडमिन खाते निष्क्रिय (Inactive) करण्यात आले आहे.");
      return null;
    }

    const adminData = {
      uid: user.uid,
      name: user.displayName,
      email: userEmail,
      avatar: user.photoURL,
      role: userData.role || "admin", // 'superadmin' | 'admin'
      assignedEvents: userData.assignedEvents || [], // ['2026_Dipotsav'] किंवा ['all']
    };

    // Firestore Reads वाचवण्यासाठी sessionStorage मध्ये कॅश करणे
    sessionStorage.setItem("jbsc_admin_user", JSON.stringify(adminData));

    return adminData;
  } catch (error) {
    console.error("Login Error:", error);
    showError("लॉगिन अयशस्वी", error.message);
    return null;
  }
};

// Logout Function
export const logoutUser = async () => {
  try {
    await signOut(auth);
    sessionStorage.removeItem("jbsc_admin_user");
  } catch (error) {
    console.error("Logout Error:", error);
  }
};