// src/components/auction/LiveAuctionStage.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  Gavel,
  Undo2,
  CheckCircle2,
  XCircle,
  Tv,
  Sliders,
  Wallet,
  Users,
  Search,
  ListFilter,
  ChevronDown,
  ChevronUp,
  X,
  RotateCcw,
  ExternalLink,
  Copy,
  Check,
  KeyRound,
  Lock,
  ImageDown,
  FileText
} from "lucide-react";
import {
  subscribeToAuction,
  subscribeToAuctionTeams,
  subscribeToAuctionPlayers,
  setLivePlayerForAuction,
  placeTeamBid,
  undoLastBid,
  markPlayerSold,
  markPlayerUnsold,
  getBidIncrement,
  getMaxAllowedBid
} from "../../services/auctionService";
import {
  downloadTeamSquadImageCard,
  printTeamSquadPdf
} from "../../utils/squadExportHelper";
import { showSuccess, showError } from "../../utils/alert";

const PLAYER_BG_STYLES = {
  "studio-dark": "bg-gradient-to-b from-slate-800 via-slate-900 to-black border-slate-700",
  "warm-amber": "bg-gradient-to-b from-amber-900/70 via-orange-950 to-slate-950 border-amber-500/40",
  "clean-slate": "bg-gradient-to-b from-slate-200 via-slate-100 to-white border-slate-300"
};

export default function LiveAuctionStage({
  auctionId,
  initialMode = "display",
  allowControl = false
}) {
  const base = import.meta.env.BASE_URL;
  const dummyPlayerPhoto = `${base}players/1.jpg`;

  const safeInitialMode =
    !allowControl && initialMode === "control" ? "display" : initialMode;

  const [mode, setMode] = useState(safeInitialMode); // 'control' | 'display' | 'squads'
  const [auction, setAuction] = useState(null);
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Player Selection Drawer/Panel State
  const [showPlayerPicker, setShowPlayerPicker] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL_AVAILABLE");
  const [poolFilter, setPoolFilter] = useState("ALL");
  const [playerSearch, setPlayerSearch] = useState("");

  // Selected Team for Squad Detail Modal (फक्त खालच्या कार्डवरून उघडण्यासाठी)
  const [selectedSquadTeamId, setSelectedSquadTeamId] = useState(null);

  useEffect(() => {
    if (!allowControl && initialMode === "control") {
      setMode("display");
    } else {
      setMode(initialMode);
    }
  }, [initialMode, allowControl]);

  useEffect(() => {
    if (!auctionId) return;
    const unsubAuction = subscribeToAuction(auctionId, setAuction);
    const unsubTeams = subscribeToAuctionTeams(auctionId, setTeams);
    const unsubPlayers = subscribeToAuctionPlayers(auctionId, setPlayers);

    return () => {
      unsubAuction();
      unsubTeams();
      unsubPlayers();
    };
  }, [auctionId]);

  const activePlayer = useMemo(
    () => players.find((p) => p.id === auction?.activePlayerId) || null,
    [players, auction?.activePlayerId]
  );

  useEffect(() => {
    if (activePlayer) {
      setShowPlayerPicker(false);
    } else {
      setShowPlayerPicker(true);
    }
  }, [activePlayer?.id]);

  const leadingTeam = useMemo(
    () => teams.find((t) => t.id === auction?.currentBidderTeamId) || null,
    [teams, auction?.currentBidderTeamId]
  );

  const unsoldCount = useMemo(
    () => players.filter((p) => p.status === "unsold").length,
    [players]
  );

  const pendingCount = useMemo(
    () => players.filter((p) => p.status === "pending").length,
    [players]
  );

  const upcomingPreviewPlayers = useMemo(() => {
    const poolTarget = activePlayer?.pool || "A";
    const available = players.filter(
      (p) =>
        p.id !== activePlayer?.id &&
        (p.status === "pending" || p.status === "unsold")
    );
    const samePool = available.filter((p) => (p.pool || "A") === poolTarget);
    const others = available.filter((p) => (p.pool || "A") !== poolTarget);
    return [...samePool, ...others].slice(0, 5);
  }, [players, activePlayer?.id, activePlayer?.pool]);

  const availablePools = useMemo(() => {
    const set = new Set(players.map((p) => p.pool || "A"));
    return ["ALL", ...Array.from(set)];
  }, [players]);

  const queuePlayers = useMemo(() => {
    const q = playerSearch.trim().toLowerCase();
    return players.filter((p) => {
      const isAvailableStatus =
        p.status === "pending" || p.status === "unsold" || p.status === "live";
      if (!isAvailableStatus) return false;

      if (statusFilter === "unsold" && p.status !== "unsold") return false;
      if (statusFilter === "pending" && p.status !== "pending") return false;

      const matchesPool =
        poolFilter === "ALL" || (p.pool || "A") === poolFilter;
      if (!matchesPool) return false;

      if (!q) return true;
      return (
        (p.name || "").toLowerCase().includes(q) ||
        (p.role || "").toLowerCase().includes(q) ||
        (p.pool || "").toLowerCase().includes(q)
      );
    });
  }, [players, statusFilter, poolFilter, playerSearch]);

  const selectedSquadTeam = useMemo(
    () => teams.find((t) => t.id === selectedSquadTeamId) || null,
    [teams, selectedSquadTeamId]
  );

  const selectedSquadPlayers = useMemo(() => {
    if (!selectedSquadTeamId) return [];
    return players.filter((p) => p.soldToTeamId === selectedSquadTeamId);
  }, [players, selectedSquadTeamId]);

  const projectorFullUrl = useMemo(() => {
    const origin = window.location.origin;
    const cleanBase = base.endsWith("/") ? base : `${base}/`;
    return `${origin}${cleanBase}#/auction-live/${auctionId}`;
  }, [base, auctionId]);

  const handleCopyProjectorLink = async () => {
    try {
      await navigator.clipboard.writeText(projectorFullUrl);
      setCopiedLink(true);
      showSuccess("लिंक कॉपी झाली", "प्रोजेक्टर / लाईव्ह स्क्रीन लिंक कॉपी केली आहे.");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      showError("कॉपी त्रुटी", "लिंक कॉपी करता आली नाही.");
    }
  };

  const handlePickPlayer = async (player) => {
    if (!allowControl) return;
    setBusy(true);
    try {
      await setLivePlayerForAuction(auctionId, player);
      showSuccess(
        player.status === "unsold" ? "Re-Auction Live" : "Live खेळाडू",
        `${player.name} लिलावासाठी आला आहे.`
      );
    } catch (err) {
      showError("त्रुटी", err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleBid = async (teamId) => {
    if (!allowControl) return;
    setBusy(true);
    try {
      await placeTeamBid(auctionId, teamId);
    } catch (err) {
      showError("बोली लागू शकली नाही", err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleUndo = async () => {
    if (!allowControl) return;
    setBusy(true);
    try {
      await undoLastBid(auctionId);
      showSuccess("Undo", "शेवटची बोली रद्द केली आहे.");
    } catch (err) {
      showError("त्रुटी", err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSold = async () => {
    if (!allowControl) return;
    setBusy(true);
    try {
      await markPlayerSold(auctionId);
      showSuccess("SOLD!", "खेळाडू विकला गेला आणि बजेट अपडेट झाले.");
    } catch (err) {
      showError("SOLD शक्य नाही", err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleUnsold = async () => {
    if (!allowControl) return;
    setBusy(true);
    try {
      await markPlayerUnsold(auctionId);
      showSuccess("UNSOLD", "खेळाडू Unsold म्हणून नोंदवला आहे.");
    } catch (err) {
      showError("त्रुटी", err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!auction) {
    return (
      <div className="p-6 text-center text-sm text-slate-500">
        लाईव्ह ऑक्शन डेटा लोड होत आहे...
      </div>
    );
  }

  const isControlActive = allowControl && mode === "control";
  const shouldMaskPublicPurse = Boolean(auction.hidePurseOnPublic) && !allowControl;
  const currentBid = Number(auction.currentBid || 0);
  const nextIncrement = getBidIncrement(currentBid, auction.incrementSlabs);
  const nextBidPreview = auction.currentBidderTeamId
    ? currentBid + nextIncrement
    : currentBid;

  const activeBgClass =
    PLAYER_BG_STYLES[activePlayer?.photoBgTheme || "studio-dark"] ||
    PLAYER_BG_STYLES["studio-dark"];

  return (
    <div className="space-y-5 bg-slate-950 text-white p-3 sm:p-6 rounded-3xl border border-slate-800 shadow-2xl">
      {/* Top Header & Compact Mobile / Full Desktop Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 border-b border-slate-800 pb-3.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              {auction.status.toUpperCase()}
            </span>
            <span className="text-[11px] text-slate-400 font-bold truncate">
              {auction.organizer}
            </span>
            {shouldMaskPublicPurse && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Lock className="w-2.5 h-2.5" />
                <span>Purse Hidden (Owner PIN)</span>
              </span>
            )}
          </div>
          <h2 className="text-lg sm:text-2xl font-black text-white mt-0.5 truncate">
            {auction.title}
          </h2>
        </div>

        {/* Mode Buttons + Owner PIN Link + Projector Link & Copy */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
          <div
            className={`${
              allowControl ? "grid grid-cols-3" : "grid grid-cols-2"
            } sm:flex items-center gap-1 sm:gap-2 w-full sm:w-auto`}
          >
            {allowControl && (
              <button
                type="button"
                onClick={() => {
                  setSelectedSquadTeamId(null);
                  setMode("control");
                }}
                className={`inline-flex items-center justify-center gap-1 px-2 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black whitespace-nowrap cursor-pointer ${
                  isControlActive
                    ? "bg-orange-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <Sliders className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span>Control</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setSelectedSquadTeamId(null);
                setMode("display");
              }}
              className={`inline-flex items-center justify-center gap-1 px-2 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black whitespace-nowrap cursor-pointer ${
                mode === "display"
                  ? "bg-amber-500 text-slate-950"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <Tv className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span>Live Screen</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedSquadTeamId(null);
                setMode("squads");
              }}
              className={`inline-flex items-center justify-center gap-1 px-2 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black whitespace-nowrap cursor-pointer ${
                mode === "squads"
                  ? "bg-emerald-500 text-slate-950"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span>Squads</span>
            </button>
          </div>

          {!allowControl && (
            <a
              href={`#/auction-team/${auctionId}`}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] sm:text-xs font-black whitespace-nowrap"
            >
              <KeyRound className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span>Owner PIN</span>
            </a>
          )}

          {allowControl && (
            <div className="grid grid-cols-2 sm:flex items-center gap-1 sm:gap-1.5 w-full sm:w-auto">
              <a
                href={`#/auction-live/${auctionId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 text-[10px] sm:text-xs font-black whitespace-nowrap"
              >
                <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span>Projector</span>
              </a>

              <button
                type="button"
                onClick={handleCopyProjectorLink}
                className="inline-flex items-center justify-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-[10px] sm:text-xs font-black whitespace-nowrap cursor-pointer"
              >
                {copiedLink ? (
                  <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                )}
                <span>{copiedLink ? "Copied" : "Copy Link"}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODE 3: IPL-STYLE TEAM SQUADS VIEW + IMAGE CARD & PDF */}
      {mode === "squads" ? (
        <div className="space-y-5">
          <div className="bg-slate-900/90 p-3 sm:p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {teams.map((t, idx) => {
                const activeTeamId = selectedSquadTeamId || teams[0]?.id;
                const isSelected = t.id === activeTeamId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedSquadTeamId(t.id)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full text-xs font-black border transition cursor-pointer ${
                      isSelected
                        ? "bg-orange-600 text-white border-orange-400 shadow-md"
                        : "bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-600"
                    }`}
                  >
                    {t.logoUrl ? (
                      <img
                        src={t.logoUrl}
                        alt={t.name}
                        className="w-5 h-5 rounded-full object-contain bg-black p-0.5"
                      />
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                    )}
                    <span>{t.shortName || t.name}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() =>
                printTeamSquadPdf({
                  auction,
                  teams,
                  players,
                  selectedTeamId: null,
                  hidePurse: shouldMaskPublicPurse
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-[11px] font-black cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>All Teams PDF</span>
            </button>
          </div>

          {(() => {
            const currentTeam =
              teams.find((t) => t.id === (selectedSquadTeamId || teams[0]?.id)) ||
              null;
            if (!currentTeam) return null;

            const squadList = players.filter(
              (p) => p.soldToTeamId === currentTeam.id
            );
            const totalPurse = Number(
              currentTeam.totalPurse ?? auction.purseAmount ?? 0
            );
            const remaining = Number(currentTeam.remainingPurse ?? 0);
            const spent = Math.max(0, totalPurse - remaining);
            const maxBid = getMaxAllowedBid(
              currentTeam,
              auction,
              activePlayer?.basePrice || auction.basePrice
            );

            return (
              <div className="space-y-4">
                <div className="bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                    <div className="flex items-center gap-3.5 min-w-0">
                      {currentTeam.logoUrl ? (
                        <img
                          src={currentTeam.logoUrl}
                          alt={currentTeam.name}
                          className="w-14 h-14 rounded-2xl object-contain bg-black p-1 border border-slate-700 shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-orange-500/20 text-orange-300 font-black text-lg flex items-center justify-center shrink-0">
                          {currentTeam.shortName || "TM"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="text-xl sm:text-2xl font-black text-white truncate">
                          {currentTeam.name}
                        </h3>
                        <div className="text-xs text-slate-400">
                          प्रतिनिधी: {currentTeam.ownerName || "-"} • मर्यादा:{" "}
                          {squadList.length}/{auction.maxPlayers}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await downloadTeamSquadImageCard({
                              auction,
                              team: currentTeam,
                              squadPlayers: squadList,
                              dummyPlayerPhoto,
                              hidePurse: shouldMaskPublicPurse
                            });
                            showSuccess(
                              "Image तयार झाली",
                              `${currentTeam.name} चे Squad Card PNG डाउनलोड झाले आहे.`
                            );
                          } catch (err) {
                            showError("Image त्रुटी", err.message);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black cursor-pointer"
                      >
                        <ImageDown className="w-3.5 h-3.5" />
                        <span>Squad Image</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          printTeamSquadPdf({
                            auction,
                            teams,
                            players,
                            selectedTeamId: currentTeam.id,
                            hidePurse: shouldMaskPublicPurse
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-black cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Team PDF</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left sm:text-right">
                    <div className="bg-slate-950 px-3.5 py-2.5 rounded-2xl border border-slate-800">
                      <div className="text-[10px] uppercase text-slate-400 font-bold">
                        SPENT (खर्च)
                      </div>
                      <div className="text-sm sm:text-base font-black text-rose-400">
                        {shouldMaskPublicPurse
                          ? "🔒 PIN Only"
                          : `₹${spent.toLocaleString()}`}
                      </div>
                    </div>

                    <div className="bg-slate-950 px-3.5 py-2.5 rounded-2xl border border-slate-800">
                      <div className="text-[10px] uppercase text-slate-400 font-bold">
                        BOUGHT (खेळाडू)
                      </div>
                      <div className="text-sm sm:text-base font-black text-white">
                        {squadList.length}
                      </div>
                    </div>

                    <div className="bg-slate-950 px-3.5 py-2.5 rounded-2xl border border-slate-800">
                      <div className="text-[10px] uppercase text-slate-400 font-bold">
                        MAX BID
                      </div>
                      <div className="text-sm sm:text-base font-black text-sky-400">
                        {shouldMaskPublicPurse
                          ? "🔒 PIN Only"
                          : `₹${maxBid.toLocaleString()}`}
                      </div>
                    </div>

                    <div className="bg-slate-950 px-3.5 py-2.5 rounded-2xl border border-emerald-500/30">
                      <div className="text-[10px] uppercase text-emerald-300 font-bold">
                        REMAINING (शिल्लक)
                      </div>
                      <div className="text-sm sm:text-base font-black text-emerald-400">
                        {shouldMaskPublicPurse
                          ? "🔒 PIN Only"
                          : `₹${remaining.toLocaleString()}`}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
                  <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-950 text-[11px] font-black uppercase text-slate-400 border-b border-slate-800">
                    <div className="col-span-6 sm:col-span-5">Player</div>
                    <div className="col-span-3 sm:col-span-2">Pool</div>
                    <div className="hidden sm:block sm:col-span-3">Role</div>
                    <div className="col-span-3 sm:col-span-2 text-right">Price</div>
                  </div>

                  {squadList.length > 0 ? (
                    <div className="divide-y divide-slate-800/80">
                      {squadList.map((sp, i) => {
                        const bgClass =
                          PLAYER_BG_STYLES[sp.photoBgTheme || "studio-dark"] ||
                          PLAYER_BG_STYLES["studio-dark"];
                        return (
                          <div
                            key={sp.id}
                            className="grid grid-cols-12 gap-2 items-center px-4 py-3 hover:bg-slate-800/40 transition"
                          >
                            <div className="col-span-6 sm:col-span-5 flex items-center gap-3 min-w-0">
                              <span className="text-xs font-bold text-slate-500 w-4 shrink-0">
                                {i + 1}
                              </span>
                              <div
                                className={`w-11 h-11 rounded-xl border overflow-hidden shrink-0 ${bgClass}`}
                              >
                                <img
                                  src={(sp.photoUrl || "").trim() || dummyPlayerPhoto}
                                  alt={sp.name}
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
                                <div className="text-xs sm:text-sm font-black text-white truncate">
                                  {sp.name}
                                </div>
                                <div className="text-[10px] text-slate-400 sm:hidden">
                                  {sp.role}
                                </div>
                              </div>
                            </div>

                            <div className="col-span-3 sm:col-span-2">
                              <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-black bg-sky-500/15 text-sky-300 border border-sky-500/30">
                                Pool {sp.pool || "A"}
                              </span>
                            </div>

                            <div className="hidden sm:block sm:col-span-3 text-xs font-semibold text-slate-300">
                              {sp.role}
                            </div>

                            <div className="col-span-3 sm:col-span-2 text-right text-xs sm:text-sm font-black text-emerald-400">
                              {shouldMaskPublicPurse
                                ? "🔒 PIN Only"
                                : `₹${Number(sp.soldPrice || 0).toLocaleString()}`}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-10 text-center text-xs text-slate-400">
                      या संघाने अद्याप कोणताही खेळाडू खरेदी केलेला नाही.
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      ) : !isControlActive ? (
        /* MODE 2: LARGE PROJECTOR / BROADCAST LIVE SCREEN (Read-Only) */
        <div className="bg-slate-900 rounded-3xl p-5 sm:p-8 border-2 border-amber-500/40 shadow-2xl">
          {activePlayer ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
              <div className="lg:col-span-5 flex flex-col items-center">
                <div
                  className={`w-60 sm:w-68 lg:w-76 h-72 sm:h-84 lg:h-92 rounded-3xl border-2 overflow-hidden flex items-center justify-center shadow-2xl ${activeBgClass}`}
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
              </div>

              <div className="lg:col-span-7 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3.5 py-1 rounded-full bg-orange-500/20 text-orange-300 text-xs sm:text-sm font-black border border-orange-500/30">
                      Pool {activePlayer.pool || "A"} • {activePlayer.role}
                    </span>
                    {activePlayer.status === "unsold" && (
                      <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black border border-amber-500/30">
                        Re-Auction
                      </span>
                    )}
                  </div>
                  <span className="text-xs sm:text-sm text-slate-300 font-bold">
                    Base Price: ₹{Number(activePlayer.basePrice || 0).toLocaleString()}
                  </span>
                </div>

                <div>
                  <h3 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                    {activePlayer.name}
                  </h3>
                  <div className="text-sm text-slate-400 font-semibold mt-1">
                    {activePlayer.specialty || activePlayer.role} • पुढील वाढ: +₹
                    {nextIncrement.toLocaleString()}
                  </div>
                </div>

                <div className="bg-slate-950 rounded-3xl p-5 sm:p-6 border-2 border-amber-400/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-center sm:text-left">
                    <div className="text-xs uppercase tracking-wider text-amber-300 font-black">
                      सध्याची सर्वाधिक बोली
                    </div>
                    <div className="text-4xl sm:text-6xl font-black text-amber-400 mt-1">
                      ₹{currentBid.toLocaleString()}
                    </div>
                  </div>

                  <div className="text-center sm:text-right bg-slate-900/90 px-4 py-3 rounded-2xl border border-slate-800 min-w-[210px]">
                    <div className="text-[11px] text-slate-400 font-bold">
                      आघाडीवर असलेला संघ
                    </div>
                    <div className="flex items-center justify-center sm:justify-end gap-2 mt-1">
                      {leadingTeam?.logoUrl && (
                        <img
                          src={leadingTeam.logoUrl}
                          alt={leadingTeam.name}
                          className="w-7 h-7 rounded-lg object-contain bg-black p-0.5"
                        />
                      )}
                      <span className="text-lg sm:text-xl font-black text-emerald-400">
                        {leadingTeam ? leadingTeam.name : "बोली प्रतीक्षेत..."}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-slate-950 rounded-2xl p-3 border border-slate-800">
                    <div className="text-[11px] text-slate-400">सामने (Matches)</div>
                    <div className="text-lg font-black text-white mt-0.5">
                      {activePlayer.matches ?? "-"}
                    </div>
                  </div>
                  <div className="bg-slate-950 rounded-2xl p-3 border border-slate-800">
                    <div className="text-[11px] text-slate-400">धावा (Runs)</div>
                    <div className="text-lg font-black text-amber-400 mt-0.5">
                      {activePlayer.runs ?? "-"}
                    </div>
                  </div>
                  <div className="bg-slate-950 rounded-2xl p-3 border border-slate-800">
                    <div className="text-[11px] text-slate-400">बळी (Wickets)</div>
                    <div className="text-lg font-black text-emerald-400 mt-0.5">
                      {activePlayer.wickets ?? "-"}
                    </div>
                  </div>
                  <div className="bg-slate-950 rounded-2xl p-3 border border-slate-800">
                    <div className="text-[11px] text-slate-400">स्ट्राईक रेट</div>
                    <div className="text-lg font-black text-sky-400 mt-0.5">
                      {activePlayer.strikeRate ?? "-"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-14 text-center space-y-2">
              <Gavel className="w-12 h-12 text-amber-400 mx-auto" />
              <div className="text-2xl font-black text-white">
                पुढील खेळाडू लवकरच स्टेजवर येत आहे...
              </div>
              <p className="text-sm text-slate-400">
                कृपया प्रतीक्षा करा, लाईव्ह बोली सुरू होत आहे.
              </p>
            </div>
          )}

          {/* 5 Upcoming Players Strip with Small Photos */}
          {upcomingPreviewPlayers.length > 0 && (
            <div className="mt-6 pt-5 border-t border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-amber-300 uppercase tracking-wider">
                  पुढील संभाव्य खेळाडू (
                  {activePlayer?.pool ? `Pool ${activePlayer.pool}` : "Upcoming"})
                </span>
                <span className="text-slate-400">
                  बाकी: {pendingCount + unsoldCount} खेळाडू
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {upcomingPreviewPlayers.map((up) => {
                  const bgClass =
                    PLAYER_BG_STYLES[up.photoBgTheme || "studio-dark"] ||
                    PLAYER_BG_STYLES["studio-dark"];
                  return (
                    <div
                      key={up.id}
                      className="bg-slate-950/90 border border-slate-800 rounded-2xl p-2.5 flex items-center gap-2.5 min-w-0"
                    >
                      <div
                        className={`w-10 h-10 rounded-xl border overflow-hidden shrink-0 ${bgClass}`}
                      >
                        <img
                          src={(up.photoUrl || "").trim() || dummyPlayerPhoto}
                          alt={up.name}
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
                          {up.name}
                        </div>
                        <div className="text-[10px] text-amber-300/90 truncate">
                          {up.role} • {up.pool || "A"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* MODE 1: AUCTIONEER CONTROL PANEL (फक्त allowControl=true असतानाच) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-800 space-y-4">
            {activePlayer ? (
              <>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 font-black border border-orange-500/30">
                      Pool {activePlayer.pool || "A"} • {activePlayer.role}
                    </span>
                    {activePlayer.status === "unsold" && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black border border-amber-500/30">
                        Re-Auction
                      </span>
                    )}
                  </div>
                  <span className="text-slate-400 font-bold">
                    Base: ₹{Number(activePlayer.basePrice || 0).toLocaleString()}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-4">
                  <div
                    className={`w-44 sm:w-38 h-48 rounded-2xl border overflow-hidden flex items-center justify-center shrink-0 mx-auto sm:mx-0 shadow-lg ${activeBgClass}`}
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

                  <div className="flex-1 w-full bg-slate-950/90 rounded-2xl p-3.5 border border-slate-800 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-orange-400 font-black">
                        Player Profile & Stats
                      </div>
                      <h3 className="text-lg font-black text-white leading-snug mt-0.5">
                        {activePlayer.name}
                      </h3>
                      <div className="text-xs text-slate-400 font-semibold mt-0.5">
                        {activePlayer.specialty || activePlayer.role}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="bg-slate-900 rounded-xl p-2 border border-slate-800">
                        <div className="text-[10px] text-slate-400">सामने</div>
                        <div className="text-sm font-black text-white">
                          {activePlayer.matches ?? "-"}
                        </div>
                      </div>
                      <div className="bg-slate-900 rounded-xl p-2 border border-slate-800">
                        <div className="text-[10px] text-slate-400">धावा</div>
                        <div className="text-sm font-black text-amber-400">
                          {activePlayer.runs ?? "-"}
                        </div>
                      </div>
                      <div className="bg-slate-900 rounded-xl p-2 border border-slate-800">
                        <div className="text-[10px] text-slate-400">बळी</div>
                        <div className="text-sm font-black text-emerald-400">
                          {activePlayer.wickets ?? "-"}
                        </div>
                      </div>
                      <div className="bg-slate-900 rounded-xl p-2 border border-slate-800">
                        <div className="text-[10px] text-slate-400">SR / Eco</div>
                        <div className="text-sm font-black text-sky-400">
                          {activePlayer.strikeRate ?? "-"}
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800 pt-2">
                      <span>पुढील वाढ स्लॅब:</span>
                      <span className="font-black text-amber-300">
                        +₹{nextIncrement.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950 rounded-2xl p-4 border border-amber-500/30 text-center space-y-1">
                  <div className="text-[11px] uppercase tracking-wider text-amber-300 font-bold">
                    सध्याची बोली
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-amber-400">
                    ₹{currentBid.toLocaleString()}
                  </div>
                  <div className="text-sm font-black text-emerald-400 pt-1">
                    {leadingTeam
                      ? `आघाडीवर: ${leadingTeam.name}`
                      : "सुरुवातीची बोली प्रतीक्षेत..."}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    disabled={busy || !(auction.bidHistory?.length > 0)}
                    onClick={handleUndo}
                    className="inline-flex items-center justify-center gap-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-black cursor-pointer"
                  >
                    <Undo2 className="w-4 h-4" />
                    <span>Undo</span>
                  </button>

                  <button
                    type="button"
                    disabled={busy || !leadingTeam}
                    onClick={handleSold}
                    className="inline-flex items-center justify-center gap-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-black cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>SOLD</span>
                  </button>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleUnsold}
                    className="inline-flex items-center justify-center gap-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-xs font-black cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>UNSOLD</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="py-16 text-center space-y-2">
                <Gavel className="w-10 h-10 text-orange-400 mx-auto" />
                <div className="text-base font-black text-white">
                  पुढचा खेळाडू निवडा
                </div>
                <p className="text-xs text-slate-400">
                  उजव्या/खालच्या खेळाडू यादीतून खेळाडूवर क्लिक करून Live स्टेजवर आणा.
                </p>
              </div>
            )}
          </div>

          <div className="lg:col-span-7 space-y-5">
            {activePlayer && (
              <div className="bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-white">
                    बोली लावा (Next Bid: ₹{nextBidPreview.toLocaleString()})
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Min Players: {auction.minPlayers} | Max: {auction.maxPlayers}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {teams.map((t) => {
                    const maxAllowed = getMaxAllowedBid(
                      t,
                      auction,
                      activePlayer.basePrice
                    );
                    const isLeading = auction.currentBidderTeamId === t.id;
                    const canBid =
                      !busy &&
                      !isLeading &&
                      Number(t.playersCount || 0) < Number(auction.maxPlayers || 12) &&
                      nextBidPreview <= maxAllowed;

                    return (
                      <button
                        key={t.id}
                        type="button"
                        disabled={!canBid}
                        onClick={() => handleBid(t.id)}
                        className={`p-3 rounded-2xl border text-left transition flex items-center justify-between gap-2 cursor-pointer ${
                          isLeading
                            ? "bg-emerald-950/70 border-emerald-500 text-white"
                            : canBid
                            ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-white"
                            : "bg-slate-900/60 border-slate-800 text-slate-500 opacity-60 cursor-not-allowed"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-black text-xs sm:text-sm truncate">
                            {t.name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            शिल्लक: ₹{Number(t.remainingPurse || 0).toLocaleString()} •
                            Max: ₹{maxAllowed.toLocaleString()}
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-xl bg-orange-600 text-white text-[11px] font-black shrink-0">
                          {isLeading ? "Leading" : `₹${nextBidPreview.toLocaleString()}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowPlayerPicker((prev) => !prev)}
                  className="flex items-center gap-2 text-sm font-black text-white cursor-pointer"
                >
                  <ListFilter className="w-4 h-4 text-orange-400" />
                  <span>
                    खेळाडू निवडा ({queuePlayers.length} उपलब्ध • Unsold:{" "}
                    {unsoldCount})
                  </span>
                  {showPlayerPicker ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {unsoldCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowPlayerPicker(true);
                      setStatusFilter("unsold");
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-black cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Unsold ({unsoldCount})</span>
                  </button>
                )}
              </div>

              {showPlayerPicker && (
                <>
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={playerSearch}
                        onChange={(e) => setPlayerSearch(e.target.value)}
                        placeholder="खेळाडूचे नाव, रोल किंवा Pool शोधा..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setStatusFilter("ALL_AVAILABLE")}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                            statusFilter === "ALL_AVAILABLE"
                              ? "bg-orange-600 text-white"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          सर्व ({pendingCount + unsoldCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatusFilter("pending")}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                            statusFilter === "pending"
                              ? "bg-orange-600 text-white"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          Pending ({pendingCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatusFilter("unsold")}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                            statusFilter === "unsold"
                              ? "bg-amber-500 text-slate-950"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          Unsold ({unsoldCount})
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {availablePools.map((pool) => (
                          <button
                            key={pool}
                            type="button"
                            onClick={() => setPoolFilter(pool)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                              poolFilter === pool
                                ? "bg-slate-200 text-slate-950"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {pool === "ALL" ? "All Pools" : `Pool ${pool}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                    {queuePlayers.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        disabled={busy}
                        onClick={() => handlePickPlayer(p)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-left text-xs transition cursor-pointer ${
                          p.id === auction.activePlayerId
                            ? "bg-orange-600/20 border-orange-500 text-white"
                            : p.status === "unsold"
                            ? "bg-amber-950/40 hover:bg-amber-950/70 border-amber-500/40 text-amber-100"
                            : "bg-slate-800/70 hover:bg-slate-800 border-slate-700 text-slate-200"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-bold truncate">{p.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {p.role} • Pool {p.pool || "A"} • ₹
                            {Number(p.basePrice || 0).toLocaleString()}
                          </div>
                        </div>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-950 text-amber-300 shrink-0">
                          {p.status === "unsold" ? "Re-Bid" : p.status}
                        </span>
                      </button>
                    ))}
                    {queuePlayers.length === 0 && (
                      <div className="col-span-full text-center py-6 text-xs text-slate-500">
                        या फिल्टरमध्ये कोणताही खेळाडू सापडला नाही.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* All Teams Purse, Max Bid & Squad Summary */}
      <div className="space-y-3 pt-2 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-black text-white">
            <Wallet className="w-4 h-4 text-amber-400" />
            <span>
              {shouldMaskPublicPurse
                ? "संघांचे खेळाडू व स्थिती (बजेट Owner PIN वर)"
                : "संघांचे शिल्लक बजेट, Max Bid आणि खेळाडू"}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            कार्डवर क्लिक करून Squad पहा
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {teams.map((t) => {
            const teamPlayers = players.filter((p) => p.soldToTeamId === t.id);
            const isLeading = auction.currentBidderTeamId === t.id;
            const maxBid = getMaxAllowedBid(
              t,
              auction,
              activePlayer?.basePrice || auction.basePrice
            );

            return (
              <div
                key={t.id}
                onClick={() => setSelectedSquadTeamId(t.id)}
                className={`rounded-2xl p-3 border space-y-2 transition cursor-pointer ${
                  isLeading
                    ? "bg-emerald-950/60 border-emerald-500"
                    : "bg-slate-900 hover:border-slate-700 border-slate-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  {t.logoUrl ? (
                    <img
                      src={t.logoUrl}
                      alt={t.name}
                      className="w-8 h-8 rounded-lg object-contain bg-black p-0.5 shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-300 font-black text-xs flex items-center justify-center shrink-0">
                      {t.shortName || "TM"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-black text-white truncate">
                      {t.name}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>
                        {t.playersCount || 0}/{auction.maxPlayers}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  {shouldMaskPublicPurse ? (
                    <div className="text-[11px] font-black text-amber-300 py-1">
                      🔒 Team PIN Only
                    </div>
                  ) : (
                    <>
                      <div className="text-[10px] text-slate-400">शिल्लक बजेट</div>
                      <div className="text-sm font-black text-amber-400">
                        ₹{Number(t.remainingPurse || 0).toLocaleString()}
                      </div>
                      <div className="text-[11px] font-bold text-emerald-400 mt-0.5">
                        Max Bid: ₹{maxBid.toLocaleString()}
                      </div>
                    </>
                  )}
                </div>

                <div className="text-[10px] text-slate-400 line-clamp-2">
                  {teamPlayers.length > 0
                    ? teamPlayers.map((tp) => tp.name).join(", ")
                    : "अद्याप खेळाडू नाहीत"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Team Full Squad Detail Modal (फक्त खालच्या कार्डवर क्लिक केल्यावरच) */}
      {selectedSquadTeam && mode !== "squads" && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white w-full max-w-2xl max-h-[85vh] rounded-3xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  {selectedSquadTeam.name} — Squad ({selectedSquadPlayers.length}/
                  {auction.maxPlayers})
                </h3>
                <div className="text-xs text-slate-400 mt-0.5">
                  {shouldMaskPublicPurse ? (
                    <span className="text-amber-300 font-bold">
                      🔒 बजेट व Max Bid पाहण्यासाठी Team Owner PIN वापरा
                    </span>
                  ) : (
                    <>
                      शिल्लक: ₹
                      {Number(
                        selectedSquadTeam.remainingPurse || 0
                      ).toLocaleString()}{" "}
                      • Max Bid: ₹
                      {getMaxAllowedBid(
                        selectedSquadTeam,
                        auction,
                        activePlayer?.basePrice || auction.basePrice
                      ).toLocaleString()}
                    </>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSquadTeamId(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-2.5">
              {selectedSquadPlayers.length > 0 ? (
                selectedSquadPlayers.map((sp) => {
                  const bgClass =
                    PLAYER_BG_STYLES[sp.photoBgTheme || "studio-dark"] ||
                    PLAYER_BG_STYLES["studio-dark"];
                  return (
                    <div
                      key={sp.id}
                      className="flex items-center justify-between gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-12 h-12 rounded-xl border overflow-hidden shrink-0 ${bgClass}`}
                        >
                          <img
                            src={(sp.photoUrl || "").trim() || dummyPlayerPhoto}
                            alt={sp.name}
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
                            {sp.name}
                          </div>
                          <div className="text-xs text-amber-300 font-bold">
                            {sp.role} • Pool {sp.pool || "A"}
                          </div>
                        </div>
                      </div>

                      <div className="text-sm font-black text-emerald-400 shrink-0">
                        {shouldMaskPublicPurse
                          ? "🔒 PIN Only"
                          : `₹${Number(sp.soldPrice || 0).toLocaleString()}`}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-xs text-slate-400">
                  या संघाने अद्याप कोणताही खेळाडू खरेदी केलेला नाही.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}