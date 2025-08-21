import DrawingCanvas from '../shared/drawing.js';

export function initChapter2() {
    if (!window.__ch2_drawingCanvas) {
        window.__ch2_drawingCanvas = new DrawingCanvas('ch2_drawingCanvas', { color: '#FFFFFF', lineWidth: 10 });
        const app = window.__ch2_drawingCanvas;
        if (app.canvas) {
            app.bindEvents();
            document.getElementById('ch2_pen')?.addEventListener('click', () => { app.setTool('pen'); document.getElementById('ch2_pen').classList.add('active'); document.getElementById('ch2_eraser').classList.remove('active'); });
            document.getElementById('ch2_eraser')?.addEventListener('click', () => { app.setTool('eraser'); document.getElementById('ch2_eraser').classList.add('active'); document.getElementById('ch2_pen').classList.remove('active'); });
            document.getElementById('ch2_lineWidth')?.addEventListener('input', (e) => app.setLineWidth(e.target.value));
            document.getElementById('ch2_colorPicker')?.addEventListener('input', (e) => { app.setColor(e.target.value); document.getElementById('ch2_pen').click(); });
            document.getElementById('ch2_downloadBtn')?.addEventListener('click', () => {
                // 검정 배경 합성 후 다운로드
                const exportCanvas = document.createElement('canvas');
                exportCanvas.width = app.canvas.width;
                exportCanvas.height = app.canvas.height;
                const ex = exportCanvas.getContext('2d');
                ex.fillStyle = '#000000';
                ex.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
                ex.drawImage(app.canvas, 0, 0);
                const link = document.createElement('a');
                link.download = '보름달-그림.png';
                link.href = exportCanvas.toDataURL('image/png');
                link.click();
            });
        }
    }
    window.__ch2_drawingCanvas?.resizeCanvas();
}


