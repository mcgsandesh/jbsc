// src/components/scoring/FixtureAndTossView.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  Plus,
  Gavel,
  Save,
  ArrowLeft,
  CheckCircle2,
  Trash2,
  Coins,
  Pencil
} from "lucide-react";
import {
  MATCH_FORMATS,
  MATCH_TITLES,
  getTournaments,
  getTeams,
  getMatches,
  saveMatchFixture,
  deleteMatch,
  applyMatchToss,
  addTournamentGroup,
  addTeamToTournament,
  formatOversFromBalls
} from "../../services/scoringLocalEngine";
import { showSuccess, showError } from "../../utils/alert";

const PRESET_OVERS = [4, 5, 6, 8, 10, 15, 20];
const PRESET_BALLS_PER_OVER = [4, 5, 6, 8];
const PRESET_PLAYERS_PER_SIDE = [8, 9, 10, 11];

function renderTeamLogoBadge(team, sizeClass = "w-11 h-11", textClass = "text-xs") {
  if (team?.logoUrl) {
    return (
      <img
        src={team.logoUrl}
        alt={team.name || "Team"}
        className={`${sizeClass} rounded-full object-contain bg-black border border-slate-700 p-0.5 shrink-0`}
      />
    );
  }
  const label = (team?.shortName || team?.name || "TM").slice(0, 2).toUpperCase();
  return (
    <div
      className={`${sizeClass} rounded-full bg-slate-800 text-amber-300 font-black ${textClass} flex items-center justify-center border border-slate-700 shrink-0`}
    >
      {label}
    </div>
  );
}

export default function FixtureAndTossView({
  tournamentId = "",
  onBackToTournaments,
  onOpenTeamOverview,
  onStartScoring
}) {
  // === SECTION: COMPONENT STATE START ===
  const [tournaments, setTournaments] = useState([]);
  const [activeTournamentId, setActiveTournamentId] = useState(tournamentId);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);

  // Sub-views: "list" | "form" | "toss" | "pick_team_a" | "pick_team_b"
  const [subView, setSubView] = useState("list");
  const [editingMatchId, setEditingMatchId] = useState("");
  const [tossMatchId, setTossMatchId] = useState("");

  // Step 1 inside New Match: "points_table" (Group Match) | "other" (Other Matches)
  const [matchCategory, setMatchCategory] = useState("points_table");
  const [groupName, setGroupName] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [teamToAddInGroup, setTeamToAddInGroup] = useState("");

  // Step 2 & 3 inside New Match: Teams + Match Fields
  const [matchTitle, setMatchTitle] = useState("Match");
  const [teamAId, setTeamAId] = useState("");
  const [teamBId, setTeamBId] = useState("");
  const [venue, setVenue] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [overs, setOvers] = useState(6);
  const [ballsPerOver, setBallsPerOver] = useState(6);
  const [playersPerSide, setPlayersPerSide] = useState(11);
  const [scorerName, setScorerName] = useState("");

  // Digital Toss & Optional Coin Flip State
  const [tossWonByTeamId, setTossWonByTeamId] = useState("");
  const [tossDecision, setTossDecision] = useState("bat"); // "bat" | "bowl"
  const [coinSide, setCoinSide] = useState(""); // "" | "HEAD" | "TAIL"
  const [isFlippingCoin, setIsFlippingCoin] = useState(false);
  // === SECTION: COMPONENT STATE END ===

  // === SECTION: DATA LOAD & DERIVED VALUES START ===
  const reloadAll = () => {
    const trnList = getTournaments();
    const tmList = getTeams();
    const mtList = getMatches();

    setTournaments(trnList);
    setTeams(tmList);
    setMatches(mtList);

    const targetTrnId =
      tournamentId || activeTournamentId || (trnList[0]?.id ?? "");
    setActiveTournamentId(targetTrnId);
  };

  useEffect(() => {
    reloadAll();
  }, [tournamentId]);

  const activeTournament = useMemo(
    () => tournaments.find((t) => t.id === activeTournamentId) || null,
    [tournaments, activeTournamentId]
  );

  const tournamentFormat =
    activeTournament?.format === MATCH_FORMATS.TEST
      ? MATCH_FORMATS.TEST
      : MATCH_FORMATS.ONE_DAY;

  const tournamentTeams = useMemo(() => {
    if (!activeTournament) return teams;
    const ids = activeTournament.tournamentTeamIds || [];
    if (ids.length === 0) return teams;
    return ids.map((id) => teams.find((t) => t.id === id)).filter(Boolean);
  }, [activeTournament, teams]);

  const selectableTeamsForMatch = useMemo(() => {
    if (matchCategory === "points_table" && groupName) {
      const grpIds = Array.isArray(activeTournament?.groupTeams?.[groupName])
        ? activeTournament.groupTeams[groupName]
        : [];
      return grpIds.map((id) => teams.find((t) => t.id === id)).filter(Boolean);
    }
    return tournamentTeams;
  }, [matchCategory, groupName, activeTournament, teams, tournamentTeams]);

  const tournamentMatches = useMemo(() => {
    if (!activeTournamentId) return matches;
    return matches.filter((m) => m.tournamentId === activeTournamentId);
  }, [matches, activeTournamentId]);

  const tossMatch = useMemo(
    () => matches.find((m) => m.id === tossMatchId) || null,
    [matches, tossMatchId]
  );

  const teamMap = useMemo(
    () => Object.fromEntries(teams.map((t) => [t.id, t])),
    [teams]
  );
  // === SECTION: DATA LOAD & DERIVED VALUES END ===

  // === SECTION: GROUP SETUP, EDIT & TEAM SELECTION HANDLERS START ===
  const handleCreateGroup = () => {
    if (!activeTournament || !newGroupName.trim()) {
      showError("ग्रुप नाव आवश्यक", "कृपया नवीन ग्रुप नाव लिहा (उदा. Group C).");
      return;
    }
    const clean = newGroupName.trim();
    addTournamentGroup(activeTournament.id, clean);
    setNewGroupName("");
    setGroupName(clean);
    setTeamAId("");
    setTeamBId("");
    reloadAll();
    showSuccess("ग्रुप तयार", `"${clean}" ग्रुप जोडला आहे.`);
  };

  const handleAssignTeamToGroup = () => {
    if (!activeTournament || !groupName || !teamToAddInGroup) {
      showError("निवड अपूर्ण", "कृपया ग्रुप आणि संघ निवडा.");
      return;
    }
    addTeamToTournament(activeTournament.id, teamToAddInGroup, groupName);
    setTeamToAddInGroup("");
    reloadAll();
    showSuccess("संघ जोडला", `${groupName} मध्ये संघ जोडला.`);
  };

  const resetFixtureForm = () => {
    setEditingMatchId("");
    const defaultCat =
      activeTournament?.mode === "single" ? "other" : "points_table";
    setMatchCategory(defaultCat);
    setGroupName("");
    setNewGroupName("");
    setTeamToAddInGroup("");
    setMatchTitle("Match");
    setTeamAId("");
    setTeamBId("");
    setVenue("");
    setDate("");
    setTime("");
    setOvers(tournamentFormat === MATCH_FORMATS.TEST ? 90 : 6);
    setBallsPerOver(6);
    setPlayersPerSide(11);
    setScorerName("");
  };

  const openNewFixtureSubView = () => {
    resetFixtureForm();
    setSubView("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // फक्त "scheduled" सामन्यांसाठी Edit उपलब्ध
  const openEditScheduledMatch = (matchObj) => {
    if (matchObj.status !== "scheduled") {
      showError("Edit बंद", "Toss होऊन सामना सुरू झाल्यावर Edit करता येणार नाही.");
      return;
    }
    setEditingMatchId(matchObj.id);
    setMatchCategory(matchObj.matchCategory || "points_table");
    setGroupName(matchObj.groupName || "");
    setNewGroupName("");
    setTeamToAddInGroup("");
    setMatchTitle(matchObj.matchTitle || "Match");
    setTeamAId(matchObj.teamAId || "");
    setTeamBId(matchObj.teamBId || "");
    setVenue(matchObj.venue || "");
    setDate(matchObj.date || "");
    setTime(matchObj.time || "");
    setOvers(Number(matchObj.overs || 6));
    setBallsPerOver(Number(matchObj.ballsPerOver || 6));
    setPlayersPerSide(Number(matchObj.playersPerSide || 11));
    setScorerName(matchObj.scorerName || "");
    setSubView("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectTeamSlot = (slot, clickedTeamId) => {
    if (slot === "A") {
      if (clickedTeamId === teamBId) {
        showError("समान संघ नको", "Team 1 आणि Team 2 हे दोन वेगवेगळे संघ असावेत.");
        return;
      }
      setTeamAId(clickedTeamId);
      setSubView("form");
      return;
    }

    if (slot === "B") {
      if (clickedTeamId === teamAId) {
        showError("समान संघ नको", "Team 1 आणि Team 2 हे दोन वेगवेगळे संघ असावेत.");
        return;
      }
      setTeamBId(clickedTeamId);
      setSubView("form");
    }
  };
  // === SECTION: GROUP SETUP, EDIT & TEAM SELECTION HANDLERS END ===

  // === SECTION: COIN FLIP, TOSS & SCORING HANDLERS START ===
  const openTossSubView = (matchObj) => {
    setTossMatchId(matchObj.id);
    setTossWonByTeamId(matchObj.toss?.wonByTeamId || matchObj.teamAId || "");
    setTossDecision(matchObj.toss?.decision || "bat");
    setCoinSide("");
    setIsFlippingCoin(false);
    setSubView("toss");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFlipCoin = () => {
    if (isFlippingCoin) return;
    setIsFlippingCoin(true);
    setTimeout(() => {
      const outcome = Math.random() < 0.5 ? "HEAD" : "TAIL";
      setCoinSide(outcome);
      setIsFlippingCoin(false);
    }, 320);
  };

  const buildAndPersistMatch = (nextStatus = "scheduled") => {
    if (!teamAId || !teamBId || teamAId === teamBId) {
      showError(
        "संघ निवडा",
        "कृपया दोन वेगवेगळे संघ (Team 1 व Team 2) निवडा; दोन्ही संघ सारखे नसावेत."
      );
      return null;
    }

    const cleanBallsPerOver = Math.max(1, Number(ballsPerOver || 6));
    const cleanOvers = Math.max(
      1,
      Number(overs || (tournamentFormat === MATCH_FORMATS.TEST ? 90 : 6))
    );
    const cleanPlayers = Math.max(2, Number(playersPerSide || 11));
    const autoSeason = activeTournament?.season || "2026";
    const existingMatch = editingMatchId
      ? matches.find((m) => m.id === editingMatchId)
      : null;

    const saved = saveMatchFixture({
      id: editingMatchId || undefined,
      tournamentId: activeTournament?.id || "",
      tournamentName: activeTournament?.name || "Standalone Match",
      season: autoSeason,
      matchCategory,
      groupName: matchCategory === "points_table" ? groupName : "",
      matchTitle: matchCategory === "points_table" ? "Group Match" : matchTitle,
      format: tournamentFormat,
      teamAId,
      teamBId,
      venue: venue.trim(),
      date,
      time,
      overs: cleanOvers,
      ballsPerOver: cleanBallsPerOver,
      playersPerSide: cleanPlayers,
      scorerName: scorerName.trim(),
      status:
        existingMatch && existingMatch.status !== "scheduled"
          ? existingMatch.status
          : nextStatus
    });

    reloadAll();
    return saved;
  };

  const handleSaveFixtureOnly = (e) => {
    e.preventDefault();
    const saved = buildAndPersistMatch("scheduled");
    if (!saved) return;
    setSubView("list");
    showSuccess("Fixture सेव्ह झाले", "सामन्याचे वेळापत्रक सेव्ह केले आहे.");
  };

  const handleStartMatchToToss = (e) => {
    e.preventDefault();
    const saved = buildAndPersistMatch("scheduled");
    if (!saved) return;
    openTossSubView(saved);
  };

  const handleStartScoringFromToss = (e) => {
    e.preventDefault();
    if (!tossMatch || !tossWonByTeamId) {
      showError("Toss निवडा", "कृपया Toss कोणी जिंकला ते निवडा.");
      return;
    }

    const liveMatch = applyMatchToss(
      tossMatch.id,
      tossWonByTeamId,
      tossDecision
    );
    reloadAll();
    showSuccess(
      "Scoring सुरू!",
      `${teamMap[tossWonByTeamId]?.name || "Team"} ने Toss जिंकून ${
        tossDecision === "bat" ? "Batting" : "Bowling"
      } निवडली आहे.`
    );

    if (liveMatch && onStartScoring) {
      onStartScoring(liveMatch.id);
    }
  };

  const handleDeleteMatch = (matchId) => {
    deleteMatch(matchId);
    reloadAll();
    showSuccess("डिलीट झाले", "सामन्याची नोंद काढून टाकली आहे.");
  };
  // === SECTION: COIN FLIP, TOSS & SCORING HANDLERS END ===

  // === SECTION: SUB-VIEW TEAM PICKER START ===
  if (subView === "pick_team_a" || subView === "pick_team_b") {
    const isSlotA = subView === "pick_team_a";
    const forbiddenId = isSlotA ? teamBId : teamAId;

    return (
      <div className="space-y-3.5 text-white">
        <div className="flex items-center justify-between gap-2 bg-slate-900 px-4 py-3 rounded-2xl border border-slate-800">
          <h2 className="text-sm sm:text-base font-black">
            {isSlotA ? "Team 1 निवडा" : "Team 2 निवडा"}{" "}
            {matchCategory === "points_table" && groupName ? `(${groupName})` : ""}
          </h2>
          <button
            type="button"
            onClick={() => setSubView("form")}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>मागे</span>
          </button>
        </div>

        <div className="bg-slate-900 rounded-2xl p-3.5 border border-slate-800 space-y-2">
          {selectableTeamsForMatch.length > 0 ? (
            selectableTeamsForMatch.map((tm) => {
              const isSameAsOther = tm.id === forbiddenId;
              const isCurrentlySelected =
                (isSlotA && tm.id === teamAId) || (!isSlotA && tm.id === teamBId);

              return (
                <button
                  key={tm.id}
                  type="button"
                  disabled={isSameAsOther}
                  onClick={() => handleSelectTeamSlot(isSlotA ? "A" : "B", tm.id)}
                  className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border text-left transition ${
                    isSameAsOther
                      ? "bg-slate-950/50 border-slate-800/60 opacity-40 cursor-not-allowed"
                      : isCurrentlySelected
                      ? "bg-amber-400/15 border-amber-400 text-white cursor-pointer"
                      : "bg-slate-950 hover:bg-slate-800 border-slate-800 text-white cursor-pointer"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {renderTeamLogoBadge(tm, "w-10 h-10", "text-xs")}
                    <div className="min-w-0">
                      <div className="text-sm font-black truncate">{tm.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {tm.shortName || tm.teamCode}{" "}
                        {tm.place ? `• ${tm.place}` : ""}
                      </div>
                    </div>
                  </div>

                  <span className="text-[11px] font-black text-amber-300 shrink-0">
                    {isSameAsOther
                      ? "दुसरा संघ"
                      : isCurrentlySelected
                      ? "निवडलेला ✓"
                      : "निवडा"}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="text-center py-6 text-xs text-slate-400">
              {matchCategory === "points_table"
                ? "या ग्रुपमध्ये संघ जोडलेले नाहीत. आधी ग्रुपमध्ये संघ जोडा."
                : "स्पर्धेत संघ उपलब्ध नाहीत."}
            </div>
          )}
        </div>
      </div>
    );
  }
  // === SECTION: SUB-VIEW TEAM PICKER END ===

  // === SECTION: SUB-VIEW DIGITAL TOSS + COIN FLIP START ===
  if (subView === "toss" && tossMatch) {
    const tA = teamMap[tossMatch.teamAId];
    const tB = teamMap[tossMatch.teamBId];

    return (
      <div className="space-y-3.5 text-white">
        <div className="flex items-center justify-between bg-slate-900 px-4 py-3 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm sm:text-base font-black">
              Toss • {tossMatch.matchTitle}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setSubView("list")}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>मागे</span>
          </button>
        </div>

        <form
          onSubmit={handleStartScoringFromToss}
          className="bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-4"
        >
          {/* Teams Logos + Names Side-by-Side */}
          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                {renderTeamLogoBadge(tA, "w-14 h-14", "text-sm")}
                <span className="text-xs sm:text-sm font-black text-white truncate max-w-full">
                  {tA?.name || "Team 1"}
                </span>
              </div>

              <span className="text-xs font-black text-amber-400 px-2">
                VS
              </span>

              <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                {renderTeamLogoBadge(tB, "w-14 h-14", "text-sm")}
                <span className="text-xs sm:text-sm font-black text-white truncate max-w-full">
                  {tB?.name || "Team 2"}
                </span>
              </div>
            </div>

            <div className="text-center text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
              {tossMatch.tournamentName} •{" "}
              {tossMatch.format === MATCH_FORMATS.TEST
                ? "Test"
                : `${tossMatch.overs} Ov`}{" "}
              • {tossMatch.ballsPerOver}b/ov • {tossMatch.playersPerSide}P
            </div>
          </div>

          {/* Optional Digital Coin Flip (Head / Tail) */}
          <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-12 h-12 rounded-full border-2 border-amber-400 bg-amber-400/15 flex items-center justify-center font-black text-[11px] text-amber-300 shrink-0 transition-transform ${
                  isFlippingCoin ? "rotate-180 scale-105" : ""
                }`}
              >
                {isFlippingCoin ? "..." : coinSide || "COIN"}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-white">
                  Digital Coin Flip (पर्यायी)
                </div>
                <div className="text-[11px] text-slate-400">
                  {coinSide
                    ? `निकाल: ${coinSide}`
                    : "हवे असल्यास नाणेफेक करा"}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFlipCoin}
              disabled={isFlippingCoin}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-black shrink-0 cursor-pointer"
            >
              {isFlippingCoin ? "Flipping..." : "Flip Coin"}
            </button>
          </div>

          {/* 1. Toss Winner (With Team Logo + Name) */}
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-200">
              १. Toss कोणी जिंकला? *
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {[tA, tB].filter(Boolean).map((tm) => {
                const selected = tossWonByTeamId === tm.id;
                return (
                  <button
                    key={tm.id}
                    type="button"
                    onClick={() => setTossWonByTeamId(tm.id)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left cursor-pointer transition min-w-0 ${
                      selected
                        ? "bg-amber-400 text-slate-950 border-amber-300"
                        : "bg-slate-950 hover:bg-slate-800 text-white border-slate-700"
                    }`}
                  >
                    {renderTeamLogoBadge(tm, "w-9 h-9", "text-[11px]")}
                    <span className="text-xs sm:text-sm font-black truncate">
                      {tm.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Bat or Bowl */}
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-200">
              २. काय निवडले? *
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setTossDecision("bat")}
                className={`py-2.5 px-4 rounded-xl border text-xs sm:text-sm font-black cursor-pointer ${
                  tossDecision === "bat"
                    ? "bg-amber-400 text-slate-950 border-amber-300"
                    : "bg-slate-950 hover:bg-slate-800 text-white border-slate-700"
                }`}
              >
                🏏 Bat
              </button>
              <button
                type="button"
                onClick={() => setTossDecision("bowl")}
                className={`py-2.5 px-4 rounded-xl border text-xs sm:text-sm font-black cursor-pointer ${
                  tossDecision === "bowl"
                    ? "bg-amber-400 text-slate-950 border-amber-300"
                    : "bg-slate-950 hover:bg-slate-800 text-white border-slate-700"
                }`}
              >
                ⚾ Bowl
              </button>
            </div>
          </div>

          {/* Start Scoring CTA */}
          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs sm:text-sm font-black cursor-pointer flex items-center justify-center gap-2"
          >
            <Gavel className="w-4 h-4" />
            <span>Start Scoring</span>
          </button>
        </form>
      </div>
    );
  }
  // === SECTION: SUB-VIEW DIGITAL TOSS + COIN FLIP END ===

  // === SECTION: SUB-VIEW NEW / EDIT SCHEDULED MATCH START ===
  if (subView === "form") {
    const teamA = teamMap[teamAId] || null;
    const teamB = teamMap[teamBId] || null;
    const autoSeason = activeTournament?.season || "2026";
    const availableGroups = activeTournament?.groups || [];
    const assignedGroupTeamIds =
      matchCategory === "points_table" && groupName
        ? activeTournament?.groupTeams?.[groupName] || []
        : [];

    const readyForTeamAndMatchDetails =
      matchCategory === "other" ? Boolean(matchTitle) : Boolean(groupName);

    return (
      <div className="space-y-3.5 text-white">
        <div className="flex items-center justify-between bg-slate-900 px-4 py-3 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm sm:text-base font-black">
              {editingMatchId ? "सामना एडिट करा" : "नवीन सामना"}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setSubView("list")}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>मागे</span>
          </button>
        </div>

        <form className="bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-4">
          <div className="bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 flex items-center justify-between gap-2 text-xs">
            <span className="font-bold text-slate-200 truncate">
              {activeTournament?.name || "Standalone"} •{" "}
              {tournamentFormat === MATCH_FORMATS.TEST ? "Test" : "One Day"}
            </span>
            <span className="font-black text-amber-300 bg-amber-400/10 px-2.5 py-0.5 rounded border border-amber-400/30 shrink-0">
              Season {autoSeason}
            </span>
          </div>

          {/* Step 1: Points Table vs Other Matches */}
          <div className="space-y-2.5 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
            <div className="text-xs font-black text-amber-300">
              १. सामना प्रकार निवडा
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMatchCategory("points_table");
                  setGroupName("");
                  setTeamAId("");
                  setTeamBId("");
                }}
                className={`py-2.5 px-3 rounded-xl border text-xs font-black cursor-pointer ${
                  matchCategory === "points_table"
                    ? "bg-amber-400 text-slate-950 border-amber-300"
                    : "bg-slate-900 text-slate-300 border-slate-700"
                }`}
              >
                Points Table (Group)
              </button>
              <button
                type="button"
                onClick={() => {
                  setMatchCategory("other");
                  setGroupName("");
                  setTeamAId("");
                  setTeamBId("");
                }}
                className={`py-2.5 px-3 rounded-xl border text-xs font-black cursor-pointer ${
                  matchCategory === "other"
                    ? "bg-amber-400 text-slate-950 border-amber-300"
                    : "bg-slate-900 text-slate-300 border-slate-700"
                }`}
              >
                Other Matches
              </button>
            </div>

            {matchCategory === "points_table" && (
              <div className="space-y-2.5 pt-2 border-t border-slate-800">
                <div className="text-xs font-bold text-slate-200">
                  Group निवडा (नसेल तर तयार करा):
                </div>

                {availableGroups.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {availableGroups.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => {
                          setGroupName(g);
                          setTeamAId("");
                          setTeamBId("");
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black border cursor-pointer ${
                          groupName === g
                            ? "bg-amber-400 text-slate-950 border-amber-300"
                            : "bg-slate-900 text-slate-300 border-slate-700 hover:text-white"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="नवीन ग्रुप नाव (उदा. Group A)"
                    className="flex-1 px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-900 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={handleCreateGroup}
                    className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black cursor-pointer shrink-0"
                  >
                    + Create Group
                  </button>
                </div>

                {groupName && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-2">
                      <select
                        value={teamToAddInGroup}
                        onChange={(e) => setTeamToAddInGroup(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-900 text-xs text-white"
                      >
                        <option value="">{groupName} मध्ये संघ जोडा...</option>
                        {tournamentTeams.map((tm) => (
                          <option key={tm.id} value={tm.id}>
                            {tm.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleAssignTeamToGroup}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-black cursor-pointer shrink-0"
                      >
                        जोडा
                      </button>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {groupName} संघ ({assignedGroupTeamIds.length}):{" "}
                      {assignedGroupTeamIds.length > 0
                        ? assignedGroupTeamIds
                            .map((id) => teamMap[id]?.name)
                            .filter(Boolean)
                            .join(", ")
                        : "अद्याप कोणताही संघ नाही."}
                    </div>
                  </div>
                )}
              </div>
            )}

            {matchCategory === "other" && (
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <div className="text-xs font-bold text-slate-200">
                  Match Title निवडा:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {MATCH_TITLES.map((titleOpt) => (
                    <button
                      key={titleOpt}
                      type="button"
                      onClick={() => setMatchTitle(titleOpt)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black border cursor-pointer ${
                        matchTitle === titleOpt
                          ? "bg-amber-400 text-slate-950 border-amber-300"
                          : "bg-slate-900 text-slate-300 border-slate-700 hover:text-white"
                      }`}
                    >
                      {titleOpt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {readyForTeamAndMatchDetails && (
            <>
              <div className="grid grid-cols-2 gap-3 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setSubView("pick_team_a")}
                  className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 cursor-pointer"
                >
                  {teamA ? (
                    renderTeamLogoBadge(teamA, "w-14 h-14", "text-sm")
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-slate-950 border border-dashed border-slate-600 flex items-center justify-center text-xs font-black text-slate-400">
                      Team A
                    </div>
                  )}
                  <span className="text-xs font-black text-white truncate max-w-full">
                    {teamA ? teamA.name : "Team 1 निवडा"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSubView("pick_team_b")}
                  className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 cursor-pointer"
                >
                  {teamB ? (
                    renderTeamLogoBadge(teamB, "w-14 h-14", "text-sm")
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-slate-950 border border-dashed border-slate-600 flex items-center justify-center text-xs font-black text-slate-400">
                      Team B
                    </div>
                  )}
                  <span className="text-xs font-black text-white truncate max-w-full">
                    {teamB ? teamB.name : "Team 2 निवडा"}
                  </span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Venue (ठिकाण)
                  </label>
                  <input
                    type="text"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="मैदानाचे नाव..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-xs sm:text-sm text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-700 bg-slate-950 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Time
                    </label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-700 bg-slate-950 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-amber-300">
                    Overs
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={overs}
                    onChange={(e) => setOvers(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-900 text-xs font-bold text-white"
                  />
                  <div className="flex flex-wrap gap-1">
                    {PRESET_OVERS.map((ov) => (
                      <button
                        key={ov}
                        type="button"
                        onClick={() => setOvers(ov)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black cursor-pointer ${
                          Number(overs) === ov
                            ? "bg-amber-400 text-slate-950"
                            : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        }`}
                      >
                        {ov}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-amber-300">
                    Balls / Over
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={ballsPerOver}
                    onChange={(e) => setBallsPerOver(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-900 text-xs font-bold text-white"
                  />
                  <div className="flex flex-wrap gap-1">
                    {PRESET_BALLS_PER_OVER.map((bpo) => (
                      <button
                        key={bpo}
                        type="button"
                        onClick={() => setBallsPerOver(bpo)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black cursor-pointer ${
                          Number(ballsPerOver) === bpo
                            ? "bg-amber-400 text-slate-950"
                            : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        }`}
                      >
                        {bpo}b
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-200">
                    Players per Side
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="15"
                    value={playersPerSide}
                    onChange={(e) => setPlayersPerSide(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-900 text-xs font-bold text-white"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_PLAYERS_PER_SIDE.map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setPlayersPerSide(cnt)}
                        className={`px-2.5 py-0.5 rounded-md text-[11px] font-black cursor-pointer ${
                          Number(playersPerSide) === cnt
                            ? "bg-amber-400 text-slate-950"
                            : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        }`}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1">
                    Scorer Name (पर्यायी)
                  </label>
                  <input
                    type="text"
                    value={scorerName}
                    onChange={(e) => setScorerName(e.target.value)}
                    placeholder="स्कोअररचे नाव..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-xs sm:text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleSaveFixtureOnly}
                  className="inline-flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-black cursor-pointer"
                >
                  <Save className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>Save Fixture</span>
                </button>

                <button
                  type="button"
                  onClick={handleStartMatchToToss}
                  className="inline-flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs sm:text-sm font-black cursor-pointer"
                >
                  <Gavel className="w-4 h-4 shrink-0" />
                  <span>Toss करा</span>
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    );
  }
  // === SECTION: SUB-VIEW NEW / EDIT SCHEDULED MATCH END ===

  // === SECTION: MAIN FIXTURE LIST VIEW START ===
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
              सामने व Toss
            </h1>
          </div>

          <button
            type="button"
            onClick={openNewFixtureSubView}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] sm:text-sm font-black whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>New Match</span>
          </button>
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

      <div className="space-y-2.5">
        {tournamentMatches.length > 0 ? (
          tournamentMatches.map((m) => {
            const tA = teamMap[m.teamAId];
            const tB = teamMap[m.teamBId];
            const currentInn =
              m.innings?.[m.activeInningsIndex || 0] || m.innings?.[0];
            const isScheduled = m.status === "scheduled";
            const isLive = m.status === "live";
            const dateTimeLabel = [m.date, m.time].filter(Boolean).join(" • ");

            return (
              <div
                key={m.id}
                className="bg-slate-900 rounded-2xl p-3.5 border border-slate-800 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-slate-300 truncate">
                      {m.groupName ? `${m.groupName} • ` : ""}
                      {m.matchTitle}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {dateTimeLabel || "Date TBA"}
                      {m.venue ? ` • ${m.venue}` : ""}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                        isLive
                          ? "bg-amber-400 text-slate-950"
                          : m.status === "completed"
                          ? "bg-slate-800 text-slate-300"
                          : "bg-slate-800 text-amber-300"
                      }`}
                    >
                      {isLive
                        ? "Live"
                        : m.status === "completed"
                        ? "Completed"
                        : "Scheduled"}
                    </span>
                    {currentInn && !isScheduled && (
                      <div className="text-xs font-black text-amber-300 mt-0.5">
                        {currentInn.runs}/{currentInn.wickets} (
                        {formatOversFromBalls(
                          currentInn.legalBalls,
                          m.ballsPerOver
                        )}
                        )
                      </div>
                    )}
                  </div>
                </div>

                {/* Teams Row (Click logo/name -> Team Overview) */}
                <div className="space-y-1.5 pt-0.5">
                  {[tA, tB].map((tm, idx) => (
                    <div
                      key={tm?.id || `slot_${idx}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (tm?.id && onOpenTeamOverview) {
                          onOpenTeamOverview(tm.id, activeTournamentId);
                        }
                      }}
                      className="flex items-center gap-2.5 min-w-0 cursor-pointer hover:text-amber-300"
                    >
                      {renderTeamLogoBadge(tm, "w-7 h-7", "text-[10px]")}
                      <span className="text-sm font-black text-white truncate">
                        {tm?.name || `Team ${idx + 1}`}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] font-bold text-slate-400 truncate">
                    {activeTournament?.club || "JBSC"} •{" "}
                    {m.format === MATCH_FORMATS.TEST ? "Test" : `${m.overs} Ov`}{" "}
                    • {m.playersPerSide}P
                  </span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Scheduled असेपर्यंतच Edit बटण */}
                    {isScheduled && (
                      <button
                        type="button"
                        onClick={() => openEditScheduledMatch(m)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold cursor-pointer"
                        title="Edit Scheduled Match"
                      >
                        <Pencil className="w-3.5 h-3.5 text-amber-300" />
                        <span>Edit</span>
                      </button>
                    )}

                    {isLive || m.status === "completed" ? (
                      <button
                        type="button"
                        onClick={() => onStartScoring && onStartScoring(m.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isLive ? "Scoring" : "Scorecard"}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openTossSubView(m)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black cursor-pointer"
                      >
                        <Gavel className="w-3.5 h-3.5" />
                        <span>Toss करा</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteMatch(m.id)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
                      title="Delete Match"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 text-center text-xs text-slate-400">
            या स्पर्धेसाठी अद्याप कोणताही सामना तयार केलेला नाही. &ldquo;New Match&rdquo; वर क्लिक करा.
          </div>
        )}
      </div>
    </div>
  );
  // === SECTION: MAIN FIXTURE LIST VIEW END ===
}