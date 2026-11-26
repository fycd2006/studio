import type { LessonPlan, Station } from "@/types/plan";
import { matchAssignee, nicknameKey, readPlanPersonnel, splitPersonnel, type PersonnelRole } from "@/lib/plan-personnel";

export function stationAssignees(
  station: Station,
  role: PersonnelRole,
  linkedPlan: LessonPlan | undefined,
  nicknames: ReadonlyMap<string, string>,
  nicknameIndex?: ReadonlyMap<string, readonly string[]>,
) {
  const stored = role === "lead" ? station.leadAssignees : station.assistantAssignees;
  const names = splitPersonnel(station[role]);
  const legacy = linkedPlan ? readPlanPersonnel(linkedPlan)[role] : [];
  const matchesField = (candidate: string[]) =>
    candidate.length === names.length && candidate.every((name, i) => nicknameKey(name) === nicknameKey(names[i]));

  // Generated legacy stations used the source plan's ID and copied its personnel.
  const fromPlan = matchesField(legacy.map(entry => entry.name)) ||
    matchesField(legacy.map(entry => (entry.uid && nicknames.get(entry.uid)) || entry.name));
  const entries = stored ?? (fromPlan ? legacy : names.map(name => ({ name, uid: null })));
  return entries.map(entry => matchAssignee(entry, nicknameIndex));
}
