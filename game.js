(() => {
  "use strict";

  const SAVE_KEY = "dungeonEscapeBookSave_v1";
  const SAVE_VERSION = 2;
  const START_NODE_ID = "start";
  const FLOOR_NAMES = {
    10: "第十層", 9: "第九層", 8: "第八層", 7: "第七層", 6: "第六層",
    5: "第五層", 4: "第四層", 3: "第三層", 2: "第二層", 1: "第一層"
  };

  // 旧セーブの移行時だけ使用する。通常プレイ中のチェックポイント管理には使わない。
  const LEGACY_FLOOR_CHECKPOINTS = {
    10: "start_3", 9: "f9_start", 8: "f8_start", 7: "f7_start",
    6: "f6_start", 5: "f5_start", 4: "f4_start", 3: "f3_start",
    2: "f2_start", 1: "f1_start"
  };

  const ENDING_LABELS = {
    true: "夜明けの生還",
    normal: "泥まみれの生還",
    gamble: "賭けの勝利"
  };

  const $ = (id) => document.getElementById(id);
  const floorLabel = $("floorLabel");
  const saveLabel = $("saveLabel");
  const progressBar = $("progressBar");
  const statusText = $("statusText");
  const storyText = $("storyText");
  const choicesEl = $("choices");
  const choiceHeading = $("choiceHeading");
  const gameOverActions = $("gameOverActions");
  const clearActions = $("clearActions");
  const clearNote = clearActions.querySelector(".end-note");
  const restartDialog = $("restartDialog");

  let currentNodeId = START_NODE_ID;
  let checkpointId = START_NODE_ID; // checkpoint未到達時のみ使う初期値
  let currentFloor = 10;
  let shuffleSeed = createSeed();

  function createSeed() {
    const values = new Uint32Array(1);
    if (window.crypto && typeof window.crypto.getRandomValues === "function") {
      window.crypto.getRandomValues(values);
      return values[0] >>> 0;
    }
    return Math.floor(Math.random() * 0x100000000) >>> 0;
  }

  // FNV-1a: seed と nodeId からノード固有の乱数シードを作る。
  function hashSeedAndNode(seed, nodeId) {
    const value = `${seed}:${nodeId}`;
    let hash = 0x811c9dc5;
    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
  }

  function createRandom(seed) {
    let state = seed >>> 0;
    return () => {
      state = (state + 0x6D2B79F5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function getChoicesForDisplay(nodeId, node) {
    const choices = [...node.choices];
    if (node.type !== "normal" || choices.length < 2) return choices;

    const random = createRandom(hashSeedAndNode(shuffleSeed, nodeId));
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    return choices;
  }

  function isActualCheckpoint(nodeId) {
    return Boolean(storyData[nodeId] && storyData[nodeId].type === "normal" && storyData[nodeId].checkpoint === true);
  }

  function isValidCheckpointTarget(nodeId) {
    // start は、どの checkpoint にも未到達の場合だけ使う初期再開地点。
    return nodeId === START_NODE_ID || isActualCheckpoint(nodeId);
  }

  function getLegacyFloor(parsed, currentNode) {
    const candidates = [
      parsed.checkpoint && parsed.checkpoint.floor,
      parsed.currentFloor,
      currentNode && currentNode.floor
    ];
    return candidates.find((floor) => Number.isInteger(floor) && floor >= 1 && floor <= 10) || null;
  }

  function migrateSave(parsed) {
    if (!parsed || typeof parsed !== "object") return null;

    let migrated = false;
    const storedNodeId = typeof parsed.nodeId === "string" ? parsed.nodeId : START_NODE_ID;
    let restoredCheckpointId = parsed.checkpointId;

    const isCurrentFormatStart = parsed.version === SAVE_VERSION && restoredCheckpointId === START_NODE_ID;
    if (!isActualCheckpoint(restoredCheckpointId) && !isCurrentFormatStart) {
      const legacyCheckpointId = parsed.checkpoint && parsed.checkpoint.nodeId;
      if (isActualCheckpoint(legacyCheckpointId)) {
        restoredCheckpointId = legacyCheckpointId;
      } else {
        const legacyFloor = getLegacyFloor(parsed, storyData[storedNodeId]);
        restoredCheckpointId = legacyFloor ? (LEGACY_FLOOR_CHECKPOINTS[legacyFloor] || START_NODE_ID) : START_NODE_ID;
      }
      migrated = true;
    }

    if (!isValidCheckpointTarget(restoredCheckpointId)) {
      restoredCheckpointId = START_NODE_ID;
      migrated = true;
    }

    let restoredNodeId = storedNodeId;
    if (!storyData[restoredNodeId]) {
      restoredNodeId = isValidCheckpointTarget(restoredCheckpointId) ? restoredCheckpointId : START_NODE_ID;
      migrated = true;
      console.warn(`[Save migration] 保存中のノードID "${storedNodeId}" が現行シナリオにないため、${restoredNodeId} へ移行しました。`);
    }

    let restoredFloor = parsed.currentFloor;
    if (!Number.isInteger(restoredFloor) || restoredFloor < 1 || restoredFloor > 10) {
      const node = storyData[restoredNodeId];
      restoredFloor = node && Number.isInteger(node.floor)
        ? node.floor
        : (getLegacyFloor(parsed, node) || 10);
      migrated = true;
    }

    let restoredSeed = parsed.shuffleSeed;
    if (!Number.isInteger(restoredSeed) || restoredSeed < 0 || restoredSeed > 0xffffffff) {
      restoredSeed = createSeed();
      migrated = true;
    }

    if (parsed.version !== SAVE_VERSION) migrated = true;

    return {
      nodeId: restoredNodeId,
      checkpointId: restoredCheckpointId,
      currentFloor: restoredFloor,
      shuffleSeed: restoredSeed >>> 0,
      version: SAVE_VERSION,
      updatedAt: parsed.updatedAt || Date.now(),
      migrated
    };
  }

  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const migrated = migrateSave(parsed);
      if (!migrated) return null;
      return migrated;
    } catch (error) {
      console.warn("セーブデータを読み込めませんでした。新規ゲームを開始します。", error);
      return null;
    }
  }

  function persist() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        version: SAVE_VERSION,
        nodeId: currentNodeId,
        checkpointId,
        currentFloor,
        shuffleSeed,
        updatedAt: Date.now()
      }));
      saveLabel.textContent = "自動セーブ済み";
    } catch (error) {
      saveLabel.textContent = "セーブ不可（ブラウザ設定を確認）";
      console.warn("セーブに失敗しました。", error);
    }
  }

  function updateProgress(node) {
    if (node.type === "ending") {
      progressBar.style.width = "100%";
      return;
    }
    const floor = node.type === "gameover" && Number.isInteger(node.floor)
      ? node.floor
      : currentFloor;
    const progress = ((10 - floor) / 10) * 100;
    progressBar.style.width = `${Math.max(0, Math.min(100, progress))}%`;
  }

  function getFloorLabel(node) {
    if (node.type === "ending") return "地上";
    const floor = Number.isInteger(node.floor) ? node.floor : currentFloor;
    const label = FLOOR_NAMES[floor] || "階層不明";
    return node.type === "gameover" ? `${label}（死亡）` : label;
  }

  function render(nodeId) {
    const node = storyData[nodeId];
    if (!node) {
      const fallback = isValidCheckpointTarget(checkpointId) ? checkpointId : START_NODE_ID;
      console.warn(`[Engine] 存在しないノードID "${nodeId}" を ${fallback} に置き換えました。`);
      render(fallback);
      return;
    }

    currentNodeId = nodeId;
    if (node.type === "normal") {
      currentFloor = node.floor;
      if (node.checkpoint === true) checkpointId = nodeId;
    }

    floorLabel.textContent = getFloorLabel(node);
    statusText.textContent = node.status || "状況不明";
    // storyData内のspanはシナリオで指定された装飾表示に使用。
    storyText.innerHTML = node.text || "";
    choicesEl.replaceChildren();

    const isGameOver = node.type === "gameover";
    const isEnding = node.type === "ending";
    gameOverActions.hidden = !isGameOver;
    clearActions.hidden = !(isEnding && node.choices.length === 0);
    clearActions.dataset.endingId = isEnding ? node.endingId : "";
    if (isEnding && clearNote) {
      clearNote.textContent = `${ENDING_LABELS[node.endingId] || "生還"}を果たした。`;
    }

    choiceHeading.hidden = node.choices.length === 0;
    choiceHeading.textContent = isGameOver ? "次の行動" : "どうする？";
    updateProgress(node);

    const displayChoices = getChoicesForDisplay(nodeId, node);
    displayChoices.forEach((choice) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice-button";
      button.textContent = choice.text;
      button.addEventListener("click", () => {
        if (!storyData[choice.next]) {
          storyText.textContent = "移動先が見つかりません: " + choice.next;
          console.error(`[Engine] ${nodeId} からの移動先が存在しません: ${choice.next}`);
          return;
        }
        render(choice.next);
      });
      choicesEl.appendChild(button);
    });

    persist();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startNewGame() {
    localStorage.removeItem(SAVE_KEY);
    currentNodeId = START_NODE_ID;
    checkpointId = START_NODE_ID;
    currentFloor = 10;
    shuffleSeed = createSeed();
    render(START_NODE_ID);
    restartDialog.close();
  }

  function retryCheckpoint() {
    const target = isValidCheckpointTarget(checkpointId) ? checkpointId : START_NODE_ID;
    render(target);
  }

  $("restartButton").addEventListener("click", () => restartDialog.showModal());
  $("confirmRestartButton").addEventListener("click", (event) => {
    event.preventDefault();
    startNewGame();
  });
  $("retryButton").addEventListener("click", retryCheckpoint);
  $("newGameButton").addEventListener("click", startNewGame);

  const saved = loadSave();
  if (saved) {
    currentNodeId = saved.nodeId;
    checkpointId = saved.checkpointId;
    currentFloor = saved.currentFloor;
    shuffleSeed = saved.shuffleSeed;
    render(currentNodeId);
    if (saved.migrated) {
      saveLabel.textContent = "旧セーブを新形式へ移行しました";
      console.warn("[Save migration] 旧セーブを新形式へ移行しました。", {
        nodeId: currentNodeId, checkpointId, currentFloor, shuffleSeed
      });
    } else {
      saveLabel.textContent = "保存データを復元";
    }
  } else {
    render(START_NODE_ID);
  }
})();