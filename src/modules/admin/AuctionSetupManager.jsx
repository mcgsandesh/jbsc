// src/modules/admin/AuctionSetupManager.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Users,
  UserPlus,
  Upload,
  Trash2,
  KeyRound,
  Gavel,
  X,
  Image as ImageIcon,
  Radio,
  Lock,
  Pencil,
  Search,
  EyeOff,
  Eye,
  DownloadCloud
} from "lucide-react";
import {
  DEFAULT_INCREMENT_SLABS,
  createAuction,
  getAllAuctions,
  updateAuction,
  addAuctionTeam,
  updateAuctionTeam,
  getAuctionTeams,
  deleteAuctionTeam,
  addAuctionPlayer,
  updateAuctionPlayer,
  getAuctionPlayers,
  deleteAuctionPlayer
} from "../../services/auctionService";
import { getAllEvents } from "../../services/eventService";
import {
  lookupJbscPlayerByMobile,
  normalizeMobile10
} from "../../services/playerMasterService";
import { uploadToImgbb } from "../../services/imageUploadService";
import { showSuccess, showError } from "../../utils/alert";
import LiveAuctionStage from "../../components/auction/LiveAuctionStage";

const PLAYER_BG_STYLES = {
  "studio-dark": "bg-gradient-to-b from-slate-800 via-slate-900 to-black border-slate-700",
  "warm-amber": "bg-gradient-to-b from-amber-900/70 via-orange-950 to-slate-950 border-amber-500/40",
  "clean-slate": "bg-gradient-to-b from-slate-200 via-slate-100 to-white border-slate-300"
};

function extractRowValue(row, keys) {
  if (!row || typeof row !== "object") return "";
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") {
      return String(row[k]).trim();
    }
  }
  const entries = Object.entries(row);
  for (const k of keys) {
    const target = k.toLowerCase().replace(/[^a-z0-9\u0900-\u097f]/g, "");
    const found = entries.find(
      ([rk, rv]) =>
        rk.toLowerCase().replace(/[^a-z0-9\u0900-\u097f]/g, "").includes(target) &&
        rv !== undefined &&
        rv !== null &&
        String(rv).trim() !== ""
    );
    if (found) return String(found[1]).trim();
  }
  return "";
}

function normalizeRoleForAuction(rawRole) {
  const low = String(rawRole || "").toLowerCase();
  if (low.includes("all") || low.includes("round") || low.includes("अष्टपैलू")) {
    return "All-rounder";
  }
  if (low.includes("bat") || low.includes("फलंदाज")) {
    return "Batsman";
  }
  if (low.includes("bowl") || low.includes("गोलंदाज")) {
    return "Bowler";
  }
  if (low.includes("keep") || low.includes("wk") || low.includes("यष्टीरक्षक")) {
    return "Wicket-keeper";
  }
  return rawRole?.trim() || "All-rounder";
}

export default function AuctionSetupManager({ onSelectLiveAuction }) {
  const base = import.meta.env.BASE_URL;
  const dummyPlayerPhoto = `${base}players/1.jpg`;

  const [auctions, setAuctions] = useState([]);
  const [events, setEvents] = useState([]);
  const [countsByAuction, setCountsByAuction] = useState({});
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // लाईव्ह स्टेज उघडण्यासाठी स्टेट
  const [liveStageAuctionId, setLiveStageAuctionId] = useState(null);

  // कॉमन मॅनेजमेंट मोडल स्टेट ('teams' | 'players' | null)
  const [activeModal, setActiveModal] = useState(null);
  const [activeAuctionId, setActiveAuctionId] = useState("");
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);

  // 1-Click Event Import स्टेट
  const [showEventImportBox, setShowEventImportBox] = useState(false);
  const [selectedImportEventTitle, setSelectedImportEventTitle] = useState("");
  const [importingFromEvent, setImportingFromEvent] = useState(false);

  // मोडलमधील फॉर्म टॉगल व सर्च स्टेट
  const [showSingleForm, setShowSingleForm] = useState(false);
  const [showBulkBox, setShowBulkBox] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // नवीन ऑक्शन फॉर्म स्टेट
  const [title, setTitle] = useState("");
  const [organizer, setOrganizer] = useState("JBSC");
  const [totalTeams, setTotalTeams] = useState(6);
  const [purseAmount, setPurseAmount] = useState(100000);
  const [basePrice, setBasePrice] = useState(2000);
  const [minPlayers, setMinPlayers] = useState(7);
  const [maxPlayers, setMaxPlayers] = useState(12);
  const [hidePurseOnPublic, setHidePurseOnPublic] = useState(false);
  const [slabs, setSlabs] = useState(DEFAULT_INCREMENT_SLABS);

  // संघ जोडणे / एडिट करणे स्टेट
  const [editingTeamId, setEditingTeamId] = useState(null);
  const [teamName, setTeamName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [teamPurse, setTeamPurse] = useState("");
  const [teamLogoUrl, setTeamLogoUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // खेळाडू जोडणे / एडिट करणे स्टेट
  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [playerRole, setPlayerRole] = useState("All-rounder");
  const [playerPool, setPlayerPool] = useState("A");
  const [playerBase, setPlayerBase] = useState("");
  const [playerMobile, setPlayerMobile] = useState("");
  const [playerPhotoUrl, setPlayerPhotoUrl] = useState("");
  const [photoBgTheme, setPhotoBgTheme] = useState("studio-dark");
  const [uploadingPlayerPhoto, setUploadingPlayerPhoto] = useState(false);
  const [csvText, setCsvText] = useState("");

  const resetTeamForm = () => {
    setEditingTeamId(null);
    setTeamName("");
    setOwnerName("");
    setTeamPurse("");
    setTeamLogoUrl("");
    setShowSingleForm(false);
  };

  const resetPlayerForm = () => {
    setEditingPlayerId(null);
    setPlayerName("");
    setPlayerRole("All-rounder");
    setPlayerPool("A");
    setPlayerBase("");
    setPlayerMobile("");
    setPlayerPhotoUrl("");
    setShowSingleForm(false);
  };

  const switchModalTab = (tab) => {
    resetTeamForm();
    resetPlayerForm();
    setShowBulkBox(false);
    setShowEventImportBox(false);
    setSearchQuery("");
    setActiveModal(tab);
  };

  const loadAuctionsAndCounts = async () => {
    try {
      const [list, evList] = await Promise.all([
        getAllAuctions(),
        getAllEvents().catch(() => [])
      ]);
      setAuctions(list);
      setEvents(evList || []);
      if (evList?.length > 0 && !selectedImportEventTitle) {
        setSelectedImportEventTitle(evList[0].title || "");
      }

      const countEntries = await Promise.all(
        list.map(async (a) => {
          const [tList, pList] = await Promise.all([
            getAuctionTeams(a.id),
            getAuctionPlayers(a.id)
          ]);
          return [a.id, { teamsCount: tList.length, playersCount: pList.length }];
        })
      );
      setCountsByAuction(Object.fromEntries(countEntries));
    } catch (err) {
      console.error(err);
      showError("त्रुटी", "ऑक्शन्स लोड करताना अडचण आली.");
    }
  };

  const loadModalDetails = async (id) => {
    if (!id) return;
    const [tList, pList] = await Promise.all([
      getAuctionTeams(id),
      getAuctionPlayers(id)
    ]);
    setTeams(tList);
    setPlayers(pList);
  };

  useEffect(() => {
    loadAuctionsAndCounts();
  }, []);

  const openManageModal = async (auctionId, tab) => {
    setActiveAuctionId(auctionId);
    setActiveModal(tab);
    setShowSingleForm(false);
    setShowBulkBox(false);
    setShowEventImportBox(false);
    setSearchQuery("");
    setEditingTeamId(null);
    setEditingPlayerId(null);
    await loadModalDetails(auctionId);
  };

  const closeManageModal = async () => {
    resetTeamForm();
    resetPlayerForm();
    setShowBulkBox(false);
    setShowEventImportBox(false);
    setSearchQuery("");
    setActiveModal(null);
    await loadAuctionsAndCounts();
  };

  const handleOpenLiveStage = (auctionId) => {
    setLiveStageAuctionId(auctionId);
    if (onSelectLiveAuction) {
      onSelectLiveAuction(auctionId);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const selectedAuction =
    auctions.find((a) => a.id === activeAuctionId) || null;

  const filteredTeams = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter(
      (t) =>
        (t.name || "").toLowerCase().includes(q) ||
        (t.ownerName || "").toLowerCase().includes(q) ||
        (t.accessPin || "").toLowerCase().includes(q)
    );
  }, [teams, searchQuery]);

  const filteredPlayers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return players;
    return players.filter(
      (p) =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.role || "").toLowerCase().includes(q) ||
        (p.pool || "").toLowerCase().includes(q) ||
        (p.playerId || "").toLowerCase().includes(q) ||
        (p.mobile || "").toLowerCase().includes(q)
    );
  }, [players, searchQuery]);

  const handleSlabChange = (index, field, value) => {
    const updated = slabs.map((s, idx) =>
      idx === index
        ? { ...s, [field]: value === "" ? null : Number(value) }
        : s
    );
    setSlabs(updated);
  };

  const handleCreateAuction = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      showError("माहिती अपूर्ण", "कृपया ऑक्शन/स्पर्धेचे नाव लिहा.");
      return;
    }
    try {
      await createAuction({
        title,
        organizer,
        totalTeams,
        purseAmount,
        basePrice,
        minPlayers,
        maxPlayers,
        hidePurseOnPublic,
        incrementSlabs: slabs
      });
      setTitle("");
      setHidePurseOnPublic(false);
      setIsCreateOpen(false);
      await loadAuctionsAndCounts();
      showSuccess("तयार झाले!", "नवीन ऑक्शन कार्ड तयार झाले आहे.");
    } catch (err) {
      console.error(err);
      showError("त्रुटी", "ऑक्शन तयार करताना अडचण आली.");
    }
  };

  const handleStatusChange = async (auctionId, newStatus) => {
    await updateAuction(auctionId, { status: newStatus });
    await loadAuctionsAndCounts();
    showSuccess("अपडेट झाले", `ऑक्शन स्टेटस: ${newStatus}`);
  };

  const handleTogglePursePrivacy = async (auctionItem) => {
    const nextHidden = !Boolean(auctionItem.hidePurseOnPublic);
    await updateAuction(auctionItem.id, { hidePurseOnPublic: nextHidden });
    await loadAuctionsAndCounts();
    showSuccess(
      "अपडेट झाले",
      nextHidden
        ? "पब्लिकवर बजेट लपवले आहे (फक्त Owner PIN वर दिसेल)."
        : "पब्लिकवर बजेट उघडले आहे (Open)."
    );
  };

  const handleTeamLogoFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const prefix = `${selectedAuction?.title || "AUCTION"}_TEAM_${teamName || "LOGO"}`;
      const url = await uploadToImgbb(file, {
        maxWidth: 400,
        quality: 0.78,
        namePrefix: prefix
      });
      setTeamLogoUrl(url);
      showSuccess("लोगो अपलोड", "टीम लोगो imgbb वर सेव्ह झाला.");
    } catch (err) {
      console.error(err);
      showError("अपलोड त्रुटी", err.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handlePlayerPhotoFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPlayerPhoto(true);
    try {
      const prefix = `${selectedAuction?.title || "AUCTION"}_PLAYER_${playerName || "PHOTO"}`;
      const url = await uploadToImgbb(file, {
        maxWidth: 500,
        quality: 0.8,
        namePrefix: prefix
      });
      setPlayerPhotoUrl(url);
      showSuccess("फोटो अपलोड", "खेळाडूचा फोटो imgbb वर सेव्ह झाला.");
    } catch (err) {
      console.error(err);
      showError("अपलोड त्रुटी", err.message);
    } finally {
      setUploadingPlayerPhoto(false);
    }
  };

  const startEditTeam = (team) => {
    setShowBulkBox(false);
    setShowEventImportBox(false);
    setShowSingleForm(true);
    setEditingTeamId(team.id);
    setTeamName(team.name || "");
    setOwnerName(team.ownerName || "");
    setTeamPurse(team.totalPurse ?? "");
    setTeamLogoUrl(team.logoUrl || "");
  };

  const handleSaveTeam = async (e) => {
    e.preventDefault();
    if (!activeAuctionId || !teamName.trim()) return;

    const purseValue = Number(teamPurse || selectedAuction?.purseAmount || 100000);

    if (editingTeamId) {
      const existing = teams.find((t) => t.id === editingTeamId);
      const spentSoFar = Math.max(
        0,
        Number(existing?.totalPurse || 0) - Number(existing?.remainingPurse || 0)
      );
      await updateAuctionTeam(activeAuctionId, editingTeamId, {
        name: teamName,
        ownerName,
        logoUrl: teamLogoUrl,
        totalPurse: purseValue,
        remainingPurse: Math.max(0, purseValue - spentSoFar)
      });
      showSuccess("अपडेट झाले", "संघाची माहिती अपडेट केली आहे.");
    } else {
      await addAuctionTeam(
        activeAuctionId,
        {
          name: teamName,
          ownerName,
          logoUrl: teamLogoUrl,
          totalPurse: purseValue
        },
        selectedAuction?.purseAmount || 100000
      );
      showSuccess("संघ जोडला", "संघासाठी टेम्पररी पिन व लोगो सेव्ह झाला आहे.");
    }

    resetTeamForm();
    await loadModalDetails(activeAuctionId);
  };

  const startEditPlayer = (player) => {
    setShowBulkBox(false);
    setShowEventImportBox(false);
    setShowSingleForm(true);
    setEditingPlayerId(player.id);
    setPlayerName(player.name || "");
    setPlayerRole(player.role || "All-rounder");
    setPlayerPool(player.pool || "A");
    setPlayerBase(player.basePrice ?? "");
    setPlayerMobile(player.mobile || "");
    setPlayerPhotoUrl(player.photoUrl || "");
    setPhotoBgTheme(player.photoBgTheme || "studio-dark");
  };

  const handleSavePlayer = async (e) => {
    e.preventDefault();
    if (!activeAuctionId || !playerName.trim()) return;

    const baseVal = Number(playerBase || selectedAuction?.basePrice || 2000);
    const finalPhoto = playerPhotoUrl.trim() || dummyPlayerPhoto;
    const cleanMob = normalizeMobile10(playerMobile);

    if (editingPlayerId) {
      await updateAuctionPlayer(activeAuctionId, editingPlayerId, {
        name: playerName,
        role: playerRole,
        pool: playerPool,
        basePrice: baseVal,
        mobile: cleanMob,
        photoUrl: finalPhoto,
        photoBgTheme
      });
      showSuccess("अपडेट झाले", "खेळाडूची माहिती अपडेट केली आहे.");
    } else {
      await addAuctionPlayer(
        activeAuctionId,
        {
          name: playerName,
          role: playerRole,
          pool: playerPool,
          basePrice: baseVal,
          mobile: cleanMob,
          photoUrl: finalPhoto,
          photoBgTheme
        },
        selectedAuction?.basePrice || 2000
      );
      showSuccess("खेळाडू जोडला", "खेळाडू लिलाव यादीत समाविष्ट झाला आहे.");
    }

    resetPlayerForm();
    await loadModalDetails(activeAuctionId);
  };

  const handleBulkImport = async () => {
    if (!activeAuctionId || !csvText.trim()) return;
    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    let imported = 0;
    for (const line of lines) {
      const parts = line.split(",").map((p) => p.trim());
      if (!parts[0]) continue;
      if (parts[0].toLowerCase() === "name" || parts[0] === "नाव") continue;

      await addAuctionPlayer(
        activeAuctionId,
        {
          name: parts[0],
          role: parts[1] || "All-rounder",
          pool: parts[2] || "A",
          basePrice: Number(parts[3]) || selectedAuction?.basePrice || 2000,
          photoUrl: parts[4] || dummyPlayerPhoto,
          mobile: normalizeMobile10(parts[5] || ""),
          photoBgTheme
        },
        selectedAuction?.basePrice || 2000
      );
      imported++;
    }

    setCsvText("");
    setShowBulkBox(false);
    await loadModalDetails(activeAuctionId);
    showSuccess("बल्क इम्पोर्ट पूर्ण", `${imported} खेळाडू जोडले गेले.`);
  };

  // इव्हेंट शीटमधून 1-Click खेळाडू इम्पोर्ट (Duplicate Skip + Master Profile Photo/ID)
  const handleOneClickEventImport = async () => {
    if (!activeAuctionId || !selectedImportEventTitle) {
      showError("इव्हेंट निवडा", "कृपया ज्या इव्हेंटमधून खेळाडू आणायचे आहेत तो निवडा.");
      return;
    }

    const scriptUrl = import.meta.env.VITE_GOOGLE_SHEET_API_URL;
    if (!scriptUrl) {
      showError("API URL नाही", "VITE_GOOGLE_SHEET_API_URL कॉन्फिगर केलेले नाही.");
      return;
    }

    setImportingFromEvent(true);
    try {
      const res = await fetch(
        `${scriptUrl}?sheet=${encodeURIComponent(selectedImportEventTitle)}`
      );
      const result = await res.json();

      if (!result || result.status !== "success" || !Array.isArray(result.data)) {
        throw new Error("इव्हेंट नोंदणी शीटमधून डेटा मिळाला नाही.");
      }

      const existingMobiles = new Set(
        players.map((p) => normalizeMobile10(p.mobile)).filter(Boolean)
      );
      const existingPlayerIds = new Set(
        players.map((p) => String(p.playerId || "").trim().toUpperCase()).filter(Boolean)
      );
      const existingNames = new Set(
        players.map((p) => String(p.name || "").trim().toLowerCase()).filter(Boolean)
      );

      let addedCount = 0;
      let skippedCount = 0;

      for (const row of result.data) {
        const rawName = extractRowValue(row, [
          "Full_Name",
          "fullName",
          "पूर्ण नाव (Full Name)",
          "पूर्ण नाव",
          "नाव"
        ]);
        if (!rawName) continue;

        const rawMobile = extractRowValue(row, [
          "Mobile",
          "mobile",
          "व्हॉट्सॲप नंबर (WhatsApp No)",
          "मोबाईल नंबर",
          "मोबाईल"
        ]);
        const cleanMob = normalizeMobile10(rawMobile);

        const rawRole = extractRowValue(row, [
          "Role",
          "role",
          "भूमिका",
          "मैदानावर तुमची ओळख काय"
        ]);

        // Management सारखे non-player रोल टाळायचे असल्यास तपासा
        if (String(rawRole).toLowerCase().includes("management")) {
          skippedCount++;
          continue;
        }

        let playerId = extractRowValue(row, ["JBSC_Player_ID", "playerId"]);
        let photoUrl = extractRowValue(row, ["Photo_URL", "photoUrl", "फोटो"]);
        let gmail = extractRowValue(row, ["Gmail", "gmail", "Email", "email"]);

        if (cleanMob.length === 10) {
          const masterDoc = await lookupJbscPlayerByMobile(cleanMob).catch(() => null);
          if (masterDoc) {
            if (!playerId && masterDoc.playerId) playerId = masterDoc.playerId;
            if (!photoUrl && masterDoc.photoUrl) photoUrl = masterDoc.photoUrl;
            if (!gmail && masterDoc.gmail) gmail = masterDoc.gmail;
          }
        }

        const isDuplicate =
          (cleanMob.length === 10 && existingMobiles.has(cleanMob)) ||
          (playerId && existingPlayerIds.has(playerId.toUpperCase())) ||
          existingNames.has(rawName.toLowerCase());

        if (isDuplicate) {
          skippedCount++;
          continue;
        }

        await addAuctionPlayer(
          activeAuctionId,
          {
            name: rawName,
            role: normalizeRoleForAuction(rawRole),
            pool: "A",
            basePrice: selectedAuction?.basePrice || 2000,
            mobile: cleanMob,
            gmail,
            playerId: playerId || "",
            photoUrl: photoUrl || dummyPlayerPhoto,
            photoBgTheme
          },
          selectedAuction?.basePrice || 2000
        );

        if (cleanMob.length === 10) existingMobiles.add(cleanMob);
        if (playerId) existingPlayerIds.add(playerId.toUpperCase());
        existingNames.add(rawName.toLowerCase());
        addedCount++;
      }

      await loadModalDetails(activeAuctionId);
      setShowEventImportBox(false);
      showSuccess(
        "1-Click Import पूर्ण!",
        `${addedCount} नवीन खेळाडू जोडले गेले (${skippedCount} आधीच हजर / वगळलेले).`
      );
    } catch (err) {
      console.error(err);
      showError("इम्पोर्ट त्रुटी", err.message || "इव्हेंटमधून खेळाडू आणता आले नाहीत.");
    } finally {
      setImportingFromEvent(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Live Auction Stage */}
      {liveStageAuctionId && (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-slate-900 text-white px-4 py-2.5 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-black">
              <Gavel className="w-4 h-4 text-orange-400" />
              <span>लाईव्ह ऑक्शन स्टेज सुरू आहे</span>
            </div>
            <button
              type="button"
              onClick={async () => {
                setLiveStageAuctionId(null);
                await loadAuctionsAndCounts();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>बंद करा</span>
            </button>
          </div>

          <LiveAuctionStage
            auctionId={liveStageAuctionId}
            initialMode="control"
            allowControl={true}
          />
        </div>
      )}

      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900">
            क्रिकेट ऑक्शन मॅनेजर
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            स्पर्धा तयार करा, Live/Close करा, बजेट Privacy सेट करा व संघ/खेळाडू व्यवस्थापित करा.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen((prev) => !prev)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm font-black shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{isCreateOpen ? "फॉर्म बंद करा" : "नवीन ऑक्शन"}</span>
        </button>
      </div>

      {/* Collapsible Create Auction Section */}
      {isCreateOpen && (
        <form
          onSubmit={handleCreateAuction}
          className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-orange-200 shadow-md space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h2 className="text-sm sm:text-base font-black text-slate-900">
              नवीन क्रिकेट ऑक्शन सेटअप
            </h2>
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ऑक्शनचे नाव *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="उदा. BOXT20 - 2026 लिलाव"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                आयोजक / क्लब
              </label>
              <input
                type="text"
                value={organizer}
                onChange={(e) => setOrganizer(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                एकूण संघ
              </label>
              <input
                type="number"
                min="2"
                value={totalTeams}
                onChange={(e) => setTotalTeams(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                प्रति संघ बजेट (₹)
              </label>
              <input
                type="number"
                min="1000"
                value={purseAmount}
                onChange={(e) => setPurseAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                डिफॉल्ट बेस प्राईस (₹)
              </label>
              <input
                type="number"
                min="100"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  किमान खेळाडू
                </label>
                <input
                  type="number"
                  min="1"
                  value={minPlayers}
                  onChange={(e) => setMinPlayers(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  कमाल खेळाडू
                </label>
                <input
                  type="number"
                  min="1"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2.5 bg-amber-50/70 p-3 rounded-xl border border-amber-200/80 cursor-pointer">
            <input
              type="checkbox"
              checked={hidePurseOnPublic}
              onChange={(e) => setHidePurseOnPublic(e.target.checked)}
              className="w-4 h-4 accent-orange-600"
            />
            <div>
              <div className="text-xs font-black text-slate-900">
                पब्लिक लिंकवर संघांचे बजेट लपवा (फक्त Team Owner PIN वर दिसेल)
              </div>
              <div className="text-[11px] text-slate-600">
                बंद ठेवल्यास पब्लिक/प्रोजेक्टरवर सर्वांना बजेट दिसेल; चालू केल्यास इतरांचे बजेट लपवले जाईल.
              </div>
            </div>
          </label>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
            <div className="text-xs font-black text-slate-800">
              बोली वाढ नियम (Bid Slabs)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {slabs.map((slab, idx) => (
                <div
                  key={idx}
                  className="bg-white p-2 rounded-xl border border-slate-200 space-y-1.5"
                >
                  <div className="text-[10px] font-bold text-slate-500">
                    स्लॅब #{idx + 1}
                  </div>
                  <input
                    type="number"
                    value={slab.upTo ?? ""}
                    onChange={(e) => handleSlabChange(idx, "upTo", e.target.value)}
                    placeholder="मर्यादा पर्यंत (रिक्त = ∞)"
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs"
                  />
                  <input
                    type="number"
                    min="50"
                    value={slab.step}
                    onChange={(e) => handleSlabChange(idx, "step", e.target.value)}
                    placeholder="वाढ (₹)"
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
            >
              रद्द करा
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm font-black cursor-pointer"
            >
              कार्ड तयार करा
            </button>
          </div>
        </form>
      )}

      {/* Compact & Attractive Auction Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {auctions.map((a) => {
          const counts = countsByAuction[a.id] || { teamsCount: 0, playersCount: 0 };
          const isLive = a.status === "live";
          const isClosed = a.status === "completed";
          const isStageOpen = liveStageAuctionId === a.id;
          const isPurseHidden = Boolean(a.hidePurseOnPublic);

          return (
            <div
              key={a.id}
              className={`bg-white rounded-2xl border shadow-xs hover:shadow-md transition flex flex-col justify-between overflow-hidden ${
                isStageOpen
                  ? "border-orange-500 ring-2 ring-orange-200"
                  : "border-slate-200/90"
              }`}
            >
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 py-3 text-white flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30 truncate">
                  {a.organizer}
                </span>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      isLive
                        ? "bg-emerald-500 text-slate-950"
                        : isClosed
                        ? "bg-slate-600 text-white"
                        : "bg-amber-400 text-slate-950"
                    }`}
                  >
                    {a.status.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="p-4 space-y-3 flex-1">
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-snug line-clamp-1">
                    {a.title}
                  </h3>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        isPurseHidden
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      {isPurseHidden ? (
                        <>
                          <EyeOff className="w-3 h-3" />
                          <span>Public Purse: Hidden (PIN)</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3" />
                          <span>Public Purse: Open</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase">
                      बजेट
                    </div>
                    <div className="text-xs font-black text-slate-800">
                      ₹{Number(a.purseAmount || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="border-x border-slate-200">
                    <div className="text-[9px] font-bold text-slate-400 uppercase">
                      बेस
                    </div>
                    <div className="text-xs font-black text-slate-800">
                      ₹{Number(a.basePrice || 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase">
                      स्लॉट्स
                    </div>
                    <div className="text-xs font-black text-slate-800">
                      {a.minPlayers}–{a.maxPlayers}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => openManageModal(a.id, "teams")}
                    className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black cursor-pointer transition"
                  >
                    <Users className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                    <span className="truncate">
                      संघ ({counts.teamsCount}/{a.totalTeams})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openManageModal(a.id, "players")}
                    className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black cursor-pointer transition"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                    <span className="truncate">खेळाडू ({counts.playersCount})</span>
                  </button>
                </div>
              </div>

              <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleStatusChange(a.id, "live")}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black cursor-pointer"
                  >
                    <Radio className="w-3 h-3" />
                    <span>Live</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusChange(a.id, "completed")}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-[11px] font-black cursor-pointer"
                  >
                    <Lock className="w-3 h-3" />
                    <span>Close</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTogglePursePrivacy(a)}
                    title="पब्लिक लिंकवर बजेट लपवा / उघडा"
                    className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer ${
                      isPurseHidden
                        ? "bg-amber-100 text-amber-900 border-amber-300"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    {isPurseHidden ? (
                      <EyeOff className="w-3 h-3" />
                    ) : (
                      <Eye className="w-3 h-3" />
                    )}
                    <span>{isPurseHidden ? "PIN" : "Open"}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenLiveStage(a.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-black cursor-pointer"
                >
                  <Gavel className="w-3 h-3" />
                  <span>{isStageOpen ? "सुरू आहे" : "लाईव्ह स्टेज"}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Common Modal for Teams & Players */}
      {activeModal && selectedAuction && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            <div className="px-4 sm:px-6 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-orange-600">
                  {selectedAuction.title}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => switchModalTab("teams")}
                    className={`px-3 py-1 rounded-lg text-xs font-black cursor-pointer ${
                      activeModal === "teams"
                        ? "bg-orange-600 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    संघ व PIN ({teams.length}/{selectedAuction.totalTeams})
                  </button>
                  <button
                    type="button"
                    onClick={() => switchModalTab("players")}
                    className={`px-3 py-1 rounded-lg text-xs font-black cursor-pointer ${
                      activeModal === "players"
                        ? "bg-orange-600 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    खेळाडू यादी ({players.length})
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={closeManageModal}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-4 sm:px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (showSingleForm) {
                      resetTeamForm();
                      resetPlayerForm();
                    } else {
                      setShowBulkBox(false);
                      setShowEventImportBox(false);
                      setEditingTeamId(null);
                      setEditingPlayerId(null);
                      setShowSingleForm(true);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-black cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    {showSingleForm
                      ? "फॉर्म बंद करा"
                      : activeModal === "teams"
                      ? "Single संघ"
                      : "Single खेळाडू"}
                  </span>
                </button>

                {activeModal === "players" && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSingleForm(false);
                        setShowBulkBox(false);
                        setShowEventImportBox((prev) => !prev);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black cursor-pointer"
                    >
                      <DownloadCloud className="w-3.5 h-3.5" />
                      <span>1-Click Event Import</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowSingleForm(false);
                        setShowEventImportBox(false);
                        setShowBulkBox((prev) => !prev);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-black cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{showBulkBox ? "Bulk बंद करा" : "Bulk CSV"}</span>
                    </button>
                  </>
                )}
              </div>

              <div className="relative flex-1 sm:max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    activeModal === "teams"
                      ? "संघ, प्रतिनिधी किंवा PIN शोधा..."
                      : "खेळाडू, रोल, ID किंवा Pool शोधा..."
                  }
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs"
                />
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
              {activeModal === "teams" && (
                <>
                  {showSingleForm && (
                    <form
                      onSubmit={handleSaveTeam}
                      className="space-y-3 bg-slate-50 p-4 rounded-2xl border-2 border-orange-200"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800">
                          {editingTeamId ? "संघ माहिती एडिट करा" : "नवीन संघ जोडा"}
                        </span>
                        <button
                          type="button"
                          onClick={resetTeamForm}
                          className="text-[11px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                        >
                          बंद करा
                        </button>
                      </div>

                      <input
                        type="text"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder="संघाचे नाव *"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm"
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <input
                          type="text"
                          value={ownerName}
                          onChange={(e) => setOwnerName(e.target.value)}
                          placeholder="प्रतिनिधीचे नाव"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm"
                        />
                        <input
                          type="number"
                          value={teamPurse}
                          onChange={(e) => setTeamPurse(e.target.value)}
                          placeholder={`बजेट (डिफॉल्ट ₹${selectedAuction.purseAmount})`}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700">
                          टीम लोगो (ऑटो कॉम्प्रेस + imgbb)
                        </label>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-100">
                            <ImageIcon className="w-4 h-4 text-orange-600" />
                            <span>
                              {uploadingLogo ? "अपलोड होत आहे..." : "फोटो निवडा"}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleTeamLogoFile}
                              className="hidden"
                            />
                          </label>

                          <input
                            type="text"
                            value={teamLogoUrl}
                            onChange={(e) => setTeamLogoUrl(e.target.value)}
                            placeholder="किंवा Logo URL"
                            className="flex-1 min-w-[180px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs"
                          />

                          {teamLogoUrl && (
                            <img
                              src={teamLogoUrl}
                              alt="Logo preview"
                              className="w-10 h-10 rounded-xl object-contain bg-slate-900 border border-slate-300 p-0.5"
                            />
                          )}
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={uploadingLogo}
                        className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-black cursor-pointer"
                      >
                        {editingTeamId ? "संघ अपडेट करा" : "+ संघ सेव्ह करा"}
                      </button>
                    </form>
                  )}

                  <div className="space-y-2">
                    {filteredTeams.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-white text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {t.logoUrl ? (
                            <img
                              src={t.logoUrl}
                              alt={t.name}
                              className="w-11 h-11 rounded-xl object-contain bg-slate-900 border border-slate-200 p-1 shrink-0"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-orange-100 text-orange-700 font-black flex items-center justify-center shrink-0">
                              {t.shortName || "TM"}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-black text-slate-900 truncate">
                              {t.name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              प्रतिनिधी: {t.ownerName || "-"} • बजेट: ₹
                              {Number(t.remainingPurse || 0).toLocaleString()}
                            </div>
                            <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[11px] font-bold">
                              <KeyRound className="w-3 h-3" />
                              PIN: {t.accessPin}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEditTeam(t)}
                            className="p-1.5 text-slate-500 hover:text-orange-600 cursor-pointer"
                            title="Edit संघ"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await deleteAuctionTeam(activeAuctionId, t.id);
                              loadModalDetails(activeAuctionId);
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                            title="डिलीट संघ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {filteredTeams.length === 0 && (
                      <div className="text-center py-6 text-xs text-slate-400">
                        कोणतेही संघ सापडले नाहीत.
                      </div>
                    )}
                  </div>
                </>
              )}

              {activeModal === "players" && (
                <>
                  {/* 1-Click Event Import Box */}
                  {showEventImportBox && (
                    <div className="bg-emerald-50/70 p-4 rounded-2xl border-2 border-emerald-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black text-slate-900">
                          इव्हेंट नोंदणी शीटमधून 1-Click खेळाडू इम्पोर्ट
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowEventImportBox(false)}
                          className="text-[11px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                        >
                          बंद करा
                        </button>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                        <select
                          value={selectedImportEventTitle}
                          onChange={(e) => setSelectedImportEventTitle(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800"
                        >
                          {events.map((ev) => (
                            <option key={ev.id} value={ev.title}>
                              {ev.title} ({ev.year || 2026})
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          disabled={importingFromEvent}
                          onClick={handleOneClickEventImport}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black cursor-pointer shrink-0"
                        >
                          <DownloadCloud className="w-4 h-4" />
                          <span>
                            {importingFromEvent
                              ? "इम्पोर्ट होत आहे..."
                              : "आता इम्पोर्ट करा"}
                          </span>
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        आधीच जोडलेले खेळाडू आपोआप वगळले जातील; Master Profile मधील फोटो, ID आणि मोबाईल नंबर सोबत येतील.
                      </p>
                    </div>
                  )}

                  {showSingleForm && (
                    <form
                      onSubmit={handleSavePlayer}
                      className="space-y-3 bg-slate-50 p-4 rounded-2xl border-2 border-orange-200"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800">
                          {editingPlayerId
                            ? "खेळाडू माहिती एडिट करा"
                            : "नवीन खेळाडू जोडा (फोटो नसल्यास '1' डमी फोटो येईल)"}
                        </span>
                        <button
                          type="button"
                          onClick={resetPlayerForm}
                          className="text-[11px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                        >
                          बंद करा
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <input
                          type="text"
                          value={playerName}
                          onChange={(e) => setPlayerName(e.target.value)}
                          placeholder="खेळाडूचे पूर्ण नाव *"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm"
                        />

                        <input
                          type="tel"
                          value={playerMobile}
                          onChange={(e) => setPlayerMobile(e.target.value)}
                          placeholder="मोबाईल नंबर (Call/WhatsApp साठी)"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <select
                          value={playerRole}
                          onChange={(e) => setPlayerRole(e.target.value)}
                          className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm"
                        >
                          <option value="All-rounder">All-rounder</option>
                          <option value="Batsman">Batsman</option>
                          <option value="Bowler">Bowler</option>
                          <option value="Wicket-keeper">Wicket-keeper</option>
                        </select>

                        <input
                          type="text"
                          value={playerPool}
                          onChange={(e) => setPlayerPool(e.target.value)}
                          placeholder="Pool (A/B/Icon)"
                          className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm"
                        />

                        <input
                          type="number"
                          value={playerBase}
                          onChange={(e) => setPlayerBase(e.target.value)}
                          placeholder={`बेस ₹${selectedAuction.basePrice}`}
                          className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label className="text-xs font-bold text-slate-700">
                            खेळाडू फोटो व एकसारखा बॅकग्राउंड
                          </label>
                          <select
                            value={photoBgTheme}
                            onChange={(e) => setPhotoBgTheme(e.target.value)}
                            className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-xs font-bold"
                          >
                            <option value="studio-dark">एकसारखा BG: Studio Dark</option>
                            <option value="warm-amber">एकसारखा BG: Warm Amber</option>
                            <option value="clean-slate">एकसारखा BG: Clean Light</option>
                          </select>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                          <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-100">
                            <ImageIcon className="w-4 h-4 text-orange-600" />
                            <span>
                              {uploadingPlayerPhoto
                                ? "अपलोड होत आहे..."
                                : "फोटो अपलोड करा"}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handlePlayerPhotoFile}
                              className="hidden"
                            />
                          </label>

                          <input
                            type="text"
                            value={playerPhotoUrl}
                            onChange={(e) => setPlayerPhotoUrl(e.target.value)}
                            placeholder="किंवा Photo URL (रिक्त ठेवल्यास '1' डमी फोटो)"
                            className="flex-1 min-w-[180px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs"
                          />

                          <div
                            className={`w-12 h-12 rounded-xl border overflow-hidden shrink-0 ${
                              PLAYER_BG_STYLES[photoBgTheme] ||
                              PLAYER_BG_STYLES["studio-dark"]
                            }`}
                          >
                            <img
                              src={playerPhotoUrl.trim() || dummyPlayerPhoto}
                              alt="Player preview"
                              className="w-full h-full object-cover object-top"
                              onError={(e) => {
                                if (!e.target.dataset.triedPng) {
                                  e.target.dataset.triedPng = "true";
                                  e.target.src = `${base}players/1.png`;
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={uploadingPlayerPhoto}
                        className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm font-black cursor-pointer"
                      >
                        {editingPlayerId
                          ? "खेळाडू अपडेट करा"
                          : "+ खेळाडू जोडा"}
                      </button>
                    </form>
                  )}

                  {showBulkBox && (
                    <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-300 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-black text-slate-800">
                          <Upload className="w-3.5 h-3.5 text-orange-600" />
                          <span>
                            बल्क खेळाडू (नाव,भूमिका,पूल,बेस_किंमत,फोटो_url,मोबाईल)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowBulkBox(false)}
                          className="text-[11px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                        >
                          बंद करा
                        </button>
                      </div>
                      <textarea
                        rows={4}
                        value={csvText}
                        onChange={(e) => setCsvText(e.target.value)}
                        placeholder={
                          "रोहन पाटील,All-rounder,A,3000,,9822334455\nअमित शिंदे,Bowler,B,2000,,9765432109"
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleBulkImport}
                        className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-black cursor-pointer"
                      >
                        यादी अपलोड करा
                      </button>
                    </div>
                  )}

                  <div className="space-y-2">
                    {filteredPlayers.map((p) => {
                      const bgClass =
                        PLAYER_BG_STYLES[p.photoBgTheme || photoBgTheme] ||
                        PLAYER_BG_STYLES["studio-dark"];
                      const photoSrc = (p.photoUrl || "").trim() || dummyPlayerPhoto;

                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-200 bg-white text-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-11 h-11 rounded-xl border overflow-hidden flex items-center justify-center shrink-0 ${bgClass}`}
                            >
                              <img
                                src={photoSrc}
                                alt={p.name}
                                className="w-full h-full object-cover object-top"
                                onError={(e) => {
                                  if (!e.target.dataset.triedPng) {
                                    e.target.dataset.triedPng = "true";
                                    e.target.src = `${base}players/1.png`;
                                  }
                                }}
                              />
                            </div>

                            <div className="min-w-0">
                              <div className="font-black text-slate-900 truncate">
                                {p.name}
                                {p.playerId && (
                                  <span className="ml-2 font-mono text-[10px] text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">
                                    {p.playerId}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {p.role} • Pool {p.pool} • ₹
                                {Number(p.basePrice || 0).toLocaleString()}
                                {p.mobile ? ` • ${p.mobile}` : ""}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => startEditPlayer(p)}
                              className="p-1.5 text-slate-500 hover:text-orange-600 cursor-pointer"
                              title="Edit खेळाडू"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await deleteAuctionPlayer(activeAuctionId, p.id);
                                loadModalDetails(activeAuctionId);
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                              title="डिलीट खेळाडू"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {filteredPlayers.length === 0 && (
                      <div className="text-center py-6 text-xs text-slate-400">
                        कोणतेही खेळाडू सापडले नाहीत.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}