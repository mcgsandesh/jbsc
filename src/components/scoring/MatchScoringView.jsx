// src/components/scoring/MatchScoringView.jsx
import React, { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Sparkles, Search, X } from "lucide-react";
import {
  MATCH_FORMATS,
  getMatches,
  getTeams,
  getPlayers,
  saveMatchFixture,
  recordMatchBall,
  undoLastMatchBall,
  declareMatchInnings,
  startNextInnings,
  setActiveBattersAndBowler,
  setTeamPlayerLineStatus,
  formatOversFromBalls
} from "../../services/scoringLocalEngine";
import { showSuccess, showError } from "../../utils/alert";

const WICKET_TYPES = [
  "Bowled",
  "Caught",
  "Stumped",
  "LBW",
  "Run Out",
  "Mankad",
  "Retired",
  "Over The Fence",
  "One Hand One Bounce",
  "Obstructing The Field",
  "Hit Wicket",
  "Hit The Ball Twice",
  "Timed Out"
];

const BONUS_RUN_OPTIONS = [1, 2, 3, 4, 5, 6, 8];

export default function MatchScoringView({ matchId = "", onBackToFixtures }) {
  // === SECTION: COMPONENT STATE START ===
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [activeMatchId, setActiveMatchId] = useState(matchId);

  // Match Centre Tabs: "scoring" | "scorecard" | "balls" | "stats" | "super_stats" | "info"
  const [centreTab, setCentreTab] = useState("scoring");
  const [scorecardSide, setScorecardSide] = useState("A");

  // Active Sheet: null | "select_striker" | "select_non_striker" | "select_bowler" | "select_magic_victim" | "more" | "bonus" | "wicket" | "extras_wd" | "extras_nb" | "extras_bye" | "extras_lb"
  const [activeSheet, setActiveSheet] = useState(null);
  const [playerListQuery, setPlayerListQuery] = useState("");

  // Popup on 1 or 3 runs: null | 1 | 3
  const [pendingDeclareRuns, setPendingDeclareRuns] = useState(null);

  // Compulsory bowler change flag when over ends
  const [mustSelectNextBowler, setMustSelectNextBowler] = useState(false);
  const [lastOverBowlerId, setLastOverBowlerId] = useState("");

  // Magic Ball Toggle & Pending Wicket Type when choosing 2nd Out Player
  const [magicBallActive, setMagicBallActive] = useState(false);
  const [pendingMagicWicketType, setPendingMagicWicketType] = useState("");

  // Bonus (+/-)
  const [bonusSign, setBonusSign] = useState(1);
  // === SECTION: COMPONENT STATE END ===

  // === SECTION: DATA LOAD & DERIVED STATE START ===
  const reloadMatchData = () => {
    const mtList = getMatches();
    const tmList = getTeams();
    const plList = getPlayers();

    setMatches(mtList);
    setTeams(tmList);
    setPlayers(plList);

    const chosenId = matchId || activeMatchId || (mtList[0]?.id ?? "");
    setActiveMatchId(chosenId);
  };

  useEffect(() => {
    reloadMatchData();
  }, [matchId]);

  const match = useMemo(
    () => matches.find((m) => m.id === activeMatchId) || null,
    [matches, activeMatchId]
  );

  const teamMap = useMemo(
    () => Object.fromEntries(teams.map((t) => [t.id, t])),
    [teams]
  );

  const playerMap = useMemo(
    () => Object.fromEntries(players.map((p) => [p.id, p])),
    [players]
  );

  const currentInn = useMemo(() => {
    if (!match) return null;
    return match.innings?.[match.activeInningsIndex || 0] || match.innings?.[0];
  }, [match]);

  const firstInn = match?.innings?.[0] || null;
  const isSecondInnings = (match?.activeInningsIndex || 0) >= 1 && firstInn;

  const battingTeam = currentInn ? teamMap[currentInn.battingTeamId] : null;
  const bowlingTeam = currentInn ? teamMap[currentInn.bowlingTeamId] : null;

  const battingTeamPlayers = useMemo(() => {
    if (!battingTeam) return players;
    const roster = battingTeam.squadRoster || {};
    const ids = Object.keys(roster);
    if (ids.length === 0) return players;
    return ids.map((pid) => playerMap[pid]).filter(Boolean);
  }, [battingTeam, players, playerMap]);

  const bowlingTeamPlayers = useMemo(() => {
    if (!bowlingTeam) return players;
    const roster = bowlingTeam.squadRoster || {};
    const ids = Object.keys(roster);
    if (ids.length === 0) return players;
    return ids.map((pid) => playerMap[pid]).filter(Boolean);
  }, [bowlingTeam, players, playerMap]);

  const filteredListPlayers = useMemo(() => {
    const pool =
      activeSheet === "select_bowler"
        ? bowlingTeamPlayers
        : battingTeamPlayers;
    const q = playerListQuery.trim().toLowerCase();

    if (!q) return pool;
    return pool.filter((pl) => {
      const n = String(pl.name || "").toLowerCase();
      const c = String(pl.playerCode || "").toLowerCase();
      const r = String(pl.role || "").toLowerCase();
      return n.includes(q) || c.includes(q) || r.includes(q);
    });
  }, [activeSheet, bowlingTeamPlayers, battingTeamPlayers, playerListQuery]);

  const ballsFeedItems = useMemo(() => {
    if (!currentInn || !match) return [];
    const bpo = Math.max(1, Number(match.ballsPerOver || 6));
    let runningRuns = 0;
    let runningWickets = 0;
    let runningLegalBalls = 0;
    let overStartIndex = 0;

    const items = [];

    const calcBallNumbers = (bl) => {
      const isMagic = Boolean(bl.isMagicBall);
      const extType = bl.extrasType || "none";
      const baseBat = Number(bl.runs || 0);
      const baseExt = Number(bl.extrasRuns || 0);

      let effBat = baseBat;
      let effExt = baseExt;
      let wkInc = bl.isWicket ? 1 : 0;
      let legalInc = 0;

      if (isMagic) {
        if (extType === "wd") {
          effBat = 0;
          effExt = Math.max(2, baseExt * 2);
          legalInc = match.countWideAsBall ? 1 : 0;
        } else if (extType === "nb") {
          effBat = baseBat * 2;
          effExt = 2;
          legalInc = match.countNoBallAsBall ? 1 : 0;
        } else if (extType === "bye" || extType === "lb") {
          effBat = 0;
          effExt = Math.max(2, baseExt * 2);
          legalInc = 1;
        } else if (baseBat === 0 && !bl.isWicket) {
          effBat = 0;
          effExt = 0;
          legalInc = 2;
        } else {
          effBat = baseBat * 2;
          effExt = 0;
          legalInc = 1;
        }
        if (bl.isWicket) wkInc = 2;
      } else {
        effBat = baseBat;
        effExt = baseExt;
        const countsLegal =
          extType === "none" ||
          extType === "bye" ||
          extType === "lb" ||
          (extType === "wd" && match.countWideAsBall) ||
          (extType === "nb" && match.countNoBallAsBall);
        legalInc = countsLegal ? 1 : 0;
      }

      return { effBat, effExt, wkInc, legalInc };
    };

    (currentInn.balls || []).forEach((bl, index) => {
      const extType = bl.extrasType || "none";
      const { effBat, effExt, wkInc, legalInc } = calcBallNumbers(bl);
      runningRuns += effBat + effExt;
      runningWickets += wkInc;
      runningLegalBalls += legalInc;

      const overCompletedNow =
        legalInc > 0 && runningLegalBalls > 0 && runningLegalBalls % bpo === 0;
      const completedOverNumber = runningLegalBalls / bpo;

      items.push({
        type: "ball",
        id: bl.id,
        seqNumber: index + 1,
        runs: bl.runs,
        effBat,
        effExt,
        extrasType: extType,
        isWicket: Boolean(bl.isWicket),
        wicketType: bl.wicketType || "",
        isMagicBall: Boolean(bl.isMagicBall),
        isDeclare: Boolean(bl.isDeclare),
        strikerId: bl.strikerId,
        bowlerId: bl.bowlerId,
        overCompletedNow,
        completedOverNumber,
        scoreAfter: `${runningRuns}-${runningWickets}`,
        oversAfter: formatOversFromBalls(runningLegalBalls, bpo)
      });

      if (overCompletedNow) {
        const sliceBalls = (currentInn.balls || []).slice(
          overStartIndex,
          index + 1
        );
        const overRuns = sliceBalls.reduce((sum, item) => {
          const { effBat: eb, effExt: ee } = calcBallNumbers(item);
          return sum + eb + ee;
        }, 0);

        const overWickets = sliceBalls.reduce(
          (wSum, item) =>
            wSum + (item.isWicket ? (item.isMagicBall ? 2 : 1) : 0),
          0
        );

        items.push({
          type: "over_summary",
          id: `ov_sum_${completedOverNumber}`,
          overNumber: completedOverNumber,
          overRuns,
          overWickets,
          scoreAtEnd: `${runningRuns}-${runningWickets}`,
          bowlerName: playerMap[bl.bowlerId]?.name || "Bowler",
          strikerName: playerMap[bl.strikerId]?.name || "Batter",
          balls: sliceBalls
        });

        overStartIndex = index + 1;
      }
    });

    return items;
  }, [currentInn, match, playerMap]);
  // === SECTION: DATA LOAD & DERIVED STATE END ===

  // === SECTION: PLAYER PICKER, MAGIC 2ND OUT & STRIKE HANDLERS START ===
  const openPlayerListSheet = (sheetName) => {
    setPlayerListQuery("");
    setActiveSheet(sheetName);
  };

  const applyWicketCommit = (wType, secondOutPlayerId = "") => {
    if (!match || !currentInn) return;

    const updated = recordMatchBall(match.id, {
      runs: 0,
      extrasType: "none",
      extrasRuns: 0,
      isWicket: true,
      wicketType: wType,
      isMagicBall: magicBallActive,
      magicTargetPlayerId: magicBallActive ? secondOutPlayerId : "",
      isDeclare: false,
      ranBetweenWickets: false,
      strikerId: currentInn.strikerId,
      nonStrikerId: currentInn.nonStrikerId,
      bowlerId: currentInn.bowlerId
    });

    setMagicBallActive(false);
    setPendingMagicWicketType("");
    setActiveSheet(null);
    reloadMatchData();

    const nextInn =
      updated?.innings?.[updated.activeInningsIndex || 0] ||
      updated?.innings?.[0];
    const bpo = Math.max(1, Number(match.ballsPerOver || 6));
    const nextLegal = Number(nextInn?.legalBalls || 0);

    if (nextLegal > 0 && nextLegal % bpo === 0) {
      setMustSelectNextBowler(true);
      setLastOverBowlerId(currentInn.bowlerId);
      openPlayerListSheet("select_bowler");
    } else {
      openPlayerListSheet("select_striker");
    }
  };

  const handlePickPlayerFromList = (pickedPlayerId) => {
    if (!match || !currentInn) return;

    if (activeSheet === "select_striker") {
      if (pickedPlayerId === currentInn.nonStrikerId) {
        showError("समान फलंदाज", "Striker आणि Non-Striker वेगळे असावेत.");
        return;
      }
      setActiveBattersAndBowler(match.id, {
        strikerId: pickedPlayerId,
        nonStrikerId: currentInn.nonStrikerId,
        bowlerId: currentInn.bowlerId
      });
      setActiveSheet(null);
      reloadMatchData();
      return;
    }

    if (activeSheet === "select_non_striker") {
      if (pickedPlayerId === currentInn.strikerId) {
        showError("समान फलंदाज", "Striker आणि Non-Striker वेगळे असावेत.");
        return;
      }
      setActiveBattersAndBowler(match.id, {
        strikerId: currentInn.strikerId,
        nonStrikerId: pickedPlayerId,
        bowlerId: currentInn.bowlerId
      });
      setActiveSheet(null);
      reloadMatchData();
      return;
    }

    if (activeSheet === "select_bowler") {
      if (mustSelectNextBowler && pickedPlayerId === lastOverBowlerId) {
        showError(
          "नवीन Bowler आवश्यक",
          "Over संपल्यावर तोच Bowler घेता येणार नाही; दुसरा Bowler निवडा."
        );
        return;
      }
      setActiveBattersAndBowler(match.id, {
        strikerId: currentInn.strikerId,
        nonStrikerId: currentInn.nonStrikerId,
        bowlerId: pickedPlayerId
      });
      setMustSelectNextBowler(false);
      setLastOverBowlerId("");
      setActiveSheet(null);
      reloadMatchData();
      return;
    }

    if (activeSheet === "select_magic_victim") {
      const wType = pendingMagicWicketType || "Wicket";
      applyWicketCommit(wType, pickedPlayerId);
    }
  };

  const handleManualStrikeSwitch = () => {
    if (!match || !currentInn) return;
    if (!currentInn.strikerId || !currentInn.nonStrikerId) {
      showError("फलंदाज निवडा", "Strike बदलण्यासाठी Striker व Non-Striker निवडा.");
      return;
    }
    setActiveBattersAndBowler(match.id, {
      strikerId: currentInn.nonStrikerId,
      nonStrikerId: currentInn.strikerId,
      bowlerId: currentInn.bowlerId
    });
    reloadMatchData();
    showSuccess("Strike बदलली", "Striker आणि Non-Striker ची जागा बदलली.");
  };

  const handleTogglePlayingBench = (e, playerObj) => {
    e.stopPropagation();
    const targetTeam =
      activeSheet === "select_bowler" ? bowlingTeam : battingTeam;
    if (!targetTeam || !playerObj) return;

    const currentStatus =
      targetTeam.squadRoster?.[playerObj.id]?.status || "playing";
    const nextStatus = currentStatus === "playing" ? "bench" : "playing";
    setTeamPlayerLineStatus(targetTeam.id, playerObj.id, nextStatus);
    reloadMatchData();
  };
  // === SECTION: PLAYER PICKER, MAGIC 2ND OUT & STRIKE HANDLERS END ===

  // === SECTION: SCORING, EXTRAS, DECLARE, WICKET & UNDO HANDLERS START ===
  const ensureCanScore = () => {
    if (!match || !currentInn) return false;
    if (mustSelectNextBowler) {
      showError(
        "Bowler बदला",
        "Over संपला आहे—पुढचे स्कोअरिंग सुरू करण्यापूर्वी नवीन Bowler निवडा."
      );
      openPlayerListSheet("select_bowler");
      return false;
    }
    if (!currentInn.strikerId || !currentInn.bowlerId) {
      showError("खेळाडू निवडा", "कृपया Striker आणि Bowler निवडा.");
      return false;
    }
    return true;
  };

  const commitBall = (
    runsValue,
    customExtrasType = "none",
    customExtrasRuns = 0,
    isDeclareFlag = false,
    ranBetweenFlag = false
  ) => {
    if (!ensureCanScore()) return;
    const bpo = Math.max(1, Number(match.ballsPerOver || 6));
    const prevLegal = Number(currentInn.legalBalls || 0);

    const updated = recordMatchBall(match.id, {
      runs: runsValue,
      extrasType: customExtrasType,
      extrasRuns: customExtrasRuns,
      isWicket: false,
      isMagicBall: magicBallActive,
      isDeclare: isDeclareFlag,
      ranBetweenWickets: isDeclareFlag ? false : ranBetweenFlag,
      strikerId: currentInn.strikerId,
      nonStrikerId: currentInn.nonStrikerId,
      bowlerId: currentInn.bowlerId
    });

    const nextInn =
      updated?.innings?.[updated.activeInningsIndex || 0] ||
      updated?.innings?.[0];
    const nextLegal = Number(nextInn?.legalBalls || 0);

    if (!(magicBallActive && customExtrasType === "wd")) {
      setMagicBallActive(false);
    }
    setPendingDeclareRuns(null);
    setActiveSheet(null);
    reloadMatchData();

    if (nextLegal > prevLegal && nextLegal % bpo === 0) {
      setMustSelectNextBowler(true);
      setLastOverBowlerId(currentInn.bowlerId);
      openPlayerListSheet("select_bowler");
    }
  };

  const handleRunButtonClick = (runsValue) => {
    if (!ensureCanScore()) return;
    if (runsValue === 1 || runsValue === 3) {
      setPendingDeclareRuns(runsValue);
      return;
    }
    commitBall(runsValue, "none", 0, false, false);
  };

  const handleAdjustRuns = (amount) => {
    if (!match) return;
    const signedRuns = Number(amount || 0) * bonusSign;
    saveMatchFixture({
      ...match,
      innings: match.innings.map((inn, idx) =>
        idx === (match.activeInningsIndex || 0)
          ? {
              ...inn,
              runs: Math.max(0, Number(inn.runs || 0) + signedRuns)
            }
          : inn
      )
    });
    setActiveSheet(null);
    reloadMatchData();
    showSuccess(
      "Runs Update",
      `${signedRuns > 0 ? `+${signedRuns}` : signedRuns} runs लागू केले.`
    );
  };

  const handleWicketBall = (wType) => {
    if (!ensureCanScore()) return;

    // Magic Ball वर Out झाल्यावर आधी 2nd Out Player निवडा
    if (magicBallActive) {
      setPendingMagicWicketType(wType);
      openPlayerListSheet("select_magic_victim");
      return;
    }

    applyWicketCommit(wType, "");
  };

  const handleUndo = () => {
    if (!match) return;
    undoLastMatchBall(match.id);
    setMustSelectNextBowler(false);
    setLastOverBowlerId("");
    setPendingMagicWicketType("");
    reloadMatchData();
    showSuccess("Undo", "शेवटचा चेंडू व जुना बॅट्समन पूर्ववत केला.");
  };
  // === SECTION: SCORING, EXTRAS, DECLARE, WICKET & UNDO HANDLERS END ===

  if (!match || !currentInn) {
    return (
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 text-center space-y-3">
        <div className="text-sm font-black">कोणताही सामना निवडलेला नाही</div>
        {onBackToFixtures && (
          <button
            type="button"
            onClick={onBackToFixtures}
            className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-black cursor-pointer"
          >
            ← सामने यादी
          </button>
        )}
      </div>
    );
  }

  // === SECTION: PLAYER LIST PICKER SHEET START ===
  if (
    activeSheet === "select_striker" ||
    activeSheet === "select_non_striker" ||
    activeSheet === "select_bowler" ||
    activeSheet === "select_magic_victim"
  ) {
    const isBowlingPicker = activeSheet === "select_bowler";
    const sideTeam = isBowlingPicker ? bowlingTeam : battingTeam;
    const titleText =
      activeSheet === "select_striker"
        ? `Select Batsman • Striker (${battingTeam?.name || "Batting"})`
        : activeSheet === "select_non_striker"
        ? `Select Batsman • Non-Striker (${battingTeam?.name || "Batting"})`
        : activeSheet === "select_bowler"
        ? mustSelectNextBowler
          ? `नवीन Bowler निवडा (${bowlingTeam?.name || "Bowling"})`
          : `Select Bowler (${bowlingTeam?.name || "Bowling"})`
        : `2nd Out Player निवडा (${battingTeam?.name || "Batting"})`;

    return (
      <div className="space-y-2.5 text-white">
        <div className="flex items-center justify-between bg-slate-900 px-3.5 py-2.5 rounded-2xl border border-slate-800">
          <h2 className="text-xs sm:text-sm font-black text-amber-300 truncate">
            {titleText}
          </h2>
          {!mustSelectNextBowler && (
            <button
              type="button"
              onClick={() => {
                setPendingMagicWicketType("");
                setActiveSheet(null);
              }}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-200 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="bg-slate-900 rounded-2xl p-3 border border-slate-800 space-y-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={playerListQuery}
              onChange={(e) => setPlayerListQuery(e.target.value)}
              placeholder={`${sideTeam?.name || "Team"} खेळाडू शोधा...`}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
            />
          </div>

          <div className="divide-y divide-slate-800/80 max-h-96 overflow-y-auto">
            {filteredListPlayers.length > 0 ? (
              filteredListPlayers.map((pl, idx) => {
                const isSameLastBowler =
                  activeSheet === "select_bowler" &&
                  mustSelectNextBowler &&
                  pl.id === lastOverBowlerId;
                const isAlreadyStrikerInMagic =
                  activeSheet === "select_magic_victim" &&
                  pl.id === currentInn.strikerId;
                const isDisabled = isSameLastBowler || isAlreadyStrikerInMagic;

                const statusLabel =
                  sideTeam?.squadRoster?.[pl.id]?.status === "bench"
                    ? "Bench"
                    : "Playing";

                return (
                  <div
                    key={pl.id}
                    onClick={() =>
                      !isDisabled && handlePickPlayerFromList(pl.id)
                    }
                    className={`py-2 px-2 flex items-center justify-between gap-2 rounded-xl text-xs ${
                      isDisabled
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:bg-slate-800/70 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 text-[11px] font-mono text-slate-400 shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-black text-white truncate">
                          {pl.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {pl.playerCode || ""} {pl.role ? `• ${pl.role}` : ""}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleTogglePlayingBench(e, pl)}
                      className={`px-2 py-0.5 rounded text-[10px] font-black cursor-pointer shrink-0 ${
                        statusLabel === "Playing"
                          ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                          : "bg-slate-800 text-slate-300 border border-slate-700"
                      }`}
                    >
                      {statusLabel}
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="py-5 text-center text-xs text-slate-400">
                या संघात खेळाडू नाहीत.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  // === SECTION: PLAYER LIST PICKER SHEET END ===

  const bpo = Math.max(1, Number(match.ballsPerOver || 6));
  const maxBallsInMatch = Math.max(1, Number(match.overs || 6)) * bpo;
  const crr =
    currentInn.legalBalls > 0
      ? (
          (Number(currentInn.runs || 0) / Number(currentInn.legalBalls)) *
          bpo
        ).toFixed(2)
      : "0.00";

  const targetRuns = isSecondInnings ? Number(firstInn.runs || 0) + 1 : null;
  const runsNeeded =
    targetRuns !== null
      ? Math.max(0, targetRuns - Number(currentInn.runs || 0))
      : null;
  const ballsRemaining =
    match.format !== MATCH_FORMATS.TEST
      ? Math.max(0, maxBallsInMatch - Number(currentInn.legalBalls || 0))
      : null;
  const reqRunRate =
    runsNeeded !== null && ballsRemaining && ballsRemaining > 0
      ? ((runsNeeded / ballsRemaining) * bpo).toFixed(2)
      : null;

  const strikerObj = playerMap[currentInn.strikerId];
  const nonStrikerObj = playerMap[currentInn.nonStrikerId];
  const bowlerObj = playerMap[currentInn.bowlerId];

  const sStat = currentInn.playerStats?.[currentInn.strikerId] || {
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0
  };
  const nsStat = currentInn.playerStats?.[currentInn.nonStrikerId] || {
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0
  };
  const bwStat = currentInn.playerStats?.[currentInn.bowlerId] || {
    ballsBowled: 0,
    runsConceded: 0,
    wickets: 0
  };

  const calcSr = (st) =>
    st.balls > 0 ? ((st.runs / st.balls) * 100).toFixed(1) : "0.0";
  const calcEco = (st) =>
    st.ballsBowled > 0
      ? (st.runsConceded / (st.ballsBowled / bpo)).toFixed(1)
      : "0.0";

  const teamA = teamMap[match.teamAId];
  const teamB = teamMap[match.teamBId];
  const activeScorecardTeam = scorecardSide === "B" ? teamB : teamA;
  const activeScorecardPlayers = activeScorecardTeam
    ? Object.keys(activeScorecardTeam.squadRoster || {})
        .map((pid) => playerMap[pid])
        .filter(Boolean)
    : players;

  const battedPlayers = activeScorecardPlayers.filter((pl) => {
    const st = currentInn.playerStats?.[pl.id];
    const hasBatted =
      st &&
      (Number(st.balls || 0) > 0 ||
        Number(st.runs || 0) > 0 ||
        Boolean(st.out));
    const isCurrentlyAtCrease =
      currentInn.battingTeamId === activeScorecardTeam?.id &&
      (pl.id === currentInn.strikerId || pl.id === currentInn.nonStrikerId);
    return Boolean(hasBatted || isCurrentlyAtCrease);
  });

  const yetToBatPlayers = activeScorecardPlayers.filter(
    (pl) => !battedPlayers.some((bp) => bp.id === pl.id)
  );

  const runRateVal =
    currentInn.legalBalls > 0
      ? (
          (Number(currentInn.runs || 0) / Number(currentInn.legalBalls)) *
          bpo
        ).toFixed(1)
      : "0.0";

  const onlyBalls = ballsFeedItems.filter((item) => item.type === "ball");

  return (
    <div className="space-y-2 text-white">
      {/* Score Header */}
      <div className="bg-slate-900 rounded-2xl p-3 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {onBackToFixtures && (
              <button
                type="button"
                onClick={onBackToFixtures}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>सामने</span>
              </button>
            )}
            <span className="text-[11px] font-bold text-slate-400 truncate">
              Match Centre •{" "}
              {match.format === MATCH_FORMATS.TEST
                ? "Test"
                : `${match.overs} Ov`}
            </span>
          </div>

          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-400/15 text-amber-300 border border-amber-400/30 shrink-0">
            {match.activeInningsIndex === 0 ? "1st Innings" : "2nd Innings"}
          </span>
        </div>

        <div className="text-center space-y-0.5">
          <div className="text-xs font-black text-slate-200 uppercase tracking-wide">
            {battingTeam?.name || "Team A"}
          </div>
          <div className="text-3xl font-black text-amber-400 leading-none">
            {currentInn.runs}-{currentInn.wickets}
          </div>
          <div className="flex items-center justify-center gap-4 text-[11px] text-slate-300 pt-1">
            <span>
              Ov -{" "}
              <strong className="text-white">
                {formatOversFromBalls(currentInn.legalBalls, bpo)}
              </strong>
              /{match.format === MATCH_FORMATS.TEST ? "∞" : match.overs}
            </span>
            <span>
              CRR - <strong className="text-amber-300">{crr}</strong>
            </span>
          </div>

          {targetRuns !== null && (
            <div className="text-[11px] text-slate-300 pt-0.5 space-y-0.5">
              <div>
                Target <strong className="text-white">{targetRuns}</strong>
                {reqRunRate !== null ? ` • Req. RR - ${reqRunRate}` : ""}
              </div>
              {ballsRemaining !== null && (
                <div className="text-amber-300 font-bold">
                  Need {runsNeeded} Runs of {ballsRemaining} Balls
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Match Centre Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap bg-slate-900 p-1.5 rounded-2xl border border-slate-800 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
        {[
          { id: "scoring", label: "Scoring" },
          { id: "scorecard", label: "Scorecard" },
          { id: "balls", label: "Balls" },
          { id: "stats", label: "Stats" },
          { id: "super_stats", label: "Super Stats" },
          { id: "info", label: "Info" }
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setCentreTab(t.id)}
            className={`shrink-0 px-3 py-1 rounded-xl text-xs font-black cursor-pointer ${
              centreTab === t.id
                ? "bg-amber-400 text-slate-950"
                : "bg-slate-800 text-slate-300 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* SCORING TAB */}
      {centreTab === "scoring" && (
        <div className="space-y-2">
          {mustSelectNextBowler && (
            <div className="bg-rose-950/80 border border-rose-500/50 rounded-2xl p-2.5 flex items-center justify-between gap-2 text-xs">
              <span className="font-black text-rose-200">
                Over पूर्ण! नवीन Bowler निवडल्याशिवाय Scoring होणार नाही.
              </span>
              <button
                type="button"
                onClick={() => openPlayerListSheet("select_bowler")}
                className="px-3 py-1 rounded-lg bg-amber-400 text-slate-950 font-black cursor-pointer shrink-0"
              >
                Bowler निवडा
              </button>
            </div>
          )}

          {/* Batsman & Bowler Mini Scorecard + Manual Strike Switch */}
          <div className="bg-slate-900 rounded-2xl p-2.5 border border-slate-800 space-y-2 text-[11px]">
            <div className="flex items-center justify-between px-1">
              <span className="font-black text-amber-300">
                Batsman (R, B, 6s, SR)
              </span>
              <button
                type="button"
                onClick={handleManualStrikeSwitch}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-[10px] font-black cursor-pointer"
              >
                ↔ Strike बदल
              </button>
            </div>

            <div
              onClick={() => openPlayerListSheet("select_striker")}
              className="grid grid-cols-6 items-center px-2 py-1.5 rounded-lg bg-amber-400/15 border border-amber-400/40 cursor-pointer"
            >
              <span className="col-span-2 font-black text-amber-300 truncate">
                {strikerObj ? `${strikerObj.name}*` : "+ Striker"}
              </span>
              <span className="text-right font-black text-white">
                {sStat.runs}
              </span>
              <span className="text-right text-slate-300">{sStat.balls}</span>
              <span className="text-right text-slate-300">{sStat.sixes}</span>
              <span className="text-right font-mono text-slate-200">
                {calcSr(sStat)}
              </span>
            </div>

            <div
              onClick={() => openPlayerListSheet("select_non_striker")}
              className="grid grid-cols-6 items-center px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer"
            >
              <span className="col-span-2 font-bold text-slate-200 truncate">
                {nonStrikerObj ? nonStrikerObj.name : "+ Non-Striker"}
              </span>
              <span className="text-right font-bold text-white">
                {nsStat.runs}
              </span>
              <span className="text-right text-slate-400">{nsStat.balls}</span>
              <span className="text-right text-slate-400">{nsStat.sixes}</span>
              <span className="text-right font-mono text-slate-400">
                {calcSr(nsStat)}
              </span>
            </div>

            <div className="grid grid-cols-6 text-slate-400 font-bold px-1 pt-1 border-t border-slate-800/80">
              <span className="col-span-2 text-amber-300">Bowler</span>
              <span className="text-right">O</span>
              <span className="text-right">R</span>
              <span className="text-right">W</span>
              <span className="text-right">Eco</span>
            </div>

            <div
              onClick={() => openPlayerListSheet("select_bowler")}
              className="grid grid-cols-6 items-center px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer"
            >
              <span className="col-span-2 font-bold text-white truncate">
                {bowlerObj ? bowlerObj.name : "+ Bowler"}
              </span>
              <span className="text-right font-mono text-slate-300">
                {formatOversFromBalls(bwStat.ballsBowled, bpo)}
              </span>
              <span className="text-right text-slate-300">
                {bwStat.runsConceded}
              </span>
              <span className="text-right font-black text-amber-300">
                {bwStat.wickets}
              </span>
              <span className="text-right font-mono text-slate-400">
                {calcEco(bwStat)}
              </span>
            </div>
          </div>

          {/* Recent Balls Strip with Over Markers (1ov, 2ov |) */}
          <div className="flex items-center gap-1.5 overflow-x-auto bg-slate-900 px-3 py-2 rounded-2xl border border-slate-800 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
            {onlyBalls.slice(-12).map((bl) => {
              const tag = bl.isWicket
                ? bl.isMagicBall
                  ? "2W"
                  : "W"
                : bl.extrasType === "wd"
                ? `${bl.effExt}Wd`
                : bl.extrasType === "nb"
                ? bl.effBat > 0
                  ? `NB+${bl.effBat}`
                  : "NB"
                : bl.extrasType === "bye"
                ? `${bl.effExt}B`
                : bl.extrasType === "lb"
                ? `${bl.effExt}LB`
                : `${bl.effBat}${bl.isDeclare ? "D" : ""}`;

              return (
                <React.Fragment key={bl.id}>
                  <span
                    className={`min-w-7 h-7 px-1.5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                      bl.isWicket
                        ? "bg-rose-500 text-white"
                        : bl.isMagicBall
                        ? "bg-purple-500 text-white"
                        : bl.isDeclare
                        ? "bg-amber-400/20 text-amber-300 border border-amber-400/50"
                        : "bg-slate-800 text-slate-200 border border-slate-700"
                    }`}
                  >
                    {tag}
                  </span>
                  {bl.overCompletedNow && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-300 border border-amber-400/30 text-[9px] font-black shrink-0">
                      {bl.completedOverNumber}ov |
                    </span>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Magic Ball Toggle Only (2nd player is selected when Out happens) */}
          <div className="bg-slate-900 rounded-2xl p-2 border border-slate-800">
            <button
              type="button"
              onClick={() => setMagicBallActive((prev) => !prev)}
              className={`w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-black border cursor-pointer ${
                magicBallActive
                  ? "bg-purple-500 text-white border-purple-300"
                  : "bg-slate-950 text-purple-300 border-slate-700 hover:bg-slate-800"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {magicBallActive
                  ? "Magic Ball ON (Double All, Out → 2nd Out)"
                  : "Magic Ball OFF"}
              </span>
            </button>
          </div>

          {/* Popup on 1 or 3 Runs: Simple Declare vs Run Buttons */}
          {pendingDeclareRuns !== null && (
            <div className="bg-slate-900 p-3 rounded-2xl border-2 border-amber-400 space-y-2 text-xs">
              <div className="flex items-center justify-between font-black text-amber-300">
                <span>{pendingDeclareRuns} Run — Declare की Run?</span>
                <button
                  type="button"
                  onClick={() => setPendingDeclareRuns(null)}
                  className="text-slate-400 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    commitBall(pendingDeclareRuns, "none", 0, true, false)
                  }
                  className="py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black cursor-pointer"
                >
                  Declare
                </button>
                <button
                  type="button"
                  onClick={() =>
                    commitBall(pendingDeclareRuns, "none", 0, false, true)
                  }
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 font-black cursor-pointer"
                >
                  Run
                </button>
              </div>
            </div>
          )}

          {/* Extras Sheets: Wide / NB / Bye / LB */}
          {(activeSheet === "extras_wd" ||
            activeSheet === "extras_nb" ||
            activeSheet === "extras_bye" ||
            activeSheet === "extras_lb") && (
            <div className="bg-slate-900 p-2.5 rounded-2xl border border-amber-400/50 space-y-2">
              <div className="flex items-center justify-between text-xs font-black text-amber-300">
                <span>
                  {activeSheet === "extras_wd"
                    ? "Wide Runs निवडा"
                    : activeSheet === "extras_nb"
                    ? "No Ball (NB) Runs निवडा"
                    : activeSheet === "extras_bye"
                    ? "Bye Runs निवडा"
                    : "Leg Bye (LB) Runs निवडा"}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveSheet(null)}
                  className="text-slate-400 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {activeSheet === "extras_wd" && (
                <div className="grid grid-cols-6 gap-1.5 text-xs font-black">
                  {[0, 1, 2, 3, 4, 6].map((extraAdd) => (
                    <button
                      key={extraAdd}
                      type="button"
                      onClick={() =>
                        commitBall(
                          0,
                          "wd",
                          1 + extraAdd,
                          false,
                          extraAdd % 2 === 1
                        )
                      }
                      className="py-2 rounded-lg bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-amber-300 cursor-pointer"
                    >
                      {extraAdd === 0 ? "Wd" : `Wd+${extraAdd}`}
                    </button>
                  ))}
                </div>
              )}

              {activeSheet === "extras_nb" && (
                <div className="grid grid-cols-6 gap-1.5 text-xs font-black">
                  {[0, 1, 2, 3, 4, 6].map((batAdd) => (
                    <button
                      key={batAdd}
                      type="button"
                      onClick={() =>
                        commitBall(batAdd, "nb", 1, false, batAdd % 2 === 1)
                      }
                      className="py-2 rounded-lg bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-amber-300 cursor-pointer"
                    >
                      {batAdd === 0 ? "NB" : `NB+${batAdd}`}
                    </button>
                  ))}
                </div>
              )}

              {(activeSheet === "extras_bye" || activeSheet === "extras_lb") && (
                <div className="grid grid-cols-5 gap-1.5 text-xs font-black">
                  {[1, 2, 3, 4, 6].map((bRuns) => {
                    const isBye = activeSheet === "extras_bye";
                    return (
                      <button
                        key={bRuns}
                        type="button"
                        onClick={() =>
                          commitBall(
                            0,
                            isBye ? "bye" : "lb",
                            bRuns,
                            false,
                            bRuns % 2 === 1
                          )
                        }
                        className="py-2 rounded-lg bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-white cursor-pointer"
                      >
                        {isBye ? `${bRuns}B` : `${bRuns}LB`}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Sub-Sheets for More / Bonus / Wicket */}
          {activeSheet === "more" && (
            <div className="bg-slate-900 p-2.5 rounded-2xl border border-slate-700 space-y-1.5 text-xs">
              <div className="flex items-center justify-between font-black text-amber-300">
                <span>More Options</span>
                <button
                  type="button"
                  onClick={() => setActiveSheet(null)}
                  className="cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveSheet("bonus")}
                  className="py-2 rounded-lg bg-slate-800 text-amber-300 font-black cursor-pointer"
                >
                  Bonus Runs (+ / -)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    declareMatchInnings(match.id);
                    setActiveSheet(null);
                    reloadMatchData();
                  }}
                  className="py-2 rounded-lg bg-slate-800 text-white font-black cursor-pointer"
                >
                  Declare Innings
                </button>
                <button
                  type="button"
                  onClick={() => {
                    startNextInnings(match.id);
                    setActiveSheet(null);
                    reloadMatchData();
                  }}
                  className="py-2 rounded-lg bg-amber-400 text-slate-950 font-black cursor-pointer col-span-2"
                >
                  Next Innings
                </button>
              </div>
            </div>
          )}

          {activeSheet === "bonus" && (
            <div className="bg-slate-900 p-2.5 rounded-2xl border border-amber-400/40 space-y-2">
              <div className="flex items-center justify-between text-xs font-black text-amber-300">
                <span>Bonus / Penalty Runs</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setBonusSign(1)}
                    className={`w-6 h-6 rounded font-black cursor-pointer ${
                      bonusSign === 1
                        ? "bg-amber-400 text-slate-950"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => setBonusSign(-1)}
                    className={`w-6 h-6 rounded font-black cursor-pointer ${
                      bonusSign === -1
                        ? "bg-rose-500 text-white"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSheet(null)}
                    className="cursor-pointer ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {BONUS_RUN_OPTIONS.map((bVal) => (
                  <button
                    key={bVal}
                    type="button"
                    onClick={() => handleAdjustRuns(bVal)}
                    className="py-1.5 rounded-lg bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-xs font-black cursor-pointer"
                  >
                    {bonusSign > 0 ? `+${bVal}` : `-${bVal}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeSheet === "wicket" && (
            <div className="bg-slate-900 p-2.5 rounded-2xl border border-rose-500/40 space-y-2">
              <div className="flex items-center justify-between text-xs font-black text-rose-400">
                <span>Wicket Type</span>
                <button
                  type="button"
                  onClick={() => setActiveSheet(null)}
                  className="cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {WICKET_TYPES.map((wt) => (
                  <button
                    key={wt}
                    type="button"
                    onClick={() => handleWicketBall(wt)}
                    className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-rose-500 hover:text-white text-[11px] font-bold text-left truncate cursor-pointer"
                  >
                    {wt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 5-Column Finger-Tip Keypad */}
          <div className="bg-amber-400 text-slate-950 rounded-2xl overflow-hidden border border-amber-300 grid grid-cols-5 divide-x divide-y divide-amber-500/40 text-xs font-black">
            {[1, 2, 3, 4, 6].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => handleRunButtonClick(r)}
                className="py-3 hover:bg-amber-300 cursor-pointer"
              >
                {r}
              </button>
            ))}

            <button
              type="button"
              onClick={() =>
                setActiveSheet((prev) =>
                  prev === "extras_lb" ? null : "extras_lb"
                )
              }
              className="py-3 hover:bg-amber-300 cursor-pointer"
            >
              LB
            </button>
            <button
              type="button"
              onClick={() =>
                setActiveSheet((prev) =>
                  prev === "extras_bye" ? null : "extras_bye"
                )
              }
              className="py-3 hover:bg-amber-300 cursor-pointer"
            >
              Bye
            </button>
            <button
              type="button"
              onClick={() =>
                setActiveSheet((prev) =>
                  prev === "extras_wd" ? null : "extras_wd"
                )
              }
              className="py-3 hover:bg-amber-300 cursor-pointer"
            >
              Wide
            </button>
            <button
              type="button"
              onClick={() =>
                setActiveSheet((prev) =>
                  prev === "extras_nb" ? null : "extras_nb"
                )
              }
              className="py-3 hover:bg-amber-300 cursor-pointer"
            >
              NB
            </button>
            <button
              type="button"
              onClick={() => commitBall(0, "none", 0, false, false)}
              className="py-3 hover:bg-amber-300 cursor-pointer"
            >
              0
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveSheet((prev) => (prev === "more" ? null : "more"))
              }
              className="py-3 hover:bg-amber-300 cursor-pointer"
            >
              More
            </button>
            <button
              type="button"
              onClick={() => {
                setBonusSign(1);
                setActiveSheet("bonus");
              }}
              className="py-3 hover:bg-amber-300 cursor-pointer"
            >
              Bonus
            </button>
            <button
              type="button"
              onClick={() => commitBall(1, "none", 0, false, true)}
              className="py-3 hover:bg-amber-300 cursor-pointer"
            >
              Ov.Thrw
            </button>
            <button
              type="button"
              onClick={handleUndo}
              className="py-3 hover:bg-amber-300 cursor-pointer"
            >
              Undo
            </button>
            <button
              type="button"
              onClick={() =>
                setActiveSheet((prev) => (prev === "wicket" ? null : "wicket"))
              }
              className="py-3 bg-rose-600 text-white hover:bg-rose-500 cursor-pointer"
            >
              Out
            </button>
          </div>
        </div>
      )}

      {/* SCORECARD TAB */}
      {centreTab === "scorecard" && (
        <div className="bg-slate-900 rounded-2xl p-3.5 border border-slate-800 space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setScorecardSide("A")}
              className={`py-1.5 rounded-lg text-[11px] font-black truncate cursor-pointer ${
                scorecardSide === "A"
                  ? "bg-amber-400 text-slate-950"
                  : "text-slate-300"
              }`}
            >
              {teamA?.name || "Team 1"}
            </button>
            <button
              type="button"
              onClick={() => setScorecardSide("B")}
              className={`py-1.5 rounded-lg text-[11px] font-black truncate cursor-pointer ${
                scorecardSide === "B"
                  ? "bg-amber-400 text-slate-950"
                  : "text-slate-300"
              }`}
            >
              {teamB?.name || "Team 2"}
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="grid grid-cols-7 text-[11px] font-black text-amber-300 border-b border-slate-800 pb-1">
              <span className="col-span-2">Batsman</span>
              <span className="text-right">R</span>
              <span className="text-right">B</span>
              <span className="text-right">4s</span>
              <span className="text-right">6s</span>
              <span className="text-right">SR</span>
            </div>

            {battedPlayers.length > 0 ? (
              battedPlayers.map((pl) => {
                const st = currentInn.playerStats[pl.id] || {
                  runs: 0,
                  balls: 0,
                  fours: 0,
                  sixes: 0,
                  out: false,
                  dismissalText: ""
                };
                const isActiveBatter =
                  currentInn.battingTeamId === activeScorecardTeam?.id &&
                  (pl.id === currentInn.strikerId ||
                    pl.id === currentInn.nonStrikerId);
                const statusSub = st.out
                  ? st.dismissalText || "out"
                  : isActiveBatter
                  ? "batting"
                  : "not out";

                return (
                  <div
                    key={pl.id}
                    className="grid grid-cols-7 items-center py-1.5 border-b border-slate-800/60"
                  >
                    <div className="col-span-2 min-w-0 pr-1">
                      <div className="font-black text-white truncate">
                        {pl.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {statusSub}
                      </div>
                    </div>
                    <span className="text-right font-black text-white">
                      {st.runs}
                    </span>
                    <span className="text-right text-slate-300">
                      {st.balls}
                    </span>
                    <span className="text-right text-slate-300">
                      {st.fours}
                    </span>
                    <span className="text-right text-slate-300">
                      {st.sixes}
                    </span>
                    <span className="text-right font-mono text-slate-300">
                      {calcSr(st)}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="text-slate-400 py-2">
                या संघाची फलंदाजी अद्याप सुरू झालेली नाही.
              </div>
            )}
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">Extras</span>
              <span className="font-bold text-slate-200">
                {Math.max(
                  0,
                  Number(currentInn.runs || 0) -
                    Object.values(currentInn.playerStats || {}).reduce(
                      (acc, s) => acc + Number(s.runs || 0),
                      0
                    )
                )}
              </span>
            </div>
            <div className="flex justify-between font-black">
              <span className="text-amber-300">Total</span>
              <span className="text-white">
                {currentInn.runs}/{currentInn.wickets}
              </span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>
                Overs: {formatOversFromBalls(currentInn.legalBalls, bpo)}
              </span>
              <span>Run Rate: {runRateVal}</span>
            </div>
          </div>

          {yetToBatPlayers.length > 0 && (
            <div className="text-[11px] text-slate-400">
              <strong className="text-slate-200">Yet To Bat:</strong>{" "}
              {yetToBatPlayers.map((p) => p.name).join(", ")}
            </div>
          )}

          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <div className="grid grid-cols-7 text-[11px] font-black text-amber-300 border-b border-slate-800 pb-1">
              <span className="col-span-2">Bowler</span>
              <span className="text-right">O</span>
              <span className="text-right">M</span>
              <span className="text-right">R</span>
              <span className="text-right">W</span>
              <span className="text-right">Eco</span>
            </div>

            {Object.entries(currentInn.playerStats || {})
              .filter(([, st]) => Number(st.ballsBowled || 0) > 0)
              .map(([pid, st]) => (
                <div
                  key={pid}
                  className="grid grid-cols-7 items-center py-1.5 border-b border-slate-800/60"
                >
                  <span className="col-span-2 font-bold text-white truncate">
                    {playerMap[pid]?.name || pid}
                  </span>
                  <span className="text-right font-mono text-slate-300">
                    {formatOversFromBalls(st.ballsBowled, bpo)}
                  </span>
                  <span className="text-right text-slate-400">0</span>
                  <span className="text-right text-slate-300">
                    {st.runsConceded}
                  </span>
                  <span className="text-right font-black text-amber-300">
                    {st.wickets}
                  </span>
                  <span className="text-right font-mono text-slate-300">
                    {calcEco(st)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* BALLS TAB */}
      {centreTab === "balls" && (
        <div className="bg-slate-900 rounded-2xl p-3.5 border border-slate-800 space-y-2 text-xs">
          <div className="font-black text-amber-300">
            Ball-by-Ball Score ({onlyBalls.length} Balls)
          </div>
          {ballsFeedItems.length > 0 ? (
            <div className="space-y-2 max-h-[28rem] overflow-y-auto">
              {[...ballsFeedItems].reverse().map((item) => {
                if (item.type === "over_summary") {
                  return (
                    <div
                      key={item.id}
                      className="bg-slate-950 p-3 rounded-2xl border border-amber-400/40 space-y-2"
                    >
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.balls.map((ob) => {
                          const oTag = ob.isWicket
                            ? ob.isMagicBall
                              ? "2W"
                              : "W"
                            : ob.extrasType === "wd"
                            ? "Wd"
                            : ob.extrasType === "nb"
                            ? "NB"
                            : ob.extrasType === "bye"
                            ? "B"
                            : ob.extrasType === "lb"
                            ? "LB"
                            : `${ob.runs}`;
                          return (
                            <span
                              key={ob.id}
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                                ob.isWicket
                                  ? "bg-rose-500 text-white"
                                  : "bg-slate-800 text-slate-200 border border-slate-700"
                              }`}
                            >
                              {oTag}
                            </span>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-200 border-t border-slate-800 pt-1.5">
                        <span className="font-bold truncate">
                          {item.strikerName}
                        </span>
                        <span className="font-black text-white">
                          Bowler: {item.bowlerName}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 text-[11px] font-black pt-1 border-t border-slate-800/80">
                        <span className="text-amber-300">
                          Overs {item.overNumber}
                        </span>
                        <span className="text-center text-white">
                          Runs {item.overRuns}
                        </span>
                        <span className="text-right text-amber-400">
                          Score {item.scoreAtEnd}
                        </span>
                      </div>
                    </div>
                  );
                }

                const desc = item.isWicket
                  ? `${item.wicketType || "Wicket"}${
                      item.isMagicBall ? " (2W Magic)" : ""
                    }`
                  : item.extrasType === "nb"
                  ? `NB +${item.effExt + item.effBat}${
                      item.isMagicBall ? " (Magic)" : ""
                    }`
                  : item.extrasType !== "none"
                  ? `${item.extrasType.toUpperCase()} +${item.effExt}${
                      item.isMagicBall ? " (Magic)" : ""
                    }`
                  : `${item.effBat} Run${item.effBat === 1 ? "" : "s"}${
                      item.isDeclare ? " • Declare" : ""
                    }${item.isMagicBall ? " • Magic" : ""}`;

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 bg-slate-950/70 px-3 py-2 rounded-xl border border-slate-800"
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-[11px] font-black text-amber-300">
                        {item.oversAfter} • {desc}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {playerMap[item.bowlerId]?.name || "Bowler"} →{" "}
                        {playerMap[item.strikerId]?.name || "Batter"}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-white">
                        {item.scoreAfter}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        ({item.oversAfter})
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400">
              अद्याप कोणताही चेंडू नोंदवलेला नाही.
            </div>
          )}
        </div>
      )}

      {/* STATS / SUPER STATS / INFO TABS */}
      {(centreTab === "stats" ||
        centreTab === "super_stats" ||
        centreTab === "info") && (
        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-2 text-xs">
          <div className="font-black text-amber-300 uppercase">
            {centreTab.replace("_", " ")}
          </div>
          <div className="text-slate-300 space-y-1">
            <div>Tournament: {match.tournamentName}</div>
            <div>
              Batting: {battingTeam?.name || "Team A"} • Bowling:{" "}
              {bowlingTeam?.name || "Team B"}
            </div>
            <div>
              Format:{" "}
              {match.format === MATCH_FORMATS.TEST ? "Test" : "One Day"} •
              Overs: {match.overs} • Balls/Over: {bpo} • Players:{" "}
              {match.playersPerSide}
            </div>
            {match.venue && <div>Venue: {match.venue}</div>}
          </div>
        </div>
      )}
    </div>
  );
}