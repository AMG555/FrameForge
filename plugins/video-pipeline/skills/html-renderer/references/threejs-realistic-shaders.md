# Three.js Photorealistic Shaders & Cinematic Engine Reference

Production-tested Three.js WebGL shaders and render setups for programmatic, high-end 3D explainers, map animations, product showcases, and macro physics — drawn purely in code without AI image diffusion or hallucination.

---

## 1. Studio Lighting Rig & ACES Filmic Tone Mapping

Default WebGL looks flat and computer-generated. Adding ACES Filmic tone mapping and a calibrated 3-point soft light stage immediately produces the filmic, photorealistic look seen in high-end Instagram/YouTube explainers.

```javascript
// Renderer setup
const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('stage'),
  antialias: true,
  preserveDrawingBuffer: true,
  powerPreference: 'high-performance',
});
renderer.setSize(1920, 1080);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// ACES Filmic Tone Mapping — eliminates blown-out highlights, preserves rich mid-tones
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputEncoding = THREE.sRGBEncoding;

// Soft contact shadows
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// 3-Point Studio Lighting
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0c10);
scene.fog = new THREE.FogExp2(0x0a0c10, 0.015);

// 1. Key Light: Warm golden sun / studio softbox
const keyLight = new THREE.DirectionalLight(0xfff4e0, 2.4);
keyLight.position.set(15, 25, 12);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = 2048;
keyLight.shadow.mapSize.height = 2048;
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 80;
keyLight.shadow.bias = -0.0005;
scene.add(keyLight);

// 2. Fill Light: Cool skylight / ambient bounce (prevents pitch black shadows)
const hemiLight = new THREE.HemisphereLight(0x6080a0, 0x141820, 0.85);
scene.add(hemiLight);

// 3. Rim / Kicker Light: Edge highlight on ridges and silhouettes
const rimLight = new THREE.DirectionalLight(0x80b0ff, 1.2);
rimLight.position.set(-18, 12, -15);
scene.add(rimLight);
```

---

## 2. Procedural Ocean Water Shader (Gerstner Waves & Coastline Foam)

Generates animated, realistic ocean waves with sun glints, Fresnel edge transparency, and shoreline foam — driven purely by $t$.

```glsl
// Ocean Vertex Shader
uniform float uTime;
varying vec3 vWorldPosition;
varying vec3 vNormal;
varying float vWaveHeight;

// Gerstner Wave function
vec3 gerstnerWave(vec4 wave, vec3 p, inout vec3 tangent, inout vec3 binormal) {
  float steepness = wave.z;
  float wavelength = wave.w;
  float k = 2.0 * 3.14159265 / wavelength;
  float c = sqrt(9.8 / k);
  vec2 d = normalize(wave.xy);
  float f = k * (dot(d, p.xz) - c * uTime * 0.4);
  float a = steepness / k;

  tangent += vec3(-d.x * d.x * (steepness * sin(f)), d.x * (steepness * cos(f)), -d.x * d.y * (steepness * sin(f)));
  binormal += vec3(-d.x * d.y * (steepness * sin(f)), d.y * (steepness * cos(f)), -d.y * d.y * (steepness * sin(f)));

  return vec3(d.x * (a * cos(f)), a * sin(f), d.y * (a * cos(f)));
}

void main() {
  vec3 p = position;
  vec3 tangent = vec3(1.0, 0.0, 0.0);
  vec3 binormal = vec3(0.0, 0.0, 1.0);

  // Combine 3 distinct directional waves
  vec3 w1 = gerstnerWave(vec4(1.0, 0.3, 0.15, 8.0), p, tangent, binormal);
  vec3 w2 = gerstnerWave(vec4(0.4, 0.9, 0.10, 4.5), p, tangent, binormal);
  vec3 w3 = gerstnerWave(vec4(-0.5, 0.5, 0.05, 2.0), p, tangent, binormal);

  vec3 displaced = p + w1 + w2 + w3;
  vWaveHeight = displaced.y;
  vNormal = normalize(cross(binormal, tangent));
  vWorldPosition = (modelMatrix * vec4(displaced, 1.0)).xyz;
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorldPosition, 1.0);
}
```

```glsl
// Ocean Fragment Shader
uniform vec3 uSunPosition;
uniform vec3 uCameraPosition;
varying vec3 vWorldPosition;
varying vec3 vNormal;
varying float vWaveHeight;

void main() {
  vec3 viewDir = normalize(uCameraPosition - vWorldPosition);
  vec3 sunDir = normalize(uSunPosition - vWorldPosition);
  vec3 normal = normalize(vNormal);

  // Fresnel term — water looks reflective at grazing angles
  float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.5);

  // Ocean color gradient: Deep navy to turquoise shallows
  vec3 deepColor = vec3(0.02, 0.08, 0.22);
  vec3 shallowColor = vec3(0.05, 0.35, 0.45);
  vec3 waterColor = mix(deepColor, shallowColor, smoothstep(-0.5, 0.4, vWaveHeight));

  // Sun specular highlight
  vec3 halfVec = normalize(sunDir + viewDir);
  float spec = pow(max(dot(normal, halfVec), 0.0), 128.0) * 2.5;

  // Wave crest foam
  float foam = smoothstep(0.28, 0.45, vWaveHeight);
  vec3 finalColor = mix(waterColor, vec3(0.95, 0.98, 1.0), foam * 0.7);
  finalColor += vec3(1.0, 0.92, 0.75) * spec;
  finalColor = mix(finalColor, vec3(0.3, 0.6, 0.8), fresnel * 0.6);

  gl_FragColor = vec4(finalColor, 0.92);
}
```

---

## 3. Topographic Elevation & Hypsometric Tinting Shader

GeneratesVox/Johnny Harris style 3D maps where elevation automatically determines color (deep ocean -> sandy coast -> fertile plains -> craggy rock -> snow-capped peaks).

```glsl
// Hypsometric Terrain Fragment Shader
varying float vElevation;
varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  // Height bands (meters normalized -0.2 to 2.0)
  vec3 deepSea    = vec3(0.05, 0.12, 0.28);
  vec3 coastSand  = vec3(0.88, 0.82, 0.65);
  vec3 lowland    = vec3(0.24, 0.46, 0.22);
  vec3 plateau    = vec3(0.55, 0.48, 0.35);
  vec3 alpineRock = vec3(0.42, 0.40, 0.38);
  vec3 snowPeak   = vec3(0.96, 0.97, 0.98);

  float h = vElevation;
  vec3 col = deepSea;
  if (h > 0.01) col = mix(coastSand, lowland, smoothstep(0.01, 0.15, h));
  if (h > 0.15) col = mix(lowland, plateau, smoothstep(0.15, 0.45, h));
  if (h > 0.45) col = mix(plateau, alpineRock, smoothstep(0.45, 0.85, h));
  if (h > 0.85) col = mix(alpineRock, snowPeak, smoothstep(0.85, 1.30, h));

  // Topographic elevation contour lines (every 0.1 units)
  float contour = mod(h * 10.0, 1.0);
  if (contour < 0.06 && h > 0.05) {
    col = mix(col, vec3(0.1, 0.1, 0.12), 0.45);
  }

  // Directional diffuse shading
  vec3 lightDir = normalize(vec3(0.5, 0.9, 0.4));
  float diff = max(dot(normalize(vNormal), lightDir), 0.15);

  gl_FragColor = vec4(col * diff, 1.0);
}
```

---

## 4. 3D Curved Flight Paths with Traveling Photon Pulses

Draws glowing curved trade routes or flight trajectories in 3D space with animated energy pulses.

```javascript
function createFlightArc(startVec3, endVec3, peakHeight = 4.0) {
  // Compute midpoint elevated in Y
  const mid = new THREE.Vector3().addVectors(startVec3, endVec3).multiplyScalar(0.5);
  mid.y += peakHeight;

  const curve = new THREE.QuadraticBezierCurve3(startVec3, mid, endVec3);
  const points = curve.getPoints(80);
  const geometry = new THREE.BufferGeometry().setFromPoints(points);

  // Base path (subtle glowing ribbon)
  const lineMat = new THREE.LineBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.35,
  });
  const line = new THREE.Line(geometry, lineMat);

  // Traveling photon pulse head
  const pulseGeo = new THREE.SphereGeometry(0.18, 16, 16);
  const pulseMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
  });
  const photon = new THREE.Mesh(pulseGeo, pulseMat);

  return {
    curve,
    mesh: line,
    photon,
    update: (progress) => {
      const u = Math.max(0, Math.min(1, progress));
      const pos = curve.getPointAt(u);
      photon.position.copy(pos);
    },
  };
}
```

---

## 5. World-to-Screen (`vector.project`) Projected Map Pins

Keeps 2D typographic badges, city labels, and statistics floating above 3D terrain coordinates without perspective warping or illegibility.

```javascript
function project3(camera, worldVector3, canvasWidth = 1920, canvasHeight = 1080) {
  const p = worldVector3.clone().project(camera);
  // Check if behind camera
  if (p.z > 1.0) return { x: -9999, y: -9999, visible: false };

  const x = (p.x * 0.5 + 0.5) * canvasWidth;
  const y = (-(p.y * 0.5) + 0.5) * canvasHeight;
  return { x, y, visible: true };
}

// Example usage in pure render(t):
const pinPos = new THREE.Vector3(3.2, 0.8, -4.5);
const screen = project3(camera, pinPos, W, H);
if (screen.visible) {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px "Space Grotesk", sans-serif';
  ctx.fillText('STRAIT OF HORMUZ', screen.x + 14, screen.y - 12);
  // Leader line to pin anchor
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(screen.x, screen.y);
  ctx.lineTo(screen.x + 10, screen.y - 10);
  ctx.stroke();
  ctx.restore();
}
```

---

## 6. PBR Studio Material & Softbox Light Setup (Product Showcases)

For photorealistic product advertisements (Apple/Sony hardware aesthetic):

```javascript
// High-end PBR Anodized Aluminum
const anodizedMetal = new THREE.MeshStandardMaterial({
  color: 0x22252a,
  metalness: 0.88,
  roughness: 0.22,
});

// Premium Frosted Glass (Physical Transmission)
const frostedGlass = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  transmission: 0.92,
  opacity: 1,
  transparent: true,
  roughness: 0.18,
  ior: 1.52,
  thickness: 0.8,
  clearcoat: 1.0,
  clearcoatRoughness: 0.05,
});

// Ground Shadow Plane (Catches soft contact AO)
const shadowPlaneGeo = new THREE.PlaneGeometry(50, 50);
const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.42 });
const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
shadowPlane.rotation.x = -Math.PI / 2;
shadowPlane.receiveShadow = true;
scene.add(shadowPlane);
```

---

## 7. Cinematic Camera Spline Controller

Low-altitude flyovers over terrain with natural banking and CatmullRom spline easing:

```javascript
const cameraSpline = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 14, 25),    // Establishing high shot
  new THREE.Vector3(8, 6, 12),     // Descending low-altitude banking
  new THREE.Vector3(-4, 3.5, 4),   // Close flyover over river / canyon
  new THREE.Vector3(0, 2.2, -6),   // Final hero approach
]);

function updateCamera(t, duration) {
  const u = Math.max(0, Math.min(1, t / duration));
  const pos = cameraSpline.getPointAt(u);
  const lookTarget = cameraSpline.getPointAt(Math.min(1, u + 0.06));
  lookTarget.y -= 0.5;

  camera.position.copy(pos);
  camera.lookAt(lookTarget);

  // Subtle natural roll during banking turns
  const tangent = cameraSpline.getTangentAt(u);
  camera.rotation.z = -tangent.x * 0.12;
}
```
