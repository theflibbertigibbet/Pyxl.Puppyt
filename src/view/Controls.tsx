import React from 'react';

interface ControlsProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isPhysicsEnabled: boolean;
  onTogglePhysics: () => void;
  onReset: () => void;
}

const UndoIcon = () => ( <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 18L5 13M5 13L10 8M5 13H16C18.7614 13 21 15.2386 21 18V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> );
const RedoIcon = () => ( <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 18L19 13M19 13L14 8M19 13H8C5.23858 13 3 15.2386 3 18V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> );
const PhysicsIcon = () => ( <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L12 22M22 12L2 12M18.36 18.36L5.63 5.63M18.36 5.63L5.63 18.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> );
const ResetIcon = () => ( <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 10C20 14.4183 16.4183 18 12 18C7.58172 18 4 14.4183 4 10M20 10V5M20 10H15M4 10C4 5.58172 7.58172 2 12 2C16.4183 2 20 5.58172 20 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> );


export function Controls({ onUndo, onRedo, canUndo, canRedo, isPhysicsEnabled, onTogglePhysics, onReset }: ControlsProps) {
  const buttonClass = "p-2 rounded-md transition-colors text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed";

  return (
     <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-[#1a1a1a] border border-white/10 rounded-xl p-2 shadow-2xl flex items-center justify-center gap-2">
      <div className="flex items-center gap-2">
        <button onClick={onUndo} disabled={!canUndo} className={buttonClass} title="Undo" aria-label="Undo"><UndoIcon /></button>
        <button onClick={onRedo} disabled={!canRedo} className={buttonClass} title="Redo" aria-label="Redo"><RedoIcon /></button>
      </div>

      <div className="w-px h-6 bg-white/10 mx-2"></div>

       <div className="flex items-center gap-2">
        <button onClick={onReset} className={buttonClass} title="Reset Pose" aria-label="Reset Pose"><ResetIcon /></button>
        <button onClick={onTogglePhysics} className={`${buttonClass} ${isPhysicsEnabled ? 'text-red-500' : ''}`} title="Toggle Physics" aria-label="Toggle Physics">
            <PhysicsIcon />
        </button>
      </div>
     </div>
  );
}