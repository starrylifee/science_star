import DrawingCanvas from '../shared/drawing.js';

function captureChapter1Image() {
    const moonImage = document.getElementById('ch1_moonImage');
    const drawingCanvas = document.getElementById('ch1_drawingCanvas');

    // 렌더 기준: 캔버스 크기(정사각형)로 합성하여 비율 왜곡 제거
    const size = Math.min(drawingCanvas.width, drawingCanvas.height);
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = size;
    tempCanvas.height = size;
    const tempCtx = tempCanvas.getContext('2d');

    // 화면과 동일한 배경 (컨테이너 bg-black)
    tempCtx.fillStyle = '#000000';
    tempCtx.fillRect(0, 0, size, size);

    // 화면과 동일하게 object-cover: 원본 중앙을 정사각으로 크롭 후 원형 마스크
    const nw = moonImage.naturalWidth || size;
    const nh = moonImage.naturalHeight || size;
    const crop = Math.min(nw, nh);
    const sx = (nw - crop) / 2;
    const sy = (nh - crop) / 2;
    tempCtx.save();
    tempCtx.beginPath();
    tempCtx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    tempCtx.clip();
    tempCtx.drawImage(moonImage, sx, sy, crop, crop, 0, 0, size, size);
    tempCtx.restore();

    // 드로잉을 동일 크기 스케일로 합성
    tempCtx.drawImage(drawingCanvas, 0, 0, size, size);

    return tempCanvas.toDataURL('image/png');
}

export function initChapter1() {
    if (!window.__ch1_drawingCanvas) {
        window.__ch1_drawingCanvas = new DrawingCanvas('ch1_drawingCanvas', { color: '#FFFFFF', lineWidth: 10 });
        const canvasObj = window.__ch1_drawingCanvas;
        if (canvasObj.canvas) {
            canvasObj.bindEvents();
            const ch1_moonImage = document.getElementById('ch1_moonImage');
            if (ch1_moonImage) ch1_moonImage.onload = () => canvasObj.resizeCanvas();

            document.getElementById('ch1_pen')?.addEventListener('click', () => { canvasObj.setTool('pen'); document.getElementById('ch1_pen').classList.add('active'); document.getElementById('ch1_eraser').classList.remove('active'); });
            document.getElementById('ch1_eraser')?.addEventListener('click', () => { canvasObj.setTool('eraser'); document.getElementById('ch1_eraser').classList.add('active'); document.getElementById('ch1_pen').classList.remove('active'); });
            document.getElementById('ch1_lineWidth')?.addEventListener('input', (e) => canvasObj.setLineWidth(e.target.value));
            document.getElementById('ch1_colorPalette')?.addEventListener('click', (e) => { if (e.target.tagName === 'BUTTON' && e.target.dataset.color) { canvasObj.setColor(e.target.dataset.color); document.querySelectorAll('#ch1_colorPalette .color-btn').forEach(btn => btn.classList.remove('active')); e.target.classList.add('active'); document.getElementById('ch1_pen').click(); } });
            document.getElementById('ch1_colorPicker')?.addEventListener('input', (e) => { canvasObj.setColor(e.target.value); document.querySelectorAll('#ch1_colorPalette .color-btn').forEach(btn => btn.classList.remove('active')); document.getElementById('ch1_pen').click(); });

            document.getElementById('ch1_downloadBtn')?.addEventListener('click', () => {
                const imageDataUrl = captureChapter1Image();
                const link = document.createElement('a');
                link.href = imageDataUrl;
                link.download = '나의-달-그림.png';
                link.click();
            });
        }
    }
    window.__ch1_drawingCanvas?.resizeCanvas();
}


