class Ball {
    constructor(world, stage) {
        this.world = world;
        this.stage = stage;
        this.number = 1; // 기본 숫자 1

        const radius = GameConstants.BlockSize / 4.5;
        const x = (GameConstants.Cols * GameConstants.BlockSize) / 2;
        const y = -100;

        this.horizontalSpeed = 2;

        this.body = Matter.Bodies.circle(x, y, radius, {
            restitution: 0.4,
            friction: 0,
            frictionAir: 0,
            inertia: Infinity,
            label: 'ball'
        });

        Matter.Body.setVelocity(this.body, { x: this.horizontalSpeed, y: 0 });
        Matter.Composite.add(this.world, this.body);

        // 시각화 컨테이너 (그래픽과 텍스트를 묶음)
        this.container = new PIXI.Container();
        this.graphics = new PIXI.Graphics();
        this.drawNormal();

        // 숫자 텍스트
        this.text = new PIXI.Text({
            text: this.number.toString(),
            style: {
                fontFamily: 'Arial',
                fontSize: 14,
                fontWeight: 'bold',
                fill: 0x000000,
            }
        });
        this.text.anchor.set(0.5);

        this.container.addChild(this.graphics);
        this.container.addChild(this.text);
        this.stage.addChild(this.container);
    }

    drawNormal() {
        const radius = GameConstants.BlockSize / 4.5;
        this.graphics.clear();
        this.graphics.circle(0, 0, radius);
        this.graphics.fill(0xffffff);
        this.graphics.setStrokeStyle({ width: 2, color: 0xffe57f });
        this.graphics.stroke();
    }

    incrementNumber() {
        this.number = (this.number % GameConstants.ColorCount) + 1;
        this.text.text = this.number.toString();

        // 피드백 효과: 숫자가 바뀔 때 살짝 커졌다 작아짐
        this.container.scale.set(1.5);
        setTimeout(() => this.container.scale.set(1), 100);
    }

    decrementNumber() {
        this.number = this.number - 1;
        if (this.number < 1) this.number = GameConstants.ColorCount;
        this.text.text = this.number.toString();

        // 피드백 효과
        this.container.scale.set(0.7);
        setTimeout(() => this.container.scale.set(1), 100);
    }

    jump() {
        if (!this.body) return;
        // 위쪽으로 속도를 주어 점프하게 만듦
        Matter.Body.setVelocity(this.body, {
            x: this.body.velocity.x,
            y: -3
        });
    }

    setNumber(num) {
        if (num < 1 || num > GameConstants.ColorCount) return;
        this.number = num;
        this.text.text = this.number.toString();

        // 피드백 효과
        this.container.scale.set(1.2);
        setTimeout(() => this.container.scale.set(1), 100);
    }

    update() {
        if (!this.body) return;

        const velocity = this.body.velocity;
        const currentDir = velocity.x >= 0 ? 1 : -1;

        Matter.Body.setVelocity(this.body, {
            x: currentDir * this.horizontalSpeed,
            y: velocity.y
        });

        this.container.x = this.body.position.x;
        this.container.y = this.body.position.y;
    }
}
