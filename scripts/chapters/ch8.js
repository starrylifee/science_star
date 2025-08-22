import DrawingCanvas from '../shared/drawing.js';

export function initChapter8() {
    if (!window.__ch8_item_decorator) {
        window.__ch8_item_decorator = new ItemDecorator('decoratorCanvas');
    }
    bindDecoratorUI();
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
        this.itemImage.crossOrigin = "anonymous";
        this.itemImage.referrerPolicy = 'no-referrer';
        this.itemImageReady = false;
        this._usedProxy = false;
        this.stickers = []; // {emoji, x, y, size, rotation}
        this.stickerPalette = [
            // 우주/천체
            '🚀','🛸','🛰️','🪐','☄️','🌌','🌠','⭐','✨','🌟','🌍','🌎','🌏','🌕','🌖','🌗','🌘','🌑','🌒','🌓','🌔',
            // 동물/생명체
            '🐱','🐶','🐧','🦊','🐼','🐨','🦄','🐙','🦕','🦖','🐝','🪲',
            // 기호/장식
            '❤️','🧡','💛','💚','💙','💜','🤍','🤎','🖤','💫','🎈','🎉','💎','🔮','🧲',
            // 날씨
            '☀️','🌤️','⛅','🌥️','🌧️','⛈️','🌩️','🌫️','🌈'
        ];
        
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

    setItem(itemKey) {
        if (!this.items[itemKey]) return;
        this.currentItem = itemKey;
        this.clearDecorations();
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
            size: 50,
            rotation: 0
        });
        this.redrawAll();
    }

    loadItem() {
        this.itemImageReady = false;
        this._usedProxy = false;
        const primaryUrl = this.items[this.currentItem].src;
        const toProxy = (url) => {
            const stripped = url.replace(/^https?:\/\//, '');
            return `https://images.weserv.nl/?url=${encodeURIComponent(stripped)}&w=1024&h=1024&fit=contain&we&il`;
        };
        const load = (url) => {
            this.itemImage.onload = () => {
                this.itemImageReady = true;
                this.resizeCanvas();
                this.redrawAll();
            };
            this.itemImage.onerror = () => {
                if (!this._usedProxy) {
                    this._usedProxy = true;
                    load(toProxy(primaryUrl));
                } else {
                    this.itemImageReady = false;
                    this.redrawAll();
                }
            };
            this.itemImage.src = url;
        };
        load(primaryUrl);
    }
    
    redrawAll() {
        if (!this.ctx || !this.items || !this._initialized) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // 아이템 이미지를 캔버스 전체(정사각형)에 꽉 채워 그립니다.
        if (this.itemImageReady && this.itemImage && this.itemImage.naturalWidth > 0) {
            this.ctx.drawImage(this.itemImage, 0, 0, this.canvas.width, this.canvas.height);
        } else {
            // 로딩 전/실패 시 배경색 표시
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
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
            this.ctx.save();
            this.ctx.translate(sticker.x, sticker.y);
            this.ctx.rotate((sticker.rotation || 0) * Math.PI / 180);
            this.ctx.font = `${sticker.size}px sans-serif`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(sticker.emoji, 0, 0);
            this.ctx.restore();
        });
    }

    getItemSVG(type) {
        const size = 1024;
        const bg = '#0b0f1a';
        const base = '#1f2937';
        const stroke = '#ffffff';
        const strokeDim = '#94a3b8';
        if (type === 'bag') {
            return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000" flood-opacity="0.5"/>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="${bg}"/>
  <g filter="url(#shadow)">
    <rect x="172" y="240" rx="48" ry="48" width="680" height="620" fill="${base}" stroke="${strokeDim}" stroke-width="6"/>
    <path d="M352 240c0-66 54-120 120-120s120 54 120 120" fill="none" stroke="${stroke}" stroke-width="20"/>
    <circle cx="272" cy="360" r="12" fill="${stroke}"/>
    <circle cx="752" cy="360" r="12" fill="${stroke}"/>
  </g>
  <text x="50%" y="980" fill="#e5e7eb" font-family="sans-serif" font-size="28" text-anchor="middle">Bag</text>
</svg>`;
        }
        if (type === 'keyring') {
            return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000" flood-opacity="0.5"/>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="${bg}"/>
  <g filter="url(#shadow)" stroke="${stroke}" stroke-width="24" fill="none" stroke-linecap="round">
    <circle cx="680" cy="280" r="110"/>
    <line x1="600" y1="340" x2="470" y2="470"/>
    <circle cx="360" cy="580" r="180" fill="${base}" stroke="${strokeDim}" stroke-width="12"/>
  </g>
  <text x="50%" y="980" fill="#e5e7eb" font-family="sans-serif" font-size="28" text-anchor="middle">Keyring</text>
</svg>`;
        }
        // phonecase
        return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000" flood-opacity="0.5"/>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="${bg}"/>
  <g filter="url(#shadow)">
    <rect x="332" y="160" rx="72" ry="72" width="360" height="720" fill="${base}" stroke="${strokeDim}" stroke-width="10"/>
    <circle cx="600" cy="230" r="32" fill="none" stroke="${stroke}" stroke-width="12"/>
    <circle cx="560" cy="230" r="12" fill="${stroke}"/>
  </g>
  <text x="50%" y="980" fill="#e5e7eb" font-family="sans-serif" font-size="28" text-anchor="middle">Phone Case</text>
</svg>`;
    }
    
    resizeCanvas() {
        const container = this.canvas.parentElement;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        // 컨테이너 안쪽 여백(p-4)을 고려한 사용 가능 영역 계산
        const padding = 16 * 2; // Tailwind p-4 = 1rem = 16px, 좌우 합산 32px
        const usableWidth = Math.max(0, rect.width - padding);
        const usableHeight = Math.max(0, rect.height - padding);
        const size = Math.floor(Math.min(usableWidth, usableHeight));
        if (size <= 0) return;
        // 정사각형 캔버스 크기 설정 (시각적 크기와 픽셀 버퍼 일치)
        this.canvas.width = size;
        this.canvas.height = size;
        this.canvas.style.width = size + 'px';
        this.canvas.style.height = size + 'px';
        this.redrawAll();
    }

    clearDecorations() {
        this.stickers = [];
        this.paths = [];
        this.redrawAll();
    }

    downloadResult() {
        // 검정 배경 합성 후 다운로드 (보이는 대로 저장)
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = this.canvas.width;
        exportCanvas.height = this.canvas.height;
        const ex = exportCanvas.getContext('2d');
        ex.fillStyle = '#000000';
        ex.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        ex.drawImage(this.canvas, 0, 0);
        const link = document.createElement('a');
        link.download = `나만의-${this.currentItem}.png`;
        link.href = exportCanvas.toDataURL('image/png');
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
            this.gestureStart = { x, y, size: sticker.size, rotation: sticker.rotation };
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
            const isRotate = e.shiftKey;
            const isScale = e.ctrlKey || e.metaKey;
            if (isRotate || isScale) {
                const dx = x - this.gestureStart.x;
                const dy = y - this.gestureStart.y;
                if (isRotate) {
                    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                    sticker.rotation = Math.round(this.gestureStart.rotation + angle);
                }
                if (isScale) {
                    const dist = Math.hypot(dx, dy);
                    const sign = (dx + dy) >= 0 ? 1 : -1;
                    sticker.size = Math.max(20, Math.min(300, Math.round(this.gestureStart.size + dist * 0.3 * sign)));
                }
            } else {
                sticker.x = x - this.dragOffsetX;
                sticker.y = y - this.dragOffsetY;
            }
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
        this.gestureStart = null;
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

        // 우측 패널 내 기존 버튼은 유지되면 동기화
        document.querySelectorAll('.item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const nextItem = e.currentTarget?.dataset?.item;
                if (this.currentItem === nextItem) return;
                this.setItem(nextItem);
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
        document.getElementById('decorator-home')?.addEventListener('click', () => {
            const modal = document.getElementById('decorator-modal');
            modal?.classList.remove('hidden');
        });
    }
}

function bindDecoratorUI() {
    // 모달 열기: 챕터 8 진입 시 자동 오픈
    const modal = document.getElementById('decorator-modal');
    const chapter = document.getElementById('chapter-8');
    if (modal && chapter && chapter.classList.contains('active')) {
        modal.classList.remove('hidden');
    }
    document.getElementById('decorator-modal-close')?.addEventListener('click', () => {
        modal?.classList.add('hidden');
    });
    document.querySelectorAll('.decorator-item-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const item = e.currentTarget?.dataset?.item;
            if (window.__ch8_item_decorator) window.__ch8_item_decorator.setItem(item);
            modal?.classList.add('hidden');
        });
    });
}


