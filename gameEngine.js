/**
 * gameEngine.js
 * セーブ機能および「最初からやり直す」時のセーブデータ削除を実装したゲームエンジン
 */
class EscapeGameEngine {
    constructor(storyData, config = {}) {
        this.storyData = storyData;
        this.textDisplayId = config.textDisplayId || 'text-display';
        this.choiceDisplayId = config.choiceDisplayId || 'choice-display';
        this.statusBadgeId = config.statusBadgeId || 'status-badge';
        this.startSceneKey = config.startSceneKey || 'start';
        this.saveKey = config.saveKey || 'lab_escape_save_scene';
    }

    init() {
        // 保存されたセーブデータがあればそこから再開、なければスタートシーンへ
        const savedScene = localStorage.getItem(this.saveKey);
        const targetScene = (savedScene && this.storyData[savedScene]) ? savedScene : this.startSceneKey;
        this.renderScene(targetScene);
    }

    renderScene(sceneKey) {
        const scene = this.storyData[sceneKey];
        if (!scene) {
            console.error(`Scene not found: ${sceneKey}`);
            return;
        }

        // 現在のシーンをLocalStorageに自動セーブ
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

        // 選択肢の生成
        if (scene.choices && scene.choices.length > 0) {
            scene.choices.forEach(choice => {
                const button = document.createElement('button');
                button.className = 'btn';
                button.innerText = choice.text;
                button.onclick = () => this.renderScene(choice.next);
                choiceDisplay.appendChild(button);
            });
        }

        // エンディングやゲームオーバーに関わらず、常に「最初からやり直す」ボタンを常時表示する
        const retryBtn = document.createElement('button');
        retryBtn.className = 'btn btn-reset';
        retryBtn.innerText = '最初からやり直す（セーブ削除）';
        retryBtn.onclick = () => {
            // やり直す場合はセーブデータを削除して最初から再開
            localStorage.removeItem(this.saveKey);
            this.renderScene(this.startSceneKey);
        };
        choiceDisplay.appendChild(retryBtn);
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