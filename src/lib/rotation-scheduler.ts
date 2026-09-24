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
  roundOption?: "all_stations" | "all_opponents"; // for 3 stations: 3 rounds vs 4 rounds
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
  // If odd, add a dummy team 0 for byes
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
    // Rotate array keeping teams[0] fixed
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
 */
export function generateRotationSchedule(options: SchedulerOptions): GeneratedSchedule {
  const {
    tableTitle,
    day,
    teamCount = 4,
    roundOption = "all_stations",
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

  // ── SPECIAL CASE: 4 TEAMS & 3 STATIONS ──
  if (teamCount === 4 && stationCount === 3) {
    if (roundOption === "all_opponents") {
      // 4 Rounds: Teams face all 3 opponents (1v2, 3v4 / 1v3, 2v4 / 1v4, 2v3)
      const matchesPerRound: Array<Array<{ stationIdx: number; tA: number; tB: number }>> = [
        [
          { stationIdx: 0, tA: 1, tB: 2 },
          { stationIdx: 1, tA: 3, tB: 4 },
        ],
        [
          { stationIdx: 1, tA: 1, tB: 3 },
          { stationIdx: 2, tA: 2, tB: 4 },
        ],
        [
          { stationIdx: 0, tA: 1, tB: 4 },
          { stationIdx: 2, tA: 2, tB: 3 },
        ],
        [
          { stationIdx: 0, tA: 2, tB: 3 },
          { stationIdx: 1, tA: 1, tB: 4 },
        ],
      ];

      for (let rIdx = 0; rIdx < matchesPerRound.length; rIdx++) {
        const cells = Array(stationCount).fill("—");
        const activeMatches = matchesPerRound[rIdx];
        activeMatches.forEach(({ stationIdx, tA, tB }) => {
          cells[stationIdx] = `${tA} vs ${tB}`;
        });
        rounds.push({ cells });
      }
    } else {
      // Default: 3 Rounds (Every team visits all 3 stations S0, S1, S2)
      // Path 1 (Teams 1 & 2): S0 -> S1 -> S2
      // Path 2 (Teams 3 & 4): S1 -> S2 -> S0
      const roundMatches: Array<Array<{ stationIdx: number; tA: number; tB: number }>> = [
        // Round 1
        [
          { stationIdx: 0, tA: 1, tB: 2 },
          { stationIdx: 1, tA: 3, tB: 4 },
        ],
        // Round 2
        [
          { stationIdx: 1, tA: 1, tB: 2 },
          { stationIdx: 2, tA: 3, tB: 4 },
        ],
        // Round 3
        [
          { stationIdx: 2, tA: 1, tB: 2 },
          { stationIdx: 0, tA: 3, tB: 4 },
        ],
      ];

      for (let rIdx = 0; rIdx < 3; rIdx++) {
        const cells = Array(stationCount).fill("—");
        roundMatches[rIdx].forEach(({ stationIdx, tA, tB }) => {
          cells[stationIdx] = `${tA} vs ${tB}`;
        });
        rounds.push({ cells });
      }
    }
  } else if (teamCount === 4 && stationCount === 2) {
    // ── SPECIAL CASE: 4 TEAMS & 2 STATIONS (3 rounds) ──
    const roundMatches = [
      [
        { stationIdx: 0, tA: 1, tB: 2 },
        { stationIdx: 1, tA: 3, tB: 4 },
      ],
      [
        { stationIdx: 0, tA: 1, tB: 3 },
        { stationIdx: 1, tA: 2, tB: 4 },
      ],
      [
        { stationIdx: 0, tA: 1, tB: 4 },
        { stationIdx: 1, tA: 2, tB: 3 },
      ],
    ];

    for (let rIdx = 0; rIdx < 3; rIdx++) {
      const cells = Array(stationCount).fill("—");
      roundMatches[rIdx].forEach(({ stationIdx, tA, tB }) => {
        cells[stationIdx] = `${tA} vs ${tB}`;
      });
      rounds.push({ cells });
    }
  } else {
    // ── GENERAL CASE: M TEAMS & K STATIONS ──
    const numRounds = options.roundCount || Math.max(stationCount, Math.ceil(teamCount / 2));
    const allPairRounds = generateRoundRobinPairs(teamCount);

    for (let rIdx = 0; rIdx < numRounds; rIdx++) {
      const cells = Array(stationCount).fill("—");
      const pairs = allPairRounds[rIdx % allPairRounds.length];

      // Assign pairs to available stations
      for (let pIdx = 0; pIdx < pairs.length; pIdx++) {
        // Shift station assignment cyclically per round to rotate teams across stations
        const sIdx = (pIdx + rIdx) % stationCount;
        const [tA, tB] = pairs[pIdx];
        if (cells[sIdx] === "—") {
          cells[sIdx] = `${tA} vs ${tB}`;
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

        // Parse e.g. "1 vs 2" or "1 vs 4"
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
