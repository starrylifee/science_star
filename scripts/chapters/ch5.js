export function initChapter5() {
    if (!window.__ch5_moon_phase_sim) {
        window.__ch5_moon_phase_sim = new MoonPhaseSimulation('ch5-container');
    }
}

class MoonPhaseSimulation {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;
        this.dateDisplay = document.getElementById('ch5-date');
        this.selectedTime = 'evening'; // 현재 선택된 시간대
        this.isAnimating = true;
        this.simulationTime = 0;
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

        // 태양 생성
        const sunGeo = new THREE.SphereGeometry(8, 32, 32);
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xfdb813 });
        this.sun = new THREE.Mesh(sunGeo, sunMat);
        this.sun.position.copy(sunLight.position);
        this.scene.add(this.sun);

        const earthGeo = new THREE.SphereGeometry(5, 32, 32);
        const earthMat = new THREE.MeshPhongMaterial({ color: 0x4682B4, shininess: 10 });
        this.earth = new THREE.Mesh(earthGeo, earthMat);
        this.scene.add(this.earth);

        const moonGeo = new THREE.SphereGeometry(1.5, 32, 32);
        const moonMat = new THREE.MeshPhongMaterial({ color: 0xaaaaaa, shininess: 5 });
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

        // 별 배경 생성 (가벼운 포인트 클라우드)
        const starGeo = new THREE.BufferGeometry();
        const starCount = 500;
        const positions = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount; i++) {
            const r = 200 + Math.random() * 300;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);
            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
        }
        starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1, sizeAttenuation: true });
        const stars = new THREE.Points(starGeo, starMat);
        this.scene.add(stars);

        // 버튼 및 토글 이벤트 (옵셔널 체이닝 대입 금지 → 안전 바인딩)
        const startBtn = document.getElementById('ch5-start-btn');
        if (startBtn) startBtn.onclick = () => this.startAnimation();
        const stopBtn = document.getElementById('ch5-stop-btn');
        if (stopBtn) stopBtn.onclick = () => this.stopAnimation();
        const eveningBtn = document.getElementById('ch5-evening-btn');
        if (eveningBtn) eveningBtn.onclick = () => { this.selectedTime = 'evening'; this.updateObserverPosition(); };
        const midnightBtn = document.getElementById('ch5-midnight-btn');
        if (midnightBtn) midnightBtn.onclick = () => { this.selectedTime = 'midnight'; this.updateObserverPosition(); };
        const dawnBtn = document.getElementById('ch5-dawn-btn');
        if (dawnBtn) dawnBtn.onclick = () => { this.selectedTime = 'dawn'; this.updateObserverPosition(); };

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
        
        this.updateObserverPosition(); // 초기 위치 설정
        this.updatePositions(this.simulationTime); // 초기 위상 반영
        this.onWindowResize();
        requestAnimationFrame(() => {
            this.onWindowResize();
            this.renderer.render(this.scene, this.camera); // 초기 1프레임 강제 렌더
        });
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    startAnimation() { this.isAnimating = true; }
    stopAnimation() { this.isAnimating = false; }

    setMoonPhase(phase) {
        this.stopAnimation();
        document.querySelectorAll('.phase-btn').forEach(btn => btn.classList.remove('active'));
        let angle = 0;
        let btnId = '';
        switch(phase) {
            case 'new': angle = Math.PI; btnId = 'ch5-new-btn'; break; 
            case 'waxing_crescent': angle = Math.PI * 0.75; btnId = 'ch5-waxing-crescent-btn'; break;
            case 'first': angle = Math.PI * 0.5; btnId = 'ch5-first-btn'; break;
            case 'full': angle = 0; btnId = 'ch5-full-btn'; break;
            case 'third': angle = Math.PI * 1.5; btnId = 'ch5-third-btn'; break;
            case 'waning_crescent': angle = Math.PI * 1.25; btnId = 'ch5-waning-crescent-btn'; break;
        }
        if(btnId) document.getElementById(btnId)?.classList.add('active');
        const lunarCycle = 28;
        this.simulationTime = (angle / (2 * Math.PI)) * lunarCycle;
        this.updatePositions(this.simulationTime);
    }

    updateObserverPosition() {
        document.querySelectorAll('.time-btn').forEach(btn => btn.classList.remove('active'));
        let angle = 0;
        if (this.selectedTime === 'midnight') {
            angle = 0;
            document.getElementById('ch5-midnight-btn')?.classList.add('active');
        } else if (this.selectedTime === 'evening') {
            angle = Math.PI / 2;
            document.getElementById('ch5-evening-btn')?.classList.add('active');
        } else if (this.selectedTime === 'dawn') {
            angle = -Math.PI / 2;
            document.getElementById('ch5-dawn-btn')?.classList.add('active');
        }

        const earthRadius = 5;
        const observerPos = new THREE.Vector3(
            Math.cos(angle) * earthRadius,
            0,
            Math.sin(angle) * earthRadius
        );
        
        this.observer.position.copy(observerPos);
        this.observer.lookAt(this.earth.position);
    }

    updatePositions(time) {
        const orbitRadius = 20;
        const lunarCycle = 28; 
        const earthDay = 1; 

        const moonAngle = (time / lunarCycle) * 2 * Math.PI;
        const earthAngle = (time / earthDay) * 2 * Math.PI;

        // 달의 공전 (반시계)
        this.moon.position.x = Math.cos(moonAngle) * orbitRadius;
        this.moon.position.z = Math.sin(moonAngle) * orbitRadius;
        this.moon.rotation.y = moonAngle;
        
        this.earth.rotation.y = earthAngle; 
        
        // 관측자 위치는 지구 자전과 독립적으로 고정
        this.updateObserverPosition();
        
        const date = Math.floor(time % lunarCycle) + 1;
        if (this.dateDisplay) this.dateDisplay.textContent = `${date}`;
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.isAnimating) {
            this.simulationTime += this.clock.getDelta() * 0.25; // 1초에 0.25일 (속도 1/4)
        }
        
        this.updatePositions(this.simulationTime);

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
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


