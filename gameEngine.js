/**
 * gameEngine.js
 * ゲームの描画・状態管理ライブラリ（ランク別セーブ・完全修復版）
 */
class EscapeGameEngine {
    constructor(storyData, config = {}) {
        this.storyData = storyData;
        this.textDisplayId = config.textDisplayId || 'text-display';
        this.choiceDisplayId = config.choiceDisplayId || 'choice-display';
        this.statusBadgeId = config.statusBadgeId || 'status-badge';
        this.startSceneKey = config.startSceneKey || 'start';
        this.saveKey = config.saveKey + '_v9';
        this.historyKey = config.saveKey + '_history_v9';
        this.revealedKey = config.saveKey + '_revealed_v9';
        this.reachedF10Key = config.saveKey + '_reached_f10_v9';
    }

    init() {
        const savedScene = localStorage.getItem(this.saveKey);
        const targetScene = (savedScene && this.storyData[savedScene]) ? savedScene : this.startSceneKey;
        
        this.routeHistory = JSON.parse(localStorage.getItem(this.historyKey) || '[]');
        this.hasReachedF15 = localStorage.getItem(this.revealedKey) === 'true';
        this.hasReachedF10Flag = localStorage.getItem(this.reachedF10Key) === 'true';

        this.renderScene(targetScene);
    }

    getMapNodeItem(sceneKey, scene) {
        if (sceneKey === 'escape_true') return { id: 'escape', name: '地上（生還）' };

        const match = sceneKey.match(/^f(\d+)/);
        if (match) {
            const floorNum = parseInt(match[1], 10);
            if (floorNum <= 15) {
                return { id: `f${floorNum}`, name: `第${floorNum}階層` };
            }
        }

        let displayName = scene.status || sceneKey;
        return { id: sceneKey, name: displayName };
    }

    // シーンキーから現在のランクを厳密に判定
    getSceneRank(sceneKey) {
        // 上層：f10〜f1、および escape
        if (sceneKey.startsWith('f10') || sceneKey.startsWith('f9') || sceneKey.startsWith('f8') || 
            sceneKey.startsWith('f7') || sceneKey.startsWith('f6') || sceneKey.startsWith('f5') || 
            sceneKey.startsWith('f4') || sceneKey.startsWith('f3') || sceneKey.startsWith('f2') || 
            sceneKey.startsWith('f1') || sceneKey.startsWith('escape')) {
            return 'upper';
        }
        
        // 中層：f15〜f11
        if (sceneKey.startsWith('f15') || sceneKey.startsWith('f14') || sceneKey.startsWith('f13') || 
            sceneKey.startsWith('f12') || sceneKey.startsWith('f11')) {
            return 'mid';
        }

        // 深層：それ以外
        return 'deep';
    }

    // 到達マイルストーンの更新と保存
    checkReachedMilestones(sceneKey) {
        const match = sceneKey.match(/^f(\d+)/);
        if (match) {
            const floorNum = parseInt(match[1], 10);
            if (floorNum <= 15) {
                this.hasReachedF15 = true;
                localStorage.setItem(this.revealedKey, 'true');
            }
            if (floorNum <= 10) {
                this.hasReachedF10Flag = true;
                localStorage.setItem(this.reachedF10Key, 'true');
            }
        }
        if (sceneKey === 'escape_true') {
            this.hasReachedF15 = true;
            this.hasReachedF10Flag = true;
            localStorage.setItem(this.revealedKey, 'true');
            localStorage.setItem(this.reachedF10Key, 'true');
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

        this.checkReachedMilestones(sceneKey);

        const nodeItem = this.getMapNodeItem(sceneKey, scene);
        const isGameOver = !scene.choices || scene.choices.length === 0;
        const currentRank = this.getSceneRank(sceneKey);

        // ゲームオーバーでなければ現在のシーンをセーブ
        if (!isGameOver) {
            localStorage.setItem(this.saveKey, sceneKey);
        }

        if (!isGameOver) {
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
                if (confirm('最初からやり直しますか？（セーブデータとルート記録が削除されます）')) {
                    localStorage.removeItem(this.saveKey);
                    localStorage.removeItem(this.historyKey);
                    localStorage.removeItem(this.revealedKey);
                    localStorage.removeItem(this.reachedF10Key);
                    this.routeHistory = [];
                    this.hasReachedF15 = false;
                    this.hasReachedF10Flag = false;
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
            // 【ご指定の厳密なリトライルール】
            // 1. 上層（10〜1階層）でゲームオーバーした場合：
            //    - 10層に到達していれば上層の初め（f10_p1）から
            //    - 10層に到達していなければ中層の初め（f15_p1）から
            // 2. 中層（15〜11階層）でゲームオーバーした場合：
            //    - 15層に到達していれば中層の初め（f15_p1）から
            //    - 15層に到達していなければ深層の初め（start）から
            // 3. 深層でゲームオーバーした場合：深層の初め（start）から
            let retryTarget = 'start';

            if (currentRank === 'upper') {
                retryTarget = this.hasReachedF10Flag ? 'f10_p1' : 'f15_p1';
            } else if (currentRank === 'mid') {
                retryTarget = this.hasReachedF15 ? 'f15_p1' : 'start';
            } else {
                retryTarget = 'start';
            }

            const checkpointBtn = document.createElement('button');
            checkpointBtn.className = 'btn btn-retry';
            checkpointBtn.innerText = 'ランク規定位置からやり直す';
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
            displayList = [{ id: currentNodeId, name: currentScene.status || '未知の最深部（落下直後）' }];
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
