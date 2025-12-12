import { useState, useRef, useEffect } from "react";

interface TouchControlsProps {
  onMove: (dx: number, dy: number) => void;
  onAim: (x: number, y: number) => void;
  onShoot: (shooting: boolean) => void;
  onReload: () => void;
  canvasWidth: number;
  canvasHeight: number;
}

export const TouchControls = ({ 
  onMove, 
  onAim, 
  onShoot, 
  onReload,
  canvasWidth,
  canvasHeight 
}: TouchControlsProps) => {
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickPos, setJoystickPos] = useState({ x: 80, y: -100 });
  const [joystickDelta, setJoystickDelta] = useState({ x: 0, y: 0 });
  const joystickRef = useRef<HTMLDivElement>(null);
  const joystickStartRef = useRef({ x: 0, y: 0 });

  const handleJoystickStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    joystickStartRef.current = { x: touch.clientX, y: touch.clientY };
    setJoystickActive(true);
  };

  const handleJoystickMove = (e: React.TouchEvent) => {
    if (!joystickActive) return;
    
    const touch = e.touches[0];
    const dx = touch.clientX - joystickStartRef.current.x;
    const dy = touch.clientY - joystickStartRef.current.y;
    
    const maxDist = 40;
    const dist = Math.min(maxDist, Math.hypot(dx, dy));
    const angle = Math.atan2(dy, dx);
    
    const clampedX = Math.cos(angle) * dist;
    const clampedY = Math.sin(angle) * dist;
    
    setJoystickDelta({ x: clampedX / maxDist, y: clampedY / maxDist });
    setJoystickPos({ x: 80 + clampedX, y: -100 + clampedY });
    
    onMove(clampedX / maxDist, clampedY / maxDist);
  };

  const handleJoystickEnd = () => {
    setJoystickActive(false);
    setJoystickDelta({ x: 0, y: 0 });
    setJoystickPos({ x: 80, y: -100 });
    onMove(0, 0);
  };

  const handleAimStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * canvasWidth;
    const y = ((touch.clientY - rect.top) / rect.height) * canvasHeight;
    onAim(x, y);
    onShoot(true);
  };

  const handleAimMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * canvasWidth;
    const y = ((touch.clientY - rect.top) / rect.height) * canvasHeight;
    onAim(x, y);
  };

  const handleAimEnd = () => {
    onShoot(false);
  };

  return (
    <>
      {/* Left side - Movement joystick */}
      <div 
        ref={joystickRef}
        className="fixed left-4 bottom-24 w-40 h-40 touch-none"
        onTouchStart={handleJoystickStart}
        onTouchMove={handleJoystickMove}
        onTouchEnd={handleJoystickEnd}
      >
        {/* Joystick base */}
        <div className="absolute inset-0 rounded-full bg-secondary/50 border-2 border-border" />
        
        {/* Joystick knob */}
        <div 
          className="absolute w-16 h-16 rounded-full bg-primary/80 border-2 border-primary shadow-lg transition-transform duration-75"
          style={{
            left: joystickPos.x - 32,
            bottom: -joystickPos.y - 32,
          }}
        />
      </div>

      {/* Right side - Shoot area */}
      <div 
        className="fixed right-4 bottom-24 w-32 h-32 rounded-full bg-red-500/30 border-4 border-red-500/50 flex items-center justify-center touch-none"
        onTouchStart={handleAimStart}
        onTouchMove={handleAimMove}
        onTouchEnd={handleAimEnd}
      >
        <span className="text-white font-bold text-lg pointer-events-none">FIRE</span>
      </div>

      {/* Reload button */}
      <button
        className="fixed right-40 bottom-24 w-16 h-16 rounded-full bg-blue-500/50 border-2 border-blue-500 flex items-center justify-center"
        onTouchStart={(e) => {
          e.preventDefault();
          onReload();
        }}
      >
        <span className="text-white font-bold text-sm">R</span>
      </button>
    </>
  );
};