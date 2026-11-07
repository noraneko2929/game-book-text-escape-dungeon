/**
 * gameEngine.js
 * ゲームの描画・状態管理ライブラリ（ランク別セーブ・リトライ対応版）
 */
class EscapeGameEngine {
    constructor(storyData, config = {}) {
        this.storyData = storyData;
        this.textDisplayId = config.textDisplayId || 'text-display';
        this.choiceDisplayId = config.choiceDisplayId || 'choice-display';
        this.statusBadgeId = config.statusBadgeId || 'status-badge';
        this.startSceneKey = config.startSceneKey || 'start';
        this.saveKey = (config.saveKey || 'escape_game') + '_save_rank';
        this.historyKey = (config.saveKey || 'escape_game') + '_history_v10';
        this.checkpointKey = (config.saveKey || 'escape_game') + '_checkpoint_v10';
    }

    init() {
        this.routeHistory = JSON.parse(localStorage.getItem(this.historyKey) || '[]');
        
        // ランクごとのセーブポイント（未設定なら 'start'）
        this.currentCheckpoint = localStorage.getItem(this.checkpointKey) || this.startSceneKey;
        
        // 起動時は保存されているチェックポイント、または前回のセーブシーンから再開
        const savedScene = localStorage.getItem(this.saveKey);
        const targetScene = (savedScene && this.storyData[savedScene]) ? savedScene : this.currentCheckpoint;

        this.renderScene(targetScene);
    }

    getMapNodeItem(sceneKey, scene) {
        if (sceneKey === 'escape_true') return { id: 'escape', name: '地上（生還）' };

        const match = sceneKey.match(/^f(\d+)/);
        if (match) {
            const floorNum = parseInt(match[1], 10);
            if (floorNum <= 20) {
                return { id: `f${floorNum}`, name: `第${floorNum}階層` };
            }
        }

        let displayName = scene.status || sceneKey;
        return { id: sceneKey, name: displayName };
    }

    // シーンキーから階層ランクを判定
    getSceneRank(sceneKey) {
        if (sceneKey.startsWith('escape')) return 'upper';
        const match = sceneKey.match(/^f(\d+)/);
        if (!match) return 'deep';
        
        const floor = parseInt(match[1], 10);
        if (floor <= 10) return 'upper'; // 上層 (1〜10)
        if (floor <= 15) return 'mid';   // 中層 (11〜15)
        return 'deep';                   // 下層 (16〜20)
    }

    // 階層ランクが上がったタイミングでチェックポイントを更新・セーブする
    updateCheckpoint(sceneKey) {
        const rank = this.getSceneRank(sceneKey);
        let newCheckpoint = null;

        // 各ランクの最初の到達地点をチェックポイントとする
        if (rank === 'upper' && sceneKey === 'f10_p1') {
            newCheckpoint = 'f10_p1';
        } else if (rank === 'mid' && sceneKey === 'f15_p1') {
            newCheckpoint = 'f15_p1';
        }

        if (newCheckpoint) {
            this.currentCheckpoint = newCheckpoint;
            localStorage.setItem(this.checkpointKey, this.currentCheckpoint);
        }
    }

    syncHistoryUpTo(targetSceneKey) {
        const targetScene = this.storyData[targetSceneKey];
        if (!targetScene) return;
        const targetItem = this.getMapNodeItem(targetSceneKey, targetScene);

        const index = this.routeHistory.findIndex(item => item.id === targetItem.id);
        if (index !== -1) {
            this.routeHistory = this.routeHistory.slice(0, index + 1);
        } else {
            this.routeHistory = [targetItem];
        }
        localStorage.setItem(this.historyKey, JSON.stringify(this.routeHistory));
    }

    renderScene(sceneKey) {
        const scene = this.storyData[sceneKey];
        if (!scene) {
            console.error(`Scene not found: ${sceneKey}`);
            return;
        }

        this.updateCheckpoint(sceneKey);

        const nodeItem = this.getMapNodeItem(sceneKey, scene);
        const isGameOver = !scene.choices || scene.choices.length === 0;

        // ゲームオーバーでなければ現在の進行状況をセーブ
        if (!isGameOver) {
            localStorage.setItem(this.saveKey, sceneKey);
            
            const lastItem = this.routeHistory[this.routeHistory.length - 1];
            if (!lastItem || lastItem.id !== nodeItem.id) {
                this.routeHistory.push(nodeItem);
                localStorage.setItem(this.historyKey, JSON.stringify(this.routeHistory));
            }
        }

        const textDisplay = document.getElementById(this.textDisplayId);
        if (textDisplay) textDisplay.innerHTML = scene.text;

        const statusBadge = document.getElementById(this.statusBadgeId);
        if (statusBadge) {
            statusBadge.innerHTML = '';
            const headerResetBtn = document.createElement('button');
            headerResetBtn.className = 'btn-small-reset';
            headerResetBtn.innerText = '最初からやり直す';
            headerResetBtn.onclick = () => {
                if (confirm('最初からやり直しますか？（セーブデータと記録が削除されます）')) {
                    localStorage.removeItem(this.saveKey);
                    localStorage.removeItem(this.historyKey);
                    localStorage.removeItem(this.checkpointKey);
                    this.routeHistory = [];
                    this.currentCheckpoint = this.startSceneKey;
                    this.renderScene(this.startSceneKey);
                }
            };
            statusBadge.appendChild(headerResetBtn);
        }

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
            // ゲームオーバー時は、到達した階層ランクのセーブポイント（チェックポイント）からリトライ
            const retryTarget = this.currentCheckpoint;

            const checkpointBtn = document.createElement('button');
            checkpointBtn.className = 'btn btn-retry';
            checkpointBtn.innerText = 'セーブした階層からリトライする';
            checkpointBtn.onclick = () => {
                this.syncHistoryUpTo(retryTarget);
                this.renderScene(retryTarget);
            };
            choiceDisplay.appendChild(checkpointBtn);
        } else {
            const endingMsg = document.createElement('div');
            endingMsg.style.color = '#4caf50';
            endingMsg.style.marginBottom = '10px';
            endingMsg.style.fontWeight = 'bold';
            endingMsg.innerText = 'おめでとうございます！生還を達成しました。';
            choiceDisplay.appendChild(endingMsg);
        }

        this.renderRouteMap(nodeItem.id, isGameOver);
    }

    renderRouteMap(currentNodeId, isGameOver) {
        let routeMapContainer = document.getElementById('route-map-container');
        if (!routeMapContainer) {
            routeMapContainer = document.createElement('div');
            routeMapContainer.id = 'route-map-container';
            routeMapContainer.className = 'route-map-container';
            const gameContainer = document.querySelector('.game-container');
            gameContainer.insertBefore(routeMapContainer, document.querySelector('.text-area'));
        }

        routeMapContainer.innerHTML = '';

        const mapTitle = document.createElement('div');
        mapTitle.className = 'route-map-title';
        mapTitle.innerText = '🗺️ 階層探索マップ';
        routeMapContainer.appendChild(mapTitle);

        const scrollLayer = document.createElement('div');
        scrollLayer.className = 'route-scroll-layer';

        let displayList = [...this.routeHistory];
        if (displayList.length === 0) {
            const currentScene = this.storyData[currentNodeId] || {};
            displayList = [{ id: currentNodeId, name: currentScene.status || '未知の最深部' }];
        }

        let activeElement = null;

        displayList.forEach((item, index) => {
            const isCurrent = (item.id === currentNodeId || index === displayList.length - 1);

            const floorItem = document.createElement('div');
            floorItem.className = `route-floor-item ${isCurrent ? 'floor-current' : 'floor-passed'} ${isCurrent && isGameOver ? 'floor-dead' : ''}`;
            
            floorItem.innerHTML = `
                <div class="floor-dot"></div>
                <div class="floor-label">${item.name} ${isCurrent ? '（現在地）' : ''}</div>
            `;

            scrollLayer.appendChild(floorItem);

            if (isCurrent) {
                activeElement = floorItem;
            }

            // コネクターを必ずフロアアイテムの間に挟んで生成する
            if (index < displayList.length - 1) {
                const connector = document.createElement('div');
                connector.className = 'floor-connector connector-active';
                scrollLayer.appendChild(connector);
            }
        });

        routeMapContainer.appendChild(scrollLayer);

        setTimeout(() => {
            if (activeElement) {
                scrollLayer.scrollTop = activeElement.offsetTop - (scrollLayer.clientHeight / 2) + (activeElement.clientHeight / 2);
            }
        }, 30);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof storyData !== 'undefined') {
        const game = new EscapeGameEngine(storyData);
        game.init();
    } else {
        console.error('storyData is not defined.');
    }
});
