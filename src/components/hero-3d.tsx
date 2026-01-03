"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { useRef } from "react"
import type * as THREE from "three"

function FloatingShape(props: any) {
    const meshRef = useRef<THREE.Mesh>(null!)

    useFrame((state, delta) => {
        meshRef.current.rotation.x += delta * 0.2
        meshRef.current.rotation.y += delta * 0.3
        meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.2
    })

    return (
        <mesh
            {...props}
            ref={meshRef}
        >
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color="#7C3AED" wireframe />
        </mesh>
    )
}

function FloatingShape2(props: any) {
    const meshRef = useRef<THREE.Mesh>(null!)

    useFrame((state, delta) => {
        meshRef.current.rotation.x -= delta * 0.3
        meshRef.current.rotation.y -= delta * 0.2
        meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.3
    })

    return (
        <mesh
            {...props}
            ref={meshRef}
        >
            <icosahedronGeometry args={[0.8, 0]} />
            <meshStandardMaterial color="#F97316" wireframe />
        </mesh>
    )
}

export function Hero3D() {
    return (
        <div className="w-full h-full absolute inset-0 -z-10 opacity-30">
            <Canvas>
                <ambientLight intensity={0.5} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
                <pointLight position={[-10, -10, -10]} />
                <FloatingShape position={[-2, 0, 0]} />
                <FloatingShape2 position={[2, 0.5, 0]} />
            </Canvas>
        </div>
    )
}
