/**
 * gameEngine.js
 * ゲームの描画・状態管理ライブラリ（滑らかなCSSスライド＆表記完全修正版）
 */
class EscapeGameEngine {
    constructor(storyData, config = {}) {
        this.storyData = storyData;
        this.textDisplayId = config.textDisplayId || 'text-display';
        this.choiceDisplayId = config.choiceDisplayId || 'choice-display';
        this.statusBadgeId = config.statusBadgeId || 'status-badge';
        this.startSceneKey = config.startSceneKey || 'start';
        this.saveKey = (config.saveKey || 'escape_game') + '_save_rank';
        this.historyKey = (config.saveKey || 'escape_game') + '_history_v20';
        this.checkpointKey = (config.saveKey || 'escape_game') + '_checkpoint_v20';
        this.revealedKey = (config.saveKey || 'escape_game') + '_revealed_v20';
        this.isAnimating = false;
    }

    init() {
        this.routeHistory = JSON.parse(localStorage.getItem(this.historyKey) || '[]');
        this.currentCheckpoint = localStorage.getItem(this.checkpointKey) || this.startSceneKey;
        this.hasReachedF15 = localStorage.getItem(this.revealedKey) === 'true';
        
        const savedScene = localStorage.getItem(this.saveKey);
        const targetScene = (savedScene && this.storyData[savedScene]) ? savedScene : this.currentCheckpoint;

        this.renderScene(targetScene, false);
    }

    getMapNodeItem(sceneKey, scene) {
        if (sceneKey === 'escape_true') return { id: 'escape', name: '地上（生還）' };

        const match = sceneKey.match(/^f(\d+)/);
        if (match) {
            const floorNum = parseInt(match[1], 10);
            if (floorNum <= 20) {
                if (floorNum >= 16 && !this.hasReachedF15) {
                    return { id: `f${floorNum}`, name: '第??階層' };
                }
                return { id: `f${floorNum}`, name: `第${floorNum}階層` };
            }
        }

        let displayName = (scene && scene.status) ? scene.status : sceneKey;
        if (!this.hasReachedF15 && (displayName.includes('第20') || displayName.includes('第19') || displayName.includes('第18') || displayName.includes('第17') || displayName.includes('第16'))) {
            displayName = '未知の最深部（現在地不明）';
        }
        return { id: sceneKey, name: displayName };
    }

    getSceneRank(sceneKey) {
        if (sceneKey.startsWith('escape')) return 'upper';
        const match = sceneKey.match(/^f(\d+)/);
        if (!match) return 'deep';
        
        const floor = parseInt(match[1], 10);
        if (floor <= 10) return 'upper';
        if (floor <= 15) return 'mid';
        return 'deep';
    }

    updateCheckpoint(sceneKey) {
        const match = sceneKey.match(/^f(\d+)/);
        if (match) {
            const floorNum = parseInt(match[1], 10);
            if (floorNum <= 15) {
                this.hasReachedF15 = true;
                localStorage.setItem(this.revealedKey, 'true');
            }
        }

        const rank = this.getSceneRank(sceneKey);
        let newCheckpoint = null;

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

    renderScene(sceneKey, useTransition = true) {
        const scene = this.storyData[sceneKey];
        if (!scene) {
            console.error(`Scene not found: ${sceneKey}`);
            return;
        }

        const oldLastItem = this.routeHistory[this.routeHistory.length - 1];
        this.updateCheckpoint(sceneKey);

        const nodeItem = this.getMapNodeItem(sceneKey, scene);
        const isGameOver = !scene.choices || scene.choices.length === 0;

        let isNewFloorAdvanced = false;
        if (!isGameOver) {
            localStorage.setItem(this.saveKey, sceneKey);
            if (!oldLastItem || oldLastItem.id !== nodeItem.id) {
                if (oldLastItem) {
                    isNewFloorAdvanced = true;
                }
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
                    localStorage.removeItem(this.revealedKey);
                    this.routeHistory = [];
                    this.currentCheckpoint = this.startSceneKey;
                    this.hasReachedF15 = false;
                    this.renderScene(this.startSceneKey, false);
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
                    if (this.isAnimating) return;
                    this.renderScene(choice.next, true);
                };
                choiceDisplay.appendChild(button);
            });
        } else if (!isEnding) {
            const retryTarget = this.currentCheckpoint;

            const checkpointBtn = document.createElement('button');
            checkpointBtn.className = 'btn btn-retry';
            checkpointBtn.innerText = 'リトライする';
            checkpointBtn.onclick = () => {
                if (this.isAnimating) return;
                this.syncHistoryUpTo(retryTarget);
                this.renderScene(retryTarget, false);
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

        this.renderRouteMap(nodeItem.id, isGameOver, useTransition && isNewFloorAdvanced);
    }

    renderRouteMap(currentNodeId, isGameOver, animateAdvance = false) {
        let routeMapContainer = document.getElementById('route-map-container');
        if (!routeMapContainer) {
            routeMapContainer = document.createElement('div');
            routeMapContainer.id = 'route-map-container';
            routeMapContainer.className = 'route-map-container';
            const gameContainer = document.querySelector('.game-container');
            if (gameContainer) {
                gameContainer.insertBefore(routeMapContainer, document.querySelector('.text-area'));
            } else {
                document.body.appendChild(routeMapContainer);
            }
        }

        routeMapContainer.innerHTML = '';

        const mapTitle = document.createElement('div');
        mapTitle.className = 'route-map-title';
        mapTitle.innerText = '🗺️ 階層探索マップ';
        routeMapContainer.appendChild(mapTitle);

        const scrollLayer = document.createElement('div');
        scrollLayer.className = 'route-scroll-layer';

        const animWrapper = document.createElement('div');
        animWrapper.className = 'map-anim-wrapper';
        scrollLayer.appendChild(animWrapper);

        let displayList = [...this.routeHistory];
        if (displayList.length === 0) {
            const currentScene = this.storyData[currentNodeId] || {};
            displayList = [{ id: currentNodeId, name: currentScene.status || '未知の最深部' }];
        }

        const isEnding = currentNodeId.startsWith('escape_');
        let targetAnimatingId = null;

        if (animateAdvance && displayList.length > 1) {
            this.isAnimating = true;
            targetAnimatingId = displayList[displayList.length - 1].id;
        }

        const itemsToRender = [];

        // 1. 【上】未到達階層（？？？）
        if (!isGameOver && !isEnding) {
            itemsToRender.push({
                type: 'floor',
                id: 'unknown_next',
                name: '？？？ (未到達)',
                className: 'floor-unknown'
            });
        }

        // 2. 【中】現在地（displayListの最後尾）
        const currentItem = displayList[displayList.length - 1] || { id: currentNodeId, name: '現在地' };
        const currentSceneObj = this.storyData[currentItem.id] || {};
        const resolvedCurrent = this.getMapNodeItem(currentItem.id, currentSceneObj);
        
        let currentClass = isGameOver ? 'floor-current floor-dead' : 'floor-current';
        let labelText = `${resolvedCurrent.name}（現在地）`;

        // アニメーション移動中は「（現在地）」を付加せず、純粋な「？？？ (未到達)」として表示する
        if (animateAdvance && currentItem.id === targetAnimatingId) {
            labelText = '？？？ (未到達)';
            currentClass = 'floor-unknown';
        }

        itemsToRender.push({
            type: 'floor',
            id: currentItem.id,
            name: labelText,
            className: currentClass
        });

        // 3. 【下】過去の履歴
        for (let i = displayList.length - 2; i >= 0; i--) {
            const histItem = displayList[i];
            const histSceneObj = this.storyData[histItem.id] || {};
            const resolvedHist = this.getMapNodeItem(histItem.id, histSceneObj);

            itemsToRender.push({
                type: 'floor',
                id: histItem.id,
                name: resolvedHist.name,
                className: 'floor-passed'
            });
        }

        // DOM構築
        itemsToRender.forEach((item, index) => {
            const floorItem = document.createElement('div');
            floorItem.className = `route-floor-item ${item.className}`;
            floorItem.dataset.id = item.id;
            floorItem.innerHTML = `
                <div class="floor-dot"></div>
                <div class="floor-label">${item.name}</div>
            `;
            animWrapper.appendChild(floorItem);

            if (index < itemsToRender.length - 1) {
                const connector = document.createElement('div');
                const isNextUnknown = itemsToRender[index + 1].className.includes('floor-unknown');
                connector.className = `floor-connector ${!isNextUnknown ? 'connector-active' : ''}`;
                animWrapper.appendChild(connector);
            }
        });

        routeMapContainer.appendChild(scrollLayer);

        if (animateAdvance) {
            // ① CSSで1ステップ（42px）下からスライドを開始する初期位置にセット
            animWrapper.style.transition = 'none';
            animWrapper.style.transform = 'translateY(42px)';

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    // ② CSS transition を有効化して smoothly 上（Y=0）へ引き上げる
                    animWrapper.style.transition = 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
                    animWrapper.style.transform = 'translateY(0px)';

                    // ③ スライドが中央にピタッと着地した後に、テキストを「（現在地）」へと正式に切り替える
                    setTimeout(() => {
                        const topItems = animWrapper.querySelectorAll('.route-floor-item');
                        const targetItem = topItems.length > 1 ? topItems[1] : topItems[0];
                        
                        if (targetItem) {
                            const sceneObj = this.storyData[currentNodeId] || {};
                            const resolvedNode = this.getMapNodeItem(currentNodeId, sceneObj);
                            
                            let finalClass = isGameOver ? 'route-floor-item floor-current floor-dead' : 'route-floor-item floor-current';
                            targetItem.className = finalClass;
                            targetItem.innerHTML = `
                                <div class="floor-dot"></div>
                                <div class="floor-label">${resolvedNode.name}（現在地）</div>
                            `;

                            const connectors = animWrapper.querySelectorAll('.floor-connector');
                            if (connectors.length > 0) {
                                connectors[0].classList.add('connector-active');
                            }
                        }
                        this.isAnimating = false;
                    }, 600);
                });
            });
        } else {
            scrollLayer.scrollTop = 0;
            this.isAnimating = false;
        }
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
