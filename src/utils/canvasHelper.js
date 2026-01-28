// Common canvas helper for plot setup, resizing, clearing, and axis/grid drawing
export class CanvasHelper {
    constructor(canvasRef, height = 150) {
        this.canvas = canvasRef;
        this.ctx = this.canvas.getContext('2d');
        this.setSize(window.innerWidth, height);
        this.clear('#111');
    }

    setSize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
    }

    clear(color = '#111') {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawHorizontalLines(parts = 10, color = '#222') {
        this.ctx.save();
        this.ctx.strokeStyle = color;
        for (let i = 1; i < parts; i++) {
            const y = (this.canvas.height / parts) * i;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        this.ctx.restore();
    }

    drawVerticalLines(parts = 10, color = '#222') {
        this.ctx.save();
        this.ctx.strokeStyle = color;
        for (let i = 1; i < parts; i++) {
            const x = (this.canvas.width / parts) * i;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        this.ctx.restore();
    }

    drawText(text, x, y, color = '#fff', font = '12px sans-serif') {
        this.ctx.save();
        this.ctx.font = font;
        this.ctx.fillStyle = color;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText(text, x, y);
        this.ctx.restore();
    }

    // Helper for drawing spectrum bars
    drawSpectrumBar(x, y, width, height, color = '#0ff') {
        this.ctx.save();
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, width, height);
        this.ctx.restore();
    }
}

