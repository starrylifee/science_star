import DrawingCanvas from '../shared/drawing.js';

export function initChapter7() {
    if (!window.__ch7_constellation_app) {
        window.__ch7_constellation_app = new ConstellationDrawer('constellationCanvas');
    }
    window.__ch7_constellation_app.drawAllElements();
}

class ConstellationDrawer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error(`Canvas with id ${canvasId} not found.`);
            return;
        }
        this.ctx = this.canvas.getContext('2d');

        this.stars = [];
        this.lines = [];
        this.drawingMode = 'stars';
        this.selectedStarIndex = -1;
        this.lineColor = '#ffffff';

        this.starRadius = 3;
        this.starClickTolerance = 10;

        this.bindEvents();
        this.updateButtonStates();
        this.drawAllElements(); 
        window.addEventListener('resize', () => this.drawAllElements());
    }

    getDistance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    findStarAtClick(clickX, clickY) {
        for (let i = 0; i < this.stars.length; i++) {
            const star = this.stars[i];
            if (this.getDistance(clickX, clickY, star.x, star.y) < this.starRadius + this.starClickTolerance) {
                return i;
            }
        }
        return -1;
    }

    drawAllElements() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.lines.forEach(line => {
            const startStar = this.stars[line.startIndex];
            const endStar = this.stars[line.endIndex];

            if (startStar && endStar) {
                this.ctx.beginPath();
                this.ctx.strokeStyle = line.color;
                this.ctx.lineWidth = 2;
                this.ctx.moveTo(startStar.x, startStar.y);
                this.ctx.lineTo(endStar.x, endStar.y);
                this.ctx.stroke();
            }
        });

        this.stars.forEach((star, index) => {
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, this.starRadius, 0, Math.PI * 2);
            this.ctx.fillStyle = '#fef08a';
            this.ctx.fill();
            this.ctx.strokeStyle = '#facc15';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();

            if (this.drawingMode === 'lines' && index === this.selectedStarIndex) {
                this.ctx.beginPath();
                this.ctx.arc(star.x, star.y, this.starRadius + 4, 0, Math.PI * 2);
                this.ctx.strokeStyle = '#60a5fa';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }
        });
    }

    handleCanvasClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        if (this.drawingMode === 'stars') {
            this.stars.push({ x, y });
            this.drawAllElements();
        } else if (this.drawingMode === 'lines') {
            const clickedStarIndex = this.findStarAtClick(x, y);

            if (clickedStarIndex !== -1) {
                if (this.selectedStarIndex === -1) {
                    this.selectedStarIndex = clickedStarIndex;
                } else {
                    if (this.selectedStarIndex !== clickedStarIndex) {
                        this.lines.push({
                            startIndex: this.selectedStarIndex,
                            endIndex: clickedStarIndex,
                            color: this.lineColor
                        });
                    }
                    this.selectedStarIndex = -1;
                }
            } else {
                this.selectedStarIndex = -1;
            }
            this.drawAllElements();
        }
    }

    updateButtonStates() {
        const starButton = document.getElementById('modeStar');
        const lineButton = document.getElementById('modeLine');
        
        starButton?.classList.remove('active');
        lineButton?.classList.remove('active');

        if (this.drawingMode === 'stars') {
            starButton?.classList.add('active');
        } else if (this.drawingMode === 'lines') {
            lineButton?.classList.add('active');
        }
    }
    
    download() {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        const storyText = document.getElementById('storyText')?.value || '';
        const textPadding = 20;
        const lineHeight = 24;
        
        // 텍스트 높이 계산
        const textLines = storyText.split('\n');
        const textHeight = textLines.length * lineHeight + textPadding * 2;
        
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height + textHeight;
        
        // 배경색 채우기
        tempCtx.fillStyle = '#0f172a';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        // 별자리 그리기
        tempCtx.drawImage(this.canvas, 0, 0);
        
        // 이야기 텍스트 그리기
        tempCtx.fillStyle = '#FFFFFF';
        tempCtx.font = '16px Noto Sans KR';
        tempCtx.textAlign = 'center';
        
        let y = this.canvas.height + textPadding + lineHeight;
        textLines.forEach(line => {
            tempCtx.fillText(line, tempCanvas.width / 2, y);
            y += lineHeight;
        });
        
        // 다운로드 링크 생성 및 클릭
        const link = document.createElement('a');
        link.download = '나의-별자리.png';
        link.href = tempCanvas.toDataURL('image/png');
        link.click();
    }

    bindEvents() {
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));

        document.getElementById('modeStar')?.addEventListener('click', () => {
            this.drawingMode = 'stars';
            this.selectedStarIndex = -1;
            this.updateButtonStates();
            this.drawAllElements();
        });

        document.getElementById('modeLine')?.addEventListener('click', () => {
            this.drawingMode = 'lines';
            this.selectedStarIndex = -1;
            this.updateButtonStates();
            this.drawAllElements();
        });

        document.getElementById('lineColor')?.addEventListener('input', (event) => {
            this.lineColor = event.target.value;
        });

        document.getElementById('clearCanvas')?.addEventListener('click', () => {
            this.stars = [];
            this.lines = [];
            this.selectedStarIndex = -1;
            this.drawingMode = 'stars';
            this.updateButtonStates();
            this.drawAllElements();
            const storyText = document.getElementById('storyText');
            if (storyText) storyText.value = '';
        });
        
        document.getElementById('ch7_downloadBtn')?.addEventListener('click', () => this.download());
    }
}


