"use client";

import { Suspense, useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Environment, Float, ContactShadows, SpotLight } from "@react-three/drei";
import * as THREE from "three";

function NurseModel({ mouse }: { mouse: React.MutableRefObject<[number, number]> }) {
    const { scene } = useGLTF("/models/nurse_kyoko_rival_schools_plushie/scene.gltf");
    const modelRef = useRef<THREE.Group>(null);

    // Smooth rotation based on mouse position
    useFrame((state) => {
        if (modelRef.current) {
            // Smoothly interpolate current rotation to target mouse rotation
            // Mouse x (-1 to 1) maps to y rotation
            const targetRotationY = mouse.current[0] * 0.5;
            const targetRotationX = -mouse.current[1] * 0.2;

            modelRef.current.rotation.y = THREE.MathUtils.lerp(
                modelRef.current.rotation.y,
                targetRotationY + Math.sin(state.clock.elapsedTime * 0.5) * 0.1, // Add subtle breathing movement
                0.1
            );

            modelRef.current.rotation.x = THREE.MathUtils.lerp(
                modelRef.current.rotation.x,
                targetRotationX,
                0.1
            );
        }
    });

    return (
        <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5} floatingRange={[-0.1, 0.1]}>
            <primitive
                ref={modelRef}
                object={scene}
                scale={3.2}
                position={[0, -2.5, 0]}
                rotation={[0, 0, 0]}
            />
        </Float>
    );
}

function Scene() {
    const mouse = useRef<[number, number]>([0, 0]);

    useEffect(() => {
        const handleMouseMove = (event: MouseEvent) => {
            // Normalize mouse coordinates to -1..1
            const x = (event.clientX / window.innerWidth) * 2 - 1;
            const y = -(event.clientY / window.innerHeight) * 2 + 1;
            mouse.current = [x, y];
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    return (
        <>
            {/* Cinematic Studio Lighting */}
            <ambientLight intensity={0.5} color="#ffffff" />

            {/* Key Light - Warm */}
            <SpotLight
                position={[5, 5, 5]}
                angle={0.5}
                penumbra={1}
                intensity={2.5}
                castShadow
                color="#fff0e0" // Slightly warm
                distance={20}
            />

            {/* Fill Light - Cool */}
            <pointLight position={[-5, 5, -5]} intensity={1.5} color="#e6f0ff" />

            {/* Rim Light - Sharp */}
            <SpotLight
                position={[0, 5, -5]}
                angle={0.5}
                penumbra={1}
                intensity={3}
                color="#ffffff"
                distance={10}
            />

            <NurseModel mouse={mouse} />

            <ContactShadows
                position={[0, -2.5, 0]}
                opacity={0.4}
                scale={10}
                blur={2.5}
                far={4}
                color="#000000"
            />

            {/* Environment for realistic reflections */}
            <Environment preset="city" />
        </>
    );
}

function LoadingSpinner() {
    return (
        <mesh>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshStandardMaterial color="#e5e5e5" wireframe />
        </mesh>
    );
}

export default function NurseModel3D() {
    return (
        <div className="w-full h-full absolute inset-0">
            <Canvas
                shadows
                camera={{ position: [0, 0, 12], fov: 35 }}
                gl={{
                    antialias: true,
                    alpha: true,
                    toneMapping: THREE.ACESFilmicToneMapping,
                    toneMappingExposure: 1.2
                }}
                style={{ background: "transparent" }}
            >
                <Suspense fallback={<LoadingSpinner />}>
                    <Scene />
                </Suspense>
            </Canvas>
        </div>
    );
}

// Preload the model
useGLTF.preload("/models/nurse_kyoko_rival_schools_plushie/scene.gltf");
