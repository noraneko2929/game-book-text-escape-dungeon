/**
 * gameEngine.js
 * ゲームの描画・状態管理ライブラリ（ネットワークマップUI対応版）
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
        this.edgesKey = config.saveKey + '_route_edges';
        this.revealedKey = config.saveKey + '_revealed_floors';
    }

    init() {
        const savedScene = localStorage.getItem(this.saveKey);
        const targetScene = (savedScene && this.storyData[savedScene]) ? savedScene : this.startSceneKey;
        
        this.routeHistory = JSON.parse(localStorage.getItem(this.historyKey) || '[]');
        this.routeEdges = JSON.parse(localStorage.getItem(this.edgesKey) || '[]');
        this.hasReachedF15 = localStorage.getItem(this.revealedKey) === 'true';

        this.renderScene(targetScene);
    }

    isFloorStart(sceneKey) {
        if (sceneKey === 'start') return true;
        if (sceneKey.endsWith('_p1')) return true;
        return false;
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

        // 履歴と接続エッジ（線）の記録
        if (this.routeHistory.length === 0) {
            this.routeHistory.push(sceneKey);
        } else {
            const prevSceneKey = this.routeHistory[this.routeHistory.length - 1];
            if (prevSceneKey !== sceneKey) {
                this.routeHistory.push(sceneKey);
                // どのノードからどのノードへ移動したかをエッジとして記録
                const edgeKey = `${prevSceneKey}-->${sceneKey}`;
                if (!this.routeEdges.includes(edgeKey)) {
                    this.routeEdges.push(edgeKey);
                }
            }
        }

        localStorage.setItem(this.historyKey, JSON.stringify(this.routeHistory));
        localStorage.setItem(this.edgesKey, JSON.stringify(this.routeEdges));
        localStorage.setItem(this.saveKey, sceneKey);

        if (this.isFloorStart(sceneKey)) {
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
            const endingMsg = document.createElement('div');
            endingMsg.style.color = '#4caf50';
            endingMsg.style.marginBottom = '10px';
            endingMsg.style.fontWeight = 'bold';
            endingMsg.innerText = 'おめでとうございます！生還を達成しました。';
            choiceDisplay.appendChild(endingMsg);
        }

        // ネットワークマップの描画
        this.renderRouteMap(sceneKey);

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
                localStorage.removeItem(this.edgesKey);
                localStorage.removeItem(this.revealedKey);
                this.routeHistory = [];
                this.routeEdges = [];
                this.hasReachedF15 = false;
                this.renderScene(this.startSceneKey);
            }
        };

        restartContainer.appendChild(restartBtn);
        choiceDisplay.appendChild(restartContainer);
    }

    // スクショのようなネットワーク・ツリーマップを描画する関数
    renderRouteMap(currentSceneKey) {
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
        mapTitle.innerText = '🗺️ 探索ルートマップ';
        routeMapContainer.appendChild(mapTitle);

        // ネットワークビューポート（SVGまたはカスタムノードエリア）
        const svgContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svgContainer.setAttribute('class', 'route-svg-map');
        svgContainer.setAttribute('viewBox', '0 0 550 180');

        // 通過したユニークなノードリスト
        const visitedSet = new Set(this.routeHistory);
        const nodesArray = Array.from(visitedSet);

        // 簡易レイアウト座標計算（X軸に沿って配置、分岐は上下にオフセット）
        const nodePositions = {};
        const totalNodes = nodesArray.length;
        const spacingX = Math.max(40, 500 / (totalNodes || 1));

        nodesArray.forEach((key, index) => {
            let x = 40 + index * spacingX;
            let y = 90;
            // 分岐や死亡ノードの上下位置調整
            if (key.includes('gameover')) {
                y = index % 2 === 0 ? 140 : 40;
            } else if (index % 2 !== 0) {
                y = 60;
            } else {
                y = 120;
            }
            nodePositions[key] = { x, y };
        });

        // 1. エッジ（線）の描画
        this.routeEdges.forEach(edge => {
            const [from, to] = edge.split('-->');
            if (nodePositions[from] && nodePositions[to]) {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', nodePositions[from].x);
                line.setAttribute('y1', nodePositions[from].y);
                line.setAttribute('x2', nodePositions[to].x);
                line.setAttribute('y2', nodePositions[to].y);
                line.setAttribute('class', 'map-edge-line');
                svgContainer.appendChild(line);
            }
        });

        // 2. ノード（点）の描画
        nodesArray.forEach(key => {
            const pos = nodePositions[key];
            const scene = this.storyData[key];
            if (!scene) return;

            const isCurrent = (key === currentSceneKey);
            const isGameOver = !scene.choices || scene.choices.length === 0;

            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.setAttribute('class', 'map-node-group');

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', pos.x);
            circle.setAttribute('cy', pos.y);
            circle.setAttribute('r', isCurrent ? '8' : '5');
            
            let circleClass = 'map-node-passed';
            if (isCurrent) circleClass = 'map-node-current';
            else if (isGameOver && !key.includes('escape')) circleClass = 'map-node-dead';
            circle.setAttribute('class', circleClass);

            // ツールチップ（ラベル）
            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            let labelText = this.hasReachedF15 || !key.startsWith('f') ? (scene.status || key) : '???';
            title.textContent = labelText;

            circle.appendChild(title);
            g.appendChild(circle);
            svgContainer.appendChild(g);
        });

        routeMapContainer.appendChild(svgContainer);
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
