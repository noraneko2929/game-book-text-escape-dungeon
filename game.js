(() => {
  "use strict";

  const SAVE_KEY = "dungeonEscapeBookSave_v1";

  // 各階層に到達した時点で保存するノード。
  // 第十層から第八層への縦穴ショートカットも第八層の開始地点として扱う。
  const FLOOR_CHECKPOINTS = {
    start: { floor: 10, label: "第十層・闇の底" },
    f9_start: { floor: 9, label: "第九層・骨の回廊" },
    f8_start: { floor: 8, label: "第八層・毒霧の湿地" },
    f8_start_hurt: { floor: 8, label: "第八層・毒霧の湿地（肩を負傷）" },
    f7_start: { floor: 7, label: "第七層・熱の大空洞" },
    f6_start: { floor: 6, label: "第六層・錆びた鉱山" },
    f5_start: { floor: 5, label: "第五層・水没の礼拝堂" },
    f4_start: { floor: 4, label: "第四層・牢獄回廊" },
    f3_start: { floor: 3, label: "第三層・崩れた書庫" },
    f2_start: { floor: 2, label: "第二層・夕日の裂け目" },
    f1_start: { floor: 1, label: "第一層・旧坑道" }
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
  const restartDialog = $("restartDialog");

  let currentNodeId = "start";
  let checkpoint = { nodeId: "start", floor: 10, label: FLOOR_CHECKPOINTS.start.label };

  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !storyData[parsed.nodeId] || !storyData[parsed.checkpoint?.nodeId]) return null;
      return parsed;
    } catch (error) {
      console.warn("セーブデータを読み込めませんでした。", error);
      return null;
    }
  }

  function persist() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        nodeId: currentNodeId,
        checkpoint,
        updatedAt: Date.now()
      }));
      saveLabel.textContent = "自動セーブ済み";
    } catch (error) {
      saveLabel.textContent = "セーブ不可（ブラウザ設定を確認）";
      console.warn("セーブに失敗しました。", error);
    }
  }

  function updateCheckpoint(nodeId) {
    const data = FLOOR_CHECKPOINTS[nodeId];
    if (!data) return;
    checkpoint = { nodeId, floor: data.floor, label: data.label };
  }

  function getFloorFromNode(nodeId, status) {
    if (FLOOR_CHECKPOINTS[nodeId]) return FLOOR_CHECKPOINTS[nodeId].label;
    const match = (status || "").match(/第十層|第九層|第八層|第七層|第六層|第五層|第四層|第三層|第二層|第一層/);
    if (match) return match[0] + (status.includes("・") ? status.slice(status.indexOf("・")) : "");
    if (nodeId.startsWith("escape_")) return "地上";
    if (nodeId.startsWith("gameover_")) return checkpoint.label + "（死亡）";
    return checkpoint.label;
  }

  function render(nodeId) {
    const node = storyData[nodeId];
    if (!node) {
      storyText.textContent = "シナリオデータに存在しない移動先です: " + nodeId;
      choicesEl.innerHTML = "";
      return;
    }

    currentNodeId = nodeId;
    updateCheckpoint(nodeId);

    floorLabel.textContent = getFloorFromNode(nodeId, node.status);
    statusText.textContent = node.status || "状況不明";
    // storyData内のspanはゲームオーバー／エンディングの装飾表示にのみ使用。
    storyText.innerHTML = node.text || "";
    choicesEl.replaceChildren();
    gameOverActions.hidden = !nodeId.startsWith("gameover_");
    clearActions.hidden = !(nodeId.startsWith("escape_") && node.choices.length === 0);
    choiceHeading.hidden = node.choices.length === 0;
    choiceHeading.textContent = nodeId.startsWith("gameover_") ? "次の行動" : "どうする？";

    const progress = nodeId.startsWith("escape_") ? 100 :
      nodeId.startsWith("gameover_") ? ((10 - checkpoint.floor) / 10) * 100 :
      ((10 - checkpoint.floor) / 10) * 100;
    progressBar.style.width = Math.max(0, Math.min(100, progress)) + "%";

    node.choices.forEach((choice) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice-button";
      button.textContent = choice.text;
      button.addEventListener("click", () => {
        if (!storyData[choice.next]) {
          storyText.textContent = "移動先が見つかりません: " + choice.next;
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
    checkpoint = { nodeId: "start", floor: 10, label: FLOOR_CHECKPOINTS.start.label };
    render("start");
    restartDialog.close();
  }

  function retryCheckpoint() {
    render(checkpoint.nodeId);
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
    checkpoint = saved.checkpoint;
    // ゲームオーバー画面を開いていた場合も、そのまま表示する。
    render(currentNodeId);
    saveLabel.textContent = "保存データを復元";
  } else {
    render("start");
  }
})();