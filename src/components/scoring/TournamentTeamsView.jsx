// src/components/scoring/TournamentTeamsView.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  UserPlus,
  Search,
  Plus,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Shield,
  Image as ImageIcon,
  ArrowUpDown,
  Trophy,
  BarChart3
} from "lucide-react";
import {
  getTournaments,
  getTeams,
  createTeam,
  addTeamToTournament,
  removeTeamFromTournament,
  getPlayers,
  createPlayer,
  addPlayerToTeam,
  removePlayerFromTeam,
  setTeamPlayerLineStatus,
  getMatches,
  formatOversFromBalls
} from "../../services/scoringLocalEngine";
import {
  searchJbscMasterPlayers,
  lookupJbscPlayerByMobile,
  upsertJbscMasterPlayer,
  normalizeMobile10,
  normalizePlayerIdCode
} from "../../services/playerMasterService";
import { uploadToImgbb } from "../../services/imageUploadService";
import { showSuccess, showError } from "../../utils/alert";

function deriveShortName(fullName = "") {
  const words = String(fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words
    .slice(0, 4)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default function TournamentTeamsView({
  tournamentId = "",
  onBackToTournaments,
  onProceedToMatches
}) {
  // === SECTION: COMPONENT STATE START ===
  const [tournaments, setTournaments] = useState([]);
  const [activeTournamentId, setActiveTournamentId] = useState(tournamentId);
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);

  // Sub-Views: "teams_list" | "team_detail" | "add_player" | "create_team" | "create_player"
  const [subView, setSubView] = useState("teams_list");

  // Inside Team Detail: "overview" | "players" | "matches" | "tournaments" | "statistics"
  const [teamDetailTab, setTeamDetailTab] = useState("overview");
  // Scope for Matches & Statistics inside Team Detail: "tournament" | "overall"
  const [teamScope, setTeamScope] = useState("tournament");

  // Team Search & Selection
  const [teamSearch, setTeamSearch] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");

  // Create New Team Sub-View State
  const [newTeamName, setNewTeamName] = useState("");
  const [newShortName, setNewShortName] = useState("");
  const [shortNameTouched, setShortNameTouched] = useState(false);
  const [newTeamPlace, setNewTeamPlace] = useState("");
  const [newTeamLogo, setNewTeamLogo] = useState("");
  const [newTeamClub, setNewTeamClub] = useState("");
  const [newTeamSlogan, setNewTeamSlogan] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [autoAddCreatedTeam, setAutoAddCreatedTeam] = useState(true);

  // Squad Search & A-Z Sort State (Playing & Bench)
  const [squadFilterQuery, setSquadFilterQuery] = useState("");
  const [sortAzEnabled, setSortAzEnabled] = useState(false);

  // Add Player Sub-View Search (Local + Master ID/Name)
  const [playerSearch, setPlayerSearch] = useState("");
  const [masterSearchResults, setMasterSearchResults] = useState([]);
  const [searchingMaster, setSearchingMaster] = useState(false);

  // Create New Player Sub-View State
  const [newPlayerCodeInput, setNewPlayerCodeInput] = useState("");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerMobile, setNewPlayerMobile] = useState("");
  const [newPlayerRole, setNewPlayerRole] = useState("All-rounder");
  const [newPlayerLineStatus, setNewPlayerLineStatus] = useState("playing");
  // === SECTION: COMPONENT STATE END ===

  // === SECTION: DATA LOAD & DERIVED LISTS START ===
  const reloadAll = () => {
    const trnList = getTournaments();
    const tmList = getTeams();
    const plList = getPlayers();
    const mtList = getMatches();

    setTournaments(trnList);
    setTeams(tmList);
    setPlayers(plList);
    setMatches(mtList);

    const targetTrnId =
      tournamentId || activeTournamentId || (trnList[0]?.id ?? "");
    setActiveTournamentId(targetTrnId);
  };

  useEffect(() => {
    reloadAll();
  }, [tournamentId]);

  useEffect(() => {
    let cancelled = false;
    const q = playerSearch.trim();
    if (!q) {
      setMasterSearchResults([]);
      setSearchingMaster(false);
      return;
    }

    setSearchingMaster(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchJbscMasterPlayers(q);
        if (!cancelled) {
          setMasterSearchResults(Array.isArray(res) ? res : []);
        }
      } catch (err) {
        console.error("[AddPlayer Master Search Error]", err);
      } finally {
        if (!cancelled) setSearchingMaster(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [playerSearch]);

  const activeTournament = useMemo(
    () => tournaments.find((t) => t.id === activeTournamentId) || null,
    [tournaments, activeTournamentId]
  );

  const tournamentTeamIds = useMemo(
    () =>
      Array.isArray(activeTournament?.tournamentTeamIds)
        ? activeTournament.tournamentTeamIds
        : [],
    [activeTournament]
  );

  const tournamentTeams = useMemo(
    () =>
      tournamentTeamIds
        .map((id) => teams.find((tm) => tm.id === id))
        .filter(Boolean),
    [tournamentTeamIds, teams]
  );

  const teamMap = useMemo(
    () => Object.fromEntries(teams.map((t) => [t.id, t])),
    [teams]
  );

  const playerMap = useMemo(
    () => Object.fromEntries(players.map((p) => [p.id, p])),
    [players]
  );

  const searchableAvailableTeams = useMemo(() => {
    const q = teamSearch.trim().toLowerCase();
    return teams.filter((tm) => {
      if (tournamentTeamIds.includes(tm.id)) return false;
      if (!q) return true;
      return (
        String(tm.teamCode || "").toLowerCase().includes(q) ||
        String(tm.shortName || "").toLowerCase().includes(q) ||
        String(tm.name || "").toLowerCase().includes(q) ||
        String(tm.place || "").toLowerCase().includes(q) ||
        String(tm.club || "").toLowerCase().includes(q)
      );
    });
  }, [teams, tournamentTeamIds, teamSearch]);

  const currentTeam = useMemo(
    () => teams.find((tm) => tm.id === selectedTeamId) || null,
    [teams, selectedTeamId]
  );

  const rosterMap = useMemo(
    () => currentTeam?.squadRoster || {},
    [currentTeam]
  );

  const squadPlayerIds = useMemo(() => Object.keys(rosterMap), [rosterMap]);

  const filterAndSortRosterPlayers = (statusFilter) => {
    const q = squadFilterQuery.trim().toLowerCase();
    const list = squadPlayerIds
      .filter((pid) => {
        const st = rosterMap[pid]?.status || "playing";
        return statusFilter === "playing" ? st === "playing" : st === "bench";
      })
      .map((pid) => players.find((p) => p.id === pid))
      .filter((p) => {
        if (!p) return false;
        if (!q) return true;
        return (
          String(p.name || "").toLowerCase().includes(q) ||
          String(p.role || "").toLowerCase().includes(q) ||
          String(p.playerCode || "").toLowerCase().includes(q)
        );
      });

    if (sortAzEnabled) {
      return [...list].sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || ""), undefined, {
          sensitivity: "base"
        })
      );
    }
    return list;
  };

  const playingPlayers = useMemo(
    () => filterAndSortRosterPlayers("playing"),
    [squadPlayerIds, rosterMap, players, squadFilterQuery, sortAzEnabled]
  );

  const benchPlayers = useMemo(
    () => filterAndSortRosterPlayers("bench"),
    [squadPlayerIds, rosterMap, players, squadFilterQuery, sortAzEnabled]
  );

  const availableLocalPlayersToAdd = useMemo(() => {
    const q = playerSearch.trim().toLowerCase();
    const normCode = normalizePlayerIdCode(playerSearch).toLowerCase();
    return players.filter((p) => {
      if (squadPlayerIds.includes(p.id)) return false;
      if (!q) return true;
      const codeLower = String(p.playerCode || "").toLowerCase();
      const nameLower = String(p.name || "").toLowerCase();
      const roleLower = String(p.role || "").toLowerCase();
      return (
        codeLower.includes(q) ||
        (normCode && codeLower.includes(normCode)) ||
        nameLower.includes(q) ||
        roleLower.includes(q)
      );
    });
  }, [players, squadPlayerIds, playerSearch]);

  const combinedCandidatesToAdd = useMemo(() => {
    const mapByKey = new Map();

    availableLocalPlayersToAdd.forEach((lp) => {
      const key =
        String(lp.playerCode || "").toUpperCase() ||
        String(lp.name || "").toLowerCase();
      mapByKey.set(key, {
        source: "local",
        localPlayerId: lp.id,
        playerCode: lp.playerCode || "",
        name: lp.name,
        role: lp.role || "All-rounder",
        mobile: lp.mobile || "",
        photoUrl: lp.photoUrl || ""
      });
    });

    masterSearchResults.forEach((mp) => {
      const mpName = mp.fullName || mp.name || "";
      if (!mpName) return;
      const key =
        String(mp.playerId || "").toUpperCase() || mpName.toLowerCase();
      if (!mapByKey.has(key)) {
        mapByKey.set(key, {
          source: "master",
          localPlayerId: null,
          playerCode: mp.playerId || "",
          name: mpName,
          role: mp.role || "All-rounder",
          mobile: normalizeMobile10(mp.mobile || ""),
          photoUrl: mp.photoUrl || ""
        });
      }
    });

    return Array.from(mapByKey.values());
  }, [availableLocalPlayersToAdd, masterSearchResults]);

  // Team Tournaments, Matches & Stats (Tournament-wise + Overall)
  const currentTeamAllMatches = useMemo(() => {
    if (!currentTeam) return [];
    return matches.filter(
      (m) => m.teamAId === currentTeam.id || m.teamBId === currentTeam.id
    );
  }, [currentTeam, matches]);

  const currentTeamFilteredMatches = useMemo(() => {
    if (teamScope === "tournament" && activeTournamentId) {
      return currentTeamAllMatches.filter(
        (m) => m.tournamentId === activeTournamentId
      );
    }
    return currentTeamAllMatches;
  }, [currentTeamAllMatches, teamScope, activeTournamentId]);

  const currentTeamTournaments = useMemo(() => {
    if (!currentTeam) return [];
    const fromRoster = tournaments.filter((t) =>
      (t.tournamentTeamIds || []).includes(currentTeam.id)
    );
    const fromMatches = tournaments.filter((t) =>
      currentTeamAllMatches.some((m) => m.tournamentId === t.id)
    );
    const mergedMap = new Map();
    [...fromRoster, ...fromMatches].forEach((t) => mergedMap.set(t.id, t));
    return Array.from(mergedMap.values());
  }, [currentTeam, tournaments, currentTeamAllMatches]);

  const currentTeamSummary = useMemo(() => {
    const list = currentTeamFilteredMatches;
    const completed = list.filter((m) => m.status === "completed");
    const won = completed.filter(
      (m) => currentTeam && m.winnerTeamId === currentTeam.id
    ).length;
    const lost = completed.filter(
      (m) =>
        currentTeam &&
        m.winnerTeamId &&
        m.winnerTeamId !== currentTeam.id
    ).length;

    const playerTotals = {};
    list.forEach((m) => {
      (m.innings || []).forEach((inn) => {
        Object.entries(inn.playerStats || {}).forEach(([pid, st]) => {
          if (!playerTotals[pid]) {
            playerTotals[pid] = {
              playerId: pid,
              name: playerMap[pid]?.name || pid,
              runs: 0,
              balls: 0,
              wickets: 0,
              sixes: 0
            };
          }
          playerTotals[pid].runs += Number(st.runs || 0);
          playerTotals[pid].balls += Number(st.balls || 0);
          playerTotals[pid].wickets += Number(st.wickets || 0);
          playerTotals[pid].sixes += Number(st.sixes || 0);
        });
      });
    });

    const topPerformers = Object.values(playerTotals).sort(
      (a, b) => b.runs - a.runs || b.wickets - a.wickets
    );

    return {
      played: list.length,
      completed: completed.length,
      won,
      lost,
      topPerformers
    };
  }, [currentTeamFilteredMatches, currentTeam, playerMap]);
  // === SECTION: DATA LOAD & DERIVED LISTS END ===

  // === SECTION: TEAM & SQUAD ACTION HANDLERS START ===
  const openTeamDetailSubView = (teamId, initialTab = "overview") => {
    setSelectedTeamId(teamId);
    setTeamDetailTab(initialTab);
    setTeamScope("tournament");
    setPlayerSearch("");
    setSquadFilterQuery("");
    setSubView("team_detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAddExistingTeam = (teamId) => {
    if (!activeTournament) {
      showError("स्पर्धा निवडा", "कृपया आधी स्पर्धा निवडा किंवा तयार करा.");
      return;
    }
    addTeamToTournament(activeTournament.id, teamId);
    setSelectedTeamId(teamId);
    reloadAll();
    showSuccess("संघ जोडला", "संघ स्पर्धेत समाविष्ट केला आहे.");
  };

  const handleRemoveTeam = (teamId) => {
    if (!activeTournament) return;
    removeTeamFromTournament(activeTournament.id, teamId);
    if (selectedTeamId === teamId) {
      setSelectedTeamId("");
      setSubView("teams_list");
    }
    reloadAll();
    showSuccess("संघ काढला", "संघ स्पर्धेतून काढून टाकला आहे.");
  };

  const handleTeamNameChange = (val) => {
    setNewTeamName(val);
    if (!shortNameTouched) {
      setNewShortName(deriveShortName(val));
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const prefix = `LOGO_${newShortName || newTeamName || "TEAM"}`;
      const url = await uploadToImgbb(file, {
        maxWidth: 400,
        quality: 0.78,
        namePrefix: prefix
      });
      setNewTeamLogo(url);
      showSuccess("लोगो अपलोड", "टीम लोगो कॉम्प्रेस होऊन सेव्ह झाला.");
    } catch (err) {
      console.error(err);
      showError("अपलोड त्रुटी", err.message || "लोगो अपलोड करता आला नाही.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleCreateTeamSubmit = (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) {
      showError("संघाचे नाव आवश्यक", "कृपया Team Name लिहा.");
      return;
    }

    const finalShort =
      newShortName.trim().toUpperCase() || deriveShortName(newTeamName);

    const created = createTeam({
      name: newTeamName.trim(),
      shortName: finalShort,
      place: newTeamPlace.trim(),
      logoUrl: newTeamLogo.trim(),
      club: newTeamClub.trim() || activeTournament?.club || "",
      slogan: newTeamSlogan.trim()
    });

    if (autoAddCreatedTeam && activeTournament && created) {
      addTeamToTournament(activeTournament.id, created.id);
      setSelectedTeamId(created.id);
    }

    setNewTeamName("");
    setNewShortName("");
    setShortNameTouched(false);
    setNewTeamPlace("");
    setNewTeamLogo("");
    setNewTeamClub("");
    setNewTeamSlogan("");
    setSubView("teams_list");
    reloadAll();
    showSuccess("नवीन संघ तयार", `"${created.name}" संघ तयार झाला आहे.`);
  };

  const handleAddCandidateToCurrentTeam = (candidate, status = "playing") => {
    if (!currentTeam) return;
    const ensuredPlayer = candidate.localPlayerId
      ? players.find((p) => p.id === candidate.localPlayerId)
      : createPlayer({
          playerCode: candidate.playerCode || undefined,
          name: candidate.name,
          mobile: candidate.mobile || "",
          role: candidate.role || "All-rounder",
          photoUrl: candidate.photoUrl || ""
        });

    if (!ensuredPlayer) return;
    addPlayerToTeam(currentTeam.id, ensuredPlayer.id, status);
    reloadAll();
    showSuccess(
      "खेळाडू जोडला",
      `"${ensuredPlayer.name}" ${currentTeam.name} मध्ये जोडला आहे.`
    );
  };

  const handleRemovePlayerFromCurrentTeam = (playerId) => {
    if (!currentTeam) return;
    removePlayerFromTeam(currentTeam.id, playerId);
    reloadAll();
    showSuccess("खेळाडू काढला", "खेळाडू संघातून काढून टाकला आहे.");
  };

  const handleToggleLineStatus = (playerId, nextStatus) => {
    if (!currentTeam) return;
    setTeamPlayerLineStatus(currentTeam.id, playerId, nextStatus);
    reloadAll();
  };

  const handleCreatePlayerSubmit = async (e) => {
    e.preventDefault();
    const cleanName = newPlayerName.trim();
    const cleanMob = normalizeMobile10(newPlayerMobile);

    if (!cleanName) {
      showError("नाव आवश्यक", "कृपया खेळाडूचे पूर्ण नाव लिहा.");
      return;
    }

    if (cleanMob.length !== 10) {
      showError(
        "मोबाईल नंबर आवश्यक",
        "Master Player सोबत मॅप करण्यासाठी वैध १० अंकी मोबाईल नंबर टाका."
      );
      return;
    }

    let masterProfile = null;
    try {
      masterProfile = await lookupJbscPlayerByMobile(cleanMob);
      if (!masterProfile) {
        await upsertJbscMasterPlayer({
          mobile: cleanMob,
          fullName: cleanName,
          role: newPlayerRole
        });
        masterProfile = await lookupJbscPlayerByMobile(cleanMob);
      }
    } catch (err) {
      console.error("[CreatePlayer Master Sync Error]", err);
      showError(
        "Master Sync त्रुटी",
        err.message || "Master Player सोबत सेव्ह करता आले नाही."
      );
      return;
    }

    const resolvedCode =
      masterProfile?.playerId ||
      (newPlayerCodeInput.trim()
        ? normalizePlayerIdCode(newPlayerCodeInput)
        : "");
    const resolvedName =
      masterProfile?.fullName || masterProfile?.name || cleanName;
    const resolvedRole = masterProfile?.role || newPlayerRole;
    const resolvedPhoto = masterProfile?.photoUrl || "";

    const createdPlayer = createPlayer({
      playerCode: resolvedCode || undefined,
      name: resolvedName,
      mobile: cleanMob,
      role: resolvedRole,
      photoUrl: resolvedPhoto
    });

    if (currentTeam && createdPlayer) {
      addPlayerToTeam(currentTeam.id, createdPlayer.id, newPlayerLineStatus);
    }

    setNewPlayerCodeInput("");
    setNewPlayerName("");
    setNewPlayerMobile("");
    setNewPlayerRole("All-rounder");
    setNewPlayerLineStatus("playing");
    setTeamDetailTab("players");
    setSubView(currentTeam ? "team_detail" : "teams_list");
    reloadAll();
    showSuccess(
      "खेळाडू मॅप झाला",
      `"${createdPlayer.name}" (${createdPlayer.playerCode}) Master शी जोडला गेला आहे.`
    );
  };
  // === SECTION: TEAM & SQUAD ACTION HANDLERS END ===

  // === SECTION: SUB-VIEW CREATE TEAM START ===
  if (subView === "create_team") {
    return (
      <div className="space-y-3.5 text-white">
        <div className="flex items-center justify-between gap-2 bg-slate-900 px-3.5 py-2.5 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <Shield className="w-4 h-4 text-amber-400 shrink-0" />
            <h2 className="text-sm sm:text-base font-black truncate">
              नवीन संघ तयार करा
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setSubView("teams_list")}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>मागे</span>
          </button>
        </div>

        <form
          onSubmit={handleCreateTeamSubmit}
          className="bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-3.5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Team Name *
              </label>
              <input
                type="text"
                value={newTeamName}
                onChange={(e) => handleTeamNameChange(e.target.value)}
                placeholder="उदा. Mumbai Indians / Lohgad Lions"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Short Name (उदा. MI)
              </label>
              <input
                type="text"
                maxLength={6}
                value={newShortName}
                onChange={(e) => {
                  setShortNameTouched(true);
                  setNewShortName(e.target.value.toUpperCase());
                }}
                placeholder="MI"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm font-mono font-bold uppercase text-amber-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Place (ठिकाण)
              </label>
              <input
                type="text"
                value={newTeamPlace}
                onChange={(e) => setNewTeamPlace(e.target.value)}
                placeholder="उदा. Mumbai / Pune"
                className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Club
              </label>
              <input
                type="text"
                value={newTeamClub}
                onChange={(e) => setNewTeamClub(e.target.value)}
                placeholder="उदा. JBSC"
                className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Slogan / Tagline (पर्यायी)
            </label>
            <input
              type="text"
              value={newTeamSlogan}
              onChange={(e) => setNewTeamSlogan(e.target.value)}
              placeholder="उदा. खेळ जिद्दीचा • Play Bold"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-white"
            />
          </div>

          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {newTeamLogo ? (
                <img
                  src={newTeamLogo}
                  alt="Logo preview"
                  className="w-12 h-12 rounded-full object-contain bg-black border border-slate-700 p-1 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-300 font-black text-xs shrink-0">
                  {newShortName || "TM"}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-200 truncate">
                  Team Logo (Round Preview)
                </div>
                <div className="text-[10px] text-slate-400">
                  ऑटो कॉम्प्रेस होऊन अपलोड होईल
                </div>
              </div>
            </div>

            <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-black cursor-pointer shrink-0">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>
                {uploadingLogo
                  ? "अपलोड..."
                  : newTeamLogo
                  ? "फोटो बदला"
                  : "लोगो निवडा"}
              </span>
              <input
                type="file"
                accept="image/*"
                disabled={uploadingLogo}
                onChange={handleLogoUpload}
                className="hidden"
              />
            </label>
          </div>

          {activeTournament && (
            <label className="flex items-center gap-2 text-xs font-bold text-slate-200 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={autoAddCreatedTeam}
                onChange={(e) => setAutoAddCreatedTeam(e.target.checked)}
                className="w-4 h-4 accent-amber-400"
              />
              <span className="truncate">
                लगेच &ldquo;{activeTournament.name}&rdquo; मध्ये जोडा
              </span>
            </label>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setSubView("teams_list")}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300 cursor-pointer"
            >
              रद्द करा
            </button>
            <button
              type="submit"
              disabled={uploadingLogo}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 text-xs sm:text-sm font-black cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>संघ सेव्ह करा</span>
            </button>
          </div>
        </form>
      </div>
    );
  }
  // === SECTION: SUB-VIEW CREATE TEAM END ===

  // === SECTION: SUB-VIEW ADD PLAYER (BY NAME OR ID) START ===
  if (subView === "add_player") {
    return (
      <div className="space-y-3.5 text-white">
        <div className="flex items-center justify-between gap-2 bg-slate-900 px-3.5 py-2.5 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <Plus className="w-4 h-4 text-amber-400 shrink-0" />
            <h2 className="text-sm sm:text-base font-black truncate">
              Add Player • {currentTeam?.name || "Squad"}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setSubView(currentTeam ? "team_detail" : "teams_list")}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>मागे</span>
          </button>
        </div>

        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={playerSearch}
              onChange={(e) => setPlayerSearch(e.target.value)}
              placeholder="नाव (उदा. Prashant Gaonkar) किंवा ID (153 / JBSC-153)..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-xs sm:text-sm text-white"
            />
          </div>

          {searchingMaster && (
            <div className="text-[11px] text-amber-300">
              Master Players शोधत आहे...
            </div>
          )}

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {combinedCandidatesToAdd.length > 0 ? (
              combinedCandidatesToAdd.map((item, idx) => (
                <div
                  key={`${item.playerCode || item.name}_${idx}`}
                  className="flex items-center justify-between gap-3 bg-slate-950 px-3 py-2.5 rounded-xl border border-slate-800 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-black text-white truncate">
                      {item.name}
                      {item.playerCode && (
                        <span className="ml-2 font-mono text-[10px] text-amber-300 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                          {item.playerCode}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {item.role} •{" "}
                      {item.source === "master" ? "JBSC Master" : "Local Squad"}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleAddCandidateToCurrentTeam(item, "playing")
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-black shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-6 space-y-2">
                <div className="text-xs text-slate-400">
                  जोडण्यासारखे खेळाडू सापडले नाहीत.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNewPlayerName(playerSearch.trim());
                    setSubView("create_player");
                  }}
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-amber-400 text-slate-950 text-xs font-black cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create Player</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  // === SECTION: SUB-VIEW ADD PLAYER (BY NAME OR ID) END ===

  // === SECTION: SUB-VIEW CREATE PLAYER (MASTER MAPPED + 10-DIGIT MOBILE) START ===
  if (subView === "create_player") {
    return (
      <div className="space-y-3.5 text-white">
        <div className="flex items-center justify-between gap-2 bg-slate-900 px-3.5 py-2.5 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <UserPlus className="w-4 h-4 text-amber-400 shrink-0" />
            <h2 className="text-sm sm:text-base font-black truncate">
              नवीन खेळाडू {currentTeam ? `(${currentTeam.name})` : ""}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setSubView(currentTeam ? "team_detail" : "teams_list")}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>मागे</span>
          </button>
        </div>

        <form
          onSubmit={handleCreatePlayerSubmit}
          className="bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-3.5"
        >
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              खेळाडूचे पूर्ण नाव *
            </label>
            <input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="उदा. Sameet Borde"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-amber-300 mb-1">
                मोबाईल नंबर (१० अंक) *
              </label>
              <input
                type="tel"
                maxLength={12}
                value={newPlayerMobile}
                onChange={(e) => setNewPlayerMobile(e.target.value)}
                placeholder="98XXXXXXXX"
                className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Role
              </label>
              <select
                value={newPlayerRole}
                onChange={(e) => setNewPlayerRole(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              >
                <option value="All-rounder">All-rounder</option>
                <option value="Batsman">Batsman</option>
                <option value="Bowler">Bowler</option>
                <option value="Wicket-keeper">Wicket-keeper</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              सुरुवातीची स्थिती
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setNewPlayerLineStatus("playing")}
                className={`py-2 px-3 rounded-xl text-xs font-black border cursor-pointer ${
                  newPlayerLineStatus === "playing"
                    ? "bg-amber-400 text-slate-950 border-amber-300"
                    : "bg-slate-950 text-slate-300 border-slate-700"
                }`}
              >
                Playing
              </button>
              <button
                type="button"
                onClick={() => setNewPlayerLineStatus("bench")}
                className={`py-2 px-3 rounded-xl text-xs font-black border cursor-pointer ${
                  newPlayerLineStatus === "bench"
                    ? "bg-amber-400 text-slate-950 border-amber-300"
                    : "bg-slate-950 text-slate-300 border-slate-700"
                }`}
              >
                Bench
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setSubView(currentTeam ? "team_detail" : "teams_list")}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300 cursor-pointer"
            >
              रद्द करा
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs sm:text-sm font-black cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Master मध्ये सेव्ह करा</span>
            </button>
          </div>
        </form>
      </div>
    );
  }
  // === SECTION: SUB-VIEW CREATE PLAYER (MASTER MAPPED + 10-DIGIT MOBILE) END ===

  // === SECTION: SUB-VIEW TEAM DETAIL (OVERVIEW | PLAYERS | MATCHES | TOURNAMENTS | STATISTICS) START ===
  if (subView === "team_detail" && currentTeam) {
    return (
      <div className="space-y-3.5 text-white">
        {/* Top Back Bar + Team Header */}
        <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
          <div className="flex items-start gap-2.5">
            <button
              type="button"
              onClick={() => setSubView("teams_list")}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold shrink-0 cursor-pointer mt-0.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>संघ</span>
            </button>

            {currentTeam.logoUrl ? (
              <img
                src={currentTeam.logoUrl}
                alt={currentTeam.name}
                className="w-10 h-10 rounded-full object-contain bg-black border border-slate-700 p-0.5 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-800 text-amber-300 font-black text-xs flex items-center justify-center shrink-0">
                {(currentTeam.shortName || "TM").slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base font-black text-white break-words leading-snug">
                {currentTeam.name}
              </h2>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                <span>{currentTeam.shortName || currentTeam.teamCode}</span>
                {currentTeam.place && (
                  <span className="inline-flex items-center gap-0.5">
                    • <MapPin className="w-3 h-3 inline" /> {currentTeam.place}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Single-Line Team Detail Tabs (Overview | Players | Matches | Tournaments | Statistics) */}
          <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap pt-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
            {[
              { id: "overview", label: "Team Overview" },
              { id: "players", label: `Players (${squadPlayerIds.length})` },
              { id: "matches", label: `Matches (${currentTeamAllMatches.length})` },
              {
                id: "tournaments",
                label: `Tournaments (${currentTeamTournaments.length})`
              },
              { id: "statistics", label: "Statistics" }
            ].map((tb) => (
              <button
                key={tb.id}
                type="button"
                onClick={() => setTeamDetailTab(tb.id)}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition ${
                  teamDetailTab === tb.id
                    ? "bg-amber-400 text-slate-950"
                    : "bg-slate-800 text-slate-300 hover:text-white"
                }`}
              >
                {tb.label}
              </button>
            ))}
          </div>
        </div>

        {/* 1.2.1 TEAM OVERVIEW */}
        {teamDetailTab === "overview" && (
          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-3">
            <div className="text-xs font-bold text-slate-300">
              {currentTeam.slogan ? `“${currentTeam.slogan}”` : "संघ माहिती"}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">
                  Played
                </div>
                <div className="text-lg font-black text-white">
                  {currentTeamSummary.played}
                </div>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">
                  Won
                </div>
                <div className="text-lg font-black text-amber-300">
                  {currentTeamSummary.won}
                </div>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">
                  Lost
                </div>
                <div className="text-lg font-black text-rose-400">
                  {currentTeamSummary.lost}
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-400">
              Club: <strong className="text-slate-200">{currentTeam.club || "-"}</strong>{" "}
              • Squad: <strong className="text-slate-200">{squadPlayerIds.length}</strong>{" "}
              (Playing: {playingPlayers.length}, Bench: {benchPlayers.length})
            </div>
          </div>
        )}

        {/* 1.2.2 TEAM PLAYERS */}
        {teamDetailTab === "players" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setPlayerSearch("");
                  setSubView("add_player");
                }}
                className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-black cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Player</span>
              </button>

              <button
                type="button"
                onClick={() => setSubView("create_player")}
                className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create Player</span>
              </button>
            </div>

            <div className="flex items-center gap-2 bg-slate-900 p-2.5 rounded-2xl border border-slate-800">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={squadFilterQuery}
                  onChange={(e) => setSquadFilterQuery(e.target.value)}
                  placeholder="Squad मध्ये खेळाडू शोधा..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-700 bg-slate-950 text-xs text-white"
                />
              </div>

              <button
                type="button"
                onClick={() => setSortAzEnabled((prev) => !prev)}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black border shrink-0 cursor-pointer ${
                  sortAzEnabled
                    ? "bg-amber-400 text-slate-950 border-amber-300"
                    : "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
                }`}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>A–Z</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Playing */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3.5 space-y-2">
                <div className="text-xs font-black text-amber-300">
                  Playing ({playingPlayers.length})
                </div>
                {playingPlayers.length > 0 ? (
                  <div className="space-y-1.5">
                    {playingPlayers.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-white truncate block">
                            {p.name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {p.role}
                            {p.playerCode ? ` • ${p.playerCode}` : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleLineStatus(p.id, "bench")}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-[10px] font-black cursor-pointer"
                          >
                            → Bench
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemovePlayerFromCurrentTeam(p.id)}
                            className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 py-4 text-center">
                    Playing मध्ये खेळाडू नाहीत.
                  </div>
                )}
              </div>

              {/* Bench */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3.5 space-y-2">
                <div className="text-xs font-black text-slate-300">
                  Bench ({benchPlayers.length})
                </div>
                {benchPlayers.length > 0 ? (
                  <div className="space-y-1.5">
                    {benchPlayers.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-white truncate block">
                            {p.name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {p.role}
                            {p.playerCode ? ` • ${p.playerCode}` : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleLineStatus(p.id, "playing")
                            }
                            className="px-2 py-1 rounded bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/30 text-[10px] font-black cursor-pointer"
                          >
                            → Playing
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemovePlayerFromCurrentTeam(p.id)}
                            className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 py-4 text-center">
                    Bench मध्ये खेळाडू नाहीत.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 1.2.3 TEAM MATCHES (TOURNAMENT-WISE & OVERALL) */}
        {teamDetailTab === "matches" && (
          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-black text-white">
                संघाचे सामने ({currentTeamFilteredMatches.length})
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setTeamScope("tournament")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black cursor-pointer ${
                    teamScope === "tournament"
                      ? "bg-amber-400 text-slate-950"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  या स्पर्धेत
                </button>
                <button
                  type="button"
                  onClick={() => setTeamScope("overall")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black cursor-pointer ${
                    teamScope === "overall"
                      ? "bg-amber-400 text-slate-950"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  Overall
                </button>
              </div>
            </div>

            {currentTeamFilteredMatches.length > 0 ? (
              <div className="space-y-2">
                {currentTeamFilteredMatches.map((m) => {
                  const inn =
                    m.innings?.[m.activeInningsIndex || 0] || m.innings?.[0];
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between bg-slate-950 px-3 py-2.5 rounded-xl border border-slate-800 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-black text-white truncate">
                          {teamMap[m.teamAId]?.name || "Team 1"} vs{" "}
                          {teamMap[m.teamBId]?.name || "Team 2"}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {m.tournamentName} • {m.date || "Date TBA"}
                        </div>
                      </div>
                      <div className="text-amber-300 font-black shrink-0 ml-2">
                        {inn && m.status !== "scheduled"
                          ? `${inn.runs}/${inn.wickets} (${formatOversFromBalls(
                              inn.legalBalls,
                              m.ballsPerOver
                            )})`
                          : m.status}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-slate-400 py-4 text-center">
                या निवडीसाठी सामने आढळले नाहीत.
              </div>
            )}
          </div>
        )}

        {/* 1.2.4 TEAM TOURNAMENTS */}
        {teamDetailTab === "tournaments" && (
          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-black text-amber-300">
              <Trophy className="w-4 h-4" />
              <span>सहभागी स्पर्धा ({currentTeamTournaments.length})</span>
            </div>

            {currentTeamTournaments.length > 0 ? (
              <div className="space-y-2">
                {currentTeamTournaments.map((trn) => (
                  <div
                    key={trn.id}
                    className="flex items-center justify-between bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs"
                  >
                    <div>
                      <div className="font-black text-white">{trn.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {trn.club} • Season {trn.season}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-300">
                      {trn.format === "test" ? "Test" : "One Day"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400 py-4 text-center">
                स्पर्धांची नोंद नाही.
              </div>
            )}
          </div>
        )}

        {/* 1.2.5 TEAM STATISTICS (TOURNAMENT-WISE & OVERALL) */}
        {teamDetailTab === "statistics" && (
          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-black text-amber-300">
                <BarChart3 className="w-4 h-4" />
                <span>संघाची आकडेवारी</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setTeamScope("tournament")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black cursor-pointer ${
                    teamScope === "tournament"
                      ? "bg-amber-400 text-slate-950"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  या स्पर्धेत
                </button>
                <button
                  type="button"
                  onClick={() => setTeamScope("overall")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black cursor-pointer ${
                    teamScope === "overall"
                      ? "bg-amber-400 text-slate-950"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  Overall
                </button>
              </div>
            </div>

            {currentTeamSummary.topPerformers.length > 0 ? (
              <div className="divide-y divide-slate-800/80 text-xs">
                {currentTeamSummary.topPerformers.map((pf) => (
                  <div
                    key={pf.playerId}
                    className="py-2 flex items-center justify-between"
                  >
                    <span className="font-bold text-white">{pf.name}</span>
                    <span className="font-mono font-black text-amber-300">
                      {pf.runs}R ({pf.balls}B) • {pf.wickets}W • 6s:{pf.sixes}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400 py-4 text-center">
                अद्याप आकडेवारी उपलब्ध नाही.
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
  // === SECTION: SUB-VIEW TEAM DETAIL (OVERVIEW | PLAYERS | MATCHES | TOURNAMENTS | STATISTICS) END ===

  // === SECTION: TEAMS LIST SUB-VIEW START ===
  return (
    <div className="space-y-3.5 text-white">
      <div className="bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {onBackToTournaments && (
              <button
                type="button"
                onClick={onBackToTournaments}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 shrink-0 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>स्पर्धा</span>
              </button>
            )}
            <h1 className="text-sm sm:text-xl font-black text-white truncate">
              संघ (Teams)
            </h1>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setSubView("create_team")}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] sm:text-xs font-black whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>New Team</span>
            </button>

            {onProceedToMatches && activeTournament && (
              <button
                type="button"
                onClick={() => onProceedToMatches(activeTournament.id)}
                className="hidden sm:inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-black whitespace-nowrap cursor-pointer"
              >
                <span>पुढे: सामने →</span>
              </button>
            )}
          </div>
        </div>

        {tournaments.length > 0 && (
          <select
            value={activeTournamentId}
            onChange={(e) => {
              setActiveTournamentId(e.target.value);
              reloadAll();
            }}
            className="w-full sm:w-auto px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-950 text-xs font-bold text-white"
          >
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.season})
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-black text-white">
              स्पर्धेतील संघ ({tournamentTeams.length})
            </h2>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={teamSearch}
              onChange={(e) => setTeamSearch(e.target.value)}
              placeholder="जुना संघ ID / Name सर्च करा..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-700 bg-slate-950 text-xs text-white"
            />
          </div>
        </div>

        {teamSearch.trim() && (
          <div className="bg-slate-950 border border-amber-400/30 rounded-xl p-2.5 space-y-1.5">
            <div className="text-[11px] font-black text-amber-300">
              आधीच्या संघांमधून जोडा:
            </div>
            {searchableAvailableTeams.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {searchableAvailableTeams.map((tm) => (
                  <button
                    key={tm.id}
                    type="button"
                    onClick={() => handleAddExistingTeam(tm.id)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-amber-400 hover:text-slate-950 border border-slate-700 text-xs font-bold text-white cursor-pointer transition"
                  >
                    <span className="font-mono text-[10px] text-amber-300">
                      {tm.shortName || tm.teamCode}
                    </span>
                    <span>{tm.name}</span>
                    <Plus className="w-3 h-3" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-slate-400">
                जुळणारा संघ सापडला नाही. &ldquo;New Team&rdquo; वापरून तयार करा.
              </div>
            )}
          </div>
        )}

        {tournamentTeams.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {tournamentTeams.map((tm) => {
              const pCount = Object.keys(tm.squadRoster || {}).length;
              return (
                <div
                  key={tm.id}
                  onClick={() => openTeamDetailSubView(tm.id, "overview")}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-2xl border border-slate-800 bg-slate-950 hover:border-amber-400/60 transition cursor-pointer min-w-0"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {tm.logoUrl ? (
                      <img
                        src={tm.logoUrl}
                        alt={tm.name}
                        className="w-9 h-9 rounded-full object-contain bg-black border border-slate-700 p-0.5 shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-slate-800 text-amber-300 font-black text-xs flex items-center justify-center shrink-0">
                        {(tm.shortName || tm.name || "TM")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-black text-white truncate">
                        {tm.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {tm.shortName || tm.teamCode} • {pCount} Players
                        {tm.place ? (
                          <span className="hidden sm:inline"> • {tm.place}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveTeam(tm.id);
                    }}
                    className="p-1 text-slate-500 hover:text-rose-400 shrink-0 cursor-pointer"
                    title="Remove Team"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-xs text-slate-400 py-3 text-center">
            अद्याप कोणताही संघ जोडलेला नाही. वर सर्च करा किंवा &ldquo;New Team&rdquo; वर क्लिक करा.
          </div>
        )}
      </div>
    </div>
  );
  // === SECTION: TEAMS LIST SUB-VIEW END ===
}