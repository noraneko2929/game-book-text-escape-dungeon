/**
 * gameEngine.js
 * ゲームの描画・状態管理ライブラリ（下から上への縦積み・1階層ごとマップ対応版）
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
        this.historyKey = config.saveKey + '_floor_history_v2';
        this.revealedKey = config.saveKey + '_revealed_floors';
    }

    init() {
        const savedScene = localStorage.getItem(this.saveKey);
        const targetScene = (savedScene && this.storyData[savedScene]) ? savedScene : this.startSceneKey;
        
        this.floorHistory = JSON.parse(localStorage.getItem(this.historyKey) || '[]');
        this.hasReachedF15 = localStorage.getItem(this.revealedKey) === 'true';

        this.renderScene(targetScene);
    }

    // シーンから1階層ごとの単位（または深層の個別状態）を特定する
    getFloorUnit(sceneKey, scene) {
        // エンディング
        if (sceneKey === 'escape_true') return { id: 'escape', name: '地上（生還）', isDeep: false };

        // 第15階層以降（明確な階層がある場合）
        const match = sceneKey.match(/^f(\d+)/);
        if (match) {
            const floorNum = parseInt(match[1], 10);
            if (floorNum <= 15) {
                return { id: `f${floorNum}`, name: `第${floorNum}階層`, isDeep: false };
            }
        }

        // 第15階層より下（深層・未踏域：15階層までは現在地不明の別表記）
        return { id: sceneKey, name: scene.status || '未知の深淵（現在地不明）', isDeep: true };
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

        const currentUnit = this.getFloorUnit(sceneKey, scene);
        const isGameOver = !scene.choices || scene.choices.length === 0;

        // 履歴にまだ含まれていない場合のみ、新しい階層/地点を下から積み上げる形で追加
        if (!isGameOver) {
            const lastRecorded = this.floorHistory[this.floorHistory.length - 1];
            if (!lastRecorded || lastRecorded.id !== currentUnit.id) {
                this.floorHistory.push(currentUnit);
                localStorage.setItem(this.historyKey, JSON.stringify(this.floorHistory));
            }
        }

        localStorage.setItem(this.saveKey, sceneKey);

        // ゲームオーバー時のリトライ用チェックポイント（深層・中層・上層の大まかな区切りへ）
        if (!isGameOver) {
            localStorage.setItem(this.checkpointKey, sceneKey);
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
            // 【ゲームオーバー時】所属する大階層の最初へ戻る
            const savedSceneKey = localStorage.getItem(this.checkpointKey) || 'start';
            let retryTarget = 'start';
            if (savedSceneKey.startsWith('f10') || savedSceneKey.startsWith('f9') || savedSceneKey.startsWith('f8') || 
                savedSceneKey.startsWith('f7') || savedSceneKey.startsWith('f6') || savedSceneKey.startsWith('f5') || 
                savedSceneKey.startsWith('f4') || savedSceneKey.startsWith('f3') || savedSceneKey.startsWith('f2') || 
                savedSceneKey.startsWith('f1')) {
                retryTarget = 'f10_p1';
            } else if (savedSceneKey.startsWith('f15') || savedSceneKey.startsWith('f14') || savedSceneKey.startsWith('f13') || 
                       savedSceneKey.startsWith('f12') || savedSceneKey.startsWith('f11')) {
                retryTarget = 'f15_p1';
            } else if (savedSceneKey.startsWith('f20') || savedSceneKey.startsWith('f19') || savedSceneKey.startsWith('f18') || 
                       savedSceneKey.startsWith('f17') || savedSceneKey.startsWith('f16')) {
                retryTarget = 'f20_p1';
            }

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

        // 下から上への縦積みマップ描画
        this.renderRouteMap(currentUnit.id, isGameOver);

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

    // 下から上へ積み上がる筒状マップを描画する関数
    renderRouteMap(currentUnitId, isGameOver) {
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
        mapTitle.innerText = '🗺️ 通過ルート記録（下から上へ積み上げ）';
        routeMapContainer.appendChild(mapTitle);

        const scrollWrapper = document.createElement('div');
        scrollWrapper.className = 'route-scroll-wrapper';

        // 表示用に履歴をコピーし、下から上（古いものが下、新しいものが上）へ並べる
        // ※ もし履歴が空なら現在地のみを表示
        let displayList = [...this.floorHistory];
        if (displayList.length === 0) {
            displayList = [{ id: currentUnitId, name: '未知の最深部（落下直後）' }];
        }

        // 下から上へ積み上げるため、配列をそのまま順に下から配置（CSSでflex-direction: column-reverseにするか、逆順ループ）
        // ここでは配列の最後（最新）が一番上、または一番下にくるように調整。
        // 一般的な縦積みタワー：上が上層（出口）、下が深層。そのため、古いものが下、新しいものが上へ積み重なる。
        let activeElement = null;

        displayList.forEach((item, index) => {
            const floorNode = document.createElement('div');
            floorNode.className = 'route-floor-item';

            const isCurrent = (item.id === currentUnitId);

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
