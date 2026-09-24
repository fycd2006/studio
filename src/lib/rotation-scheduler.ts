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
  matchupMode?: "rotate_opponents" | "fixed_pairs"; // default "rotate_opponents"
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
 * Intelligent scheduler for rotation tables with 2 teams per station.
 * Supports:
 * - rotate_opponents (default): Every team faces a different team each round (e.g. 1v2, 1v3, 1v4).
 * - fixed_pairs: Teams move as fixed pairs to visit all stations with zero station repeats.
 */
export function generateRotationSchedule(options: SchedulerOptions): GeneratedSchedule {
  const {
    tableTitle,
    day,
    teamCount = 4,
    matchupMode = "rotate_opponents",
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

  if (matchupMode === "rotate_opponents") {
    // ── ROTATE OPPONENTS MODE (每輪不同隊伍一起闖關) ──
    if (teamCount === 4 && stationCount === 3) {
      // 4 teams, 3 stations: 3 rounds where every team faces all 3 other teams!
      // S0, S1, S2 each host 2 matches and rest 1 round.
      const schedule3 = [
        ["1 vs 2", "3 vs 4", "—"],
        ["2 vs 4", "—", "1 vs 3"],
        ["—", "1 vs 4", "2 vs 3"],
      ];
      schedule3.forEach((cells) => rounds.push({ cells }));
    } else if (teamCount === 4 && stationCount === 2) {
      // 4 teams, 2 stations: 3 rounds with all 3 matchups
      const schedule2 = [
        ["1 vs 2", "3 vs 4"],
        ["1 vs 3", "2 vs 4"],
        ["1 vs 4", "2 vs 3"],
      ];
      schedule2.forEach((cells) => rounds.push({ cells }));
    } else if (teamCount === 4 && stationCount === 4) {
      // 4 teams, 4 stations: 3 rounds with all 3 matchups
      const schedule4 = [
        ["1 vs 2", "3 vs 4", "—", "—"],
        ["—", "—", "1 vs 3", "2 vs 4"],
        ["—", "2 vs 3", "—", "1 vs 4"],
      ];
      schedule4.forEach((cells) => rounds.push({ cells }));
    } else {
      // General case: Use round-robin tournament pairs so opponents change every round
      const allPairRounds = generateRoundRobinPairs(teamCount);
      const numRounds = options.roundCount || Math.min(
        allPairRounds.length,
        Math.max(stationCount, Math.ceil(teamCount / 2))
      );

      for (let rIdx = 0; rIdx < numRounds; rIdx++) {
        const cells = Array(stationCount).fill("—");
        const pairs = allPairRounds[rIdx % allPairRounds.length];

        for (let pIdx = 0; pIdx < pairs.length; pIdx++) {
          const sIdx = (pIdx + rIdx) % stationCount;
          const [tA, tB] = pairs[pIdx];
          cells[sIdx] = `${tA} vs ${tB}`;
        }
        rounds.push({ cells });
      }
    }
  } else {
    // ── FIXED PAIRS MODE (固定小組輪轉各站) ──
    const numPairs = Math.ceil(teamCount / 2);
    const defaultRounds = Math.max(stationCount, numPairs);
    const numRounds = options.roundCount ? Math.min(options.roundCount, defaultRounds) : defaultRounds;

    for (let r = 0; r < numRounds; r++) {
      const cells = Array(stationCount).fill("—");

      if (stationCount >= numPairs) {
        for (let p = 0; p < numPairs; p++) {
          const sIdx = (p + r) % stationCount;
          const tA = p * 2 + 1;
          const tB = p * 2 + 2;
          if (tB <= teamCount) {
            cells[sIdx] = `${tA} vs ${tB}`;
          } else {
            cells[sIdx] = `第 ${tA} 小隊`;
          }
        }
      } else {
        for (let s = 0; s < stationCount; s++) {
          const p = (s + r) % numPairs;
          const tA = p * 2 + 1;
          const tB = p * 2 + 2;
          if (tB <= teamCount) {
            cells[s] = `${tA} vs ${tB}`;
          } else {
            cells[s] = `第 ${tA} 小隊`;
          }
        }
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
