export function initChapter5() {
    if (!window.__ch5_moon_phase_sim) {
        window.__ch5_moon_phase_sim = new MoonPhaseSimulation('ch5-container');
    }
}

class MoonPhaseSimulation {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;
        this.dateDisplay = null; // 날짜 표시는 사용하지 않음
        this.selectedTime = 'evening'; // 현재 선택된 시간대
        this.isAnimating = false;
        this.simulationDay = 1; // 1~28
        this.simulationMinutes = 18 * 60; // 시각: 분 단위(초기 18:00)
        this.simulationTime = 0; // 기존 일수 기반 시간 (위상 계산용)
        this.speedMinutesPerSecond = 5; // 5,10,30분/초
        this.minutesAccumulator = 0; // 5분 스텝 누적자
        this.clock = new THREE.Clock();

        this.init();
        this.animate();
    }

    init() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
        this.camera.position.set(0, 15, 30);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        const parentRect = this.container.parentElement?.getBoundingClientRect();
        const initW = Math.max(1, Math.floor(parentRect?.width || this.container.clientWidth || 800));
        const initH = Math.max(1, Math.floor(parentRect?.height || this.container.clientHeight || 500));
        this.renderer.setSize(initW, initH);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0x0b1220, 1);
        this.container.appendChild(this.renderer.domElement);
        // 컨테이너 크기 변화 대응
        if (typeof ResizeObserver !== 'undefined') {
            this._resizeObserver = new ResizeObserver(() => this.onWindowResize());
            this._resizeObserver.observe(this.container);
        }

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
        this.camera.lookAt(0, 0, 0);

        const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
        sunLight.position.set(-100, 0, 0);
        this.scene.add(sunLight);
        const ambientLight = new THREE.AmbientLight(0x404040, 0.7);
        this.scene.add(ambientLight);
        const hemiLight = new THREE.HemisphereLight(0x88aaff, 0x223355, 0.6);
        this.scene.add(hemiLight);

        const textureLoader = new THREE.TextureLoader();

        // 태양 생성 (실제 표면 텍스처 + 발광 글로우)
        const sunGeo = new THREE.SphereGeometry(8, 48, 48);
        const sunMat = new THREE.MeshBasicMaterial({ map: textureLoader.load('assets/textures/2k_sun.jpg') });
        this.sun = new THREE.Mesh(sunGeo, sunMat);
        this.sun.position.copy(sunLight.position);
        this.scene.add(this.sun);

        const glowCanvas = document.createElement('canvas');
        glowCanvas.width = glowCanvas.height = 256;
        const gctx = glowCanvas.getContext('2d');
        const grad = gctx.createRadialGradient(128, 128, 30, 128, 128, 128);
        grad.addColorStop(0, 'rgba(255, 220, 120, 0.8)');
        grad.addColorStop(0.5, 'rgba(255, 160, 40, 0.25)');
        grad.addColorStop(1, 'rgba(255, 120, 0, 0)');
        gctx.fillStyle = grad;
        gctx.fillRect(0, 0, 256, 256);
        const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
            map: new THREE.CanvasTexture(glowCanvas),
            transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
        }));
        sunGlow.scale.set(30, 30, 1);
        this.sun.add(sunGlow);

        const earthGeo = new THREE.SphereGeometry(5, 48, 48);
        const earthMat = new THREE.MeshPhongMaterial({ map: textureLoader.load('assets/textures/2k_earth_daymap.jpg'), shininess: 10 });
        this.earth = new THREE.Mesh(earthGeo, earthMat);
        this.scene.add(this.earth);

        const moonGeo = new THREE.SphereGeometry(1.5, 48, 48);
        const moonMat = new THREE.MeshPhongMaterial({ map: textureLoader.load('assets/textures/2k_moon.jpg'), shininess: 2 });
        this.moon = new THREE.Mesh(moonGeo, moonMat);
        this.scene.add(this.moon);

        const frontIndicatorGeo = new THREE.SphereGeometry(0.2, 16, 16);
        const frontIndicatorMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        this.frontIndicator = new THREE.Mesh(frontIndicatorGeo, frontIndicatorMat);
        this.frontIndicator.position.set(0, 0, 1.5);
        this.moon.add(this.frontIndicator);

        // 관측자 그룹 생성
        this.observer = new THREE.Group();
        const bodyGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.8, 8);
        const bodyMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        this.observer.add(body);
        const headGeo = new THREE.SphereGeometry(0.3, 16, 16);
        const head = new THREE.Mesh(headGeo, bodyMat);
        head.position.y = 0.6;
        this.observer.add(head);
        this.scene.add(this.observer);

        // 지평선 생성
        const horizonGeo = new THREE.CircleGeometry(15, 32);
        const horizonMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
        this.horizon = new THREE.Mesh(horizonGeo, horizonMat);
        this.observer.add(this.horizon);

        // ==========================================================
        // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ '동', '서' 글자 추가 부분 ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
        // ==========================================================
        const westText = this.createTextSprite('동', { fontsize: 60, scale: 2 });
        westText.position.set(-15, 0, 2); // 지평선 왼쪽(-X) 위
        this.observer.add(westText);
        
        const eastText = this.createTextSprite('서', { fontsize: 60, scale: 2 });
        eastText.position.set(15, 0, 2); // 지평선 오른쪽(+X) 위
        this.observer.add(eastText);
        // ==========================================================
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

        // 은하수 배경 (안쪽에서 보이는 대형 구, 어둡게 처리)
        const skyGeo = new THREE.SphereGeometry(700, 48, 32);
        const skyMat = new THREE.MeshBasicMaterial({
            map: textureLoader.load('assets/textures/2k_stars_milky_way.jpg'),
            side: THREE.BackSide, color: 0x555577
        });
        this.scene.add(new THREE.Mesh(skyGeo, skyMat));

        // 별 배경 (부드러운 글로우 점, 크기·밝기 다양)
        const starCanvas = document.createElement('canvas');
        starCanvas.width = starCanvas.height = 64;
        const sctx = starCanvas.getContext('2d');
        const sGrad = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        sGrad.addColorStop(0, 'rgba(255,255,255,1)');
        sGrad.addColorStop(0.3, 'rgba(255,255,255,0.6)');
        sGrad.addColorStop(1, 'rgba(255,255,255,0)');
        sctx.fillStyle = sGrad;
        sctx.fillRect(0, 0, 64, 64);
        const starTexture = new THREE.CanvasTexture(starCanvas);

        const starLayers = [
            { count: 400, size: 1.2, opacity: 0.6 },
            { count: 250, size: 2.2, opacity: 0.85 },
            { count: 60, size: 3.5, opacity: 1.0 },
        ];
        starLayers.forEach(layer => {
            const starGeo = new THREE.BufferGeometry();
            const positions = new Float32Array(layer.count * 3);
            for (let i = 0; i < layer.count; i++) {
                const r = 200 + Math.random() * 300;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos((Math.random() * 2) - 1);
                positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
                positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
                positions[i * 3 + 2] = r * Math.cos(phi);
            }
            starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            const starMat = new THREE.PointsMaterial({
                color: 0xffffff, size: layer.size, sizeAttenuation: true,
                map: starTexture, transparent: true, opacity: layer.opacity,
                depthWrite: false, blending: THREE.AdditiveBlending
            });
            this.scene.add(new THREE.Points(starGeo, starMat));
        });

        // 버튼 및 토글 이벤트 (옵셔널 체이닝 대입 금지 → 안전 바인딩)
        const startBtn = document.getElementById('ch5-start-btn');
        if (startBtn) startBtn.onclick = () => this.startAnimation();
        const stopBtn = document.getElementById('ch5-stop-btn');
        if (stopBtn) stopBtn.onclick = () => this.stopAnimation();
        const speedSel = document.getElementById('ch5-speed');
        if (speedSel) speedSel.onchange = (e) => {
            this.speedMinutesPerSecond = parseInt(e.target.value, 10) || 5;
            if (this.isAnimating) {
                const badge = document.getElementById('ch5-playing');
                if (badge) badge.textContent = (this.speedMinutesPerSecond < 0) ? '역재생중' : '재생중';
            }
        };
        const stepBack = document.getElementById('ch5-step-back');
        if (stepBack) stepBack.onclick = () => this.stepMinutes(-15);
        const stepForward = document.getElementById('ch5-step-forward');
        if (stepForward) stepForward.onclick = () => this.stepMinutes(15);
        const reverseBtn = document.getElementById('ch5-reverse');
        if (reverseBtn) reverseBtn.onclick = () => {
            this.speedMinutesPerSecond = -Math.abs(this.speedMinutesPerSecond);
            this.startAnimation();
        };
        const eveningBtn = document.getElementById('ch5-evening-btn');
        if (eveningBtn) eveningBtn.onclick = () => this.setSelectedTime('evening');
        const midnightBtn = document.getElementById('ch5-midnight-btn');
        if (midnightBtn) midnightBtn.onclick = () => this.setSelectedTime('midnight');
        const dawnBtn = document.getElementById('ch5-dawn-btn');
        if (dawnBtn) dawnBtn.onclick = () => this.setSelectedTime('dawn');

        const newBtn = document.getElementById('ch5-new-btn');
        if (newBtn) newBtn.onclick = () => this.setMoonPhase('new');
        const waxingBtn = document.getElementById('ch5-waxing-crescent-btn');
        if (waxingBtn) waxingBtn.onclick = () => this.setMoonPhase('waxing_crescent');
        const firstBtn = document.getElementById('ch5-first-btn');
        if (firstBtn) firstBtn.onclick = () => this.setMoonPhase('first');
        const fullBtn = document.getElementById('ch5-full-btn');
        if (fullBtn) fullBtn.onclick = () => this.setMoonPhase('full');
        const thirdBtn = document.getElementById('ch5-third-btn');
        if (thirdBtn) thirdBtn.onclick = () => this.setMoonPhase('third');
        const waningBtn = document.getElementById('ch5-waning-crescent-btn');
        if (waningBtn) waningBtn.onclick = () => this.setMoonPhase('waning_crescent');

        const sunToggle = document.getElementById('ch5-sun-toggle');
        if (sunToggle) sunToggle.onchange = (e) => { this.sun.visible = e.target.checked; };
        const moonToggle = document.getElementById('ch5-moon-toggle');
        if (moonToggle) moonToggle.onchange = (e) => { this.moon.visible = e.target.checked; this.frontIndicator.visible = e.target.checked; };

        this.updateTimeButtons();
        this.updatePositions(); // 초기 반영
        this.onWindowResize();
        requestAnimationFrame(() => {
            this.onWindowResize();
            this.renderer.render(this.scene, this.camera); // 초기 1프레임 강제 렌더
        });
        window.addEventListener('resize', () => this.onWindowResize());
    }

    startAnimation() {
        this.isAnimating = true;
        const badge = document.getElementById('ch5-playing');
        if (badge) {
            badge.textContent = (this.speedMinutesPerSecond < 0) ? '역재생중' : '재생중';
            badge.classList.remove('hidden');
        }
    }
    stopAnimation() {
        this.isAnimating = false;
        const badge = document.getElementById('ch5-playing');
        if (badge) badge.classList.add('hidden');
    }

    stepMinutes(delta) {
        this.simulationMinutes += delta;
        while (this.simulationMinutes < 0) {
            this.simulationMinutes += 24 * 60;
            this.simulationDay = ((this.simulationDay + 26) % 28) + 1; // -1일
        }
        while (this.simulationMinutes >= 24 * 60) {
            this.simulationMinutes -= 24 * 60;
            this.simulationDay = (this.simulationDay % 28) + 1; // +1일
        }
        this.updatePositions();
    }

    setSelectedTime(key) {
        this.selectedTime = key;
        if (key === 'evening') this.simulationMinutes = 12 * 60; // 18:00
        else if (key === 'midnight') this.simulationMinutes = 18 * 60; // 00:00
        else if (key === 'dawn') this.simulationMinutes = 0; // 06:00
        // 5분 스냅
        this.simulationMinutes = Math.round(this.simulationMinutes / 5) * 5;
        this.updateTimeButtons();
        this.updatePositions();
    }

    updateTimeButtons() {
        document.querySelectorAll('.time-btn').forEach(btn => btn.classList.remove('active'));
        if (this.selectedTime === 'evening') document.getElementById('ch5-evening-btn')?.classList.add('active');
        if (this.selectedTime === 'midnight') document.getElementById('ch5-midnight-btn')?.classList.add('active');
        if (this.selectedTime === 'dawn') document.getElementById('ch5-dawn-btn')?.classList.add('active');
    }

    setMoonPhase(phase) {
        this.stopAnimation();
        document.querySelectorAll('.phase-btn').forEach(btn => btn.classList.remove('active'));
        let angle = 0;
        let btnId = '';
        switch (phase) {
            case 'new': angle = Math.PI; btnId = 'ch5-new-btn'; break;
            case 'waxing_crescent': angle = Math.PI * 0.75; btnId = 'ch5-waxing-crescent-btn'; break;
            case 'first': angle = Math.PI * 0.5; btnId = 'ch5-first-btn'; break;
            case 'full': angle = 0; btnId = 'ch5-full-btn'; break;
            case 'third': angle = Math.PI * 1.5; btnId = 'ch5-third-btn'; break;
            case 'waning_crescent': angle = Math.PI * 1.25; btnId = 'ch5-waning-crescent-btn'; break;
        }
        if (btnId) document.getElementById(btnId)?.classList.add('active');
        const lunarCycle = 28;
        const dayFloat = (angle / (2 * Math.PI)) * lunarCycle;
        this.simulationDay = Math.max(1, Math.min(28, Math.round(dayFloat) || 1));
        this.updatePositions();
    }

    updateObserverPosition() {
        document.querySelectorAll('.time-btn').forEach(btn => btn.classList.remove('active'));
        let angle = 0;
        if (this.selectedTime === 'midnight') {
            angle = 0;
            document.getElementById('ch5-midnight-btn')?.classList.add('active');
        } else if (this.selectedTime === 'evening') {
            angle = Math.PI * 1.5; // 초저녁: 왼쪽
            document.getElementById('ch5-evening-btn')?.classList.add('active');
        } else if (this.selectedTime === 'dawn') {
            angle = Math.PI / 2; // 새벽: 오른쪽
            document.getElementById('ch5-dawn-btn')?.classList.add('active');
        }

        const earthRadius = 5;
        const observerPos = new THREE.Vector3(
            Math.sin(angle) * earthRadius,
            0,
            -Math.cos(angle) * earthRadius
        );

        this.observer.position.copy(observerPos);
        this.observer.lookAt(this.earth.position);
    }

    updatePositions() {
        const orbitRadius = 20;
        const lunarCycle = 28;
        const earthDay = 1;

        // 1) 위상/공전: 날짜 + 시각 기반 (밤 동안에도 달이 약간 이동)
        const dayIndex = this.simulationDay - 1; // 0~27
        const dayFraction = (this.simulationMinutes / (24 * 60));
        const moonAngle = ((dayIndex + dayFraction) / lunarCycle) * 2 * Math.PI;
        // 2) 지구 자전: 시각 기반 (자정 기준). 관측자는 지구 표면에 고정되어 자전과 함께 회전해야 함
        const earthAngle = ((this.simulationMinutes / (24 * 60)) / earthDay) * 2 * Math.PI;

        // 달의 공전 (반시계)
        this.moon.position.x = Math.cos(moonAngle) * orbitRadius;
        this.moon.position.z = Math.sin(moonAngle) * orbitRadius;
        this.moon.rotation.y = moonAngle;

        // 지구 자전 방향을 반시계로 보이도록 반전
        this.earth.rotation.y = -earthAngle;
        // 관측자는 지구 자전과 함께 회전 (초저녁: 왼쪽, 새벽: 오른쪽)
        const earthRadius = 5;
        const observerPos = new THREE.Vector3(
            -Math.sin(earthAngle) * earthRadius,
            0,
            -Math.cos(earthAngle) * earthRadius
        );
        this.observer.position.copy(observerPos);
        this.observer.lookAt(this.earth.position);
        this.observer.rotateX(Math.PI / 2);
        this.horizon.rotation.x = -Math.PI / 2;

        // 날짜/시각 표시는 하지 않음
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.isAnimating) {
            const dt = this.clock.getDelta();
            const advance = this.speedMinutesPerSecond * dt; // 분/초 * 초 = 분 (역재생 가능)
            this.minutesAccumulator += advance;
            const step = 5; // 5분 단위 스냅
            while (this.minutesAccumulator >= step) {
                this.stepMinutes(step);
                this.minutesAccumulator -= step;
            }
            while (this.minutesAccumulator <= -step) {
                this.stepMinutes(-step);
                this.minutesAccumulator += step;
            }
        }

        // stepMinutes 내부에서 updatePositions 호출됨

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    // ==========================================================
    // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ '동', '서' 글자 생성 함수 ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
    // ==========================================================
    createTextSprite(text, options = {}) {
        const fontface = options.fontface || 'Arial';
        const fontsize = options.fontsize || 24;
        const fontColor = options.fontColor || { r: 255, g: 255, b: 0, a: 1.0 }; // 노란색 기본값
        const scale = options.scale || 1.0;

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 128;
        context.font = `Bold ${fontsize}px ${fontface}`;
        
        context.fillStyle = `rgba(${fontColor.r}, ${fontColor.g}, ${fontColor.b}, ${fontColor.a})`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        
        sprite.scale.set(scale * 5, scale * 2.5, 1.0);

        return sprite;
    }

    onWindowResize() {
        if (!this.container) return;
        const rect = this.container.getBoundingClientRect();
        const w = Math.max(1, Math.floor(rect.width));
        const h = Math.max(1, Math.floor(rect.height));
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }
}