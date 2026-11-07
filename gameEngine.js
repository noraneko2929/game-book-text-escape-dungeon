/**
 * gameEngine.js
 * ゲームの描画・状態管理ライブラリ（中央固定・レイヤー全体スクロール・完全修正版）
 */
class EscapeGameEngine {
    constructor(storyData, config = {}) {
        this.storyData = storyData;
        this.textDisplayId = config.textDisplayId || 'text-display';
        this.choiceDisplayId = config.choiceDisplayId || 'choice-display';
        this.statusBadgeId = config.statusBadgeId || 'status-badge';
        this.startSceneKey = config.startSceneKey || 'start';
        this.saveKey = config.saveKey + '_v4';
        this.checkpointKey = config.saveKey + '_checkpoint_v4';
        this.historyKey = config.saveKey + '_history_v4';
        this.revealedKey = config.saveKey + '_revealed_v4';
    }

    init() {
        const savedScene = localStorage.getItem(this.saveKey);
        const targetScene = (savedScene && this.storyData[savedScene]) ? savedScene : this.startSceneKey;
        
        this.routeHistory = JSON.parse(localStorage.getItem(this.historyKey) || '[]');
        this.hasReachedF15 = localStorage.getItem(this.revealedKey) === 'true';

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

    // 正確なエリア判定（リトライ時の誤動作防止）
    getAreaType(sceneKey) {
        if (sceneKey.startsWith('f10') || sceneKey.startsWith('f9') || sceneKey.startsWith('f8') || 
            sceneKey.startsWith('f7') || sceneKey.startsWith('f6') || sceneKey.startsWith('f5') || 
            sceneKey.startsWith('f4') || sceneKey.startsWith('f3') || sceneKey.startsWith('f2') || 
            sceneKey.startsWith('f1') || sceneKey.startsWith('escape')) {
            return 'upper'; // 上層
        }
        if (sceneKey.startsWith('f15') || sceneKey.startsWith('f14') || sceneKey.startsWith('f13') || 
            sceneKey.startsWith('f12') || sceneKey.startsWith('f11')) {
            return 'mid'; // 中層
        }
        return 'deep'; // 深層
    }

    getAreaCheckpoint(areaType) {
        switch(areaType) {
            case 'upper': return 'f10_p1';
            case 'mid': return 'f15_p1';
            case 'deep': 
            default: return 'start';
        }
    }

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

        this.checkF15Reached(sceneKey);

        const nodeItem = this.getMapNodeItem(sceneKey, scene);
        const isGameOver = !scene.choices || scene.choices.length === 0;
        const currentArea = this.getAreaType(sceneKey);

        // チェックポイント（エリアの最初）を保存
        if (!isGameOver) {
            localStorage.setItem(this.checkpointKey, currentArea);
        }

        // 履歴に追加
        if (!isGameOver) {
            const lastItem = this.routeHistory[this.routeHistory.length - 1];
            if (!lastItem || lastItem.id !== nodeItem.id) {
                this.routeHistory.push(nodeItem);
                localStorage.setItem(this.historyKey, JSON.stringify(this.routeHistory));
            }
        }

        localStorage.setItem(this.saveKey, sceneKey);

        // テキスト表示
        const textDisplay = document.getElementById(this.textDisplayId);
        if (textDisplay) textDisplay.innerHTML = scene.text;

        // 右上ヘッダーに「最初からやり直す」ボタン配置
        const statusBadge = document.getElementById(this.statusBadgeId);
        if (statusBadge) {
            statusBadge.innerHTML = '';
            const headerResetBtn = document.createElement('button');
            headerResetBtn.className = 'btn-small-reset';
            headerResetBtn.innerText = '最初からやり直す';
            headerResetBtn.onclick = () => {
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
            // 【ゲームオーバー時】正しいセーブエリアからリトライ
            const savedArea = localStorage.getItem(this.checkpointKey) || currentArea;
            const retryTarget = this.getAreaCheckpoint(savedArea);

            const checkpointBtn = document.createElement('button');
            checkpointBtn.className = 'btn btn-retry';
            checkpointBtn.innerText = 'このエリアの最初からやり直す';
            checkpointBtn.onclick = () => {
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

        // マップ描画（3スロット固定・現在地中央表示）
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
        mapTitle.innerText = '🗺️ 探索ルートマップ（中央固定・全体スクロール）';
        routeMapContainer.appendChild(mapTitle);

        const scrollLayer = document.createElement('div');
        scrollLayer.className = 'route-scroll-layer';

        let displayList = [...this.routeHistory];
        if (displayList.length === 0) {
            const currentScene = this.storyData[currentNodeId] || {};
            displayList = [{ id: currentNodeId, name: currentScene.status || '未知の最深部（落下直後）' }];
        }

        // 3つ分のスロット（下・真ん中・上）を確保するため、ダミーを含めて構築
        // 現在地が常に真ん中に来るようにパディングまたはスロットを配置する
        let currentIndex = displayList.findIndex(item => item.id === currentNodeId);
        if (currentIndex === -1) currentIndex = displayList.length - 1;

        // 下スロット用（過去）、真ん中（現在地）、上スロット用（未来/未到達）
        const prevItem = currentIndex > 0 ? displayList[currentIndex - 1] : null;
        const currentItem = displayList[currentIndex];
        const nextItem = currentIndex < displayList.length - 1 ? displayList[currentIndex + 1] : null;

        scrollLayer.innerHTML = `
            <!-- 上スロット（未来または空白） -->
            <div class="route-floor-item ${nextItem ? 'floor-passed' : 'floor-empty'}">
                <div class="floor-dot"></div>
                <div class="floor-label">${nextItem ? nextItem.name : '？？？'}</div>
            </div>
            <div class="floor-connector ${nextItem ? 'connector-active' : ''}"></div>

            <!-- 真ん中スロット（現在地：常に中央に固定表示） -->
            <div class="route-floor-item floor-current ${isGameOver ? 'floor-dead' : ''}">
                <div class="floor-dot"></div>
                <div class="floor-label">${currentItem.name} （現在地）</div>
            </div>
            <div class="floor-connector ${prevItem ? 'connector-active' : ''}"></div>

            <!-- 下スロット（過去） -->
            <div class="route-floor-item ${prevItem ? 'floor-passed' : 'floor-empty'}">
                <div class="floor-dot"></div>
                <div class="floor-label">${prevItem ? prevItem.name : 'スタート'}</div>
            </div>
        `;

        routeMapContainer.appendChild(scrollLayer);
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
