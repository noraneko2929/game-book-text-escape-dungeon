/**
 * gameEngine.js
 * ゲームの描画・状態管理ライブラリ（階層単位・縦スクロールマップ対応版）
 */
class EscapeGameEngine {
    constructor(storyData, config = {}) {
        this.storyData = storyData;
        this.textDisplayId = config.textDisplayId || 'text-display';
        this.choiceDisplayId = config.choiceDisplayId || 'choice-display';
        this.statusBadgeId = config.statusBadgeId || 'status-badge';
        this.startSceneKey = config.startSceneKey || 'start';
        this.saveKey = config.saveKey || 'escape_game_current_scene';
        this.checkpointKey = config.saveKey + '_floor_checkpoint';
        this.historyKey = config.saveKey + '_floor_history';
        this.revealedKey = config.saveKey + '_revealed_floors';
    }

    init() {
        const savedScene = localStorage.getItem(this.saveKey);
        const targetScene = (savedScene && this.storyData[savedScene]) ? savedScene : this.startSceneKey;
        
        this.floorHistory = JSON.parse(localStorage.getItem(this.historyKey) || '[]');
        this.hasReachedF15 = localStorage.getItem(this.revealedKey) === 'true';

        this.renderScene(targetScene);
    }

    // シーンから所属する「大階層（フロア）」を特定する（例: f20, f15, f10, start など）
    getFloorId(sceneKey) {
        if (sceneKey.startsWith('start') || sceneKey.startsWith('gameover_f21')) return 'deep_start';
        if (sceneKey.startsWith('f20') || sceneKey.startsWith('f19') || sceneKey.startsWith('f18') || 
            sceneKey.startsWith('f17') || sceneKey.startsWith('f16')) return 'deep_area';
        if (sceneKey.startsWith('f15') || sceneKey.startsWith('f14') || sceneKey.startsWith('f13') || 
            sceneKey.startsWith('f12') || sceneKey.startsWith('f11')) return 'mid_area';
        if (sceneKey.startsWith('f10') || sceneKey.startsWith('f9') || sceneKey.startsWith('f8') || 
            sceneKey.startsWith('f7') || sceneKey.startsWith('f6') || sceneKey.startsWith('f5') || 
            sceneKey.startsWith('f4') || sceneKey.startsWith('f3') || sceneKey.startsWith('f2') || 
            sceneKey.startsWith('f1') || sceneKey.startsWith('escape')) return 'upper_area';
        return sceneKey;
    }

    // 各大階層の最初のシーン（チェックポイント）を返す
    getFloorCheckpoint(floorId) {
        switch(floorId) {
            case 'deep_start': return 'start';
            case 'deep_area': return 'f20_p1';
            case 'mid_area': return 'f15_p1';
            case 'upper_area': return 'f10_p1';
            default: return 'start';
        }
    }

    // 階層の代表名称
    getFloorName(floorId) {
        switch(floorId) {
            case 'deep_start': return '未知の最深部（落下地点）';
            case 'deep_area': return '深層（未踏域・悪魔回廊）';
            case 'mid_area': return '中層（第15階層〜第11階層）';
            case 'upper_area': return '上層・地上（第10階層〜）';
            default: return '探索エリア';
        }
    }

    checkF15Reached(sceneKey) {
        if (sceneKey.startsWith('f15') || sceneKey.startsWith('escape_true')) {
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

        const currentFloorId = this.getFloorId(sceneKey);
        const isGameOver = !scene.choices || scene.choices.length === 0;

        // 階層単位で履歴を記録（同じ階層内の細かい選択は追加せず、階層が変わったときのみ積む）
        if (!isGameOver && !this.floorHistory.includes(currentFloorId)) {
            this.floorHistory.push(currentFloorId);
            localStorage.setItem(this.historyKey, JSON.stringify(this.floorHistory));
        }

        localStorage.setItem(this.saveKey, sceneKey);

        // 階層が変わったらチェックポイントを更新
        if (!isGameOver) {
            localStorage.setItem(this.checkpointKey, currentFloorId);
        }

        const textDisplay = document.getElementById(this.textDisplayId);
        const statusBadge = document.getElementById(this.statusBadgeId);

        if (textDisplay) textDisplay.innerHTML = scene.text;
        if (statusBadge) statusBadge.innerText = scene.status;

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
            // 【ゲームオーバー時】所属階層の最初へ戻るリトライボタン
            const savedFloor = localStorage.getItem(this.checkpointKey) || 'deep_start';
            const retryTarget = this.getFloorCheckpoint(savedFloor);

            const checkpointBtn = document.createElement('button');
            checkpointBtn.className = 'btn btn-retry';
            checkpointBtn.innerText = 'この階層の最初からやり直す';
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

        // 縦の筒状・階層マップの描画
        this.renderRouteMap(currentFloorId, isGameOver);

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
                this.floorHistory = [];
                this.hasReachedF15 = false;
                this.renderScene(this.startSceneKey);
            }
        };

        restartContainer.appendChild(restartBtn);
        choiceDisplay.appendChild(restartContainer);
    }

    // 縦の筒状UIで層が積み重なるマップを描画する関数
    renderRouteMap(currentFloorId, isGameOver) {
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
        mapTitle.innerText = '🗺️ 探索階層ルート（縦積みマップ）';
        routeMapContainer.appendChild(mapTitle);

        // 縦スクロール可能なコンテナ
        const scrollWrapper = document.createElement('div');
        scrollWrapper.className = 'route-scroll-wrapper';

        // 全体の階層定義（下から上へ積み上がる）
        const allFloors = [
            { id: 'deep_start', name: '未知の最深部（落下直後）' },
            { id: 'deep_area', name: '深層・未踏エリア' },
            { id: 'mid_area', name: '中層（第15〜11階層）' },
            { id: 'upper_area', name: '上層・地上エリア' }
        ];

        let activeElement = null;

        allFloors.forEach((floor, index) => {
            const floorNode = document.createElement('div');
            floorNode.className = 'route-floor-item';

            const isPassed = this.floorHistory.includes(floor.id) || (this.hasReachedF15 && index <= 2);
            const isCurrent = (floor.id === currentFloorId);

            if (isCurrent) {
                floorNode.classList.add('floor-current');
                if (isGameOver) floorNode.classList.add('floor-dead');
                activeElement = floorNode;
            } else if (isPassed) {
                floorNode.classList.add('floor-passed');
            } else {
                floorNode.classList.add('floor-unvisited');
            }

            // 表示名（15階層到達前は深層を秘匿）
            let displayName = floor.name;
            if (!this.hasReachedF15 && (floor.id === 'deep_area' || floor.id === 'deep_start') && !isPassed) {
                displayName = '???（未踏の深淵）';
            }

            floorNode.innerHTML = `
                <div class="floor-dot"></div>
                <div class="floor-label">${displayName} ${isCurrent ? '（現在地）' : ''}</div>
            `;

            scrollWrapper.appendChild(floorNode);

            // 層を繋ぐ縦線
            if (index < allFloors.length - 1) {
                const connector = document.createElement('div');
                connector.className = 'floor-connector';
                if (isPassed) connector.classList.add('connector-active');
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
