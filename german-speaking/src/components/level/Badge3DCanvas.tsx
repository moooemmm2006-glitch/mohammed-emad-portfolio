"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, RoundedBox } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import { CanvasTexture, Color, type Group } from "three";

// The level's glossy 3D tile. Loaded on its own (next/dynamic, no SSR), only when 3D effects are on.

/** The level code drawn into a texture (no font files to download). */
function useLabel(label: string) {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d")!;
    g.fillStyle = "#ffffff";
    g.font = "800 132px Inter, system-ui, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.shadowColor = "rgba(0,0,0,0.25)";
    g.shadowBlur = 8;
    g.fillText(label, 128, 138);
    const tex = new CanvasTexture(c);
    tex.anisotropy = 4;
    return tex;
  }, [label]);
}

function Tile({ color, label, pointer }: { color: string; label: string; pointer: React.RefObject<{ x: number; y: number }> }) {
  const group = useRef<Group>(null);
  const tex = useLabel(label);
  useEffect(() => () => tex.dispose(), [tex]);
  const base = useMemo(() => new Color(color), [color]);
  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    // A slow sway plus a tilt toward the pointer / the phone's tilt.
    const p = pointer.current ?? { x: 0, y: 0 };
    const ty = Math.sin(t * 0.6) * 0.45 + p.x * 0.5;
    const tx = Math.cos(t * 0.5) * 0.12 - p.y * 0.35;
    g.rotation.y += (ty - g.rotation.y) * Math.min(1, dt * 3);
    g.rotation.x += (tx - g.rotation.x) * Math.min(1, dt * 3);
  });
  return (
    <Float speed={1.4} rotationIntensity={0.15} floatIntensity={0.5}>
      <group ref={group}>
        <RoundedBox args={[1.7, 1.7, 0.5]} radius={0.26} smoothness={5}>
          <meshPhysicalMaterial color={base} roughness={0.22} metalness={0.15} clearcoat={1} clearcoatRoughness={0.12} />
        </RoundedBox>
        <mesh position={[0, 0, 0.256]}>
          <planeGeometry args={[1.35, 1.35]} />
          <meshBasicMaterial map={tex} transparent />
        </mesh>
      </group>
    </Float>
  );
}

export default function Badge3DCanvas({ color, label }: { color: string; label: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      pointer.current = { x: (e.clientX / innerWidth) * 2 - 1, y: (e.clientY / innerHeight) * 2 - 1 };
    };
    const tilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      pointer.current = { x: Math.max(-1, Math.min(1, e.gamma / 30)), y: Math.max(-1, Math.min(1, (e.beta - 45) / 30)) };
    };
    addEventListener("pointermove", move, { passive: true });
    addEventListener("deviceorientation", tilt, { passive: true });
    // Don't render frames while scrolled away or in a background tab.
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (wrap.current) io.observe(wrap.current);
    const vis = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", vis);
    return () => {
      removeEventListener("pointermove", move);
      removeEventListener("deviceorientation", tilt);
      document.removeEventListener("visibilitychange", vis);
      io.disconnect();
    };
  }, []);

  return (
    <div ref={wrap} className="w-full h-full">
      <Canvas
        frameloop={visible ? "always" : "never"}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
        camera={{ position: [0, 0, 4.2], fov: 34 }}
        aria-hidden="true"
      >
        <ambientLight intensity={0.55} />
        <directionalLight position={[3, 4, 5]} intensity={1.7} />
        <pointLight position={[-3, -2, 3]} intensity={18} color="#ffffff" />
        <Tile color={color} label={label} pointer={pointer} />
      </Canvas>
    </div>
  );
}
