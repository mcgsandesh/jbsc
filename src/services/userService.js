// src/services/userService.js
import { db } from "../config/firebase";
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

// Sarv users chi list aannyasathi
export const getAllAdmins = async () => {
  const querySnapshot = await getDocs(collection(db, "users"));
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

// Navin admin jodnyasathi / Update karnyasathi
export const saveAdminUser = async (email, userData) => {
  const cleanEmail = email.trim().toLowerCase();
  const userRef = doc(db, "users", cleanEmail);
  return await setDoc(userRef, {
    ...userData,
    email: cleanEmail,
    updatedAt: new Date().toISOString()
  }, { merge: true });
};

// Status toggle karne (Active / Inactive)
export const toggleAdminStatus = async (email, currentStatus) => {
  const userRef = doc(db, "users", email);
  return await updateDoc(userRef, { active: !currentStatus });
};

// Admin delete karne
export const deleteAdminUser = async (email) => {
  const userRef = doc(db, "users", email);
  return await deleteDoc(userRef);
};