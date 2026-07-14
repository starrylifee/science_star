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
        this.camera.position.set(0, 18, 40);

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

        // 관측자 그룹 생성: 지평선에 수직으로 선 노란 사람 모형 (비율보다 가시성 우선)
        this.observer = new THREE.Group();
        const bodyMat = new THREE.MeshBasicMaterial({ color: 0xffd400 });
        const person = new THREE.Group();
        // 다리
        [-0.14, 0.14].forEach(x => {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.6, 8), bodyMat);
            leg.position.set(x, 0.3, 0);
            person.add(leg);
        });
        // 몸통
        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.75, 12), bodyMat);
        torso.position.y = 0.95;
        person.add(torso);
        // 팔 (살짝 벌린 자세)
        [-1, 1].forEach(side => {
            const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.55, 8), bodyMat);
            arm.position.set(side * 0.38, 1.05, 0);
            arm.rotation.z = side * -0.45;
            person.add(arm);
        });
        // 머리
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), bodyMat);
        head.position.y = 1.62;
        person.add(head);
        person.scale.setScalar(1.8); // 비율보다 가시성 우선
        this.observer.add(person);

        // 관측자 위치 강조용 글로우 마커
        const markerCanvas = document.createElement('canvas');
        markerCanvas.width = markerCanvas.height = 128;
        const mctx = markerCanvas.getContext('2d');
        const mGrad = mctx.createRadialGradient(64, 64, 8, 64, 64, 64);
        mGrad.addColorStop(0, 'rgba(255, 230, 80, 0.9)');
        mGrad.addColorStop(0.4, 'rgba(255, 210, 40, 0.35)');
        mGrad.addColorStop(1, 'rgba(255, 200, 0, 0)');
        mctx.fillStyle = mGrad;
        mctx.fillRect(0, 0, 128, 128);
        const markerSprite = new THREE.Sprite(new THREE.SpriteMaterial({
            map: new THREE.CanvasTexture(markerCanvas),
            transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
        }));
        markerSprite.scale.set(6, 6, 1);
        markerSprite.position.y = 1.7;
        this.observer.add(markerSprite);
        this.scene.add(this.observer);

        // 지평선: 은은한 면 + 뚜렷한 테두리 링
        this.horizon = new THREE.Group();
        const horizonPlane = new THREE.Mesh(
            new THREE.CircleGeometry(15, 48),
            new THREE.MeshBasicMaterial({ color: 0x33cc66, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false })
        );
        this.horizon.add(horizonPlane);
        const horizonRim = new THREE.Mesh(
            new THREE.RingGeometry(14.6, 15, 64),
            new THREE.MeshBasicMaterial({ color: 0x44ee77, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false })
        );
        this.horizon.add(horizonRim);
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

        // 패널 크게 보기 토글 (캔버스 리사이즈는 ResizeObserver가 처리)
        const panelSpace = document.getElementById('ch5-panel-space');
        const panelSky = document.getElementById('ch5-panel-sky');
        const btnSpace = document.getElementById('ch5-expand-space');
        const btnSky = document.getElementById('ch5-expand-sky');
        if (panelSpace && panelSky && btnSpace && btnSky) {
            const setExpand = (target) => {
                // target: null(반반) | 'space' | 'sky'
                panelSpace.classList.toggle('col-span-2', target === 'space');
                panelSpace.classList.toggle('hidden', target === 'sky');
                panelSky.classList.toggle('col-span-2', target === 'sky');
                panelSky.classList.toggle('hidden', target === 'space');
                btnSpace.textContent = target === 'space' ? '◫ 나누어 보기' : '⛶ 크게 보기';
                btnSky.textContent = target === 'sky' ? '◫ 나누어 보기' : '⛶ 크게 보기';
                this._expanded = target;
            };
            btnSpace.onclick = () => setExpand(this._expanded === 'space' ? null : 'space');
            btnSky.onclick = () => setExpand(this._expanded === 'sky' ? null : 'sky');
        }

        this.initSkyView();
        this.updateTimeButtons();
        this.updatePositions(); // 초기 반영
        this.onWindowResize();
        requestAnimationFrame(() => {
            this.onWindowResize();
            this.renderer.render(this.scene, this.camera); // 초기 1프레임 강제 렌더
        });
        window.addEventListener('resize', () => this.onWindowResize());
    }

    // ==========================================================
    // 관측자 시점 하늘 뷰 (1인칭 360도, 드래그로 둘러보기)
    // ==========================================================
    initSkyView() {
        this.skyContainer = document.getElementById('ch5-sky-container');
        if (!this.skyContainer) return;

        this.skyScene = new THREE.Scene();
        this.skyScene.background = new THREE.Color(0x0a1128);
        this.skyCamera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000);
        this.skyCamera.position.set(0, 2, 0);
        this.skyYaw = 0;      // 0 = 남쪽
        this.skyPitch = 0.55; // 남쪽 하늘을 올려다봄

        this.skyRenderer = new THREE.WebGLRenderer({ antialias: true });
        const rect = this.skyContainer.getBoundingClientRect();
        this.skyRenderer.setSize(Math.max(1, Math.floor(rect.width)), Math.max(1, Math.floor(rect.height)));
        this.skyRenderer.setPixelRatio(window.devicePixelRatio);
        this.skyContainer.appendChild(this.skyRenderer.domElement);

        const textureLoader = new THREE.TextureLoader();

        // 땅
        this.skyGround = new THREE.Mesh(
            new THREE.CircleGeometry(600, 48),
            new THREE.MeshBasicMaterial({ color: 0x17251a })
        );
        this.skyGround.rotation.x = -Math.PI / 2;
        this.skyScene.add(this.skyGround);

        // 달 (실제 텍스처 + 태양 방향 조명으로 위상 자동 표현)
        this.skyMoon = new THREE.Mesh(
            new THREE.SphereGeometry(9, 48, 48),
            new THREE.MeshPhongMaterial({ map: textureLoader.load('assets/textures/2k_moon.jpg'), shininess: 2 })
        );
        this.skyScene.add(this.skyMoon);
        this.skyMoonLight = new THREE.DirectionalLight(0xffffff, 1.5);
        this.skyScene.add(this.skyMoonLight);
        this.skyMoonLight.target = this.skyMoon;
        this.skyScene.add(new THREE.AmbientLight(0xffffff, 0.12));

        // 태양 (글로우 스프라이트)
        const sunCanvas = document.createElement('canvas');
        sunCanvas.width = sunCanvas.height = 128;
        const sctx = sunCanvas.getContext('2d');
        const sGrad = sctx.createRadialGradient(64, 64, 10, 64, 64, 64);
        sGrad.addColorStop(0, 'rgba(255, 250, 210, 1)');
        sGrad.addColorStop(0.3, 'rgba(255, 225, 130, 0.7)');
        sGrad.addColorStop(1, 'rgba(255, 200, 80, 0)');
        sctx.fillStyle = sGrad;
        sctx.fillRect(0, 0, 128, 128);
        this.skySun = new THREE.Sprite(new THREE.SpriteMaterial({
            map: new THREE.CanvasTexture(sunCanvas),
            transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
        }));
        this.skySun.scale.set(80, 80, 1);
        this.skyScene.add(this.skySun);

        // 별 (밤에만 보이도록 투명도 조절)
        const starGeo = new THREE.BufferGeometry();
        const starCount = 400;
        const sPositions = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI * 0.48; // 윗반구
            const r = 800;
            sPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            sPositions[i * 3 + 1] = r * Math.cos(phi);
            sPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
        }
        starGeo.setAttribute('position', new THREE.BufferAttribute(sPositions, 3));
        this.skyStars = new THREE.Points(starGeo, new THREE.PointsMaterial({
            color: 0xffffff, size: 3, transparent: true, opacity: 0.9, depthWrite: false
        }));
        this.skyScene.add(this.skyStars);

        // 방위 라벨 (동=+X, 서=-X, 남=+Z, 북=-Z)
        [['동', 350, 0], ['서', -350, 0], ['남', 0, 350], ['북', 0, -350]].forEach(([txt, x, z]) => {
            const label = this.createTextSprite(txt, { fontsize: 80, scale: 12 });
            label.position.set(x, 28, z);
            this.skyScene.add(label);
        });

        // 드래그로 둘러보기
        const dom = this.skyRenderer.domElement;
        dom.style.cursor = 'grab';
        dom.style.touchAction = 'none';
        let dragging = false, lastX = 0, lastY = 0;
        dom.addEventListener('pointerdown', (e) => {
            dragging = true; lastX = e.clientX; lastY = e.clientY;
            dom.setPointerCapture(e.pointerId);
            dom.style.cursor = 'grabbing';
        });
        dom.addEventListener('pointermove', (e) => {
            if (!dragging) return;
            this.skyYaw -= (e.clientX - lastX) * 0.005;
            this.skyPitch = Math.min(1.35, Math.max(-0.12, this.skyPitch + (e.clientY - lastY) * 0.004));
            lastX = e.clientX; lastY = e.clientY;
        });
        ['pointerup', 'pointercancel'].forEach(ev => dom.addEventListener(ev, () => {
            dragging = false; dom.style.cursor = 'grab';
        }));

        if (typeof ResizeObserver !== 'undefined') {
            new ResizeObserver(() => this.onSkyResize()).observe(this.skyContainer);
        }
    }

    onSkyResize() {
        if (!this.skyRenderer || !this.skyContainer) return;
        const rect = this.skyContainer.getBoundingClientRect();
        const w = Math.max(1, Math.floor(rect.width)), h = Math.max(1, Math.floor(rect.height));
        this.skyCamera.aspect = w / h;
        this.skyCamera.updateProjectionMatrix();
        this.skyRenderer.setSize(w, h);
    }

    // 시뮬레이션 상태 → 관측자 하늘 좌표로 변환해 달/태양/하늘색 갱신
    updateSkyView() {
        if (!this.skyScene) return;
        const obsPos = this.observer.position;
        const up = obsPos.clone().normalize();                        // 관측자 머리 위
        const east = new THREE.Vector3(up.z, 0, -up.x).normalize();   // 자전 방향 = 동쪽
        const lat = THREE.MathUtils.degToRad(35);                     // 우리나라 위도만큼 하늘 기울임

        // 세계 방향 → 하늘 뷰 좌표 (x=동, y=위, z=남)
        const toSky = (worldDir) => {
            const e = worldDir.dot(east);
            const u = worldDir.dot(up);
            const s = -worldDir.y; // 남쪽 성분
            return new THREE.Vector3(
                e,
                u * Math.cos(lat) - s * Math.sin(lat),
                u * Math.sin(lat) + s * Math.cos(lat)
            );
        };

        const moonDir = toSky(this.moon.position.clone().sub(obsPos).normalize());
        this.skyMoon.position.copy(moonDir).multiplyScalar(160);
        this.skyMoon.rotation.y = this.moon.rotation.y;

        const sunDirWorld = this.sun.position.clone().sub(obsPos).normalize();
        const sunDir = toSky(sunDirWorld);
        this.skySun.position.copy(sunDir).multiplyScalar(700);
        // 달을 비추는 빛은 태양 쪽에서
        this.skyMoonLight.position.copy(this.skyMoon.position).add(sunDir.clone().multiplyScalar(300));

        // 태양 고도에 따라 하늘색/땅색/별 밝기 변화 (낮 → 노을 → 밤)
        const altDeg = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(sunDir.y, -1, 1)));
        const day = new THREE.Color(0x7ab5e8), dusk = new THREE.Color(0xd98a5f), night = new THREE.Color(0x0a1128);
        let skyColor;
        if (altDeg > 15) skyColor = day;
        else if (altDeg > 0) skyColor = dusk.clone().lerp(day, altDeg / 15);
        else if (altDeg > -12) skyColor = night.clone().lerp(dusk, (altDeg + 12) / 12);
        else skyColor = night;
        this.skyScene.background = skyColor;

        const gDay = new THREE.Color(0x4f8a3d), gNight = new THREE.Color(0x141f16);
        this.skyGround.material.color.copy(gNight).lerp(gDay, THREE.MathUtils.clamp((altDeg + 12) / 27, 0, 1));
        this.skyStars.material.opacity = THREE.MathUtils.clamp(-altDeg / 12, 0, 1) * 0.9;

        // 달의 어두운 면은 하늘 밝기에 묻혀 하늘색으로 보이도록 (검은 원 방지, 밤엔 자연히 어두움)
        this.skyMoon.material.emissive.copy(skyColor).multiplyScalar(0.92);

        // 상단 토글과 연동
        this.skyMoon.visible = this.moon.visible;
        this.skySun.visible = this.sun.visible && altDeg > -8;
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
        this.observer.rotateX(-Math.PI / 2); // 로컬 +Y가 지구 바깥(하늘)을 향하도록
        this.horizon.rotation.x = -Math.PI / 2;

        this.updateSkyView();

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

        // 관측자 시점 렌더 (드래그 시선 반영)
        if (this.skyRenderer) {
            const lookDir = new THREE.Vector3(
                Math.sin(this.skyYaw) * Math.cos(this.skyPitch),
                Math.sin(this.skyPitch),
                Math.cos(this.skyYaw) * Math.cos(this.skyPitch)
            );
            this.skyCamera.lookAt(lookDir.add(this.skyCamera.position));
            this.skyRenderer.render(this.skyScene, this.skyCamera);
        }
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
        this.onSkyResize();
    }
}