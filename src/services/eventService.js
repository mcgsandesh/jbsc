// src/services/eventService.js
import { db } from "../config/firebase";
import { collection, doc, getDocs, getDoc, setDoc, deleteDoc } from "firebase/firestore";

// Sarv events chi list aannyasathi
export const getAllEvents = async () => {
  const snap = await getDocs(collection(db, "events"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// Event fetch karne (ID varun)
export const getEventById = async (eventId) => {
  const ref = doc(db, "events", eventId);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

// Event create / update karne
export const saveEventSchema = async (eventId, eventData) => {
  const ref = doc(db, "events", eventId);
  return await setDoc(ref, {
    ...eventData,
    updatedAt: new Date().toISOString()
  }, { merge: true });
};

// Event delete karne
export const deleteEvent = async (eventId) => {
  const ref = doc(db, "events", eventId);
  return await deleteDoc(ref);
};