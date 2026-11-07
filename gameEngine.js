/**
 * gameEngine.js
 * ゲームの描画・状態管理ライブラリ
 */
class EscapeGameEngine {
    constructor(storyData, config = {}) {
        this.storyData = storyData;
        this.textDisplayId = config.textDisplayId || 'text-display';
        this.choiceDisplayId = config.choiceDisplayId || 'choice-display';
        this.statusBadgeId = config.statusBadgeId || 'status-badge';
        this.startSceneKey = config.startSceneKey || 'start';
        this.saveKey = config.saveKey || 'escape_game_current_scene';
        this.checkpointKey = config.saveKey + '_checkpoint';
        this.lastSceneKey = null;
    }

    init() {
        // 保存されたセーブデータがあればロード、なければ最初から
        const savedScene = localStorage.getItem(this.saveKey);
        const targetScene = (savedScene && this.storyData[savedScene]) ? savedScene : this.startSceneKey;
        this.renderScene(targetScene, false);
    }

    renderScene(sceneKey, isUserChoice = true) {
        const scene = this.storyData[sceneKey];
        if (!scene) {
            console.error(`Scene not found: ${sceneKey}`);
            return;
        }

        // 選択肢がある通常シーンへの遷移時、直前の選択肢（チェックポイント）を更新
        if (isUserChoice && this.lastSceneKey && this.storyData[this.lastSceneKey]?.choices?.length > 0) {
            localStorage.setItem(this.checkpointKey, this.lastSceneKey);
        }

        // 現在のシーンキーをLocalStorageに自動保存
        localStorage.setItem(this.saveKey, sceneKey);

        // テキスト・ステータス表示の更新
        const textDisplay = document.getElementById(this.textDisplayId);
        const statusBadge = document.getElementById(this.statusBadgeId);

        if (textDisplay) textDisplay.innerHTML = scene.text;
        if (statusBadge) statusBadge.innerText = scene.status;

        // 選択肢ボタンエリアの初期化
        const choiceDisplay = document.getElementById(this.choiceDisplayId);
        if (!choiceDisplay) return;

        choiceDisplay.innerHTML = '';

        const hasChoices = scene.choices && scene.choices.length > 0;

        if (hasChoices) {
            // 通常の選択肢ボタンの動的生成
            scene.choices.forEach(choice => {
                const button = document.createElement('button');
                button.className = 'btn';
                button.innerText = choice.text;
                button.onclick = () => {
                    this.lastSceneKey = sceneKey;
                    this.renderScene(choice.next, true);
                };
                choiceDisplay.appendChild(button);
            });
        } else {
            // 【ゲームオーバー/エンディング時】直前の選択肢（チェックポイント）へ戻るボタン
            const lastCheckpoint = localStorage.getItem(this.checkpointKey);
            const retryTarget = (lastCheckpoint && this.storyData[lastCheckpoint]) ? lastCheckpoint : this.startSceneKey;

            const checkpointBtn = document.createElement('button');
            checkpointBtn.className = 'btn btn-retry';
            checkpointBtn.innerText = '直前の選択肢からやり直す';
            checkpointBtn.onclick = () => {
                this.renderScene(retryTarget, false);
            };
            choiceDisplay.appendChild(checkpointBtn);
        }

        // 画面最下部に「最初からやり直す（セーブデータ削除）」ボタンを小さく常時表示
        const restartContainer = document.createElement('div');
        restartContainer.className = 'restart-container';

        const restartBtn = document.createElement('button');
        restartBtn.className = 'btn-small-reset';
        restartBtn.innerText = '最初からやり直す（セーブ消去）';
        restartBtn.onclick = () => {
            if (confirm('最初からやり直しますか？（現在のセーブデータは削除されます）')) {
                localStorage.removeItem(this.saveKey);
                localStorage.removeItem(this.checkpointKey);
                this.lastSceneKey = null;
                this.renderScene(this.startSceneKey, false);
            }
        };

        restartContainer.appendChild(restartBtn);
        choiceDisplay.appendChild(restartContainer);
    }
}

// ページ読み込み完了時にゲームを初期化
document.addEventListener('DOMContentLoaded', () => {
    if (typeof storyData !== 'undefined') {
        const game = new EscapeGameEngine(storyData);
        game.init();
    } else {
        console.error('storyData is not defined. Make sure storyData.js is loaded before gameEngine.js.');
    }
});
