import { Suspense } from 'react';
import FlyingDogs from './FlyingDogs';

export default function SplashScene() {
  return (
    <>
      <ambientLight intensity={2.2} color="#ffffff" />
      <directionalLight position={[3, 5, 3]} intensity={1.5} color="#dff3ff" />
      <Suspense fallback={null}>
        <FlyingDogs />
      </Suspense>
    </>
  );
}