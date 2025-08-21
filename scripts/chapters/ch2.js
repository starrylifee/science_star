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
            document.getElementById('ch2_downloadBtn')?.addEventListener('click', () => { app.download('보름달-그림.png'); });
        }
    }
    window.__ch2_drawingCanvas?.resizeCanvas();
}


