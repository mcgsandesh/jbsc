// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, db } from "../config/firebase";
import { 
  onAuthStateChanged, 
  setPersistence, 
  browserLocalPersistence 
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // १. लोकल पर्सिस्टन्स सेट करणे (टॅब बंद केला किंवा पेज बदलले तरी लॉगिन कायम राहते)
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.warn("Auth persistence error:", err);
    });
  }, []);

  // २. ऑथ स्टेट श्रोता (Auth State Listener)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
        const userEmail = user.email.trim().toLowerCase();
        
        try {
          // ईमेल आयडीवरून Firestore मधील ॲडमिन माहिती तपासणे
          const userRef = doc(db, "users", userEmail);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const data = userSnap.data();
            
            // युजर सक्रिय (active) आहे की नाही ते तपासणे
            if (data.active !== false) {
              setCurrentUser({
                uid: user.uid,
                name: data.name || user.displayName || "Admin",
                email: userEmail,
                avatar: user.photoURL || null,
                role: (data.role || "volunteer").toLowerCase(),
                assignedEvents: data.assignedEvents || [],
              });
            } else {
              console.warn("User account is inactive.");
              setCurrentUser(null);
            }
          } else {
            // Firestore मध्ये डॉक न सापडल्यास तात्पुरता ऑथ युजर रोखणे
            console.warn(`Firestore user doc not found for: ${userEmail}`);
            setCurrentUser(null);
          }
        } catch (err) {
          console.error("Firestore user fetch error:", err);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // सुपरॲडमिन तपासणी
  const isSuperAdmin = currentUser?.role === "superadmin";

  // इव्हेंट ॲक्सेस तपासणी
  const hasEventAccess = (eventId) => {
    if (!currentUser) return false;
    if (currentUser.role === "superadmin") return true;
    return currentUser.assignedEvents?.includes(eventId);
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, isSuperAdmin, hasEventAccess }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);