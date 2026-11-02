/**
 * Hero phone scene — a web port of the Remotion ad in
 * ~/Videos/remotion/vibestudio-ad-1/src/PhoneScene.tsx: the same smartphone
 * GLB with the downsized app screen recording mapped onto its display,
 * slowly swaying in place.
 */
import {
  ACESFilmicToneMapping,
  AmbientLight,
  Box3,
  CanvasTexture,
  Color,
  DirectionalLight,
  Group,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  MeshBasicMaterial,
  PMREMGenerator,
  PerspectiveCamera,
  SRGBColorSpace,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

const PHONE_HEIGHT = 4; // scene units
const CAMERA_FOV = 30;
const SCREEN_MESH_NAME = 'Screen_Screen_0';
const SCREEN_TEXTURE_WIDTH = 540; // matches the transcoded clip width
const AD_FPS = 30; // the sway in the ad is expressed in 30fps frames

// Resting pose from the ad, around which the phone sways
const BASE_ROTATION_Y = 0.3;
const BASE_ROTATION_X = 0.08;

export interface PhoneSceneHandle {
  dispose(): void;
}

export interface PhoneSceneOptions {
  stage: HTMLElement;
  canvas: HTMLCanvasElement;
  video: HTMLVideoElement;
  modelUrl: string;
  reducedMotion: boolean;
  onReady?: () => void;
  onError?: (error: unknown) => void;
}

export function createPhoneScene(options: PhoneSceneOptions): PhoneSceneHandle {
  const { stage, canvas, video, modelUrl, reducedMotion, onReady, onError } = options;

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
  } catch (error) {
    onError?.(error);
    return { dispose() {} };
  }
  renderer.setClearColor(new Color(0x000000), 0);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.outputColorSpace = SRGBColorSpace;

  const scene = new Scene();
  const camera = new PerspectiveCamera(CAMERA_FOV, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  const pmrem = new PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = environment;
  pmrem.dispose();

  scene.add(new AmbientLight(0xffffff, 0.6));
  const key = new DirectionalLight(0xffffff, 2.2);
  key.position.set(4, 5, 6);
  scene.add(key);
  const rim = new DirectionalLight(0x20c9b1, 0.8);
  rim.position.set(-5, -2, 3);
  scene.add(rim);

  const rig = new Group();
  rig.rotation.set(BASE_ROTATION_X, BASE_ROTATION_Y, 0);
  scene.add(rig);

  let disposed = false;
  let visible = true;
  let frameId = 0;
  let screenTexture: CanvasTexture | null = null;
  let screenMaterial: MeshBasicMaterial | null = null;
  let screenContext: CanvasRenderingContext2D | null = null;
  let screenCanvas: HTMLCanvasElement | null = null;
  let videoFrameCallback = 0;

  const resize = () => {
    const width = Math.max(1, stage.clientWidth);
    const height = Math.max(1, stage.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Fit the whole phone (plus breathing room) vertically; back off further on narrow stages
    const fitHeight = PHONE_HEIGHT * 1.06;
    const fitWidth = (PHONE_HEIGHT * 0.58) / camera.aspect;
    const halfFov = (CAMERA_FOV * Math.PI) / 360;
    camera.position.z = Math.max(fitHeight, fitWidth) / 2 / Math.tan(halfFov);
    camera.updateProjectionMatrix();
  };

  const drawVideoFrame = () => {
    if (!screenContext || !screenCanvas || !screenTexture) return;
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
    const w = screenCanvas.width;
    const h = screenCanvas.height;
    const videoAspect = video.videoWidth / video.videoHeight;
    let dw = w;
    let dh = h;
    if (videoAspect < w / h) dw = h * videoAspect;
    else dh = w / videoAspect;
    screenContext.drawImage(video, (w - dw) / 2, (h - dh) / 2, dw, dh);
    screenTexture.needsUpdate = true;
  };

  const hasVideoFrameCallback = 'requestVideoFrameCallback' in video;
  const scheduleVideoFrame = () => {
    if (disposed || !hasVideoFrameCallback) return;
    videoFrameCallback = video.requestVideoFrameCallback(() => {
      drawVideoFrame();
      scheduleVideoFrame();
    });
  };

  const render = (now: number) => {
    frameId = 0;
    if (disposed) return;

    if (!reducedMotion) {
      const frame = (now / 1000) * AD_FPS;
      rig.rotation.y = BASE_ROTATION_Y + Math.sin(frame / 38) * 0.22;
      rig.rotation.x = BASE_ROTATION_X + Math.sin(frame / 55) * 0.04;
    }

    if (!hasVideoFrameCallback) drawVideoFrame();
    renderer.render(scene, camera);

    if (visible) frameId = requestAnimationFrame(render);
  };

  const start = () => {
    if (frameId === 0 && !disposed && visible) frameId = requestAnimationFrame(render);
  };
  const stop = () => {
    if (frameId !== 0) cancelAnimationFrame(frameId);
    frameId = 0;
  };

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load(
    modelUrl,
    (gltf) => {
      if (disposed) return;
      const root = gltf.scene;
      root.updateMatrixWorld(true);

      let screen: Mesh | null = null;
      root.traverse((object) => {
        if (screen) return;
        const mesh = object as Mesh;
        if (!mesh.isMesh) return;
        const materialName = Array.isArray(mesh.material) ? '' : mesh.material.name;
        if (mesh.name === SCREEN_MESH_NAME || materialName === 'Screen') screen = mesh;
      });
      if (!screen) {
        onError?.(new Error(`Mesh "${SCREEN_MESH_NAME}" not found in ${modelUrl}`));
        return;
      }
      const screenMesh = screen as Mesh;

      const bounds = new Box3().setFromObject(root);
      const size = bounds.getSize(new Vector3());
      const center = bounds.getCenter(new Vector3());
      const screenSize = new Box3().setFromObject(screenMesh).getSize(new Vector3());

      // Video is drawn "contain"-style into a canvas with the display's aspect ratio
      const aspect = screenSize.x / screenSize.y;
      screenCanvas = document.createElement('canvas');
      screenCanvas.width = SCREEN_TEXTURE_WIDTH;
      screenCanvas.height = Math.round(SCREEN_TEXTURE_WIDTH / aspect);
      screenContext = screenCanvas.getContext('2d');
      if (screenContext) {
        screenContext.fillStyle = '#000';
        screenContext.fillRect(0, 0, screenCanvas.width, screenCanvas.height);
      }
      screenTexture = new CanvasTexture(screenCanvas);
      screenTexture.colorSpace = SRGBColorSpace;
      screenTexture.repeat.set(2, 1); // The screen UVs only span the left half of the UV space
      screenTexture.minFilter = LinearMipmapLinearFilter;
      screenTexture.magFilter = LinearFilter;
      screenTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      screenMaterial = new MeshBasicMaterial({ map: screenTexture, toneMapped: false });
      screenMesh.material = screenMaterial;

      const normalized = new Group();
      normalized.scale.setScalar(PHONE_HEIGHT / size.y);
      root.position.set(-center.x, -center.y, -center.z);
      normalized.add(root);
      rig.add(normalized);

      drawVideoFrame();
      scheduleVideoFrame();
      resize();
      onReady?.();
      start();
    },
    undefined,
    (error) => onError?.(error),
  );

  const resizeObserver = new ResizeObserver(() => {
    resize();
    if (!visible) renderer.render(scene, camera);
  });
  resizeObserver.observe(stage);
  resize();

  // Save GPU and battery while the hero is scrolled away or the tab is hidden
  let inViewport = true;
  const updateVisibility = () => {
    visible = inViewport && !document.hidden;
    if (visible) {
      video.play().catch(() => {});
      start();
    } else {
      video.pause();
      stop();
    }
  };
  const intersection = new IntersectionObserver(([entry]) => {
    inViewport = Boolean(entry?.isIntersecting);
    updateVisibility();
  });
  intersection.observe(stage);
  document.addEventListener('visibilitychange', updateVisibility);

  return {
    dispose() {
      disposed = true;
      stop();
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener('visibilitychange', updateVisibility);
      if (videoFrameCallback && 'cancelVideoFrameCallback' in video) {
        video.cancelVideoFrameCallback(videoFrameCallback);
      }
      screenTexture?.dispose();
      screenMaterial?.dispose();
      environment.dispose();
      scene.traverse((object) => {
        const mesh = object as Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((m) => m.dispose());
      });
      renderer.dispose();
    },
  };
}
