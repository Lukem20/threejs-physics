import {
    Scene,
    TextureLoader,
    CubeTextureLoader,
    Mesh,
    MeshStandardMaterial,
    SphereGeometry,
    PlaneGeometry,
    AmbientLight,
    DirectionalLight,
    PerspectiveCamera,
    WebGLRenderer,
    PCFSoftShadowMap,
    Clock,
    BoxGeometry
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';
import CANNON from 'cannon';

/**
 * ---------- Debug panel ----------
 */
const gui = new GUI();
const debugObject = {};

debugObject.createSphere = () => {
    createSphere(Math.random() * 0.5,
    { 
        x: (Math.random() -0.5) *3, 
        y: 3, 
        z: (Math.random() -0.5) *3 
    });
}

debugObject.createBox = () => {
    createBox(
        Math.random(),
        Math.random(), 
        Math.random(),
    { 
        x: (Math.random() -0.5) *3, 
        y: 3, 
        z: (Math.random() -0.5) *3 
    });
}

gui.add(debugObject, 'createSphere');
gui.add(debugObject, 'createBox');


/**
 * ---------- Base scene ----------
 */
const canvas = document.querySelector('canvas.webgl');
const scene = new Scene();

/**
 * ---------- Sounds ----------
 */
const hitSound = new Audio('/sounds/hit.mp3');

const playHitSound = (collision) => {
    const impactStrength = collision.contact.getImpactVelocityAlongNormal();

    if (impactStrength > 1.5) {
        hitSound.currentTime = 0;
        hitSound.play();
    }
}

/**
 * ---------- Textures ----------
 */
const textureLoader = new TextureLoader();
const cubeTextureLoader = new CubeTextureLoader();
const environmentMapTexture = cubeTextureLoader.load([
    '/textures/environmentMaps/0/px.png',
    '/textures/environmentMaps/0/nx.png',
    '/textures/environmentMaps/0/py.png',
    '/textures/environmentMaps/0/ny.png',
    '/textures/environmentMaps/0/pz.png',
    '/textures/environmentMaps/0/nz.png'
]);

/**
 * ---------- Floor ----------
 */
const floor = new Mesh(
    new PlaneGeometry(10, 10),
    new MeshStandardMaterial({
        color: '#777777',
        metalness: 0.3,
        roughness: 0.4,
        envMap: environmentMapTexture,
        envMapIntensity: 0.5
    })
);
floor.receiveShadow = true;
floor.rotation.x = - Math.PI * 0.5;

scene.add(floor);

/**
 * ---------- Lights ----------
 */
const ambientLight = new AmbientLight(0xffffff, 2.1);
const directionalLight = new DirectionalLight(0xffffff, 0.6);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(1024, 1024);
directionalLight.shadow.camera.far = 15;
directionalLight.shadow.camera.left = - 7;
directionalLight.shadow.camera.top = 7;
directionalLight.shadow.camera.right = 7;
directionalLight.shadow.camera.bottom = - 7;
directionalLight.position.set(5, 5, 5);

scene.add(ambientLight, directionalLight);

/**
 * ---------- Screen sizes ----------
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
};

window.addEventListener('resize', () => {
    // Update size values on screen resize
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera projection
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
});

/**
 * ---------- Physics ----------
 */
// Start with creating a "physics world" representation
const world = new CANNON.World();
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = true;
world.gravity.set(0, -9.82, 0);

// Create contact materials for objects with physics
const defaultMaterial = new CANNON.Material('default');
const defaultContactMaterial = new CANNON.ContactMaterial(
    defaultMaterial,
    defaultMaterial,
    {
        friction: 0.1,
        restitution: 0.7,
    }
);

world.addContactMaterial(defaultContactMaterial);
world.defaultContactMaterial = defaultContactMaterial;

// Floor contact physics
const floorShape = new CANNON.Plane();
const floorBody = new CANNON.Body();
floorBody.mass = 0;
floorBody.material = defaultMaterial;
floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI * 0.5);
floorBody.addShape(floorShape);

world.addBody(floorBody);

/**
 * ---------- Camera ----------
 */
const camera = new PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
camera.position.set(- 3, 3, 3);
scene.add(camera);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * ---------- Renderer ----------
 */
const renderer = new WebGLRenderer({
    canvas: canvas
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/**
 * ---------- Utils ----------
 */
const objectsToUpdate = [];

// Sphere
const sphereGeometry = new SphereGeometry(1, 20, 20);
const sphereMaterial = new MeshStandardMaterial({
    metalness: 0.3,
    roughness: 0.4,
    envMap: environmentMapTexture
});

const createSphere = (radius, position) => {
    // Three.js Sphere Mesh
    const mesh = new Mesh(
        sphereGeometry,
        sphereMaterial
    );
    mesh.scale.set(radius, radius, radius);
    mesh.castShadow = true;
    mesh.position.copy(position);
    scene.add(mesh);

    // Cannon.js Sphere body
    const shape = new CANNON.Sphere(radius);
    const body = new CANNON.Body({
        mass: 1,
        position: new CANNON.Vec3(0 ,3, 0),
        shape,
        material: defaultMaterial
    });

    body.position.copy(position);
    world.addBody(body);

    // Save object to update
    objectsToUpdate.push({
        mesh,
        body,
    });
}
createSphere(0.5, { x: 0, y: 3, z: 0 });

// Box
const boxGeometry = new BoxGeometry(1, 1, 1);
const boxMaterial = new MeshStandardMaterial({
    metalness: 0.3,
    roughness: 0.4,
    envMap: environmentMapTexture
});

const createBox = (width, height, depth, position) => {
    // Three.js Box Mesh
    const mesh = new Mesh(
        boxGeometry,
        boxMaterial
    );
    mesh.scale.set(width, height, depth);
    mesh.castShadow = true;
    mesh.position.copy(position);
    scene.add(mesh);

    // Cannon.js Box Body
    const shape = new CANNON.Box(new CANNON.Vec3(width * 0.5, height * 0.5, depth * 0.5));
    const body = new CANNON.Body({
        mass: 1,
        position: new CANNON.Vec3(0, 3, 0),
        shape,
        material: defaultMaterial
    });

    body.position.copy(position);
    body.addEventListener('collide', playHitSound);
    world.addBody(body);

    // Save object to update
    objectsToUpdate.push({
        mesh,
        body,
    });
}
createBox(1, 1, 1, { x: 1, y: 3, z: -2 });

/**
 * ---------- Animate ----------
 */
const clock = new Clock();
let oldElapsedTime  = 0;

const tick = () => {
    // get the time between last tick() call
    const elapsedTime = clock.getElapsedTime();
    const deltaTime = elapsedTime - oldElapsedTime;
    oldElapsedTime = elapsedTime;

    // Update physics world for 60fps
    world.step(1 / 60, deltaTime, 3)

    for(const object of objectsToUpdate) {
        object.mesh.position.copy(object.body.position);
        object.mesh.quaternion.copy(object.body.quaternion);

    }

    controls.update();
    renderer.render(scene, camera);

    // Call tick again on the next frame
    window.requestAnimationFrame(tick);
}

tick();