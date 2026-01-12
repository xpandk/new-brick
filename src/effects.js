class EffectManager {
    constructor(app, container) {
        this.app = app;
        this.container = container;
        this.particles = [];
        this.floatingTexts = [];

        this.app.ticker.add((ticker) => this.update(ticker));
    }

    // 브릭 파괴 파티클 생성
    spawnExplosion(x, y, color) {
        const particleCount = 10;
        for (let i = 0; i < particleCount; i++) {
            const p = new PIXI.Graphics();
            p.rect(-4, -4, 8, 8);
            p.fill(color);

            p.x = x + (Math.random() - 0.5) * 20;
            p.y = y + (Math.random() - 0.5) * 20;

            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 4;

            this.container.addChild(p);
            this.particles.push({
                graphics: p,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                decay: 0.02 + Math.random() * 0.03
            });
        }
    }

    // 사천성 경로 표시
    drawMatchPath(path, color) {
        if (!path || path.length < 2) return;

        const line = new PIXI.Graphics();
        line.setStrokeStyle({ width: 5, color: color, cap: 'round', join: 'round' });

        // 경로의 중심점들을 연결
        const halfSize = GameConstants.BlockSize / 2;

        line.moveTo(path[0].x * GameConstants.BlockSize + halfSize, path[0].y * GameConstants.BlockSize + halfSize);

        for (let i = 1; i < path.length; i++) {
            line.lineTo(path[i].x * GameConstants.BlockSize + halfSize, path[i].y * GameConstants.BlockSize + halfSize);
        }

        line.stroke();

        // 글로우 효과를 위한 추가 라인
        line.setStrokeStyle({ width: 10, color: color, alpha: 0.3, cap: 'round', join: 'round' });
        line.moveTo(path[0].x * GameConstants.BlockSize + halfSize, path[0].y * GameConstants.BlockSize + halfSize);
        for (let i = 1; i < path.length; i++) {
            line.lineTo(path[i].x * GameConstants.BlockSize + halfSize, path[i].y * GameConstants.BlockSize + halfSize);
        }
        line.stroke();

        this.container.addChild(line);
        this.floatingTexts.push({
            graphics: line,
            vy: 0,
            life: 1.0,
            decay: 0.05 // 약 0.4초간 유지 후 페이드 아웃
        });
    }

    // 콤보 텍스트 생성
    spawnComboText(x, y, combo) {
        const style = new PIXI.TextStyle({
            fontFamily: 'Outfit',
            fontSize: 24 + (combo * 2),
            fontWeight: '900',
            fill: '#ffde7d',
            dropShadow: {
                alpha: 0.5,
                blur: 4,
                color: '#000000',
                distance: 2,
            }
        });

        const text = new PIXI.Text({ text: `COMBO ${combo}`, style });
        text.anchor.set(0.5);
        text.x = x;
        text.y = y;

        this.container.addChild(text);
        this.floatingTexts.push({
            graphics: text,
            vy: -2,
            life: 1.0,
            decay: 0.02
        });
    }

    // 낙하 콤보 텍스트 생성
    spawnFallComboText(x, y, meters) {
        const style = new PIXI.TextStyle({
            fontFamily: 'Outfit',
            fontSize: 32,
            fontWeight: '900',
            fill: '#e94560', // 단순 색상으로 변경
            stroke: '#ffffff',
            strokeThickness: 4,
            dropShadow: {
                alpha: 0.5,
                blur: 10,
                color: '#000000',
                distance: 0,
            }
        });

        const text = new PIXI.Text({ text: `FALL ${meters}m!`, style });
        text.anchor.set(0.5);
        text.x = x;
        text.y = y - 40; // 공 약간 위

        this.container.addChild(text);
        this.floatingTexts.push({
            graphics: text,
            vy: -4,
            life: 1.5,
            decay: 0.02
        });
    }

    // 하단 줄 생성 효과 (반짝임)
    spawnRowEffect(y) {
        const glow = new PIXI.Graphics();
        const width = GameConstants.Cols * GameConstants.BlockSize;
        glow.rect(0, y * GameConstants.BlockSize, width, GameConstants.BlockSize);
        glow.fill({ color: 0xffffff, alpha: 0.3 });

        this.container.addChild(glow);
        this.floatingTexts.push({
            graphics: glow,
            vy: 0,
            life: 1.0,
            decay: 0.1 // 10프레임 정도 후에 사라짐
        });
    }

    update(ticker) {
        // 파티클 업데이트
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.graphics.x += p.vx * ticker.deltaTime;
            p.graphics.y += p.vy * ticker.deltaTime;
            p.life -= p.decay * ticker.deltaTime;
            p.graphics.alpha = p.life;
            p.graphics.scale.set(p.life);

            if (p.life <= 0) {
                this.container.removeChild(p.graphics);
                this.particles.splice(i, 1);
            }
        }

        // 플로팅 텍스트 업데이트
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const t = this.floatingTexts[i];
            t.graphics.y += t.vy * ticker.deltaTime;
            t.life -= t.decay * ticker.deltaTime;
            t.graphics.alpha = t.life;

            if (t.life <= 0) {
                this.container.removeChild(t.graphics);
                this.floatingTexts.splice(i, 1);
            }
        }
    }
}
