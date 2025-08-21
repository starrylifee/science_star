import DrawingCanvas from '../shared/drawing.js';

export function initChapter8() {
    if (!window.__ch8_item_decorator) {
        window.__ch8_item_decorator = new ItemDecorator('decoratorCanvas');
    }
}

class ItemDecorator extends DrawingCanvas {
    constructor(canvasId) {
        super(canvasId, {color: '#FFFFFF', lineWidth: 5});
        if (!this.canvas) return;
        this._initialized = false;

        this.currentItem = 'bag';
        this.items = {
            bag: { src: 'https://i.imgur.com/4gvhJkl.png', width: 400, height: 400 },
            keyring: { src: 'https://i.imgur.com/DJDmjp5.png', width: 400, height: 400 },
            phonecase: { src: 'https://i.imgur.com/jOqSvqy.png', width: 400, height: 400 }
        };
        this.itemImage = new Image();
        this.itemImage.crossOrigin = "Anonymous";
        this.stickers = []; // {emoji, x, y, size}
        this.stickerPalette = ['🚀', '🪐', '⭐', '✨', '🌍', '🌕', '👽', '🛰️'];
        
        this.draggingStickerIndex = -1;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.paths = [];
        this.currentPath = null;
        
        this.bindDecoratorEvents();
        this.populateStickers();
        this._initialized = true;
        this.loadItem();
    }

    populateStickers() {
        const palette = document.getElementById('sticker-palette');
        if (!palette) return;
        palette.innerHTML = '';
        this.stickerPalette.forEach(emoji => {
            const btn = document.createElement('button');
            btn.innerText = emoji;
            btn.className = 'p-2 bg-gray-600 rounded-lg hover:bg-gray-500';
            btn.onclick = () => this.addSticker(emoji);
            palette.appendChild(btn);
        });
    }
    
    addSticker(emoji) {
        this.stickers.push({
            emoji: emoji,
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            size: 50
        });
        this.redrawAll();
    }

    loadItem() {
        this.itemImage.src = this.items[this.currentItem].src;
        this.itemImage.onload = () => {
            this.resizeCanvas();
        };
    }
    
    redrawAll() {
        if (!this.ctx || !this.items || !this._initialized) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const item = this.items[this.currentItem];
        const canvasAspect = this.canvas.width / this.canvas.height;
        const itemAspect = item.width / item.height;
        let drawWidth, drawHeight, offsetX, offsetY;

        if (canvasAspect > itemAspect) {
            drawHeight = this.canvas.height * 0.9;
            drawWidth = drawHeight * itemAspect;
        } else {
            drawWidth = this.canvas.width * 0.9;
            drawHeight = drawWidth / itemAspect;
        }
        
        offsetX = (this.canvas.width - drawWidth) / 2;
        offsetY = (this.canvas.height - drawHeight) / 2;
        
        this.ctx.drawImage(this.itemImage, offsetX, offsetY, drawWidth, drawHeight);
        
        this.paths.forEach(path => {
            this.ctx.beginPath();
            this.ctx.strokeStyle = path.color;
            this.ctx.lineWidth = path.width;
            this.ctx.globalCompositeOperation = path.composite;
            this.ctx.moveTo(path.points[0].x, path.points[0].y);
            for (let i = 1; i < path.points.length; i++) {
                this.ctx.lineTo(path.points[i].x, path.points[i].y);
            }
            this.ctx.stroke();
        });
        this.ctx.globalCompositeOperation = 'source-over';

        this.stickers.forEach(sticker => {
            this.ctx.font = `${sticker.size}px sans-serif`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(sticker.emoji, sticker.x, sticker.y);
        });
    }
    
    resizeCanvas() {
        super.resizeCanvas();
        this.redrawAll();
    }

    clearDecorations() {
        this.stickers = [];
        this.paths = [];
        this.redrawAll();
    }

    downloadResult() {
        const link = document.createElement('a');
        link.download = `나만의-${this.currentItem}.png`;
        link.href = this.canvas.toDataURL('image/png');
        link.click();
    }
    
    startDrawing(e) {
        e.preventDefault();
        const { x, y } = this.getPos(e);
        const stickerIndex = this.findStickerAtClick(x, y);

        if (stickerIndex !== -1) {
            this.isDrawing = false;
            this.draggingStickerIndex = stickerIndex;
            const sticker = this.stickers[stickerIndex];
            this.dragOffsetX = x - sticker.x;
            this.dragOffsetY = y - sticker.y;
        } else {
            this.isDrawing = true;
            this.currentPath = {
                color: this.ctx.strokeStyle,
                width: this.ctx.lineWidth,
                composite: this.ctx.globalCompositeOperation,
                points: [{ x, y }]
            };
            this.paths.push(this.currentPath);
        }
    }

    draw(e) {
        e.preventDefault();
        if (this.draggingStickerIndex !== -1) {
            const { x, y } = this.getPos(e);
            const sticker = this.stickers[this.draggingStickerIndex];
            sticker.x = x - this.dragOffsetX;
            sticker.y = y - this.dragOffsetY;
            this.redrawAll();
        } else if (this.isDrawing && this.currentPath) {
            const { x, y } = this.getPos(e);
            this.currentPath.points.push({ x, y });
            this.redrawAll();
        }
    }

    stopDrawing() {
        this.isDrawing = false;
        this.currentPath = null;
        this.draggingStickerIndex = -1;
    }

    findStickerAtClick(clickX, clickY) {
        for (let i = this.stickers.length - 1; i >= 0; i--) {
            const sticker = this.stickers[i];
            const halfSize = sticker.size / 2;
            if (clickX >= sticker.x - halfSize && clickX <= sticker.x + halfSize &&
                clickY >= sticker.y - halfSize && clickY <= sticker.y + halfSize) {
                return i;
            }
        }
        return -1;
    }

    bindDecoratorEvents() {
        this.bindEvents(); // Bind parent drawing events
        
        this.canvas.addEventListener('mousemove', (e) => {
            const { x, y } = this.getPos(e);
            if (this.findStickerAtClick(x, y) !== -1) {
                this.canvas.style.cursor = 'move';
            } else {
                this.canvas.style.cursor = 'crosshair';
            }
        });

        document.querySelectorAll('.item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const nextItem = e.target.dataset.item;
                if (this.currentItem === nextItem) return; // 동일 아이템 중복 처리 방지
                this.currentItem = nextItem;
                document.querySelectorAll('.item-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.clearDecorations();
                this.loadItem();
            });
        });
        
        document.getElementById('decorator-pen')?.addEventListener('click', () => {
            this.ctx.globalCompositeOperation = 'source-over';
            document.getElementById('decorator-pen')?.classList.add('active');
            document.getElementById('decorator-eraser')?.classList.remove('active');
        });
        document.getElementById('decorator-eraser')?.addEventListener('click', () => {
            this.ctx.globalCompositeOperation = 'destination-out';
            document.getElementById('decorator-eraser')?.classList.add('active');
            document.getElementById('decorator-pen')?.classList.remove('active');
        });
        document.getElementById('decorator-color')?.addEventListener('input', (e) => this.setColor(e.target.value));
        document.getElementById('decorator-width')?.addEventListener('input', (e) => this.setLineWidth(e.target.value));
        document.getElementById('decorator-clear')?.addEventListener('click', () => this.clearDecorations());
        document.getElementById('decorator-download')?.addEventListener('click', () => this.downloadResult());
    }
}


