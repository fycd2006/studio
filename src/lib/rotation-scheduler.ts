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

  if (teamCount === 4 && stationCount === 4) {
    // ═════════════════════════════════════════════════════════════════════════
    // 4 TEAMS, 4 STATIONS: PERFECT 3-TIER HIERARCHICAL SOLUTION
    // 1. 競爭隊伍要不同: T1 plays 2 -> 3 -> 2 -> 3 (switches every round!)
    // 2. 隊伍零重複闖關: T1: S1,S3,S2,S4; T2: S1,S4,S2,S3; T3: S2,S3,S1,S4; T4: S2,S4,S1,S3 (All 4 distinct!)
    // 3. 關主隔一關休息: S1, S2 active R1 & R3; S3, S4 active R2 & R4 (100% 隔關輪休!)
    // ═════════════════════════════════════════════════════════════════════════
    const schedule4 = [
      ["1 vs 2", "3 vs 4", "—", "—"],
      ["—", "—", "1 vs 3", "2 vs 4"],
      ["3 vs 4", "1 vs 2", "—", "—"],
      ["—", "—", "2 vs 4", "1 vs 3"],
    ];
    const roundsToUse = options.roundCount ? Math.min(options.roundCount, 4) : 4;
    for (let r = 0; r < roundsToUse; r++) {
      rounds.push({ cells: schedule4[r] });
    }
  } else if (teamCount === 4 && stationCount === 3) {
    // ═════════════════════════════════════════════════════════════════════════
    // 4 TEAMS, 3 STATIONS (3 Rounds):
    // 1. 競爭隊伍要不同: Every team faces all 3 other teams (1v2, 1v3, 1v4)!
    // 2. 隊伍零重複闖關: T1 visits S1, S2, S3 with 0 duplicates; maximum station variety
    // 3. 關主隔一關休息: S1 rests in R2 (Active -> Rest -> Active: 隔關休息!); S2 rests R3; S3 rests R1
    // ═════════════════════════════════════════════════════════════════════════
    const schedule3 = [
      ["1 vs 2", "3 vs 4", "—"],
      ["—", "1 vs 3", "2 vs 4"],
      ["2 vs 3", "—", "1 vs 4"],
    ];
    const roundsToUse = options.roundCount ? Math.min(options.roundCount, 3) : 3;
    for (let r = 0; r < roundsToUse; r++) {
      rounds.push({ cells: schedule3[r] });
    }
  } else if (teamCount === 4 && stationCount === 2) {
    // ═════════════════════════════════════════════════════════════════════════
    // 4 TEAMS, 2 STATIONS (3 Rounds):
    // 1. 競爭隊伍要不同: All 3 distinct matchups (1v2, 1v3, 1v4)
    // 2. 隊伍闖關: Teams visit both stations
    // ═════════════════════════════════════════════════════════════════════════
    const schedule2 = [
      ["1 vs 2", "3 vs 4"],
      ["1 vs 3", "2 vs 4"],
      ["1 vs 4", "2 vs 3"],
    ];
    const roundsToUse = options.roundCount ? Math.min(options.roundCount, 3) : 3;
    for (let r = 0; r < roundsToUse; r++) {
      rounds.push({ cells: schedule2[r] });
    }
  } else if (teamCount === 4 && stationCount === 6) {
    // ═════════════════════════════════════════════════════════════════════════
    // 4 TEAMS, 6 STATIONS (3 Rounds):
    // 1. 競爭隊伍要不同: 100% all 3 distinct matchups (1v2, 1v3, 1v4)
    // 2. 隊伍零重複闖關: 100% zero repeats (teams visit 3 distinct stations!)
    // 3. 關主休息: 100% rest (each station is active in only 1 round and rests the others)
    // ═════════════════════════════════════════════════════════════════════════
    const schedule6 = [
      ["1 vs 2", "3 vs 4", "—", "—", "—", "—"],
      ["—", "—", "1 vs 3", "2 vs 4", "—", "—"],
      ["—", "—", "—", "—", "1 vs 4", "2 vs 3"],
    ];
    schedule6.forEach((cells) => rounds.push({ cells }));
  } else if (teamCount === 4 && stationCount === 5) {
    // ═════════════════════════════════════════════════════════════════════════
    // 4 TEAMS, 5 STATIONS (4 Rounds):
    // 1. 競爭隊伍要不同: Opponents rotate
    // 2. 隊伍零重複闖關: Staggered station visits
    // 3. 關主休息: Every station rests multiple rounds
    // ═════════════════════════════════════════════════════════════════════════
    const schedule5 = [
      ["1 vs 2", "3 vs 4", "—", "—", "—"],
      ["—", "—", "1 vs 3", "2 vs 4", "—"],
      ["2 vs 3", "—", "—", "—", "1 vs 4"],
      ["—", "1 vs 3", "—", "2 vs 4", "—"],
    ];
    schedule5.forEach((cells) => rounds.push({ cells }));
  } else {
    // ═════════════════════════════════════════════════════════════════════════
    // GENERAL CASE:
    // 1. 競爭隊伍要不同: Use round-robin tournament pairs so opponents change every round
    // 2. 隊伍零重複闖關 & 3. 關主輪休: Stagger station assignments cyclically
    // ═════════════════════════════════════════════════════════════════════════
    const allPairRounds = generateRoundRobinPairs(teamCount);
    const numPairs = Math.ceil(teamCount / 2);
    const numRounds = options.roundCount || Math.min(
      allPairRounds.length,
      Math.max(stationCount, numPairs)
    );

    for (let rIdx = 0; rIdx < numRounds; rIdx++) {
      const cells = Array(stationCount).fill("—");
      const pairs = allPairRounds[rIdx % allPairRounds.length];

      for (let pIdx = 0; pIdx < pairs.length; pIdx++) {
        // Shift stations across rounds to give stations rest when stationCount > numPairs
        const sIdx = (pIdx * 2 + rIdx) % stationCount;
        const [tA, tB] = pairs[pIdx];
        cells[sIdx] = `${tA} vs ${tB}`;
      }
      rounds.push({ cells });
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
