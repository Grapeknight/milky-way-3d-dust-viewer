import * as THREE from "three";
import { TrackballControls } from "three/examples/jsm/controls/TrackballControls.js";

const VOLUME_VARIANTS = {
  "10pc": {
    label: "10 pc interactive model",
    metadataJson: "three_volume_metadata.json",
    dataJs: "three_volume_data_base64.js",
    payloadGlobal: "THREE_VOLUME_VIEWER_DATA",
  },
  "5pc": {
    label: "5 pc smoothed model",
    metadataJson: "three_volume_metadata_5pc_sigma1.json",
    dataJs: "three_volume_data_5pc_sigma1_gzip_base64.js",
    payloadGlobal: "THREE_VOLUME_VIEWER_DATA_5PC",
    highCost: true,
  },
};

function decodeBase64(data) {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

async function gunzipBytes(bytes) {
  if (!("DecompressionStream" in window)) {
    throw new Error("This browser cannot decompress the local 5 pc payload. Use a local HTTP server instead.");
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function loadFileModeData(modelKey) {
  const variant = VOLUME_VARIANTS[modelKey] || VOLUME_VARIANTS["10pc"];
  if (!window[variant.payloadGlobal]) {
    await loadScript(variant.dataJs);
  }
  const payload = window[variant.payloadGlobal];
  if (!payload || !payload.metadata || (!payload.volumeBase64 && !payload.volumeGzipBase64)) {
    throw new Error(`Local data payload is missing for ${variant.label}.`);
  }
  let volumeData;
  if (payload.volumeGzipBase64) {
    volumeData = await gunzipBytes(decodeBase64(payload.volumeGzipBase64));
  } else {
    volumeData = decodeBase64(payload.volumeBase64);
  }
  return {
    metadata: payload.metadata,
    volumeData,
    mode: "local bundled data",
  };
}

async function loadServerModeData(modelKey) {
  const variant = VOLUME_VARIANTS[modelKey] || VOLUME_VARIANTS["10pc"];
  const metadataResponse = await fetch(variant.metadataJson, { cache: "no-store" });
  if (!metadataResponse.ok) throw new Error(`Failed to load ${variant.metadataJson}`);
  const metadata = await metadataResponse.json();
  const binPath = metadata.volume?.bin || "dust_volume_u8_sxy1_sz1.bin";
  const volumeResponse = await fetch(binPath, { cache: "no-store" });
  if (!volumeResponse.ok) throw new Error(`Failed to load ${binPath}`);
  const volumeData = new Uint8Array(await volumeResponse.arrayBuffer());
  return { metadata, volumeData, mode: "external binary data" };
}

async function loadViewerData(modelKey = "10pc") {
  if (location.protocol === "file:") {
    return loadFileModeData(modelKey);
  }
  try {
    return await loadServerModeData(modelKey);
  } catch (error) {
    console.warn(error);
    return loadFileModeData(modelKey);
  }
}

function setStatus(message) {
  let status = document.getElementById("status");
  if (!status) {
    status = document.createElement("div");
    status.id = "status";
    status.className = "status";
    document.body.appendChild(status);
  }
  status.textContent = message;
  status.style.display = message ? "block" : "none";
}

function initControls(camera, renderer) {
  const controls = new TrackballControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.rotateSpeed = 3.2;
  controls.zoomSpeed = 1.1;
  controls.panSpeed = 0.75;
  controls.staticMoving = false;
  controls.dynamicDampingFactor = 0.12;
  controls.update();
  return controls;
}

function naturalIdSort(left, right) {
  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" });
}

function populateSelect(select, ids, allLabel, formatLabel = (id) => String(id)) {
  select.replaceChildren();
  const allOption = document.createElement("option");
  allOption.value = "__all__";
  allOption.textContent = allLabel;
  select.appendChild(allOption);
  for (const id of ids) {
    const option = document.createElement("option");
    option.value = String(id);
    option.textContent = formatLabel(id);
    select.appendChild(option);
  }
}

function isVisibleInTree(object) {
  let current = object;
  while (current) {
    if (!current.visible) return false;
    current = current.parent;
  }
  return true;
}

function buildScene(metadata, volumeData, dataMode) {
  let activeMetadata = metadata;
  let activeDataMode = dataMode;
  let activeModelKey = "10pc";
  const container = document.getElementById("app");
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07080a);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.01, 100);
  const defaultCameraPosition = new THREE.Vector3(0.05, -0.05, 8.2);
  const defaultTarget = new THREE.Vector3(0, 0, 0);
  camera.position.copy(defaultCameraPosition);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(1);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.domElement.style.touchAction = "none";
  container.appendChild(renderer.domElement);

  const controls = initControls(camera, renderer);

  function createVolumeTexture(currentMetadata, currentVolumeData) {
    const expectedBytes = currentMetadata.grid.nx * currentMetadata.grid.ny * currentMetadata.grid.nz;
    if (currentVolumeData.length !== expectedBytes) {
      throw new Error(`Volume byte length mismatch: got ${currentVolumeData.length}, expected ${expectedBytes}`);
    }

    const texture = new THREE.Data3DTexture(
      currentVolumeData,
      currentMetadata.grid.nx,
      currentMetadata.grid.ny,
      currentMetadata.grid.nz,
    );
    texture.format = THREE.RedFormat;
    texture.type = THREE.UnsignedByteType;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.wrapR = THREE.ClampToEdgeWrapping;
    texture.unpackAlignment = 1;
    texture.needsUpdate = true;
    return texture;
  }

  let volumeTexture = createVolumeTexture(activeMetadata, volumeData);

  const boxMin = new THREE.Vector3(activeMetadata.bounds.xMin, activeMetadata.bounds.yMin, activeMetadata.bounds.zMin);
  const boxMax = new THREE.Vector3(activeMetadata.bounds.xMax, activeMetadata.bounds.yMax, activeMetadata.bounds.zMax);
  const boxSize = new THREE.Vector3().subVectors(boxMax, boxMin);
  const boxCenter = new THREE.Vector3().addVectors(boxMin, boxMax).multiplyScalar(0.5);

  const volumeGeometry = new THREE.BoxGeometry(boxSize.x, boxSize.y, boxSize.z);
  volumeGeometry.translate(boxCenter.x, boxCenter.y, boxCenter.z);

  const material = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uData: { value: volumeTexture },
      uBoxMin: { value: boxMin },
      uBoxMax: { value: boxMax },
      uSteps: { value: activeMetadata.render.raySteps },
      uOpacityScale: { value: activeMetadata.render.opacityScale },
      uBrightness: { value: activeMetadata.render.brightness },
      uTexelSize: {
        value: new THREE.Vector3(
          1 / activeMetadata.grid.nx,
          1 / activeMetadata.grid.ny,
          1 / activeMetadata.grid.nz,
        ),
      },
    },
    vertexShader: `
      out vec3 vPosition;
      void main() {
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      precision highp sampler3D;

      in vec3 vPosition;
      uniform sampler3D uData;
      uniform vec3 uBoxMin;
      uniform vec3 uBoxMax;
      uniform int uSteps;
      uniform float uOpacityScale;
      uniform float uBrightness;
      uniform vec3 uTexelSize;
      out vec4 outColor;

      vec2 intersectBox(vec3 origin, vec3 direction) {
        vec3 invDirection = 1.0 / direction;
        vec3 t0 = (uBoxMin - origin) * invDirection;
        vec3 t1 = (uBoxMax - origin) * invDirection;
        vec3 tMin = min(t0, t1);
        vec3 tMax = max(t0, t1);
        float nearT = max(max(tMin.x, tMin.y), tMin.z);
        float farT = min(min(tMax.x, tMax.y), tMax.z);
        return vec2(nearT, farT);
      }

      float rand(vec2 seed) {
        return fract(sin(dot(seed, vec2(12.9898, 78.233))) * 43758.5453123);
      }

      float densityAt(vec3 texCoord) {
        vec3 clampedCoord = clamp(texCoord, vec3(0.0), vec3(1.0));
        return texture(uData, clampedCoord).r;
      }

      vec3 densityGradient(vec3 texCoord) {
        vec3 e = uTexelSize * 1.35;
        float dx = densityAt(texCoord + vec3(e.x, 0.0, 0.0)) - densityAt(texCoord - vec3(e.x, 0.0, 0.0));
        float dy = densityAt(texCoord + vec3(0.0, e.y, 0.0)) - densityAt(texCoord - vec3(0.0, e.y, 0.0));
        float dz = densityAt(texCoord + vec3(0.0, 0.0, e.z)) - densityAt(texCoord - vec3(0.0, 0.0, e.z));
        return vec3(dx, dy, dz);
      }

      float shadowAlongLight(vec3 texCoord, vec3 lightDirection, float stepLength) {
        float shadow = 0.0;
        vec3 shadowStep = lightDirection * stepLength * 0.45;
        vec3 sampleCoord = texCoord;
        for (int j = 0; j < 10; j += 1) {
          sampleCoord += shadowStep;
          if (any(lessThan(sampleCoord, vec3(0.0))) || any(greaterThan(sampleCoord, vec3(1.0)))) break;
          float density = densityAt(sampleCoord);
          shadow += pow(density, 1.15);
        }
        return exp(-shadow * 0.34);
      }

      vec3 acesToneMap(vec3 color) {
        return clamp(
          (color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14),
          0.0,
          1.0
        );
      }

      void main() {
        vec3 rayDirection = normalize(vPosition - cameraPosition);
        vec2 hit = intersectBox(cameraPosition, rayDirection);
        if (hit.x > hit.y) discard;

        float startT = max(hit.x, 0.0);
        float rayLength = hit.y - startT;
        if (rayLength <= 0.0) discard;

        int steps = clamp(uSteps, 8, 512);
        float delta = rayLength / float(steps);
        float jitter = rand(gl_FragCoord.xy);
        vec3 position = cameraPosition + rayDirection * (startT + jitter * delta);
        vec3 stepVector = rayDirection * delta;
        vec3 boxScale = uBoxMax - uBoxMin;
        vec4 accumulated = vec4(0.0);

        vec3 keyDirection = normalize(vec3(0.75, -0.45, 0.48));
        vec3 fillDirection = normalize(vec3(-0.55, 0.25, 0.65));
        vec3 rimDirection = normalize(vec3(-0.25, 0.82, -0.50));
        vec3 keyColor = vec3(1.00, 0.86, 0.62);
        vec3 fillColor = vec3(0.38, 0.54, 0.86);
        vec3 rimColor = vec3(0.50, 0.72, 1.00);
        vec3 ambientColor = vec3(0.22, 0.26, 0.34);

        for (int i = 0; i < 512; i += 1) {
          if (i >= steps) break;

          vec3 texCoord = (position - uBoxMin) / boxScale;
          float density = densityAt(texCoord);
          if (density > 0.003) {
            vec3 gradient = densityGradient(texCoord);
            float gradientMagnitude = length(gradient);
            vec3 normal = gradientMagnitude > 0.0008 ? normalize(-gradient) : -rayDirection;

            float shadow = shadowAlongLight(texCoord, keyDirection, delta / max(max(boxScale.x, boxScale.y), boxScale.z));
            float keyDiffuse = max(dot(normal, keyDirection), 0.0);
            float fillDiffuse = max(dot(normal, fillDirection), 0.0);
            float rim = pow(max(dot(normal, rimDirection), 0.0), 2.2);
            vec3 halfVector = normalize(keyDirection - rayDirection);
            float specular = pow(max(dot(normal, halfVector), 0.0), 80.0) * 0.20;

            vec3 lighting =
              ambientColor +
              keyColor * (0.68 * keyDiffuse + specular) * shadow +
              fillColor * 0.24 * fillDiffuse +
              rimColor * 0.22 * rim;

            float surfaceBoost = 1.0 + clamp(gradientMagnitude * 18.0, 0.0, 1.35);
            float shapedDensity = pow(density, 0.86) * surfaceBoost;
            float sampleAlpha = 1.0 - exp(-shapedDensity * uOpacityScale * delta);
            vec3 baseColor = mix(vec3(0.58, 0.64, 0.70), vec3(1.0), pow(density, 0.55));
            vec3 sampleColor = acesToneMap(baseColor * lighting * uBrightness * 1.35);
            accumulated.rgb += (1.0 - accumulated.a) * sampleAlpha * sampleColor;
            accumulated.a += (1.0 - accumulated.a) * sampleAlpha;
            if (accumulated.a > 0.97) break;
          }

          position += stepVector;
        }

        if (accumulated.a <= 0.002) discard;
        outColor = accumulated;
      }
    `,
  });

  const volumeMesh = new THREE.Mesh(volumeGeometry, material);
  scene.add(volumeMesh);

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(volumeGeometry),
    new THREE.LineBasicMaterial({ color: 0x48627f, transparent: true, opacity: 0.34 }),
  );
  scene.add(edges);

  const axes = new THREE.AxesHelper(1.0);
  axes.material.depthTest = false;
  axes.renderOrder = 2;
  scene.add(axes);

  const grid = new THREE.GridHelper(6, 12, 0x31506f, 0x223348);
  grid.rotation.x = Math.PI / 2;
  grid.material.opacity = 0.20;
  grid.material.transparent = true;
  scene.add(grid);

  const pickableObjects = [];

  const osbRoot = new THREE.Group();
  osbRoot.visible = false;
  scene.add(osbRoot);
  const osbObjects = [];
  for (const group of metadata.openSuperbubbles || []) {
    const colorKey = String(group.color || "").toLowerCase();
    for (const item of group.items || []) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(item.segments.flat(2), 3));
      const lineMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color(group.color),
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      });
      const lines = new THREE.LineSegments(geometry, lineMaterial);
      lines.renderOrder = 3;
      lines.userData.tooltip = `Open superbubble SB${item.id}`;
      lines.userData.kind = "openSuperbubble";
      lines.userData.id = String(item.id);
      lines.userData.color = colorKey;
      osbRoot.add(lines);
      osbObjects.push(lines);
      pickableObjects.push(lines);
    }
  }

  const rwRoot = new THREE.Group();
  rwRoot.visible = false;
  scene.add(rwRoot);
  const rwSlope = Math.tan(Math.PI / 3);
  const rwIntercept = 0.6;
  const rwXMin = Math.max(metadata.bounds.xMin, (metadata.bounds.yMin - rwIntercept) / rwSlope);
  const rwXMax = Math.min(metadata.bounds.xMax, (metadata.bounds.yMax - rwIntercept) / rwSlope);
  const rwYMin = rwSlope * rwXMin + rwIntercept;
  const rwYMax = rwSlope * rwXMax + rwIntercept;
  const rwGeometry = new THREE.BufferGeometry();
  rwGeometry.setAttribute("position", new THREE.Float32BufferAttribute([
    rwXMin, rwYMin, metadata.bounds.zMin,
    rwXMax, rwYMax, metadata.bounds.zMin,
    rwXMax, rwYMax, metadata.bounds.zMax,
    rwXMin, rwYMin, metadata.bounds.zMax,
  ], 3));
  rwGeometry.setIndex([0, 1, 2, 0, 2, 3]);
  rwGeometry.computeVertexNormals();
  const rwMaterial = new THREE.MeshBasicMaterial({
    color: 0xffb000,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const rwPlane = new THREE.Mesh(rwGeometry, rwMaterial);
  rwPlane.renderOrder = 2;
  rwRoot.add(rwPlane);
  const rwEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(rwGeometry),
    new THREE.LineBasicMaterial({ color: 0xffc857, transparent: true, opacity: 0.85, depthWrite: false }),
  );
  rwRoot.add(rwEdges);

  const bubblesRoot = new THREE.Group();
  bubblesRoot.visible = false;
  scene.add(bubblesRoot);
  const bubbleGeometry = new THREE.SphereGeometry(1, 20, 10);
  const bubbleMaterial = new THREE.MeshBasicMaterial({
    color: 0xf6c343,
    transparent: true,
    opacity: 0.55,
    wireframe: true,
    depthWrite: false,
  });
  const bubbles = metadata.bubbles || [];
  const bubbleObjects = [];
  bubbles.forEach((bubble) => {
    const radius = Math.max(0.001, bubble.radius_kpc);
    const bubbleMesh = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
    bubbleMesh.position.set(bubble.x, bubble.y, bubble.z);
    bubbleMesh.scale.set(radius, radius, radius);
    bubbleMesh.userData.tooltip = `Bubble ${bubble.id}  Grade ${bubble.grade}`;
    bubbleMesh.userData.kind = "bubble";
    bubbleMesh.userData.id = String(bubble.id);
    bubbleMesh.userData.grade = String(bubble.grade).toUpperCase();
    bubbleMesh.userData.l = bubble.l;
    bubbleMesh.userData.b = bubble.b;
    bubbleMesh.userData.dDeg = bubble.D_deg;
    bubbleMesh.userData.bestDistanceKpc = bubble.best_distance_kpc;
    bubbleMesh.frustumCulled = false;
    bubblesRoot.add(bubbleMesh);
    bubbleObjects.push(bubbleMesh);
    pickableObjects.push(bubbleMesh);
  });

  const openSuperbubbleCount = (metadata.openSuperbubbles || [])
    .reduce((sum, group) => sum + (group.items || []).length, 0);

  const osbIdFilter = document.getElementById("osbIdFilter");
  const bubbleIdFilter = document.getElementById("bubbleIdFilter");
  const osbColorInputs = Array.from(document.querySelectorAll("[data-osb-color]"));
  const bubbleGradeInputs = Array.from(document.querySelectorAll("[data-bubble-grade]"));
  const osbToggle = document.getElementById("osbToggle");
  const bubblesToggle = document.getElementById("bubblesToggle");
  const bubbleInfo = document.getElementById("bubbleInfo");
  const bubbleById = new Map(bubbleObjects.map((object) => [object.userData.id, object.userData]));

  populateSelect(
    osbIdFilter,
    Array.from(new Set(osbObjects.map((object) => object.userData.id))).sort(naturalIdSort),
    "All open superbubbles",
    (id) => `SB${id}`,
  );
  populateSelect(
    bubbleIdFilter,
    Array.from(new Set(bubbleObjects.map((object) => object.userData.id))).sort(naturalIdSort),
    "All bubbles",
  );
  const tooltip = document.getElementById("tooltip");

  function formatScalar(value, digits = 2) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toFixed(digits).replace(/\.?0+$/, "") : "n/a";
  }

  function updateBubbleInfo() {
    if (!bubbleInfo) return;
    const selectedId = bubbleIdFilter.value;
    if (selectedId === "__all__") {
      bubbleInfo.textContent = "Select one bubble to show center l, b, angular diameter D, and best distance.";
      return;
    }
    const bubble = bubbleById.get(selectedId);
    if (!bubble) {
      bubbleInfo.textContent = "Selected bubble metadata is unavailable.";
      return;
    }
    bubbleInfo.textContent =
      `Bubble ${bubble.id} (Grade ${bubble.grade}) | ` +
      `center: l=${formatScalar(bubble.l, 2)} deg, b=${formatScalar(bubble.b, 2)} deg | ` +
      `D=${formatScalar(bubble.dDeg, 2)} deg | ` +
      `best distance=${formatScalar(bubble.bestDistanceKpc, 3)} kpc`;
  }

  function selectedValues(inputs, attribute) {
    return new Set(
      inputs
        .filter((input) => input.checked)
        .map((input) => String(input.dataset[attribute]).toLowerCase()),
    );
  }

  function hasCheckedInput(inputs) {
    return inputs.some((input) => input.checked);
  }

  function osbFilterActive() {
    return osbIdFilter.value !== "__all__" || hasCheckedInput(osbColorInputs);
  }

  function bubbleFilterActive() {
    return bubbleIdFilter.value !== "__all__" || hasCheckedInput(bubbleGradeInputs);
  }

  function syncRootVisibility() {
    osbRoot.visible = osbFilterActive();
    osbToggle.classList.toggle("is-off", !osbRoot.visible);
    bubblesRoot.visible = bubbleFilterActive();
    bubblesToggle.classList.toggle("is-off", !bubblesRoot.visible);
  }

  function applyOsbFilters() {
    const selectedId = osbIdFilter.value;
    if (selectedId !== "__all__") {
      for (const object of osbObjects) object.visible = object.userData.id === selectedId;
      return;
    }
    const selectedColors = selectedValues(osbColorInputs, "osbColor");
    for (const object of osbObjects) {
      const colorMatches = selectedColors.has(String(object.userData.color).toLowerCase());
      object.visible = colorMatches;
    }
  }

  function applyBubbleFilters() {
    const selectedId = bubbleIdFilter.value;
    if (selectedId !== "__all__") {
      for (const object of bubbleObjects) object.visible = object.userData.id === selectedId;
      return;
    }
    const selectedGrades = selectedValues(bubbleGradeInputs, "bubbleGrade");
    for (const object of bubbleObjects) {
      const gradeMatches = selectedGrades.has(String(object.userData.grade).toLowerCase());
      object.visible = gradeMatches;
    }
  }

  function visibleCount(objects) {
    return objects.reduce((sum, object) => sum + (object.visible ? 1 : 0), 0);
  }

  function updateHud() {
    document.getElementById("hud").innerHTML =
      "Three.js ray marching<br>" +
      `${activeMetadata.grid.nx.toLocaleString()} x ` +
      `${activeMetadata.grid.ny.toLocaleString()} x ` +
      `${activeMetadata.grid.nz.toLocaleString()} volume texture<br>` +
      `${activeMetadata.grid.totalVoxels.toLocaleString()} sampled cells<br>` +
      `${activeMetadata.transfer.dustTransparentMax.toFixed(2)}-` +
      `${activeMetadata.transfer.dustMax.toFixed(2)} mag/kpc mapped to density<br>` +
      `${VOLUME_VARIANTS[activeModelKey].label}<br>` +
      `${visibleCount(osbObjects).toLocaleString()} / ${openSuperbubbleCount.toLocaleString()} Open superbubbles selected<br>` +
      `${visibleCount(bubbleObjects).toLocaleString()} / ${bubbles.length.toLocaleString()} Grade A/B bubbles selected<br>` +
      "Radcliffe Wave plane: y = tan(60 deg) x + 0.6 kpc<br>" +
      `Data mode: ${activeDataMode}`;
  }

  function applyFilters() {
    applyOsbFilters();
    applyBubbleFilters();
    syncRootVisibility();
    updateBubbleInfo();
    updateHud();
    hideTooltip();
  }

  function resetSelectForGroupFilter(select) {
    select.value = "__all__";
  }

  function clearGroupInputsForSingleFilter(inputs) {
    for (const input of inputs) input.checked = false;
  }

  function setInputGroup(inputs, checked) {
    for (const input of inputs) input.checked = checked;
  }

  for (const input of osbColorInputs) {
    input.addEventListener("change", () => {
      resetSelectForGroupFilter(osbIdFilter);
      applyFilters();
    });
  }
  for (const input of bubbleGradeInputs) {
    input.addEventListener("change", () => {
      resetSelectForGroupFilter(bubbleIdFilter);
      applyFilters();
    });
  }
  osbIdFilter.addEventListener("change", () => {
    if (osbIdFilter.value !== "__all__") clearGroupInputsForSingleFilter(osbColorInputs);
    applyFilters();
  });
  bubbleIdFilter.addEventListener("change", () => {
    if (bubbleIdFilter.value !== "__all__") clearGroupInputsForSingleFilter(bubbleGradeInputs);
    applyFilters();
  });
  updateBubbleInfo();
  applyFilters();

  const toolbar = document.querySelector(".toolbar");
  const controlsToggle = document.getElementById("controlsToggle");
  if (toolbar && controlsToggle) {
    function syncControlsToggle() {
      const collapsed = toolbar.classList.contains("is-collapsed");
      controlsToggle.textContent = collapsed ? "Show controls" : "Hide controls";
      controlsToggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
    }

    controlsToggle.addEventListener("click", () => {
      toolbar.classList.toggle("is-collapsed");
      syncControlsToggle();
    });
    syncControlsToggle();
  }

  const dustToggle = document.getElementById("dustToggle");
  dustToggle.addEventListener("click", () => {
    volumeMesh.visible = !volumeMesh.visible;
    dustToggle.classList.toggle("is-off", !volumeMesh.visible);
  });

  osbToggle.addEventListener("click", () => {
    const shouldEnable = !osbRoot.visible;
    resetSelectForGroupFilter(osbIdFilter);
    setInputGroup(osbColorInputs, shouldEnable);
    applyFilters();
  });

  bubblesToggle.addEventListener("click", () => {
    const shouldEnable = !bubblesRoot.visible;
    resetSelectForGroupFilter(bubbleIdFilter);
    setInputGroup(bubbleGradeInputs, shouldEnable);
    applyFilters();
  });

  const rwToggle = document.getElementById("rwToggle");
  rwToggle.addEventListener("click", () => {
    rwRoot.visible = !rwRoot.visible;
    rwToggle.classList.toggle("is-off", !rwRoot.visible);
  });

  document.getElementById("resetView").addEventListener("click", () => {
    camera.position.copy(defaultCameraPosition);
    camera.up.set(0, 1, 0);
    controls.target.copy(defaultTarget);
    controls.update();
  });

  const opacityInput = document.getElementById("opacityScale");
  const opacityOutput = document.getElementById("opacityValue");
  opacityInput.addEventListener("input", () => {
    const value = parseFloat(opacityInput.value);
    material.uniforms.uOpacityScale.value = value;
    opacityOutput.value = value.toFixed(2);
  });

  const modelButtons = Array.from(document.querySelectorAll("[data-dust-model]"));

  function syncModelButtons() {
    for (const button of modelButtons) {
      const isActive = button.dataset.dustModel === activeModelKey;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    }
  }

  function setModelButtonsDisabled(disabled) {
    for (const button of modelButtons) button.disabled = disabled;
  }

  async function setActiveVolume(modelKey) {
    if (modelKey === activeModelKey) return;
    const previousModelKey = activeModelKey;
    const variant = VOLUME_VARIANTS[modelKey] || VOLUME_VARIANTS["10pc"];
    setModelButtonsDisabled(true);
    setStatus(`Loading ${variant.label}...`);
    try {
      const nextData = await loadViewerData(modelKey);
      const nextTexture = createVolumeTexture(nextData.metadata, nextData.volumeData);
      const oldTexture = volumeTexture;
      volumeTexture = nextTexture;
      material.uniforms.uData.value = volumeTexture;
      material.uniforms.uTexelSize.value.set(
        1 / nextData.metadata.grid.nx,
        1 / nextData.metadata.grid.ny,
        1 / nextData.metadata.grid.nz,
      );
      material.uniforms.uSteps.value = nextData.metadata.render?.raySteps ?? 160;
      material.uniforms.uBrightness.value = nextData.metadata.render?.brightness ?? 1.45;
      const nextOpacity = nextData.metadata.render?.opacityScale ?? 4.0;
      material.uniforms.uOpacityScale.value = nextOpacity;
      opacityInput.value = String(nextOpacity);
      opacityOutput.value = nextOpacity.toFixed(2);
      oldTexture.dispose();
      activeMetadata = nextData.metadata;
      activeDataMode = nextData.mode;
      activeModelKey = modelKey;
      updateHud();
      syncModelButtons();
      setStatus("");
    } catch (error) {
      console.error(error);
      activeModelKey = previousModelKey;
      syncModelButtons();
      setStatus(`Failed to load ${variant.label}: ${error.message}`);
    } finally {
      setModelButtonsDisabled(false);
    }
  }

  if (modelButtons.length) {
    for (const button of modelButtons) {
      button.addEventListener("click", () => {
        setActiveVolume(button.dataset.dustModel);
      });
    }
    syncModelButtons();
  }

  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  raycaster.params.Line.threshold = 0.035;

  function hideTooltip() {
    tooltip.style.display = "none";
  }

  function showTooltip(event, text) {
    tooltip.textContent = text;
    tooltip.style.left = `${event.clientX + 12}px`;
    tooltip.style.top = `${event.clientY + 12}px`;
    tooltip.style.display = "block";
  }

  renderer.domElement.addEventListener("pointermove", (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const intersections = raycaster.intersectObjects(pickableObjects, false);
    for (const hit of intersections) {
      if (hit.object.userData.tooltip && isVisibleInTree(hit.object)) {
        showTooltip(event, hit.object.userData.tooltip);
        return;
      }
    }
    hideTooltip();
  });

  renderer.domElement.addEventListener("pointerleave", hideTooltip);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (typeof controls.handleResize === "function") controls.handleResize();
    controls.update();
  });

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
}

async function main() {
  try {
    setStatus("Loading volume data...");
    const { metadata, volumeData, mode } = await loadViewerData();
    setStatus("");
    buildScene(metadata, volumeData, mode);
  } catch (error) {
    console.error(error);
    setStatus(`Failed to load viewer data: ${error.message}`);
  }
}

main();
