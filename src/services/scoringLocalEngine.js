// src/services/scoringLocalEngine.js

// === SECTION: STORAGE KEYS & CONSTANTS START ===
const STORAGE_KEYS = {
  TOURNAMENTS: "jbsc_score_tournaments_v1",
  TEAMS: "jbsc_score_teams_v1",
  PLAYERS: "jbsc_score_players_v1",
  MATCHES: "jbsc_score_matches_v1"
};

export const MATCH_FORMATS = {
  ONE_DAY: "one_day",
  TEST: "test"
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
// === SECTION: STORAGE KEYS & CONSTANTS END ===

// === SECTION: TOURNAMENT CRUD & GROUPS START ===
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
  defaultGroups.forEach((g) => {
    initialGroupTeams[g] = Array.isArray(input.groupTeams?.[g])
      ? input.groupTeams[g]
      : [];
  });

  const tournament = {
    id: uid("trn"),
    name: String(input.name || "").trim(),
    club: String(input.club || "JBSC").trim(),
    season: String(input.season || "2026").trim(),
    startDate: String(input.startDate || "").trim(),
    endDate: String(input.endDate || "").trim(),
    bannerUrl: String(input.bannerUrl || "").trim(),
    mode, // "league" | "single"
    format, // "one_day" | "test"
    groups: defaultGroups,
    groupTeams: initialGroupTeams, // { "Group A": [teamId1, teamId2] }
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
  const next = getTournaments().filter((t) => t.id !== tournamentId);
  writeList(STORAGE_KEYS.TOURNAMENTS, next);
}

export function addTournamentGroup(tournamentId, groupName) {
  const clean = String(groupName || "").trim();
  const t = getTournaments().find((item) => item.id === tournamentId);
  if (!t || !clean) return t;

  const groups = Array.from(new Set([...(t.groups || []), clean]));
  const groupTeams = {
    ...(t.groupTeams || {}),
    [clean]: Array.isArray(t.groupTeams?.[clean]) ? t.groupTeams[clean] : []
  };
  return updateTournament(tournamentId, { groups, groupTeams });
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
// === SECTION: TOURNAMENT CRUD & GROUPS END ===

// === SECTION: TEAMS & PLAYERS (PLAYING / BENCH) START ===
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

  if (existing) {
    return existing;
  }

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
// === SECTION: TEAMS & PLAYERS (PLAYING / BENCH) END ===

// === SECTION: FIXTURE, TOSS & BALL-BY-BALL ENGINE START ===
function createEmptyInnings(inningsNumber, battingTeamId, bowlingTeamId) {
  return {
    inningsNumber,
    battingTeamId,
    bowlingTeamId,
    runs: 0,
    wickets: 0,
    legalBalls: 0,
    declared: false,
    declaredRuns: null,
    balls: [],
    strikerId: "",
    nonStrikerId: "",
    bowlerId: "",
    playerStats: {}
  };
}

export function getMatches() {
  return readList(STORAGE_KEYS.MATCHES);
}

export function saveMatchFixture(input = {}) {
  const matches = getMatches();
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

  const firstInnings = createEmptyInnings(1, teamAId, teamBId);

  const match = {
    id: input.id || uid("mt"),
    tournamentId: tournament?.id || input.tournamentId || "",
    tournamentName:
      tournament?.name || input.tournamentName || "Standalone Match",
    season: tournament?.season || input.season || "2026",
    matchCategory:
      input.matchCategory === "other" ? "other" : "points_table", // "points_table" | "other"
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
    toss: input.toss || {
      wonByTeamId: "",
      decision: ""
    },
    activeInningsIndex: 0,
    innings: input.innings?.length ? input.innings : [firstInnings],
    resultText: input.resultText || "",
    winnerTeamId: input.winnerTeamId || "",
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
    innings: [createEmptyInnings(1, battingFirstId, bowlingFirstId)],
    updatedAt: new Date().toISOString()
  };

  writeList(
    STORAGE_KEYS.MATCHES,
    matches.map((m) => (m.id === matchId ? updatedMatch : m))
  );
  return updatedMatch;
}

// === SECTION: RECOMPUTE INNINGS & MAGIC BALL ENGINE START ===
export function recomputeInningsState(
  innings,
  ballsPerOver,
  countWideAsBall,
  countNoBallAsBall
) {
  let runs = 0;
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

  let strikerId = innings.strikerId || "";
  let nonStrikerId = innings.nonStrikerId || "";
  let bowlerId = innings.bowlerId || "";

  for (const b of innings.balls || []) {
    const isMagic = Boolean(b.isMagicBall);
    const isDeclare = Boolean(b.isDeclare);
    const ranBetween = Boolean(b.ranBetweenWickets);
    const extType = b.extrasType || "none";
    const baseBatRuns = Number(b.runs || 0);
    const baseExtRuns = Number(b.extrasRuns || 0);

    let effectiveBatRuns = baseBatRuns;
    let effectiveExtRuns = baseExtRuns;
    let wicketCountForBall = b.isWicket ? 1 : 0;
    let legalBallIncrement = 0;

    if (isMagic) {
      if (extType === "wd") {
        // Magic Wide: किमान 2 किंवा दिलेले अतिरिक्त दुप्पट
        effectiveBatRuns = 0;
        effectiveExtRuns = Math.max(2, baseExtRuns * 2);
        legalBallIncrement = countWideAsBall ? 1 : 0;
      } else if (extType === "nb") {
        // Magic No Ball: 2 NB runs + दुप्पट bat runs (उदा. NB+2 -> 2 + 4 = 6 runs)
        effectiveBatRuns = baseBatRuns * 2;
        effectiveExtRuns = 2;
        legalBallIncrement = countNoBallAsBall ? 1 : 0;
      } else if (extType === "bye" || extType === "lb") {
        // Magic Bye / LB: धावा दुप्पट (उदा. 1 Bye -> 2 runs, 29 + 2 = 31)
        effectiveBatRuns = 0;
        effectiveExtRuns = Math.max(2, baseExtRuns * 2);
        legalBallIncrement = 1;
      } else if (baseBatRuns === 0 && !b.isWicket) {
        // Magic Dot Ball: 2 balls मोजले जातात
        effectiveBatRuns = 0;
        effectiveExtRuns = 0;
        legalBallIncrement = 2;
      } else {
        // Magic Normal Runs (1->2, 2->4, 4->8)
        effectiveBatRuns = baseBatRuns * 2;
        effectiveExtRuns = 0;
        legalBallIncrement = 1;
      }

      if (b.isWicket) {
        wicketCountForBall = 2;
      }
    } else {
      effectiveBatRuns = baseBatRuns;
      effectiveExtRuns = baseExtRuns;
      const countsLegal =
        extType === "none" ||
        extType === "bye" ||
        extType === "lb" ||
        (extType === "wd" && countWideAsBall) ||
        (extType === "nb" && countNoBallAsBall);
      legalBallIncrement = countsLegal ? 1 : 0;
    }

    const totalBallRuns = effectiveBatRuns + effectiveExtRuns;
    runs += totalBallRuns;
    wickets += wicketCountForBall;
    legalBalls += legalBallIncrement;

    const sStat = ensureStat(b.strikerId);
    const bStat = ensureStat(b.bowlerId);

    if (sStat) {
      if (extType !== "wd") {
        sStat.balls +=
          isMagic && extType === "none" && baseBatRuns === 0 && !b.isWicket
            ? 2
            : 1;
      }
      if (extType === "none" || extType === "nb") {
        sStat.runs += effectiveBatRuns;
        if (effectiveBatRuns === 4) sStat.fours += 1;
        if (effectiveBatRuns === 6) sStat.sixes += 1;
      }
      if (b.isWicket && b.strikerId) {
        sStat.out = true;
        sStat.dismissalText = b.wicketType || "out";
        outPlayerIds.add(b.strikerId);
      }
    }

    if (b.isWicket && isMagic && b.magicTargetPlayerId) {
    const mStat = ensureStat(b.magicTargetPlayerId);
    if (mStat) {
        mStat.out = true;
        mStat.dismissalText = "out in magic";
        outPlayerIds.add(b.magicTargetPlayerId);
    }
    }

    if (bStat) {
      if (extType !== "bye" && extType !== "lb") {
        bStat.runsConceded += totalBallRuns;
      }
      if (legalBallIncrement > 0) {
        bStat.ballsBowled += legalBallIncrement;
      }
      if (b.isWicket && b.wicketType !== "run_out") {
        bStat.wickets += wicketCountForBall;
      }
    }

    // Strike Rotation:
    // - Declare असेल तर strike बदलत नाही
    // - इतर वेळी धावलेल्या धावांनुसार (base runs / base extras) विषम धावांवर strike बदलते
    const baseRunsForRotation =
      extType === "none" || extType === "nb"
        ? baseBatRuns
        : extType === "bye" || extType === "lb"
        ? baseExtRuns
        : Math.max(0, baseExtRuns - 1);

    const shouldSwapStrike = isDeclare
      ? ranBetween
      : baseRunsForRotation % 2 === 1;

    if (shouldSwapStrike && strikerId && nonStrikerId) {
      const temp = strikerId;
      strikerId = nonStrikerId;
      nonStrikerId = temp;
    }

    // Over पूर्ण झाल्यावर strike बदलते
    if (legalBallIncrement > 0 && legalBalls % ballsPerOver === 0) {
      if (strikerId && nonStrikerId) {
        const temp = strikerId;
        strikerId = nonStrikerId;
        nonStrikerId = temp;
      }
    }
  }

  return {
    ...innings,
    runs,
    wickets,
    legalBalls,
    strikerId,
    nonStrikerId,
    bowlerId,
    playerStats,
    outPlayerIds: Array.from(outPlayerIds)
  };
}
// === SECTION: RECOMPUTE INNINGS & MAGIC BALL ENGINE END ===

// === SECTION: RECORD & UNDO BALL WITH BATTER RESTORE START ===
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
    isWicket: Boolean(ballInput.isWicket),
    wicketType: ballInput.wicketType || "",
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

  const nextInnRaw = {
    ...currentInn,
    balls: [...(currentInn.balls || []), newBall]
  };

  const recomputedInn = recomputeInningsState(
    nextInnRaw,
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
  if (
    !currentInn ||
    !Array.isArray(currentInn.balls) ||
    currentInn.balls.length === 0
  ) {
    return match;
  }

  const lastBall = currentInn.balls[currentInn.balls.length - 1];
  const remainingBalls = currentInn.balls.slice(0, -1);

  const nextInnRaw = {
    ...currentInn,
    declared: false,
    declaredRuns: null,
    balls: remainingBalls,
    // चेंडू पडण्यापूर्वीचा जुना striker / non-striker परत आणा
    strikerId: lastBall?.beforeBallStrikerId || currentInn.strikerId || "",
    nonStrikerId:
      lastBall?.beforeBallNonStrikerId || currentInn.nonStrikerId || ""
  };

  const recomputedInn = recomputeInningsState(
    nextInnRaw,
    Math.max(1, Number(match.ballsPerOver || 6)),
    Boolean(match.countWideAsBall),
    Boolean(match.countNoBallAsBall)
  );

  // recomputeInningsState नंतरही lastBall वरील beforeBallStrikerId / beforeBallNonStrikerId ला प्राधान्य द्या
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
// === SECTION: RECORD & UNDO BALL WITH BATTER RESTORE END ===

export function declareMatchInnings(matchId) {
  const matches = getMatches();
  const match = matches.find((m) => m.id === matchId);
  if (!match) return null;

  const idx = match.activeInningsIndex || 0;
  const currentInn = match.innings[idx];
  if (!currentInn) return match;

  const updatedInn = {
    ...currentInn,
    declared: true,
    declaredRuns: Number(currentInn.runs || 0)
  };

  const updatedMatch = {
    ...match,
    innings: match.innings.map((item, i) => (i === idx ? updatedInn : item)),
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
  const nextInn = createEmptyInnings(nextNumber, nextBattingId, nextBowlingId);

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

  const updatedInn = {
    ...currentInn,
    strikerId: strikerId !== undefined ? strikerId : currentInn.strikerId,
    nonStrikerId:
      nonStrikerId !== undefined ? nonStrikerId : currentInn.nonStrikerId,
    bowlerId: bowlerId !== undefined ? bowlerId : currentInn.bowlerId
  };

  const updatedMatch = {
    ...match,
    innings: match.innings.map((item, i) => (i === idx ? updatedInn : item)),
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

export function formatOversFromBalls(legalBalls, ballsPerOver = 6) {
  const bpo = Math.max(1, Number(ballsPerOver || 6));
  const balls = Math.max(0, Number(legalBalls || 0));
  const completedOvers = Math.floor(balls / bpo);
  const remBalls = balls % bpo;
  return `${completedOvers}.${remBalls}`;
}
// === SECTION: FIXTURE, TOSS & BALL-BY-BALL ENGINE END ===

// === SECTION: POINTS TABLE, NRR & TOURNAMENT STATS START ===
function ballsToDecimalOvers(legalBalls, ballsPerOver = 6) {
  const bpo = Math.max(1, Number(ballsPerOver || 6));
  return Math.max(0, Number(legalBalls || 0)) / bpo;
}

export function computeGroupPointsTable(tournament, matches, teams) {
  if (!tournament) return {};

  const ptsWin = Number(tournament.pointsConfig?.win ?? 2);
  const ptsTie = Number(tournament.pointsConfig?.tie ?? 1);
  const ptsNr = Number(tournament.pointsConfig?.noResult ?? 1);
  const ptsLoss = Number(tournament.pointsConfig?.loss ?? 0);

  const groups = Array.isArray(tournament.groups) ? tournament.groups : [];
  const teamMap = Object.fromEntries((teams || []).map((t) => [t.id, t]));
  const resultByGroup = {};

  groups.forEach((groupName) => {
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
// === SECTION: POINTS TABLE, NRR & TOURNAMENT STATS END ===

