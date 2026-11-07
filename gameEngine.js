/**
 * gameEngine.js
 * ゲームの描画・状態管理ライブラリ
 * - 自動セーブ・ロード機能
 * - ルート履歴の記録と画面下部での点・線（マップ）可視化
 * - 深層での階層数非表示＆第15階層到達後の解除
 * - ゲームオーバー時は「階層の最初」から再開（ルート履歴維持）
 * - 「最初からやり直す」時はセーブデータ＆ルート履歴削除
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
        this.historyKey = config.saveKey + '_route_history';
        this.revealedKey = config.saveKey + '_revealed_floors'; // 15階層到達フラグ
    }

    init() {
        const savedScene = localStorage.getItem(this.saveKey);
        const targetScene = (savedScene && this.storyData[savedScene]) ? savedScene : this.startSceneKey;
        
        // ルート履歴と15階層到達フラグの読み込み
        this.routeHistory = JSON.parse(localStorage.getItem(this.historyKey) || '[]');
        this.hasReachedF15 = localStorage.getItem(this.revealedKey) === 'true';

        this.renderScene(targetScene);
    }

    isFloorStart(sceneKey) {
        if (sceneKey === 'start') return true;
        if (sceneKey.endsWith('_p1')) return true;
        return false;
    }

    // 第15階層以上に到達したかチェック
    checkF15Reached(sceneKey) {
        if (sceneKey.startsWith('f15') || sceneKey.startsWith('f14') || sceneKey.startsWith('f13') || 
            sceneKey.startsWith('f12') || sceneKey.startsWith('f11') || sceneKey.startsWith('f10') || 
            sceneKey.startsWith('f9') || sceneKey.startsWith('f8') || sceneKey.startsWith('f7') || 
            sceneKey.startsWith('f6') || sceneKey.startsWith('f5') || sceneKey.startsWith('f4') || 
            sceneKey.startsWith('f3') || sceneKey.startsWith('f2') || sceneKey.startsWith('f1') || 
            sceneKey === 'escape_true') {
            this.hasReachedF15 = true;
            localStorage.setItem(this.revealedKey, 'true');
        }
    }

    renderScene(sceneKey) {
        const scene = this.storyData[sceneKey];
        if (!scene) {
            console.error(`Scene not found: ${sceneKey}`);
            return;
        }

        // 第15階層到達チェック
        this.checkF15Reached(sceneKey);

        // ルート履歴の更新（連続での重複登録を防止）
        if (this.routeHistory.length === 0 || this.routeHistory[this.routeHistory.length - 1] !== sceneKey) {
            this.routeHistory.push(sceneKey);
            localStorage.setItem(this.historyKey, JSON.stringify(this.routeHistory));
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
            // 【ゲームオーバー時】現在の階層の最初へ戻るボタン（ルート履歴はそのまま維持）
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
            // 【エンディング時】
            const endingMsg = document.createElement('div');
            endingMsg.style.color = '#4caf50';
            endingMsg.style.marginBottom = '10px';
            endingMsg.style.fontWeight = 'bold';
            endingMsg.innerText = 'おめでとうございます！生還を達成しました。';
            choiceDisplay.appendChild(endingMsg);
        }

        // ルートマップ表示
        this.renderRouteMap();

        // 画面最下部に「最初からやり直す（セーブ＆記録消去）」ボタンを小さく常時表示
        const restartContainer = document.createElement('div');
        restartContainer.className = 'restart-container';

        const restartBtn = document.createElement('button');
        restartBtn.className = 'btn-small-reset';
        restartBtn.innerText = '最初からやり直す（セーブ＆記録消去）';
        restartBtn.onclick = () => {
            if (confirm('最初からやり直しますか？（セーブデータとルート記録が削除されます）')) {
                localStorage.removeItem(this.saveKey);
                localStorage.removeItem(this.checkpointKey);
                localStorage.removeItem(this.historyKey);
                localStorage.removeItem(this.revealedKey);
                this.routeHistory = [];
                this.hasReachedF15 = false;
                this.renderScene(this.startSceneKey);
            }
        };

        restartContainer.appendChild(restartBtn);
        choiceDisplay.appendChild(restartContainer);
    }

    // 画面下に点と線で通過ルートを描画する関数
    renderRouteMap() {
        let routeMapContainer = document.getElementById('route-map-container');
        if (!routeMapContainer) {
            routeMapContainer = document.createElement('div');
            routeMapContainer.id = 'route-map-container';
            routeMapContainer.className = 'route-map-container';
            const gameContainer = document.querySelector('.game-container');
            gameContainer.appendChild(routeMapContainer);
        }

        routeMapContainer.innerHTML = '';

        const mapTitle = document.createElement('div');
        mapTitle.className = 'route-map-title';
        mapTitle.innerText = '🗺️ 通過ルート記録';
        routeMapContainer.appendChild(mapTitle);

        const nodesWrapper = document.createElement('div');
        nodesWrapper.className = 'route-nodes-wrapper';

        this.routeHistory.forEach((key, index) => {
            const scene = this.storyData[key];
            const node = document.createElement('div');
            node.className = 'route-node';

            const isGameOver = !scene.choices || scene.choices.length === 0;
            if (isGameOver && !key.startsWith('escape_')) {
                node.classList.add('node-dead');
            } else if (index === this.routeHistory.length - 1) {
                node.classList.add('node-current');
            } else {
                node.classList.add('node-passed');
            }

            // ラベル判定（第15階層到達前は深層の階層数を「???」で隠す）
            let labelText = '???';
            if (this.hasReachedF15) {
                labelText = scene.status || key;
            } else {
                if (key.startsWith('f15') || key.startsWith('f14') || key.startsWith('f13') || 
                    key.startsWith('f12') || key.startsWith('f11') || key.startsWith('f10') || 
                    key.startsWith('f9') || key.startsWith('f8') || key.startsWith('f7') || 
                    key.startsWith('f6') || key.startsWith('f5') || key.startsWith('f4') || 
                    key.startsWith('f3') || key.startsWith('f2') || key.startsWith('f1') || 
                    key === 'escape_true') {
                    labelText = scene.status || key;
                } else {
                    labelText = '???（未可視）';
                }
            }

            const tooltip = document.createElement('span');
            tooltip.className = 'route-tooltip';
            tooltip.innerText = `${index + 1}. ${labelText}`;
            node.appendChild(tooltip);

            nodesWrapper.appendChild(node);

            // ノード間のつなぎ線
            if (index < this.routeHistory.length - 1) {
                const line = document.createElement('div');
                line.className = 'route-line';
                nodesWrapper.appendChild(line);
            }
        });

        routeMapContainer.appendChild(nodesWrapper);

        // 自動で最新のノードへスクロール
        setTimeout(() => {
            nodesWrapper.scrollLeft = nodesWrapper.scrollWidth;
        }, 50);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof storyData !== 'undefined') {
        const game = new EscapeGameEngine(storyData);
        game.init();
    } else {
        console.error('storyData is not defined. Make sure storyData.js is loaded before gameEngine.js.');
    }
});
