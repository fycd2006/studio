// Timer Web Worker
// Runs independently of the main thread to avoid browser throttling
// when the tab is in the background.

let targetEndTime = 0;
let timeOffset = 0;
let tickInterval = null;
let lastMilestones = new Set();

function getCorrectedNow() {
  return Date.now() + timeOffset;
}

function tick() {
  if (!targetEndTime) return;

  const now = getCorrectedNow();
  const remaining = Math.max(0, Math.floor((targetEndTime - now) / 1000));

  // Send remaining time to main thread
  self.postMessage({ type: "tick", remaining });

  // Check milestones
  if (remaining <= 3 && remaining > 0 && !lastMilestones.has("pre-wake")) {
    self.postMessage({ type: "milestone", milestone: "pre-wake", remaining });
    lastMilestones.add("pre-wake");
  }

  if (remaining === 0 && !lastMilestones.has("end")) {
    self.postMessage({ type: "milestone", milestone: "end", remaining: 0 });
    lastMilestones.add("end");
  }
}

self.addEventListener("message", function (e) {
  const { type, data } = e.data;

  switch (type) {
    case "start":
      targetEndTime = data.targetEndTime;
      timeOffset = data.timeOffset || 0;
      lastMilestones = new Set();

      // Clear any existing interval
      if (tickInterval) clearInterval(tickInterval);

      // Tick every 500ms for accuracy
      tick();
      tickInterval = setInterval(tick, 500);
      console.log("[TimerWorker] started, targetEndTime:", targetEndTime, "offset:", timeOffset);
      break;

    case "stop":
      if (tickInterval) {
        clearInterval(tickInterval);
        tickInterval = null;
      }
      targetEndTime = 0;
      lastMilestones = new Set();
      console.log("[TimerWorker] stopped");
      break;

    case "updateOffset":
      timeOffset = data.timeOffset || 0;
      break;

    default:
      break;
  }
});
