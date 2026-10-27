/**
 * 音效解鎖狀態要如實（issue #10 預期 3）
 *
 * 守的業務行為：重新整理之後如果瀏覽器要求重新授權音效，畫面要如實顯示
 * 「點一下以啟用音效」，**不能誤顯示為已解鎖** —— 現場的人會因為看到「已解鎖」
 * 而以為會響，結果時間到一片安靜。
 *
 * ⚠️ 為什麼這支在 `e2e_fixture/` 而不是 `feature_test/`：它**偽造平台行為**。
 *    Cypress 的 Chrome 帶著 `--autoplay-policy=no-user-gesture-required` 啟動，
 *    所以「瀏覽器拒播」這件事在真實的測試執行裡根本不會發生；而真正會拒播的
 *    iOS Safari，Cypress 開不了。這裡用 `onBeforeLoad` 換掉 `AudioContext` 與
 *    `HTMLMediaElement.prototype.play`，把一個只在真機上出現的狀態變成必然。
 *    同一個理由、同一個手法見 `auth-race.cy.ts`（那支延遲匿名登入 4 秒）。
 *
 * 對應實作：src/lib/alarm-audio.ts（意願與能力分開）、
 *          src/components/AdminTimer.tsx（狀態卡的文字）
 *
 * 測不到的部分（走 .claude/skills/camp-live-mcp-verify）：真實的 autoplay 政策、
 * iOS Safari 沒有 `navigator.userActivation` 時只能靠 `play()` 探針的那條路徑。
 */

import type { CampScenario } from '../plugins/firestore';

/** 一個永遠停在 suspended、`resume()` 會被拒絕的瀏覽器。 */
const refusePlayback = (win: Cypress.AUTWindow) => {
  class RefusingAudioContext {
    state = 'suspended';
    currentTime = 0;
    destination = {};
    resume() {
      return Promise.reject(new Error('NotAllowedError'));
    }
    close() {
      return Promise.resolve();
    }
    createOscillator() {
      return { type: '', frequency: { value: 0 }, connect() {}, start() {}, stop() {} };
    }
    createGain() {
      return {
        gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect() {},
      };
    }
  }
  const w = win as unknown as Record<string, unknown>;
  w.AudioContext = RefusingAudioContext;
  w.webkitAudioContext = RefusingAudioContext;
  win.HTMLMediaElement.prototype.play = () => Promise.reject(new Error('NotAllowedError'));
};

describe('音效解鎖狀態如實', () => {
  let scenario: CampScenario;

  beforeEach(() => {
    cy.resetDb();
    cy.clearCookies();
    cy.setupCampScenario({ campName: 'E2E 音效營隊' }).then((s) => {
      scenario = s;
    });
  });

  afterEach(() => {
    cy.cleanupCampScenario(scenario.scenarioId);
  });

  it('D1 · 瀏覽器拒播時要說「點一下以啟用音效」，而且不准改掉使用者的意願', () => {
    cy.loginAs('admin');
    cy.visitApp('/admin?tab=timer', {
      campId: scenario.campId,
      onBeforeLoad: (win) => {
        // 使用者上次有解鎖過（意願留著），但這個 document 還沒被使用者啟動
        win.localStorage.setItem('camp-audio-unlocked', 'true');
        refusePlayback(win);
      },
    });

    cy.getByTestId('timer-audio-status').should(($el) => {
      const text = $el.text();
      expect(text, '瀏覽器拒播時要如實告訴使用者該點一下').to.include('點一下以啟用音效');
      expect(text, '不准宣稱已解鎖').to.not.include('音效已解鎖');
    });

    // 意願是使用者的選擇，不該被一次探測失敗抹掉 —— 否則他得再去找一次開關，
    // 而實際上他只需要碰一下螢幕。
    cy.window().should((win) => {
      expect(
        win.localStorage.getItem('camp-audio-unlocked'),
        '探測失敗只影響「能力」，不該改掉「意願」',
      ).to.eq('true');
    });
  });

  it('D3 · 靜音的預喚醒通知不准帶震動樣式（否則整個通知會靜靜失敗）', () => {
    // 這條是實跑抓到的。Chrome 對 `showNotification` 有一條規則：
    // silent 的通知**不准**同時帶 vibrate，否則直接 throw
    //   `Silent notifications must not specify vibration patterns`
    // 而那是在 promise 裡丟出來的 —— 沒有人 catch，所以「時間到前幾秒的預喚醒
    // 通知」會整個靜靜失敗。那組通知的用途正是把手機螢幕叫醒，壞了不會有人發現。
    //
    // 要跑到這一行需要通知權限，所以這裡把平台整個換掉：權限直接是 granted，
    // 而 showNotification 用和 Chrome 一樣的規則檢查，壞掉就當場炸。
    cy.loginAs('admin');
    cy.visitApp('/admin?tab=timer', {
      campId: scenario.campId,
      onBeforeLoad: (win) => {
        win.localStorage.setItem('camp-audio-unlocked', 'true');
        const calls: Array<{ title: string; options: Record<string, unknown> }> = [];
        (win as unknown as { __notifications: typeof calls }).__notifications = calls;

        const fakeNotification = function () {} as unknown as typeof Notification;
        Object.defineProperty(fakeNotification, 'permission', { get: () => 'granted' });
        Object.defineProperty(fakeNotification, 'requestPermission', {
          value: () => Promise.resolve('granted'),
        });
        Object.defineProperty(win, 'Notification', { value: fakeNotification, configurable: true });

        const registration = {
          showNotification: (title: string, options: Record<string, unknown>) => {
            calls.push({ title, options });
            // Chrome 自己的規則，照抄
            if (options.silent && options.vibrate) {
              throw new TypeError('Silent notifications must not specify vibration patterns.');
            }
            return Promise.resolve();
          },
        };
        Object.defineProperty(win.navigator.serviceWorker, 'ready', {
          get: () => Promise.resolve(registration),
          configurable: true,
        });
      },
    });

    // 開一個 5 秒後結束的回合：會經過「剩 3 秒」的靜音預喚醒里程碑
    cy.then(() => {
      const now = Date.now();
      return cy.task('db:patchDoc', {
        collection: 'userSettings',
        id: 'global',
        data: { duration: 300, timeLeft: 300, isRunning: true, targetEndTime: now + 5_000, updatedAt: now },
      });
    });

    // 白名單：真的有送出靜音通知（否則下面的 not 斷言是空的）
    cy.window({ timeout: 30000 }).should((win) => {
      const calls = (win as unknown as { __notifications: Array<{ options: Record<string, unknown> }> }).__notifications;
      const silent = calls.filter((c) => c.options.silent);
      expect(silent.length, '應該送出過靜音的預喚醒通知').to.be.greaterThan(0);
      silent.forEach((c) => {
        expect(c.options.vibrate, '靜音通知不准帶 vibrate').to.be.undefined;
      });
    });
  });

  it('D2 · 同一個世界、不攔播放時要顯示已解鎖（證明 D1 不是選擇器打錯）', () => {
    cy.loginAs('admin');
    cy.visitApp('/admin?tab=timer', {
      campId: scenario.campId,
      onBeforeLoad: (win) => {
        win.localStorage.setItem('camp-audio-unlocked', 'true');
      },
    });

    cy.getByTestId('timer-audio-status').should(($el) => {
      const text = $el.text();
      expect(text, '瀏覽器允許播放時就該顯示已解鎖').to.include('音效已解鎖');
      expect(text, '這時候不該再要求使用者點一下').to.not.include('點一下以啟用音效');
    });
  });
});
