import { useEffect, useRef } from "react";
import * as THREE from "three";

const PARTICLE_COUNT = 2000;
const CONNECT_DIST = 150;
const TEAL = new THREE.Color("#00c6a7");

export function ParticleField() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Detect mobile -> bail out, render gradient instead
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    if (isMobile) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#080c14");

    const camera = new THREE.PerspectiveCamera(60, width / height, 1, 2000);
    camera.position.z = 600;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // Particles
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    const basePositions = new Float32Array(PARTICLE_COUNT * 3);
    const range = 800;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const x = (Math.random() - 0.5) * range;
      const y = (Math.random() - 0.5) * range;
      const z = (Math.random() - 0.5) * range;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      basePositions[i * 3] = x;
      basePositions[i * 3 + 1] = y;
      basePositions[i * 3 + 2] = z;
      velocities[i * 3] = (Math.random() - 0.5) * 0.3;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.3;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
    }

    const pGeom = new THREE.BufferGeometry();
    pGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 2.2,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(pGeom, pMat);
    scene.add(points);

    // Lines (preallocated)
    const MAX_LINES = 1500;
    const linePositions = new Float32Array(MAX_LINES * 2 * 3);
    const lineGeom = new THREE.BufferGeometry();
    lineGeom.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: TEAL,
      transparent: true,
      opacity: 0.1,
    });
    const lineSegments = new THREE.LineSegments(lineGeom, lineMat);
    scene.add(lineSegments);
    lineGeom.setDrawRange(0, 0);

    // Mouse
    const mouse = new THREE.Vector2(-9999, -9999);
    const mouseWorld = new THREE.Vector3();
    const onMouseMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };
    const burstParticles: number[] = [];
    const onClick = () => {
      // Pick 100 random particles to burst
      for (let n = 0; n < 100; n++) {
        const i = Math.floor(Math.random() * PARTICLE_COUNT);
        burstParticles.push(i, performance.now() as number);
        velocities[i * 3] = (Math.random() - 0.5) * 8;
        velocities[i * 3 + 1] = (Math.random() - 0.5) * 8;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 8;
      }
    };
    window.addEventListener("mousemove", onMouseMove);
    renderer.domElement.addEventListener("click", onClick);

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    let visible = true;
    const onVis = () => {
      visible = !document.hidden;
      if (visible) lastTime = performance.now();
    };
    document.addEventListener("visibilitychange", onVis);

    let rafId = 0;
    let lastTime = performance.now();
    const posAttr = pGeom.getAttribute("position") as THREE.BufferAttribute;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      if (!visible) return;
      const now = performance.now();
      const delta = Math.min((now - lastTime) / 16.67, 3);
      lastTime = now;

      // Convert mouse to world space at z=0 plane
      mouseWorld.set(mouse.x, mouse.y, 0.5).unproject(camera);

      const positionsArr = posAttr.array as Float32Array;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const ix = i * 3;
        positionsArr[ix] += velocities[ix] * delta;
        positionsArr[ix + 1] += velocities[ix + 1] * delta;
        positionsArr[ix + 2] += velocities[ix + 2] * delta;

        // Drift back toward base position softly
        velocities[ix] += (basePositions[ix] - positionsArr[ix]) * 0.0005 * delta;
        velocities[ix + 1] += (basePositions[ix + 1] - positionsArr[ix + 1]) * 0.0005 * delta;
        velocities[ix + 2] += (basePositions[ix + 2] - positionsArr[ix + 2]) * 0.0005 * delta;

        // Damping
        velocities[ix] *= 0.985;
        velocities[ix + 1] *= 0.985;
        velocities[ix + 2] *= 0.985;

        // Mouse repulsion
        const dx = positionsArr[ix] - mouseWorld.x;
        const dy = positionsArr[ix + 1] - mouseWorld.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < 14000) {
          const f = (1 - distSq / 14000) * 0.6;
          velocities[ix] += (dx / Math.sqrt(distSq + 0.01)) * f;
          velocities[ix + 1] += (dy / Math.sqrt(distSq + 0.01)) * f;
        }
      }
      posAttr.needsUpdate = true;

      // Connect nearby particles (subset for perf)
      let li = 0;
      const step = 2; // sample every 2nd particle to keep cost low
      const distSqMax = CONNECT_DIST * CONNECT_DIST;
      for (let i = 0; i < PARTICLE_COUNT; i += step) {
        const ax = positionsArr[i * 3];
        const ay = positionsArr[i * 3 + 1];
        const az = positionsArr[i * 3 + 2];
        for (let j = i + step; j < PARTICLE_COUNT; j += step) {
          const bx = positionsArr[j * 3];
          const by = positionsArr[j * 3 + 1];
          const bz = positionsArr[j * 3 + 2];
          const dx = ax - bx;
          const dy = ay - by;
          const dz = az - bz;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < distSqMax) {
            if (li >= MAX_LINES) break;
            linePositions[li * 6] = ax;
            linePositions[li * 6 + 1] = ay;
            linePositions[li * 6 + 2] = az;
            linePositions[li * 6 + 3] = bx;
            linePositions[li * 6 + 4] = by;
            linePositions[li * 6 + 5] = bz;
            li++;
          }
        }
        if (li >= MAX_LINES) break;
      }
      (lineGeom.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
      lineGeom.setDrawRange(0, li * 2);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
      renderer.domElement.removeEventListener("click", onClick);
      pGeom.dispose();
      pMat.dispose();
      lineGeom.dispose();
      lineMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at center, #0a1420 0%, #080c14 60%, #050709 100%)",
      }}
    >
      {/* Mobile fallback animated gradient */}
      <div
        className="absolute inset-0 md:hidden"
        style={{
          background:
            "linear-gradient(135deg, #080c14 0%, #0a2a26 35%, #00c6a7 50%, #0a2a26 65%, #080c14 100%)",
          backgroundSize: "400% 400%",
          animation: "about-gradient-shift 12s ease infinite",
        }}
      />
    </div>
  );
}
