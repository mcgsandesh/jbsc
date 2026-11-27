// src/services/scoringLocalEngine.js
import {
  MATCH_FORMATS,
  calculateSingleBallImpact,
  computeNextStrikeAfterBall,
  formatOversFromBalls
} from "./matchRulesHelper";

export { MATCH_FORMATS, formatOversFromBalls };

// === SECTION 01: STORAGE, CONSTANTS & UTILITIES START ===
const STORAGE_KEYS = {
  TOURNAMENTS: "jbsc_score_tournaments_v1",
  TEAMS: "jbsc_score_teams_v1",
  PLAYERS: "jbsc_score_players_v1",
  MATCHES: "jbsc_score_matches_v1"
};

export const MATCH_TITLES = [
  "Match",
  "Series Match",
  "Knockout",
  "Qualifier",
  "Eliminator",
  "Quarter Final",
  "Semi Final",
  "Final"
];

function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

function readList(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeList(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(Array.isArray(list) ? list : []));
  } catch (err) {
    console.warn("localStorage write failed:", err);
  }
}
// === SECTION 01: STORAGE, CONSTANTS & UTILITIES END ===

// === SECTION 02: TOURNAMENTS & GROUP POINTS CONFIG START ===
export function getTournaments() {
  return readList(STORAGE_KEYS.TOURNAMENTS);
}

export function createTournament(input = {}) {
  const list = getTournaments();
  const mode = input.mode === "single" ? "single" : "league";
  const format =
    input.format === MATCH_FORMATS.TEST
      ? MATCH_FORMATS.TEST
      : MATCH_FORMATS.ONE_DAY;

  const defaultGroups =
    mode === "league"
      ? Array.isArray(input.groups) && input.groups.length > 0
        ? input.groups
        : ["Group A", "Group B"]
      : [];

  const initialGroupTeams = {};
  const initialGroupPointsConfig = {};

  defaultGroups.forEach((g) => {
    initialGroupTeams[g] = Array.isArray(input.groupTeams?.[g])
      ? input.groupTeams[g]
      : [];
    initialGroupPointsConfig[g] = {
      winPoints: Number(
        input.groupPointsConfig?.[g]?.winPoints ?? input.pointsConfig?.win ?? 2
      ),
      lossPoints: Number(
        input.groupPointsConfig?.[g]?.lossPoints ?? input.pointsConfig?.loss ?? 0
      ),
      tiePoints: Number(
        input.groupPointsConfig?.[g]?.tiePoints ?? input.pointsConfig?.tie ?? 1
      )
    };
  });

  const tournament = {
    id: uid("trn"),
    name: String(input.name || "").trim(),
    club: String(input.club || "JBSC").trim(),
    season: String(input.season || "2026").trim(),
    startDate: String(input.startDate || "").trim(),
    endDate: String(input.endDate || "").trim(),
    bannerUrl: String(input.bannerUrl || "").trim(),
    mode,
    format,
    groups: defaultGroups,
    groupTeams: initialGroupTeams,
    groupPointsConfig: initialGroupPointsConfig,
    tournamentTeamIds: Array.isArray(input.tournamentTeamIds)
      ? input.tournamentTeamIds
      : [],
    pointsConfig: {
      win: Number(input.pointsConfig?.win ?? 2),
      tie: Number(input.pointsConfig?.tie ?? 1),
      noResult: Number(input.pointsConfig?.noResult ?? 1),
      loss: Number(input.pointsConfig?.loss ?? 0)
    },
    createdAt: new Date().toISOString()
  };

  writeList(STORAGE_KEYS.TOURNAMENTS, [tournament, ...list]);
  return tournament;
}

export function updateTournament(tournamentId, patch = {}) {
  const list = getTournaments();
  let updatedItem = null;
  const next = list.map((t) => {
    if (t.id !== tournamentId) return t;
    updatedItem = {
      ...t,
      ...patch,
      format:
        patch.format === MATCH_FORMATS.TEST
          ? MATCH_FORMATS.TEST
          : patch.format === MATCH_FORMATS.ONE_DAY
          ? MATCH_FORMATS.ONE_DAY
          : t.format || MATCH_FORMATS.ONE_DAY,
      groupPointsConfig: {
        ...(t.groupPointsConfig || {}),
        ...(patch.groupPointsConfig || {})
      },
      pointsConfig: {
        ...(t.pointsConfig || { win: 2, tie: 1, noResult: 1, loss: 0 }),
        ...(patch.pointsConfig || {})
      },
      updatedAt: new Date().toISOString()
    };
    return updatedItem;
  });
  writeList(STORAGE_KEYS.TOURNAMENTS, next);
  return updatedItem;
}

export function deleteTournament(tournamentId) {
  writeList(
    STORAGE_KEYS.TOURNAMENTS,
    getTournaments().filter((t) => t.id !== tournamentId)
  );
}

export function addTournamentGroup(tournamentId, groupName, pointsCfg = null) {
  const clean = String(groupName || "").trim();
  const t = getTournaments().find((item) => item.id === tournamentId);
  if (!t || !clean) return t;

  const groups = Array.from(new Set([...(t.groups || []), clean]));
  const groupTeams = {
    ...(t.groupTeams || {}),
    [clean]: Array.isArray(t.groupTeams?.[clean]) ? t.groupTeams[clean] : []
  };
  const groupPointsConfig = {
    ...(t.groupPointsConfig || {}),
    [clean]: {
      winPoints: Number(
        pointsCfg?.winPoints ??
          t.groupPointsConfig?.[clean]?.winPoints ??
          t.pointsConfig?.win ??
          2
      ),
      lossPoints: Number(
        pointsCfg?.lossPoints ??
          t.groupPointsConfig?.[clean]?.lossPoints ??
          t.pointsConfig?.loss ??
          0
      ),
      tiePoints: Number(
        pointsCfg?.tiePoints ??
          t.groupPointsConfig?.[clean]?.tiePoints ??
          t.pointsConfig?.tie ??
          1
      )
    }
  };

  return updateTournament(tournamentId, {
    groups,
    groupTeams,
    groupPointsConfig
  });
}

export function setGroupPointsConfig(tournamentId, groupName, config = {}) {
  const clean = String(groupName || "").trim();
  const t = getTournaments().find((item) => item.id === tournamentId);
  if (!t || !clean) return t;

  const prev = t.groupPointsConfig?.[clean] || {};
  const nextGroupPointsConfig = {
    ...(t.groupPointsConfig || {}),
    [clean]: {
      winPoints: Number(
        config.winPoints ?? prev.winPoints ?? t.pointsConfig?.win ?? 2
      ),
      lossPoints: Number(
        config.lossPoints ?? prev.lossPoints ?? t.pointsConfig?.loss ?? 0
      ),
      tiePoints: Number(
        config.tiePoints ?? prev.tiePoints ?? t.pointsConfig?.tie ?? 1
      )
    }
  };

  return updateTournament(tournamentId, {
    groupPointsConfig: nextGroupPointsConfig
  });
}

export function addTeamToTournament(tournamentId, teamId, groupName = "") {
  const t = getTournaments().find((item) => item.id === tournamentId);
  if (!t || !teamId) return t;

  const tournamentTeamIds = Array.from(
    new Set([...(t.tournamentTeamIds || []), teamId])
  );
  const nextPatch = { tournamentTeamIds };

  if (groupName) {
    const groups = Array.from(new Set([...(t.groups || []), groupName]));
    const currentGroupList = t.groupTeams?.[groupName] || [];
    nextPatch.groups = groups;
    nextPatch.groupTeams = {
      ...(t.groupTeams || {}),
      [groupName]: Array.from(new Set([...currentGroupList, teamId]))
    };
  }

  return updateTournament(tournamentId, nextPatch);
}

export function removeTeamFromTournament(tournamentId, teamId, groupName = "") {
  const t = getTournaments().find((item) => item.id === tournamentId);
  if (!t || !teamId) return t;

  if (groupName) {
    const nextGroupTeams = {
      ...(t.groupTeams || {}),
      [groupName]: (t.groupTeams?.[groupName] || []).filter(
        (id) => id !== teamId
      )
    };
    return updateTournament(tournamentId, { groupTeams: nextGroupTeams });
  }

  const tournamentTeamIds = (t.tournamentTeamIds || []).filter(
    (id) => id !== teamId
  );
  const cleanedGroups = {};
  Object.entries(t.groupTeams || {}).forEach(([g, ids]) => {
    cleanedGroups[g] = (ids || []).filter((id) => id !== teamId);
  });

  return updateTournament(tournamentId, {
    tournamentTeamIds,
    groupTeams: cleanedGroups
  });
}
// === SECTION 02: TOURNAMENT & GROUP POINTS CONFIG END ===

// === SECTION 03: TEAMS & PLAYERS MANAGEMENT START ===
export function getTeams() {
  return readList(STORAGE_KEYS.TEAMS);
}

export function createTeam(input = {}) {
  const list = getTeams();
  const seq = list.length + 101;
  const team = {
    id: uid("tm"),
    teamCode: String(input.teamCode || `TM-${seq}`).trim(),
    shortName: String(input.shortName || "").trim().toUpperCase(),
    name: String(input.name || "").trim(),
    place: String(input.place || "").trim(),
    logoUrl: String(input.logoUrl || "").trim(),
    club: String(input.club || "").trim(),
    slogan: String(input.slogan || "").trim(),
    squadRoster: input.squadRoster || {},
    createdAt: new Date().toISOString()
  };
  writeList(STORAGE_KEYS.TEAMS, [team, ...list]);
  return team;
}

export function updateTeam(teamId, patch = {}) {
  const list = getTeams();
  let updated = null;
  const next = list.map((tm) => {
    if (tm.id !== teamId) return tm;
    updated = {
      ...tm,
      ...patch,
      updatedAt: new Date().toISOString()
    };
    return updated;
  });
  writeList(STORAGE_KEYS.TEAMS, next);
  return updated;
}

export function deleteTeam(teamId) {
  writeList(
    STORAGE_KEYS.TEAMS,
    getTeams().filter((tm) => tm.id !== teamId)
  );
}

export function getPlayers() {
  return readList(STORAGE_KEYS.PLAYERS);
}

export function createPlayer(input = {}) {
  const list = getPlayers();
  const cleanName = String(input.name || "").trim();
  const cleanMobile = String(input.mobile || "")
    .replace(/\D/g, "")
    .slice(-10);
  const incomingCode = String(input.playerCode || "")
    .trim()
    .toUpperCase();

  const existing = list.find((p) => {
    const pCode = String(p.playerCode || "").trim().toUpperCase();
    const pMob = String(p.mobile || "").replace(/\D/g, "").slice(-10);
    const pName = String(p.name || "").trim().toLowerCase();

    if (incomingCode && pCode === incomingCode) return true;
    if (cleanMobile.length === 10 && pMob === cleanMobile) return true;
    if (cleanName && pName === cleanName.toLowerCase()) return true;
    return false;
  });

  if (existing) return existing;

  const seq = list.length + 101;
  const player = {
    id: uid("pl"),
    playerCode: incomingCode || `PL-${seq}`,
    name: cleanName,
    mobile: cleanMobile,
    role: String(input.role || "All-rounder").trim(),
    photoUrl: String(input.photoUrl || "").trim(),
    createdAt: new Date().toISOString()
  };
  writeList(STORAGE_KEYS.PLAYERS, [player, ...list]);
  return player;
}

export function addPlayerToTeam(teamId, playerId, lineStatus = "playing") {
  const tm = getTeams().find((t) => t.id === teamId);
  if (!tm || !playerId) return tm;

  const roster = {
    ...(tm.squadRoster || {}),
    [playerId]: { status: lineStatus === "bench" ? "bench" : "playing" }
  };
  return updateTeam(teamId, { squadRoster: roster });
}

export function removePlayerFromTeam(teamId, playerId) {
  const tm = getTeams().find((t) => t.id === teamId);
  if (!tm || !playerId) return tm;

  const nextRoster = { ...(tm.squadRoster || {}) };
  delete nextRoster[playerId];
  return updateTeam(teamId, { squadRoster: nextRoster });
}

export function setTeamPlayerLineStatus(teamId, playerId, lineStatus) {
  const tm = getTeams().find((t) => t.id === teamId);
  if (!tm || !playerId) return tm;

  const roster = {
    ...(tm.squadRoster || {}),
    [playerId]: { status: lineStatus === "bench" ? "bench" : "playing" }
  };
  return updateTeam(teamId, { squadRoster: roster });
}
// === SECTION 03: TEAMS & PLAYERS MANAGEMENT END ===

// === SECTION 04: EMPTY INNINGS FACTORY START ===
function createEmptyInnings(
  inningsNumber,
  battingTeamId,
  bowlingTeamId,
  isSuperOver = false
) {
  return {
    inningsNumber,
    isSuperOver: Boolean(isSuperOver),
    battingTeamId,
    bowlingTeamId,
    runs: 0,
    wickets: 0,
    legalBalls: 0,
    bonusRuns: 0,
    declared: false,
    declaredRuns: null,
    balls: [],
    strikerId: "",
    nonStrikerId: "",
    bowlerId: "",
    playerStats: {},
    outPlayerIds: []
  };
}
// === SECTION 04: EMPTY INNINGS FACTORY END ===

// === SECTION 05: MATCH FIXTURES & AUTO MATCH NUMBERING (Match 1, Match 2...) START ===
function resolveNextMatchNumber(input, existingMatches = [], existingMatchObj = null) {
  const explicitNum = Number(
    input.matchNumber ??
      input.matchNo ??
      existingMatchObj?.matchNumber ??
      existingMatchObj?.matchNo ??
      0
  );
  if (explicitNum > 0) return explicitNum;

  const targetTourId =
    input.tournamentId || existingMatchObj?.tournamentId || "";
  const targetId = input.id || existingMatchObj?.id || "";

  const sameTournamentMatches = (Array.isArray(existingMatches) ? existingMatches : []).filter(
    (m) => m && m.id !== targetId && (m.tournamentId || "") === targetTourId
  );

  const highestNum = sameTournamentMatches.reduce((maxVal, m) => {
    const n = Number(m.matchNumber ?? m.matchNo ?? 0);
    return n > maxVal ? n : maxVal;
  }, 0);

  return Math.max(sameTournamentMatches.length + 1, highestNum + 1);
}

export function getMatches() {
  const rawList = readList(STORAGE_KEYS.MATCHES);
  const perTourneyCounter = {};

  return rawList.map((m) => {
    const tKey = m?.tournamentId || "__standalone__";
    perTourneyCounter[tKey] = (perTourneyCounter[tKey] || 0) + 1;
    const num = Number(m?.matchNumber ?? m?.matchNo ?? 0) || perTourneyCounter[tKey];
    return {
      ...m,
      matchNumber: num,
      matchLabel: m?.matchLabel || `Match ${num}`
    };
  });
}

export function saveMatchFixture(input = {}) {
  const matches = getMatches();
  const existingMatchObj = input.id
    ? matches.find((m) => m.id === input.id) || null
    : null;

  const tournament = input.tournamentId
    ? getTournaments().find((t) => t.id === input.tournamentId)
    : null;

  const format =
    tournament?.format ||
    (input.format === MATCH_FORMATS.TEST
      ? MATCH_FORMATS.TEST
      : MATCH_FORMATS.ONE_DAY);

  const ballsPerOver = Math.max(1, Number(input.ballsPerOver || 6));
  const overs = Math.max(
    1,
    Number(input.overs || (format === MATCH_FORMATS.TEST ? 90 : 6))
  );
  const playersPerSide = Math.max(2, Number(input.playersPerSide || 11));

  const teamAId = input.teamAId || "";
  const teamBId = input.teamBId || "";

  const firstInnings = createEmptyInnings(1, teamAId, teamBId, false);
  const matchNumber = resolveNextMatchNumber(input, matches, existingMatchObj);

  const match = {
    id: input.id || uid("mt"),
    matchNumber,
    matchLabel: `Match ${matchNumber}`,
    tournamentId: tournament?.id || input.tournamentId || "",
    tournamentName:
      tournament?.name || input.tournamentName || "Standalone Match",
    season: tournament?.season || input.season || "2026",
    matchCategory:
      input.matchCategory === "other" ? "other" : "points_table",
    groupName: String(input.groupName || "").trim(),
    matchTitle: String(input.matchTitle || "Match").trim(),
    format,
    teamAId,
    teamBId,
    venue: String(input.venue || "").trim(),
    date: String(input.date || "").trim(),
    time: String(input.time || "").trim(),
    overs,
    ballsPerOver,
    countWideAsBall: Boolean(input.countWideAsBall ?? false),
    countNoBallAsBall: Boolean(input.countNoBallAsBall ?? false),
    playersPerSide,
    scorerName: String(input.scorerName || "").trim(),
    status: input.status || "scheduled",
    toss: input.toss || { wonByTeamId: "", decision: "" },
    activeInningsIndex:
      typeof input.activeInningsIndex === "number"
        ? input.activeInningsIndex
        : 0,
    innings: input.innings?.length ? input.innings : [firstInnings],
    resultText: input.resultText || "",
    winnerTeamId: input.winnerTeamId || "",
    isTied: Boolean(input.isTied ?? false),
    updatedAt: new Date().toISOString()
  };

  const exists = matches.some((m) => m.id === match.id);
  const nextMatches = exists
    ? matches.map((m) => (m.id === match.id ? match : m))
    : [match, ...matches];

  writeList(STORAGE_KEYS.MATCHES, nextMatches);
  return match;
}

export function deleteMatch(matchId) {
  writeList(
    STORAGE_KEYS.MATCHES,
    getMatches().filter((m) => m.id !== matchId)
  );
}

export function applyMatchToss(matchId, wonByTeamId, decision) {
  const matches = getMatches();
  const target = matches.find((m) => m.id === matchId);
  if (!target) return null;

  const cleanDecision = decision === "bowl" ? "bowl" : "bat";
  const otherTeamId =
    wonByTeamId === target.teamAId ? target.teamBId : target.teamAId;

  const battingFirstId = cleanDecision === "bat" ? wonByTeamId : otherTeamId;
  const bowlingFirstId =
    battingFirstId === target.teamAId ? target.teamBId : target.teamAId;

  const updatedMatch = {
    ...target,
    status: "live",
    toss: { wonByTeamId, decision: cleanDecision },
    activeInningsIndex: 0,
    innings: [createEmptyInnings(1, battingFirstId, bowlingFirstId, false)],
    updatedAt: new Date().toISOString()
  };

  writeList(
    STORAGE_KEYS.MATCHES,
    matches.map((m) => (m.id === matchId ? updatedMatch : m))
  );
  return updatedMatch;
}
// === SECTION 05: MATCH FIXTURES & AUTO MATCH NUMBERING (Match 1, Match 2...) END ===

// === SECTION 06: RECOMPUTE INNINGS, BALL RECORDING & UNDO START ===
export function recomputeInningsState(
  innings,
  ballsPerOver,
  countWideAsBall,
  countNoBallAsBall,
  playerMap = {}
) {
  let runs = Number(innings.bonusRuns || 0);
  let wickets = 0;
  let legalBalls = 0;
  const playerStats = {};
  const outPlayerIds = new Set();

  const ensureStat = (pid) => {
    if (!pid) return null;
    if (!playerStats[pid]) {
      playerStats[pid] = {
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        out: false,
        dismissalText: "",
        runsConceded: 0,
        maidens: 0,
        wickets: 0,
        ballsBowled: 0
      };
    }
    return playerStats[pid];
  };

  let currentStrikerId = innings.strikerId || "";
  let currentNonStrikerId = innings.nonStrikerId || "";
  const currentBowlerId = innings.bowlerId || "";
  const ballsList = Array.isArray(innings.balls) ? innings.balls : [];

  ballsList.forEach((b, idx) => {
    const isLastBall = idx === ballsList.length - 1;
    const imp = calculateSingleBallImpact(b, {
      countWideAsBall,
      countNoBallAsBall
    });

    runs += imp.totalRuns;
    wickets += imp.wicketsInc;
    legalBalls += imp.legalBallsInc;

    const runOutVictimId = b.runOutPlayerId || b.strikerId || "";
    const sStat = ensureStat(b.strikerId);
    const bStat = ensureStat(b.bowlerId);

    if (sStat) {
      if (imp.extType !== "wd") {
        sStat.balls +=
          imp.isMagic &&
          imp.extType === "none" &&
          imp.baseBat === 0 &&
          !b.isWicket
            ? 2
            : 1;
      }
      if (imp.extType === "none" || imp.extType === "nb") {
        sStat.runs += imp.effBat;
        if (imp.effBat === 4) sStat.fours += 1;
        if (imp.effBat === 6) sStat.sixes += 1;
      }
    }

    if (b.isWicket) {
      const bowlerName = playerMap?.[b.bowlerId]?.name || "";
      const fielderName = playerMap?.[b.fielderId]?.name || "";

      if (imp.isRunOut) {
        const roStat = ensureStat(runOutVictimId);
        if (roStat) {
          roStat.out = true;
          roStat.dismissalText = `run out (${imp.baseBat}r)${
            imp.isNoBall ? " NB" : ""
          }`;
        }
        if (runOutVictimId) outPlayerIds.add(runOutVictimId);
      } else if (b.strikerId && sStat) {
        sStat.out = true;
        if (imp.isMagic) {
          sStat.dismissalText = "out in magic";
        } else if (b.wicketType === "Caught" && fielderName) {
          sStat.dismissalText = bowlerName
            ? `c ${fielderName} b ${bowlerName}`
            : `c ${fielderName}`;
        } else if (b.wicketType === "Stumped" && fielderName) {
          sStat.dismissalText = bowlerName
            ? `st ${fielderName} b ${bowlerName}`
            : `st ${fielderName}`;
        } else {
          sStat.dismissalText = b.wicketType || "out";
        }
        outPlayerIds.add(b.strikerId);
      }
    }

    if (b.isWicket && imp.isMagic && b.magicTargetPlayerId) {
      const mStat = ensureStat(b.magicTargetPlayerId);
      if (mStat) {
        mStat.out = true;
        mStat.dismissalText = "out in magic";
        outPlayerIds.add(b.magicTargetPlayerId);
      }
    }

    if (bStat) {
      if (imp.extType !== "bye" && imp.extType !== "lb") {
        bStat.runsConceded += imp.totalRuns;
      }
      if (imp.legalBallsInc > 0) {
        bStat.ballsBowled += imp.legalBallsInc;
      }
      if (b.isWicket && !imp.isRunOut && !imp.isNoBall) {
        bStat.wickets += imp.wicketsInc;
      }
    }

    if (isLastBall) {
      const nextStrike = computeNextStrikeAfterBall(
        b,
        imp,
        legalBalls,
        ballsPerOver,
        currentStrikerId,
        currentNonStrikerId
      );
      currentStrikerId = nextStrike.strikerId;
      currentNonStrikerId = nextStrike.nonStrikerId;
    }
  });

  const finalOutIds = Array.from(outPlayerIds);
  if (finalOutIds.includes(currentStrikerId)) currentStrikerId = "";
  if (finalOutIds.includes(currentNonStrikerId)) currentNonStrikerId = "";

  return {
    ...innings,
    runs: Math.max(0, runs),
    wickets,
    legalBalls,
    strikerId: currentStrikerId,
    nonStrikerId: currentNonStrikerId,
    bowlerId: currentBowlerId,
    playerStats,
    outPlayerIds: finalOutIds
  };
}

export function recordMatchBall(matchId, ballInput = {}) {
  const matches = getMatches();
  const match = matches.find((m) => m.id === matchId);
  if (!match) return null;

  const idx = match.activeInningsIndex || 0;
  const currentInn = match.innings[idx];
  if (!currentInn || currentInn.declared) return match;

  const bpo = Math.max(1, Number(match.ballsPerOver || 6));
  const legalCount = Number(currentInn.legalBalls || 0);
  const overIndex = Math.floor(legalCount / bpo);
  const legalBallInOver = (legalCount % bpo) + 1;

  const newBall = {
    id: uid("bl"),
    overIndex,
    legalBallInOver,
    runs: Number(ballInput.runs || 0),
    extrasType: ballInput.extrasType || "none",
    extrasRuns: Number(ballInput.extrasRuns || 0),
    isNoBall: Boolean(ballInput.isNoBall || ballInput.extrasType === "nb"),
    isWicket: Boolean(ballInput.isWicket),
    isRunOut: Boolean(ballInput.isRunOut || ballInput.wicketType === "Run Out"),
    wicketType: ballInput.wicketType || "",
    fielderId: ballInput.fielderId || "",
    runOutPlayerId: ballInput.runOutPlayerId || "",
    runOutRunNumber: Number(ballInput.runOutRunNumber || 0),
    isMagicBall: Boolean(ballInput.isMagicBall),
    magicTargetPlayerId: ballInput.magicTargetPlayerId || "",
    isDeclare: Boolean(ballInput.isDeclare),
    ranBetweenWickets: Boolean(ballInput.ranBetweenWickets),
    strikerId: ballInput.strikerId || currentInn.strikerId || "",
    nonStrikerId: ballInput.nonStrikerId || currentInn.nonStrikerId || "",
    beforeBallStrikerId: currentInn.strikerId || "",
    beforeBallNonStrikerId: currentInn.nonStrikerId || "",
    bowlerId: ballInput.bowlerId || currentInn.bowlerId || "",
    timestamp: new Date().toISOString()
  };

  const recomputedInn = recomputeInningsState(
    { ...currentInn, balls: [...(currentInn.balls || []), newBall] },
    bpo,
    Boolean(match.countWideAsBall),
    Boolean(match.countNoBallAsBall)
  );

  const updatedMatch = {
    ...match,
    innings: match.innings.map((item, i) => (i === idx ? recomputedInn : item)),
    updatedAt: new Date().toISOString()
  };

  writeList(
    STORAGE_KEYS.MATCHES,
    matches.map((m) => (m.id === matchId ? updatedMatch : m))
  );
  return updatedMatch;
}

export function undoLastMatchBall(matchId) {
  const matches = getMatches();
  const match = matches.find((m) => m.id === matchId);
  if (!match) return null;

  const idx = match.activeInningsIndex || 0;
  const currentInn = match.innings[idx];
  if (!currentInn || !(currentInn.balls || []).length) return match;

  const lastBall = currentInn.balls[currentInn.balls.length - 1];
  const remainingBalls = currentInn.balls.slice(0, -1);

  const recomputedInn = recomputeInningsState(
    {
      ...currentInn,
      declared: false,
      declaredRuns: null,
      balls: remainingBalls,
      strikerId: lastBall?.beforeBallStrikerId || currentInn.strikerId || "",
      nonStrikerId:
        lastBall?.beforeBallNonStrikerId || currentInn.nonStrikerId || ""
    },
    Math.max(1, Number(match.ballsPerOver || 6)),
    Boolean(match.countWideAsBall),
    Boolean(match.countNoBallAsBall)
  );

  const restoredInn = {
    ...recomputedInn,
    strikerId: lastBall?.beforeBallStrikerId || recomputedInn.strikerId || "",
    nonStrikerId:
      lastBall?.beforeBallNonStrikerId || recomputedInn.nonStrikerId || ""
  };

  const updatedMatch = {
    ...match,
    status: "live",
    innings: match.innings.map((item, i) => (i === idx ? restoredInn : item)),
    updatedAt: new Date().toISOString()
  };

  writeList(
    STORAGE_KEYS.MATCHES,
    matches.map((m) => (m.id === matchId ? updatedMatch : m))
  );
  return updatedMatch;
}
// === SECTION 06: RECOMPUTE INNINGS, BALL RECORDING & UNDO END ===

// === SECTION 07: BONUS RUNS, SUPER OVER & INNINGS FLOW START ===
export function applyBonusRuns(matchId, signedDelta) {
  const matches = getMatches();
  const match = matches.find((m) => m.id === matchId);
  if (!match) return null;

  const idx = match.activeInningsIndex || 0;
  const currentInn = match.innings[idx];
  if (!currentInn) return match;

  const recomputedInn = recomputeInningsState(
    {
      ...currentInn,
      bonusRuns: Number(currentInn.bonusRuns || 0) + Number(signedDelta || 0)
    },
    Math.max(1, Number(match.ballsPerOver || 6)),
    Boolean(match.countWideAsBall),
    Boolean(match.countNoBallAsBall)
  );

  const updatedMatch = {
    ...match,
    innings: match.innings.map((inn, i) => (i === idx ? recomputedInn : inn)),
    updatedAt: new Date().toISOString()
  };

  writeList(
    STORAGE_KEYS.MATCHES,
    matches.map((m) => (m.id === matchId ? updatedMatch : m))
  );
  return updatedMatch;
}

export function startSuperOverInnings(matchId, forcedBatId = "", forcedBowlId = "") {
  const matches = getMatches();
  const match = matches.find((m) => m.id === matchId);
  if (!match) return null;

  const idx = match.activeInningsIndex || 0;
  const curr = match.innings[idx];
  if (!curr) return match;

  const batId = forcedBatId || curr.bowlingTeamId || match.teamBId;
  const bowlId =
    forcedBowlId || (batId === match.teamAId ? match.teamBId : match.teamAId);

  const superOverInn = createEmptyInnings(
    (match.innings?.length || 0) + 1,
    batId,
    bowlId,
    true
  );

  const nextInningsArr = [...(match.innings || []), superOverInn];
  const updatedMatch = {
    ...match,
    status: "live",
    winnerTeamId: "",
    isTied: false,
    overs: 1,
    activeInningsIndex: nextInningsArr.length - 1,
    innings: nextInningsArr,
    updatedAt: new Date().toISOString()
  };

  writeList(
    STORAGE_KEYS.MATCHES,
    matches.map((m) => (m.id === matchId ? updatedMatch : m))
  );
  return updatedMatch;
}

export function declareMatchInnings(matchId) {
  const matches = getMatches();
  const match = matches.find((m) => m.id === matchId);
  if (!match) return null;

  const idx = match.activeInningsIndex || 0;
  const currentInn = match.innings[idx];
  if (!currentInn) return match;

  const updatedMatch = {
    ...match,
    innings: match.innings.map((item, i) =>
      i === idx
        ? { ...item, declared: true, declaredRuns: Number(item.runs || 0) }
        : item
    ),
    updatedAt: new Date().toISOString()
  };

  writeList(
    STORAGE_KEYS.MATCHES,
    matches.map((m) => (m.id === matchId ? updatedMatch : m))
  );
  return updatedMatch;
}

export function startNextInnings(matchId) {
  const matches = getMatches();
  const match = matches.find((m) => m.id === matchId);
  if (!match) return null;

  const maxInnings = match.format === MATCH_FORMATS.TEST ? 4 : 2;
  const currentIdx = match.activeInningsIndex || 0;
  const nextNumber = currentIdx + 2;

  if (nextNumber > maxInnings) {
    const completed = {
      ...match,
      status: "completed",
      updatedAt: new Date().toISOString()
    };
    writeList(
      STORAGE_KEYS.MATCHES,
      matches.map((m) => (m.id === matchId ? completed : m))
    );
    return completed;
  }

  const prevInn = match.innings[currentIdx];
  const nextBattingId = prevInn?.bowlingTeamId || match.teamBId;
  const nextBowlingId = prevInn?.battingTeamId || match.teamAId;
  const nextInn = createEmptyInnings(
    nextNumber,
    nextBattingId,
    nextBowlingId,
    false
  );

  const updatedMatch = {
    ...match,
    status: "live",
    activeInningsIndex: match.innings.length,
    innings: [...match.innings, nextInn],
    updatedAt: new Date().toISOString()
  };

  writeList(
    STORAGE_KEYS.MATCHES,
    matches.map((m) => (m.id === matchId ? updatedMatch : m))
  );
  return updatedMatch;
}

export function setActiveBattersAndBowler(
  matchId,
  { strikerId, nonStrikerId, bowlerId }
) {
  const matches = getMatches();
  const match = matches.find((m) => m.id === matchId);
  if (!match) return null;

  const idx = match.activeInningsIndex || 0;
  const currentInn = match.innings[idx];
  if (!currentInn) return match;

  const outSet = new Set(currentInn.outPlayerIds || []);
  const safeStriker =
    strikerId !== undefined
      ? outSet.has(strikerId)
        ? ""
        : strikerId
      : currentInn.strikerId;
  const safeNonStriker =
    nonStrikerId !== undefined
      ? outSet.has(nonStrikerId)
        ? ""
        : nonStrikerId
      : currentInn.nonStrikerId;

  const updatedMatch = {
    ...match,
    innings: match.innings.map((item, i) =>
      i === idx
        ? {
            ...item,
            strikerId: safeStriker,
            nonStrikerId: safeNonStriker,
            bowlerId: bowlerId !== undefined ? bowlerId : item.bowlerId
          }
        : item
    ),
    updatedAt: new Date().toISOString()
  };

  writeList(
    STORAGE_KEYS.MATCHES,
    matches.map((m) => (m.id === matchId ? updatedMatch : m))
  );
  return updatedMatch;
}

export function swapOnFieldStrikers(matchId) {
  const matches = getMatches();
  const match = matches.find((m) => m.id === matchId);
  if (!match) return null;

  const idx = match.activeInningsIndex || 0;
  const currentInn = match.innings[idx];
  if (!currentInn) return match;

  return setActiveBattersAndBowler(matchId, {
    strikerId: currentInn.nonStrikerId,
    nonStrikerId: currentInn.strikerId,
    bowlerId: currentInn.bowlerId
  });
}
// === SECTION 07: BONUS RUNS, SUPER OVER & INNINGS FLOW END ===

// === SECTION 08: GROUP POINTS TABLE & NRR ENGINE START ===
function ballsToDecimalOvers(legalBalls, ballsPerOver = 6) {
  const bpo = Math.max(1, Number(ballsPerOver || 6));
  return Math.max(0, Number(legalBalls || 0)) / bpo;
}

export function computeGroupPointsTable(tournament, matches, teams) {
  if (!tournament) return {};

  const groups = Array.isArray(tournament.groups) ? tournament.groups : [];
  const teamMap = Object.fromEntries((teams || []).map((t) => [t.id, t]));
  const resultByGroup = {};

  groups.forEach((groupName) => {
    const grpCfg = tournament.groupPointsConfig?.[groupName] || {};
    const ptsWin = Number(
      grpCfg.winPoints ?? tournament.pointsConfig?.win ?? 2
    );
    const ptsTie = Number(
      grpCfg.tiePoints ?? tournament.pointsConfig?.tie ?? 1
    );
    const ptsNr = Number(tournament.pointsConfig?.noResult ?? 1);
    const ptsLoss = Number(
      grpCfg.lossPoints ?? tournament.pointsConfig?.loss ?? 0
    );

    const groupTeamIds = Array.isArray(tournament.groupTeams?.[groupName])
      ? tournament.groupTeams[groupName]
      : [];

    const tableRows = {};
    groupTeamIds.forEach((tid) => {
      const tm = teamMap[tid];
      tableRows[tid] = {
        teamId: tid,
        teamName: tm?.name || "Team",
        shortName: tm?.shortName || tm?.teamCode || "",
        logoUrl: tm?.logoUrl || "",
        played: 0,
        won: 0,
        lost: 0,
        tied: 0,
        noResult: 0,
        points: 0,
        runsFor: 0,
        ballsFaced: 0,
        runsAgainst: 0,
        ballsBowled: 0,
        nrr: 0
      };
    });

    const groupCompletedMatches = (matches || []).filter(
      (m) =>
        m.tournamentId === tournament.id &&
        m.groupName === groupName &&
        m.status === "completed"
    );

    groupCompletedMatches.forEach((m) => {
      const rowA = tableRows[m.teamAId];
      const rowB = tableRows[m.teamBId];
      if (!rowA && !rowB) return;

      const bpo = Math.max(1, Number(m.ballsPerOver || 6));
      const maxLegalBalls = Math.max(1, Number(m.overs || 6)) * bpo;

      const teamRuns = { [m.teamAId]: 0, [m.teamBId]: 0 };
      const teamBalls = { [m.teamAId]: 0, [m.teamBId]: 0 };

      (m.innings || []).forEach((inn) => {
        if (!inn?.battingTeamId) return;
        teamRuns[inn.battingTeamId] =
          (teamRuns[inn.battingTeamId] || 0) + Number(inn.runs || 0);
        const effectiveBalls =
          Number(inn.wickets || 0) >= Number(m.playersPerSide || 11) - 1
            ? maxLegalBalls
            : Number(inn.legalBalls || 0);
        teamBalls[inn.battingTeamId] =
          (teamBalls[inn.battingTeamId] || 0) + effectiveBalls;
      });

      if (rowA) {
        rowA.played += 1;
        rowA.runsFor += teamRuns[m.teamAId] || 0;
        rowA.ballsFaced += teamBalls[m.teamAId] || 0;
        rowA.runsAgainst += teamRuns[m.teamBId] || 0;
        rowA.ballsBowled += teamBalls[m.teamBId] || 0;
      }

      if (rowB) {
        rowB.played += 1;
        rowB.runsFor += teamRuns[m.teamBId] || 0;
        rowB.ballsFaced += teamBalls[m.teamBId] || 0;
        rowB.runsAgainst += teamRuns[m.teamAId] || 0;
        rowB.ballsBowled += teamBalls[m.teamAId] || 0;
      }

      if (!m.winnerTeamId) {
        if (rowA) {
          rowA.tied += 1;
          rowA.points += ptsTie;
        }
        if (rowB) {
          rowB.tied += 1;
          rowB.points += ptsTie;
        }
      } else if (m.winnerTeamId === m.teamAId) {
        if (rowA) {
          rowA.won += 1;
          rowA.points += ptsWin;
        }
        if (rowB) {
          rowB.lost += 1;
          rowB.points += ptsLoss;
        }
      } else if (m.winnerTeamId === m.teamBId) {
        if (rowB) {
          rowB.won += 1;
          rowB.points += ptsWin;
        }
        if (rowA) {
          rowA.lost += 1;
          rowA.points += ptsLoss;
        }
      } else {
        if (rowA) {
          rowA.noResult += 1;
          rowA.points += ptsNr;
        }
        if (rowB) {
          rowB.noResult += 1;
          rowB.points += ptsNr;
        }
      }

      [rowA, rowB].forEach((r) => {
        if (!r) return;
        const ovFor = ballsToDecimalOvers(r.ballsFaced, bpo);
        const ovAgainst = ballsToDecimalOvers(r.ballsBowled, bpo);
        const rrFor = ovFor > 0 ? r.runsFor / ovFor : 0;
        const rrAgainst = ovAgainst > 0 ? r.runsAgainst / ovAgainst : 0;
        r.nrr = Number((rrFor - rrAgainst).toFixed(3));
      });
    });

    resultByGroup[groupName] = Object.values(tableRows).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.nrr !== a.nrr) return b.nrr - a.nrr;
      return b.runsFor - a.runsFor;
    });
  });

  return resultByGroup;
}
// === SECTION 08: GROUP POINTS TABLE & NRR ENGINE END ===

// === SECTION 09: TOURNAMENT PLAYER STATS START ===
export function computeTournamentStats(tournamentId, matches, players) {
  const trnMatches = (matches || []).filter(
    (m) => m.tournamentId === tournamentId
  );
  const playerMap = Object.fromEntries((players || []).map((p) => [p.id, p]));
  const statsByPlayer = {};

  trnMatches.forEach((m) => {
    (m.innings || []).forEach((inn) => {
      Object.entries(inn.playerStats || {}).forEach(([pid, st]) => {
        if (!statsByPlayer[pid]) {
          statsByPlayer[pid] = {
            playerId: pid,
            playerName: playerMap[pid]?.name || pid,
            playerCode: playerMap[pid]?.playerCode || "",
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            highestScore: 0,
            wickets: 0,
            runsConceded: 0
          };
        }
        const entry = statsByPlayer[pid];
        const r = Number(st.runs || 0);
        entry.runs += r;
        entry.balls += Number(st.balls || 0);
        entry.fours += Number(st.fours || 0);
        entry.sixes += Number(st.sixes || 0);
        if (r > entry.highestScore) entry.highestScore = r;
        entry.wickets += Number(st.wickets || 0);
        entry.runsConceded += Number(st.runsConceded || 0);
      });
    });
  });

  const allRows = Object.values(statsByPlayer);
  const topBatters = [...allRows]
    .filter((x) => x.runs > 0 || x.balls > 0)
    .sort((a, b) => b.runs - a.runs || b.sixes - a.sixes);

  const topBowlers = [...allRows]
    .filter((x) => x.wickets > 0 || x.runsConceded > 0)
    .sort((a, b) => b.wickets - a.wickets || a.runsConceded - b.runsConceded);

  return { topBatters, topBowlers };
}
// === SECTION 09: TOURNAMENT PLAYER STATS END ===