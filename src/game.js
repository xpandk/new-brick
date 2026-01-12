const { Engine, World, Bodies, Composite } = Matter;

class Game {
    constructor() {
        this.init();
    }

    async init() {
        this.app = new PIXI.Application();
        try {
            await this.app.init({
                canvas: document.getElementById('game-canvas'),
                backgroundAlpha: 0,
                resizeTo: document.getElementById('game-container'),
                resolution: window.devicePixelRatio || 1,
                autoDensity: true,
            });
        } catch (error) {
            console.error(error);
            return;
        }

        this.engine = Engine.create();
        this.world = this.engine.world;
        // 중력 설정 (속도 감소에 맞춰 0.5로 조정)
        this.engine.gravity.y = 0.5;

        const boardWidth = GameConstants.Cols * GameConstants.BlockSize;
        const screenWidth = this.app.screen.width;
        this.offsetX = (screenWidth - boardWidth) / 2;

        // 1. 레이어 설정
        this.gameLayer = new PIXI.Container();
        this.gameLayer.x = this.offsetX;

        // 보드 높이 계산 (11줄)
        const boardHeight = GameConstants.VisibleRows * GameConstants.BlockSize;
        // 화면 중앙에 위치하도록 초기 Y 설정
        this.gameLayer.y = (this.app.screen.height - boardHeight) / 2;

        this.app.stage.addChild(this.gameLayer);

        // 2. 물리 벽 생성 (공의 로컬 좌표계 기준)
        const wallOptions = { isStatic: true, restitution: 1, friction: 0 };
        // 공이 gameLayer 안에서 움직이므로, 벽도 0과 boardWidth 위치에 있어야 함
        const leftLimit = Bodies.rectangle(-5, 2000, 10, 10000, wallOptions);
        const rightLimit = Bodies.rectangle(boardWidth + 5, 2000, 10, 10000, wallOptions);
        Composite.add(this.world, [leftLimit, rightLimit]);

        // 3. 벽 시각화
        const wallGraphics = new PIXI.Graphics();
        wallGraphics.rect(-10, -5000, 10, 10000);
        wallGraphics.rect(boardWidth, -5000, 10, 10000);
        wallGraphics.fill({ color: 0x334155, alpha: 0.8 });
        this.gameLayer.addChild(wallGraphics);

        // 4. 보드, 공, 이펙트 생성
        this.effects = new EffectManager(this.app, this.gameLayer);
        this.board = new Board(this);
        this.gameLayer.addChild(this.board.container);
        this.ball = new Ball(this.world, this.gameLayer);

        this.board.generateInitialBoard();

        // 매칭 이벤트 처리 (콤보 기능 활성화)
        this.matchCombo = 0;
        this.lastMatchTime = 0;
        window.addEventListener('match', () => {
            const now = Date.now();
            // 마지막 매칭으로부터 일정 시간(2초) 이내면 콤보 증가
            if (now - this.lastMatchTime < GameConstants.MatchComboWindow) {
                this.matchCombo++;
            } else {
                this.matchCombo = 1;
            }
            this.lastMatchTime = now;

            // 상단 UI 업데이트
            document.getElementById('combo-count').innerText = this.matchCombo;
        });

        // 낙하 추적용 변수
        this.isFalling = false;
        this.fallStartY = 0;
        this.lastSpawnedMeter = 0; // 지점별 콤보 생성을 위한 변수
        this.ballInitialY = this.ball.body.position.y; // 초기 위치 저장

        this.app.ticker.add((ticker) => {
            Engine.update(this.engine, ticker.deltaMS);
            this.ball.update();
            this.handleScrolling();
            this.updateFallLogic();
        });
    }

    updateFallLogic() {
        if (!this.ball || !this.ball.body) return;

        const velocityY = this.ball.body.velocity.y;
        const currentY = this.ball.body.position.y;

        // 1. 누적 깊이 업데이트 (항상 갱신)
        const totalDepthDist = Math.max(0, currentY - this.ballInitialY);
        const totalMeters = Math.floor(totalDepthDist / GameConstants.BlockSize);
        document.getElementById('height-value').innerText = totalMeters;

        // 2. 낙하 콤보 로직 (개별 낙하 구간 측정)
        if (velocityY > 0.5) {
            // 새롭게 떨어지기 시작할 때만 시작 지점 기록
            if (!this.isFalling) {
                this.isFalling = true;
                this.fallStartY = currentY;
                this.lastSpawnedMeter = 0;
            }

            // 떨어지는 도중에 1m 단위로 콤보 생성 (2m부터 시작)
            const currentFallDist = currentY - this.fallStartY;
            const currentMeters = Math.floor(currentFallDist / GameConstants.BlockSize);

            if (currentMeters >= 2 && currentMeters > this.lastSpawnedMeter) {
                this.effects.spawnFallComboText(
                    this.ball.body.position.x,
                    this.ball.body.position.y,
                    currentMeters
                );
                audioManager.playFallComboSound(currentMeters);
                this.lastSpawnedMeter = currentMeters;
            }
        } else if (this.isFalling && velocityY <= 0.1) {
            // 충돌 또는 멈춤 (착지)
            this.isFalling = false;
            this.lastSpawnedMeter = 0;
        }
    }

    handleScrolling() {
        if (!this.ball || !this.ball.body) return;

        const ballY = this.ball.body.position.y;
        const centerY = this.app.screen.height / 2;

        // 1. 일방향 하단 스크롤
        const targetLayerY = centerY - ballY;
        if (targetLayerY < this.gameLayer.y) {
            this.gameLayer.y = targetLayerY;
        }

        // 2. 보드 순환 로직 수정 (하단 생성 먼저, 이후 상단 제거)
        const boardMidY = (this.board.minY + 5.5) * GameConstants.BlockSize;

        // 중간 지점 도달 시 하단 줄 추가 (줄 수가 11줄보다 적을 때 미리 추가)
        if (ballY > boardMidY && this.board.maxY < this.board.minY + 11) {
            this.board.addRowBottom();
        }

        // 3. 상단 줄 제거: 공이 조금 더 내려가서 (6.5줄 지점) 스크롤이 확실히 진행되었을 때 제거
        const removeTriggerY = (this.board.minY + 6.5) * GameConstants.BlockSize;
        if (ballY > removeTriggerY && this.board.maxY >= this.board.minY + 11) {
            this.board.removeRowTop();
        }
    }
}

window.onload = () => { new Game(); };
