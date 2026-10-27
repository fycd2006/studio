/**
 * 行政中心 — 同步計時器
 *
 * 守的業務行為：admin 直接開 `/admin?tab=timer` 就要能在**這一頁**解鎖並操作控制台
 * （設定時長、開始／重設、廣播、輪次），crew 在這一頁看不到任何控制項；一輪自然
 * 跑完之後按「啟動同步」要從設定時長重新倒數，而不是立刻結束；時間到的時候，停在
 * 站內**任何一頁**的裝置都要自己響，而且 crew 的裝置響鈴時**不准寫任何計時器狀態**
 * （GitHub issue #10）。
 *
 * ⚠️ 這支的重點之一是**黑名單**：只驗「admin 看得到解鎖鈕」不會抓到權限洩漏，
 *    也不會抓到「把整條操作列藏起來」這種假修復。所以每一條都成對寫：crew 不該
 *    看到的 `should('not.exist')`，同一個 testid 在它**該出現的地方**必須看得到
 *    （否則 testid 打錯也會「通過」）。
 *
 * ⚠️ 不要用 `cy.clock()`。計時的推進在 `public/timer-worker.js` 這個 Web Worker 裡，
 *    `cy.clock` 凍不住它（worker 有自己的計時器），而且會一併弄壞
 *    `src/hooks/use-server-time.ts` 的時鐘校正 —— 主執行緒停住、worker 繼續跑，
 *    於是測到的是一個不存在的世界。正確作法是**種 `targetEndTime`**（它是絕對的
 *    截止時刻），然後斷言畫面推導出來的結果。
 *
 * 對應實作：src/components/AdminSection.tsx（操作列與鎖）、
 *          src/components/AdminTimer.tsx（控制台與顯示）、
 *          src/lib/timer-context.tsx（狀態與寫入）、
 *          src/lib/timer-state.ts（五個欄位的解讀）
 *
 * 尚未涵蓋（測不到，走 .claude/skills/camp-live-mcp-verify）：真的有聲音、系統通知、
 * 真實的 autoplay 政策、離線響鈴、鎖屏手機響鈴。
 */

import type { CampScenario } from '../../../plugins/firestore';

/** `userSettings/global` 上與計時器有關的欄位。 */
type TimerDoc = {
  id: string;
  duration: number;
  timeLeft: number;
  isRunning: boolean;
  targetEndTime: number;
  updatedAt: number;
};

/** 把畫面上的 `MM:SS`（或 `HH:MM:SS`）換回秒數，才能用範圍斷言。
 *  不用 `have.text` 比對字面值：倒數每 500ms 就動一次，比字面值必然間歇性紅。 */
const remainingSeconds = (text: string): number => {
  const parts = text.trim().split(':').map(Number);
  return parts.length === 3
    ? parts[0] * 3600 + parts[1] * 60 + parts[2]
    : parts[0] * 60 + parts[1];
};

/**
 * 記下**每一則曾經出現過的** toast 文字。
 *
 * ⚠️ 為什麼不能只用 `cy.toastText().should('not.include', ...)` 來驗「不該響」：
 *    toast 幾秒後自己消失，而 `should` 會重試到條件成立 —— 於是「還沒跳出來」
 *    和「跳完已經消失」都會讓 not.include 通過。實測過：這支測試第一版就是這樣
 *    綠的，把斷言反過來寫（改成 `contain.text`）同樣綠，證明它根本不會紅。
 *    改成在 `onBeforeLoad` 掛 MutationObserver 累積紀錄，證據就不會蒸發。
 */
const recordToasts = (win: Cypress.AUTWindow) => {
  const log: string[] = [];
  (win as unknown as { __toastLog: string[] }).__toastLog = log;
  let last = '';
  // 取樣而不是用 MutationObserver：倒數的文字每 500ms 就變一次，觀察整個 body
  // （尤其是加上 characterData）會在幾秒內累積上萬次回呼，實測直接把 Electron
  // renderer 撐爆（"We detected that the Electron Renderer process just crashed"）。
  // 固定取樣 ＋ 只在字串變了才記，記憶體就是常數級。
  win.setInterval(() => {
    const text = win.document.querySelector('[data-testid="toast-viewport"]')?.textContent?.trim() ?? '';
    if (text && text !== last) log.push(text);
    last = text;
  }, 200);
};

/** 累積到現在為止所有 toast 的文字。 */
const toastLog = () =>
  cy.window().then((win) => (win as unknown as { __toastLog?: string[] }).__toastLog ?? []);

/**
 * 等到某一則提示**曾經**出現過。
 *
 * ⚠️ 預算要給得比直覺大：截止時刻是絕對時間，而 `/plans` 要先跑完匿名登入與
 *    Firestore 訂閱才會開始推進計時，實測在 emulator 上可能晚十幾秒才響。
 *    用累積紀錄而不是當下的畫面，就不會因為 toast 只活五秒而錯過。
 */
const expectToastEventually = (needle: string) =>
  cy.window({ timeout: 40000 }).should((win) => {
    const log = (win as unknown as { __toastLog?: string[] }).__toastLog ?? [];
    expect(log.join(' | '), `應該出現提示：${needle}`).to.include(needle);
  });

/** 直接改 `userSettings/global`（沒有 `cy.patchDoc` 包裝，照 camps.cy.ts 的用法走 task）。 */
const seedTimer = (data: Partial<Omit<TimerDoc, 'id'>>) =>
  cy.task('db:patchDoc', {
    collection: 'userSettings',
    id: 'global',
    data: { ...data, updatedAt: Date.now() },
  });

describe('行政中心 — 同步計時器', () => {
  let scenario: CampScenario;

  beforeEach(() => {
    cy.resetDb();
    cy.clearCookies();
    cy.setupCampScenario({ campName: 'E2E 計時營隊' }).then((s) => {
      scenario = s;
    });
  });

  afterEach(() => {
    cy.cleanupCampScenario(scenario.scenarioId);
  });

  it('A1 · admin 直接開計時頁就有解鎖鈕，按一下控制台整組出現', () => {
    cy.loginAs('admin');
    cy.visitApp('/admin?tab=timer', { campId: scenario.campId });

    // 解鎖鈕本來就該在這一頁（issue #10 現象 1：它被整條操作列一起藏掉了）
    cy.getByTestId('admin-lock-toggle').should('be.visible');

    // 預設鎖著：控制台兩塊都不在
    cy.getByTestId('timer-console').should('not.exist');
    cy.getByTestId('timer-broadcast-console').should('not.exist');

    cy.getByTestId('admin-lock-toggle').click();

    // 解鎖後兩塊都要出來（`AdminTimer.tsx` 是兩個獨立的 `!isLocked` 區塊，
    // 只放出其中一塊的話使用者仍然沒有廣播與輪次）
    cy.getByTestId('timer-console').should('be.visible');
    cy.getByTestId('timer-broadcast-console').should('be.visible');
    cy.getByTestId('timer-start').should('be.visible');
    cy.getByTestId('timer-reset').should('be.visible');
  });

  it('A2 · crew 在計時頁看不到解鎖鈕與控制台；但總表頁的行為一個字都沒變', () => {
    cy.loginAs('crew');
    cy.visitApp('/admin?tab=timer', { campId: scenario.campId });

    // 白名單：這一頁真的渲染出來了（排除「整頁沒載入」造成的假通過）
    cy.getByTestId('timer-remaining').should('be.visible');
    // 黑名單：crew 在計時頁不該有控制項
    cy.getByTestId('admin-lock-toggle').should('not.exist');
    cy.getByTestId('timer-console').should('not.exist');
    cy.getByTestId('timer-broadcast-console').should('not.exist');

    // issue 只講計時頁。總表頁對 crew 的行為刻意維持原樣 —— 這一句同時是
    // 「沒有過度隱藏」的證據，也是「上面那些 not.exist 不是 testid 打錯」的對照。
    cy.visitApp('/admin?tab=tables', { campId: scenario.campId });
    cy.getByTestId('admin-lock-toggle').should('be.visible');
  });

  it('B1 · 一輪自然跑完之後按啟動同步，要從設定時長重新倒數，而不是立刻結束', () => {
    // 種子就是「時間到自動停止」留下來的形狀：timeLeft 歸零，而 targetEndTime
    // 停在過去（at-zero 的寫入刻意不清它 —— 那是區分「跑完」與「閒置」的依據）。
    seedTimer({ duration: 300, timeLeft: 0, isRunning: false, targetEndTime: Date.now() - 60_000 });

    cy.loginAs('admin');
    cy.visitApp('/admin?tab=timer', { campId: scenario.campId });
    cy.getByTestId('admin-lock-toggle').click();

    // 前提確認：種子真的落地了，畫面停在 00:00
    cy.getByTestId('timer-remaining').should(($el) => {
      expect(remainingSeconds($el.text()), '開場應該停在 00:00（上一輪剛跑完）').to.eq(0);
    });

    cy.getByTestId('timer-start').click();

    // 使用者視角：真的從設定時長重新倒數
    cy.getByTestId('timer-remaining').should(($el) => {
      expect(
        remainingSeconds($el.text()),
        '按啟動後應從設定時長（300 秒）附近開始倒數，而不是 0',
      ).to.be.greaterThan(240);
    });

    // 資料庫：寫入是 fire-and-forget，畫面對不等於資料庫對（反模式 5）
    cy.dbDocsUntil<TimerDoc>(
      'userSettings',
      (docs) => {
        const g = docs.find((d) => d.id === 'global');
        return !!g && g.isRunning === true && g.targetEndTime - Date.now() > 240_000;
      },
      { reason: 'targetEndTime 應該是「現在 + 設定時長」，不是「現在」' },
    );

    // 持久化：截止時刻在 Firestore，不在本地 state —— 重整後仍在倒數
    cy.reload();
    cy.getByTestId('timer-remaining').should(($el) => {
      expect(remainingSeconds($el.text()), '重整後仍應在倒數').to.be.greaterThan(230);
    });
  });

  it('B2 · 暫停之後按啟動要從剩下的時間續跑，不是跳回設定時長', () => {
    // B1 的對照組：修「跑完後重新開始」時很容易改成「一律從 duration 起算」，
    // 那會把暫停續跑一起弄壞。這一條就是擋那個過頭的修法。
    seedTimer({ duration: 300, timeLeft: 120, isRunning: false, targetEndTime: 0 });

    cy.loginAs('admin');
    cy.visitApp('/admin?tab=timer', { campId: scenario.campId });
    cy.getByTestId('admin-lock-toggle').click();

    cy.getByTestId('timer-remaining').should(($el) => {
      expect(remainingSeconds($el.text()), '暫停中應顯示剩下的 120 秒').to.eq(120);
    });

    cy.getByTestId('timer-start').click();

    cy.getByTestId('timer-remaining').should(($el) => {
      const secs = remainingSeconds($el.text());
      expect(secs, '續跑應該從 120 秒附近開始').to.be.lessThan(125);
      expect(secs, '續跑不該變成 0').to.be.greaterThan(100);
    });
  });

  it('D0 · 使用者沒有要求解鎖音效時，隨便點一下畫面不該被標記成「已解鎖」', () => {
    // 原本的作法是在 document 上掛一個點擊監聽，把 `play()` 的 rejection 吞掉之後
    // 無條件寫入 `camp-audio-unlocked = 'true'`。於是畫面說「音效已解鎖」，
    // 而瀏覽器其實還是拒播 —— issue #10 現象 3 裡「有些裝置不響」的主因。
    cy.loginAs('admin');
    cy.visitApp('/admin?tab=timer', { campId: scenario.campId });

    // 點一個沒有互動行為的地方（倒數數字），模擬使用者只是碰了一下螢幕
    cy.getByTestId('timer-remaining').click();

    cy.getByTestId('timer-audio-status').should(($el) => {
      const text = $el.text();
      expect(text, '沒有要求解鎖，就不該宣稱已解鎖').to.not.include('音效已解鎖');
    });
    cy.window().should((win) => {
      expect(
        win.localStorage.getItem('camp-audio-unlocked'),
        '使用者沒有按解鎖，就不該寫入解鎖旗標',
      ).to.be.null;
    });
  });

  it('C3 · 警報音檔必須是站內資產（離線也要響）', () => {
    // 原本時間到的長警報來源是 raw.githubusercontent.com 的跨網域檔案，
    // 而 public/sw.js 明確跳過非同源請求 → 離線必定播不出來。
    cy.loginAs('admin');
    cy.visitApp('/admin?tab=timer', { campId: scenario.campId });

    // 掃過全部的 <audio>：沒有一個可以指向外部網址。
    // （背景保活用的是 data: URI，它本身就離線可用，所以只擋 http(s)。）
    cy.get('audio').should('have.length.greaterThan', 0);
    cy.get('audio').each(($audio) => {
      const src = ($audio[0] as HTMLAudioElement).getAttribute('src') ?? '';
      expect(src, '音檔不該是外部 CDN').to.not.include('githubusercontent');
      expect(src, '音檔不該從網路上抓').to.not.match(/^https?:/);
    });

    // 兩個警報音檔要指向站內資產（public/sw.js 的 STATIC_ASSETS 有預快取它）
    ['alarm-audio-long', 'alarm-audio-short'].forEach((testId) => {
      cy.getByTestId(testId).should(($audio) => {
        const src = ($audio[0] as HTMLAudioElement).getAttribute('src') ?? '';
        expect(src, `${testId} 應該是站內的相對路徑`).to.match(/^\//);
      });
    });
  });

  it('C1 · crew 停在 /plans，時間到那台裝置要自己響，而且一個欄位都不准寫', () => {
    // 響鈴原本整段寫在 AdminTimer 裡，而它被 Radix 的 TabsContent 包著（沒有
    // forceMount），所以只有 admin 停在計時分頁時才會響。計時狀態其實每一頁都有。
    const endsAt = Date.now() + 6_000;
    seedTimer({ duration: 300, timeLeft: 300, isRunning: true, targetEndTime: endsAt });

    let seededUpdatedAt = 0;
    cy.dbDocs<TimerDoc>('userSettings').then((docs) => {
      seededUpdatedAt = docs.find((d) => d.id === 'global')!.updatedAt;
    });

    cy.loginAs('crew');
    cy.visitApp('/plans', {
      campId: scenario.campId,
      onBeforeLoad: (win) => {
        win.localStorage.setItem('camp-audio-unlocked', 'true');
        recordToasts(win);
      },
    });

    // 前提：人真的在 /plans 上，不是在行政中心
    cy.getByTestId('plans-search-input').should('be.visible');

    // 前提：響鈴宿主真的掛在這一頁上（它渲染 iOS 需要的隱藏音檔元素）
    cy.getByTestId('alarm-audio-long').should('exist');

    // 使用者視角：畫面有講話
    expectToastEventually('換關時間到');

    // 真的有播：`played` 在播完之後仍然保留播放過的區間
    cy.getByTestId('alarm-audio-long').should(($audio) => {
      const el = $audio[0] as HTMLAudioElement;
      expect(el.played.length, '長警報音應該真的播放過').to.be.greaterThan(0);
    });

    // 只響一次。去重的 key 是這一輪的截止時刻，而不是元件裡的 ref ——
    // ref 會跟著元件卸載一起消失，那是「切個分頁回來就重播」的成因。
    toastLog().should((log) => {
      const rings = log.filter((text) => text.includes('換關時間到'));
      expect(rings.length, '時間到只該響一次').to.eq(1);
    });

    // 黑名單：crew 的裝置響鈴不該寫入任何計時器狀態（commit 3f9b307 的約束）。
    // updatedAt 是唯一分得出「沒寫」與「寫了同樣的值」的探針。
    //
    // ⚠️ 只讀一次資料庫**驗不出**這件事：那個寫入是 fire-and-forget（先 getDoc
    //    再 updateDoc），所以響鈴那一刻讀到的還是舊值，權限破口會整條溜過去。
    //    實測過：把 at-zero 寫入的 `role === 'admin'` 拿掉，單次讀取的版本照樣全綠。
    //    證明「沒有發生」需要一段窗口，所以這裡在 3 秒內連續查 6 次 —— 這裡的
    //    cy.wait 是**輪詢間隔**，跟 cy.dbDocsUntil 內部的用法同一個性質。
    Cypress._.range(6).forEach(() => {
      cy.wait(500);
      cy.dbDocs<TimerDoc>('userSettings').then((docs) => {
        const g = docs.find((d) => d.id === 'global')!;
        expect(g.isRunning, 'crew 不該把回合改成停止').to.eq(true);
        expect(g.updatedAt, 'crew 響鈴不該寫入任何欄位').to.eq(seededUpdatedAt);
      });
    });
  });

  it('C4 · admin 在別人開著頁面時啟動新回合，那些裝置不准當場響', () => {
    // 這條是用瀏覽器實跑抓到的，而且是最嚴重的一種：`remaining` 來自 worker
    // 推進的狀態、`targetEndTime` 來自 Firestore 快照，新回合剛被啟動的那一瞬間
    // 兩者不同步 —— 剩餘還是上一輪的 0，截止時刻已經是新的。響鈴宿主的 effect
    // 比 provider 的 tick 先跑，於是看到「剩 0 秒、但截止時刻在兩分鐘後」。
    // 症狀：**每次 admin 按下啟動，所有已經開著頁面的裝置都會立刻被「換關時間到」
    // 炸一次。** 實測 2026-10-27，armed 30 秒的回合在同一秒就響了。
    //
    // ⚠️ 關鍵是「頁面先開著，回合才開始」。先 seed 再開頁驗不出來 ——
    //    那條路徑上 provider 的 tick 來得及先算好剩餘秒數。
    seedTimer({ duration: 300, timeLeft: 0, isRunning: false, targetEndTime: Date.now() - 60_000 });

    cy.loginAs('crew');
    cy.visitApp('/plans', {
      campId: scenario.campId,
      onBeforeLoad: (win) => {
        win.localStorage.setItem('camp-audio-unlocked', 'true');
        recordToasts(win);
      },
    });
    cy.getByTestId('plans-search-input').should('be.visible');
    cy.getByTestId('alarm-audio-long').should('exist');

    // ⚠️ 這是兩個 effect 之間的競態（宿主的 effect 比 provider 的 tick 先跑），
    //    所以單跑一次只有機率會中。連做三輪「上一輪結束 → 啟動新回合」的轉換，
    //    把抓到的機率拉高 —— 實測拿掉防線後這樣跑會紅在「不該響時間到」。
    Cypress._.range(3).forEach((i) => {
      // 先回到「上一輪剛結束」的形狀：剩餘 0、截止時刻在過去
      cy.then(() => {
        const now = Date.now();
        return cy.task('db:patchDoc', {
          collection: 'userSettings',
          id: 'global',
          data: { isRunning: false, timeLeft: 0, targetEndTime: now - 60_000, updatedAt: now },
        });
      });
      cy.dbDocsUntil<TimerDoc>(
        'userSettings',
        (docs) => docs.find((d) => d.id === 'global')?.isRunning === false,
        { attempts: 10, intervalMs: 300, reason: `第 ${i + 1} 輪：先回到已結束的狀態` },
      );

      // 頁面開著的狀態下，admin 那台啟動一個還很久才結束的新回合
      cy.then(() => {
        const now = Date.now();
        return cy.task('db:patchDoc', {
          collection: 'userSettings',
          id: 'global',
          data: { isRunning: true, timeLeft: 300, targetEndTime: now + 120_000, updatedAt: now },
        });
      });
      cy.dbDocsUntil<TimerDoc>(
        'userSettings',
        (docs) => docs.find((d) => d.id === 'global')?.isRunning === true,
        { attempts: 10, intervalMs: 300, reason: `第 ${i + 1} 輪：新回合應該已經寫進去了` },
      );
    });

    // 再輪詢幾秒，給誤觸發最後的機會
    cy.dbDocsUntil<TimerDoc>(
      'userSettings',
      (docs) => !!docs.find((d) => d.id === 'global'),
      { attempts: 8, intervalMs: 500, reason: '收尾輪詢' },
    );

    toastLog().should((log) => {
      expect(log.join(' | '), '回合才剛開始、還有兩分鐘，不該響「時間到」').to.not.include('換關時間到');
    });
  });

  it('A3 · 計時頁不該出現「匯出」（它匯出的是輪替表與道具）；總表頁要有', () => {
    cy.loginAs('admin');
    cy.visitApp('/admin?tab=timer', { campId: scenario.campId });
    cy.getByTestId('admin-action-bar').should('be.visible');
    cy.getByTestId('admin-export-trigger').should('not.exist');

    cy.visitApp('/admin?tab=tables', { campId: scenario.campId });
    cy.getByTestId('admin-export-trigger').should('be.visible');
  });
});
