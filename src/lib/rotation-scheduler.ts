import { RotationRound, Station, TeamOrder } from "@/types/plan";

export interface PlanStationInput {
  planId: string;
  name: string;
  location: string;
  lead: string;
  assistant: string;
}

export interface SchedulerOptions {
  tableTitle: string;
  day: string;
  teamCount: number; // default 4
  roundCount?: number; // optional override
  matchupMode?: "fixed_pairs" | "rotate_opponents"; // legacy optional
  firstRoundRestStationIds?: string[];
  stations: PlanStationInput[];
}

export interface GeneratedSchedule {
  title: string;
  day: string;
  stations: Station[];
  rounds: RotationRound[];
  teamOrders: TeamOrder[];
}

/**
 * Generates tournament pairing matches for M teams using the Polygon / Circle method.
 * Returns array of rounds, each containing pairs of [teamA, teamB] (1-indexed).
 */
function generateRoundRobinPairs(teamCount: number): Array<Array<[number, number]>> {
  const effectiveCount = teamCount % 2 === 0 ? teamCount : teamCount + 1;
  const numRounds = effectiveCount - 1;
  const half = effectiveCount / 2;
  const teams = Array.from({ length: effectiveCount }, (_, i) => i + 1);
  const rounds: Array<Array<[number, number]>> = [];

  for (let r = 0; r < numRounds; r++) {
    const roundPairs: Array<[number, number]> = [];
    for (let i = 0; i < half; i++) {
      const tA = teams[i];
      const tB = teams[effectiveCount - 1 - i];
      if (tA <= teamCount && tB <= teamCount) {
        roundPairs.push([tA, tB]);
      }
    }
    rounds.push(roundPairs);
    const fixed = teams[0];
    const rest = teams.slice(1);
    const last = rest.pop()!;
    rest.unshift(last);
    teams.splice(0, teams.length, fixed, ...rest);
  }
  return rounds;
}

/**
 * Hierarchical Automatic Scheduler:
 * Strictly prioritizes in order:
 * 1. 競爭隊伍要不同 (Opponents change each round)
 * 2. 隊伍零重複闖關 (Zero station repeats: each team visits a station at most once)
 * 3. 關主可以隔一關休息 (Station masters rest every other round)
 * 4. 第一輪輪空指定 (Round 1 custom resting stations)
 */
export function generateRotationSchedule(options: SchedulerOptions): GeneratedSchedule {
  const {
    tableTitle,
    day,
    teamCount = 4,
    stations: inputStations,
  } = options;

  const stationCount = inputStations.length;
  if (stationCount === 0) {
    return {
      title: tableTitle,
      day,
      stations: [],
      rounds: [],
      teamOrders: [],
    };
  }

  // Convert inputs to Station objects
  const stations: Station[] = inputStations.map((s, idx) => ({
    id: s.planId || Math.random().toString(36).substr(2, 9),
    name: s.name || `關卡${idx + 1}`,
    location: s.location || "",
    lead: s.lead || "",
    assistant: s.assistant || "",
  }));

  // Create team orders (1-indexed teams: 第 1 小隊 ~ 第 M 小隊)
  const teams: TeamOrder[] = Array.from({ length: teamCount }, (_, i) => ({
    id: Math.random().toString(36).substr(2, 9),
    name: `第 ${i + 1} 小隊`,
    stations: [],
  }));

  const rounds: RotationRound[] = [];

  // ── FIRST ROUND RESTING STATIONS RESOLUTION ──
  const activeMatches = Math.floor(teamCount / 2);
  const maxRestCount = Math.max(0, stationCount - activeMatches);
  const requestedRestIds = new Set(options.firstRoundRestStationIds || []);

  // Filter requested resting station indices in station array order
  let restIndices: number[] = stations
    .map((s, idx) => (requestedRestIds.has(s.id) ? idx : -1))
    .filter((idx) => idx !== -1);

  if (restIndices.length > maxRestCount) {
    restIndices = restIndices.slice(0, maxRestCount);
  }

  // If fewer than maxRestCount selected, fill remainder from the end of stations
  for (let i = stationCount - 1; i >= 0 && restIndices.length < maxRestCount; i--) {
    if (!restIndices.includes(i)) {
      restIndices.push(i);
    }
  }
  const restSet = new Set(restIndices);

  if (teamCount === 4 && stationCount === 4) {
    // ═════════════════════════════════════════════════════════════════════════
    // 4 TEAMS, 4 STATIONS: PERFECT 3-TIER HIERARCHICAL SOLUTION
    // 1. 競爭隊伍要不同: T1 plays 2 -> 3 -> 2 -> 3 (switches every round!)
    // 2. 隊伍零重複闖關: All 4 teams visit all 4 distinct stations!
    // 3. 關主隔一關休息: Active stations and resting stations alternate every round!
    // 4. 第一輪輪空: Exactly respects the selected rest stations!
    // ═════════════════════════════════════════════════════════════════════════
    const act = [0, 1, 2, 3].filter((i) => !restSet.has(i));
    const [aA, aB] = act;
    const [rA, rB] = restIndices;

    const schedule4 = [
      Array(4).fill("—"),
      Array(4).fill("—"),
      Array(4).fill("—"),
      Array(4).fill("—"),
    ];
    schedule4[0][aA] = "1 vs 2";
    schedule4[0][aB] = "3 vs 4";
    schedule4[1][rA] = "1 vs 3";
    schedule4[1][rB] = "2 vs 4";
    schedule4[2][aA] = "3 vs 4";
    schedule4[2][aB] = "1 vs 2";
    schedule4[3][rA] = "2 vs 4";
    schedule4[3][rB] = "1 vs 3";

    const roundsToUse = options.roundCount ? Math.min(options.roundCount, 4) : 4;
    for (let r = 0; r < roundsToUse; r++) {
      rounds.push({ cells: schedule4[r] });
    }
  } else if (teamCount === 4 && stationCount === 3) {
    // ═════════════════════════════════════════════════════════════════════════
    // 4 TEAMS, 3 STATIONS (3 Rounds):
    // 1. 隊伍零重複闖關: 100% 零重複闖關 across all 4 teams!
    // 2. 關主隔關休息: 各關卡均輪休 1 關
    // 3. 第一輪輪空: Exactly respects the selected resting station restIdx!
    // ═════════════════════════════════════════════════════════════════════════
    const restIdx = restIndices[0] !== undefined ? restIndices[0] : 2;
    const schedule3: string[][] = [];
    for (let r = 0; r < 3; r++) {
      const cells = Array(3).fill("—");
      const rest = (restIdx + r) % 3;
      const m1 = (restIdx + 1 + r) % 3;
      const m2 = (restIdx + 2 + r) % 3;
      cells[rest] = "—";
      cells[m1] = "1 vs 2";
      cells[m2] = "3 vs 4";
      schedule3.push(cells);
    }
    const roundsToUse = options.roundCount ? Math.min(options.roundCount, 3) : 3;
    for (let r = 0; r < roundsToUse; r++) {
      rounds.push({ cells: schedule3[r] });
    }
  } else if (teamCount === 6 && stationCount === 3) {
    // ═════════════════════════════════════════════════════════════════════════
    // 6 TEAMS, 3 STATIONS (3 Rounds):
    // 1. 競爭隊伍要不同: 100% 全不同對手 (T1: vs 2, 3, 6; T2: vs 1, 5, 4...)
    // 2. 隊伍零重複闖關: 100% 6隊皆完整且無重複輪轉 S1, S2, S3
    // ═════════════════════════════════════════════════════════════════════════
    const schedule6x3 = [
      ["1 vs 2", "3 vs 4", "5 vs 6"],
      ["4 vs 6", "2 vs 5", "1 vs 3"],
      ["3 vs 5", "1 vs 6", "2 vs 4"],
    ];
    const roundsToUse = options.roundCount ? Math.min(options.roundCount, 3) : 3;
    for (let r = 0; r < roundsToUse; r++) {
      rounds.push({ cells: schedule6x3[r] });
    }
  } else if (teamCount === 4 && stationCount === 2) {
    // ═════════════════════════════════════════════════════════════════════════
    // 4 TEAMS, 2 STATIONS (2 Rounds):
    // 隊伍零重複闖關: T1, T2: S1 -> S2; T3, T4: S2 -> S1 (100% 零重複闖關)
    // ═════════════════════════════════════════════════════════════════════════
    const schedule2 = [
      ["1 vs 2", "3 vs 4"],
      ["3 vs 4", "1 vs 2"],
    ];
    const roundsToUse = options.roundCount ? Math.min(options.roundCount, 2) : 2;
    for (let r = 0; r < roundsToUse; r++) {
      rounds.push({ cells: schedule2[r] });
    }
  } else if (teamCount === 4 && stationCount === 6) {
    // ═════════════════════════════════════════════════════════════════════════
    // 4 TEAMS, 6 STATIONS (3 Rounds):
    // 1. 競爭隊伍要不同: 100% all 3 distinct matchups (1v2, 1v3, 1v4)
    // 2. 隊伍零重複闖關: 100% zero repeats (teams visit 3 distinct stations!)
    // 3. 關主休息: 100% rest (each station is active in only 1 round and rests the others)
    // 4. 第一輪輪空: Exactly respects the selected 4 resting stations!
    // ═════════════════════════════════════════════════════════════════════════
    const act = [0, 1, 2, 3, 4, 5].filter((i) => !restSet.has(i));
    const [aA, aB] = act;
    const rA1 = restIndices[0], rB1 = restIndices[1];
    const rA2 = restIndices[2], rB2 = restIndices[3];

    const schedule6 = [
      Array(6).fill("—"),
      Array(6).fill("—"),
      Array(6).fill("—"),
    ];
    schedule6[0][aA] = "1 vs 2";
    schedule6[0][aB] = "3 vs 4";
    schedule6[1][rA1] = "1 vs 3";
    schedule6[1][rB1] = "2 vs 4";
    schedule6[2][rA2] = "1 vs 4";
    schedule6[2][rB2] = "2 vs 3";

    const roundsToUse = options.roundCount ? Math.min(options.roundCount, 3) : 3;
    for (let r = 0; r < roundsToUse; r++) {
      rounds.push({ cells: schedule6[r] });
    }
  } else {
    // ═════════════════════════════════════════════════════════════════════════
    // GENERAL CASE: Constraint Satisfaction Solver
    // Strictly enforces:
    // 1. 隊伍零重複闖關: No team is assigned to a station it has visited before
    // 2. 競爭隊伍盡量不同: Greedily pairs teams that haven't played against each other
    // 3. 第一輪輪空: Round 0 strictly excludes the rest stations
    // ═════════════════════════════════════════════════════════════════════════
    const visitedStations: Record<number, Set<number>> = {};
    for (let t = 1; t <= teamCount; t++) visitedStations[t] = new Set();
    const opponentHistory: Record<number, Set<number>> = {};
    for (let t = 1; t <= teamCount; t++) opponentHistory[t] = new Set();

    const numRounds = options.roundCount || Math.min(teamCount, stationCount);
    const availableTeams = Array.from({ length: teamCount }, (_, i) => i + 1);

    for (let r = 0; r < numRounds; r++) {
      const roundCells = Array(stationCount).fill("—");
      let stationOrder: number[];

      if (r === 0) {
        stationOrder = Array.from({ length: stationCount }, (_, i) => i).filter(
          (s) => !restSet.has(s)
        );
      } else {
        const priorResting = Array.from({ length: stationCount }, (_, i) => i).filter(
          (s) => restSet.has(s)
        );
        const priorActive = Array.from({ length: stationCount }, (_, i) => i).filter(
          (s) => !restSet.has(s)
        );
        stationOrder = [...priorResting, ...priorActive].map(
          (s, idx) => (s + r) % stationCount
        );
        stationOrder = Array.from(new Set(stationOrder));
      }

      const roundUsedTeams = new Set<number>();

      for (const s of stationOrder) {
        if (roundUsedTeams.size + 2 > teamCount) break;

        // Filter eligible teams that haven't visited station s
        const eligibleTeams = availableTeams.filter(
          (t) => !roundUsedTeams.has(t) && !visitedStations[t].has(s)
        );
        if (eligibleTeams.length < 2) continue;

        // Pick pair that has played least
        let bestPair: [number, number] | null = null;
        let minOppHistory = 999;

        for (let i = 0; i < eligibleTeams.length; i++) {
          for (let j = i + 1; j < eligibleTeams.length; j++) {
            const tA = eligibleTeams[i],
              tB = eligibleTeams[j];
            const played = opponentHistory[tA].has(tB) ? 1 : 0;
            if (played < minOppHistory) {
              minOppHistory = played;
              bestPair = [tA, tB];
              if (played === 0) break;
            }
          }
          if (minOppHistory === 0) break;
        }

        if (bestPair) {
          const [tA, tB] = bestPair;
          roundCells[s] = `${tA} vs ${tB}`;
          roundUsedTeams.add(tA);
          roundUsedTeams.add(tB);
          visitedStations[tA].add(s);
          visitedStations[tB].add(s);
          opponentHistory[tA].add(tB);
          opponentHistory[tB].add(tA);
        }
      }
      rounds.push({ cells: roundCells });
    }
  }

  // ── AUTO-DERIVE TEAM ORDERS (小隊視角對應表) ──
  // For each team, inspect every round to find which station they were assigned to
  for (let tIdx = 0; tIdx < teamCount; tIdx++) {
    const teamNum = tIdx + 1;
    const teamSchedule: string[] = [];

    for (let rIdx = 0; rIdx < rounds.length; rIdx++) {
      const roundCells = rounds[rIdx].cells;
      let foundStation = "—";

      for (let sIdx = 0; sIdx < stationCount; sIdx++) {
        const cell = roundCells[sIdx];
        if (!cell || cell === "—") continue;

        // Parse e.g. "1 vs 2" or "第 1 小隊"
        const match = cell.match(/(\d+)\s*vs\s*(\d+)/i);
        if (match) {
          const a = parseInt(match[1], 10);
          const b = parseInt(match[2], 10);
          if (a === teamNum) {
            foundStation = `${stations[sIdx].name} (vs ${b})`;
            break;
          } else if (b === teamNum) {
            foundStation = `${stations[sIdx].name} (vs ${a})`;
            break;
          }
        } else if (cell.includes(`第 ${teamNum} 小隊`)) {
          foundStation = stations[sIdx].name;
          break;
        }
      }
      teamSchedule.push(foundStation);
    }
    teams[tIdx].stations = teamSchedule;
  }

  return {
    title: tableTitle,
    day,
    stations,
    rounds,
    teamOrders: teams,
  };
}
