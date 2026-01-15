import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle, useCallback, useLayoutEffect } from 'react';
import type { PoseData, Skeleton } from '../core/types';
import { computeSkeleton, W, H, getDefaultPose } from '../core/kinematics';
import { drawPart, drawJoints } from './drawing';

export interface CanvasHandle {
  exportAsPng: () => void;
}

interface CanvasProps {
  pose: PoseData;
  assets?: { [key: string]: string | null };
}

// --- Theme & constants ---
const PIN_COLOR = '#FF3B30';
const PAPER_COLOR = '#F4F1DE', GRID_COLOR = 'rgba(61, 43, 86, 0.1)';

export const Canvas = forwardRef<CanvasHandle, CanvasProps>(({ pose, assets }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  
  const staticShoulderYRef = useRef<number | null>(null);
  const staticNavelYRef = useRef<number | null>(null);
  if (staticShoulderYRef.current === null || staticNavelYRef.current === null) {
      const defaultPose = getDefaultPose();
      // Calculate skeleton with zero offset to get the static initial position
      const staticSkeleton = computeSkeleton({ ...defaultPose, offset: { x: 0, y: 0 } });
      if (staticShoulderYRef.current === null && staticSkeleton.joints['torso']) {
          staticShoulderYRef.current = staticSkeleton.joints['torso'].y;
      }
      if (staticNavelYRef.current === null && staticSkeleton.joints['root']) {
          staticNavelYRef.current = staticSkeleton.joints['root'].y;
      }
  }

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        const padding = 80;
        const scaleX = (width - padding) / W;
        const scaleY = (height - padding) / H;
        setScale(Math.max(0, Math.min(scaleX, scaleY)));
      }
    });

    observer.observe(wrapper);

    return () => {
      observer.disconnect();
    };
  }, []);

  const drawScene = useCallback((ctx: CanvasRenderingContext2D, isExport: boolean) => {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = isExport ? 'transparent' : PAPER_COLOR;
    ctx.fillRect(0, 0, W, H);

    if (!isExport) {
        ctx.strokeStyle = GRID_COLOR; ctx.lineWidth = 1;
        for (let x = 0; x <= W; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (let y = 0; y <= H; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    }

    const mainSkeleton = computeSkeleton(pose);

    // Draw the thin red navel horizon line (Static)
    if (!isExport) {
        if (staticNavelYRef.current !== null) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(0, staticNavelYRef.current);
            ctx.lineTo(W, staticNavelYRef.current);
            ctx.strokeStyle = PIN_COLOR;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
        }
    }

    // Draw the thin red shoulder/arm horizon line (Static)
    if (!isExport) {
        if (staticShoulderYRef.current !== null) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(0, staticShoulderYRef.current);
            ctx.lineTo(W, staticShoulderYRef.current);
            ctx.strokeStyle = PIN_COLOR;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
        }
    }

    // Draw the thin red vertical center line
    if (!isExport) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(W / 2, 0);
        ctx.lineTo(W / 2, H);
        ctx.strokeStyle = PIN_COLOR;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
    }

    const drawSkeleton = (skel: Skeleton, currentAssets?: typeof assets) => {
        const order = [
            'ground',
            'right.hip', 'right.knee', 'right.foot',
            'left.hip', 'left.knee', 'left.foot',
            'waist',
            'right.shoulder', 'right.elbow', 'right.hand',
            'left.shoulder', 'left.elbow', 'left.hand',
            'torso',
            'neck', 'head'
        ];
        order.forEach(key => {
            const bone = skel.bones.find(b => b.key === key);
            if (bone) drawPart(ctx, bone, false, currentAssets?.[bone.key] ?? null);
        });
    };

    drawSkeleton(mainSkeleton, assets);

    if (!isExport) {
        drawJoints(ctx, mainSkeleton.joints);
    }
  }, [pose, assets]);

  useEffect(() => {
    const canvas = canvasRef.current!, ctx = canvas.getContext('2d')!;
    drawScene(ctx, false);
  }, [drawScene]);

  useImperativeHandle(ref, () => ({
    exportAsPng: () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      
      drawScene(ctx, true);
      const dataURL = canvas.toDataURL('image/png');
      drawScene(ctx, false); // Redraw original scene after export

      const link = document.createElement('a');
      link.download = 'pyxl-puppet.png';
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }));

  return (
    <div ref={wrapperRef} className="flex-1 flex items-center justify-center relative w-full h-full">
      <canvas 
        ref={canvasRef} 
        className="block shadow-2xl rounded-sm" 
        style={{ 
          boxShadow: '0 0 50px rgba(0,0,0,0.2)',
          transform: `scale(${scale})`,
          transformOrigin: 'center'
        }} 
        width={W} 
        height={H} 
      />
    </div>
  );
});
