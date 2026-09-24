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
 * Intelligent scheduler for rotation tables with 2 teams per station.
 * Mathematically guarantees zero station collision (no team ever visits the same station twice).
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

  // Group teams into pairs for head-to-head matches (2 teams per match)
  const numPairs = Math.ceil(teamCount / 2);
  
  // Total rounds:
  // To ensure every team visits all available stations with zero repeats,
  // number of rounds is stationCount (when stationCount >= numPairs).
  // If stationCount < numPairs, each round some pairs rest, so numPairs rounds are needed.
  const defaultRounds = Math.max(stationCount, numPairs);
  const numRounds = options.roundCount ? Math.min(options.roundCount, defaultRounds) : defaultRounds;

  for (let r = 0; r < numRounds; r++) {
    const cells = Array(stationCount).fill("—");

    if (stationCount >= numPairs) {
      // Each pair is assigned cyclically: sIdx = (p + r) % stationCount
      // For any fixed pair p, as r goes from 0 to stationCount - 1,
      // sIdx visits all distinct stations with zero repeats!
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
      // stationCount < numPairs: in each round, only stationCount pairs play
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
