/**
 * gameEngine.js
 * ゲームの描画・状態管理ライブラリ
 * - 自動セーブ・ロード機能
 * - ゲームオーバー時は「階層の最初（フロアの起点）」からやり直す
 * - エンディング時は直前のやり直しボタンを表示しない
 * - 「最初からやり直す」ボタンの常時表示（小型ボタン）
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
    }

    init() {
        const savedScene = localStorage.getItem(this.saveKey);
        const targetScene = (savedScene && this.storyData[savedScene]) ? savedScene : this.startSceneKey;
        this.renderScene(targetScene);
    }

    // シーンが階層の最初（フロアの起点）かどうかを判定
    isFloorStart(sceneKey) {
        if (sceneKey === 'start') return true;
        if (sceneKey.endsWith('_p1')) return true;
        return false;
    }

    renderScene(sceneKey) {
        const scene = this.storyData[sceneKey];
        if (!scene) {
            console.error(`Scene not found: ${sceneKey}`);
            return;
        }

        // 現在のシーンをLocalStorageに自動セーブ
        localStorage.setItem(this.saveKey, sceneKey);

        // 階層の最初（フロアの起点）であれば、チェックポイントを更新
        if (this.isFloorStart(sceneKey)) {
            localStorage.setItem(this.checkpointKey, sceneKey);
        }

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
        const isEnding = sceneKey.startsWith('escape_');

        if (hasChoices) {
            // 通常の選択肢ボタンの動的生成
            scene.choices.forEach(choice => {
                const button = document.createElement('button');
                button.className = 'btn';
                button.innerText = choice.text;
                button.onclick = () => {
                    this.renderScene(choice.next);
                };
                choiceDisplay.appendChild(button);
            });
        } else if (!isEnding) {
            // 【ゲームオーバー時】現在の階層の最初（フロアの起点）へ戻るボタン
            const floorCheckpoint = localStorage.getItem(this.checkpointKey);
            const retryTarget = (floorCheckpoint && this.storyData[floorCheckpoint]) ? floorCheckpoint : this.startSceneKey;

            const checkpointBtn = document.createElement('button');
            checkpointBtn.className = 'btn btn-retry';
            checkpointBtn.innerText = 'この階層の最初からやり直す';
            checkpointBtn.onclick = () => {
                this.renderScene(retryTarget);
            };
            choiceDisplay.appendChild(checkpointBtn);
        } else {
            // 【エンディング時】直前のやり直しは非表示にし、クリアメッセージを表示
            const endingMsg = document.createElement('div');
            endingMsg.style.color = '#4caf50';
            endingMsg.style.marginBottom = '10px';
            endingMsg.style.fontWeight = 'bold';
            endingMsg.innerText = 'おめでとうございます！生還を達成しました。';
            choiceDisplay.appendChild(endingMsg);
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
                this.renderScene(this.startSceneKey);
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
