class Ball {
    constructor(world, stage) {
        this.world = world;
        this.stage = stage;

        // 공 크기 축소: BlockSize / 3 -> / 4.5 
        const radius = GameConstants.BlockSize / 4.5;
        const x = (GameConstants.Cols * GameConstants.BlockSize) / 2;
        const y = -100;

        this.horizontalSpeed = 2;

        // Matter.js Body
        this.body = Matter.Bodies.circle(x, y, radius, {
            restitution: 0.4, // 탄성도 절반으로 감소
            friction: 0,
            frictionAir: 0,
            inertia: Infinity,
            label: 'ball'
        });

        // 초기 속도
        Matter.Body.setVelocity(this.body, { x: this.horizontalSpeed, y: 0 });
        Matter.Composite.add(this.world, this.body);

        // 시각화
        this.graphics = new PIXI.Graphics();
        this.drawNormal();
        this.stage.addChild(this.graphics);
    }

    drawNormal() {
        const radius = GameConstants.BlockSize / 4.5;
        this.graphics.clear();
        this.graphics.circle(0, 0, radius);
        this.graphics.fill(0xffffff);
        this.graphics.setStrokeStyle({ width: 2, color: 0xffe57f });
        this.graphics.stroke();
    }

    update() {
        if (!this.body) return;

        const velocity = this.body.velocity;
        const currentDir = velocity.x >= 0 ? 1 : -1;

        Matter.Body.setVelocity(this.body, {
            x: currentDir * this.horizontalSpeed,
            y: velocity.y
        });

        this.graphics.x = this.body.position.x;
        this.graphics.y = this.body.position.y;
    }
}
