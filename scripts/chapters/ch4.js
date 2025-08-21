export function initChapter4() {
    if (!window.__ch4_erosion_sim) {
        window.__ch4_erosion_sim = new ErosionSimulation('ch4-moon-container', 'ch4-earth-container');
    }
}

class ErosionSimulation {
    constructor(moonContainerId, earthContainerId) {
        this.moonContainer = document.getElementById(moonContainerId);
        this.earthContainer = document.getElementById(earthContainerId);
        this.timeDisplay = document.getElementById('ch4-time');
        this.erosionDisplay = document.getElementById('ch4-erosion');
        this.startBtn = document.getElementById('ch4-start-btn');
        this.resetBtn = document.getElementById('ch4-reset-btn');

        this.isPlaying = false;
        this.elapsedTime = 0;
        this.animationFrameId = null;
        this.erosionPercent = 100;
        this.enableRain = false;
        this.enableWind = false;
        this.waterTime = 0;

        this.initScene('moon');
        this.initScene('earth');
        
        this.startBtn.onclick = () => this.start();
        this.resetBtn.onclick = () => this.reset();

        // Toggles
        const rainToggle = document.getElementById('ch4-toggle-rain');
        const windToggle = document.getElementById('ch4-toggle-wind');
        if (rainToggle) rainToggle.addEventListener('change', (e) => {
            this.enableRain = !!e.target.checked;
            if (this.earthApp && this.earthApp.rainGroup) this.earthApp.rainGroup.visible = this.enableRain;
        });
        if (windToggle) windToggle.addEventListener('change', (e) => {
            this.enableWind = !!e.target.checked;
            if (this.earthApp && this.earthApp.windGroup) this.earthApp.windGroup.visible = this.enableWind;
        });

        window.addEventListener('resize', () => {
            this.onWindowResize(this.moonApp);
            this.onWindowResize(this.earthApp);
        });
    }

    initScene(type) {
        const container = type === 'moon' ? this.moonContainer : this.earthContainer;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        camera.position.set(0, 8, 15);
        camera.lookAt(0,0,0);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        container.innerHTML = '';
        container.appendChild(renderer.domElement);

        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.target.set(0,0,0);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 7);
        scene.add(directionalLight);

        const color = type === 'moon' ? 0x888888 : 0x966919;
        const planetGeometry = new THREE.PlaneGeometry(20, 20, 100, 100);
        const planetMaterial = new THREE.MeshStandardMaterial({ color: color, roughness: 0.8 });
        const planet = new THREE.Mesh(planetGeometry, planetMaterial);
        planet.rotation.x = -Math.PI / 2;
        scene.add(planet);

        const app = { container, scene, camera, renderer, controls, planet, originalVertices: [] };
        
        const positions = planet.geometry.attributes.position.array;
        for(let i = 0; i < positions.length; i+=3) {
            app.originalVertices.push({x: positions[i], y: positions[i+1], z: positions[i+2]});
        }

        if (type === 'moon') {
            this.moonApp = app;
        } else {
            this.earthApp = app;
            // 물 생성
            const waterGeo = new THREE.PlaneGeometry(20, 20, 64, 64);
            const waterMat = new THREE.MeshStandardMaterial({ color: 0x3366ff, transparent: true, opacity: 0.6 });
            app.water = new THREE.Mesh(waterGeo, waterMat);
            app.water.rotation.x = -Math.PI / 2;
            app.water.position.y = -1.5; // 초기 물 높이
            scene.add(app.water);
            // 물 원본 정점 저장 (파도 애니메이션용)
            app.waterOriginalVertices = [];
            const wPositions = app.water.geometry.attributes.position.array;
            for (let i = 0; i < wPositions.length; i+=3) {
                app.waterOriginalVertices.push({x: wPositions[i], y: wPositions[i+1], z: wPositions[i+2]});
            }

            // 비 파티클
            const rainGroup = new THREE.Group();
            const rainMat = new THREE.MeshBasicMaterial({ color: 0x77aaff });
            for (let i = 0; i < 150; i++) {
                const dropGeo = new THREE.BoxGeometry(0.03, 0.3, 0.03);
                const drop = new THREE.Mesh(dropGeo, rainMat);
                drop.position.set((Math.random() - 0.5) * 18, Math.random() * 8 + 2, (Math.random() - 0.5) * 18);
                drop.userData.vy = 0.1 + Math.random() * 0.15;
                rainGroup.add(drop);
            }
            rainGroup.visible = false;
            app.rainGroup = rainGroup;
            scene.add(rainGroup);

            // 바람 파티클
            const windGroup = new THREE.Group();
            const windMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            for (let i = 0; i < 80; i++) {
                const puffGeo = new THREE.BoxGeometry(0.2, 0.02, 0.02);
                const puff = new THREE.Mesh(puffGeo, windMat);
                puff.position.set((Math.random() - 0.5) * 18, Math.random() * 4 + 0.5, (Math.random() - 0.5) * 18);
                puff.userData.vx = 0.03 + Math.random() * 0.06;
                puff.userData.phase = Math.random() * Math.PI * 2;
                windGroup.add(puff);
            }
            windGroup.visible = false;
            app.windGroup = windGroup;
            scene.add(windGroup);
        }

        this.createCrater(app);
        renderer.render(scene, camera);
    }

    createCrater(app) {
        const geometry = app.planet.geometry;
        const positions = geometry.attributes.position;
        const center = new THREE.Vector2(0, 0);
        const craterRadius = 4;
        const craterDepth = 1.5;
        const rimHeight = 0.5;
        const rimWidth = 1.5;

        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const distance = center.distanceTo(new THREE.Vector2(x, y));

            if (distance < craterRadius + rimWidth) {
                let z_offset = 0;
                // 구덩이
                if (distance < craterRadius) {
                    z_offset = -craterDepth * (1 - Math.pow(distance / craterRadius, 2));
                }
                // 왕관 모양 테두리
                if (distance > craterRadius - rimWidth && distance < craterRadius + rimWidth) {
                    const rimFactor = (distance - (craterRadius - rimWidth)) / (rimWidth * 2);
                    z_offset += rimHeight * Math.sin(rimFactor * Math.PI);
                }
                positions.setZ(i, positions.getZ(i) + z_offset);
            }
        }
        positions.needsUpdate = true;
        geometry.computeVertexNormals();
    }

    start() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.startBtn.disabled = true;
        this.animate();
    }

    reset() {
        this.isPlaying = false;
        cancelAnimationFrame(this.animationFrameId);
        this.elapsedTime = 0;
        this.timeDisplay.textContent = '0';
        this.erosionPercent = 100;
        if (this.erosionDisplay) this.erosionDisplay.textContent = '100';
        this.startBtn.disabled = false;

        ['moonApp', 'earthApp'].forEach(appName => {
            const app = this[appName];
            const geometry = app.planet.geometry;
            const positions = geometry.attributes.position;
            for (let i = 0; i < app.originalVertices.length; i++) {
                positions.setXYZ(i, app.originalVertices[i].x, app.originalVertices[i].y, app.originalVertices[i].z);
            }
            this.createCrater(app);
            if(appName === 'earthApp') {
                app.water.position.y = -1.5;
                if (app.rainGroup) app.rainGroup.children.forEach(d => d.position.set((Math.random() - 0.5) * 18, Math.random() * 8 + 2, (Math.random() - 0.5) * 18));
                if (app.windGroup) app.windGroup.children.forEach(p => p.position.set((Math.random() - 0.5) * 18, Math.random() * 4 + 0.5, (Math.random() - 0.5) * 18));
            }
            app.renderer.render(app.scene, app.camera);
        });
    }

    animate() {
        if (!this.isPlaying) return;

        this.elapsedTime += 0.01;
        this.waterTime += 0.02;
        this.timeDisplay.textContent = Math.floor(this.elapsedTime * 10).toString();

        const earthApp = this.earthApp;
        
        // 풍화 작용 로직 개선
        const geometry = earthApp.planet.geometry;
        const positions = geometry.attributes.position;
        const center = new THREE.Vector2(0, 0);
        const craterRadius = 4;
        const rimWidth = 1.5;

        // 침식 속도 계수
        const rimDecayBase = 0.998;
        const holeFillBase = 0.9985;
        let speedFactor = 1;
        if (this.enableRain) speedFactor *= 1.8;
        if (this.enableWind) speedFactor *= 1.5;
        const rimDecay = 1 - (1 - rimDecayBase) * speedFactor;
        const holeFill = 1 - (1 - holeFillBase) * speedFactor;

        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const z = positions.getZ(i);
            const distance = center.distanceTo(new THREE.Vector2(x, y));

            // 테두리 침식 (높이가 0보다 큰 부분)
            if (distance < craterRadius + rimWidth && z > 0) {
                positions.setZ(i, z * rimDecay); // 테두리를 깎음 (가속 고려)
            }
            
            // 구덩이 메우기 (높이가 0보다 작은 부분)
            if (distance < craterRadius && z < 0) {
                positions.setZ(i, z * holeFill + 0.001 * speedFactor); // 구덩이 바닥 채움 (가속 고려)
            }
        }
        positions.needsUpdate = true;
        geometry.computeVertexNormals();

        if (earthApp.water.position.y < -0.1) {
                earthApp.water.position.y += this.enableRain ? 0.003 : 0.001;
        }

        // 침식 % 감소 로직 (100 -> 0)
        if (this.erosionPercent > 0) {
            let decayPerFrame = 0.02; // 기본
            if (this.enableRain) decayPerFrame += 0.08;
            if (this.enableWind) decayPerFrame += 0.05;
            this.erosionPercent = Math.max(0, this.erosionPercent - decayPerFrame);
            if (this.erosionDisplay) this.erosionDisplay.textContent = Math.round(this.erosionPercent).toString();
        }

        // 물결 애니메이션
        if (earthApp.water && earthApp.water.geometry && earthApp.waterOriginalVertices) {
            const wGeom = earthApp.water.geometry;
            const wAttr = wGeom.attributes.position;
            const amplitude = this.enableRain ? 0.15 : 0.06;
            const freq = 0.6;
            for (let i = 0; i < wAttr.count; i++) {
                const base = earthApp.waterOriginalVertices[i];
                const wave = Math.sin((base.x + base.y) * freq + this.waterTime) * amplitude
                           + Math.cos((base.x - base.y) * (freq * 0.8) + this.waterTime * 1.2) * (amplitude * 0.6);
                wAttr.setXYZ(i, base.x, base.y, base.z + wave);
            }
            wAttr.needsUpdate = true;
            wGeom.computeVertexNormals();
        }

        // 비 내리는 애니메이션
        if (earthApp.rainGroup && earthApp.rainGroup.visible) {
            const drift = this.enableWind ? 0.03 : 0.0;
            earthApp.rainGroup.children.forEach(drop => {
                drop.position.y -= drop.userData.vy;
                drop.position.x += drift;
                if (drop.position.y < 0) {
                    drop.position.y = Math.random() * 8 + 2;
                    drop.position.x = (Math.random() - 0.5) * 18;
                    drop.position.z = (Math.random() - 0.5) * 18;
                }
            });
        }

        // 바람 애니메이션
        if (earthApp.windGroup && earthApp.windGroup.visible) {
            earthApp.windGroup.children.forEach(puff => {
                puff.position.x += puff.userData.vx * (this.enableWind ? 1.8 : 1);
                puff.position.y += Math.sin(this.waterTime + puff.userData.phase) * 0.005;
                if (puff.position.x > 9) {
                    puff.position.x = -9;
                    puff.position.y = Math.random() * 4 + 0.5;
                    puff.position.z = (Math.random() - 0.5) * 18;
                }
            });
        }

        this.moonApp.controls.update();
        this.moonApp.renderer.render(this.moonApp.scene, this.moonApp.camera);
        earthApp.controls.update();
        earthApp.renderer.render(earthApp.scene, earthApp.camera);

        this.animationFrameId = requestAnimationFrame(() => this.animate());
    }
    
    onWindowResize(app) {
        if (!app || !app.container) return;
        app.camera.aspect = app.container.clientWidth / app.container.clientHeight;
        app.camera.updateProjectionMatrix();
        app.renderer.setSize(app.container.clientWidth, app.container.clientHeight);
        app.renderer.render(app.scene, app.camera);
    }
}


