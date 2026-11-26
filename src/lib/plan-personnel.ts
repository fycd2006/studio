import type { LessonPlan, PlanAssignee } from "@/types/plan";
import { stripHtml } from "@/lib/utils";

export type PersonnelRole = "lead" | "assistant";

export function nicknameKey(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

export function splitPersonnel(value?: string) {
  return stripHtml(value).split(/[、,，;；\n]+/).map(name => name.trim()).filter(Boolean);
}

export function keepAssigneeBindings(names: string[], previous: PlanAssignee[]) {
  const candidates = [...previous];
  const nameKeys = names.map(nicknameKey);
  const previousKeys = previous.map(entry => nicknameKey(entry.name));
  return names.map(name => {
    const key = nicknameKey(name);
    const priorCount = previousKeys.filter(value => value === key).length;
    const nextCount = nameKeys.filter(value => value === key).length;
    if (Math.max(priorCount, nextCount) > 1 && priorCount !== nextCount) return { name, uid: null };
    const index = candidates.findIndex(entry => nicknameKey(entry.name) === key);
    const binding = index < 0 ? null : candidates.splice(index, 1)[0];
    return { name, uid: binding?.uid ?? null };
  });
}

export function indexMemberNicknames(
  nicknames: ReadonlyMap<string, string>,
  realNames?: ReadonlyMap<string, string>,
) {
  const byName = new Map<string, string[]>();
  const add = (rawName: string, uid: string) => {
    const key = nicknameKey(rawName);
    if (!key) return;
    const matches = byName.get(key);
    if (matches) {
      if (!matches.includes(uid)) matches.push(uid);
    } else {
      byName.set(key, [uid]);
    }
  };
  for (const [uid, name] of nicknames) add(name, uid);
  if (realNames) {
    for (const [uid, realName] of realNames) add(realName, uid);
  }
  return byName;
}

export function readPlanPersonnel(plan: LessonPlan) {
  const combined = splitPersonnel(plan.members);
  const lead = storedAssignees(plan.leadAssignees, plan.leadMember) ?? (plan.leadMember === undefined
    ? combined.slice(0, 1) : splitPersonnel(plan.leadMember)).map(name => ({ name, uid: null }));
  const assistant = storedAssignees(plan.assistantAssignees, plan.assistantMember) ?? (plan.assistantMember === undefined
    ? combined.slice(1) : splitPersonnel(plan.assistantMember)).map(name => ({ name, uid: null }));
  const other = [...combined];
  for (const name of [...lead, ...assistant].flatMap(entry => splitPersonnel(entry.name))) {
    const index = other.findIndex(value => nicknameKey(value) === nicknameKey(name));
    if (index >= 0) other.splice(index, 1);
  }
  return { lead, assistant, other };
}

function storedAssignees(entries?: PlanAssignee[] | null, savedText?: string) {
  return entries && entries.map(entry => entry.name).join("、") === savedText ? entries : null;
}

export function isAssigneeEdit(updates: Partial<LessonPlan>) {
  return updates.members === undefined &&
    (Array.isArray(updates.leadAssignees) || Array.isArray(updates.assistantAssignees));
}

export function mergePlanUpdate(plan: LessonPlan, updates: Partial<LessonPlan>): LessonPlan {
  if (!isAssigneeEdit(updates)) return { ...plan, ...updates };
  const { lead, assistant, other } = readPlanPersonnel(plan);
  const leadMember = (updates.leadAssignees ?? lead).map(entry => entry.name).join("、");
  const assistantMember = (updates.assistantAssignees ?? assistant).map(entry => entry.name).join("、");
  return {
    ...plan,
    ...updates,
    leadMember: plan.leadMember === undefined ? leadMember : updates.leadMember ?? plan.leadMember,
    assistantMember: plan.assistantMember === undefined ? assistantMember : updates.assistantMember ?? plan.assistantMember,
    members: [leadMember, assistantMember, ...other].filter(Boolean).join("、"),
  };
}

export function matchAssignee(
  assignee: PlanAssignee,
  byName?: ReadonlyMap<string, readonly string[]>,
) {
  if (assignee.uid) return assignee;
  const matches = byName?.get(nicknameKey(assignee.name));
  return matches?.length === 1 ? { ...assignee, uid: matches[0] } : assignee;
}

export function resolveAssigneeWithNickname(
  assignee: PlanAssignee,
  nicknames?: ReadonlyMap<string, string>,
  byName?: ReadonlyMap<string, readonly string[]>,
): PlanAssignee {
  const matched = matchAssignee(assignee, byName);
  return matched.uid
    ? { uid: matched.uid, name: nicknames?.get(matched.uid) ?? matched.name }
    : matched;
}

export function assigneeLabel(
  assignee: PlanAssignee,
  nicknames: ReadonlyMap<string, string> | undefined,
  byName: ReadonlyMap<string, readonly string[]> | undefined,
  showStatus: boolean,
) {
  const match = matchAssignee(assignee, byName);
  if (match.uid) return nicknames?.get(match.uid) ?? match.name;
  if (!showStatus || !byName) return match.name;
  const message = byName.has(nicknameKey(match.name)) ? "同名，請選擇" : "清單中無此人";
  return `${match.name} (${message})`;
}

export function withPersonnelNames(
  plan: LessonPlan,
  nicknames?: ReadonlyMap<string, string>,
  byName?: ReadonlyMap<string, readonly string[]>,
  showStatus = false,
) {
  const { lead, assistant, other } = readPlanPersonnel(plan);
  const label = (entry: PlanAssignee) => assigneeLabel(entry, nicknames, byName, showStatus);
  const leadMember = lead.map(label).join("、");
  const assistantMember = assistant.map(label).join("、");
  return {
    ...plan,
    leadMember,
    assistantMember,
    members: [leadMember, assistantMember, ...other].filter(Boolean).join("、"),
  };
}

export type PlanPersonalRelationship = "lead" | "draft" | "assistant" | "participant";

export function planPersonalRelationship(
  plan: LessonPlan,
  uid: string,
  byName?: ReadonlyMap<string, readonly string[]>,
): PlanPersonalRelationship | undefined {
  const { lead, assistant, other } = readPlanPersonnel(plan);
  const sameAccount = (entry: PlanAssignee) => matchAssignee(entry, byName).uid === uid;
  if (lead.some(sameAccount)) return "lead";
  if (!lead.length && !assistant.length && !other.length && plan.ownerId === uid) return "draft";
  if (assistant.some(sameAccount)) return "assistant";
  if (other.some(name => sameAccount({ name, uid: null }))) return "participant";
}
