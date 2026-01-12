class Board {
    constructor(scene) {
        this.scene = scene;
        this.blocks = new Map();
        this.selectedBlock = null;     // 첫 번째 선택된 블록
        this.secondBlock = null;       // 드래그 중인 두 번째 후보 블록
        this.minY = 0;
        this.maxY = GameConstants.VisibleRows - 1;

        this.container = new PIXI.Container();
        this.isDragging = false;

        // 빈 공간 클릭 감지를 위해 컨테이너 설정
        this.container.interactive = true;
        this.container.hitArea = new PIXI.Rectangle(
            0, -100000,
            GameConstants.Cols * GameConstants.BlockSize,
            1000000 // 충분히 큰 값으로 설정하여 하단 블록이 잘리지 않게 함
        );

        this.container.on('pointerdown', (e) => {
            // 블록이 아닌 빈 공간을 눌렀을 때만 드래그 상태 시작
            if (e.target === this.container) {
                this.isDragging = true;
                this.dragMoved = true;
                this.downBlock = null;
                this.justSelected = false;
                // 빈 공간 클릭 시 기존 선택 해제 (선택사항)
                if (this.selectedBlock) this.deselect(this.selectedBlock);
            }
        });

        // 전역 마우스 업 이벤트 등록
        window.addEventListener('pointerup', (e) => this.handleGlobalPointerUp(e));
    }

    createBlock(x, y) {
        const colorId = Math.floor(Math.random() * GameConstants.ColorCount);
        const block = new PIXI.Graphics();

        this.drawBlock(block, colorId, false);

        const posX = x * GameConstants.BlockSize;
        const posY = y * GameConstants.BlockSize;

        block.x = posX;
        block.y = posY;
        block.interactive = true;
        block.cursor = 'pointer';

        const body = Matter.Bodies.rectangle(
            posX + GameConstants.BlockSize / 2,
            posY + GameConstants.BlockSize / 2,
            GameConstants.BlockSize, // 틈새 없게 꽉 채움
            GameConstants.BlockSize,
            { isStatic: true, label: 'block' }
        );

        const blockData = {
            graphics: block,
            body: body,
            x: x,
            y: y,
            colorId: colorId,
            selected: false
        };

        body.blockData = blockData;
        Matter.Composite.add(this.scene.world, body);

        // 입력 이벤트
        block.on('pointerdown', (e) => {
            // 이벤트를 캡처하여 컨테이너로 전달되지 않게 하거나, 컨테이너에서 체크
            this.onBlockDown(blockData);
        });

        block.on('pointerover', (e) => {
            if (this.isDragging) {
                this.onBlockHover(blockData);
            }
        });

        block.on('pointerout', (e) => {
            if (this.isDragging) {
                this.onBlockOut(blockData);
            }
        });

        this.container.addChild(block);
        this.blocks.set(`${x},${y}`, blockData);
        return blockData;
    }

    drawBlock(graphics, colorId, isSelected, isSecond = false) {
        graphics.clear();
        if (isSelected) {
            // 모든 선택된 블록의 테두리를 흰색(0xffffff)으로 통일
            graphics.setStrokeStyle({ width: 4, color: 0xffffff });
            graphics.roundRect(2, 2, GameConstants.BlockSize - 4, GameConstants.BlockSize - 4, 8);
            graphics.stroke();
        }

        graphics.roundRect(2, 2, GameConstants.BlockSize - 4, GameConstants.BlockSize - 4, 8);
        graphics.fill(GameConstants.Colors[colorId]);
    }

    onBlockDown(block) {
        this.isDragging = true;
        this.dragMoved = false;
        this.downBlock = block;
        this.justSelected = false;

        if (!this.selectedBlock) {
            // 첫 번째 블록 선택 시 클릭한 순간 바로 하이라이트 표시
            this.selectFirst(block);
            this.justSelected = true;
        } else if (this.selectedBlock !== block && this.selectedBlock.colorId === block.colorId) {
            // 두 번째 블록도 누르는 순간 바로 하이라이트 표시
            this.selectSecond(block);
            this.justSelected = true;
        }
    }

    onBlockOut(block) {
        if (!this.isDragging) return;

        // 누르고 있던 블록을 벗어나면 드래그가 시작된 것으로 간주
        if (this.downBlock === block) {
            this.dragMoved = true;
        }

        // 두 번째 선택된 블록에서 벗어날 때의 취소 로직
        // "첫 번째 블록부터 드래그하여 두 번째 블록에 도달한 경우"에는 취소하지 않음 (유지 후 떼면 매칭)
        // 즉, 이번 클릭(또는 드래그)을 시작한 블록(downBlock)이 바로 그 두 번째 블록일 때만 취소
        if (this.secondBlock === block && this.downBlock === block) {
            this.deselect(this.secondBlock);
            this.secondBlock = null;
        }
    }

    onBlockHover(block) {
        if (!this.isDragging) return;

        // 첫 번째 블록이 선택되지 않은 상태에서 드래그 중 새 블록에 진입하면 첫 번째로 지정
        if (!this.selectedBlock) {
            this.selectFirst(block);
            this.dragMoved = true;
            return;
        }

        // 마우스가 눌린 채로 움직였는지 체크
        if (this.downBlock !== block && !this.dragMoved) {
            this.dragMoved = true;
            // 드래그 중 첫 번째 블록이 선택 안 되어 있었다면 선택
            if (!this.selectedBlock) {
                this.selectFirst(this.downBlock);
            }
        }

        if (!this.selectedBlock) return;

        // 첫 번째 선택한 블록으로 다시 돌아오면 두 번째 선택을 해제
        if (this.selectedBlock === block) {
            if (this.secondBlock) {
                this.deselect(this.secondBlock);
                this.secondBlock = null;
            }
            return;
        }

        // 동일한 색상 블록 위에 올라갔을 때만 갱신 (드래그 중)
        if (block.colorId === this.selectedBlock.colorId) {
            if (this.secondBlock !== block) {
                this.selectSecond(block);
            }
        }
    }

    handleGlobalPointerUp(e) {
        if (!this.isDragging) return;
        this.isDragging = false;

        // 드래그가 발생했다면 (마우스를 누른 채로 움직였거나 빈공간에서 시작했다면)
        if (this.dragMoved) {
            if (this.selectedBlock && this.secondBlock) {
                const path = this.findPath(this.selectedBlock, this.secondBlock);
                if (path) {
                    this.matchSuccess(this.selectedBlock, this.secondBlock, path);
                } else {
                    this.deselect(this.selectedBlock);
                    this.deselect(this.secondBlock);
                }
            } else if (this.selectedBlock) {
                this.deselect(this.selectedBlock);
            }
        } else if (this.downBlock) {
            // 드래그가 아니라 단순 클릭(브릭 위에서 누르고 바로 뗌)이라면
            this.handleSingleClick(this.downBlock);
        }

        this.downBlock = null;
        this.justSelected = false;
    }

    handleSingleClick(block) {
        if (!block) return;

        if (!this.selectedBlock) {
            // 안전 차원 (이미 onBlockDown에서 처리됨)
            this.selectFirst(block);
        } else {
            // 이미 하나 선택된 상태
            if (this.selectedBlock === block) {
                // 방금 누른 게 아니라면 선택 해제
                if (!this.justSelected) {
                    this.deselect(block);
                }
            } else if (this.selectedBlock.colorId === block.colorId) {
                // 두 번째 블록 매칭 수행
                const b1 = this.selectedBlock;
                const b2 = block;
                const path = this.findPath(b1, b2);

                if (path) {
                    this.matchSuccess(b1, b2, path);
                } else {
                    // 경로가 없으면 피드백을 위해 잠시 보여준 뒤 해제하거나 즉시 해제
                    this.deselect(b1);
                    this.deselect(b2);
                }
            } else {
                // 다른 색 클릭 시 기존 선택 해제하고 새로 선택할 수도 있지만, 일반적으론 기존 해제
                this.deselect(this.selectedBlock);
            }
        }
    }

    selectFirst(block) {
        this.selectedBlock = block;
        block.selected = true;
        this.drawBlock(block.graphics, block.colorId, true, false);
    }

    selectSecond(block) {
        if (this.secondBlock) this.deselect(this.secondBlock);
        this.secondBlock = block;
        this.drawBlock(block.graphics, block.colorId, true, true);
    }

    deselect(block) {
        if (!block) return;
        block.selected = false;
        this.drawBlock(block.graphics, block.colorId, false);
        if (this.selectedBlock === block) this.selectedBlock = null;
        if (this.secondBlock === block) this.secondBlock = null;
    }

    matchSuccess(b1, b2, path) {
        // 이펙트 및 사운드 효과 (전역 싱글톤처럼 사용하거나 scene 참조 이용)
        if (this.scene.effects) {
            const centerX = (b1.graphics.x + b2.graphics.x) / 2;
            const centerY = (b1.graphics.y + b2.graphics.y) / 2;

            this.scene.effects.spawnExplosion(b1.graphics.x + 25, b1.graphics.y + 25, GameConstants.Colors[b1.colorId]);
            this.scene.effects.spawnExplosion(b2.graphics.x + 25, b2.graphics.y + 25, GameConstants.Colors[b2.colorId]);

            // 경로 시각화 추가
            this.scene.effects.drawMatchPath(path, GameConstants.Colors[b1.colorId]);

            // 콤보 계산용 (임시)
            const combo = parseInt(document.getElementById('combo-count').innerText) + 1;
            this.scene.effects.spawnComboText(centerX + 25, centerY + 25, combo);

            audioManager.playMatchSound();
            if (combo > 1) audioManager.playComboSound(combo);
        }

        this.removeBlock(b1);
        this.removeBlock(b2);
        this.selectedBlock = null;
        this.secondBlock = null;
        window.dispatchEvent(new CustomEvent('match', { detail: { path } }));
    }

    removeBlock(block) {
        if (block.graphics.parent) {
            block.graphics.parent.removeChild(block.graphics);
        }
        if (block.body) {
            Matter.Composite.remove(this.scene.world, block.body);
        }
        this.blocks.delete(`${block.x},${block.y}`);
    }

    // 사천성 알고리즘 (기존 동일)
    findPath(start, end) {
        const dx = [0, 1, 0, -1];
        const dy = [1, 0, -1, 0];
        const queue = [{ x: start.x, y: start.y, dir: -1, turns: 0, path: [] }];
        const visited = new Set();

        while (queue.length > 0) {
            const { x, y, dir, turns, path } = queue.shift();
            if (x === end.x && y === end.y) return [...path, { x, y }];

            for (let i = 0; i < 4; i++) {
                if (dir !== -1 && Math.abs(dir - i) === 2) continue;
                const nextTurns = dir === -1 ? 0 : (dir === i ? turns : turns + 1);
                if (nextTurns > 2) continue;

                const nx = x + dx[i];
                const ny = y + dy[i];

                if (this.isValid(nx, ny, end)) {
                    const key = `${nx},${ny},${i},${nextTurns}`;
                    if (!visited.has(key)) {
                        visited.add(key);
                        queue.push({ x: nx, y: ny, dir: i, turns: nextTurns, path: [...path, { x, y }] });
                    }
                }
            }
        }
        return null;
    }

    isValid(x, y, target) {
        if (x < 0 || x >= GameConstants.Cols) return false;
        if (y < -5 || y > (this.maxY + 10)) return false;
        if (x === target.x && y === target.y) return true;
        if (this.blocks.has(`${x},${y}`)) return false;
        return true;
    }

    generateRow(y) {
        for (let x = 0; x < GameConstants.Cols; x++) {
            this.createBlock(x, y);
        }
    }

    addRowBottom() {
        this.maxY++;
        this.generateRow(this.maxY);

        // 효과 추가
        if (this.scene.effects) {
            this.scene.effects.spawnRowEffect(this.maxY);
        }
        audioManager.playRowSpawnSound();
    }

    removeRowTop() {
        for (let x = 0; x < GameConstants.Cols; x++) {
            const key = `${x},${this.minY}`;
            const block = this.blocks.get(key);
            if (block) {
                this.removeBlock(block);
            }
        }
        this.minY++;
    }

    generateInitialBoard() {
        // 정확히 11줄(0~10)의 브릭을 생성하여 유지
        for (let y = 0; y < GameConstants.VisibleRows; y++) {
            this.generateRow(y);
        }
        this.minY = 0;
        this.maxY = GameConstants.VisibleRows - 1;

        window.addEventListener('pointerup', () => {
            this.isDragging = false;
        });
    }
}
