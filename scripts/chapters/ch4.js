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

        const textureLoader = new THREE.TextureLoader();
        let planetMaterial;
        if (type === 'moon') {
            // 달 표면: 실제 달 텍스처 + 요철(bump)
            // 텍스처 로드 완료 시 재렌더 (정지 상태에서도 바로 보이도록)
            const rerender = () => renderer.render(scene, camera);
            const moonTex = textureLoader.load('assets/textures/2k_moon.jpg', rerender);
            moonTex.wrapS = moonTex.wrapT = THREE.RepeatWrapping;
            moonTex.repeat.set(1.5, 1.5);
            planetMaterial = new THREE.MeshStandardMaterial({ map: moonTex, bumpMap: moonTex, bumpScale: 0.6, roughness: 0.95 });
            // 달 하늘: 별이 보이는 우주 배경
            const skyGeo = new THREE.SphereGeometry(400, 32, 24);
            const skyMat = new THREE.MeshBasicMaterial({
                map: textureLoader.load('assets/textures/2k_stars_milky_way.jpg', rerender),
                side: THREE.BackSide, color: 0x666677
            });
            scene.add(new THREE.Mesh(skyGeo, skyMat));
        } else {
            // 지구 지표: 무채색 노이즈 텍스처 + 높이 기반 정점 색(풀/흙/바위)
            const noiseCanvas = document.createElement('canvas');
            noiseCanvas.width = noiseCanvas.height = 512;
            const sctx = noiseCanvas.getContext('2d');
            sctx.fillStyle = '#d9d9d9';
            sctx.fillRect(0, 0, 512, 512);
            for (let i = 0; i < 12000; i++) {
                const shade = 170 + Math.floor(Math.random() * 85);
                sctx.fillStyle = `rgba(${shade}, ${shade}, ${shade}, ${0.2 + Math.random() * 0.3})`;
                const s = 1 + Math.random() * 3;
                sctx.fillRect(Math.random() * 512, Math.random() * 512, s, s);
            }
            const noiseTex = new THREE.CanvasTexture(noiseCanvas);
            noiseTex.wrapS = noiseTex.wrapT = THREE.RepeatWrapping;
            noiseTex.repeat.set(3, 3);
            planetMaterial = new THREE.MeshStandardMaterial({ map: noiseTex, bumpMap: noiseTex, bumpScale: 0.12, roughness: 0.9, vertexColors: true });
            // 지구 하늘: 맑은 하늘색 + 원거리 안개 + 태양 + 구름
            scene.background = new THREE.Color(0x87b5e0);
            scene.fog = new THREE.Fog(0x87b5e0, 30, 120);

            const sunCanvas = document.createElement('canvas');
            sunCanvas.width = sunCanvas.height = 128;
            const sunCtx = sunCanvas.getContext('2d');
            const sunGrad = sunCtx.createRadialGradient(64, 64, 10, 64, 64, 64);
            sunGrad.addColorStop(0, 'rgba(255, 250, 220, 1)');
            sunGrad.addColorStop(0.3, 'rgba(255, 235, 150, 0.7)');
            sunGrad.addColorStop(1, 'rgba(255, 220, 100, 0)');
            sunCtx.fillStyle = sunGrad;
            sunCtx.fillRect(0, 0, 128, 128);
            const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
                map: new THREE.CanvasTexture(sunCanvas),
                transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false
            }));
            sunSprite.position.set(28, 16, -80);
            sunSprite.scale.set(22, 22, 1);
            scene.add(sunSprite);

            const cloudCanvas = document.createElement('canvas');
            cloudCanvas.width = 128; cloudCanvas.height = 64;
            const cctx = cloudCanvas.getContext('2d');
            [[34, 40, 20], [64, 32, 26], [95, 42, 18], [50, 44, 16], [80, 46, 14]].forEach(([cx, cy, cr]) => {
                const g = cctx.createRadialGradient(cx, cy, 2, cx, cy, cr);
                g.addColorStop(0, 'rgba(255,255,255,0.85)');
                g.addColorStop(1, 'rgba(255,255,255,0)');
                cctx.fillStyle = g;
                cctx.fillRect(0, 0, 128, 64);
            });
            const cloudTex = new THREE.CanvasTexture(cloudCanvas);
            for (let i = 0; i < 6; i++) {
                const cloud = new THREE.Sprite(new THREE.SpriteMaterial({
                    map: cloudTex, transparent: true, opacity: 0.7 + Math.random() * 0.2, depthWrite: false
                }));
                cloud.position.set(-60 + Math.random() * 120, 7 + Math.random() * 8, -55 - Math.random() * 25);
                const cw = 18 + Math.random() * 14;
                cloud.scale.set(cw, cw * 0.4, 1);
                scene.add(cloud);
            }
        }
        const planetGeometry = new THREE.PlaneGeometry(20, 20, 100, 100);
        if (type === 'earth') {
            const vCount = planetGeometry.attributes.position.count;
            planetGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(vCount * 3), 3));
        }
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
            // 물은 구덩이 안에서만 차오르도록 원판으로
            const waterGeo = new THREE.CircleGeometry(4.4, 64);
            const waterMat = new THREE.MeshPhongMaterial({
                color: 0x2e6fbe, transparent: true, opacity: 0.65,
                shininess: 120, specular: 0xaaccff
            });
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
            const rainMat = new THREE.MeshBasicMaterial({ color: 0xbbddff, transparent: true, opacity: 0.5 });
            const dropGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.45, 4);
            for (let i = 0; i < 200; i++) {
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
            // 바람: 부드러운 반투명 안개 입자 (스프라이트)
            const puffCanvas = document.createElement('canvas');
            puffCanvas.width = puffCanvas.height = 64;
            const pctx = puffCanvas.getContext('2d');
            const pGrad = pctx.createRadialGradient(32, 32, 4, 32, 32, 32);
            pGrad.addColorStop(0, 'rgba(255,255,255,0.7)');
            pGrad.addColorStop(1, 'rgba(255,255,255,0)');
            pctx.fillStyle = pGrad;
            pctx.fillRect(0, 0, 64, 64);
            const puffMat = new THREE.SpriteMaterial({
                map: new THREE.CanvasTexture(puffCanvas),
                transparent: true, opacity: 0.35, depthWrite: false
            });
            for (let i = 0; i < 80; i++) {
                const puff = new THREE.Sprite(puffMat);
                puff.scale.set(0.8 + Math.random() * 0.8, 0.25 + Math.random() * 0.2, 1);
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
        if (type === 'earth') this.updateEarthColors(app);
        renderer.render(scene, camera);
    }

    // 높이 기반 지표 색: 구덩이 속은 흙, 테두리는 바위, 평지는 풀
    updateEarthColors(app) {
        const geometry = app.planet.geometry;
        const positions = geometry.attributes.position;
        const colors = geometry.attributes.color;
        if (!colors) return;
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
            let r, g, b;
            if (z < -0.03) {
                // 흙 (깊을수록 어둡게)
                const d = Math.min(1, -z / 1.5);
                r = 0.55 - d * 0.15; g = 0.42 - d * 0.12; b = 0.27 - d * 0.08;
            } else if (z > 0.12) {
                // 바위 테두리
                r = 0.62; g = 0.56; b = 0.46;
            } else {
                // 풀 (위치 기반 미세 변화)
                const n = (Math.sin(x * 2.3) + Math.cos(y * 1.7)) * 0.04;
                r = 0.32 + n; g = 0.58 + n; b = 0.28 + n;
            }
            colors.setXYZ(i, r, g, b);
        }
        colors.needsUpdate = true;
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
                this.updateEarthColors(app);
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
        this.updateEarthColors(earthApp); // 침식으로 메워질수록 풀색 복원

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


