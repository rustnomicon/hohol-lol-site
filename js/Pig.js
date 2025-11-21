export class Pig {
    constructor(x, y, speed, dir) {
        this.x = x;
        this.y = y;
        this.speed = speed;   // пикс/с
        this.dir = dir;       // 'up','down','left','right'
        this.frame = 0;
        this.frameTime = 0;
    }

    update(dt, w, h) {
        let vx = 0, vy = 0;
        switch (this.dir) {
            case 'up': vy = -this.speed; break;
            case 'down': vy = this.speed; break;
            case 'left': vx = -this.speed; break;
            case 'right': vx = this.speed; break;
        }
        this.x += vx * dt;
        this.y += vy * dt;

        // смена направления при выходе за край
        if (this.x < 0) { this.x = 0; this.dir = 'right'; }
        if (this.x > w) { this.x = w; this.dir = 'left'; }
        if (this.y < 0) { this.y = 0; this.dir = 'down'; }
        if (this.y > h) { this.y = h; this.dir = 'up'; }

        // анимация кадра ~10 fps
        this.frameTime += dt;
        if (this.frameTime > 0.1) {
            this.frameTime = 0;
            this.frame = (this.frame + 1) % 3; // 3 кадра по горизонтали
        }
    }

    draw(ctx, img, frameW, frameH, dpr) {
        const dirRow = {
            up: 0,    // первая строка
            right: 1, // вторая строка
            down: 2,  // третья строка
            left: 3   // четвёртая строка
        }[this.dir];

        const sx = this.frame * frameW;
        const sy = dirRow * frameH;

        const dx = (this.x - frameW / 2) * dpr;
        const dy = (this.y - frameH / 2) * dpr;
        const dw = frameW * dpr;
        const dh = frameH * dpr;

        ctx.drawImage(img, sx, sy, frameW, frameH, dx, dy, dw, dh);
    }
}
