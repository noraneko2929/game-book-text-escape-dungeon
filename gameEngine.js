/**
 * gameEngine.js
 * ゲームの描画・状態管理ライブラリ（ランク別セーブ・リトライ完全対応版）
 */
class EscapeGameEngine {
    constructor(storyData, config = {}) {
        this.storyData = storyData;
        this.textDisplayId = config.textDisplayId || 'text-display';
        this.choiceDisplayId = config.choiceDisplayId || 'choice-display';
        this.statusBadgeId = config.statusBadgeId || 'status-badge';
        this.startSceneKey = config.startSceneKey || 'start';
        this.saveKey = config.saveKey + '_v5';
        this.rankKey = config.saveKey + '_rank_checkpoint_v5';
        this.historyKey = config.saveKey + '_history_v5';
        this.revealedKey = config.saveKey + '_revealed_v5';
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

    // シーンキーや階層から、正確な「階層ランク（deep / mid / upper）」を判定する
    getSceneRank(sceneKey) {
        // 上層：第10層〜第1層、およびエスケープ
        if (sceneKey.startsWith('f10') || sceneKey.startsWith('f9') || sceneKey.startsWith('f8') || 
            sceneKey.startsWith('f7') || sceneKey.startsWith('f6') || sceneKey.startsWith('f5') || 
            sceneKey.startsWith('f4') || sceneKey.startsWith('f3') || sceneKey.startsWith('f2') || 
            sceneKey.startsWith('f1') || sceneKey.startsWith('escape')) {
            return 'upper';
        }
        
        // 中層：第15層〜第11層（f15〜f11）
        if (sceneKey.startsWith('f15') || sceneKey.startsWith('f14') || sceneKey.startsWith('f13') || 
            sceneKey.startsWith('f12') || sceneKey.startsWith('f11')) {
            return 'mid';
        }

        // 深層：20〜16層（f20, f19, f18, f17, f16 および start 系）
        return 'deep';
    }

    // ご指定のルールに基づくリトライ先の決定
    // ・15層に到達するまでは深層の初めからリトライ
    // ・10層に到達するまでは15層からリトライ
    getRetryTargetScene(currentRank, hasReachedF15) {
        if (currentRank === 'upper') {
            // 上層（10層〜1層）にいる場合
            // 10層に到達していれば15層（中層初め）から、していなければ深層から等の制御
            if (this.hasReachedF10()) {
                return 'f15_p1'; // 10層到達後は15層から
            } else {
                return 'start'; // 到達していなければ深層初め
            }
        } else if (currentRank === 'mid') {
            // 中層（15層〜11層）にいる場合
            // 15層に到達するまでは深層の初めから
            if (this.hasReachedF15) {
                return 'f15_p1'; // 15層の初め
            } else {
                return 'start';
            }
        } else {
            // 深層（20〜16層）
            return 'start';
        }
    }

    // 15層以上に到達したことがあるか判定
    checkReachedMilestones(sceneKey) {
        const match = sceneKey.match(/^f(\d+)/);
        if (match) {
            const floorNum = parseInt(match[1], 10);
            if (floorNum <= 15) {
                this.hasReachedF15 = true;
                localStorage.setItem(this.revealedKey, 'true');
            }
        }
        if (sceneKey === 'escape_true') {
            this.hasReachedF15 = true;
            localStorage.setItem(this.revealedKey, 'true');
        }
    }

    hasReachedF10() {
        // 上層のシーン（f10以降）を踏んでいるか履歴からチェック
        return this.routeHistory.some(item => item.id.startsWith('f10') || item.id.startsWith('f9') || item.id.startsWith('f8') || item.id.startsWith('f7') || item.id.startsWith('f6') || item.id.startsWith('f5') || item.id.startsWith('f4') || item.id.startsWith('f3') || item.id.startsWith('f2') || item.id.startsWith('f1'));
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

        // ランクごとにセーブ（最後に到達したランクとシーンを保存）
        if (!isGameOver) {
            localStorage.setItem(this.checkpointKey, currentRank);
            localStorage.setItem(this.saveKey, sceneKey);
        }

        // 履歴に追加
        if (!isGameOver) {
            const lastItem = this.routeHistory[this.routeHistory.length - 1];
            if (!lastItem || lastItem.id !== nodeItem.id) {
                this.routeHistory.push(nodeItem);
                localStorage.setItem(this.historyKey, JSON.stringify(this.routeHistory));
            }
        }

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
            // 【ゲームオーバー時】ランク別ルールに従ってリトライ先を決定
            let retryTarget = 'start';
            if (currentRank === 'upper') {
                // 上層で死亡：10層に到達するまでは15層から、以降は上層初め（f10_p1）
                retryTarget = this.hasReachedF10() ? 'f10_p1' : 'f15_p1';
            } else if (currentRank === 'mid') {
                // 中層で死亡：15層に到達するまでは深層の初めから、以降は15層初め（f15_p1）
                retryTarget = this.hasReachedF15 ? 'f15_p1' : 'start';
            } else {
                // 深層で死亡：深層の初めから
                retryTarget = 'start';
            }

            const checkpointBtn = document.createElement('button');
            checkpointBtn.className = 'btn btn-retry';
            checkpointBtn.innerText = 'ランク規定位置からやり直す';
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

        let currentIndex = displayList.findIndex(item => item.id === currentNodeId);
        if (currentIndex === -1) currentIndex = displayList.length - 1;

        const prevItem = currentIndex > 0 ? displayList[currentIndex - 1] : null;
        const currentItem = displayList[currentIndex];
        const nextItem = currentIndex < displayList.length - 1 ? displayList[currentIndex + 1] : null;

        scrollLayer.innerHTML = `
            <div class="route-floor-item ${nextItem ? 'floor-passed' : 'floor-empty'}">
                <div class="floor-dot"></div>
                <div class="floor-label">${nextItem ? nextItem.name : '？？？'}</div>
            </div>
            <div class="floor-connector ${nextItem ? 'connector-active' : ''}"></div>

            <div class="route-floor-item floor-current ${isGameOver ? 'floor-dead' : ''}">
                <div class="floor-dot"></div>
                <div class="floor-label">${currentItem.name} （現在地）</div>
            </div>
            <div class="floor-connector ${prevItem ? 'connector-active' : ''}"></div>

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
