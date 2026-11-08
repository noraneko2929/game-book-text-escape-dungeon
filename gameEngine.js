/**
 * gameEngine.js
 * ゲームの描画・状態管理ライブラリ（生還時の「？？？置き換え」＆「現在地非表示」対応版）
 */
class EscapeGameEngine {
    constructor(storyData, config = {}) {
        this.storyData = storyData;
        this.textDisplayId = config.textDisplayId || 'text-display';
        this.choiceDisplayId = config.choiceDisplayId || 'choice-display';
        this.statusBadgeId = config.statusBadgeId || 'status-badge';
        this.startSceneKey = config.startSceneKey || 'start';
        
        const baseKey = config.saveKey || 'escape_game';
        this.saveKey = baseKey + '_save';
        this.historyKey = baseKey + '_history';
        this.checkpointKey = baseKey + '_checkpoint';
        this.revealedKey = baseKey + '_revealed';
        this.isAnimating = false;
    }

    init() {
        try {
            const savedHistory = JSON.parse(localStorage.getItem(this.historyKey) || '[]');
            this.routeHistory = Array.isArray(savedHistory)
                ? savedHistory.filter(item =>
                    item &&
                    typeof item.id === 'string' &&
                    typeof item.name === 'string'
                )
                : [];
        } catch (error) {
            console.warn('Invalid route history was discarded.', error);
            this.routeHistory = [];
            localStorage.removeItem(this.historyKey);
        }
        const storedCheckpoint = localStorage.getItem(this.checkpointKey);
        this.currentCheckpoint = (storedCheckpoint && this.storyData[storedCheckpoint])
            ? storedCheckpoint
            : this.startSceneKey;
        this.hasReachedF15 = localStorage.getItem(this.revealedKey) === 'true';
        
        const savedScene = localStorage.getItem(this.saveKey);
        const targetScene = (savedScene && this.storyData[savedScene]) ? savedScene : this.currentCheckpoint;

        this.renderScene(targetScene, false);
    }

    isEndingScene(sceneKey) {
        return sceneKey === 'escape_true' || sceneKey.startsWith('escape_');
    }

    getMapNodeItem(sceneKey, scene) {
        if (this.isEndingScene(sceneKey)) {
            return { id: sceneKey, name: '地上への生還' };
        }

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
        if (this.isEndingScene(sceneKey)) return 'upper';
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
        const isEnding = this.isEndingScene(sceneKey);
        const isGameOver = (!scene.choices || scene.choices.length === 0) && !isEnding;

        let isNewFloorAdvanced = false;
        if (!isGameOver && !isEnding) {
            localStorage.setItem(this.saveKey, sceneKey);
            if (!oldLastItem || oldLastItem.id !== nodeItem.id) {
                if (oldLastItem) {
                    isNewFloorAdvanced = true;
                }
                this.routeHistory.push(nodeItem);
                localStorage.setItem(this.historyKey, JSON.stringify(this.routeHistory));
            }
        } else {
            // ゲームオーバー画面も保存し、再読み込み後に直前の場面へ戻らないようにする
            localStorage.setItem(this.saveKey, sceneKey);
        }

        const textDisplay = document.getElementById(this.textDisplayId);
        if (textDisplay) textDisplay.innerHTML = scene.text;

        const statusBadge = document.getElementById(this.statusBadgeId);
        if (statusBadge) {
            statusBadge.innerHTML = '';
            const headerResetBtn = document.createElement('button');
            headerResetBtn.className = 'btn-small-reset';
            headerResetBtn.innerText = '最初から';
            headerResetBtn.onclick = () => {
                if (confirm('最初からやり直しますか？（記録が削除されます）')) {
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
            endingMsg.style.color = '#ffc107';
            endingMsg.style.marginBottom = '10px';
            endingMsg.style.fontWeight = 'bold';
            endingMsg.innerText = 'おめでとうございます！生還を達成しました。';
            choiceDisplay.appendChild(endingMsg);
        }

        this.renderRouteMap(nodeItem.id, isGameOver, useTransition && isNewFloorAdvanced, isEnding);
    }

    renderRouteMap(currentNodeId, isGameOver, animateAdvance = false, isEnding = false) {
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
        mapTitle.innerText = '階層探索マップ';
        routeMapContainer.appendChild(mapTitle);

        const scrollLayer = document.createElement('div');
        scrollLayer.className = 'route-scroll-layer';

        let displayList = [...this.routeHistory];
        if (displayList.length === 0) {
            const currentScene = this.storyData[currentNodeId] || {};
            displayList = [{ id: currentNodeId, name: currentScene.status || '未知の最深部' }];
        }

        let targetAnimatingId = null;
        if (animateAdvance && displayList.length > 1) {
            this.isAnimating = true;
            targetAnimatingId = displayList[displayList.length - 1].id;
        }

        const itemsToRender = [];

        if (isEnding) {
            // 生還時は上の「？？？(未到達)」を追加せず、現在の到達先を生還専用の表示枠として最上部に配置（「（現在地）」は付けない）
            const currentSceneObj = this.storyData[currentNodeId] || {};
            const resolvedCurrent = this.getMapNodeItem(currentNodeId, currentSceneObj);
            itemsToRender.push({
                type: 'floor',
                id: currentNodeId,
                name: resolvedCurrent.name,
                className: 'floor-current floor-clear'
            });
        } else {
            // 1. 【上】未到達階層（？？？） ※ゲームオーバー時は非表示
            if (!isGameOver) {
                itemsToRender.push({
                    type: 'floor',
                    id: 'unknown_next',
                    name: '？？？ (未到達)',
                    className: 'floor-unknown'
                });
            }

            // 2. 【中】現在地
            const currentItem = displayList[displayList.length - 1] || { id: currentNodeId, name: '現在地' };
            const currentSceneObj = this.storyData[currentItem.id] || {};
            const resolvedCurrent = this.getMapNodeItem(currentItem.id, currentSceneObj);
            
            let currentClass = isGameOver ? 'floor-current floor-dead' : 'floor-current';
            let labelText = `${resolvedCurrent.name}（現在地）`;

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
        }

        // 3. 【下】過去の履歴（生還時は履歴の末尾＝直前の階層を含め、それ以前を過去履歴として描画）
        const historyStartIndex = isEnding ? displayList.length - 1 : displayList.length - 2;
        for (let i = historyStartIndex; i >= 0; i--) {
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
            const floorDot = document.createElement('div');
            floorDot.className = 'floor-dot';
            const floorLabel = document.createElement('div');
            floorLabel.className = 'floor-label';
            floorLabel.textContent = item.name;
            floorItem.append(floorDot, floorLabel);
            scrollLayer.appendChild(floorItem);

            if (index < itemsToRender.length - 1) {
                const connector = document.createElement('div');
                const isNextUnknown = itemsToRender[index + 1].className.includes('floor-unknown');
                connector.className = `floor-connector ${!isNextUnknown ? 'connector-active' : ''}`;
                scrollLayer.appendChild(connector);
            }
        });

        routeMapContainer.appendChild(scrollLayer);

        const itemStepHeight = 42;
        const maxScrollableHeight = scrollLayer.scrollHeight - scrollLayer.clientHeight;

        if (animateAdvance && maxScrollableHeight > 0) {
            scrollLayer.scrollTop = itemStepHeight;

            const startPos = scrollLayer.scrollTop;
            const targetPos = 0;
            const distance = targetPos - startPos;
            const duration = 450;
            let startTime = null;

            const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

            const scrollAnimation = currentTime => {
                if (!startTime) startTime = currentTime;
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const ease = easeOutCubic(progress);

                scrollLayer.scrollTop = startPos + (distance * ease);

                if (progress < 1) {
                    requestAnimationFrame(scrollAnimation);
                } else {
                    const topItems = scrollLayer.querySelectorAll('.route-floor-item');
                    const targetItem = topItems.length > 1 ? topItems[1] : topItems[0];
                    
                    if (targetItem && !isEnding) {
                        const sceneObj = this.storyData[currentNodeId] || {};
                        const resolvedNode = this.getMapNodeItem(currentNodeId, sceneObj);
                        
                        let finalClass = isGameOver ? 'floor-current floor-dead' : 'floor-current';

                        targetItem.className = `route-floor-item ${finalClass}`;
                        const floorDot = document.createElement('div');
                        floorDot.className = 'floor-dot';
                        const floorLabel = document.createElement('div');
                        floorLabel.className = 'floor-label';
                        floorLabel.textContent = `${resolvedNode.name}（現在地）`;
                        targetItem.replaceChildren(floorDot, floorLabel);

                        const connectors = scrollLayer.querySelectorAll('.floor-connector');
                        if (connectors.length > 0) {
                            connectors[0].classList.add('connector-active');
                        }
                    }
                    this.isAnimating = false;
                }
            };

            requestAnimationFrame(scrollAnimation);

        } else if (animateAdvance) {
            setTimeout(() => {
                const topItems = scrollLayer.querySelectorAll('.route-floor-item');
                const targetItem = topItems.length > 1 ? topItems[1] : topItems[0];
                
                if (targetItem && !isEnding) {
                    const sceneObj = this.storyData[currentNodeId] || {};
                    const resolvedNode = this.getMapNodeItem(currentNodeId, sceneObj);
                    
                    let finalClass = isGameOver ? 'floor-current floor-dead' : 'floor-current';

                    targetItem.className = `route-floor-item ${finalClass}`;
                    const floorDot = document.createElement('div');
                    floorDot.className = 'floor-dot';
                    const floorLabel = document.createElement('div');
                    floorLabel.className = 'floor-label';
                    floorLabel.textContent = `${resolvedNode.name}（現在地）`;
                    targetItem.replaceChildren(floorDot, floorLabel);

                    const connectors = scrollLayer.querySelectorAll('.floor-connector');
                    if (connectors.length > 0) {
                        connectors[0].classList.add('connector-active');
                    }
                }
                this.isAnimating = false;
            }, 200);
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
