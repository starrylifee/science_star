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
        this.startBtn = document.getElementById('ch4-start-btn');
        this.resetBtn = document.getElementById('ch4-reset-btn');

        this.isPlaying = false;
        this.elapsedTime = 0;
        this.animationFrameId = null;

        this.initScene('moon');
        this.initScene('earth');
        
        this.startBtn.onclick = () => this.start();
        this.resetBtn.onclick = () => this.reset();

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
            const waterGeo = new THREE.PlaneGeometry(20, 20);
            const waterMat = new THREE.MeshStandardMaterial({ color: 0x3366ff, transparent: true, opacity: 0.6 });
            app.water = new THREE.Mesh(waterGeo, waterMat);
            app.water.rotation.x = -Math.PI / 2;
            app.water.position.y = -1.5; // 초기 물 높이
            scene.add(app.water);
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
            }
            app.renderer.render(app.scene, app.camera);
        });
    }

    animate() {
        if (!this.isPlaying) return;

        this.elapsedTime += 0.01;
        this.timeDisplay.textContent = Math.floor(this.elapsedTime * 10).toString();

        const earthApp = this.earthApp;
        
        // 풍화 작용 로직 개선
        const geometry = earthApp.planet.geometry;
        const positions = geometry.attributes.position;
        const center = new THREE.Vector2(0, 0);
        const craterRadius = 4;
        const rimWidth = 1.5;

        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const z = positions.getZ(i);
            const distance = center.distanceTo(new THREE.Vector2(x, y));

            // 테두리 침식 (높이가 0보다 큰 부분)
            if (distance < craterRadius + rimWidth && z > 0) {
                positions.setZ(i, z * 0.998); // 테두리를 미세하게 깎음
            }
            
            // 구덩이 메우기 (높이가 0보다 작은 부분)
            if (distance < craterRadius && z < 0) {
                positions.setZ(i, z * 0.9985 + 0.001); // 구덩이 바닥을 조금씩 채움
            }
        }
        positions.needsUpdate = true;
        geometry.computeVertexNormals();

        if (earthApp.water.position.y < -0.1) {
                earthApp.water.position.y += 0.001;
        }

        this.moonApp.controls.update();
        this.moonApp.renderer.render(this.moonApp.scene, this.moonApp.camera);
        earthApp.controls.update();
        earthApp.renderer.render(earthApp.scene, this.moonApp.camera);

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


