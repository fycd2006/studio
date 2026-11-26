import { useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { assigneeLabel, keepAssigneeBindings, matchAssignee, nicknameKey, resolveAssigneeWithNickname, splitPersonnel } from "@/lib/plan-personnel";
import type { PlanAssignee } from "@/types/plan";

interface Props {
  label: string;
  value: PlanAssignee[];
  nicknames: ReadonlyMap<string, string>;
  realNames?: ReadonlyMap<string, string>;
  byName: ReadonlyMap<string, readonly string[]> | undefined;
  accountHints: ReadonlyMap<string, string>;
  directoryReady: boolean;
  disabled: boolean;
  onUpdate: (assignees: PlanAssignee[]) => void;
  onFocus: () => void;
  onBlur: () => void;
}

export function PlanAssigneeInput({
  label, value, nicknames, realNames, byName, accountHints, directoryReady, disabled, onUpdate, onFocus, onBlur,
}: Props) {
  const statusId = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const suggestions = useRef<HTMLUListElement>(null);
  const entries = useRef<PlanAssignee[]>([]);
  const displayed = value.map(entry => ({
    ...entry,
    name: entry.uid ? nicknames.get(entry.uid) ?? entry.name : entry.name,
  }));
  const tokens = draft?.split(/[、,，;；]+/) ?? [];
  const entryIndex = tokens.slice(0, activeIndex).filter(token => token.trim()).length;
  const active = entries.current[entryIndex];
  const query = nicknameKey(tokens[activeIndex] ?? "");
  const options = (() => {
    if (!suggestionsOpen || draft === null || !query || !directoryReady) return [];
    const rank = (nickname: string, realName?: string) => {
      const nKey = nicknameKey(nickname);
      const rKey = realName ? nicknameKey(realName) : "";
      if (nKey === query || (rKey && rKey === query)) return 0;
      if (nKey.startsWith(query) || (rKey && rKey.startsWith(query))) return 1;
      return 2;
    };
    const candidates = [...nicknames]
      .map(([uid, nickname]) => ({ uid, nickname, realName: realNames?.get(uid) }))
      .filter(({ nickname, realName }) =>
        nicknameKey(nickname).includes(query) || (!!realName && nicknameKey(realName).includes(query)),
      )
      .sort((a, b) =>
        rank(a.nickname, a.realName) - rank(b.nickname, b.realName) ||
        a.nickname.localeCompare(b.nickname, "zh-Hant"),
      );
    if (
      candidates.length === 1 &&
      active?.uid === candidates[0].uid &&
      nicknameKey(candidates[0].nickname) === query
    ) {
      return [];
    }
    return candidates;
  })();
  const unresolved = directoryReady && byName ? value.filter(entry => !matchAssignee(entry, byName).uid) : [];

  function updateActiveIndex(element: HTMLInputElement) {
    const beforeCursor = element.value.slice(0, element.selectionStart ?? element.value.length);
    setActiveIndex(beforeCursor.split(/[、,，;；]+/).length - 1);
  }

  function choose(uid: string, name: string) {
    tokens[activeIndex] = name;
    const next = tokens.join("、");
    const updated = keepAssigneeBindings(tokens.map(token => token.trim()).filter(Boolean), entries.current);
    updated[entryIndex] = { name, uid };
    entries.current = updated;
    setDraft(next);
    onUpdate(updated);
    input.current?.focus();
    setSuggestionsOpen(false);
  }

  return (
    <div className="relative min-w-0" onBlur={event => {
      if (event.currentTarget.contains(event.relatedTarget)) return;
      if (draft !== null) {
        const matched = entries.current.map(entry => resolveAssigneeWithNickname(entry, nicknames, byName));
        if (matched.some((entry, index) => entry.uid !== entries.current[index].uid || entry.name !== entries.current[index].name)) {
          onUpdate(matched);
        }
      }
      setDraft(null);
      setSuggestionsOpen(false);
      onBlur();
    }} onKeyDown={event => {
      if (event.key === "Escape" && options.length) {
        event.preventDefault();
        input.current?.focus();
        setSuggestionsOpen(false);
      }
    }}>
      <Input
        ref={input}
        aria-label={label}
        aria-describedby={unresolved.length ? statusId : undefined}
        autoComplete="off"
        placeholder="輸入本名或營隊綽號"
        disabled={disabled}
        value={draft ?? displayed.map(entry => entry.name).join("、")}
        onFocus={event => {
          if (draft === null) {
            entries.current = displayed;
            setDraft(event.currentTarget.value);
            setSuggestionsOpen(true);
            onFocus();
          }
          updateActiveIndex(event.currentTarget);
        }}
        onSelect={event => updateActiveIndex(event.currentTarget)}
        onClick={() => setSuggestionsOpen(true)}
        onChange={event => {
          const next = event.currentTarget.value;
          entries.current = keepAssigneeBindings(splitPersonnel(next), entries.current);
          setDraft(next);
          setSuggestionsOpen(true);
          updateActiveIndex(event.currentTarget);
          onUpdate(entries.current);
        }}
        onKeyDown={event => {
          if (event.key === "ArrowDown" && !disabled) {
            event.preventDefault();
            setSuggestionsOpen(true);
            suggestions.current?.querySelector("button")?.focus();
          }
          if (event.key === "Enter") {
            event.preventDefault();
            if (options.length === 1) choose(options[0].uid, options[0].nickname);
            else event.currentTarget.blur();
          }
          if (event.key === "Escape" && !options.length) {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
        className="bg-card"
      />
      {options.length > 0 && (
        <ul ref={suggestions} aria-label={label + "配對建議"}
          className="absolute inset-x-0 top-11 z-20 mt-1 max-h-48 overflow-y-auto overscroll-contain rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg md:top-10">
          {options.map(({ uid, nickname, realName }, index) => (
            <li key={uid}>
              <button type="button" disabled={disabled}
                className="flex min-h-11 w-full flex-wrap content-center items-baseline gap-x-2 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring aria-pressed:bg-primary/10 md:min-h-9"
                aria-pressed={active?.uid === uid}
                onKeyDown={event => {
                  const buttons = Array.from(suggestions.current?.querySelectorAll("button") ?? []);
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    buttons[index + 1]?.focus();
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    if (index === 0) input.current?.focus();
                    else buttons[index - 1]?.focus();
                  }
                }}
                onClick={() => choose(uid, nickname)}>
                <span className="break-all font-medium">{nickname}</span>
                {realName && nicknameKey(realName) !== nicknameKey(nickname) && (
                  <span className="break-all text-xs text-muted-foreground">{realName}</span>
                )}
                {(byName?.get(nicknameKey(nickname))?.length ?? 0) > 1 && (
                  <span className="break-all text-xs text-muted-foreground">
                    {accountHints.get(uid) ?? "帳號"} · {uid.slice(-6)}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {unresolved.length > 0 && (
        <p id={statusId} className="mt-1.5 break-words text-xs leading-relaxed text-amber-800 dark:text-amber-300">
          {unresolved.map(entry => assigneeLabel(entry, nicknames, byName, true)).join("、")}
        </p>
      )}
    </div>
  );
}
