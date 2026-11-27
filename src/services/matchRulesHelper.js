// D:\AI\jbsc\src\services\matchRulesHelper.js

// === SECTION: FORMAT & OVER HELPERS START ===
export const MATCH_FORMATS = {
  ONE_DAY: "one_day",
  TEST: "test"
};

export function formatOversFromBalls(legalBalls, ballsPerOver = 6) {
  const bpo = Math.max(1, Number(ballsPerOver || 6));
  const balls = Math.max(0, Number(legalBalls || 0));
  const completedOvers = Math.floor(balls / bpo);
  const remBalls = balls % bpo;
  return `${completedOvers}.${remBalls}`;
}
// === SECTION: FORMAT & OVER HELPERS END ===

// === SECTION: BALL IMPACT & RUN-OUT RULES START ===
export function calculateSingleBallImpact(ball, matchConfig = {}) {
  const isMagic = Boolean(ball.isMagicBall);
  const extType = ball.extrasType || "none";
  const baseBat = Number(ball.runs || 0);
  const baseExt = Number(ball.extrasRuns || 0);
  const isNoBall = Boolean(ball.isNoBall || extType === "nb");
  const isRunOut = Boolean(ball.isRunOut || ball.wicketType === "Run Out");

  const countWideAsBall = Boolean(matchConfig.countWideAsBall);
  const countNoBallAsBall = Boolean(matchConfig.countNoBallAsBall);

  let effBat = baseBat;
  let effExt = baseExt;
  let wicketsInc = ball.isWicket ? 1 : 0;
  let legalBallsInc = 0;

  // क्रिकेट नियमाप्रमाणे No Ball वर Run Out झाल्यास फलंदाज बाद होतो (गोलंदाजाला विकेट नाही)
  // आणि No Ball च्या अतिरिक्त धावा + पळलेल्या धावा स्कोअरमध्ये मोजल्या जातात
  if (isNoBall && isRunOut) {
    effBat = isMagic ? baseBat * 2 : baseBat;
    effExt = isMagic ? Math.max(2, baseExt * 2) : Math.max(1, baseExt);
    wicketsInc = isMagic ? 2 : 1;
    legalBallsInc = countNoBallAsBall ? 1 : 0;
  } else if (isMagic) {
    if (extType === "wd") {
      effBat = 0;
      effExt = Math.max(2, baseExt * 2);
      legalBallsInc = countWideAsBall ? 1 : 0;
    } else if (extType === "nb" || isNoBall) {
      effBat = baseBat * 2;
      effExt = 2;
      legalBallsInc = countNoBallAsBall ? 1 : 0;
    } else if (extType === "bye" || extType === "lb") {
      effBat = 0;
      effExt = Math.max(2, baseExt * 2);
      legalBallsInc = 1;
    } else if (baseBat === 0 && !ball.isWicket) {
      effBat = 0;
      effExt = 0;
      legalBallsInc = 2;
    } else {
      effBat = baseBat * 2;
      effExt = 0;
      legalBallsInc = 1;
    }
    if (ball.isWicket) {
      wicketsInc = 2;
    }
  } else {
    const countsLegal =
      extType === "none" ||
      extType === "bye" ||
      extType === "lb" ||
      (extType === "wd" && countWideAsBall) ||
      ((extType === "nb" || isNoBall) && countNoBallAsBall);
    legalBallsInc = countsLegal ? 1 : 0;
  }

  // Run Out मध्ये कितव्या रनवर आऊट झाला ते लक्षात घेऊन तेवढ्या धावा जोडा
  const runOutCompletedRuns = isRunOut ? Math.max(0, Number(ball.runOutRunNumber ?? baseBat)) : effBat;
  if (isRunOut && !isMagic) {
    effBat = runOutCompletedRuns;
  }

  return {
    effBat,
    effExt,
    totalRuns: effBat + effExt,
    wicketsInc,
    legalBallsInc,
    extType: isNoBall ? "nb" : extType,
    baseBat: isRunOut ? runOutCompletedRuns : baseBat,
    baseExt: effExt,
    isMagic,
    isDeclare: Boolean(ball.isDeclare),
    isRunOut,
    isNoBall
  };
}
// === SECTION: BALL IMPACT & RUN-OUT RULES END ===

// === SECTION: STRIKE & OVER ROTATION START ===
export function computeNextStrikeAfterBall(
  ball,
  impact,
  totalLegalBallsAfter,
  ballsPerOver,
  fallbackStrikerId = "",
  fallbackNonStrikerId = ""
) {
  let nextStriker = ball.strikerId || fallbackStrikerId;
  let nextNonStriker = ball.nonStrikerId || fallbackNonStrikerId;

  const physicalRuns =
    impact.extType === "none" || impact.extType === "nb"
      ? impact.baseBat
      : impact.extType === "bye" || impact.extType === "lb"
      ? impact.baseExt
      : Math.max(0, impact.baseExt - 1);

  // Odd runs (1, 3...) वर Strike बदलते; Declare असल्यास बदलत नाही
  if (!impact.isDeclare && physicalRuns % 2 === 1 && nextStriker && nextNonStriker) {
    const tmp = nextStriker;
    nextStriker = nextNonStriker;
    nextNonStriker = tmp;
  }

  // Over पूर्ण झाल्यावर End बदलते
  const overCompleted =
    impact.legalBallsInc > 0 &&
    totalLegalBallsAfter > 0 &&
    totalLegalBallsAfter % Math.max(1, Number(ballsPerOver || 6)) === 0;

  if (overCompleted && nextStriker && nextNonStriker) {
    const tmp = nextStriker;
    nextStriker = nextNonStriker;
    nextNonStriker = tmp;
  }

  return {
    strikerId: nextStriker,
    nonStrikerId: nextNonStriker,
    overCompleted
  };
}
// === SECTION: STRIKE & OVER ROTATION END ===

// === SECTION: MATCH & SUPER-OVER END DETECTOR START ===
export function detectMatchEndCondition(matchObj) {
  if (!matchObj || matchObj.status === "completed") {
    return null;
  }

  const idx = matchObj.activeInningsIndex || 0;
  const inn = matchObj.innings?.[idx];
  if (!inn) return null;

  const bpo = Math.max(1, Number(matchObj.ballsPerOver || 6));
  const maxBalls =
    matchObj.format === MATCH_FORMATS.TEST
      ? Infinity
      : Math.max(1, Number(matchObj.overs || 6)) * bpo;
  const maxWickets = Math.max(1, Number(matchObj.playersPerSide || 11) - 1);

  const runs = Number(inn.runs || 0);
  const wickets = Number(inn.wickets || 0);
  const legalBalls = Number(inn.legalBalls || 0);

  const allOut = wickets >= maxWickets;
  const oversDone =
    matchObj.format !== MATCH_FORMATS.TEST && legalBalls >= maxBalls;

  // Super Over फेरी (2 सलग सुपर ओव्हर डाव: battingFirst व battingSecond)
  if (inn.isSuperOver) {
    const superInns = (matchObj.innings || []).filter((x) => x.isSuperOver);
    const isFirstSuperInn = superInns.length === 1;
    const firstSuperRuns = Number(superInns[0]?.runs || 0);

    if (isFirstSuperInn) {
      if (allOut || oversDone) {
        return { type: "end_super_first_innings" };
      }
      return null;
    }

    const superTarget = firstSuperRuns + 1;
    if (runs >= superTarget) {
      return {
        type: "end_match_target_reached",
        winnerTeamId: inn.battingTeamId
      };
    }

    if (allOut || oversDone) {
      if (runs === firstSuperRuns) {
        return {
          type: "super_over_tie_choice",
          teamAId: matchObj.teamAId,
          teamBId: matchObj.teamBId
        };
      }
      return {
        type: "end_match_overs_done_chase_failed",
        winnerTeamId: inn.bowlingTeamId
      };
    }
    return null;
  }

  if (idx === 0) {
    if (allOut || oversDone) {
      return { type: "end_first_innings" };
    }
    return null;
  }

  const firstInnRuns = Number(matchObj.innings?.[0]?.runs || 0);
  const target = firstInnRuns + 1;

  if (runs >= target) {
    return {
      type: "end_match_target_reached",
      winnerTeamId: inn.battingTeamId
    };
  }

  if (allOut || oversDone) {
    if (runs === firstInnRuns) {
      return { type: "tie_prompt", tiePoints: 1 };
    }
    return {
      type: "end_match_overs_done_chase_failed",
      winnerTeamId: inn.bowlingTeamId
    };
  }

  return null;
}
// === SECTION: MATCH & SUPER-OVER END DETECTOR END ===