// src/services/auctionService.js
import { db } from "../config/firebase";
import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  onSnapshot, runTransaction
} from "firebase/firestore";

export const DEFAULT_INCREMENT_SLABS = [
  { upTo: 10000, step: 500 },
  { upTo: 25000, step: 1000 },
  { upTo: null, step: 2500 }
];

// दिलेल्या रकमेनुसार पुढची बोली किती ने वाढणार ते ठरवणे
export function getBidIncrement(currentAmount, slabs = DEFAULT_INCREMENT_SLABS) {
  const sorted = [...slabs].sort((a, b) => {
    if (a.upTo === null || a.upTo === undefined) return 1;
    if (b.upTo === null || b.upTo === undefined) return -1;
    return a.upTo - b.upTo;
  });

  for (const slab of sorted) {
    if (slab.upTo === null || slab.upTo === undefined || currentAmount <= Number(slab.upTo)) {
      return Number(slab.step) || 500;
    }
  }
  return 500;
}

// संघाची कमाल सुरक्षित बोली (उरलेले किमान खेळाडू लक्षात घेऊन)
export function getMaxAllowedBid(team, auction, nextBasePrice = 0) {
  const remainingPurse = Number(team?.remainingPurse ?? 0);
  const minPlayers = Number(auction?.minPlayers ?? 1);
  const currentCount = Number(team?.playersCount ?? 0);
  const floorPrice = Number(auction?.basePrice ?? nextBasePrice ?? 0);

  const remainingSlotsAfterThis = Math.max(0, minPlayers - currentCount - 1);
  const reservedForOthers = remainingSlotsAfterThis * floorPrice;

  return Math.max(0, remainingPurse - reservedForOthers);
}

// नवीन ऑक्शन तयार करणे
export async function createAuction(payload) {
  const docRef = await addDoc(collection(db, "auctions"), {
    title: payload.title.trim(),
    organizer: (payload.organizer || "JBSC").trim(),
    status: "draft",
    totalTeams: Number(payload.totalTeams) || 6,
    purseAmount: Number(payload.purseAmount) || 100000,
    basePrice: Number(payload.basePrice) || 2000,
    minPlayers: Number(payload.minPlayers) || 7,
    maxPlayers: Number(payload.maxPlayers) || 12,
    incrementSlabs:
      Array.isArray(payload.incrementSlabs) && payload.incrementSlabs.length > 0
        ? payload.incrementSlabs
        : DEFAULT_INCREMENT_SLABS,
    activePlayerId: null,
    currentBid: 0,
    currentBidderTeamId: null,
    bidHistory: [],
    hidePurseOnPublic: Boolean(payload.hidePurseOnPublic) || false,
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

// सर्व ऑक्शन्स मिळवणे
export async function getAllAuctions() {
  const q = query(collection(db, "auctions"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// सिंगल ऑक्शन अपडेट करणे
export async function updateAuction(auctionId, data) {
  await updateDoc(doc(db, "auctions", auctionId), data);
}

// संघ जोडणे (तात्पुरत्या पिनसह)
export async function addAuctionTeam(auctionId, teamData, defaultPurse) {
  const randomPin =
    teamData.accessPin?.trim() ||
    `${(teamData.shortName || "TM").toUpperCase().slice(0, 3)}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;

  const purse = Number(teamData.totalPurse ?? defaultPurse) || 100000;

  const ref = await addDoc(collection(db, "auctions", auctionId, "teams"), {
    name: teamData.name.trim(),
    shortName: (teamData.shortName || teamData.name.slice(0, 2)).toUpperCase(),
    logoUrl: (teamData.logoUrl || "").trim(),
    ownerName: (teamData.ownerName || "").trim(),
    accessPin: randomPin,
    accessEnabled: true,
    totalPurse: purse,
    remainingPurse: purse,
    playersCount: 0,
    createdAt: serverTimestamp()
  });

  return ref.id;
}

export async function getAuctionTeams(auctionId) {
  const snap = await getDocs(collection(db, "auctions", auctionId, "teams"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function deleteAuctionTeam(auctionId, teamId) {
  await deleteDoc(doc(db, "auctions", auctionId, "teams", teamId));
}

// addAuctionPlayer आणि bulkImportPlayers मध्ये हे फील्ड्स समाविष्ट करा:
export async function addAuctionPlayer(auctionId, playerData, defaultBasePrice) {
  const ref = await addDoc(collection(db, "auctions", auctionId, "players"), {
    name: playerData.name.trim(),
    role: playerData.role || "All-rounder",
    pool: (playerData.pool || "A").trim(),
    basePrice: Number(playerData.basePrice ?? defaultBasePrice) || 2000,
    photoUrl: (playerData.photoUrl || "").trim(),
    photoBgTheme: playerData.photoBgTheme || "studio-dark",
    status: "pending",
    soldPrice: null,
    soldToTeamId: null,
    soldToTeamName: null,
    createdAt: serverTimestamp()
  });
  return ref.id;
}

// CSV ओळींमधून बल्क खेळाडू जोडणे: नाव,भूमिका,पूल,बेस_किंमत,फोटो_url
export async function bulkImportPlayers(auctionId, csvText, defaultBasePrice, defaultBgTheme = "studio-dark") {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let count = 0;
  for (const line of lines) {
    const parts = line.split(",").map((p) => p.trim());
    if (!parts[0]) continue;
    if (parts[0].toLowerCase() === "name" || parts[0] === "नाव") continue;

    await addAuctionPlayer(
      auctionId,
      {
        name: parts[0],
        role: parts[1] || "All-rounder",
        pool: parts[2] || "A",
        basePrice: Number(parts[3]) || defaultBasePrice,
        photoUrl: parts[4] || "",
        photoBgTheme: defaultBgTheme
      },
      defaultBasePrice
    );
    count++;
  }
  return count;
}

export async function getAuctionPlayers(auctionId) {
  const snap = await getDocs(collection(db, "auctions", auctionId, "players"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function deleteAuctionPlayer(auctionId, playerId) {
  await deleteDoc(doc(db, "auctions", auctionId, "players", playerId));
}

export async function getAuctionById(auctionId) {
  const snap = await getDoc(doc(db, "auctions", auctionId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// संघाची माहिती / लोगो / बजेट अपडेट करणे
export async function updateAuctionTeam(auctionId, teamId, updates) {
  await updateDoc(doc(db, "auctions", auctionId, "teams", teamId), {
    ...(updates.name !== undefined && { name: updates.name.trim() }),
    ...(updates.shortName !== undefined && {
      shortName: updates.shortName.trim().toUpperCase()
    }),
    ...(updates.ownerName !== undefined && { ownerName: updates.ownerName.trim() }),
    ...(updates.logoUrl !== undefined && { logoUrl: updates.logoUrl.trim() }),
    ...(updates.totalPurse !== undefined && {
      totalPurse: Number(updates.totalPurse) || 0
    }),
    ...(updates.remainingPurse !== undefined && {
      remainingPurse: Number(updates.remainingPurse) || 0
    }),
    ...(updates.accessEnabled !== undefined && {
      accessEnabled: Boolean(updates.accessEnabled)
    })
  });
}

// खेळाडूची माहिती / फोटो / बॅकग्राउंड अपडेट करणे
export async function updateAuctionPlayer(auctionId, playerId, updates) {
  await updateDoc(doc(db, "auctions", auctionId, "players", playerId), {
    ...(updates.name !== undefined && { name: updates.name.trim() }),
    ...(updates.role !== undefined && { role: updates.role }),
    ...(updates.pool !== undefined && { pool: updates.pool.trim() }),
    ...(updates.basePrice !== undefined && {
      basePrice: Number(updates.basePrice) || 0
    }),
    ...(updates.photoUrl !== undefined && { photoUrl: updates.photoUrl.trim() }),
    ...(updates.photoBgTheme !== undefined && {
      photoBgTheme: updates.photoBgTheme
    }),
    ...(updates.status !== undefined && { status: updates.status })
  });
}


// Live Auction डॉक्युमेंट रिअल-टाईम ऐकणे
export function subscribeToAuction(auctionId, callback) {
  return onSnapshot(doc(db, "auctions", auctionId), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

// Live Teams रिअल-टाईम ऐकणे
export function subscribeToAuctionTeams(auctionId, callback) {
  return onSnapshot(collection(db, "auctions", auctionId, "teams"), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

// Live Players रिअल-टाईम ऐकणे
export function subscribeToAuctionPlayers(auctionId, callback) {
  return onSnapshot(collection(db, "auctions", auctionId, "players"), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

// खेळाडूला Live स्टेजवर आणणे
export async function setLivePlayerForAuction(auctionId, player) {
  const auctionRef = doc(db, "auctions", auctionId);
  const playerRef = doc(db, "auctions", auctionId, "players", player.id);

  await runTransaction(db, async (tx) => {
    const auctionSnap = await tx.get(auctionRef);
    if (!auctionSnap.exists()) throw new Error("Auction सापडले नाही.");
    const auctionData = auctionSnap.data();

    // आधीचा activePlayer असेल तर तो live वरून pending/unsold न करता तसाच ठेवणे (जर sold/unsold नसेल तर)
    if (auctionData.activePlayerId && auctionData.activePlayerId !== player.id) {
      const prevRef = doc(db, "auctions", auctionId, "players", auctionData.activePlayerId);
      const prevSnap = await tx.get(prevRef);
      if (prevSnap.exists() && prevSnap.data().status === "live") {
        tx.update(prevRef, { status: "pending" });
      }
    }

    const baseAmount = Number(player.basePrice ?? auctionData.basePrice ?? 2000);
    tx.update(playerRef, { status: "live" });
    tx.update(auctionRef, {
      status: "live",
      activePlayerId: player.id,
      currentBid: baseAmount,
      currentBidderTeamId: null,
      bidHistory: []
    });
  });
}

// संघाची बोली (Bid) नोंदवणे (स्लॅब + Max Allowed Bid + Max Players तपासणीसह)
export async function placeTeamBid(auctionId, teamId) {
  const auctionRef = doc(db, "auctions", auctionId);
  const teamRef = doc(db, "auctions", auctionId, "teams", teamId);

  await runTransaction(db, async (tx) => {
    const [auctionSnap, teamSnap] = await Promise.all([
      tx.get(auctionRef),
      tx.get(teamRef)
    ]);

    if (!auctionSnap.exists() || !teamSnap.exists()) {
      throw new Error("Auction किंवा Team डेटा उपलब्ध नाही.");
    }

    const auction = auctionSnap.data();
    const team = teamSnap.data();

    if (!auction.activePlayerId) {
      throw new Error("सध्या कोणताही खेळाडू Live स्टेजवर नाही.");
    }
    if (auction.currentBidderTeamId === teamId) {
      throw new Error("याच संघाची सध्या सर्वाधिक बोली सुरू आहे.");
    }

    const playersCount = Number(team.playersCount ?? 0);
    const maxPlayers = Number(auction.maxPlayers ?? 12);
    if (playersCount >= maxPlayers) {
      throw new Error(`${team.name} मध्ये कमाल (${maxPlayers}) खेळाडू पूर्ण झाले आहेत.`);
    }

    const currentBid = Number(auction.currentBid ?? 0);
    const hasAnyBidYet = Boolean(auction.currentBidderTeamId);
    const increment = getBidIncrement(currentBid, auction.incrementSlabs);
    const nextBidAmount = hasAnyBidYet ? currentBid + increment : currentBid;

    const maxAllowed = getMaxAllowedBid(team, auction, currentBid);
    if (nextBidAmount > maxAllowed) {
      throw new Error(
        `${team.name} ची कमाल सुरक्षित बोली ₹${maxAllowed.toLocaleString()} आहे (₹${nextBidAmount.toLocaleString()} शक्य नाही).`
      );
    }

    const history = Array.isArray(auction.bidHistory) ? auction.bidHistory : [];
    const newEntry = {
      teamId,
      teamName: team.name,
      amount: nextBidAmount,
      at: new Date().toISOString()
    };

    tx.update(auctionRef, {
      currentBid: nextBidAmount,
      currentBidderTeamId: teamId,
      bidHistory: [...history, newEntry]
    });
  });
}

// शेवटची बोली रद्द करणे (Undo Last Bid)
export async function undoLastBid(auctionId) {
  const auctionRef = doc(db, "auctions", auctionId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(auctionRef);
    if (!snap.exists()) return;
    const data = snap.data();
    const history = Array.isArray(data.bidHistory) ? data.bidHistory : [];
    if (history.length === 0) return;

    const updatedHistory = history.slice(0, -1);
    const previousBid = updatedHistory[updatedHistory.length - 1] || null;

    let fallbackBid = data.currentBid;
    if (previousBid) {
      fallbackBid = Number(previousBid.amount);
    } else if (data.activePlayerId) {
      const pSnap = await tx.get(doc(db, "auctions", auctionId, "players", data.activePlayerId));
      fallbackBid = pSnap.exists() ? Number(pSnap.data().basePrice || data.basePrice || 2000) : Number(data.basePrice || 2000);
    }

    tx.update(auctionRef, {
      currentBid: fallbackBid,
      currentBidderTeamId: previousBid ? previousBid.teamId : null,
      bidHistory: updatedHistory
    });
  });
}

// खेळाडू SOLD करणे आणि संघाचे बजेट वजा करणे
export async function markPlayerSold(auctionId) {
  const auctionRef = doc(db, "auctions", auctionId);
  await runTransaction(db, async (tx) => {
    const auctionSnap = await tx.get(auctionRef);
    if (!auctionSnap.exists()) throw new Error("Auction सापडले नाही.");
    const auction = auctionSnap.data();

    if (!auction.activePlayerId || !auction.currentBidderTeamId) {
      throw new Error("SOLD करण्यासाठी किमान एका संघाची बोली असणे आवश्यक आहे.");
    }

    const playerRef = doc(db, "auctions", auctionId, "players", auction.activePlayerId);
    const teamRef = doc(db, "auctions", auctionId, "teams", auction.currentBidderTeamId);

    const [playerSnap, teamSnap] = await Promise.all([
      tx.get(playerRef),
      tx.get(teamRef)
    ]);

    if (!playerSnap.exists() || !teamSnap.exists()) {
      throw new Error("खेळाडू किंवा संघाची माहिती सापडली नाही.");
    }

    const team = teamSnap.data();
    const finalPrice = Number(auction.currentBid);
    const remaining = Number(team.remainingPurse ?? 0);

    if (finalPrice > remaining) {
      throw new Error(`${team.name} कडे पुरेसे शिल्लक बजेट नाही.`);
    }

    tx.update(playerRef, {
      status: "sold",
      soldPrice: finalPrice,
      soldToTeamId: auction.currentBidderTeamId,
      soldToTeamName: team.name
    });

    tx.update(teamRef, {
      remainingPurse: remaining - finalPrice,
      playersCount: Number(team.playersCount ?? 0) + 1
    });

    tx.update(auctionRef, {
      activePlayerId: null,
      currentBid: 0,
      currentBidderTeamId: null,
      bidHistory: []
    });
  });
}

// खेळाडू UNSOLD करणे
export async function markPlayerUnsold(auctionId) {
  const auctionRef = doc(db, "auctions", auctionId);
  await runTransaction(db, async (tx) => {
    const auctionSnap = await tx.get(auctionRef);
    if (!auctionSnap.exists()) return;
    const auction = auctionSnap.data();
    if (!auction.activePlayerId) return;

    const playerRef = doc(db, "auctions", auctionId, "players", auction.activePlayerId);
    tx.update(playerRef, {
      status: "unsold",
      soldPrice: null,
      soldToTeamId: null,
      soldToTeamName: null
    });

    tx.update(auctionRef, {
      activePlayerId: null,
      currentBid: 0,
      currentBidderTeamId: null,
      bidHistory: []
    });
  });
}

// ऑक्शन-वाईज टेम्पररी Team Representative PIN तपासणे
export async function verifyTeamPinAccess(auctionId, enteredPin) {
  const cleanAuctionId = (auctionId || "").trim();
  const cleanPin = (enteredPin || "").trim().toUpperCase();

  if (!cleanAuctionId || !cleanPin) {
    throw new Error("कृपया Auction ID आणि Team PIN टाका.");
  }

  const auction = await getAuctionById(cleanAuctionId);
  if (!auction) {
    throw new Error("हे ऑक्शन सापडले नाही.");
  }

  if (auction.status === "completed") {
    throw new Error("हे ऑक्शन पूर्ण झाले आहे; तात्पुरता Team PIN बंद झाला आहे.");
  }

  const teamsSnap = await getDocs(collection(db, "auctions", cleanAuctionId, "teams"));
  const matchedTeamDoc = teamsSnap.docs.find((d) => {
    const data = d.data();
    return (
      String(data.accessPin || "").trim().toUpperCase() === cleanPin &&
      data.accessEnabled !== false
    );
  });

  if (!matchedTeamDoc) {
    throw new Error("चुकीचा PIN किंवा हा PIN सध्या बंद आहे.");
  }

  return {
    auction,
    team: { id: matchedTeamDoc.id, ...matchedTeamDoc.data() }
  };
}