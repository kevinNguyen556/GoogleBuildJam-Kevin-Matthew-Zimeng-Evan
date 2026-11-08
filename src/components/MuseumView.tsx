import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import {
  Sparkles,
  Users,
  Eye,
  EyeOff,
  HelpCircle,
  Trophy,
  Filter,
  Palette,
  MapPin,
  Edit3,
  Save,
  X,
  Send,
  MessageSquare,
  Plus,
  Compass,
  Sailboat,
  Waves,
  Calendar,
  CheckCircle,
} from 'lucide-react';
import {
  Photo,
  Album,
  Friend,
  GuessLogEntry,
  OffLimitsZone,
  MuseumSpeechNote,
  UserAccount,
} from '../types';
import { SAMPLE_FRIENDS } from '../utils/sampleData';
import { GuessTheSpotModal } from './GuessTheSpotModal';

interface MuseumViewProps {
  photos: Photo[];
  albums: Album[];
  friends: Friend[];
  offLimitsZones: OffLimitsZone[];
  guessLogs: GuessLogEntry[];
  currentUser?: UserAccount;
  onRecordGuess: (entry: GuessLogEntry) => void;
  onUpdatePhoto: (photo: Photo) => void;
  onInspectPhoto: (photo: Photo) => void;
  onReportPhoto?: (photoId: string) => void;
  onMarkPhotosGameReady: (photoIds: string[]) => void;
  onBuryAsTreasure?: (photo: Photo) => void;
  onSendAsBottle?: (photo: Photo) => void;
  onSendToFriend?: (photo: Photo, friend: Friend) => void;
}

type ArrangementType = 'chronological' | 'location' | 'color';

export const MuseumView: React.FC<MuseumViewProps> = ({
  photos,
  albums,
  friends,
  offLimitsZones,
  guessLogs,
  currentUser,
  onRecordGuess,
  onUpdatePhoto,
  onInspectPhoto,
  onReportPhoto,
  onMarkPhotosGameReady,
  onBuryAsTreasure,
  onSendAsBottle,
  onSendToFriend,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Gallery Filters & Arrangement
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('all');
  const [selectedArrangement, setSelectedArrangement] = useState<ArrangementType>('chronological');

  // Visitor Mode & Simulated Friend
  const [visitorMode, setVisitorMode] = useState<boolean>(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend>(friends[0] || SAMPLE_FRIENDS[0]);
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);

  // Speech Bubble Notes Visibility Feature
  const [showSpeechNotes, setShowSpeechNotes] = useState<boolean>(true);
  const [isAddingNoteForPhoto, setIsAddingNoteForPhoto] = useState<Photo | null>(null);
  const [newNoteText, setNewNoteText] = useState<string>('');
  const [newNoteAuthorName, setNewNoteAuthorName] = useState<string>('');

  // Send to Friend Modal State from inside Museum
  const [sendingPhoto, setSendingPhoto] = useState<Photo | null>(null);
  const [sendTargetFriend, setSendTargetFriend] = useState<Friend>(friends[0] || SAMPLE_FRIENDS[0]);

  // Guess-The-Spot Modal State
  const [guessTargetPhoto, setGuessTargetPhoto] = useState<Photo | null>(null);

  // Custom Description Edit Modal State
  const [editingDescriptionPhoto, setEditingDescriptionPhoto] = useState<Photo | null>(null);
  const [customDescText, setCustomDescText] = useState<string>('');

  // Active / Nearby Photo in 3D Viewport (auto-detected when walking near frames)
  const [nearbyPhoto, setNearbyPhoto] = useState<Photo | null>(null);
  const [screenCoords, setScreenCoords] = useState<{ x: number; y: number } | null>(null);
  const [isNearEmptyFrame, setIsNearEmptyFrame] = useState<boolean>(false);

  // Mobile virtual joystick state
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const moveVectorRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Camera & Scene References for 2D Projection
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const frameObjectsRef = useRef<{ mesh: THREE.Mesh; photo: Photo; position: THREE.Vector3 }[]>([]);

  // Photos are auto-added from library: displays all library photos
  const museumPhotos = useMemo(() => {
    let list = [...photos];

    if (selectedAlbumId !== 'all') {
      const alb = albums.find((a) => a.id === selectedAlbumId);
      if (alb) {
        list = list.filter((p) => alb.photoIds.includes(p.id));
      }
    }

    if (selectedArrangement === 'chronological') {
      list.sort((a, b) => new Date(a.dateTaken).getTime() - new Date(b.dateTaken).getTime());
    } else if (selectedArrangement === 'location') {
      list.sort((a, b) => a.locationName.localeCompare(b.locationName));
    } else if (selectedArrangement === 'color') {
      const colorOrder = [
        'warm',
        'golden',
        'earthy',
        'rose',
        'green',
        'blue',
        'monochrome',
        'purple',
      ];
      list.sort((a, b) => colorOrder.indexOf(a.colorFamily) - colorOrder.indexOf(b.colorFamily));
    }

    return list;
  }, [photos, albums, selectedAlbumId, selectedArrangement]);

  // Check mobile device
  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Update default author name when currentUser changes
  useEffect(() => {
    if (currentUser) {
      setNewNoteAuthorName(currentUser.displayName);
    } else if (friends.length > 0) {
      setNewNoteAuthorName(friends[0].name);
    }
  }, [currentUser, friends]);

  // Three.js Scene Setup & Loop
  useEffect(() => {
    if (!mountRef.current) return;

    let isDisposed = false;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 580;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf6f1ea);
    scene.fog = new THREE.FogExp2(0xf6f1ea, 0.032);

    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 100);
    camera.position.set(0, 1.6, 2.2);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xfff6ec, 0.9);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffecd2, 1.25);
    dirLight.position.set(5, 12, 10);
    dirLight.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      dirLight.shadow.mapSize.width = 1024;
      dirLight.shadow.mapSize.height = 1024;
      dirLight.shadow.bias = -0.0005;
    }
    scene.add(dirLight);

    // Floor Canvas Texture
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 512;
    floorCanvas.height = 512;
    const fctx = floorCanvas.getContext('2d')!;
    fctx.fillStyle = '#8B5A2B';
    fctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 512; i += 64) {
      fctx.fillStyle = i % 128 === 0 ? '#7A4D24' : '#946130';
      fctx.fillRect(0, i, 512, 62);
      fctx.fillStyle = 'rgba(0,0,0,0.15)';
      fctx.fillRect(0, i + 62, 512, 2);
    }
    const floorTexture = new THREE.CanvasTexture(floorCanvas);
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(4, 24);
    floorTexture.colorSpace = THREE.SRGBColorSpace;

    const hallwayWidth = 5.2;
    const hallwayHeight = 3.8;
    const spacing = 3.4;
    const photoCount = museumPhotos.length;
    const hallwayLength = Math.max(30, (photoCount / 2) * spacing + 14);

    const floorGeo = new THREE.PlaneGeometry(hallwayWidth, hallwayLength);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.45,
      metalness: 0.05,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(0, 0, -hallwayLength / 2 + 3);
    floorMesh.receiveShadow = !isSoftwareGl;
    scene.add(floorMesh);

    const ceilingGeo = new THREE.PlaneGeometry(hallwayWidth, hallwayLength);
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0xfdfaf5, roughness: 0.9 });
    const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceilingMesh.rotation.x = Math.PI / 2;
    ceilingMesh.position.set(0, hallwayHeight, -hallwayLength / 2 + 3);
    scene.add(ceilingMesh);

    const wallGeo = new THREE.PlaneGeometry(hallwayLength, hallwayHeight);
    const wallMatLeft = new THREE.MeshStandardMaterial({ color: 0xf7f2e8, roughness: 0.85 });
    const wallMatRight = new THREE.MeshStandardMaterial({ color: 0xf7f2e8, roughness: 0.85 });

    const leftWall = new THREE.Mesh(wallGeo, wallMatLeft);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-hallwayWidth / 2, hallwayHeight / 2, -hallwayLength / 2 + 3);
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(wallGeo, wallMatRight);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(hallwayWidth / 2, hallwayHeight / 2, -hallwayLength / 2 + 3);
    scene.add(rightWall);

    const endWallGeo = new THREE.PlaneGeometry(hallwayWidth, hallwayHeight);
    const endWallMat = new THREE.MeshStandardMaterial({ color: 0xeee6d8, roughness: 0.8 });
    const backWall = new THREE.Mesh(endWallGeo, endWallMat);
    backWall.position.set(0, hallwayHeight / 2, 3);
    scene.add(backWall);

    const frontEndWall = new THREE.Mesh(endWallGeo, endWallMat);
    frontEndWall.rotation.y = Math.PI;
    frontEndWall.position.set(0, hallwayHeight / 2, -hallwayLength + 3);
    scene.add(frontEndWall);

    // Wall Lights
    for (let z = 0; z > -hallwayLength + 4; z -= 6.8) {
      const pointLight = new THREE.PointLight(0xffdfba, 1.25, 9);
      pointLight.position.set(0, hallwayHeight - 0.4, z);
      scene.add(pointLight);

      const lanternGeo = new THREE.CylinderGeometry(0.2, 0.35, 0.3, 8);
      const lanternMat = new THREE.MeshStandardMaterial({
        color: 0x2d241e,
        metalness: 0.5,
        roughness: 0.3,
      });
      const lantern = new THREE.Mesh(lanternGeo, lanternMat);
      lantern.position.set(0, hallwayHeight - 0.2, z);
      scene.add(lantern);
    }

    const frameObjects: { mesh: THREE.Mesh; photo: Photo; position: THREE.Vector3 }[] = [];
    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin('anonymous');

    // Reliably load photo texture onto wall frames
    const loadPhotoTexture = (photo: Photo) => {
      // 1. Initial crisp canvas with dominant color so texture is never black or blank while loading
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = photo.dominantColor || '#3E2A1E';
      ctx.fillRect(0, 0, 512, 512);

      // Subtle warm vignette
      const grad = ctx.createLinearGradient(0, 0, 512, 512);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);

      // Title placeholder
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 22px serif';
      ctx.textAlign = 'center';
      ctx.fillText(photo.title.slice(0, 26), 256, 256);

      const canvasTexture = new THREE.CanvasTexture(canvas);
      canvasTexture.colorSpace = THREE.SRGBColorSpace;

      // 2. Load the full resolution photo image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (isDisposed) return;
        ctx.clearRect(0, 0, 512, 512);
        ctx.drawImage(img, 0, 0, 512, 512);
        canvasTexture.needsUpdate = true;
      };
      img.onerror = () => {
        // If anonymous crossOrigin was rejected, try loading without crossOrigin
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          if (isDisposed) return;
          try {
            ctx.clearRect(0, 0, 512, 512);
            ctx.drawImage(fallbackImg, 0, 0, 512, 512);
            canvasTexture.needsUpdate = true;
          } catch {
            // Tainted canvas ignore
          }
        };
        fallbackImg.src = photo.url;
      };
      img.src = photo.url;

      return canvasTexture;
    };

    const makePlaqueTexture = (photo: Photo, isMystery: boolean) => {
      const pCanvas = document.createElement('canvas');
      pCanvas.width = 512;
      pCanvas.height = 140;
      const pctx = pCanvas.getContext('2d')!;

      pctx.fillStyle = '#EFE6D9';
      pctx.fillRect(0, 0, 512, 140);
      pctx.strokeStyle = '#2D241E';
      pctx.lineWidth = 6;
      pctx.strokeRect(4, 4, 504, 132);

      pctx.textAlign = 'center';
      pctx.fillStyle = '#2D241E';

      if (isMystery && visitorMode) {
        pctx.font = 'bold 26px serif';
        pctx.fillText('? MYSTERY LOCATION ?', 256, 50);
        pctx.font = 'italic 18px serif';
        pctx.fillStyle = '#235478';
        pctx.fillText('Inspect photo & drop pin on map', 256, 92);
      } else {
        pctx.font = 'bold 24px serif';
        pctx.fillText(photo.title.slice(0, 32), 256, 45);
        pctx.font = 'italic 18px serif';
        pctx.fillStyle = '#7A6958';
        const subtext =
          photo.customMuseumDescription || `${photo.locationName.slice(0, 30)} • ${photo.year}`;
        pctx.fillText(subtext.slice(0, 38), 256, 85);

        const notesCount = photo.speechBubbleNotes?.length || 0;
        if (notesCount > 0) {
          pctx.font = 'bold 15px sans-serif';
          pctx.fillStyle = '#B83A28';
          pctx.fillText(`💬 ${notesCount} Friend Note${notesCount > 1 ? 's' : ''}`, 256, 118);
        } else if (photo.solvedByFriends?.includes(selectedFriend.id)) {
          pctx.fillStyle = '#15803D';
          pctx.fillText('✓ Solved by ' + selectedFriend.name, 256, 118);
        }
      }

      const pTexture = new THREE.CanvasTexture(pCanvas);
      pTexture.colorSpace = THREE.SRGBColorSpace;
      return pTexture;
    };

    const frameOuterWidth = 1.48;
    const frameOuterHeight = 1.68;
    const pictureWidth = 1.28;
    const pictureHeight = 1.48;

    museumPhotos.forEach((photo, idx) => {
      const isLeft = idx % 2 === 0;
      const pairIndex = Math.floor(idx / 2);
      const zPos = -pairIndex * spacing;
      const xPos = isLeft ? -hallwayWidth / 2 + 0.05 : hallwayWidth / 2 - 0.05;
      const rotY = isLeft ? Math.PI / 2 : -Math.PI / 2;

      const frameColor =
        selectedArrangement === 'color' && photo.dominantColor ? photo.dominantColor : '#2A1F18';

      // Group holding the complete artwork assembly facing the hallway
      const artworkGroup = new THREE.Group();
      artworkGroup.position.set(xPos, 1.85, zPos);
      artworkGroup.rotation.y = rotY;

      // 1. Outer wooden molding frame
      const frameMoldingGeo = new THREE.BoxGeometry(frameOuterWidth, frameOuterHeight, 0.06);
      const frameMoldingMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(frameColor),
        roughness: 0.35,
        metalness: 0.15,
      });
      const frameMoldingMesh = new THREE.Mesh(frameMoldingGeo, frameMoldingMat);
      frameMoldingMesh.castShadow = !isSoftwareGl;
      artworkGroup.add(frameMoldingMesh);

      // 2. Off-white museum matting surround
      const mattingGeo = new THREE.PlaneGeometry(frameOuterWidth - 0.08, frameOuterHeight - 0.08);
      const mattingMat = new THREE.MeshStandardMaterial({
        color: 0xfdfbf7,
        roughness: 0.85,
      });
      const mattingMesh = new THREE.Mesh(mattingGeo, mattingMat);
      mattingMesh.position.set(0, 0, 0.031);
      artworkGroup.add(mattingMesh);

      // 3. The actual photo artwork canvas (Facing +Z directly into the room!)
      const isMystery = !!photo.isMysteryFrame;
      const photoTexture = loadPhotoTexture(photo);
      const photoMat = new THREE.MeshStandardMaterial({
        map: photoTexture,
        roughness: 0.2,
        metalness: 0.0,
      });
      const photoMesh = new THREE.Mesh(new THREE.PlaneGeometry(pictureWidth, pictureHeight), photoMat);
      photoMesh.position.set(0, 0, 0.033);
      artworkGroup.add(photoMesh);

      // 4. Picture spotlight above the frame illuminating the photo brightly
      const pictureLight = new THREE.PointLight(0xfff6ea, 0.95, 3.8);
      pictureLight.position.set(0, 0.95, 0.32);
      artworkGroup.add(pictureLight);

      // 5. Museum info plaque below the frame
      const plaqueMat = new THREE.MeshStandardMaterial({
        map: makePlaqueTexture(photo, isMystery),
        roughness: 0.4,
      });
      const plaqueMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.23), plaqueMat);
      plaqueMesh.position.set(0, -1.02, 0.032);
      artworkGroup.add(plaqueMesh);

      scene.add(artworkGroup);

      frameObjects.push({
        mesh: photoMesh,
        photo,
        position: new THREE.Vector3(xPos, 1.85, zPos),
      });
    });

    frameObjectsRef.current = frameObjects;

    // Empty future frames at hallway end
    const endEmptyZ = -Math.floor(photoCount / 2) * spacing - spacing;
    [-1, 1].forEach((side) => {
      const emptyGroup = new THREE.Group();
      emptyGroup.position.set(
        side < 0 ? -hallwayWidth / 2 + 0.05 : hallwayWidth / 2 - 0.05,
        1.85,
        endEmptyZ
      );
      emptyGroup.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;

      const emptyBorderGeo = new THREE.BoxGeometry(frameOuterWidth, frameOuterHeight, 0.06);
      const emptyBorderMat = new THREE.MeshStandardMaterial({ color: 0xbfa893 });
      const borderMesh = new THREE.Mesh(emptyBorderGeo, emptyBorderMat);
      emptyGroup.add(borderMesh);

      const emptyCanvas = document.createElement('canvas');
      emptyCanvas.width = 512;
      emptyCanvas.height = 512;
      const ectx = emptyCanvas.getContext('2d')!;
      ectx.fillStyle = '#EBDDC8';
      ectx.fillRect(0, 0, 512, 512);
      ectx.strokeStyle = '#2D241E';
      ectx.setLineDash([12, 8]);
      ectx.lineWidth = 4;
      ectx.strokeRect(16, 16, 480, 480);
      ectx.fillStyle = '#8C7A6B';
      ectx.font = 'italic 28px serif';
      ectx.textAlign = 'center';
      ectx.fillText('Awaiting future steps', 256, 230);
      ectx.font = 'bold 32px serif';
      ectx.fillStyle = '#B83A28';
      ectx.fillText('✨ Yet to come', 256, 290);

      const emptyTex = new THREE.CanvasTexture(emptyCanvas);
      const emptyMat = new THREE.MeshStandardMaterial({ map: emptyTex });
      const emptyPlane = new THREE.Mesh(new THREE.PlaneGeometry(pictureWidth, pictureHeight), emptyMat);
      emptyPlane.position.set(0, 0, 0.032);
      emptyGroup.add(emptyPlane);

      scene.add(emptyGroup);
    });

    const keysPressed: Record<string, boolean> = {};
    let pitch = 0;
    let yaw = 0;
    let isPointerDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const handlePointerDown = (e: PointerEvent) => {
      if (e.target === renderer.domElement) {
        isPointerDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isPointerDragging) return;
      const deltaX = e.clientX - lastMouseX;
      const deltaY = e.clientY - lastMouseY;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;

      yaw -= deltaX * 0.0035;
      pitch -= deltaY * 0.0035;
      pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitch));
    };

    const handlePointerUp = () => {
      isPointerDragging = false;
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    const minX = -hallwayWidth / 2 + 0.65;
    const maxX = hallwayWidth / 2 - 0.65;
    const maxZ = 1.5;
    const minZ = -hallwayLength + 4.5;

    let animationFrameId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      if (isDisposed) return;
      const delta = Math.min(clock.getDelta(), 0.1);

      const forward = new THREE.Vector3(0, 0, -1);
      const right = new THREE.Vector3(1, 0, 0);

      const euler = new THREE.Euler(pitch, yaw, 0, 'YXZ');
      camera.quaternion.setFromEuler(euler);

      forward.applyEuler(new THREE.Euler(0, yaw, 0, 'YXZ'));
      right.applyEuler(new THREE.Euler(0, yaw, 0, 'YXZ'));

      const move = new THREE.Vector3();
      if (keysPressed['KeyW'] || keysPressed['ArrowUp']) move.add(forward);
      if (keysPressed['KeyS'] || keysPressed['ArrowDown']) move.sub(forward);
      if (keysPressed['KeyA'] || keysPressed['ArrowLeft']) move.sub(right);
      if (keysPressed['KeyD'] || keysPressed['ArrowRight']) move.add(right);

      if (moveVectorRef.current.y !== 0) {
        move.addScaledVector(forward, -moveVectorRef.current.y);
      }
      if (moveVectorRef.current.x !== 0) {
        move.addScaledVector(right, moveVectorRef.current.x);
      }

      if (move.lengthSq() > 0) {
        move.normalize();
        const moveSpeed = 3.6;
        camera.position.addScaledVector(move, moveSpeed * delta);
        camera.position.x = Math.max(minX, Math.min(maxX, camera.position.x));
        camera.position.z = Math.max(minZ, Math.min(maxZ, camera.position.z));
      }

      // Automatically identify closest photo in viewing range without needing click
      let closestPhoto: Photo | null = null;
      let closestDist = 2.8;
      let targetPos: THREE.Vector3 | null = null;

      for (const item of frameObjects) {
        const dist = camera.position.distanceTo(item.position);
        if (dist < closestDist) {
          closestDist = dist;
          closestPhoto = item.photo;
          targetPos = item.position;
        }
      }

      setNearbyPhoto(closestPhoto);
      setIsNearEmptyFrame(Math.abs(camera.position.z - endEmptyZ) < 2.5);

      // Project 3D frame position to 2D screen coordinate for speech bubbles
      if (targetPos && container) {
        const p = targetPos.clone();
        p.project(camera);
        if (p.z < 1) {
          const sx = ((p.x + 1) * width) / 2;
          const sy = ((-p.y + 1) * height) / 2;
          setScreenCoords({ x: sx, y: sy });
        } else {
          setScreenCoords(null);
        }
      } else {
        setScreenCoords(null);
      }

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 580;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('resize', handleResize);
      scene.clear();
      renderer.dispose();
      floorTexture.dispose();
    };
  }, [museumPhotos, selectedArrangement, visitorMode, selectedFriend]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const maxDist = 45;
    moveVectorRef.current = {
      x: Math.max(-1, Math.min(1, dx / maxDist)),
      y: Math.max(-1, Math.min(1, dy / maxDist)),
    };
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
    moveVectorRef.current = { x: 0, y: 0 };
  };

  // Add friend speech bubble note
  const handleSaveSpeechNote = () => {
    if (!isAddingNoteForPhoto || !newNoteText.trim()) return;

    const newNote: MuseumSpeechNote = {
      id: `note-${Date.now()}`,
      authorName: newNoteAuthorName.trim() || currentUser?.displayName || 'Friend',
      authorAvatar:
        currentUser?.avatar ||
        selectedFriend?.avatar ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      text: newNoteText.trim(),
      createdAt: Date.now(),
    };

    const currentNotes = isAddingNoteForPhoto.speechBubbleNotes || [];
    const updated: Photo = {
      ...isAddingNoteForPhoto,
      speechBubbleNotes: [...currentNotes, newNote],
    };

    onUpdatePhoto(updated);
    setIsAddingNoteForPhoto(null);
    setNewNoteText('');
  };

  const handleOpenCustomDesc = (photo: Photo) => {
    setEditingDescriptionPhoto(photo);
    setCustomDescText(photo.customMuseumDescription || photo.note || '');
  };

  const handleSaveCustomDesc = () => {
    if (!editingDescriptionPhoto) return;
    const updated = {
      ...editingDescriptionPhoto,
      customMuseumDescription: customDescText.trim(),
    };
    onUpdatePhoto(updated);
    setEditingDescriptionPhoto(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
      {/* Museum Configuration Toolbar */}
      <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#DECDB9] flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Photos Auto-added Status Indicator */}
          <div className="flex items-center space-x-1.5 bg-white border border-[#D8C7B0] rounded-xl px-3 py-1.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span className="font-bold text-[#2D241E]">
              All {photos.length} Library Artworks Auto-Added
            </span>
          </div>

          {/* Album Selector Filter */}
          <div className="flex items-center space-x-1.5 bg-white border border-[#D8C7B0] rounded-xl px-2.5 py-1.5 shadow-2xs">
            <Filter className="w-3.5 h-3.5 text-[#235478]" />
            <select
              value={selectedAlbumId}
              onChange={(e) => setSelectedAlbumId(e.target.value)}
              className="bg-transparent outline-hidden text-[#2D241E] cursor-pointer font-medium"
            >
              <option value="all">Entire Gallery ({photos.length})</option>
              {albums.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} ({a.photoIds.length})
                </option>
              ))}
            </select>
          </div>

          {/* Hallway Arrangement */}
          <div className="flex items-center space-x-1.5 bg-white border border-[#D8C7B0] rounded-xl px-2.5 py-1.5 shadow-2xs">
            <Palette className="w-3.5 h-3.5 text-[#C28B38]" />
            <select
              value={selectedArrangement}
              onChange={(e) => setSelectedArrangement(e.target.value as ArrangementType)}
              className="bg-transparent outline-hidden text-[#2D241E] cursor-pointer font-medium"
            >
              <option value="chronological">Chronological Order</option>
              <option value="location">By Location</option>
              <option value="color">By Color Spectrum</option>
            </select>
          </div>

          {/* Toggle to Hide / Show Speech Bubble Notes */}
          <button
            onClick={() => setShowSpeechNotes(!showSpeechNotes)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border font-semibold transition-all shadow-2xs ${
              showSpeechNotes
                ? 'bg-[#FAF0ED] text-[#B83A28] border-[#ECCDC5]'
                : 'bg-white text-[#7A6958] border-[#D8C7B0]'
            }`}
            title="Toggle speech bubbles left by friends around photo frames"
          >
            {showSpeechNotes ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{showSpeechNotes ? 'Notes Visible' : 'Notes Hidden'}</span>
          </button>

          {/* Visitor Mode Toggle */}
          <button
            onClick={() => setVisitorMode(!visitorMode)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border font-semibold transition-all shadow-2xs ${
              visitorMode
                ? 'bg-[#235478] text-white border-[#235478]'
                : 'bg-white text-[#4A3B2B] border-[#D8C7B0]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{visitorMode ? `Visiting as Friend` : `Curator Mode`}</span>
          </button>

          {visitorMode && (
            <select
              value={selectedFriend.id}
              onChange={(e) => {
                const found = friends.find((f) => f.id === e.target.value);
                if (found) setSelectedFriend(found);
              }}
              className="bg-white border border-[#235478] text-[#235478] font-bold rounded-xl px-2 py-1 outline-hidden shadow-2xs"
            >
              {friends.map((f) => (
                <option key={f.id} value={f.id}>
                  👤 {f.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <button
          onClick={() => setShowLeaderboard(!showLeaderboard)}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#FAF0ED] text-[#B83A28] border border-[#ECCDC5] font-semibold shadow-2xs"
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Leaderboard</span>
        </button>
      </div>

      {/* 3D Walkable Viewport */}
      <div className="relative w-full h-[560px] sm:h-[620px] rounded-3xl overflow-hidden border-2 border-[#D8C7B0] shadow-2xl bg-[#EAE2D7]">
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Desktop HUD Guide */}
        <div className="absolute top-4 left-4 z-10 bg-[#FFFDF9]/90 backdrop-blur-xs border border-[#DECDB9] rounded-2xl px-3.5 py-2.5 text-[11px] text-[#5A4B3C] shadow-sm pointer-events-none hidden sm:block">
          <p className="font-bold text-[#2D241E] font-mono">✦ 3D GALLERY CONTROLS</p>
          <p>
            • Move: <span className="font-semibold text-[#B83A28]">W A S D</span> / Arrows
          </p>
          <p>• Look: Click & Drag Mouse</p>
          <p className="text-[10px] text-[#7A6958] mt-1">
            ✦ Walk up to any frame: details reveal automatically!
          </p>
        </div>

        {/* Visitor Mode Badge */}
        {visitorMode && (
          <div className="absolute top-4 right-4 z-10 flex items-center space-x-2 bg-[#235478]/95 text-white px-3.5 py-1.5 rounded-2xl text-xs font-semibold shadow-lg">
            <img
              src={selectedFriend.avatar}
              alt={selectedFriend.name}
              className="w-5 h-5 rounded-full object-cover border border-white"
            />
            <span>Visiting as {selectedFriend.name}</span>
          </div>
        )}

        {/* FLOATING SPEECH BUBBLE NOTES OVER 3D SCENE (Around the active photo frame) */}
        {showSpeechNotes && nearbyPhoto && nearbyPhoto.speechBubbleNotes && nearbyPhoto.speechBubbleNotes.length > 0 && (
          <div className="absolute top-16 right-4 sm:right-8 z-20 max-w-xs space-y-2 pointer-events-auto animate-fade-in">
            <div className="text-[10px] uppercase font-mono tracking-wider font-bold text-[#B83A28] bg-white/90 px-2 py-0.5 rounded-md inline-block shadow-xs border border-[#DECDB9]">
              💬 Friend Notes on this Frame
            </div>
            {nearbyPhoto.speechBubbleNotes.map((note) => (
              <div
                key={note.id}
                className="relative bg-white text-[#2C241E] p-3 rounded-2xl rounded-tr-xs shadow-xl border-2 border-[#B83A28] flex items-start space-x-2.5 animate-slide-up"
              >
                <img
                  src={note.authorAvatar}
                  alt={note.authorName}
                  className="w-7 h-7 rounded-full object-cover border border-[#DECDB9] shrink-0"
                />
                <div className="text-xs">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-[#2C241E]">{note.authorName}</span>
                    <span className="text-[10px] text-[#8C7A6B]">
                      {new Date(note.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-[#4A3D2F] font-serif-vintage mt-0.5 leading-snug">
                    "{note.text}"
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AUTOMATIC FLOATING ARTWORK DISPLAY (Reveals photo details without having to click!) */}
        {nearbyPhoto && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[94%] max-w-2xl bg-[#FFFDF9]/95 backdrop-blur-md border-2 border-[#2D241E] rounded-3xl p-4 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
            {/* Thumbnail and title info */}
            <div className="flex items-center space-x-3.5 overflow-hidden w-full sm:w-auto">
              <img
                src={nearbyPhoto.url}
                alt={nearbyPhoto.title}
                className="w-16 h-16 rounded-xl object-cover border border-[#DECDB9] shadow-xs shrink-0 cursor-pointer hover:scale-105 transition-transform"
                onClick={() => onInspectPhoto(nearbyPhoto)}
              />
              <div className="truncate">
                <span className="text-[10px] font-mono uppercase font-bold text-[#B83A28] block">
                  {nearbyPhoto.isMysteryFrame && visitorMode ? '📍 Mystery Frame' : 'Gallery Artwork'}
                </span>
                <h4 className="text-sm sm:text-base font-bold text-[#2D241E] truncate font-serif-vintage">
                  {nearbyPhoto.isMysteryFrame && visitorMode
                    ? 'Where was this photo taken?'
                    : nearbyPhoto.title}
                </h4>
                <p className="text-xs text-[#7A6958] truncate">
                  {nearbyPhoto.customMuseumDescription ||
                    `${nearbyPhoto.locationName} • ${nearbyPhoto.year}`}
                </p>
              </div>
            </div>

            {/* ACTION BUTTONS DIRECTLY IN MUSEUM: Bury, Bottle, Send, Add Note */}
            <div className="flex flex-wrap items-center gap-1.5 shrink-0 self-end sm:self-center w-full sm:w-auto justify-end">
              {/* Add Note Button for Friends */}
              <button
                onClick={() => {
                  setIsAddingNoteForPhoto(nearbyPhoto);
                  setNewNoteText('');
                }}
                className="px-2.5 py-1.5 rounded-xl border border-[#D8C7B0] bg-[#FAF5EB] hover:bg-white text-[#2C241E] text-xs font-semibold flex items-center space-x-1 shadow-2xs transition-colors"
                title="Add a speech bubble note as a friend"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#B83A28]" />
                <span>+ Note</span>
              </button>

              {/* Bury Treasure Button */}
              {onBuryAsTreasure && (
                <button
                  onClick={() => onBuryAsTreasure(nearbyPhoto)}
                  className="px-2.5 py-1.5 rounded-xl border border-[#DECDB9] bg-[#FAF5EB] hover:bg-amber-50 text-[#8C6228] text-xs font-semibold flex items-center space-x-1 shadow-2xs transition-colors"
                  title="Bury this photo as a hidden treasure at its coordinates"
                >
                  <Compass className="w-3.5 h-3.5 text-[#C28B38]" />
                  <span>Bury</span>
                </button>
              )}

              {/* Message in a Bottle Button */}
              {onSendAsBottle && (
                <button
                  onClick={() => onSendAsBottle(nearbyPhoto)}
                  className="px-2.5 py-1.5 rounded-xl border border-[#DECDB9] bg-[#FAF5EB] hover:bg-blue-50 text-[#235478] text-xs font-semibold flex items-center space-x-1 shadow-2xs transition-colors"
                  title="Cast this photo into the digital ocean as a message in a bottle"
                >
                  <Waves className="w-3.5 h-3.5 text-[#235478]" />
                  <span>Bottle</span>
                </button>
              )}

              {/* Send to Friend Button */}
              {onSendToFriend && (
                <button
                  onClick={() => {
                    setSendingPhoto(nearbyPhoto);
                  }}
                  className="px-2.5 py-1.5 rounded-xl border border-[#DECDB9] bg-[#FAF5EB] hover:bg-rose-50 text-[#B83A28] text-xs font-semibold flex items-center space-x-1 shadow-2xs transition-colors"
                  title="Send this photo directly to a friend"
                >
                  <Send className="w-3.5 h-3.5 text-[#B83A28]" />
                  <span>Send</span>
                </button>
              )}

              {/* Plaque Edit (Curator) */}
              {!visitorMode && (
                <button
                  onClick={() => handleOpenCustomDesc(nearbyPhoto)}
                  className="p-1.5 rounded-xl border border-[#DECDB9] bg-[#FAF5EB] hover:bg-white text-[#5A4B3C]"
                  title="Edit custom description for museum plaque"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Guess or Full Inspect */}
              {nearbyPhoto.isMysteryFrame && visitorMode ? (
                <button
                  onClick={() => setGuessTargetPhoto(nearbyPhoto)}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#235478] hover:bg-[#1A4260] rounded-xl shadow-xs"
                >
                  Guess Spot!
                </button>
              ) : (
                <button
                  onClick={() => onInspectPhoto(nearbyPhoto)}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-[#2D241E] hover:bg-black rounded-xl shadow-xs"
                >
                  Inspect
                </button>
              )}
            </div>
          </div>
        )}

        {/* Near Empty Frame Alert */}
        {isNearEmptyFrame && !nearbyPhoto && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-[#FFFDF9]/95 backdrop-blur-xs border border-[#DECDB9] rounded-2xl px-5 py-2.5 shadow-xl text-xs text-[#6A5A4B] text-center font-serif-vintage animate-fade-in">
            ✨ Empty frames ahead — reserved for future voyages and memories yet to come.
          </div>
        )}

        {/* Mobile Joystick */}
        {isMobile && (
          <div
            className="absolute bottom-6 left-6 z-20 w-24 h-24 rounded-full bg-white/40 border-2 border-white/80 backdrop-blur-xs flex items-center justify-center touch-none select-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="w-10 h-10 rounded-full bg-[#2D241E]/80 border-2 border-white shadow-md flex items-center justify-center text-white text-[10px] font-bold">
              MOVE
            </div>
          </div>
        )}
      </div>

      {/* ADD SPEECH BUBBLE NOTE MODAL */}
      {isAddingNoteForPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-[#FFFDF9] rounded-3xl border-2 border-[#D8C7B0] p-6 shadow-2xl relative space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE0D1]">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-[#B83A28]" />
                <h3 className="text-base font-bold font-serif-vintage text-[#2D241E]">
                  Add Friend Speech Bubble
                </h3>
              </div>
              <button
                onClick={() => setIsAddingNoteForPhoto(null)}
                className="text-[#8C7A6B] hover:text-[#2D241E]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-[#FAF5EB] rounded-2xl border border-[#DECDB9]">
              <img
                src={isAddingNoteForPhoto.url}
                alt={isAddingNoteForPhoto.title}
                className="w-12 h-12 rounded-xl object-cover"
              />
              <div className="truncate">
                <h4 className="font-bold text-xs text-[#2D241E] truncate">
                  {isAddingNoteForPhoto.title}
                </h4>
                <p className="text-[11px] text-[#7A6958] truncate">
                  {isAddingNoteForPhoto.locationName}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5A4B3C] mb-1">Your Name</label>
              <input
                type="text"
                value={newNoteAuthorName}
                onChange={(e) => setNewNoteAuthorName(e.target.value)}
                placeholder="e.g. Clara, Kenji, or your name"
                className="w-full text-xs px-3 py-2 rounded-xl border border-[#DECDB9] bg-[#FAF5EB] outline-hidden focus:border-[#B83A28]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5A4B3C] mb-1">
                Speech Bubble Note
              </label>
              <textarea
                rows={3}
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Leave a memorable remark, friendly reaction, or thought on this picture..."
                className="w-full text-xs font-serif-vintage text-base p-3 bg-[#FAF5EB] border border-[#DECDB9] rounded-2xl outline-hidden focus:border-[#B83A28] resize-none leading-relaxed"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-[#EAE0D1]">
              <button
                onClick={() => setIsAddingNoteForPhoto(null)}
                className="px-3 py-1.5 text-xs text-[#7A6958]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSpeechNote}
                className="px-4 py-2 text-xs font-bold text-white bg-[#B83A28] hover:bg-[#9E2F20] rounded-xl shadow-xs flex items-center space-x-1"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Pin Speech Bubble</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEND TO FRIEND MODAL FROM INSIDE MUSEUM */}
      {sendingPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-[#FFFDF9] rounded-3xl border-2 border-[#D8C7B0] p-6 shadow-2xl relative space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE0D1]">
              <div className="flex items-center space-x-2">
                <Send className="w-5 h-5 text-[#B83A28]" />
                <h3 className="text-base font-bold font-serif-vintage text-[#2D241E]">
                  Send Museum Artwork to Friend
                </h3>
              </div>
              <button
                onClick={() => setSendingPhoto(null)}
                className="text-[#8C7A6B] hover:text-[#2D241E]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-[#FAF5EB] rounded-2xl border border-[#DECDB9]">
              <img
                src={sendingPhoto.url}
                alt={sendingPhoto.title}
                className="w-14 h-14 rounded-xl object-cover"
              />
              <div className="truncate">
                <h4 className="font-bold text-xs text-[#2D241E] truncate">
                  {sendingPhoto.title}
                </h4>
                <p className="text-[11px] text-[#7A6958] truncate">{sendingPhoto.locationName}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5A4B3C] mb-2">
                Select Recipient Friend
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {friends.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSendTargetFriend(f)}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                      sendTargetFriend.id === f.id
                        ? 'border-[#B83A28] bg-[#FAF0ED]'
                        : 'border-[#DECDB9] bg-white hover:bg-[#FAF5EB]'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <img
                        src={f.avatar}
                        alt={f.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-xs font-bold text-[#2D241E]">{f.name}</p>
                        <p className="text-[10px] text-[#7A6958]">{f.homeCity}</p>
                      </div>
                    </div>
                    {sendTargetFriend.id === f.id && (
                      <span className="text-[10px] font-bold text-[#B83A28]">✓ Selected</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-[#EAE0D1]">
              <button
                onClick={() => setSendingPhoto(null)}
                className="px-3 py-1.5 text-xs text-[#7A6958]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onSendToFriend && sendingPhoto) {
                    onSendToFriend(sendingPhoto, sendTargetFriend);
                    setSendingPhoto(null);
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-[#B83A28] hover:bg-[#9E2F20] rounded-xl shadow-xs flex items-center space-x-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send to {sendTargetFriend.name}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM DESCRIPTION EDIT MODAL */}
      {editingDescriptionPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-[#FFFDF9] rounded-3xl border-2 border-[#D8C7B0] p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE0D1]">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-[#B83A28]" />
                <h3 className="text-base font-bold font-serif-vintage text-[#2D241E]">
                  Edit Museum Plaque Description
                </h3>
              </div>
              <button
                onClick={() => setEditingDescriptionPhoto(null)}
                className="text-[#8C7A6B] hover:text-[#2D241E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center space-x-3 p-2.5 bg-[#FAF5EB] rounded-2xl border border-[#DECDB9]">
              <img
                src={editingDescriptionPhoto.url}
                alt={editingDescriptionPhoto.title}
                className="w-12 h-12 rounded-xl object-cover"
              />
              <div className="truncate">
                <h4 className="font-bold text-xs text-[#2D241E] truncate">
                  {editingDescriptionPhoto.title}
                </h4>
                <p className="text-[11px] text-[#7A6958] truncate">
                  {editingDescriptionPhoto.locationName}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5A4B3C] mb-1">
                Custom Gallery Plaque Story
              </label>
              <textarea
                rows={3}
                value={customDescText}
                onChange={(e) => setCustomDescText(e.target.value)}
                placeholder="Write a custom curator caption or field memory for this plaque..."
                className="w-full text-xs font-serif-vintage text-base p-3 bg-[#FAF5EB] border border-[#DECDB9] rounded-2xl outline-hidden focus:border-[#B83A28] resize-none leading-relaxed"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-[#EAE0D1]">
              <button
                onClick={() => setEditingDescriptionPhoto(null)}
                className="px-3 py-1.5 text-xs text-[#7A6958]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustomDesc}
                className="px-4 py-2 text-xs font-bold text-white bg-[#B83A28] hover:bg-[#9E2F20] rounded-xl shadow-xs flex items-center space-x-1"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Plaque Note</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-[#FFFDF9] rounded-3xl border-2 border-[#D8C7B0] p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE0D1]">
              <div className="flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-[#B83A28]" />
                <h3 className="text-base font-bold font-serif-vintage text-[#2D241E]">
                  Guess-The-Spot Leaderboard
                </h3>
              </div>
              <button onClick={() => setShowLeaderboard(false)} className="text-[#8C7A6B]">
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {friends.map((f, i) => {
                const logs = guessLogs.filter((l) => l.friendId === f.id);
                const totalScore = logs.reduce((sum, l) => sum + l.score, 0);
                const bullseyes = logs.filter((l) => l.accuracy === 'bullseye').length;

                return (
                  <div
                    key={f.id}
                    className="p-3 bg-white border border-[#E5DAC8] rounded-2xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className="font-bold text-[#8C7A6B]">#{i + 1}</span>
                      <img
                        src={f.avatar}
                        alt={f.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div>
                        <h4 className="font-bold text-[#2D241E]">{f.name}</h4>
                        <p className="text-[10px] text-[#7A6958]">
                          {logs.length} guesses • {bullseyes} bullseyes
                        </p>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-[#B83A28]">
                      {totalScore.toLocaleString()} pts
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2 border-t border-[#EAE0D1]">
              <button
                onClick={() => setShowLeaderboard(false)}
                className="px-4 py-1.5 text-xs bg-[#EFE8DD] rounded-xl font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guess-The-Spot Pin Dropping Modal */}
      <GuessTheSpotModal
        photo={guessTargetPhoto}
        friend={selectedFriend}
        isOpen={!!guessTargetPhoto}
        onClose={() => setGuessTargetPhoto(null)}
        onRecordGuess={(entry) => {
          onRecordGuess(entry);
          if (guessTargetPhoto) {
            const solved = guessTargetPhoto.solvedByFriends || [];
            if (!solved.includes(selectedFriend.id)) {
              onUpdatePhoto({
                ...guessTargetPhoto,
                solvedByFriends: [...solved, selectedFriend.id],
              });
            }
          }
        }}
        onReportPhoto={onReportPhoto}
      />
    </div>
  );
};
