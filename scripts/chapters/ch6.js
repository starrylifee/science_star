export function initChapter6() {
    if (!window.__ch6_solar_system_tour) {
        window.__ch6_solar_system_tour = new SolarSystemTour('ch6-container');
    }
}

class SolarSystemTour {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.buttonsContainer = document.getElementById('ch6-planet-buttons');
        this.infoTitle = document.getElementById('ch6-info-title');
        this.infoText = document.getElementById('ch6-info-text');
        if (!this.container) return;

        this.planets = {};
        this.planetData = {
            '태양': { texture: 'https://raw.githubusercontent.com/jeromeetienne/threex.planets/master/images/sunmap.jpg', size: 10, info: "태양계의 유일한 항성. 지름은 약 139만 km로 지구의 109배에 달하며, 태양계 전체 질량의 99.86%를 차지합니다. 표면 온도는 약 5,500°C에 이릅니다." },
            '수성': { texture: 'https://raw.githubusercontent.com/jeromeetienne/threex.planets/master/images/mercurymap.jpg', size: 1, distance: 20, info: "태양에 가장 가까운 행성으로, 대기가 거의 없어 낮과 밤의 온도 차가 극심합니다. 표면은 달처럼 충돌 구덩이가 많습니다. 공전 주기는 약 88일입니다." },
            '금성': { texture: 'https://raw.githubusercontent.com/jeromeetienne/threex.planets/master/images/venusmap.jpg', size: 1.5, distance: 30, info: "두꺼운 이산화탄소 대기로 덮여있어 강력한 온실 효과로 표면 온도가 약 460°C에 달하는 뜨거운 행성입니다. 자전 방향이 다른 행성들과 반대입니다." },
            '지구': { texture: 'https://raw.githubusercontent.com/jeromeetienne/threex.planets/master/images/earthmap1k.jpg', size: 1.6, distance: 40, info: "액체 상태의 물과 풍부한 대기가 있어 현재까지 생명체가 확인된 유일한 행성입니다. 달이라는 큰 위성을 가지고 있습니다." },
            '화성': { texture: 'https://raw.githubusercontent.com/jeromeetienne/threex.planets/master/images/marsmap1k.jpg', size: 1.2, distance: 50, info: "표면의 산화철 때문에 붉게 보여 '붉은 행성'이라 불립니다. 과거에 물이 흘렀던 흔적이 발견되었으며, 극지방에는 얼음으로 된 극관이 있습니다." },
            '목성': { texture: 'https://raw.githubusercontent.com/jeromeetienne/threex.planets/master/images/jupitermap.jpg', size: 5, distance: 70, info: "태양계에서 가장 큰 가스 행성입니다. 거대한 소용돌이인 '대적점'이 특징이며, 수많은 위성을 거느리고 있습니다. 자전 속도가 매우 빠릅니다." },
            '토성': { texture: 'https://raw.githubusercontent.com/jeromeetienne/threex.planets/master/images/saturnmap.jpg', ringTexture: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/saturnringcolor.jpg', size: 4, distance: 90, info: "얼음과 암석 조각으로 이루어진 아름다운 고리를 가지고 있습니다. 밀도가 물보다 낮아 물에 뜰 수 있는 유일한 행성입니다." },
            '천왕성': { texture: 'https://raw.githubusercontent.com/jeromeetienne/threex.planets/master/images/uranusmap.jpg', size: 3, distance: 110, info: "자전축이 약 98도 기울어져 거의 누워서 자전하는 것처럼 보이는 독특한 행성입니다. 메탄 성분 때문에 청록색으로 보입니다." },
            '해왕성': { texture: 'https://raw.githubusercontent.com/jeromeetienne/threex.planets/master/images/neptunemap.jpg', size: 2.8, distance: 130, info: "태양계의 가장 바깥쪽에 위치한 행성으로, 짙은 파란색을 띱니다. 태양계에서 가장 빠른 시속 2,100km의 강한 바람이 붑니다." },
        };
        this.textureLoader = new THREE.TextureLoader();
        this.init();
        this.animate();
    }

    init() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, this.container.clientWidth / this.container.clientHeight, 0.1, 2000);
        this.camera.position.set(0, 50, 150);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        Object.keys(this.planetData).forEach(name => {
            const data = this.planetData[name];
            const texture = this.textureLoader.load(data.texture);
            
            if (name === '태양') {
                const sunGeo = new THREE.SphereGeometry(data.size, 64, 64);
                const sunMat = new THREE.MeshBasicMaterial({ map: texture });
                const sun = new THREE.Mesh(sunGeo, sunMat);
                this.planets['태양'] = sun;
                this.scene.add(sun);
                const pointLight = new THREE.PointLight(0xffffff, 2, 2000);
                sun.add(pointLight);
            } else {
                const orbitGeo = new THREE.RingGeometry(data.distance - 0.1, data.distance + 0.1, 128);
                const orbitMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.3 });
                const orbit = new THREE.Mesh(orbitGeo, orbitMat);
                orbit.rotation.x = -Math.PI / 2;
                this.scene.add(orbit);

                const planetGeo = new THREE.SphereGeometry(data.size, 64, 64);
                const planetMat = new THREE.MeshStandardMaterial({ map: texture });
                const planet = new THREE.Mesh(planetGeo, planetMat);
                this.planets[name] = planet;
                this.scene.add(planet);

                if (name === '토성') {
                    const ringTexture = this.textureLoader.load(data.ringTexture);
                    ringTexture.wrapS = ringTexture.wrapT = THREE.ClampToEdgeWrapping;
                    ringTexture.anisotropy = 16;
                    const ringGeo = new THREE.RingGeometry(data.size * 1.4, data.size * 2.4, 128);
                    const ringMat = new THREE.MeshBasicMaterial({ map: ringTexture, side: THREE.DoubleSide, transparent: true, depthWrite: false, opacity: 0.95 });
                    const ring = new THREE.Mesh(ringGeo, ringMat);
                    ring.rotation.x = -Math.PI / 2.2;
                    planet.add(ring);
                }
            }
        });
        
        this.createButtons();
        window.addEventListener('resize', () => this.onWindowResize());
    }

    createButtons() {
        if (!this.buttonsContainer) return;
        this.buttonsContainer.innerHTML = '';
        Object.keys(this.planetData).forEach(name => {
            const button = document.createElement('button');
            button.innerText = name;
            button.className = "planet-btn w-full p-2 bg-gray-700 rounded-lg hover:bg-yellow-400 hover:text-gray-900 transition-all text-sm";
            button.onclick = () => this.goToPlanet(name);
            this.buttonsContainer.appendChild(button);
        });
    }

    goToPlanet(name) {
        const targetPlanet = this.planets[name];
        const data = this.planetData[name];
        
        if (this.infoTitle) this.infoTitle.innerText = name;
        if (this.infoText) this.infoText.innerText = data.info;
        
        document.querySelectorAll('.planet-btn').forEach(btn => {
            btn.classList.toggle('active', btn.innerText === name);
        });

        const targetPosition = new THREE.Vector3(
            targetPlanet.position.x + data.size * 4,
            targetPlanet.position.y + data.size * 4,
            targetPlanet.position.z + data.size * 4
        );
        const controlsTarget = targetPlanet.position.clone();

        new TWEEN.Tween(this.camera.position)
            .to(targetPosition, 1500)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .start();
        
        new TWEEN.Tween(this.controls.target)
            .to(controlsTarget, 1500)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .start();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        TWEEN.update();

        const time = Date.now() * 0.0001;
        
        Object.keys(this.planets).forEach(name => {
            if (name === '태양') return;
            const planet = this.planets[name];
            const data = this.planetData[name];
            const speed = 1 / Math.sqrt(data.distance) * 5;
            
            planet.position.x = Math.cos(time * speed) * data.distance;
            planet.position.z = Math.sin(time * speed) * data.distance;
            planet.rotation.y += 0.005;
        });
        
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        if (!this.container) return;
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }
}


