import { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Center } from '@react-three/drei';
import * as THREE from 'three';
import { STLLoader } from 'three-stdlib';

interface ThreeViewerProps {
    file: File | null;
}

const Model = ({ file }: { file: File }) => {
    const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);

    useEffect(() => {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const contents = e.target?.result as ArrayBuffer;
            const loader = new STLLoader();
            const loadedGeometry = loader.parse(contents);
            loadedGeometry.computeVertexNormals();
            setGeometry(loadedGeometry);
        };
        reader.readAsArrayBuffer(file);
    }, [file]);

    if (!geometry) return null;

    return (
        <mesh geometry={geometry}>
            <meshStandardMaterial color="#60a5fa" roughness={0.5} metalness={0.1} />
        </mesh>
    );
};

export default function ThreeViewer({ file }: ThreeViewerProps) {
    if (!file) {
        return (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 rounded-xl border-0">
                <p className="text-slate-500 font-medium">3D 모델 미리보기 영역</p>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 bg-slate-900 rounded-xl overflow-hidden shadow-inner">
            <Canvas shadows camera={{ position: [0, 0, 150], fov: 50 }} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                <color attach="background" args={['#0f172a']} />
                <ambientLight intensity={0.5} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
                <pointLight position={[-10, -10, -10]} intensity={0.5} />

                <Center>
                    <Model file={file} />
                </Center>

                <OrbitControls makeDefault />
            </Canvas>
        </div>
    );
}
