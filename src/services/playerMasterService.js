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

// src/services/playerMasterService.js च्या शेवटी हे फंक्शन्स जोडा

const ALL_MP_CACHE_KEY = "jbsc_mp_all_cache_v1";
const ALL_MP_CACHE_TTL = 2 * 60 * 1000; // 2 मिनिटे कॅशे

export function normalizePlayerIdCode(rawCode) {
  const cleaned = String(rawCode || "").trim().toUpperCase();
  if (!cleaned) return "";
  if (/^\d+$/.test(cleaned)) {
    return `JBSC-${cleaned}`;
  }
  const match = cleaned.match(/^JBSC[-_\s]*(\d+)$/i);
  if (match) {
    return `JBSC-${match[1]}`;
  }
  return cleaned;
}

export async function getCachedMasterPlayers() {
  try {
    const raw = sessionStorage.getItem(ALL_MP_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Date.now() - parsed.ts < ALL_MP_CACHE_TTL && Array.isArray(parsed.list)) {
        return parsed.list;
      }
    }
  } catch {
    // ignore cache error
  }

  const snap = await getDocs(collection(db, "master_players"));
  const list = [];
  snap.forEach((d) => {
    list.push({ id: d.id, ...d.data() });
  });

  try {
    sessionStorage.setItem(
      ALL_MP_CACHE_KEY,
      JSON.stringify({ ts: Date.now(), list })
    );
  } catch {
    // ignore cache error
  }
  return list;
}

/**
 * Player ID (उदा. "153" किंवा "JBSC-153"), नाव (उदा. "Prashant Gaonkar") किंवा Mobile वरून शोधणे
 */
export async function searchJbscMasterPlayers(queryText) {
  const q = String(queryText || "").trim();
  if (!q) return [];

  const normalizedCode = normalizePlayerIdCode(q);
  const qLower = q.toLowerCase();
  const mobDigits = normalizeMobile10(q);

  // 1. आधी 10 अंकी मोबाईल असेल तर थेट 1-doc lookup
  if (mobDigits.length === 10) {
    const direct = await lookupJbscPlayerByMobile(mobDigits);
    if (direct) return [direct];
  }

  // 2. Player ID किंवा नावावरून cached/backend master_players मधून शोधणे
  const all = await getCachedMasterPlayers();
  return all.filter((p) => {
    const pidUpper = String(p.playerId || "").trim().toUpperCase();
    const nameLower = String(p.fullName || p.name || "").trim().toLowerCase();
    const pMob = normalizeMobile10(p.mobile);

    const codeMatch =
      Boolean(normalizedCode) &&
      (pidUpper === normalizedCode || pidUpper.includes(q.toUpperCase()));
    const nameMatch = Boolean(qLower) && nameLower.includes(qLower);
    const mobMatch = Boolean(mobDigits) && pMob.includes(mobDigits);

    return codeMatch || nameMatch || mobMatch;
  });
}