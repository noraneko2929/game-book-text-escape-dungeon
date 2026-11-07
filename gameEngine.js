/**
 * gameEngine.js
 * ゲームの描画・状態管理ライブラリ（下から上への縦積み・深層選択肢別積み上げ対応版）
 */
class EscapeGameEngine {
    constructor(storyData, config = {}) {
        this.storyData = storyData;
        this.textDisplayId = config.textDisplayId || 'text-display';
        this.choiceDisplayId = config.choiceDisplayId || 'choice-display';
        this.statusBadgeId = config.statusBadgeId || 'status-badge'; // 右上バッジは非表示/ボタン用に転用
        this.startSceneKey = config.startSceneKey || 'start';
        this.saveKey = config.saveKey + '_v3';
        this.checkpointKey = config.saveKey + '_checkpoint_v3';
        this.historyKey = config.saveKey + '_history_v3';
        this.revealedKey = config.saveKey + '_revealed_v3';
    }

    init() {
        const savedScene = localStorage.getItem(this.saveKey);
        const targetScene = (savedScene && this.storyData[savedScene]) ? savedScene : this.startSceneKey;
        
        this.routeHistory = JSON.parse(localStorage.getItem(this.historyKey) || '[]');
        this.hasReachedF15 = localStorage.getItem(this.revealedKey) === 'true';

        this.renderScene(targetScene);
    }

    // シーンからマップ用の一意のノード項目を生成する
    // 深層（第20階層開始〜第16階層境界まで）は選択肢（シーンID）ごとに積み上げる
    // 中層・上層は階層単位で積み上げる
    getMapNodeItem(sceneKey, scene) {
        if (sceneKey === 'escape_true') return { id: 'escape', name: '地上（生還）' };

        const match = sceneKey.match(/^f(\d+)/);
        if (match) {
            const floorNum = parseInt(match[1], 10);
            if (floorNum <= 15) {
                return { id: `f${floorNum}`, name: `第${floorNum}階層` };
            }
        }

        // 深層（第20階層〜第16階層、およびスタート地点等）は選択肢/シーンごとに個別表示
        let displayName = scene.status || sceneKey;
        return { id: sceneKey, name: displayName };
    }

    // どのエリアに属するかを判定（ゲームオーバー時の正しいリトライ先決定用）
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

    // 各エリアのチェックポイント（最初）のシーンキーを返す
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

        // 履歴に追加（重複追加防止、下から上へ積み上げるため配列に追加）
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

        // 右上バッジ部分を「最初からやり直す」ボタンに変更
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
            // 【ゲームオーバー時】所属エリアの最初へ正確に戻るリトライボタン
            const savedArea = localStorage.getItem(this.checkpointKey) || 'deep';
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

        // 下から上への縦積みマップ描画
        this.renderRouteMap(nodeItem.id, isGameOver);
    }

    // 下から上へ積み上がる筒状マップを描画する関数
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
        mapTitle.innerText = '🗺️ 通過ルート（下から上へ積み上げ）';
        routeMapContainer.appendChild(mapTitle);

        const scrollWrapper = document.createElement('div');
        scrollWrapper.className = 'route-scroll-wrapper';

        // 履歴が空の場合は現在のノードを1つだけ表示
        let displayList = [...this.routeHistory];
        if (displayList.length === 0) {
            const currentScene = this.storyData[currentNodeId] || {};
            displayList = [{ id: currentNodeId, name: currentScene.status || '未知の最深部（落下直後）' }];
        }

        let activeElement = null;

        // 下から上へ積み上げるため、古いものを下、新しいものを上へ並べる
        displayList.forEach((item, index) => {
            const floorNode = document.createElement('div');
            floorNode.className = 'route-floor-item';

            const isCurrent = (item.id === currentNodeId);

            if (isCurrent) {
                floorNode.classList.add('floor-current');
                if (isGameOver) floorNode.classList.add('floor-dead');
                activeElement = floorNode;
            } else {
                floorNode.classList.add('floor-passed');
            }

            floorNode.innerHTML = `
                <div class="floor-dot"></div>
                <div class="floor-label">${item.name} ${isCurrent ? '（現在地）' : ''}</div>
            `;

            scrollWrapper.appendChild(floorNode);

            if (index < displayList.length - 1) {
                const connector = document.createElement('div');
                connector.className = 'floor-connector connector-active';
                scrollWrapper.appendChild(connector);
            }
        });

        routeMapContainer.appendChild(scrollWrapper);

        // 常に現在位置が中央に見えるようにスクロール位置を自動調整
        setTimeout(() => {
            if (activeElement) {
                scrollWrapper.scrollTop = activeElement.offsetTop - scrollWrapper.clientHeight / 2 + activeElement.clientHeight / 2;
            }
        }, 50);
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
