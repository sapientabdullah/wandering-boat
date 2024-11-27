import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";
import { EffectComposer } from "jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "jsm/postprocessing/UnrealBloomPass.js";
import { GLTFLoader } from "jsm/loaders/GLTFLoader.js";

function generatePlane() {
  planeMesh.geometry.dispose();
  planeMesh.geometry = new THREE.PlaneGeometry(
    innerWidth * 1.5,
    innerHeight,
    180,
    180
  );
  const { array } = planeMesh.geometry.attributes.position;
  let randomValues = [];
  for (let i = 0; i < array.length; i++) {
    if (i % 3 === 0) {
      const x = array[i];
      const y = array[i + 1];
      const z = array[i + 2];
      array[i] = x + (Math.random() - 0.5) * 3;
      array[i + 1] = y + (Math.random() - 0.5) * 3;
      array[i + 2] = z + (Math.random() - 0.5) * 3;
    }
    randomValues.push(Math.random() * Math.PI * 2);
  }

  planeMesh.geometry.attributes.position.randomValues = randomValues;

  planeMesh.geometry.attributes.position.originalPosition =
    planeMesh.geometry.attributes.position.array;

  const colors = [];
  for (let i = 0; i < planeMesh.geometry.attributes.position.count; i++) {
    const element = array[i];
    colors.push(0, 0.19, 0.4);
  }

  planeMesh.geometry.setAttribute(
    "color",
    new THREE.BufferAttribute(new Float32Array(colors), 3)
  );
}

const raycaster = new THREE.Raycaster();
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.005);
const camera = new THREE.PerspectiveCamera(
  75,
  innerWidth / innerHeight,
  0.1,
  1000
);
camera.position.z = 250;
camera.position.y = 100;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(devicePixelRatio);
document.body.appendChild(renderer.domElement);
renderer.shadowMap.enabled = true;

const orbitControls = new OrbitControls(camera, renderer.domElement);

const composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(innerWidth, innerHeight),
  1.5,
  0.4,
  0.85
);
composer.addPass(bloomPass);

const planeGeometry = new THREE.PlaneGeometry(
  innerWidth * 1.5,
  innerHeight,
  180,
  180
);

const planeMaterial = new THREE.MeshStandardMaterial({
  side: THREE.DoubleSide,
  flatShading: true,
  vertexColors: true,
  normalMap: new THREE.TextureLoader().load("Water Norm.jpg"),
  roughness: 0.3,
  metalness: 0.2,
});

const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
planeMesh.rotation.x += Math.PI / 2;
scene.add(planeMesh);
generatePlane();

const mouse = {
  x: undefined,
  y: undefined,
};

const starsTextureUrl = "background.jpg";
const cubeTextureLoader = new THREE.CubeTextureLoader();
scene.background = cubeTextureLoader.load([
  starsTextureUrl,
  starsTextureUrl,
  starsTextureUrl,
  starsTextureUrl,
  starsTextureUrl,
  starsTextureUrl,
]);

const moonGroup = new THREE.Group();
moonGroup.rotation.z = (-23.4 * Math.PI) / 180;
moonGroup.position.y = 180;
moonGroup.position.x = 400;
moonGroup.position.z = -200;
scene.add(moonGroup);

const geometry = new THREE.IcosahedronGeometry(100, 12);
const material = new THREE.MeshStandardMaterial({
  map: new THREE.TextureLoader().load("Moon Map 4K.jpg"),
});
const moon = new THREE.Mesh(geometry, material);
moonGroup.add(moon);

const bumpsMaterial = new THREE.MeshStandardMaterial({
  map: new THREE.TextureLoader().load("Earth Texture Map Moonbump 4K.jpg"),
  transparent: true,
  opacity: 0.5,
});

const bumps = new THREE.Mesh(geometry, bumpsMaterial);
moonGroup.add(bumps);

const boatLoader = new GLTFLoader();
let boat;
boatLoader.load("Boat/scene.gltf", (gltf) => {
  boat = gltf.scene;
  boat.scale.set(12, 12, 12);
  boat.position.set(0, 0, 0);
  boat.rotation.y = Math.PI / 1.5;
  scene.add(boat);
});

let frame = 0;

const light = new THREE.DirectionalLight(0xffffff, 3);
light.position.set(0, 0, 6);
scene.add(light);

const backLight = new THREE.DirectionalLight(0xffffff, 3);
backLight.position.set(0, 1, -2);

scene.add(backLight);

backLight.intensity = 3;
material.roughness = 0.5;
material.metalness = 1;

planeMesh.receiveShadow = true;
if (boat) boat.castShadow = true;
moon.castShadow = true;
moon.receiveShadow = true;

const glowPlaneGeometry = new THREE.PlaneGeometry(
  innerWidth * 3,
  innerHeight * 2
);
const glowShaderMaterial = new THREE.ShaderMaterial({
  uniforms: {
    color: { value: new THREE.Color(0x001f4d) },
    intensity: { value: 0.45 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 color;
    uniform float intensity;
    varying vec2 vUv;
    void main() {
      float glow = 1.0 - smoothstep(0.0, 1.0, vUv.y);
      gl_FragColor = vec4(color * glow * intensity, glow);
    }
  `,
  transparent: true,
  blending: THREE.AdditiveBlending,
});

const glowPlane = new THREE.Mesh(glowPlaneGeometry, glowShaderMaterial);
glowPlane.position.z = -500;
glowPlane.position.y = 50;
scene.add(glowPlane);

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  raycaster.setFromCamera(mouse, camera);
  frame += 0.01;
  const { array, originalPosition, randomValues } =
    planeMesh.geometry.attributes.position;
  for (let i = 0; i < array.length; i += 3) {
    array[i] = originalPosition[i] + Math.cos(frame + randomValues[i]) * 0.05;
    array[i + 1] =
      originalPosition[i + 1] + Math.sin(frame + randomValues[i + 1]) * 0.05;
  }

  planeMesh.geometry.attributes.position.needsUpdate = true;

  if (boat) {
    boat.position.y = Math.sin(frame) * 2;
    boat.rotation.z = Math.sin(frame) * 0.05;
    boat.rotation.x = Math.cos(frame) * 0.03;
  }

  const intersects = raycaster.intersectObject(planeMesh);

  if (intersects.length > 0) {
    const { color } = intersects[0].object.geometry.attributes;

    const face = intersects[0].face;

    color.needsUpdate = true;

    const initialColor = {
      r: 0,
      g: 0.19,
      b: 0.4,
    };
    const hoverColor = {
      r: 0.1,
      g: 0.5,
      b: 1,
    };
    gsap.to(hoverColor, {
      r: initialColor.r,
      g: initialColor.g,
      b: initialColor.b,
      onUpdate: () => {
        color.setXYZ(face.a, hoverColor.r, hoverColor.g, hoverColor.b);
        color.setXYZ(face.b, hoverColor.r, hoverColor.g, hoverColor.b);
        color.setXYZ(face.c, hoverColor.r, hoverColor.g, hoverColor.b);
      },
    });
  }
  composer.render();
}
animate();

addEventListener("mousemove", (event) => {
  mouse.x = (event.clientX / innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / innerHeight) * 2 + 1;
});

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
