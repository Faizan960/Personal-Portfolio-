/**
 * Tech City 3D WebGL Renderer (Three.js)
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders the interactive 3D ecosystem:
 *   • Deep navy/near-black skyline with exponential atmospheric fog
 *   • Central HQ citadel representing the developer identity
 *   • Hexagonal category districts with individual accents & landmark beacons
 *   • Varied architectural skill skyscrapers (height reflecting verified projects)
 *   • Elevated floating project landmarks with spinning orbital rings & ground tethers
 *   • Orbiting technology satellites anchored to verified projects
 *   • Glowing curved Bezier relationship conduits + animated signal pulses
 *   • Radial arterial avenues with traffic light pulses + 150-tower ambient skyline
 *   • Smooth selection beam, hover illumination, dimmed non-selected regions
 *   • Clean lifecycle disposal and tab-hidden throttling
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import type { CityEdge, CityGraph, CityNode } from "./types";
import {
  createCameraState,
  focusCameraOnChain,
  orbitCamera,
  resetCameraToOverview,
  stepCamera,
  zoomCamera,
  type CameraState,
} from "./cameraController";
import {
  createEdgesMesh,
  createFacadeMaterial,
  createGlowSprite,
  createLabelSprite,
  createRadialGlowTexture,
  createStandardMaterial,
  deterministicNoise,
} from "./geometryHelpers";

interface OpacityPart {
  mat: THREE.Material & { opacity: number };
  baseOpacity: number;
}

interface NodeVisual {
  node: CityNode;
  index: number;
  group: THREE.Group;
  primaryMesh: THREE.Mesh;
  baseEmissive: number;
  label: THREE.Sprite;
  blinkSprite?: THREE.Sprite;
  parts: OpacityPart[];
  alpha: number;
  targetAlpha: number;
  scale: number;
  targetScale: number;
  center: THREE.Vector3;
}

interface EdgeVisual {
  edge: CityEdge;
  curve: THREE.QuadraticBezierCurve3;
  material: THREE.MeshBasicMaterial;
  mesh: THREE.Mesh;
  dynamicLine?: THREE.Line;
  dynamicLineMat?: THREE.LineBasicMaterial;
  pulse: THREE.Sprite;
  phaseOffset: number;
  baseOpacity: number;
  isDynamicTechEdge: boolean;
}

interface RoadTraffic {
  sprite: THREE.Sprite;
  curve: THREE.LineCurve3;
  speed: number;
  offset: number;
}

import type { TechCityAppearance } from "@/lib/cms/types";

export interface TechCityRendererOptions {
  reducedMotion: boolean;
  isCompact: boolean;
  appearance?: TechCityAppearance;
  onSelectNode?: (nodeId: string | null) => void;
  onHoverNode?: (nodeId: string | null) => void;
}

/**
 * Computes the complete verified highlight chain for any selected or hovered node:
 *   • hq         -> HQ + all districts + HQ-linked projects
 *   • district   -> District + its skills + linked projects + their technologies
 *   • skill      -> Skill + its district + linked projects + connected technologies
 *   • project    -> Project + its technologies + linked skills + their districts (+ HQ if directly anchored)
 *   • technology -> Technology + linked projects + matching skills + their districts
 */
export function getHighlightChain(nodeId: string, graph: CityGraph): Set<string> {
  const start = graph.nodeMap.get(nodeId);
  const set = new Set<string>();
  if (!start) return set;

  set.add(start.id);
  const edges = graph.edgesByNode.get(start.id) || [];

  if (start.type === "hq") {
    for (const e of edges) {
      const otherId = e.sourceId === start.id ? e.targetId : e.sourceId;
      set.add(otherId);
    }
    return set;
  }

  if (start.type === "district") {
    const skillIds: string[] = [];
    for (const e of edges) {
      const otherId = e.sourceId === start.id ? e.targetId : e.sourceId;
      const other = graph.nodeMap.get(otherId);
      if (!other) continue;
      if (other.type === "skill") {
        set.add(other.id);
        skillIds.push(other.id);
      } else if (other.type === "project") {
        set.add(other.id);
      }
    }
    // Also reveal projects connected to skills in this district
    for (const sId of skillIds) {
      for (const se of graph.edgesByNode.get(sId) || []) {
        const otherId = se.sourceId === sId ? se.targetId : se.sourceId;
        const other = graph.nodeMap.get(otherId);
        if (other && other.type === "project") {
          set.add(other.id);
        }
      }
    }
    return set;
  }

  if (start.type === "skill") {
    if (start.districtId) set.add(start.districtId);
    const projIds: string[] = [];
    for (const e of edges) {
      const otherId = e.sourceId === start.id ? e.targetId : e.sourceId;
      const other = graph.nodeMap.get(otherId);
      if (!other) continue;
      if (other.type === "project" || other.type === "technology") {
        set.add(other.id);
        if (other.type === "project") projIds.push(other.id);
      }
    }
    for (const pId of projIds) {
      for (const pe of graph.edgesByNode.get(pId) || []) {
        const otherId = pe.sourceId === pId ? pe.targetId : pe.sourceId;
        const other = graph.nodeMap.get(otherId);
        if (other && other.type === "technology") {
          set.add(other.id);
        }
      }
    }
    return set;
  }

  if (start.type === "project") {
    for (const e of edges) {
      const otherId = e.sourceId === start.id ? e.targetId : e.sourceId;
      const other = graph.nodeMap.get(otherId);
      if (!other) continue;
      set.add(other.id);
      if (other.type === "skill" && other.districtId) {
        set.add(other.districtId);
      }
    }
    return set;
  }

  if (start.type === "technology") {
    for (const e of edges) {
      const otherId = e.sourceId === start.id ? e.targetId : e.sourceId;
      const other = graph.nodeMap.get(otherId);
      if (!other) continue;
      set.add(other.id);
      if (other.type === "skill" && other.districtId) {
        set.add(other.districtId);
      }
      if (other.type === "project") {
        for (const pe of graph.edgesByNode.get(other.id) || []) {
          const pOtherId = pe.sourceId === other.id ? pe.targetId : pe.sourceId;
          const pOther = graph.nodeMap.get(pOtherId);
          if (pOther && (pOther.type === "skill" || pOther.type === "district")) {
            set.add(pOther.id);
            if (pOther.districtId) set.add(pOther.districtId);
          }
        }
      }
    }
    return set;
  }

  return set;
}

export class TechCityRenderer {
  private canvas: HTMLCanvasElement;
  private graph: CityGraph;
  private options: TechCityRendererOptions;

  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private cameraState: CameraState;

  private nodeVisuals = new Map<string, NodeVisual>();
  private edgeVisuals: EdgeVisual[] = [];
  private pickMeshes: THREE.Mesh[] = [];
  private spinObjects: THREE.Object3D[] = [];
  private trafficCars: RoadTraffic[] = [];
  private dustPoints: THREE.Points | null = null;
  private selectionBeacon!: {
    group: THREE.Group;
    ringMat: THREE.MeshBasicMaterial;
    beamMat: THREE.MeshBasicMaterial;
    ring: THREE.Mesh;
  };

  private raycaster = new THREE.Raycaster();
  private pointerVec = new THREE.Vector2();
  private activePointers = new Map<number, [number, number]>();
  private pointerMoved = 0;
  private pinchDist = 0;
  private isDragging = false;
  private lastDragTime = 0;

  private selectedId: string | null = null;
  private hoveredId: string | null = null;
  private animFrameId = 0;
  private isVisible = true;
  private isTabHidden = false;
  private destroyed = false;

  private elapsed = 0;
  private lastTimestamp = 0;
  private introStartTime = 0;
  private introProgress: number;
  private aspect = 1;

  private glowTexture: THREE.CanvasTexture;
  private disposableResources: { dispose: () => void }[] = [];

  constructor(
    canvas: HTMLCanvasElement,
    graph: CityGraph,
    options: TechCityRendererOptions
  ) {
    this.canvas = canvas;
    this.graph = graph;
    this.options = options;
    this.introProgress = options.reducedMotion ? 1 : 0.65;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(options.isCompact ? 1.5 : 2, window.devicePixelRatio || 1));

    const ap = options.appearance;
    const bgHex =
      ap?.palettePreset === "aurora-teal"
        ? 0x02080e
        : ap?.palettePreset === "solar-gold"
          ? 0x06040a
          : ap?.palettePreset === "monochrome-ice"
            ? 0x04060b
            : 0x02040a;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(bgHex);
    this.scene.fog = new THREE.FogExp2(bgHex, ap?.fogDensity ?? 0.0125);
    if (ap?.cityScale && ap.cityScale !== 1) {
      this.scene.scale.setScalar(ap.cityScale);
    }

    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 220);
    this.cameraState = createCameraState(
      options.reducedMotion,
      ap?.cameraDistance,
      ap?.cameraPitch
    );

    this.glowTexture = createRadialGlowTexture();
    this.disposableResources.push(this.glowTexture);

    this.setupLighting();
    this.setupEnvironment();
    this.buildNodes();
    this.buildEdges();
    this.buildSelectionBeacon();
    this.setupPostProcessing();

    this.resize();
    this.bindEvents();
    this.startLoop();
  }

  private setupLighting(): void {
    this.scene.add(new THREE.AmbientLight(0x7080b0, 0.72));

    const keyLight = new THREE.PointLight(0x99ccff, 2.3, 80);
    keyLight.position.set(0, 15, 0);
    this.scene.add(keyLight);

    const purpleFill = new THREE.PointLight(0xa78bfa, 1.45, 56);
    purpleFill.position.set(-16, 9, 12);
    this.scene.add(purpleFill);

    const cyanFill = new THREE.PointLight(0x22d3ee, 1.35, 56);
    cyanFill.position.set(16, 7, -14);
    this.scene.add(cyanFill);
  }

  private setupEnvironment(): void {
    // Ground Grid
    const grid = new THREE.GridHelper(80, 80, 0x1a2a55, 0x0c1430);
    const gridMat = grid.material as THREE.Material;
    gridMat.transparent = true;
    gridMat.opacity = 0.52;
    this.scene.add(grid);

    // Subtle ground atmospheric bloom disc
    const groundGlowMat = new THREE.MeshBasicMaterial({
      map: this.glowTexture,
      color: 0x1d3f9a,
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const groundGlow = new THREE.Mesh(new THREE.PlaneGeometry(62, 62), groundGlowMat);
    groundGlow.rotation.x = -Math.PI / 2;
    groundGlow.position.y = 0.01;
    this.scene.add(groundGlow);

    // Outer perimeter boulevard ring
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0x335599,
      transparent: true,
      opacity: 0.34,
      side: THREE.DoubleSide,
    });
    const outerRing = new THREE.Mesh(new THREE.RingGeometry(15.2, 15.32, 128), outerRingMat);
    outerRing.rotation.x = -Math.PI / 2;
    outerRing.position.y = 0.02;
    this.scene.add(outerRing);

    // Arterial Roads from HQ to each District + ring avenue + animated light traffic
    const districts = this.graph.nodes.filter((n) => n.type === "district");
    const roadMat = new THREE.MeshBasicMaterial({
      color: 0x4a7cff,
      transparent: true,
      opacity: this.options.appearance?.roadOpacity ?? 0.52,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const aveRadius = 7.4;
    const innerRingRoad = new THREE.Mesh(new THREE.TorusGeometry(aveRadius, 0.032, 4, 128), roadMat);
    innerRingRoad.rotation.x = Math.PI / 2;
    innerRingRoad.position.y = 0.04;
    this.scene.add(innerRingRoad);

    districts.forEach((d, idx) => {
      const dir = d.outDir || { x: 0, z: 1 };
      const distLen = Math.max(4, Math.hypot(d.position.x, d.position.z) - (d.platformRadius ?? 2.8));
      const curve = new THREE.LineCurve3(
        new THREE.Vector3(dir.x * 2.1, 0.04, dir.z * 2.1),
        new THREE.Vector3(dir.x * distLen, 0.04, dir.z * distLen)
      );
      const roadTube = new THREE.Mesh(new THREE.TubeGeometry(curve, 2, 0.036, 4), roadMat);
      this.scene.add(roadTube);

      if (!this.options.reducedMotion) {
        const packetCount = this.options.isCompact ? 1 : 2;
        for (let j = 0; j < packetCount; j++) {
          const car = createGlowSprite(this.glowTexture, 0x9fd0ff, 0.72, 0.88);
          car.position.copy(curve.getPoint(j / packetCount));
          this.scene.add(car);
          this.trafficCars.push({
            sprite: car,
            curve,
            speed: 0.12 + 0.025 * j,
            offset: j / packetCount + idx * 0.19,
          });
        }
      }
    });

    // Procedural Ambient Background Skyline (InstancedMesh for crisp 60fps performance)
    const skylineCount = this.options.isCompact ? 75 : 150;
    const boxGeom = new THREE.BoxGeometry(1, 1, 1);
    boxGeom.translate(0, 0.5, 0);
    const skylineMat = createFacadeMaterial(0x4f7cff, 6, 5, 0.42);
    if (skylineMat.emissiveMap) {
      skylineMat.emissiveMap.repeat.set(2, 4);
    }
    const instanced = new THREE.InstancedMesh(boxGeom, skylineMat, skylineCount);
    const dummyMat = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();

    for (let i = 0; i < skylineCount; i++) {
      const r = 21 + deterministicNoise(i * 3) * 25;
      const angle = deterministicNoise(i * 3 + 1) * Math.PI * 2;
      const width = 1.0 + deterministicNoise(i * 3 + 2) * 1.9;
      const height = 1.4 + Math.pow(deterministicNoise(i * 5 + 7), 2) * 11.5;
      p.set(Math.sin(angle) * r, 0, Math.cos(angle) * r);
      s.set(width, height, width);
      dummyMat.compose(p, q, s);
      instanced.setMatrixAt(i, dummyMat);
    }
    this.scene.add(instanced);

    // Distant Starfield Dome
    const starCount = this.options.isCompact ? 260 : 500;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const a = deterministicNoise(i) * Math.PI * 2;
      const b = Math.acos(deterministicNoise(i + 500) * 1.2 - 0.2);
      const r = 105;
      starPos[i * 3] = r * Math.sin(b) * Math.cos(a);
      starPos[i * 3 + 1] = r * Math.cos(b) + 12;
      starPos[i * 3 + 2] = r * Math.sin(b) * Math.sin(a);
    }
    const starGeom = new THREE.BufferGeometry();
    starGeom.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    this.scene.add(
      new THREE.Points(
        starGeom,
        new THREE.PointsMaterial({
          color: 0x9fb4ff,
          size: 1.4,
          sizeAttenuation: false,
          fog: false,
          transparent: true,
          opacity: 0.78,
        })
      )
    );

    // Drifting Ambient Dust Motes
    const density = this.options.appearance?.particleDensity ?? 1.0;
    const dustCount = Math.round((this.options.isCompact ? 80 : 160) * density);
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3] = (deterministicNoise(i + 1) - 0.5) * 44;
      dustPos[i * 3 + 1] = deterministicNoise(i + 9) * 14;
      dustPos[i * 3 + 2] = (deterministicNoise(i + 19) - 0.5) * 44;
    }
    const dustGeom = new THREE.BufferGeometry();
    dustGeom.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    this.dustPoints = new THREE.Points(
      dustGeom,
      new THREE.PointsMaterial({
        color: 0x8fc4ff,
        size: 0.09,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    this.scene.add(this.dustPoints);
  }

  private buildNodes(): void {
    this.graph.nodes.forEach((node, idx) => {
      const group = new THREE.Group();
      this.scene.add(group);
      const parts: OpacityPart[] = [];
      const regPart = (mat: THREE.Material & { opacity: number }, baseOp?: number) => {
        parts.push({ mat, baseOpacity: baseOp ?? mat.opacity });
      };

      let primaryMesh!: THREE.Mesh;
      let baseEmissive = 0.85;
      let center = new THREE.Vector3(node.position.x, node.position.y, node.position.z);
      let labelPos = new THREE.Vector3(node.position.x, node.position.y + 1.5, node.position.z);
      let blinkSprite: THREE.Sprite | undefined;

      if (node.type === "hq") {
        group.position.set(node.position.x, 0, node.position.z);
        const hqMat = createFacadeMaterial(0xbfe6ff, 9.2, 3, 1.0);
        if (hqMat.emissiveMap) hqMat.emissiveMap.repeat.set(8, 4.5);

        const bodyGeom = new THREE.CylinderGeometry(0.82, 1.25, 9.2, 8);
        primaryMesh = new THREE.Mesh(bodyGeom, hqMat);
        primaryMesh.position.y = 4.6;
        baseEmissive = 1.0;
        group.add(primaryMesh);
        regPart(hqMat, 1);

        const hqEdges = createEdgesMesh(bodyGeom, 0xbfe6ff, 0.45);
        hqEdges.position.y = 4.6;
        group.add(hqEdges);
        regPart(hqEdges.material as THREE.LineBasicMaterial);

        const crownMat = createStandardMaterial(0x0a1226, 0xbfe6ff, 1.0);
        const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.82, 1.3, 8), crownMat);
        crown.position.y = 9.85;
        group.add(crown);
        regPart(crownMat, 1);

        const spireMat = new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.95 });
        const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.045, 2.3, 6), spireMat);
        spire.position.y = 11.65;
        group.add(spire);
        regPart(spireMat);

        const hqGlow = createGlowSprite(this.glowTexture, 0xbfe6ff, 6.2, 0.85);
        hqGlow.position.y = 10.6;
        group.add(hqGlow);
        regPart(hqGlow.material);

        const baseRingMat = new THREE.MeshBasicMaterial({
          color: 0xbfe6ff,
          transparent: true,
          opacity: 0.68,
        });
        const baseRing = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.032, 6, 64), baseRingMat);
        baseRing.rotation.x = Math.PI / 2;
        baseRing.position.y = 0.28;
        group.add(baseRing);
        regPart(baseRingMat);
        this.spinObjects.push(baseRing);

        center = new THREE.Vector3(0, 4.8, 0);
        labelPos = new THREE.Vector3(0, 13.4, 0);
      } else if (node.type === "district") {
        const radius = node.platformRadius ?? 3.1;
        const color = node.accentColor;
        group.position.set(node.position.x, 0, node.position.z);

        const platGeom = new THREE.CylinderGeometry(radius, radius + 0.22, 0.22, 6);
        const platMat = createStandardMaterial(0x100c26, color, 0.28);
        primaryMesh = new THREE.Mesh(platGeom, platMat);
        primaryMesh.position.y = 0.11;
        baseEmissive = 0.28;
        group.add(primaryMesh);
        regPart(platMat, 1);

        const platEdges = createEdgesMesh(platGeom, color, 0.85);
        platEdges.position.y = 0.11;
        group.add(platEdges);
        regPart(platEdges.material as THREE.LineBasicMaterial);

        for (const [ri, ro, op] of [
          [radius * 0.72, radius * 0.745, 0.68],
          [radius * 0.4, radius * 0.42, 0.45],
        ]) {
          const rMat = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: op,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          });
          const ringMesh = new THREE.Mesh(new THREE.RingGeometry(ri, ro, 6), rMat);
          ringMesh.rotation.x = -Math.PI / 2;
          ringMesh.position.y = 0.228;
          group.add(ringMesh);
          regPart(rMat);
        }

        // District Monument Beacon (a sleek crystalline pylon at district center)
        const beaconGeom = new THREE.OctahedronGeometry(0.32, 0);
        const beaconMat = createStandardMaterial(0x0c1428, color, 0.95);
        const beacon = new THREE.Mesh(beaconGeom, beaconMat);
        beacon.position.y = 0.85;
        beacon.scale.set(0.8, 1.8, 0.8);
        group.add(beacon);
        regPart(beaconMat, 1);
        this.spinObjects.push(beacon);

        // Floor Aura
        const floorMat = new THREE.MeshBasicMaterial({
          map: this.glowTexture,
          color,
          transparent: true,
          opacity: 0.34,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const floorPlane = new THREE.Mesh(
          new THREE.PlaneGeometry(radius * 3.1, radius * 3.1),
          floorMat
        );
        floorPlane.rotation.x = -Math.PI / 2;
        floorPlane.position.y = 0.03;
        group.add(floorPlane);
        regPart(floorMat);

        center = new THREE.Vector3(node.position.x, 0.9, node.position.z);
        const out = node.outDir || { x: 0, z: 1 };
        labelPos = new THREE.Vector3(
          node.position.x + out.x * (radius + 1.15),
          0.95,
          node.position.z + out.z * (radius + 1.15)
        );
      } else if (node.type === "skill") {
        const h = node.height ?? 1.8;
        const w = 0.82;
        const color = node.accentColor;
        const variant = node.shapeVariant ?? 0;
        group.position.set(node.position.x, 0, node.position.z);

        let bodyGeom: THREE.BufferGeometry;
        if (variant === 1) {
          bodyGeom = new THREE.CylinderGeometry(w * 0.45, w * 0.56, h, 6);
        } else if (variant === 2) {
          bodyGeom = new THREE.CylinderGeometry(w * 0.48, w * 0.52, h, 4);
        } else {
          bodyGeom = new THREE.BoxGeometry(w, h, w);
        }

        const facMat = createFacadeMaterial(color, h, idx + 1, 0.92);
        primaryMesh = new THREE.Mesh(bodyGeom, facMat);
        primaryMesh.position.y = h / 2;
        baseEmissive = 0.92;
        group.add(primaryMesh);
        regPart(facMat, 1);

        const edges = createEdgesMesh(bodyGeom, color, 0.52);
        edges.position.y = h / 2;
        group.add(edges);
        regPart(edges.material as THREE.LineBasicMaterial);

        // Stepped podium base
        const podMat = createStandardMaterial(0x0a1022, color, 0.25);
        const pod = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.24, 1.24), podMat);
        pod.position.y = 0.12;
        group.add(pod);
        regPart(podMat, 1);

        // Crown & antenna
        const crownMat = createStandardMaterial(0x0a1022, color, 0.82);
        const crown = new THREE.Mesh(
          variant === 3
            ? new THREE.ConeGeometry(0.4, 0.55, 4)
            : new THREE.BoxGeometry(0.52, 0.3, 0.52),
          crownMat
        );
        crown.position.y = h + (variant === 3 ? 0.27 : 0.15);
        group.add(crown);
        regPart(crownMat, 1);

        const antMat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.9,
        });
        const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.028, 0.95, 5), antMat);
        antenna.position.y = h + 0.72;
        group.add(antenna);
        regPart(antMat);

        blinkSprite = createGlowSprite(this.glowTexture, 0xffffff, 0.95, 0.85);
        blinkSprite.position.y = h + 1.24;
        group.add(blinkSprite);
        regPart(blinkSprite.material);

        center = new THREE.Vector3(node.position.x, h * 0.55, node.position.z);
        labelPos = new THREE.Vector3(node.position.x, h + 1.9, node.position.z);
      } else if (node.type === "project") {
        const color = node.accentColor;
        group.position.set(node.position.x, node.position.y, node.position.z);

        const coreGeom = new THREE.IcosahedronGeometry(0.58, 1);
        const coreMat = createStandardMaterial(0x2a1d00, color, 0.92);
        primaryMesh = new THREE.Mesh(coreGeom, coreMat);
        baseEmissive = 0.92;
        group.add(primaryMesh);
        regPart(coreMat, 1);

        const cageEdges = createEdgesMesh(new THREE.IcosahedronGeometry(0.84, 1), color, 0.72);
        group.add(cageEdges);
        regPart(cageEdges.material as THREE.LineBasicMaterial);
        this.spinObjects.push(cageEdges);

        const orbMat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.52,
        });
        const orbRing = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.014, 6, 64), orbMat);
        orbRing.rotation.x = 1.2;
        group.add(orbRing);
        regPart(orbMat);
        this.spinObjects.push(orbRing);

        const rings: readonly [number, number, number][] = [
          [1.02, 0.42, 1.1],
          [1.56, 1.32, 0.3],
        ];
        for (const [rr, tx, tz] of rings) {
          const rMat = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.48,
          });
          const ring = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.014, 6, 64), rMat);
          ring.rotation.set(tx, 0, tz);
          group.add(ring);
          regPart(rMat);
          this.spinObjects.push(ring);
        }

        const aura = createGlowSprite(this.glowTexture, color, 3.8, 0.85);
        group.add(aura);
        regPart(aura.material);

        // Vertical tether pillar + ground landing pad ring
        const pillarMat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.1,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.72, node.position.y, 20, 1, true),
          pillarMat
        );
        pillar.position.y = -node.position.y / 2;
        group.add(pillar);
        regPart(pillarMat);

        const padMat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.55,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const padRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.02, 48), padMat);
        padRing.rotation.x = -Math.PI / 2;
        padRing.position.y = -node.position.y + 0.04;
        group.add(padRing);
        regPart(padMat);

        // Generous invisible collider sphere for reliable raycast selection
        const hitMesh = new THREE.Mesh(
          new THREE.SphereGeometry(1.15, 10, 8),
          new THREE.MeshBasicMaterial({ visible: false })
        );
        hitMesh.userData.id = node.id;
        group.add(hitMesh);
        this.pickMeshes.push(hitMesh);

        center = new THREE.Vector3(node.position.x, node.position.y, node.position.z);
        labelPos = new THREE.Vector3(node.position.x, node.position.y + 1.65, node.position.z);
      } else {
        // Technology Satellite
        const color = node.accentColor;
        group.position.set(node.position.x, node.position.y, node.position.z);

        const satMat = createStandardMaterial(0x14143a, color, 0.92);
        primaryMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.32), satMat);
        baseEmissive = 0.92;
        group.add(primaryMesh);
        regPart(satMat, 1);
        this.spinObjects.push(primaryMesh);

        const satRingMat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.52,
        });
        const satRing = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.012, 6, 36), satRingMat);
        satRing.rotation.x = Math.PI / 2.4;
        group.add(satRing);
        regPart(satRingMat);
        this.spinObjects.push(satRing);

        const satGlow = createGlowSprite(this.glowTexture, color, 1.65, 0.85);
        group.add(satGlow);
        regPart(satGlow.material);

        const hitMesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.7, 8, 6),
          new THREE.MeshBasicMaterial({ visible: false })
        );
        hitMesh.userData.id = node.id;
        group.add(hitMesh);
        this.pickMeshes.push(hitMesh);

        center = new THREE.Vector3(node.position.x, node.position.y, node.position.z);
        labelPos = new THREE.Vector3(node.position.x, node.position.y + 0.85, node.position.z);
      }

      primaryMesh.userData.id = node.id;
      this.pickMeshes.push(primaryMesh);

      const labelSize = node.type === "hq" ? 1.15 : node.type === "district" ? 1.05 : 0.82;
      const labelSprite = createLabelSprite(
        node.label,
        node.accentHex,
        labelSize,
        node.type === "hq" ? node.subtitle : undefined
      );
      labelSprite.position.copy(labelPos);
      this.scene.add(labelSprite);

      this.nodeVisuals.set(node.id, {
        node,
        index: idx,
        group,
        primaryMesh,
        baseEmissive,
        label: labelSprite,
        blinkSprite,
        parts,
        alpha: 1,
        targetAlpha: 1,
        scale: 1,
        targetScale: 1,
        center,
      });
    });
  }

  private getEdgeAnchor(node: CityNode): THREE.Vector3 {
    if (node.type === "hq") return new THREE.Vector3(0, 1.8, 0);
    if (node.type === "district") return new THREE.Vector3(node.position.x, 0.35, node.position.z);
    if (node.type === "skill") {
      return new THREE.Vector3(node.position.x, node.height ?? 1.8, node.position.z);
    }
    return new THREE.Vector3(node.position.x, node.position.y, node.position.z);
  }

  private buildEdges(): void {
    this.graph.edges.forEach((edge, idx) => {
      const source = this.graph.nodeMap.get(edge.sourceId);
      const target = this.graph.nodeMap.get(edge.targetId);
      if (!source || !target) return;

      const sPos =
        edge.type === "district-skill" || edge.type === "hq-district"
          ? new THREE.Vector3(source.position.x, 0.25, source.position.z)
          : this.getEdgeAnchor(source);

      const tPos =
        edge.type === "district-skill" || edge.type === "hq-district"
          ? new THREE.Vector3(target.position.x, 0.25, target.position.z)
          : this.getEdgeAnchor(target);

      const archHeight =
        edge.type === "district-skill" || edge.type === "hq-district" ? 0.05 : 1.15;

      const mid = sPos
        .clone()
        .add(tPos)
        .multiplyScalar(0.5)
        .add(new THREE.Vector3(0, archHeight, 0));

      const curve = new THREE.QuadraticBezierCurve3(sPos, mid, tPos);
      const baseOpacity =
        edge.type === "hq-district"
          ? 0.08
          : edge.type === "district-skill"
            ? 0.16
            : 0.28;

      const isDynamicTechEdge =
        edge.type === "project-tech" || edge.type === "tech-skill";

      const mat = new THREE.MeshBasicMaterial({
        color: edge.color,
        transparent: true,
        opacity: baseOpacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const tubeMesh = new THREE.Mesh(
        new THREE.TubeGeometry(curve, this.options.isCompact ? 16 : 24, 0.028, 5),
        mat
      );
      if (isDynamicTechEdge) {
        tubeMesh.visible = false;
      }
      this.scene.add(tubeMesh);

      let dynamicLine: THREE.Line | undefined;
      let dynamicLineMat: THREE.LineBasicMaterial | undefined;
      if (isDynamicTechEdge) {
        const pts = curve.getPoints(16);
        const lineGeom = new THREE.BufferGeometry().setFromPoints(pts);
        dynamicLineMat = new THREE.LineBasicMaterial({
          color: edge.color,
          transparent: true,
          opacity: baseOpacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        dynamicLine = new THREE.Line(lineGeom, dynamicLineMat);
        this.scene.add(dynamicLine);
      }

      const pulse = createGlowSprite(this.glowTexture, 0xffffff, 0.88, 1.0);
      pulse.visible = false;
      this.scene.add(pulse);

      this.edgeVisuals.push({
        edge,
        curve,
        material: mat,
        mesh: tubeMesh,
        dynamicLine,
        dynamicLineMat,
        pulse,
        phaseOffset: idx * 0.37,
        baseOpacity,
        isDynamicTechEdge,
      });
    });
  }

  private buildSelectionBeacon(): void {
    const group = new THREE.Group();
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.74,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.35, 1.52, 56), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06;
    group.add(ring);

    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.13,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 1.15, 17, 24, 1, true),
      beamMat
    );
    beam.position.y = 8.5;
    group.add(beam);

    group.visible = false;
    this.scene.add(group);
    this.selectionBeacon = { group, ringMat, beamMat, ring };
  }

  private setupPostProcessing(): void {
    if (
      this.options.isCompact ||
      this.options.reducedMotion ||
      this.options.appearance?.bloomEnabled === false
    ) {
      return;
    }
    try {
      // Skip multi-pass bloom on software WebGL (e.g. SwiftShader) to maintain smooth FPS
      const gl = this.renderer.getContext();
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      if (dbg) {
        const gpu = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || "");
        if (/swiftshader|llvmpipe|software/i.test(gpu)) {
          return;
        }
      }
      const rect = this.canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      const composer = new EffectComposer(this.renderer);
      composer.addPass(new RenderPass(this.scene, this.camera));
      const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.6, 0.52, 0.25);
      composer.addPass(bloom);
      this.composer = composer;
      this.bloomPass = bloom;
    } catch {
      this.composer = null;
      this.bloomPass = null;
    }
  }

  private pickNode(clientX: number, clientY: number): string | null {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    this.pointerVec.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(this.pointerVec, this.camera);
    const hits = this.raycaster.intersectObjects(this.pickMeshes, false);
    const id = hits[0]?.object?.userData?.id;
    return typeof id === "string" ? id : null;
  }

  private getPinchDistance(): number {
    const vals = Array.from(this.activePointers.values());
    if (vals.length < 2) return 1;
    return Math.hypot(vals[0]![0] - vals[1]![0], vals[0]![1] - vals[1]![1]) || 1;
  }

  private onPointerDown = (e: PointerEvent): void => {
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      // Safe fallback
    }
    this.activePointers.set(e.pointerId, [e.clientX, e.clientY]);
    this.pointerMoved = 0;
    if (this.activePointers.size === 2) {
      this.pinchDist = this.getPinchDistance();
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    const prev = this.activePointers.get(e.pointerId);
    if (prev) {
      const dx = e.clientX - prev[0];
      const dy = e.clientY - prev[1];
      this.activePointers.set(e.pointerId, [e.clientX, e.clientY]);
      this.pointerMoved += Math.abs(dx) + Math.abs(dy);

      if (this.activePointers.size === 1 && this.pointerMoved > 5) {
        this.isDragging = true;
        this.lastDragTime = performance.now();
        orbitCamera(this.cameraState, dx, dy);
      } else if (this.activePointers.size === 2) {
        const d = this.getPinchDistance();
        zoomCamera(this.cameraState, this.pinchDist / d);
        this.pinchDist = d;
      }
    } else if (e.pointerType === "mouse") {
      const hitId = this.pickNode(e.clientX, e.clientY);
      if (hitId !== this.hoveredId) {
        this.hoveredId = hitId;
        this.canvas.style.cursor = hitId ? "pointer" : "grab";
        this.options.onHoverNode?.(hitId);
      }
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    this.activePointers.delete(e.pointerId);
    if (this.pointerMoved <= 6 && this.activePointers.size === 0) {
      const hitId = this.pickNode(e.clientX, e.clientY);
      this.selectNode(hitId);
      this.options.onSelectNode?.(hitId);
    }
    if (this.activePointers.size === 0) {
      this.isDragging = false;
    }
  };

  private onPointerCancel = (e: PointerEvent): void => {
    this.activePointers.delete(e.pointerId);
    this.isDragging = false;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    zoomCamera(this.cameraState, 1 + e.deltaY * 0.001);
  };

  private onVisibilityChange = (): void => {
    this.isTabHidden = document.hidden;
    if (!this.isTabHidden && this.isVisible && !this.animFrameId && !this.destroyed) {
      this.lastTimestamp = performance.now();
      this.animFrameId = requestAnimationFrame(this.renderFrame);
    }
  };

  private bindEvents(): void {
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointermove", this.onPointerMove);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("pointercancel", this.onPointerCancel);
    this.canvas.addEventListener("wheel", this.onWheel, { passive: false });
    document.addEventListener("visibilitychange", this.onVisibilityChange);
  }

  public resize(): void {
    if (this.destroyed) return;
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    this.renderer.setSize(w, h, false);
    if (this.composer) this.composer.setSize(w, h);
    if (this.bloomPass) this.bloomPass.setSize(w, h);
    this.aspect = w / h;
    this.camera.aspect = this.aspect;
    this.camera.updateProjectionMatrix();
  }

  public setVisible(visible: boolean): void {
    this.isVisible = visible;
    if (visible && !this.isTabHidden && !this.animFrameId && !this.destroyed) {
      this.lastTimestamp = performance.now();
      if (!this.introStartTime) this.introStartTime = this.lastTimestamp;
      this.animFrameId = requestAnimationFrame(this.renderFrame);
    }
  }

  public selectNode(nodeId: string | null): void {
    this.selectedId = nodeId;

    if (!nodeId) {
      this.selectionBeacon.group.visible = false;
      resetCameraToOverview(this.cameraState);
      return;
    }

    const node = this.graph.nodeMap.get(nodeId);
    if (!node) return;

    const beaconColor = new THREE.Color(node.accentColor);
    this.selectionBeacon.ringMat.color.copy(beaconColor);
    this.selectionBeacon.beamMat.color.copy(beaconColor);

    const visual = this.nodeVisuals.get(nodeId);
    const livePos = visual?.group.position ?? node.position;
    this.selectionBeacon.group.position.set(livePos.x, 0, livePos.z);
    this.selectionBeacon.group.visible = true;

    const chainIds = Array.from(getHighlightChain(nodeId, this.graph));
    const chainNodes = chainIds
      .map((id) => this.graph.nodeMap.get(id))
      .filter((n): n is CityNode => Boolean(n));

    focusCameraOnChain(this.cameraState, node, chainNodes, this.graph);
  }

  public zoomIn(): void {
    zoomCamera(this.cameraState, 0.84);
  }

  public zoomOut(): void {
    zoomCamera(this.cameraState, 1.18);
  }

  public resetView(): void {
    this.selectNode(null);
  }

  private renderFrame = (ts: number): void => {
    if (this.destroyed || !this.isVisible || this.isTabHidden) {
      this.animFrameId = 0;
      return;
    }

    this.animFrameId = requestAnimationFrame(this.renderFrame);

    const rawDt = (ts - this.lastTimestamp) / 1000 || 0.016;
    const dt = Math.min(0.25, Math.max(0.001, rawDt));
    this.lastTimestamp = ts;
    this.elapsed += dt;
    if (!this.introStartTime) this.introStartTime = ts;
    if (!this.options.reducedMotion) {
      this.introProgress = Math.min(1, 0.65 + ((ts - this.introStartTime) / 900) * 0.35);
    } else {
      this.introProgress = 1;
    }

    const shouldAutoOrbit =
      !this.options.reducedMotion &&
      !this.selectedId &&
      !this.isDragging &&
      ts - this.lastDragTime > 2400;

    stepCamera(
      this.cameraState,
      this.camera,
      dt,
      this.aspect,
      shouldAutoOrbit,
      this.options.appearance?.autoOrbitSpeed ?? 0.055
    );

    // Update orbiting technology satellites around their parent projects
    if (!this.options.reducedMotion) {
      for (const nv of this.nodeVisuals.values()) {
        if (nv.node.type === "technology" && nv.node.primaryProjectId) {
          const parent = this.graph.nodeMap.get(nv.node.primaryProjectId);
          if (parent) {
            const parentSelected =
              this.selectedId === parent.id || this.hoveredId === parent.id;
            const orbitSpeed = parentSelected ? 0.55 : 0.22;
            const angle = (nv.node.orbitAngle ?? 0) + this.elapsed * orbitSpeed;
            const r = nv.node.orbitRadius ?? 1.95;
            const yOff = nv.node.orbitYOffset ?? 0.55;
            const nx = parent.position.x + Math.cos(angle) * r;
            const ny = parent.position.y + yOff;
            const nz = parent.position.z + Math.sin(angle) * r;

            nv.group.position.set(nx, ny, nz);
            nv.label.position.set(nx, ny + 0.85, nz);
            if (this.selectedId === nv.node.id) {
              this.selectionBeacon.group.position.set(nx, 0, nz);
            }
          }
        }
      }
    }

    const activeId = this.selectedId || this.hoveredId;
    const highlightChain = activeId ? getHighlightChain(activeId, this.graph) : null;
    const k = 1 - Math.exp(-5.0 * dt);

    const smoothStep = (v: number) => v * v * (3 - 2 * v);

    for (const nv of this.nodeVisuals.values()) {
      const inChain = highlightChain ? highlightChain.has(nv.node.id) : false;
      nv.targetAlpha = highlightChain ? (inChain ? 1.0 : 0.14) : 1.0;
      nv.targetScale = inChain ? (nv.node.id === activeId ? 1.26 : 1.12) : 1.0;

      const lerpFactor = this.options.reducedMotion ? 1.0 : k * 0.9;
      nv.alpha += (nv.targetAlpha - nv.alpha) * lerpFactor;
      nv.scale += (nv.targetScale - nv.scale) * lerpFactor;

      const typeOrder =
        nv.node.type === "hq"
          ? 0
          : nv.node.type === "district"
            ? 0.18
            : nv.node.type === "skill"
              ? 0.36
              : nv.node.type === "project"
                ? 0.54
                : 0.72;

      const introScale = this.options.reducedMotion
        ? 1.0
        : smoothStep(Math.min(1, Math.max(0, this.introProgress * 1.65 - typeOrder - nv.index * 0.008)));

      if (nv.node.type === "skill" || nv.node.type === "hq") {
        nv.group.scale.set(nv.scale, introScale * nv.scale, nv.scale);
      } else {
        nv.group.scale.setScalar(nv.scale * introScale);
      }

      for (const p of nv.parts) {
        p.mat.opacity = p.baseOpacity * nv.alpha * (introScale > 0.02 ? 1 : 0);
      }

      const meshMat = nv.primaryMesh.material as THREE.MeshStandardMaterial;
      if (typeof meshMat.emissiveIntensity === "number") {
        meshMat.emissiveIntensity = nv.baseEmissive * (1 + (nv.scale - 1) * 4.5);
      }

      // Label visibility: always show HQ, Districts, Projects & active chain
      const showLabel =
        introScale > 0.8 &&
        (nv.node.type === "hq" ||
          nv.node.type === "district" ||
          nv.node.type === "project" ||
          inChain ||
          nv.node.id === this.hoveredId);

      nv.label.visible = showLabel;
      (nv.label.material as THREE.SpriteMaterial).opacity = showLabel ? nv.alpha : 0;
    }

    // Update relationship beams & travelling pulses
    const edgeIntro = smoothStep(Math.min(1, Math.max(0, this.introProgress * 1.6 - 0.65)));
    for (const ev of this.edgeVisuals) {
      if (ev.isDynamicTechEdge && ev.dynamicLine && ev.dynamicLineMat) {
        const sVis = this.nodeVisuals.get(ev.edge.sourceId);
        const tVis = this.nodeVisuals.get(ev.edge.targetId);
        if (sVis && tVis) {
          const sx = sVis.group.position.x;
          const sy =
            sVis.node.type === "skill"
              ? sVis.node.height ?? 1.8
              : sVis.group.position.y;
          const sz = sVis.group.position.z;
          const tx = tVis.group.position.x;
          const ty =
            tVis.node.type === "skill"
              ? tVis.node.height ?? 1.8
              : tVis.group.position.y;
          const tz = tVis.group.position.z;

          ev.curve.v0.set(sx, sy, sz);
          ev.curve.v2.set(tx, ty, tz);
          ev.curve.v1.set((sx + tx) * 0.5, (sy + ty) * 0.5 + 0.65, (sz + tz) * 0.5);

          const posAttr = ev.dynamicLine.geometry.getAttribute("position") as THREE.BufferAttribute;
          const segCount = posAttr.count - 1;
          for (let i = 0; i <= segCount; i++) {
            const pt = ev.curve.getPoint(i / segCount);
            posAttr.setXYZ(i, pt.x, pt.y, pt.z);
          }
          posAttr.needsUpdate = true;
        }
      }

      const bothActive =
        highlightChain !== null &&
        highlightChain.has(ev.edge.sourceId) &&
        highlightChain.has(ev.edge.targetId);

      const targetOp =
        (highlightChain ? (bothActive ? 0.92 : 0.03) : ev.baseOpacity) * edgeIntro;
      ev.material.opacity += (targetOp - ev.material.opacity) * 0.16;
      if (ev.dynamicLineMat) {
        ev.dynamicLineMat.opacity = ev.material.opacity;
      }

      const showPulse = bothActive && !this.options.reducedMotion && this.introProgress > 0.9;
      ev.pulse.visible = showPulse;
      if (showPulse) {
        ev.pulse.position.copy(ev.curve.getPoint((this.elapsed * 0.42 + ev.phaseOffset) % 1));
      }
    }

    // Ambient living animations
    if (!this.options.reducedMotion) {
      for (const obj of this.spinObjects) {
        obj.rotation.y += dt * 0.52;
      }
      for (const nv of this.nodeVisuals.values()) {
        if (nv.blinkSprite) {
          nv.blinkSprite.scale.setScalar(0.9 + 0.3 * Math.sin(this.elapsed * 3.1 + nv.index));
        }
      }
      for (const car of this.trafficCars) {
        car.sprite.position.copy(
          car.curve.getPoint((this.elapsed * car.speed + car.offset) % 1)
        );
      }
      if (this.dustPoints) {
        this.dustPoints.rotation.y += dt * 0.018;
      }
      if (this.selectionBeacon.group.visible) {
        this.selectionBeacon.ring.scale.setScalar(
          1 + 0.12 * Math.sin(this.elapsed * 3.2)
        );
      }
    }

    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  };

  private startLoop(): void {
    if (!this.animFrameId && !this.destroyed) {
      this.lastTimestamp = performance.now();
      this.animFrameId = requestAnimationFrame(this.renderFrame);
    }
  }

  public destroy(): void {
    this.destroyed = true;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = 0;
    }

    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerCancel);
    this.canvas.removeEventListener("wheel", this.onWheel);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);

    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).geometry) {
        (obj as THREE.Mesh).geometry.dispose();
      }
      const mat = (obj as THREE.Mesh).material;
      if (Array.isArray(mat)) {
        mat.forEach((m) => m.dispose());
      } else if (mat) {
        mat.dispose();
      }
    });

    for (const res of this.disposableResources) {
      res.dispose();
    }

    this.composer?.dispose();
    this.renderer.dispose();
  }
}
