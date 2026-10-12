"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, MeshTransmissionMaterial, RoundedBox, useTexture, Float } from "@react-three/drei";
import { useRef } from "react";
import type { Group } from "three";

function Pane({ src, position, rotation }: { src: string; position: [number, number, number]; rotation: [number, number, number] }) {
  const map = useTexture(src);
  return (
    <Float speed={1.4} rotationIntensity={0.25} floatIntensity={0.6}>
      <group position={position} rotation={rotation}>
        <RoundedBox args={[3.2, 2.4, 0.08]} radius={0.06} smoothness={6}>
          <MeshTransmissionMaterial thickness={0.4} roughness={0.08} transmission={1} ior={1.35} chromaticAberration={0.04} backside />
        </RoundedBox>
        <mesh position={[0, 0, 0.05]}>
          <planeGeometry args={[3.0, 2.2]} />
          <meshBasicMaterial map={map} toneMapped={false} />
        </mesh>
      </group>
    </Float>
  );
}

function Rig({ children }: { children: React.ReactNode }) {
  const g = useRef<Group>(null);
  useFrame(({ pointer }, dt) => {
    if (!g.current) return;
    g.current.rotation.y += (pointer.x * 0.35 - g.current.rotation.y) * Math.min(1, dt * 3);
    g.current.rotation.x += (-pointer.y * 0.2 - g.current.rotation.x) * Math.min(1, dt * 3);
  });
  return <group ref={g}>{children}</group>;
}

export default function Scene() {
  return (
    <Canvas camera={{ position: [0, 0, 7], fov: 40 }} dpr={[1, 1.75]} gl={{ antialias: true }}>
      <color attach="background" args={["#0d1012"]} />
      <Rig>
        <Pane src="/portfolio/beautasy.jpg" position={[-1.9, 0.5, 0]} rotation={[0, 0.35, 0]} />
        <Pane src="/portfolio/silkbees.jpg" position={[1.9, -0.4, -0.6]} rotation={[0, -0.35, 0]} />
        <Pane src="/portfolio/bektothefuture.jpg" position={[0, 0.1, -2.2]} rotation={[0, 0, 0]} />
      </Rig>
      <Environment preset="city" />
    </Canvas>
  );
}
