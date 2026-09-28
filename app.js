import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import gsap from 'gsap';
import * as DATA from './data.js';

const PROJE_AYARLARI = DATA.PROJE_AYARLARI;
const ODA_VERILERI = DATA.ODA_VERILERI || {};
const MATERYAL_SECENEKLERI = DATA.MATERYAL_SECENEKLERI || [];
const DUVAR_ISIMLERI = (DATA.DUVAR_ISIMLERI || ['wall', 'duvar']).map(s => s.toLowerCase());

const I18N = {
    en: {
        totalArea: "Total Net Area",
        langTitle: "Language",
        camTitle: "Camera & Navigation",
        eyeHeight: "Eye Height (Z)",
        indoorFov: "Indoor FOV",
        lightTitle: "Lighting",
        exposure: "Exposure",
        hdrRefl: "HDR Reflection",
        sunInt: "Sun Intensity",
        ambLight: "Ambient Light",
        perfTitle: "Performance & Scene",
        shadowsActive: "Shadows Active",
        turboMode: "Turbo Performance Mode",
        flipDoor: "🔄 Flip Last Door Direction",
        resetBtn: "Reset to Defaults",
        dockTitle: "Walk Inside",
        dockSub: "Drag figure into a room",
        fpsHint: "<b>WASD</b> Move &nbsp;·&nbsp; <b>Drag</b> Look",
        area: "Area",
        dim: "Dimensions",
        ceiling: "Ceiling",
        floor: "Floor",
        enterFps: "Enter Room (FPS)",
        floorMat: "Floor Material",
        surface: "Surface",
        selected: "Selected",
        door: "Door",
        open: "Open",
        closed: "Closed",
        sceneReady: "Doors · Walls · Colliders Ready",
        testScene: "Test scene active (awaiting ev.glb)"
    },
    tr: {
        totalArea: "Toplam Net Alan",
        langTitle: "Dil / Language",
        camTitle: "Kamera & Gezinme",
        eyeHeight: "Göz Yüksekliği (Z)",
        indoorFov: "İç Mekan Açısı (FOV)",
        lightTitle: "Aydınlatma",
        exposure: "Genel Parlaklık",
        hdrRefl: "HDR Yansıma",
        sunInt: "Güneş Şiddeti",
        ambLight: "Ortam Işığı",
        perfTitle: "Performans & Sahne",
        shadowsActive: "Gölgeler Aktif",
        turboMode: "Turbo Performans Modu",
        flipDoor: "🔄 Son Kapının Yönünü Çevir",
        resetBtn: "Ayarları Varsayılana Sıfırla",
        dockTitle: "İçeride Gezin",
        dockSub: "Figürü odaya sürükleyin",
        fpsHint: "<b>WASD</b> Yürü &nbsp;·&nbsp; <b>Sürükle</b> Bakış",
        area: "Alan",
        dim: "Ölçü",
        ceiling: "Tavan",
        floor: "Zemin",
        enterFps: "Bu Odaya İniş Yap",
        floorMat: "Zemin Seçimi",
        surface: "Yüzey",
        selected: "Seçili",
        door: "Kapı",
        open: "Açık",
        closed: "Kapalı",
        sceneReady: "Kapı · Duvar · Coll Hazır",
        testScene: "Test sahnesi aktif (ev.glb bekleniyor)"
    }
};

let currentLang = localStorage.getItem('site_lang') || PROJE_AYARLARI.varsayilanDil || 'en';

function trVal(val) {
    if (val && typeof val === 'object') return val[currentLang] || val.en || val.tr || '';
    return val ?? '';
}

const varsayilanIsik = {
    parlaklikExposure: 0.75,
    hdrYansimaGucu: 0.45,
    gunesIsigi: 0.90,
    ortamIsigi: 0.35,
    golgelerAktif: true,
    ...(DATA.ISIK_AYARLARI || {})
};
const aktifIsik = { ...varsayilanIsik, ...JSON.parse(localStorage.getItem('ozel_isik_ayarlari') || '{}') };
const doorAngles = { ...(DATA.KAPI_ACILMA_ACILARI || {}), ...JSON.parse(localStorage.getItem('kapi_yonleri') || '{}') };

const debugToast = document.getElementById('debug-toast');
const fpsBadge = document.getElementById('fps-badge');
const flipDoorBtn = document.getElementById('flip-door-btn');
const settingsBtn = document.getElementById('settings-btn');
const settingsDrawer = document.getElementById('settings-drawer');

settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    settingsBtn.classList.toggle('active');
    settingsDrawer.classList.toggle('open');
});
settingsDrawer.addEventListener('pointerdown', (e) => e.stopPropagation());
window.addEventListener('pointerdown', () => {
    settingsBtn.classList.remove('active');
    settingsDrawer.classList.remove('open');
});

const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f1115);

const ORBIT_FOV = PROJE_AYARLARI.orbitFov || 50;
const MAX_EYE_HEIGHT = PROJE_AYARLARI.maxBoyYuksekligi || 4.50;
let currentFpsFov = PROJE_AYARLARI.fpsFov || 70;
let currentEyeHeight = Math.min(PROJE_AYARLARI.fpsBoyYuksekligi || 2.80, MAX_EYE_HEIGHT);

const camera = new THREE.PerspectiveCamera(ORBIT_FOV, window.innerWidth / window.innerHeight, 0.05, 300);
camera.position.set(0, 16, 16);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = aktifIsik.golgelerAktif;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = aktifIsik.parlaklikExposure;
container.appendChild(renderer.domElement);

function updateShadowsOnce() {
    if (renderer.shadowMap.enabled) renderer.shadowMap.needsUpdate = true;
}

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0px';
labelRenderer.domElement.style.pointerEvents = 'none';
container.appendChild(labelRenderer.domElement);

const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;
orbitControls.maxPolarAngle = Math.PI / 2 - 0.04;

const rgbeLoader = new RGBELoader();
const allSceneMaterials = new Set();

function applyHDR(texture) {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = texture;
    updateEnvMapIntensity(aktifIsik.hdrYansimaGucu);
}

rgbeLoader.load(
    PROJE_AYARLARI.hdrYolu,
    applyHDR,
    undefined,
    () => rgbeLoader.load('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/potsdamer_platz_1k.hdr', applyHDR)
);

const ambientLight = new THREE.AmbientLight(0xffffff, aktifIsik.ortamIsigi);
scene.add(ambientLight);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0xcbd5e1, aktifIsik.ortamIsigi * 0.8);
hemiLight.position.set(0, 15, 0);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xfff8e7, aktifIsik.gunesIsigi);
dirLight.position.set(12, 24, 12);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(1024, 1024);
const d = 18;
dirLight.shadow.camera.left = -d; dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d; dirLight.shadow.camera.bottom = -d;
dirLight.shadow.bias = -0.0005;
dirLight.shadow.normalBias = 0.02;
scene.add(dirLight);

function updateEnvMapIntensity(val) {
    allSceneMaterials.forEach(mat => {
        if (mat && 'envMapIntensity' in mat) {
            mat.envMapIntensity = val;
            mat.needsUpdate = true;
        }
    });
}

const slExposure = document.getElementById('sl-exposure');
const slHdr = document.getElementById('sl-hdr');
const slSun = document.getElementById('sl-sun');
const slAmbient = document.getElementById('sl-ambient');
const cbShadows = document.getElementById('cb-shadows');
const cbTurbo = document.getElementById('cb-turbo');

function syncLightingUI() {
    slExposure.value = aktifIsik.parlaklikExposure;
    document.getElementById('val-exposure').textContent = aktifIsik.parlaklikExposure.toFixed(2);
    slHdr.value = aktifIsik.hdrYansimaGucu;
    document.getElementById('val-hdr').textContent = aktifIsik.hdrYansimaGucu.toFixed(2);
    slSun.value = aktifIsik.gunesIsigi;
    document.getElementById('val-sun').textContent = aktifIsik.gunesIsigi.toFixed(2);
    slAmbient.value = aktifIsik.ortamIsigi;
    document.getElementById('val-ambient').textContent = aktifIsik.ortamIsigi.toFixed(2);
    cbShadows.checked = aktifIsik.golgelerAktif;
}
syncLightingUI();

function saveLighting() {
    localStorage.setItem('ozel_isik_ayarlari', JSON.stringify(aktifIsik));
}

slExposure.addEventListener('input', (e) => {
    aktifIsik.parlaklikExposure = parseFloat(e.target.value);
    renderer.toneMappingExposure = aktifIsik.parlaklikExposure;
    document.getElementById('val-exposure').textContent = aktifIsik.parlaklikExposure.toFixed(2);
    saveLighting();
});
slHdr.addEventListener('input', (e) => {
    aktifIsik.hdrYansimaGucu = parseFloat(e.target.value);
    updateEnvMapIntensity(aktifIsik.hdrYansimaGucu);
    document.getElementById('val-hdr').textContent = aktifIsik.hdrYansimaGucu.toFixed(2);
    saveLighting();
});
slSun.addEventListener('input', (e) => {
    aktifIsik.gunesIsigi = parseFloat(e.target.value);
    dirLight.intensity = aktifIsik.gunesIsigi;
    document.getElementById('val-sun').textContent = aktifIsik.gunesIsigi.toFixed(2);
    saveLighting();
});
slAmbient.addEventListener('input', (e) => {
    aktifIsik.ortamIsigi = parseFloat(e.target.value);
    ambientLight.intensity = aktifIsik.ortamIsigi;
    hemiLight.intensity = aktifIsik.ortamIsigi * 0.8;
    document.getElementById('val-ambient').textContent = aktifIsik.ortamIsigi.toFixed(2);
    saveLighting();
});
cbShadows.addEventListener('change', (e) => {
    aktifIsik.golgelerAktif = e.target.checked;
    renderer.shadowMap.enabled = aktifIsik.golgelerAktif;
    allSceneMaterials.forEach(m => { if (m) m.needsUpdate = true; });
    updateShadowsOnce();
    saveLighting();
});
cbTurbo.addEventListener('change', (e) => {
    renderer.setPixelRatio(e.target.checked ? 0.85 : Math.min(window.devicePixelRatio, 1.5));
});
document.getElementById('reset-light-btn').addEventListener('click', () => {
    localStorage.removeItem('ozel_isik_ayarlari');
    Object.assign(aktifIsik, varsayilanIsik);
    renderer.toneMappingExposure = aktifIsik.parlaklikExposure;
    updateEnvMapIntensity(aktifIsik.hdrYansimaGucu);
    dirLight.intensity = aktifIsik.gunesIsigi;
    ambientLight.intensity = aktifIsik.ortamIsigi;
    hemiLight.intensity = aktifIsik.ortamIsigi * 0.8;
    renderer.shadowMap.enabled = aktifIsik.golgelerAktif;

    currentEyeHeight = Math.min(PROJE_AYARLARI.fpsBoyYuksekligi || 2.80, MAX_EYE_HEIGHT);
    currentFpsFov = PROJE_AYARLARI.fpsFov || 70;
    heightSlider.value = currentEyeHeight;
    heightValText.textContent = currentEyeHeight.toFixed(2);
    fovSlider.value = currentFpsFov;
    fovValText.textContent = `${currentFpsFov}°`;
    if (isFPSMode) {
        camera.position.y = currentFloorY + currentEyeHeight;
        camera.fov = currentFpsFov;
        camera.updateProjectionMatrix();
    }
    syncLightingUI();
    updateShadowsOnce();
});

const MAX_TEX_SIZE = PROJE_AYARLARI.maxTextureBoyutu || 1024;
const processedTextures = new WeakSet();

function optimizeMaterialTextures(mat) {
    if (!mat) return;
    ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap'].forEach(prop => {
        const tex = mat[prop];
        if (!tex || !tex.image || processedTextures.has(tex)) return;
        processedTextures.add(tex);
        tex.anisotropy = 1;

        const img = tex.image;
        const w = img.width || img.videoWidth || 0;
        const h = img.height || img.videoHeight || 0;

        if (w > MAX_TEX_SIZE || h > MAX_TEX_SIZE) {
            const scale = MAX_TEX_SIZE / Math.max(w, h);
            const nw = Math.max(1, Math.floor(w * scale));
            const nh = Math.max(1, Math.floor(h * scale));
            const canvas = document.createElement('canvas');
            canvas.width = nw; canvas.height = nh;
            canvas.getContext('2d').drawImage(img, 0, 0, nw, nh);
            tex.image = canvas;
            tex.needsUpdate = true;
        }
    });
}

const houseGroup = new THREE.Group();
scene.add(houseGroup);

const walkableMeshes = [];
const wallMeshes = [];
const roomMeshes = {};
const roomMeshGroups = {};
const ceilingMeshes = [];
let collCount = 0;
let wallCount = 0;

const DOOR_NAMES = ['bed_door', 'ext_door', 'ext_door2', 'living_door', 'main_door', 'toilet_door'];
const doorsMap = {};
let lastClickedDoorKey = null;
let activeSelectedMeshes = [];
let activeMatchedKey = null;

function isTopPlane(obj) {
    const n = (obj.name || '').toLowerCase();
    const pn = (obj.parent?.name || '').toLowerCase();
    if (n.includes('top_plane') || pn.includes('top_plane')) return true;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    return mats.some(m => m?.name?.toLowerCase().includes('top_plane'));
}

function isCustomCollider(obj) {
    let curr = obj;
    while (curr) {
        const n = (curr.name || '').toLowerCase();
        if (n === 'coll' || n.startsWith('coll.') || n.startsWith('coll_') || n.startsWith('col_') || n.includes('collision')) return true;
        curr = curr.parent;
    }
    return false;
}

function isWallObject(obj) {
    let curr = obj;
    while (curr) {
        const n = (curr.name || '').toLowerCase();
        if (DUVAR_ISIMLERI.some(w => n.includes(w))) return true;
        curr = curr.parent;
    }
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    return mats.some(m => DUVAR_ISIMLERI.some(w => (m?.name || '').toLowerCase().includes(w)));
}

function identifyDoorInfo(obj) {
    let curr = obj;
    let partType = null, partNumber = null, partNode = null, namedDoorGroup = null;

    while (curr) {
        const name = curr.name || '';
        const lower = name.toLowerCase();

        if (lower.includes('baseboard')) return null;

        if (!partType) {
            const match = lower.match(/^(base|handle)(?![a-z])[._]?(\d+)?/);
            if (match) {
                partType = match[1];
                partNumber = match[2] || '000';
                partNode = curr;
            }
        }
        if (!namedDoorGroup) {
            const found = DOOR_NAMES.find(d => lower === d || lower.startsWith(d + '.') || lower.startsWith(d + '_'));
            if (found) namedDoorGroup = curr;
        }
        curr = curr.parent;
    }

    if (!partType && !namedDoorGroup) return null;

    let doorKey = '';
    if (namedDoorGroup && partNumber && partNumber !== '000') doorKey = `${namedDoorGroup.name}_${partNumber}`;
    else if (namedDoorGroup) doorKey = namedDoorGroup.name;
    else doorKey = `Door_${partNumber || '000'}`;

    return { doorKey, partType, partNode: partNode || namedDoorGroup || obj };
}

function prepareMaterial(mat, shouldClone, isCeiling = false) {
    if (!mat) return null;
    optimizeMaterialTextures(mat);
    let targetMat = shouldClone ? mat.clone() : mat;
    if (shouldClone) targetMat.name = mat.name;
    targetMat.side = THREE.DoubleSide;
    targetMat.envMapIntensity = aktifIsik.hdrYansimaGucu;

    if (isCeiling) {
        targetMat.transparent = false;
        targetMat.opacity = 1.0;
        if (targetMat.emissive) targetMat.emissive.setHex(0x3a3e47);
    }
    allSceneMaterials.add(targetMat);
    return targetMat;
}

function addToRoomGroup(key, mesh) {
    if (!key) return;
    if (!roomMeshes[key]) roomMeshes[key] = mesh;
    if (!roomMeshGroups[key]) roomMeshGroups[key] = [];
    if (!roomMeshGroups[key].includes(mesh)) roomMeshGroups[key].push(mesh);
}

function registerMesh(child) {
    if (!child.isMesh) return;

    if (isCustomCollider(child)) {
        child.visible = false;
        wallMeshes.push(child);
        collCount++;
        return;
    }

    const doorInfo = identifyDoorInfo(child);
    if (doorInfo) {
        const { doorKey, partType, partNode } = doorInfo;
        child.visible = true;
        child.frustumCulled = false;
        child.castShadow = true;
        child.receiveShadow = true;
        child.material = Array.isArray(child.material)
            ? child.material.map(m => prepareMaterial(m, false, false))
            : prepareMaterial(child.material, false, false);

        child.userData.doorName = doorKey;
        if (!doorsMap[doorKey]) {
            doorsMap[doorKey] = { name: doorKey, baseNode: null, pivotGroup: null, isOpen: false, isAnimating: false, meshes: [] };
        }
        doorsMap[doorKey].meshes.push(child);
        if (partType === 'base' || !doorsMap[doorKey].baseNode) doorsMap[doorKey].baseNode = partNode;

        walkableMeshes.push(child);
        wallMeshes.push(child);
        return;
    }

    if (isTopPlane(child)) {
        child.material = Array.isArray(child.material)
            ? child.material.map(m => prepareMaterial(m, true, true))
            : prepareMaterial(child.material, true, true);
        child.visible = false;
        child.castShadow = false;
        child.receiveShadow = false;
        child.frustumCulled = false;
        ceilingMeshes.push(child);
        return;
    }

    const mats = Array.isArray(child.material) ? child.material : [child.material];
    let isFloorOrRoom = Boolean(ODA_VERILERI[child.name]);

    mats.forEach(m => {
        if (!m?.name) return;
        const mName = m.name === 'Grpund.014' ? 'Ground.014' : m.name;
        if (ODA_VERILERI[mName] || mName.toLowerCase().startsWith('ground') || mName.toLowerCase().includes('floor') || mName.toLowerCase().includes('zemin')) {
            isFloorOrRoom = true;
        }
        addToRoomGroup(m.name, child);
        if (m.name === 'Grpund.014') addToRoomGroup('Ground.014', child);
        if (m.name === 'Ground.014') addToRoomGroup('Grpund.014', child);
    });
    if (child.name) addToRoomGroup(child.name, child);

    child.material = Array.isArray(child.material)
        ? child.material.map(m => prepareMaterial(m, isFloorOrRoom, false))
        : prepareMaterial(child.material, isFloorOrRoom, false);

    if (isWallObject(child)) {
        child.castShadow = true;
        child.receiveShadow = true;
        wallMeshes.push(child);
        walkableMeshes.push(child);
        wallCount++;
        return;
    }

    if (isFloorOrRoom) {
        child.castShadow = false;
        child.receiveShadow = true;
        walkableMeshes.push(child);
        return;
    }

    child.castShadow = true;
    child.receiveShadow = true;
}

function buildZeroDistortionDoors() {
    houseGroup.updateMatrixWorld(true);

    Object.values(doorsMap).forEach(door => {
        const hingeNode = door.baseNode || door.meshes[0];
        if (!hingeNode) return;

        const hingeWorldPos = new THREE.Vector3();
        hingeNode.getWorldPosition(hingeWorldPos);

        const pivotGroup = new THREE.Group();
        pivotGroup.position.copy(hingeWorldPos);
        houseGroup.add(pivotGroup);
        pivotGroup.updateMatrixWorld(true);

        const pivotInvMatrix = new THREE.Matrix4().copy(pivotGroup.matrixWorld).invert();

        door.meshes.forEach(mesh => {
            mesh.updateMatrixWorld(true);
            const relMatrix = new THREE.Matrix4().multiplyMatrices(pivotInvMatrix, mesh.matrixWorld);

            mesh.geometry = mesh.geometry.clone();
            mesh.geometry.applyMatrix4(relMatrix);

            if (relMatrix.determinant() < 0) {
                const index = mesh.geometry.index;
                if (index) {
                    for (let i = 0; i < index.count; i += 3) {
                        const tmp = index.getX(i + 1);
                        index.setX(i + 1, index.getX(i + 2));
                        index.setX(i + 2, tmp);
                    }
                    index.needsUpdate = true;
                }
                const norm = mesh.geometry.attributes.normal;
                if (norm) {
                    for (let i = 0; i < norm.count; i++) {
                        norm.setXYZ(i, -norm.getX(i), -norm.getY(i), -norm.getZ(i));
                    }
                    norm.needsUpdate = true;
                }
            }

            mesh.geometry.computeBoundingBox();
            mesh.geometry.computeBoundingSphere();
            mesh.position.set(0, 0, 0);
            mesh.rotation.set(0, 0, 0);
            mesh.quaternion.identity();
            mesh.scale.set(1, 1, 1);
            pivotGroup.add(mesh);
        });

        door.pivotGroup = pivotGroup;
    });
}

flipDoorBtn.addEventListener('click', () => {
    if (!lastClickedDoorKey || !doorsMap[lastClickedDoorKey]) return;
    doorAngles[lastClickedDoorKey] = -(doorAngles[lastClickedDoorKey] ?? 90);
    localStorage.setItem('kapi_yonleri', JSON.stringify(doorAngles));
    doorsMap[lastClickedDoorKey].isOpen = false;
    toggleDoor(lastClickedDoorKey);
});

function toggleDoor(doorKey) {
    const door = doorsMap[doorKey];
    if (!door || !door.pivotGroup || door.isAnimating) return;

    lastClickedDoorKey = doorKey;
    door.isAnimating = true;
    const targetOpen = !door.isOpen;
    const openDeg = doorAngles[doorKey] !== undefined ? doorAngles[doorKey] : 90;
    const targetRad = targetOpen ? THREE.MathUtils.degToRad(openDeg) : 0;

    gsap.to(door.pivotGroup.rotation, {
        y: targetRad,
        duration: 0.7,
        ease: 'power2.inOut',
        onComplete: () => {
            door.isOpen = targetOpen;
            door.isAnimating = false;
            updateShadowsOnce();
            const dict = I18N[currentLang];
            debugToast.textContent = `${dict.door}: ${doorKey} (${door.isOpen ? openDeg + '° ' + dict.open : dict.closed})`;
            flipDoorBtn.classList.add('visible');
        }
    });
}

const gltfLoader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
gltfLoader.setDRACOLoader(dracoLoader);
gltfLoader.load(
    PROJE_AYARLARI.modelYolu,
    (gltf) => {
        const model = gltf.scene;
        houseGroup.add(model);
        houseGroup.updateMatrixWorld(true);

        model.traverse((child) => { if (child.isMesh) registerMesh(child); });
        buildZeroDistortionDoors();

        if (walkableMeshes.length === 0) {
            model.traverse((child) => {
                if (child.isMesh && !isCustomCollider(child) && !isTopPlane(child)) walkableMeshes.push(child);
            });
        }

        updateShadowsOnce();
        debugToast.textContent = `${Object.keys(doorsMap).length} / ${wallCount} / ${collCount} — ${I18N[currentLang].sceneReady}`;
    },
    undefined,
    () => {
        debugToast.textContent = I18N[currentLang].testScene;
        createFallbackTestHouse();
        updateShadowsOnce();
    }
);

function createFallbackTestHouse() {
    function addTestFloor(matName, w, d, x, z, colorHex) {
        const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.35 });
        mat.name = matName;
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), mat);
        mesh.position.set(x, -0.1, z);
        mesh.name = "Zemin_" + matName;
        houseGroup.add(mesh);
        registerMesh(mesh);
    }
    addTestFloor("Ground.014", 6, 5.2, -3, 2.4, 0xb08968);
    addTestFloor("Ground.002", 6, 4.8, -3, -2.6, 0xd8dee9);
    addTestFloor("Ground.003", 6, 10, 3, 0, 0x8c6d53);
}

const textureLoader = new THREE.TextureLoader();
const matPanel = document.getElementById('material-panel');
const matSwatches = document.getElementById('mat-swatches');

function renderMaterialSwatches() {
    matSwatches.innerHTML = '';
    MATERYAL_SECENEKLERI.forEach((matOpt) => {
        const btn = document.createElement('button');
        btn.className = 'mat-swatch';
        const circle = document.createElement('div');
        circle.className = 'mat-circle';
        circle.style.backgroundColor = matOpt.renk;
        if (matOpt.textureUrl) circle.style.backgroundImage = `url('${matOpt.textureUrl}')`;
        const label = document.createElement('span');
        label.textContent = trVal(matOpt.ad);
        btn.appendChild(circle);
        btn.appendChild(label);
        btn.addEventListener('click', () => applyMaterialToActiveMeshes(matOpt));
        matSwatches.appendChild(btn);
    });
}

function applyMaterialToActiveMeshes(matOpt) {
    if (!activeSelectedMeshes.length) return;

    const updateMat = (mat, tex) => {
        if (!mat) return;
        mat.roughness = matOpt.roughness ?? 0.4;
        if (tex) {
            mat.map = tex;
            mat.color.set(0xffffff);
        } else {
            mat.map = null;
            mat.color.set(matOpt.renk);
        }
        mat.needsUpdate = true;
    };

    if (matOpt.textureUrl) {
        textureLoader.load(
            matOpt.textureUrl,
            (tex) => {
                tex.colorSpace = THREE.SRGBColorSpace;
                tex.wrapS = THREE.RepeatWrapping;
                tex.wrapT = THREE.RepeatWrapping;
                tex.repeat.set(matOpt.repeat || 3, matOpt.repeat || 3);
                tex.flipY = false;
                activeSelectedMeshes.forEach(mesh => {
                    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                    mats.forEach(m => updateMat(m, tex));
                });
            },
            undefined,
            () => {
                activeSelectedMeshes.forEach(mesh => {
                    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                    mats.forEach(m => updateMat(m, null));
                });
            }
        );
    } else {
        activeSelectedMeshes.forEach(mesh => {
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach(m => updateMat(m, null));
        });
    }
}

const roomListEl = document.getElementById('room-list');

const calloutWrapper = document.createElement('div');
calloutWrapper.className = 'callout-wrapper';
calloutWrapper.innerHTML = `
    <div class="callout-container" id="callout-box">
        <svg class="callout-svg" viewBox="0 0 64 84">
            <circle cx="8" cy="76" r="5" fill="#10b981" />
            <circle cx="8" cy="76" r="10" fill="none" stroke="#10b981" stroke-width="1.5" opacity="0.5" />
            <polyline points="8,76 32,32 62,32" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" />
        </svg>
        <div class="callout-card">
            <div class="callout-header">
                <h3 class="callout-title" id="co-title">Room</h3>
                <button class="callout-close" id="co-close">✕</button>
            </div>
            <div class="callout-grid">
                <div class="callout-stat"><span class="callout-stat-label" id="co-lbl-area">Area</span><span class="callout-stat-val" id="co-area">-</span></div>
                <div class="callout-stat"><span class="callout-stat-label" id="co-lbl-dim">Dimensions</span><span class="callout-stat-val" id="co-dim">-</span></div>
                <div class="callout-stat"><span class="callout-stat-label" id="co-lbl-height">Ceiling</span><span class="callout-stat-val" id="co-height">-</span></div>
                <div class="callout-stat"><span class="callout-stat-label" id="co-lbl-floor">Floor</span><span class="callout-stat-val" id="co-floor">-</span></div>
            </div>
            <div class="callout-note" id="co-note"></div>
            <button class="callout-fps-btn" id="co-fps-btn">Enter Room (FPS)</button>
        </div>
    </div>
`;
const calloutObject = new CSS2DObject(calloutWrapper);
calloutObject.visible = false;
scene.add(calloutObject);
const calloutBox = calloutWrapper.querySelector('#callout-box');

function renderRoomList() {
    roomListEl.innerHTML = '';
    Object.entries(ODA_VERILERI).forEach(([key, info]) => {
        const btn = document.createElement('button');
        btn.className = 'room-btn';
        if (key === activeMatchedKey) btn.classList.add('active');
        btn.dataset.key = key;
        btn.innerHTML = `<span>${trVal(info.ad)}</span><span class="room-btn-badge">${info.metrekare}</span>`;
        btn.addEventListener('click', () => {
            const meshes = roomMeshGroups[key] || (roomMeshes[key] ? [roomMeshes[key]] : []);
            if (meshes.length > 0) selectMeshesAndShowInfo(meshes, key, null);
        });
        roomListEl.appendChild(btn);
    });
}

function applyLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('site_lang', lang);
    document.documentElement.lang = lang;

    const d = I18N[lang];
    document.getElementById('project-title').textContent = trVal(PROJE_AYARLARI.baslik);
    document.getElementById('total-area-text').textContent = trVal(PROJE_AYARLARI.toplamAlan);
    document.getElementById('ui-total-label').textContent = d.totalArea;
    document.getElementById('ui-st-lang').textContent = d.langTitle;
    document.getElementById('ui-st-cam').textContent = d.camTitle;
    document.getElementById('ui-lbl-height').textContent = d.eyeHeight;
    document.getElementById('ui-lbl-fov').textContent = d.indoorFov;
    document.getElementById('ui-st-light').textContent = d.lightTitle;
    document.getElementById('ui-lbl-exp').textContent = d.exposure;
    document.getElementById('ui-lbl-hdr').textContent = d.hdrRefl;
    document.getElementById('ui-lbl-sun').textContent = d.sunInt;
    document.getElementById('ui-lbl-amb').textContent = d.ambLight;
    document.getElementById('ui-st-perf').textContent = d.perfTitle;
    document.getElementById('ui-lbl-shadows').textContent = d.shadowsActive;
    document.getElementById('ui-lbl-turbo').textContent = d.turboMode;
    document.getElementById('flip-door-btn').textContent = d.flipDoor;
    document.getElementById('reset-light-btn').textContent = d.resetBtn;
    document.getElementById('ui-dock-title').textContent = d.dockTitle;
    document.getElementById('ui-dock-sub').textContent = d.dockSub;
    document.getElementById('ui-fps-hint').innerHTML = d.fpsHint;

    calloutWrapper.querySelector('#co-lbl-area').textContent = d.area;
    calloutWrapper.querySelector('#co-lbl-dim').textContent = d.dim;
    calloutWrapper.querySelector('#co-lbl-height').textContent = d.ceiling;
    calloutWrapper.querySelector('#co-lbl-floor').textContent = d.floor;
    calloutWrapper.querySelector('#co-fps-btn').textContent = d.enterFps;

    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    renderRoomList();
    renderMaterialSwatches();

    if (activeMatchedKey && ODA_VERILERI[activeMatchedKey]) {
        const roomInfo = ODA_VERILERI[activeMatchedKey];
        calloutWrapper.querySelector('#co-title').textContent = trVal(roomInfo.ad);
        calloutWrapper.querySelector('#co-floor').textContent = trVal(roomInfo.zemin) || '-';
        calloutWrapper.querySelector('#co-note').textContent = trVal(roomInfo.not) || '';
        document.getElementById('mat-panel-label').textContent = `${trVal(roomInfo.ad)} · ${d.floor}`;
    } else {
        document.getElementById('mat-panel-label').textContent = d.floorMat;
    }
}

document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => applyLanguage(btn.dataset.lang));
});

function getGroupWorldCenter(meshes) {
    const box = new THREE.Box3();
    meshes.forEach(m => box.expandByObject(m));
    const center = new THREE.Vector3();
    box.getCenter(center);
    center.y = box.max.y;
    return center;
}

function setMeshEmissive(mesh, hexColor) {
    if (!mesh?.material) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach(m => { if (m?.emissive) m.emissive.setHex(hexColor); });
}

function selectMeshesAndShowInfo(meshes, matchedKey, clickedPoint) {
    if (isFPSMode) return;
    activeSelectedMeshes = meshes;
    activeMatchedKey = matchedKey;

    walkableMeshes.forEach(m => setMeshEmissive(m, meshes.includes(m) ? 0x122b22 : 0x000000));

    const firstMesh = meshes[0];
    const mat = Array.isArray(firstMesh.material) ? firstMesh.material[0] : firstMesh.material;
    const matName = mat?.name || firstMesh.name;
    const roomInfo = ODA_VERILERI[matchedKey];
    const d = I18N[currentLang];

    document.getElementById('mat-panel-label').textContent = roomInfo
        ? `${trVal(roomInfo.ad)} · ${d.floor}`
        : `${d.surface}: ${matName}`;
    matPanel.classList.add('active');

    document.querySelectorAll('.room-btn').forEach(b => b.classList.toggle('active', b.dataset.key === matchedKey));

    if (roomInfo) {
        calloutWrapper.querySelector('#co-title').textContent = trVal(roomInfo.ad);
        calloutWrapper.querySelector('#co-area').textContent = roomInfo.metrekare;
        calloutWrapper.querySelector('#co-dim').textContent = roomInfo.uzunluklar || '-';
        calloutWrapper.querySelector('#co-height').textContent = roomInfo.yukseklik || '-';
        calloutWrapper.querySelector('#co-floor').textContent = trVal(roomInfo.zemin) || '-';
        calloutWrapper.querySelector('#co-note').textContent = trVal(roomInfo.not) || '';

        const pinPosition = clickedPoint ? clickedPoint.clone() : getGroupWorldCenter(meshes);
        calloutObject.position.copy(pinPosition);
        calloutObject.visible = true;
        calloutBox.classList.add('visible');

        gsap.to(orbitControls.target, { x: pinPosition.x, y: pinPosition.y, z: pinPosition.z, duration: 0.8 });
    } else {
        calloutBox.classList.remove('visible');
        calloutObject.visible = false;
    }
}

function closeSelection() {
    calloutBox.classList.remove('visible');
    calloutObject.visible = false;
    matPanel.classList.remove('active');
    document.querySelectorAll('.room-btn').forEach(b => b.classList.remove('active'));
    walkableMeshes.forEach(m => setMeshEmissive(m, 0x000000));
    activeSelectedMeshes = [];
    activeMatchedKey = null;
}

calloutWrapper.querySelector('#co-close').addEventListener('click', closeSelection);
calloutWrapper.querySelector('#co-fps-btn').addEventListener('click', () => {
    if (activeSelectedMeshes.length > 0) enterFPSMode(calloutObject.position.clone());
});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downPos = { x: 0, y: 0 };

container.addEventListener('pointerdown', (e) => { downPos = { x: e.clientX, y: e.clientY }; });
container.addEventListener('pointerup', (e) => {
    if (isDraggingPegman) return;
    if (Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 6) return;

    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const hits = raycaster.intersectObjects(walkableMeshes, true);
    if (hits.length > 0) {
        const hit = hits[0];
        const hitObj = hit.object;

        if (hitObj.userData.doorName) {
            toggleDoor(hitObj.userData.doorName);
            return;
        }

        if (isFPSMode) return;

        const mat = Array.isArray(hitObj.material) ? hitObj.material[0] : hitObj.material;
        let matName = mat?.name || '';
        const objName = hitObj.name || '';
        if (matName === 'Grpund.014') matName = 'Ground.014';

        debugToast.textContent = `${I18N[currentLang].selected}: ${matName || objName}`;

        const matchedKey = ODA_VERILERI[matName] ? matName : (ODA_VERILERI[objName] ? objName : matName);
        const targetMeshes = roomMeshGroups[matchedKey] || [hitObj];
        selectMeshesAndShowInfo(targetMeshes, matchedKey, hit.point);
    }
});

const targetRing = new THREE.Mesh(
    new THREE.RingGeometry(0.25, 0.38, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide })
);
targetRing.visible = false;
scene.add(targetRing);

const pegmanBtn = document.getElementById('pegman-btn');
const dragGhost = document.getElementById('drag-ghost');
const leftSidebar = document.getElementById('left-sidebar');
const bottomDock = document.getElementById('bottom-dock');
const fpsHeader = document.getElementById('fps-header');
const joystickZone = document.getElementById('joystick-zone');
const joystickKnob = document.getElementById('joystick-knob');

const heightSlider = document.getElementById('height-slider');
const heightValText = document.getElementById('height-val');
const fovSlider = document.getElementById('fov-slider');
const fovValText = document.getElementById('fov-val');

let isDraggingPegman = false;
let validDropPoint = null;
let isFPSMode = false;
const savedOrbit = { pos: new THREE.Vector3(), target: new THREE.Vector3() };
let currentFloorY = 0;

heightSlider.max = MAX_EYE_HEIGHT;
heightSlider.value = currentEyeHeight;
heightValText.textContent = currentEyeHeight.toFixed(2);
heightSlider.addEventListener('input', (e) => {
    currentEyeHeight = THREE.MathUtils.clamp(parseFloat(e.target.value), 0.3, MAX_EYE_HEIGHT);
    heightValText.textContent = currentEyeHeight.toFixed(2);
    if (isFPSMode) camera.position.y = currentFloorY + currentEyeHeight;
});

fovSlider.value = currentFpsFov;
fovValText.textContent = `${currentFpsFov}°`;
fovSlider.addEventListener('input', (e) => {
    currentFpsFov = parseFloat(e.target.value);
    fovValText.textContent = `${currentFpsFov}°`;
    if (isFPSMode) {
        camera.fov = currentFpsFov;
        camera.updateProjectionMatrix();
    }
});

applyLanguage(currentLang);

function setCeilingVisibility(visible) {
    ceilingMeshes.forEach(m => {
        m.visible = visible;
        if (visible) {
            let p = m.parent;
            while (p) { p.visible = true; p = p.parent; }
        }
    });
}

pegmanBtn.addEventListener('pointerdown', (e) => {
    if (isFPSMode) return;
    e.preventDefault();
    isDraggingPegman = true;
    orbitControls.enabled = false;
    dragGhost.style.display = 'block';
    dragGhost.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
});

window.addEventListener('pointermove', (e) => {
    if (!isDraggingPegman) return;
    dragGhost.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;

    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const hits = raycaster.intersectObjects(walkableMeshes, true);
    validDropPoint = null;
    if (hits.length > 0) {
        const hit = hits[0];
        const worldNormal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
        if (worldNormal.y > 0.75 && !hit.object.userData.doorName) {
            validDropPoint = hit.point.clone();
            targetRing.position.copy(validDropPoint);
            targetRing.position.y += 0.03;
            targetRing.visible = true;
            dragGhost.classList.add('valid');
            return;
        }
    }
    targetRing.visible = false;
    dragGhost.classList.remove('valid');
});

window.addEventListener('pointerup', () => {
    if (!isDraggingPegman) return;
    isDraggingPegman = false;
    dragGhost.style.display = 'none';
    targetRing.visible = false;
    if (validDropPoint) enterFPSMode(validDropPoint);
    else orbitControls.enabled = true;
});

let cameraYaw = 0, cameraPitch = 0;

function enterFPSMode(dropPoint) {
    savedOrbit.pos.copy(camera.position);
    savedOrbit.target.copy(orbitControls.target);
    orbitControls.enabled = false;

    closeSelection();
    settingsBtn.classList.remove('active');
    settingsDrawer.classList.remove('open');
    leftSidebar.classList.add('hidden');
    bottomDock.classList.add('hidden');
    fpsHeader.classList.add('active');
    joystickZone.style.display = 'block';

    setCeilingVisibility(true);
    currentFloorY = dropPoint.y;
    currentEyeHeight = THREE.MathUtils.clamp(currentEyeHeight, 0.3, MAX_EYE_HEIGHT);

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    cameraYaw = Math.atan2(-forward.x, -forward.z);
    cameraPitch = 0;

    camera.up.set(0, 1, 0);
    camera.rotation.order = 'YXZ';

    gsap.to(camera, {
        fov: currentFpsFov,
        duration: 1.0,
        onUpdate: () => camera.updateProjectionMatrix()
    });

    gsap.to(camera.position, {
        x: dropPoint.x,
        y: currentFloorY + currentEyeHeight,
        z: dropPoint.z,
        duration: 1.0,
        ease: 'power3.inOut'
    });

    gsap.to(camera.rotation, {
        x: 0, y: cameraYaw, z: 0,
        duration: 1.0, ease: 'power3.inOut',
        onComplete: () => {
            camera.rotation.set(0, cameraYaw, 0, 'YXZ');
            isFPSMode = true;
        }
    });
}

function exitFPSMode() {
    if (!isFPSMode) return;
    isFPSMode = false;
    fpsHeader.classList.remove('active');
    bottomDock.classList.remove('hidden');
    leftSidebar.classList.remove('hidden');
    joystickZone.style.display = 'none';

    setCeilingVisibility(false);

    gsap.to(camera, {
        fov: ORBIT_FOV,
        duration: 1.0,
        onUpdate: () => camera.updateProjectionMatrix()
    });

    gsap.to(camera.position, {
        x: savedOrbit.pos.x, y: savedOrbit.pos.y, z: savedOrbit.pos.z,
        duration: 1.1, ease: 'power3.inOut',
        onUpdate: () => camera.lookAt(savedOrbit.target),
        onComplete: () => {
            orbitControls.target.copy(savedOrbit.target);
            orbitControls.enabled = true;
        }
    });
}

document.getElementById('exit-fps-btn').addEventListener('click', exitFPSMode);
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isFPSMode) exitFPSMode(); });

const moveKeys = { forward: false, backward: false, left: false, right: false, up: false, down: false };
const joystickVec = new THREE.Vector2();

window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyW' || e.code === 'ArrowUp') moveKeys.forward = true;
    if (e.code === 'KeyS' || e.code === 'ArrowDown') moveKeys.backward = true;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') moveKeys.left = true;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') moveKeys.right = true;
    if (e.code === 'KeyE') moveKeys.up = true;
    if (e.code === 'KeyQ') moveKeys.down = true;
});
window.addEventListener('keyup', (e) => {
    if (e.code === 'KeyW' || e.code === 'ArrowUp') moveKeys.forward = false;
    if (e.code === 'KeyS' || e.code === 'ArrowDown') moveKeys.backward = false;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') moveKeys.left = false;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') moveKeys.right = false;
    if (e.code === 'KeyE') moveKeys.up = false;
    if (e.code === 'KeyQ') moveKeys.down = false;
});

let lookId = null, px = 0, py = 0;
container.addEventListener('pointerdown', (e) => {
    if (isFPSMode && lookId === null) { lookId = e.pointerId; px = e.clientX; py = e.clientY; }
});
window.addEventListener('pointermove', (e) => {
    if (!isFPSMode || e.pointerId !== lookId) return;
    cameraYaw -= (e.clientX - px) * 0.0035;
    cameraPitch = THREE.MathUtils.clamp(cameraPitch - (e.clientY - py) * 0.0035, -1.3, 1.3);
    px = e.clientX; py = e.clientY;
    camera.rotation.set(cameraPitch, cameraYaw, 0, 'YXZ');
});
window.addEventListener('pointerup', (e) => { if (e.pointerId === lookId) lookId = null; });

let joyId = null;
joystickZone.addEventListener('pointerdown', (e) => { e.stopPropagation(); joyId = e.pointerId; });
window.addEventListener('pointermove', (e) => {
    if (e.pointerId !== joyId) return;
    const r = joystickZone.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const dist = Math.hypot(dx, dy);
    if (dist > 40) { dx = (dx / dist) * 40; dy = (dy / dist) * 40; }
    joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    joystickVec.set(dx / 40, -dy / 40);
});
window.addEventListener('pointerup', (e) => {
    if (e.pointerId === joyId) { joyId = null; joystickVec.set(0, 0); joystickKnob.style.transform = `translate(0,0)`; }
});

const colRay = new THREE.Raycaster();
const COLLISION_DIST = 0.38;
colRay.far = COLLISION_DIST + 0.1;

function canMoveInDirection(origin, dirVec) {
    if (wallMeshes.length === 0) return true;
    colRay.set(origin, dirVec);
    const hits = colRay.intersectObjects(wallMeshes, false);
    for (let i = 0; i < hits.length; i++) {
        const hit = hits[i];
        if (hit.distance > COLLISION_DIST) continue;
        const dName = hit.object.userData.doorName;
        if (dName && doorsMap[dName]?.isOpen) continue;
        return false;
    }
    return true;
}

const clock = new THREE.Clock();
let frameCount = 0;
let fpsAccumTime = 0;

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);

    frameCount++;
    fpsAccumTime += delta;
    if (fpsAccumTime >= 0.5) {
        fpsBadge.textContent = `${Math.round(frameCount / fpsAccumTime)} FPS`;
        frameCount = 0;
        fpsAccumTime = 0;
    }

    if (!isFPSMode && orbitControls.enabled) orbitControls.update();

    if (isFPSMode) {
        if (moveKeys.up || moveKeys.down) {
            const hDelta = (Number(moveKeys.up) - Number(moveKeys.down)) * 2.0 * delta;
            currentEyeHeight = THREE.MathUtils.clamp(currentEyeHeight + hDelta, 0.3, MAX_EYE_HEIGHT);
            heightSlider.value = currentEyeHeight;
            heightValText.textContent = currentEyeHeight.toFixed(2);
        }

        camera.position.y = currentFloorY + currentEyeHeight;

        const fwd = (Number(moveKeys.forward) - Number(moveKeys.backward)) + joystickVec.y;
        const rgt = (Number(moveKeys.right) - Number(moveKeys.left)) + joystickVec.x;

        if (Math.abs(fwd) > 0.01 || Math.abs(rgt) > 0.01) {
            const fVec = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);
            const rVec = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);
            const move = new THREE.Vector3().addScaledVector(fVec, fwd).addScaledVector(rVec, rgt);
            if (move.length() > 1) move.normalize();

            const step = 4.0 * delta;
            const rayOrigin = new THREE.Vector3(camera.position.x, currentFloorY + (currentEyeHeight * 0.45), camera.position.z);

            if (canMoveInDirection(rayOrigin, move.clone().normalize())) {
                camera.position.addScaledVector(move, step);
            } else {
                if (Math.abs(move.x) > 0.001 && canMoveInDirection(rayOrigin, new THREE.Vector3(Math.sign(move.x), 0, 0))) {
                    camera.position.x += move.x * step;
                }
                if (Math.abs(move.z) > 0.001 && canMoveInDirection(rayOrigin, new THREE.Vector3(0, 0, Math.sign(move.z)))) {
                    camera.position.z += move.z * step;
                }
            }
        }
    }

    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
});