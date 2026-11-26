import type { RotationTableData, Station, TeamOrder } from "@/types/plan";

export const REST = "—";

export function teamKey(name: string) {
  const text = name.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
  const numbered = text.match(/^(?:第\s*(\d+)\s*小隊|team\s*(\d+)|(\d+))$/);
  return numbered ? String(Number(numbered[1] || numbered[2] || numbered[3])) : text;
}

function tokens(cell: string) {
  if (!cell || cell === REST) return [];
  return cell.split(/\s+(?:vs\.?)\s+|[、,，]/i).map(part => part.trim()).filter(Boolean);
}

export function teamInCell(cell: string, team: TeamOrder) {
  return tokens(cell).some(token => teamKey(token) === teamKey(team.name));
}

export function stationForValue(stations: Station[], raw: string) {
  const value = raw.trim();
  if (!value) return undefined;
  const idMatch = stations.find(station => station.id === value);
  if (idMatch) return idMatch;
  const exact = stations.filter(station => station.name.trim() === value);
  if (exact.length) return exact.length === 1 ? exact[0] : undefined;
  const name = value.replace(/\s*[(（]vs\.?\s*\d+[)）]$/i, "").trim();
  const matches = stations.filter(station => station.name.trim() === name);
  return matches.length === 1 ? matches[0] : undefined;
}

export function rotationStop(table: RotationTableData, team: TeamOrder, round: number) {
  const raw = team.stations?.[round]?.trim() || "";
  let station = stationForValue(table.stations, raw);
  if (!raw) {
    const matches = table.stations.filter((_, i) => teamInCell(table.rounds[round]?.cells[i] || "", team));
    if (matches.length === 1) station = matches[0];
    if (matches.length > 1) return { station, label: "待確認", detail: "同輪有多個關卡" };
  }
  if (station) {
    const cell = table.rounds[round]?.cells[table.stations.indexOf(station)] || "";
    const opponents = tokens(cell).filter(token => teamKey(token) !== teamKey(team.name));
    const detail = teamInCell(cell, team) && opponents.length
      ? "vs " + opponents.join("、")
      : raw === station.name ? "" : raw.match(/[(（](vs\.?\s*\d+)[)）]$/i)?.[1] || "";
    return { station, label: station.name || "未命名關卡", detail };
  }
  if ([REST, "休息", "輪空"].includes(raw)) return { station, label: "休息", detail: "" };
  return { station, label: raw ? "待確認" : "待安排", detail: raw };
}

export function stopText(stop: ReturnType<typeof rotationStop>) {
  return stop.detail ? `${stop.label}（${stop.detail}）` : stop.label;
}

function replaceSlot(team: TeamOrder, round: number, value: string) {
  const stations = Array.from({ length: Math.max(team.stations?.length || 0, round + 1) },
    (_, index) => index === round ? value : team.stations?.[index] || "");
  return { ...team, stations };
}

function withoutTeam(cell: string, team: TeamOrder) {
  if (!teamInCell(cell, team)) return cell;
  return tokens(cell).filter(token => teamKey(token) !== teamKey(team.name)).join(" vs ");
}

export function assignTeam(table: RotationTableData, team: TeamOrder, round: number, value: string) {
  const cells = table.stations.map((station, index) => {
    const other = withoutTeam(table.rounds[round].cells[index] || "", team);
    if (station.id !== value) return other;
    return [...tokens(other), team.name].join(" vs ");
  });
  return {
    rounds: table.rounds.map((item, i) => i === round ? { cells } : item),
    teamOrders: table.teamOrders.map(item => item.id === team.id ? replaceSlot(item, round, value) : item),
  };
}

export function assignStationCell(table: RotationTableData, round: number, column: number, value: string) {
  const station = table.stations[column];
  const assigned = table.teamOrders.filter(team => teamInCell(value, team));
  const cells = table.stations.map((_, i) => {
    if (i === column) return value;
    const cell = table.rounds[round].cells[i] || "";
    return assigned.reduce((text, team) => withoutTeam(text, team), cell);
  });
  return {
    rounds: table.rounds.map((item, i) => i === round ? { cells } : item),
    teamOrders: table.teamOrders.map(team => {
      if (assigned.includes(team)) return replaceSlot(team, round, station.id);
      if (rotationStop(table, team, round).station?.id === station.id) return replaceSlot(team, round, "");
      return team;
    }),
  };
}

// Preserve a team's position in the station grid when its display name changes.
export function editTeam(table: RotationTableData, team: TeamOrder, name: string | null) {
  return {
    rounds: table.rounds.map(round => ({ cells: round.cells.map(cell => {
      if (!teamInCell(cell, team)) return cell;
      if (name === null) return withoutTeam(cell, team);
      return tokens(cell).map(token => teamKey(token) === teamKey(team.name) ? name : token).join(" vs ");
    }) })),
    teamOrders: name === null ? table.teamOrders.filter(item => item.id !== team.id)
      : table.teamOrders.map(item => item.id === team.id ? { ...item, name } : item),
  };
}
