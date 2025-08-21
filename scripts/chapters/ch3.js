export function initChapter3() {
    if (!window.__ch3_three_app) {
        window.__ch3_three_app = new CraterSimulation('crater-simulation-container');
    }
    bindCraterUI();
}

class CraterSimulation {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.meteor = null; this.particles = [];
        this.init(); this.animate();
    }
    init() {
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.container.innerHTML = '';
        this.container.appendChild(this.renderer.domElement);
        this.camera.position.set(0, 150, 300);
        this.controls.update();
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(-100, 100, 100);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
        this.createMoon();
        window.addEventListener('resize', () => this.onWindowResize(), false);
    }
    createMoon() {
        const moonGeometry = new THREE.SphereGeometry(100, 128, 128); 
        const moonMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.9 });
        this.moon = new THREE.Mesh(moonGeometry, moonMaterial);
        this.moon.receiveShadow = true;
        this.scene.add(this.moon);
    }
    onWindowResize() {
        if (!this.container) return;
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }
    createCollision(mass, velocity, theta, phi) {
        if (this.meteor) this.scene.remove(this.meteor);
        const meteorSize = mass / 10;
        const meteorGeometry = new THREE.SphereGeometry(meteorSize, 16, 16);
        const meteorMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.5 });
        this.meteor = new THREE.Mesh(meteorGeometry, meteorMaterial);
        this.meteor.castShadow = true;
        const thetaRad = THREE.MathUtils.degToRad(theta);
        const phiRad = THREE.MathUtils.degToRad(phi);
        const startPos = new THREE.Vector3().setFromSphericalCoords(250, phiRad, thetaRad);
        this.meteor.position.copy(startPos);
        this.meteor.userData.velocity = new THREE.Vector3().subVectors(this.moon.position, this.meteor.position).normalize().multiplyScalar(velocity / 20);
        this.meteor.userData.mass = mass;
        this.scene.add(this.meteor);
    }
    createImpact(impactPosition, mass) {
        const craterRadius = mass / 2.5; const craterDepth = craterRadius / 2.5;
        const rimHeight = craterDepth * 0.4; const rimWidth = craterRadius * 0.3;
        const moonGeometry = this.moon.geometry;
        const positionAttribute = moonGeometry.attributes.position;
        const vertex = new THREE.Vector3();
        for (let i = 0; i < positionAttribute.count; i++) {
            vertex.fromBufferAttribute(positionAttribute, i);
            const distance = vertex.distanceTo(impactPosition);
            if (distance < craterRadius) {
                const depressionFactor = 1 - (distance / craterRadius);
                const smoothDepression = depressionFactor * depressionFactor * (3 - 2 * depressionFactor);
                const direction = vertex.clone().normalize();
                const displacement = direction.clone().multiplyScalar(-craterDepth * smoothDepression);
                vertex.add(displacement);
                if (distance > craterRadius - rimWidth) {
                    const rimFactor = (distance - (craterRadius - rimWidth)) / rimWidth;
                    const smoothRim = Math.sin(rimFactor * Math.PI);
                    const rimDisplacement = direction.clone().multiplyScalar(rimHeight * smoothRim);
                    vertex.add(rimDisplacement);
                }
                positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
            }
        }
        positionAttribute.needsUpdate = true;
        moonGeometry.computeVertexNormals();
        this.createDebris(impactPosition, mass);
    }
    createDebris(position, mass) {
        const particleCount = mass * 2;
        for (let i = 0; i < particleCount; i++) {
            const particleGeometry = new THREE.SphereGeometry(Math.random() * 0.5 + 0.2, 4, 4);
            const particleMaterial = new THREE.MeshStandardMaterial({ color: 0x999999 });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.copy(position);
            const velocity = new THREE.Vector3((Math.random() - 0.5) * mass / 5, (Math.random() - 0.5) * mass / 5, (Math.random() - 0.5) * mass / 5);
            velocity.add(position.clone().normalize().multiplyScalar(Math.random() * mass / 10));
            particle.userData.velocity = velocity;
            particle.userData.life = 100 + Math.random() * 100;
            this.scene.add(particle);
            this.particles.push(particle);
        }
    }
    reset() {
        this.scene.remove(this.moon);
        this.createMoon();
        this.particles.forEach(p => this.scene.remove(p));
        this.particles = [];
        if (this.meteor) { this.scene.remove(this.meteor); this.meteor = null; }
        document.getElementById('crater-info').innerHTML = '';
    }
    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.meteor) {
            this.meteor.position.add(this.meteor.userData.velocity);
            const distanceToCenter = this.meteor.position.length();
            if (distanceToCenter <= 100) {
                this.createImpact(this.meteor.position, this.meteor.userData.mass);
                this.scene.remove(this.meteor);
                this.meteor = null;
            }
        }
        this.particles.forEach((particle, index) => {
            particle.position.add(particle.userData.velocity);
            const gravity = particle.position.clone().normalize().multiplyScalar(-0.01);
            particle.userData.velocity.add(gravity);
            particle.userData.life -= 1;
            if (particle.userData.life <= 0) { this.scene.remove(particle); this.particles.splice(index, 1); }
        });
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
    downloadResult() {
        this.renderer.render(this.scene, this.camera);
        const link = document.createElement('a');
        link.download = '충돌-시뮬레이션-결과.png';
        link.href = this.renderer.domElement.toDataURL('image/png');
        link.click();
    }
}

function bindCraterUI() {
    if (window.__ch3_ui_bound) return; // 중복 바인딩 방지
    const massSlider = document.getElementById('massSlider');
    const velocitySlider = document.getElementById('velocitySlider');
    const directionThetaSlider = document.getElementById('directionThetaSlider');
    const directionPhiSlider = document.getElementById('directionPhiSlider');
    const massValue = document.getElementById('massValue');
    const velocityValue = document.getElementById('velocityValue');
    const directionThetaValue = document.getElementById('directionThetaValue');
    const directionPhiValue = document.getElementById('directionPhiValue');
    const collideBtn = document.getElementById('collideBtn');
    const resetBtn = document.getElementById('resetBtn');
    const downloadBtn = document.getElementById('ch3_downloadBtn');
    const craterInfo = document.getElementById('crater-info');

    if (massSlider && massValue) {
        massValue.textContent = massSlider.value;
        massSlider.addEventListener('input', (e) => massValue.textContent = e.target.value);
    }
    if (velocitySlider && velocityValue) {
        velocityValue.textContent = velocitySlider.value;
        velocitySlider.addEventListener('input', (e) => velocityValue.textContent = e.target.value);
    }
    if (directionThetaSlider && directionThetaValue) {
        directionThetaValue.textContent = directionThetaSlider.value;
        directionThetaSlider.addEventListener('input', (e) => directionThetaValue.textContent = e.target.value);
    }
    if (directionPhiSlider && directionPhiValue) {
        directionPhiValue.textContent = directionPhiSlider.value;
        directionPhiSlider.addEventListener('input', (e) => directionPhiValue.textContent = e.target.value);
    }

    if (collideBtn) collideBtn.addEventListener('click', () => {
        if (window.__ch3_three_app) {
            const mass = parseInt(massSlider.value);
            const velocity = parseInt(velocitySlider.value);
            const theta = parseInt(directionThetaSlider.value);
            const phi = parseInt(directionPhiSlider.value);
            window.__ch3_three_app.createCollision(mass, velocity, theta, phi);
            const energy = 0.5 * mass * Math.pow(velocity, 2);
            if (craterInfo) craterInfo.innerHTML = `<p class="text-yellow-300">충돌 에너지: ${Math.round(energy)}</p>`;
        }
    });
    if (resetBtn) resetBtn.addEventListener('click', () => {
        if (window.__ch3_three_app) window.__ch3_three_app.reset();
    });
    if (downloadBtn) downloadBtn.addEventListener('click', () => {
        if(window.__ch3_three_app) window.__ch3_three_app.downloadResult();
    });

    window.__ch3_ui_bound = true;
}


