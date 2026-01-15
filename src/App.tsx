import React, { useState, useRef } from 'react';
import { Canvas, type CanvasHandle } from './view/Canvas';
import { Controls } from './view/Controls';
import type { PoseData } from './core/types';
import { getDefaultPose } from './core/kinematics';
import { useHistory } from './hooks/useHistory';
import { usePhysics } from './hooks/usePhysics';

export function App() {
  const { 
    state: pose, 
    setState: setPose, 
    undo, 
    redo, 
    canUndo, 
    canRedo 
  } = useHistory<PoseData>(getDefaultPose());

  const [selectedPartKey, setSelectedPartKey] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [isPhysicsEnabled, setIsPhysicsEnabled] = useState(false);
  const canvasRef = useRef<CanvasHandle>(null);
  
  const handlePoseCommit = (newPose: PoseData) => {
    setPose(newPose);
  };

  const handleSelectPart = (key: string) => {
    setSelectedPartKey(key);
  };

  const handleReset = () => {
    setPose(getDefaultPose());
  };

  const { pose: physicalPose } = usePhysics({ targetPose: pose, isEnabled: isPhysicsEnabled });
  const poseForCanvas = isPhysicsEnabled ? physicalPose : pose;

  return (
    <div 
      className="flex h-screen w-screen bg-[#F4F1DE] overflow-hidden font-sans select-none relative items-center justify-center"
      onMouseDown={() => { if (showSplash) setShowSplash(false); }}
    >
      {showSplash && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <h1 className="text-8xl font-semibold text-[rgba(61,43,86,0.15)] select-none">
            Pyxl.Puppt
          </h1>
        </div>
      )}

      <Canvas 
        ref={canvasRef}
        pose={poseForCanvas} 
        onPoseCommit={handlePoseCommit} 
        selectedPartKey={selectedPartKey}
        onSelectPart={handleSelectPart}
        onDeselect={() => setSelectedPartKey(null)}
      />
      <Controls 
        onUndo={undo} 
        onRedo={redo} 
        canUndo={canUndo} 
        canRedo={canRedo}
        isPhysicsEnabled={isPhysicsEnabled}
        onTogglePhysics={() => setIsPhysicsEnabled(p => !p)}
        onReset={handleReset}
      />
    </div>
  );
}