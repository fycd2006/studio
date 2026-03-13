/**
 * Simple text diff utility using word-level comparison.
 * Produces an array of diff segments showing additions, deletions, and unchanged text.
 */

export interface DiffSegment {
  type: 'same' | 'add' | 'remove';
  text: string;
}

/**
 * Computes a word-level diff between two strings.
 * Returns an array of DiffSegments indicating what changed.
 */
export function computeDiff(oldText: string, newText: string): DiffSegment[] {
  if (oldText === newText) return [{ type: 'same', text: oldText }];
  if (!oldText) return [{ type: 'add', text: newText }];
  if (!newText) return [{ type: 'remove', text: oldText }];

  const oldWords = tokenize(oldText);
  const newWords = tokenize(newText);

  // Build LCS table
  const m = oldWords.length;
  const n = newWords.length;
  
  // Use space-optimized approach for large texts
  if (m * n > 1_000_000) {
    return simpleDiff(oldText, newText);
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build diff
  const result: DiffSegment[] = [];
  let i = m, j = n;

  const segments: DiffSegment[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      segments.unshift({ type: 'same', text: oldWords[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      segments.unshift({ type: 'add', text: newWords[j - 1] });
      j--;
    } else {
      segments.unshift({ type: 'remove', text: oldWords[i - 1] });
      i--;
    }
  }

  // Merge consecutive segments of the same type
  for (const seg of segments) {
    const last = result[result.length - 1];
    if (last && last.type === seg.type) {
      last.text += seg.text;
    } else {
      result.push({ ...seg });
    }
  }

  return result;
}

/**
 * Tokenize text into words while preserving whitespace and punctuation as separate tokens.
 */
function tokenize(text: string): string[] {
  return text.match(/\S+|\s+/g) || [];
}

/**
 * Simple fallback diff for very large texts - just shows old as removed, new as added.
 */
function simpleDiff(oldText: string, newText: string): DiffSegment[] {
  return [
    { type: 'remove', text: oldText },
    { type: 'add', text: newText },
  ];
}

/**
 * Computes a summary of changes between two plan snapshots.
 * Returns a human-readable list of changed field names.
 */
export function getChangedFields(
  oldPlan: Record<string, any>,
  newPlan: Record<string, any>
): string[] {
  const fieldLabels: Record<string, string> = {
    activityName: '活動名稱',
    scheduledName: '類別',
    members: '教案成員',
    time: '教案時間',
    location: '教案地點',
    purpose: '教案目的',
    process: '教案流程',
    content: '詳細內容',
    divisionOfLabor: '人力分工',
    remarks: '備註事項',
    openingClosingRemarks: '開場與結語',
    props: '道具需求',
    canvasData: '畫板',
  };

  const changed: string[] = [];
  for (const key of Object.keys(fieldLabels)) {
    const oldVal = JSON.stringify(oldPlan[key] || '');
    const newVal = JSON.stringify(newPlan[key] || '');
    if (oldVal !== newVal) {
      changed.push(fieldLabels[key]);
    }
  }
  return changed;
}
