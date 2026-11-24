// src/services/playerMasterService.js
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp,
  arrayUnion
} from "firebase/firestore";
import { db } from "../config/firebase";

const CACHE_PREFIX = "jbsc_mp_";

export function normalizeMobile10(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

export function normalizeGmail(raw) {
  return String(raw || "").trim().toLowerCase();
}

export function isJbscManagedEvent(eventObj) {
  if (!eventObj) return false;
  if (eventObj.enableMasterProfile === true) return true;
  const hay = `${eventObj.organizer || ""} ${eventObj.title || ""} ${eventObj.slug || ""}`.toLowerCase();
  return hay.includes("jbsc") || hay.includes("boxt20") || hay.includes("jagewala");
}

async function getNextEasyPlayerId() {
  const snap = await getDocs(collection(db, "master_players"));
  let maxSeq = 100;
  snap.forEach((d) => {
    const pid = String(d.data()?.playerId || "");
    const match = pid.match(/(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxSeq) maxSeq = num;
    }
  });
  return `JBSC-${maxSeq + 1}`;
}

/**
 * 1-Read Lookup: फक्त 10 अंकी मोबाईल नंबरवर 1 getDoc + sessionStorage cache
 */
export async function lookupJbscPlayerByMobile(rawMobile) {
  const mobile = normalizeMobile10(rawMobile);
  if (mobile.length !== 10) return null;

  try {
    const cached = sessionStorage.getItem(`${CACHE_PREFIX}${mobile}`);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // ignore storage errors
  }

  const ref = doc(db, "master_players", mobile);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const data = { id: snap.id, ...snap.data() };
  try {
    sessionStorage.setItem(`${CACHE_PREFIX}${mobile}`, JSON.stringify(data));
  } catch {
    // ignore
  }
  return data;
}

/**
 * फक्त कोर खेळाडू माहिती (नाव, मोबाईल, Gmail, रोल, फोटो, ऐच्छिक Birthdate/BloodGroup, Easy Player ID) सेव्ह/अपडेट करणे
 */
export async function upsertJbscMasterPlayer({
  mobile,
  gmail,
  fullName,
  role,
  photoUrl,
  birthDate,
  bloodGroup,
  eventId
}) {
  const cleanMobile = normalizeMobile10(mobile);
  if (cleanMobile.length !== 10 || !fullName?.trim()) return null;

  const ref = doc(db, "master_players", cleanMobile);
  const existingSnap = await getDoc(ref);
  const existing = existingSnap.exists() ? existingSnap.data() : null;

  const playerId = existing?.playerId || (await getNextEasyPlayerId());
  const cleanGmail = normalizeGmail(gmail) || existing?.gmail || "";
  const finalPhoto = (photoUrl || "").trim() || existing?.photoUrl || "";
  const cleanBirthDate = (birthDate || "").trim() || existing?.birthDate || "";
  const cleanBloodGroup = (bloodGroup || "").trim() || existing?.bloodGroup || "";

  const payload = {
    playerId,
    mobile: cleanMobile,
    gmail: cleanGmail,
    fullName: fullName.trim(),
    role: (role || existing?.role || "All-rounder").trim(),
    photoUrl: finalPhoto,
    birthDate: cleanBirthDate,
    bloodGroup: cleanBloodGroup,
    isJbscMember: true,
    careerStats: existing?.careerStats || {
      matches: 0,
      runs: 0,
      wickets: 0,
      highestScore: 0,
      bestBowling: "-",
      strikeRate: ""
    },
    updatedAt: serverTimestamp()
  };

  if (eventId) {
    payload.eventIds = arrayUnion(eventId);
  }

  await setDoc(ref, payload, { merge: true });

  try {
    sessionStorage.setItem(
      `${CACHE_PREFIX}${cleanMobile}`,
      JSON.stringify({ id: cleanMobile, ...payload })
    );
  } catch {
    // ignore
  }

  return {
    playerId,
    photoUrl: finalPhoto,
    gmail: cleanGmail
  };
}

/**
 * CSV मधून एकदाच Master Players भरणे आणि सोपा ID (उदा. JBSC-101) देणे
 * Columns: Full_Name, Mobile, Gmail, Role, Photo_URL, Birthdate, Blood_Group
 */
export async function importJbscMasterPlayersCsv(csvText) {
  const lines = String(csvText || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error("कृपया CSV डेटा पेस्ट करा.");
  }

  const snap = await getDocs(collection(db, "master_players"));
  let maxSeq = 100;
  snap.forEach((d) => {
    const pid = String(d.data()?.playerId || "");
    const match = pid.match(/(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxSeq) maxSeq = num;
    }
  });

  let count = 0;

  for (const line of lines) {
    const cols = line.split(",").map((c) => c.trim());
    const firstLower = (cols[0] || "").toLowerCase();
    if (
      !cols[0] ||
      firstLower === "full_name" ||
      firstLower === "name" ||
      cols[0] === "नाव"
    ) {
      continue;
    }

    const fullName = cols[0];
    const mobile = normalizeMobile10(cols[1]);
    if (mobile.length !== 10) {
      console.warn("Invalid mobile skipped:", line);
      continue;
    }

    const gmail = normalizeGmail(cols[2]);
    const role = cols[3] || "All-rounder";
    const photoUrl = cols[4] || "";
    const birthDate = cols[5] || "";
    const bloodGroup = cols[6] || "";

    const playerRef = doc(db, "master_players", mobile);
    const existingSnap = await getDoc(playerRef);
    const existing = existingSnap.exists() ? existingSnap.data() : null;

    let playerId = existing?.playerId;
    if (!playerId) {
      maxSeq += 1;
      playerId = `JBSC-${maxSeq}`;
    }

    const record = {
      playerId,
      mobile,
      gmail: gmail || existing?.gmail || "",
      fullName,
      role: cols[3] ? role : existing?.role || "All-rounder",
      photoUrl: photoUrl || existing?.photoUrl || "",
      birthDate: birthDate || existing?.birthDate || "",
      bloodGroup: bloodGroup || existing?.bloodGroup || "",
      isJbscMember: true,
      careerStats: existing?.careerStats || {
        matches: 0,
        runs: 0,
        wickets: 0,
        highestScore: 0,
        bestBowling: "-",
        strikeRate: ""
      },
      updatedAt: serverTimestamp()
    };

    await setDoc(playerRef, record, { merge: true });

    try {
      sessionStorage.setItem(
        `${CACHE_PREFIX}${mobile}`,
        JSON.stringify({ id: mobile, ...record })
      );
    } catch {
      // ignore
    }
    count += 1;
  }

  return count;
}