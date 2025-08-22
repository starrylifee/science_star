// --- Generic Drawing Canvas Class ---
class DrawingCanvas {
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) { 
            console.error(`Canvas with id ${canvasId} not found.`);
            return; 
        }
        this.ctx = this.canvas.getContext('2d');
        this.isDrawing = false; this.lastX = 0; this.lastY = 0;
        
        this.color = options.color || '#000000';
        this.lineWidth = options.lineWidth || 5;

        this.ctx.strokeStyle = this.color;
        this.ctx.lineWidth = this.lineWidth;
        this.ctx.lineJoin = 'round'; this.ctx.lineCap = 'round';
        
        // bindEvents is now called by subclasses
    }

    bindEvents() {
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseout', () => this.stopDrawing());
        this.canvas.addEventListener('touchstart', (e) => this.startDrawing(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.draw(e), { passive: false });
        this.canvas.addEventListener('touchend', () => this.stopDrawing());
    }

    getPos(evt) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const touch = evt.touches ? evt.touches[0] : null;
        return {
            x: ((touch ? touch.clientX : evt.clientX) - rect.left) * scaleX,
            y: ((touch ? touch.clientY : evt.clientY) - rect.top) * scaleY
        };
    }

    startDrawing(e) { e.preventDefault(); this.isDrawing = true; const { x, y } = this.getPos(e); [this.lastX, this.lastY] = [x, y]; }
    draw(e) { if (!this.isDrawing) return; e.preventDefault(); const { x, y } = this.getPos(e); this.ctx.beginPath(); this.ctx.moveTo(this.lastX, this.lastY); this.ctx.lineTo(x, y); this.ctx.stroke(); [this.lastX, this.lastY] = [x, y]; }
    stopDrawing() { this.isDrawing = false; }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        if(!container) return;
        
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        if (this.canvas.width > 0 && this.canvas.height > 0) {
            tempCtx.drawImage(this.canvas, 0, 0);
        }

        const { width, height } = container.getBoundingClientRect();
        this.canvas.width = width;
        this.canvas.height = height;

        if (tempCanvas.width > 0 && tempCanvas.height > 0) {
            this.ctx.drawImage(tempCanvas, 0, 0);
        }
        
        this.ctx.strokeStyle = this.color;
        this.ctx.lineWidth = this.lineWidth;
        this.ctx.lineJoin = 'round';
        this.ctx.lineCap = 'round';
    }

    setTool(tool) { this.ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over'; }
    
    setLineWidth(width) { 
        this.lineWidth = width;
        this.ctx.lineWidth = width; 
    }
    setColor(color) { 
        this.color = color;
        this.ctx.strokeStyle = color; 
    }
    download(filename) { const link = document.createElement('a'); link.download = filename; link.href = this.canvas.toDataURL('image/png'); link.click(); }
}

document.addEventListener('DOMContentLoaded', () => {
    // 네비게이션 토글 기능 (기본: 닫힘)
    const navToggle = document.getElementById('nav-toggle');
    const chapterNav = document.getElementById('chapter-nav');
    const navToggleText = document.getElementById('nav-toggle-text');

    // 초기 텍스트/상태 설정
    if (chapterNav) {
        chapterNav.classList.remove('open');
        if (navToggleText) navToggleText.textContent = '메뉴 보이기';
        // 헤더 아래 정확한 위치로 고정되도록 top 재계산
        const headerEl = document.querySelector('header');
        const containerEl = document.querySelector('.max-w-7xl');
        const setTop = () => {
            const headerRect = headerEl ? headerEl.getBoundingClientRect() : null;
            const scrollY = window.scrollY || window.pageYOffset || 0;
            const baseTop = headerRect ? headerRect.top + scrollY + headerRect.height + 8 : 72;
            chapterNav.style.top = baseTop + 'px';
        };
        setTop();
        window.addEventListener('resize', setTop);
        window.addEventListener('scroll', () => {
            // 스크롤 시 오버레이는 컨텐츠 위에 고정 유지
            setTop();
        }, { passive: true });
    }

    const closeMenu = () => {
        chapterNav.classList.remove('open');
        if (navToggleText) navToggleText.textContent = '메뉴 보이기';
    };
    const openMenu = () => {
        chapterNav.classList.add('open');
        if (navToggleText) navToggleText.textContent = '메뉴 숨기기';
    };

    if (navToggle && chapterNav) {
        navToggle.addEventListener('click', () => {
            if (chapterNav.classList.contains('open')) closeMenu(); else openMenu();
        });
    }
    
    const navButtons = document.querySelectorAll('.nav-btn');
    const chapterContents = document.querySelectorAll('.chapter-content');

    navButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const chapterNumber = button.dataset.chapter;

            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            chapterContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `chapter-${chapterNumber}`) {
                    content.classList.add('active');
                }
            });

            // 모든 챕터를 동적 import로 로드
            const module = await import(`./chapters/ch${chapterNumber}.js`);
            const fn = module[`initChapter${chapterNumber}`];
            if (typeof fn === 'function') fn();

            // 메뉴 항목 클릭 시 자동 닫힘
            if (chapterNav) closeMenu();
        });
    });

    // 초기 진입: 1챕터 동적 로드
    (async () => {
        const module = await import('./chapters/ch1.js');
        module.initChapter1();
    })();
});


