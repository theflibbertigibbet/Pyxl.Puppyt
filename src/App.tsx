
import React, { useState, useRef } from 'react';
import { Canvas, type CanvasHandle } from './view/Canvas';
import { ControlPanel } from './view/ControlPanel';
import { getDefaultPose } from './core/kinematics';

export function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [uiPosition, setUiPosition] = useState<'left' | 'right'>('left');
  const canvasRef = useRef<CanvasHandle>(null);
  
  // The pose is now static and fixed to the default T-pose.
  const pose = getDefaultPose();

  const handleToggleUiPosition = () => {
    setUiPosition(pos => pos === 'left' ? 'right' : 'left');
  };
  
  return (
    <div 
      className={`flex h-screen w-screen bg-[#F4F1DE] overflow-hidden font-sans select-none ${uiPosition === 'left' ? 'flex-row' : 'flex-row-reverse'}`}
      onMouseDown={() => { if (showSplash) setShowSplash(false); }}
    >
      <ControlPanel 
        uiPosition={uiPosition}
        onToggleUiPosition={handleToggleUiPosition}
      />
      <div className="flex-1 flex items-center justify-center relative">
        {showSplash && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <h1 className="text-8xl font-semibold text-[rgba(61,43,86,0.15)] select-none">
              Pyxl.Puppt
            </h1>
          </div>
        )}

        <Canvas 
          ref={canvasRef}
          pose={pose} 
        />
      </div>
    </div>
  );
}
