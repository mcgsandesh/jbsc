// src/modules/public/TeamOwnerPortal.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  KeyRound,
  LogOut,
  Wallet,
  Users,
  ShieldCheck,
  Gavel,
  TrendingUp,
  ArrowLeft,
  Phone,
  MessageCircle,
  Search
} from "lucide-react";
import {
  getAllAuctions,
  verifyTeamPinAccess,
  subscribeToAuction,
  subscribeToAuctionTeams,
  subscribeToAuctionPlayers,
  getMaxAllowedBid
} from "../../services/auctionService";
import { showSuccess, showError } from "../../utils/alert";

const PLAYER_BG_STYLES = {
  "studio-dark": "bg-gradient-to-b from-slate-800 via-slate-900 to-black border-slate-700",
  "warm-amber": "bg-gradient-to-b from-amber-900/70 via-orange-950 to-slate-950 border-amber-500/40",
  "clean-slate": "bg-gradient-to-b from-slate-200 via-slate-100 to-white border-slate-300"
};

const STORAGE_KEY = "jbsc_team_pin_session";

export default function TeamOwnerPortal() {
  const { auctionId: paramAuctionId } = useParams();
  const base = import.meta.env.BASE_URL;
  const dummyPlayerPhoto = `${base}players/1.jpg`;

  const [auctions, setAuctions] = useState([]);
  const [selectedAuctionId, setSelectedAuctionId] = useState(paramAuctionId || "");
  const [pinInput, setPinInput] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Remaining Players Search & Filter State
  const [remSearch, setRemSearch] = useState("");
  const [remStatus, setRemStatus] = useState("ALL"); // 'ALL' | 'pending' | 'unsold'
  const [remRole, setRemRole] = useState("ALL");
  const [remPool, setRemPool] = useState("ALL");

  // Verified Session State
  const [session, setSession] = useState(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // Live Firestore Data for Verified Session
  const [liveAuction, setLiveAuction] = useState(null);
  const [liveTeams, setLiveTeams] = useState([]);
  const [livePlayers, setLivePlayers] = useState([]);

  useEffect(() => {
    if (paramAuctionId) {
      setSelectedAuctionId(paramAuctionId);
    }
  }, [paramAuctionId]);

  useEffect(() => {
    (async () => {
      try {
        const list = await getAllAuctions();
        const activeList = list.filter((a) => a.status !== "completed");
        setAuctions(activeList);
        if (!paramAuctionId && !selectedAuctionId && activeList.length > 0) {
          setSelectedAuctionId(activeList[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    })();
  }, [paramAuctionId, selectedAuctionId]);

  useEffect(() => {
    const activeId = session?.auctionId;
    if (!activeId) return;

    const unsubAuction = subscribeToAuction(activeId, (aData) => {
      if (!aData || aData.status === "completed") {
        sessionStorage.removeItem(STORAGE_KEY);
        setSession(null);
        setLiveAuction(null);
        showError(
          "सेशन संपले",
          "ऑक्शन पूर्ण झाल्यामुळे तात्पुरता Team PIN बंद झाला आहे."
        );
        return;
      }
      setLiveAuction(aData);
    });

    const unsubTeams = subscribeToAuctionTeams(activeId, (tList) => {
      setLiveTeams(tList);
      const matched = tList.find((t) => t.id === session?.teamId);
      if (!matched || matched.accessEnabled === false) {
        sessionStorage.removeItem(STORAGE_KEY);
        setSession(null);
        showError(
          "प्रवेश बंद",
          "तुमचा तात्पुरता Team PIN निष्क्रिय केला आहे."
        );
      }
    });

    const unsubPlayers = subscribeToAuctionPlayers(activeId, setLivePlayers);

    return () => {
      unsubAuction();
      unsubTeams();
      unsubPlayers();
    };
  }, [session?.auctionId, session?.teamId]);

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAuctionId || !pinInput.trim()) {
      showError("माहिती अपूर्ण", "कृपया ऑक्शन आणि Team PIN टाका.");
      return;
    }

    setVerifying(true);
    try {
      const { auction, team } = await verifyTeamPinAccess(
        selectedAuctionId,
        pinInput
      );
      const nextSession = {
        auctionId: auction.id,
        teamId: team.id,
        teamName: team.name
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
      setSession(nextSession);
      setPinInput("");
      showSuccess("स्वागत आहे!", `${team.name} चा टीम डॅशबोर्ड उघडला आहे.`);
    } catch (err) {
      showError("प्रवेश नाकारला", err.message);
    } finally {
      setVerifying(false);
    }
  };

  const handleLogoutPin = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setLiveAuction(null);
    setLiveTeams([]);
    setLivePlayers([]);
  };

  const myTeam = useMemo(
    () => liveTeams.find((t) => t.id === session?.teamId) || null,
    [liveTeams, session?.teamId]
  );

  const mySquad = useMemo(() => {
    if (!session?.teamId) return [];
    return livePlayers.filter((p) => p.soldToTeamId === session.teamId);
  }, [livePlayers, session?.teamId]);

  const roleCounts = useMemo(() => {
    return mySquad.reduce((acc, p) => {
      const r = p.role || "Other";
      acc[r] = (acc[r] || 0) + 1;
      return acc;
    }, {});
  }, [mySquad]);

  const remainingPoolCounts = useMemo(() => {
    const pending = livePlayers.filter((p) => p.status === "pending").length;
    const unsold = livePlayers.filter((p) => p.status === "unsold").length;
    return { pending, unsold };
  }, [livePlayers]);

  const availableRemainingRoles = useMemo(() => {
    const set = new Set(
      livePlayers
        .filter((p) => p.status === "pending" || p.status === "unsold")
        .map((p) => p.role || "All-rounder")
    );
    return ["ALL", ...Array.from(set)];
  }, [livePlayers]);

  const availableRemainingPools = useMemo(() => {
    const set = new Set(
      livePlayers
        .filter((p) => p.status === "pending" || p.status === "unsold")
        .map((p) => p.pool || "A")
    );
    return ["ALL", ...Array.from(set)];
  }, [livePlayers]);

  const filteredRemainingPlayers = useMemo(() => {
    const q = remSearch.trim().toLowerCase();
    return livePlayers.filter((p) => {
      const isRem = p.status === "pending" || p.status === "unsold";
      if (!isRem) return false;
      if (remStatus !== "ALL" && p.status !== remStatus) return false;
      if (remRole !== "ALL" && (p.role || "All-rounder") !== remRole) return false;
      if (remPool !== "ALL" && (p.pool || "A") !== remPool) return false;
      if (!q) return true;
      return (
        (p.name || "").toLowerCase().includes(q) ||
        (p.role || "").toLowerCase().includes(q) ||
        (p.pool || "").toLowerCase().includes(q) ||
        (p.playerId || "").toLowerCase().includes(q)
      );
    });
  }, [livePlayers, remSearch, remStatus, remRole, remPool]);

  const activePlayer = useMemo(
    () => livePlayers.find((p) => p.id === liveAuction?.activePlayerId) || null,
    [livePlayers, liveAuction?.activePlayerId]
  );

  const leadingTeam = useMemo(
    () =>
      liveTeams.find((t) => t.id === liveAuction?.currentBidderTeamId) || null,
    [liveTeams, liveAuction?.currentBidderTeamId]
  );

  // 1. PIN Entry Screen
  if (!session || !liveAuction || !myTeam) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md mb-3 flex items-center justify-between">
          <Link
            to={
              selectedAuctionId
                ? `/auction-live/${selectedAuctionId}`
                : "/"
            }
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>मागे जा</span>
          </Link>
          <span className="text-[11px] font-bold text-amber-400">
            Team Owner Access
          </span>
        </div>

        <form
          onSubmit={handlePinSubmit}
          className="w-full max-w-md bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-2xl space-y-5"
        >
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-black text-white">
              Team Owner / Representative PIN
            </h1>
            <p className="text-xs text-slate-400">
              फक्त या ऑक्शनपुरता दिलेला तात्पुरता PIN टाकून स्वतःचे बजेट व स्क्वॉड पहा.
            </p>
          </div>

          {!paramAuctionId && (
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                ऑक्शन निवडा
              </label>
              <select
                value={selectedAuctionId}
                onChange={(e) => setSelectedAuctionId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-bold text-white"
              >
                {auctions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title} ({a.organizer})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              तात्पुरता Team PIN *
            </label>
            <input
              type="text"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.toUpperCase())}
              placeholder="उदा. LOH-4821"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono font-bold tracking-wider text-amber-300 uppercase"
            />
          </div>

          <button
            type="submit"
            disabled={verifying}
            className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-sm font-black cursor-pointer"
          >
            {verifying ? "तपासणी होत आहे..." : "टीम डॅशबोर्ड उघडा"}
          </button>
        </form>
      </div>
    );
  }

  // 2. Verified Team Dashboard
  const totalPurse = Number(myTeam.totalPurse ?? liveAuction.purseAmount ?? 0);
  const remainingPurse = Number(myTeam.remainingPurse ?? 0);
  const spentPurse = Math.max(0, totalPurse - remainingPurse);
  const maxSafeBid = getMaxAllowedBid(
    myTeam,
    liveAuction,
    activePlayer?.basePrice || liveAuction.basePrice
  );
  const slotsLeft = Math.max(
    0,
    Number(liveAuction.maxPlayers || 12) - mySquad.length
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white p-3 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {myTeam.logoUrl ? (
              <img
                src={myTeam.logoUrl}
                alt={myTeam.name}
                className="w-14 h-14 rounded-2xl object-contain bg-black p-1 border border-slate-700 shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-orange-500/20 text-orange-300 font-black text-lg flex items-center justify-center shrink-0">
                {myTeam.shortName || "TM"}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold text-amber-300">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{liveAuction.title} • Temporary PIN Access</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                {myTeam.name}
              </h1>
              <div className="text-xs text-slate-400">
                प्रतिनिधी: {myTeam.ownerName || "-"} • उरलेले स्लॉट्स: {slotsLeft}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogoutPin}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-black cursor-pointer self-start sm:self-center"
          >
            <LogOut className="w-4 h-4" />
            <span>PIN लॉगआउट</span>
          </button>
        </div>

        {/* Budget & Slots Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-900 rounded-2xl p-4 border border-emerald-500/30">
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-300 font-bold">
              <Wallet className="w-3.5 h-3.5" />
              <span>शिल्लक बजेट</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">
              ₹{remainingPurse.toLocaleString()}
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
            <div className="flex items-center gap-1.5 text-[11px] text-sky-300 font-bold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Max Safe Bid</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-sky-400 mt-1">
              ₹{maxSafeBid.toLocaleString()}
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
            <div className="text-[11px] text-slate-400 font-bold">
              खरेदी रक्कम (Spent)
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-400 mt-1">
              ₹{spentPurse.toLocaleString()}
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
            <div className="flex items-center gap-1.5 text-[11px] text-amber-300 font-bold">
              <Users className="w-3.5 h-3.5" />
              <span>खेळाडू (Squad)</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">
              {mySquad.length} / {liveAuction.maxPlayers}
            </div>
            <div className="text-[10px] text-slate-400">
              किमान: {liveAuction.minPlayers} • बाकी पूल: {remainingPoolCounts.pending} Pending,{" "}
              {remainingPoolCounts.unsold} Unsold
            </div>
          </div>
        </div>

        {/* Current Live Player Banner (लहान फोटो + नाव + बोली) */}
        {activePlayer && (
          <div className="bg-slate-900 rounded-3xl p-4 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-xl border overflow-hidden shrink-0 ${
                  PLAYER_BG_STYLES[activePlayer.photoBgTheme || "studio-dark"] ||
                  PLAYER_BG_STYLES["studio-dark"]
                }`}
              >
                <img
                  src={(activePlayer.photoUrl || "").trim() || dummyPlayerPhoto}
                  alt={activePlayer.name}
                  className="w-full h-full object-cover object-top"
                  onError={(e) => {
                    if (!e.target.dataset.triedPng) {
                      e.target.dataset.triedPng = "true";
                      e.target.src = `${base}players/1.png`;
                    }
                  }}
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-[10px] uppercase font-black text-amber-300">
                  <Gavel className="w-3 h-3" />
                  <span>सध्या लिलावात सुरू असलेला खेळाडू</span>
                </div>
                <div className="text-base font-black text-white">
                  {activePlayer.name}{" "}
                  <span className="text-xs font-semibold text-slate-400">
                    ({activePlayer.role} • Pool {activePlayer.pool || "A"})
                  </span>
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-lg font-black text-amber-400">
                ₹{Number(liveAuction.currentBid || 0).toLocaleString()}
              </div>
              <div className="text-xs font-bold text-emerald-400">
                {leadingTeam
                  ? leadingTeam.id === myTeam.id
                    ? "तुमचा संघ आघाडीवर आहे!"
                    : `आघाडी: ${leadingTeam.name}`
                  : "बोली सुरू"}
              </div>
            </div>
          </div>
        )}

        {/* My Bought Players Squad + Role Breakdown + Call/WhatsApp */}
        <div className="bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-base sm:text-lg font-black text-white">
              तुमच्या संघाने घेतलेले खेळाडू ({mySquad.length})
            </h2>

            {Object.keys(roleCounts).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(roleCounts).map(([roleName, count]) => (
                  <span
                    key={roleName}
                    className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-bold text-slate-300"
                  >
                    {roleName}: <strong className="text-amber-300">{count}</strong>
                  </span>
                ))}
              </div>
            )}
          </div>

          {mySquad.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {mySquad.map((p, idx) => {
                const bgClass =
                  PLAYER_BG_STYLES[p.photoBgTheme || "studio-dark"] ||
                  PLAYER_BG_STYLES["studio-dark"];
                const cleanDigits = String(p.mobile || "").replace(/\D/g, "");
                const tenDigitMobile = cleanDigits.slice(-10);

                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-bold text-slate-500 w-4 shrink-0">
                        {idx + 1}
                      </span>
                      <div
                        className={`w-12 h-12 rounded-xl border overflow-hidden shrink-0 ${bgClass}`}
                      >
                        <img
                          src={(p.photoUrl || "").trim() || dummyPlayerPhoto}
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
                        <div className="text-sm font-black text-white truncate">
                          {p.name}
                        </div>
                        <div className="text-xs text-amber-300 font-semibold">
                          {p.role} • Pool {p.pool || "A"}
                        </div>

                        {tenDigitMobile.length === 10 && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <a
                              href={`tel:${tenDigitMobile}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-[10px] font-bold"
                            >
                              <Phone className="w-2.5 h-2.5" />
                              <span>Call</span>
                            </a>
                            <a
                              href={`https://wa.me/91${tenDigitMobile}?text=${encodeURIComponent(
                                `नमस्कार ${p.name}, ${liveAuction.title} ऑक्शनमध्ये तुमची निवड ${myTeam.name} संघात झाली आहे.`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold"
                            >
                              <MessageCircle className="w-2.5 h-2.5" />
                              <span>WhatsApp</span>
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-sm font-black text-emerald-400 shrink-0">
                      ₹{Number(p.soldPrice || 0).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-slate-400">
              तुमच्या संघाने अद्याप कोणताही खेळाडू खरेदी केलेला नाही.
            </div>
          )}
        </div>

        {/* Remaining / Upcoming Players List with Search & Role/Pool/Status Filters */}
        <div className="bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                उरलेले खेळाडू ({filteredRemainingPlayers.length} /{" "}
                {remainingPoolCounts.pending + remainingPoolCounts.unsold})
              </h2>
              <p className="text-xs text-slate-400">
                लिलावासाठी बाकी असलेले खेळाडू नाव, रोल किंवा पूलनुसार शोधा.
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={remSearch}
                onChange={(e) => setRemSearch(e.target.value)}
                placeholder="खेळाडूचे नाव, ID, रोल किंवा Pool शोधा..."
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-white"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {[
                  {
                    id: "ALL",
                    label: `सर्व (${remainingPoolCounts.pending + remainingPoolCounts.unsold})`
                  },
                  { id: "pending", label: `Pending (${remainingPoolCounts.pending})` },
                  { id: "unsold", label: `Unsold (${remainingPoolCounts.unsold})` }
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setRemStatus(st.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                      remStatus === st.id
                        ? "bg-orange-600 text-white"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <select
                  value={remRole}
                  onChange={(e) => setRemRole(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-bold text-slate-200"
                >
                  {availableRemainingRoles.map((r) => (
                    <option key={r} value={r}>
                      {r === "ALL" ? "All Roles" : r}
                    </option>
                  ))}
                </select>

                <select
                  value={remPool}
                  onChange={(e) => setRemPool(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-bold text-slate-200"
                >
                  {availableRemainingPools.map((pl) => (
                    <option key={pl} value={pl}>
                      {pl === "ALL" ? "All Pools" : `Pool ${pl}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {filteredRemainingPlayers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto pr-1">
              {filteredRemainingPlayers.map((rp) => {
                const bgClass =
                  PLAYER_BG_STYLES[rp.photoBgTheme || "studio-dark"] ||
                  PLAYER_BG_STYLES["studio-dark"];
                return (
                  <div
                    key={rp.id}
                    className="flex items-center justify-between gap-2.5 bg-slate-950 p-2.5 rounded-2xl border border-slate-800"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl border overflow-hidden shrink-0 ${bgClass}`}
                      >
                        <img
                          src={(rp.photoUrl || "").trim() || dummyPlayerPhoto}
                          alt={rp.name}
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
                        <div className="text-xs font-black text-white truncate">
                          {rp.name}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {rp.role || "All-rounder"} • Pool {rp.pool || "A"}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded shrink-0 ${
                        rp.status === "unsold"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {rp.status === "unsold" ? "Re-Bid" : "Pending"}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-slate-400">
              या फिल्टरमध्ये कोणताही उरलेला खेळाडू सापडला नाही.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}