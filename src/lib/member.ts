export type MemberRole = "admin" | "crew";
export interface Member {
  uid: string;
  email: string;
  nickname: string;
  role: MemberRole;
  status: "active" | "disabled";
  createdAt: number;
  campGroups?: Record<string, string[]>;
}

export const LEGACY_VERSION_AUTHOR = "舊版作者";

export function resolveMemberNickname(
  nicknames: ReadonlyMap<string, string>,
  uid: string,
  savedName: string | undefined,
  fallback: string,
) {
  const currentName = nicknames.get(uid);
  if (currentName) return currentName;

  const name = savedName?.trim();
  return name && !/^(anonymous|匿名|訪客)$/i.test(name) ? name : fallback;
}
