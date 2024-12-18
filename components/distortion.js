import gsap from 'gsap'
import { CustomEase } from 'gsap/all'
import * as THREE from 'three'
import { resizeThreeCanvas, calcFov, lerp } from '../util/utils'

import baseVertex from '../shader/resources/baseVertex.glsl'
import baseFragment from '../shader/resources/baseFragment.glsl'
import effectVertex from '../shader/resources/effectVertex.glsl'
import effectFragment from '../shader/resources/effectFragment.glsl'

gsap.registerPlugin(CustomEase)

let mediaStore = []
let scene, camera, renderer, geometry, material
let observer
let sharedScrollState
let lastRenderTime = 0
let smoothVelocity = { value: 0 }
let velocityTween

// Constants for better performance
const SCROLL_VELOCITY_THRESHOLD = 0.001;
const UPDATE_INTERVAL = 1000 / 60; // 60fps cap
const CAMERA_POS = 500;
const GEOMETRY_SEGMENTS = 32; // Reduced from 100 for better performance
const VIEWPORT_BUFFER = 100;

// Reusable objects to avoid garbage collection
const tempVec2 = new THREE.Vector2();
const tempBounds = new DOMRect();

// Shared geometry and material for better memory usage
let sharedGeometry;
let templateMaterial;

// Add this helper function at the top of the file
const loadImage = (img) => {
  return new Promise((resolve) => {
    if (img.complete) {
      resolve(img);
    } else {
      img.onload = () => resolve(img);
    }
  });
};

// Optimize observer creation
const createObserver = () => {
  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const index = parseInt(entry.target.dataset.index);
      const item = mediaStore[index];
      if (item) {
        item.isInView = entry.isIntersecting;
      }
    });
  }, {
    rootMargin: `${VIEWPORT_BUFFER}px`,
    threshold: 0
  });
};

// Optimize setMediaStore
const setMediaStore = async (scrollY = window.scrollY) => {
  if (!observer) createObserver();
  
  const media = [...document.querySelectorAll('.project-item img')];
  if (!media.length) return;
  
  // Wait for all images to load
  await Promise.all(media.map(loadImage));
  
  // Clear existing mediaStore efficiently
  mediaStore.forEach(item => {
    if (item.mesh) {
      scene.remove(item.mesh);
      item.material.dispose();
      item.texture?.dispose();
    }
  });
  mediaStore = [];
  
  // Create shared resources if needed
  if (!sharedGeometry) {
    sharedGeometry = new THREE.PlaneGeometry(1, 1, GEOMETRY_SEGMENTS, GEOMETRY_SEGMENTS);
  }
  if (!templateMaterial) {
    templateMaterial = createTemplateMaterial();
  }
  
  // Process all media in a single batch
  const fragment = new DocumentFragment();
  media.forEach((originalMedia) => {
    originalMedia.getBoundingClientRect(tempBounds);
    const material = templateMaterial.clone();
    const mesh = new THREE.Mesh(sharedGeometry, material);
    
    const texture = new THREE.Texture(originalMedia);
    texture.needsUpdate = true;
    
    setupMaterial(material, texture, tempBounds);
    setupMesh(mesh, tempBounds);
    
    scene.add(mesh);
    
    const storeIndex = mediaStore.length;
    addToMediaStore(originalMedia, material, mesh, tempBounds, storeIndex);
  });
};

// Helper functions to break down the complexity
function createTemplateMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uResolution: { value: new THREE.Vector2() },
      uTime: { value: 0 },
      uScrollVelocity: { value: 0 },
      uTexture: { value: null },
      uTextureSize: { value: new THREE.Vector2() },
      uQuadSize: { value: new THREE.Vector2() },
      uBorderRadius: { value: 0 },
    },
    vertexShader: effectVertex,
    fragmentShader: effectFragment,
    glslVersion: THREE.GLSL3,
    transparent: true,
    depthTest: false,
    depthWrite: false
  });
}

function setupMaterial(material, texture, bounds) {
  material.uniforms.uTexture.value = texture;
  material.uniforms.uTextureSize.value.set(texture.image.naturalWidth, texture.image.naturalHeight);
  material.uniforms.uQuadSize.value.set(bounds.width, bounds.height);
  material.uniforms.uBorderRadius.value = parseFloat(getComputedStyle(texture.image).borderRadius);
}

function setupMesh(mesh, bounds) {
  mesh.scale.set(bounds.width, bounds.height, 1);
  mesh.renderOrder = 1;
}

// Simplify addToMediaStore function since we're not duplicating
function addToMediaStore(originalMedia, material, mesh, bounds, storeIndex) {
  mediaStore.push({
    media: originalMedia,
    material: material,
    mesh: mesh,
    width: bounds.width,
    height: bounds.height,
    top: bounds.top + window.scrollY,
    left: bounds.left,
    isInView: true,
  });

  observer.observe(originalMedia);
}

// Simplify setPositions to handle single instances
const setPositions = () => {
  const scrollY = sharedScrollState?.current || 0;

  mediaStore.forEach((object) => {
    if (object.isInView) {
      // Get updated bounds
      const bounds = object.media.getBoundingClientRect();
      
      // Update position based on current bounds
      object.mesh.position.x = bounds.left - window.innerWidth / 2 + bounds.width / 2;
      object.mesh.position.y = -bounds.top + window.innerHeight / 2 - bounds.height / 2;
      
      // Update scale in case of resize
      object.mesh.scale.set(bounds.width, bounds.height, 1);
    } else {
      // Move off screen if not in view
      object.mesh.position.y = 2 * window.innerHeight;
    }
  });
};

// Optimize render loop
const render = (time = 0) => {
  const deltaTime = time - lastRenderTime;
  
  if (deltaTime < UPDATE_INTERVAL) {
    requestAnimationFrame(render);
    return;
  }
  
  lastRenderTime = time;
  time /= 1000;
  
  const targetVelocity = sharedScrollState?.velocity || 0;
  
  if (Math.abs(targetVelocity - smoothVelocity.value) > SCROLL_VELOCITY_THRESHOLD) {
    if (velocityTween) velocityTween.kill();
    
    velocityTween = gsap.to(smoothVelocity, {
      value: targetVelocity,
      duration: 0.2,
      ease: "power2.out",
      overwrite: true
    });
  }
  
  // Update only visible items
  mediaStore.forEach((object) => {
    if (!object.isInView) return;
    
    object.material.uniforms.uTime.value = time;
    object.material.uniforms.uScrollVelocity.value = smoothVelocity.value;
  });
  
  setPositions();
  renderer.render(scene, camera);
  requestAnimationFrame(render);
};

// Optimize cleanup
export function cleanupDistortion() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  
  mediaStore.forEach(item => {
    scene.remove(item.mesh);
    item.material.dispose();
    item.texture?.dispose();
  });
  
  if (sharedGeometry) {
    sharedGeometry.dispose();
    sharedGeometry = null;
  }
  
  if (templateMaterial) {
    templateMaterial.dispose();
    templateMaterial = null;
  }
  
  if (renderer) {
    renderer.dispose();
    renderer.domElement.remove();
  }
  
  mediaStore = [];
  scene = null;
  camera = null;
  renderer = null;
}

// Modify initDistortion to handle async setMediaStore
export function initDistortion({ scrollState }) {
  // Store the scroll state at module level
  sharedScrollState = scrollState
  
  // Initialize Three.js setup
  const canvas = document.querySelector('#webgl')
  if (!canvas) return () => {}
  
  scene = new THREE.Scene()
  
  // Camera setup with adjusted position for better overlap
  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 1000)
  camera.position.z = CAMERA_POS
  camera.fov = calcFov(CAMERA_POS)
  camera.updateProjectionMatrix()

  // Renderer setup with transparent background
  renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    premultipliedAlpha: false
  })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0) // Transparent background

  // Initialize geometry and material
  geometry = new THREE.PlaneGeometry(1, 1, 100, 100)
  material = new THREE.ShaderMaterial({
    uniforms: {
      uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      uTime: { value: 0 },
      uScrollVelocity: { value: 0 },
      uTexture: { value: null },
      uTextureSize: { value: new THREE.Vector2(100, 100) },
      uQuadSize: { value: new THREE.Vector2(100, 100) },
      uBorderRadius: { value: 0 },
    },
    vertexShader: effectVertex,
    fragmentShader: effectFragment,
    glslVersion: THREE.GLSL3,
    transparent: true,
    depthTest: false,
    depthWrite: false
  })

  // Set up media store after images are loaded
  setMediaStore().catch(console.error)

  // Handle resize
  window.addEventListener('resize', () => {
    const fov = calcFov(500)
    resizeThreeCanvas({ camera, fov, renderer })
    setMediaStore().catch(console.error)
  })

  // Start render loop
  render()

  // Return cleanup function
  return () => {
    // Disconnect observer
    if (observer) {
      observer.disconnect()
      observer = null
    }

    mediaStore.forEach(item => {
      scene.remove(item.mesh)
      item.material.dispose()
      item.mesh.geometry.dispose()
    })
    
    if (renderer) {
      renderer.dispose()
      renderer.domElement.remove()
    }
    
    mediaStore = []
    scene = null
    camera = null
    renderer = null
  }
}

