import type { BoneSegment, Point } from '../core/types';
import { W, GROUND_Y } from '../core/kinematics';

// --- Theme & constants ---
const SELECTION_COLOR = '#E025A8'; // Magenta for "Aim" mode highlight
const JOINT_FILL_COLOR = '#1A1A1A';
const PIN_COLOR = '#FF3B30'; // Also used for pinned joints
const JOINT_RADIUS = 5;

// --- Asset Cache ---
const imageCache: { [src: string]: HTMLImageElement } = {};

// --- New part-specific color palette ---
const PALETTE = {
  GROUND: '#FF3B30', // Red for the new ground guide line
  HEAD: '#A8A8A8',
  NECK: '#777777',
  TORSO: '#1A1A1A',
  WAIST: '#1A1A1A',
  THIGH: '#1A1A1A',
  UPPER_ARM: '#1A1A1A', // Bicep
  SHIN: '#808080',
  FOREARM: '#808080',
  HAND_FOOT: '#4D4D4D', // Default for smaller parts
};

const getColor = (key: string): string => {
  if (key === 'ground') return PALETTE.GROUND;
  if (key === 'head') return PALETTE.HEAD;
  if (key === 'neck') return PALETTE.NECK;
  if (key === 'torso') return PALETTE.TORSO;
  if (key === 'waist') return PALETTE.WAIST;
  if (key.includes('hip')) return PALETTE.THIGH;
  if (key.includes('shoulder')) return PALETTE.UPPER_ARM;
  if (key.includes('knee')) return PALETTE.SHIN;
  if (key.includes('elbow')) return PALETTE.FOREARM;
  if (key.includes('hand') || key.includes('foot')) return PALETTE.HAND_FOOT;
  return '#000000';
};

// --- Path definitions for each part ---
const pathGround = (ctx: CanvasRenderingContext2D) => {
  const size = 30;
  ctx.beginPath();
  ctx.moveTo(-size, 0);
  ctx.lineTo(size, 0);
  ctx.moveTo(0, -size);
  ctx.lineTo(0, size);
};
const pathHead = (ctx: CanvasRenderingContext2D) => {
  ctx.beginPath();
  // Height is 64px
  ctx.ellipse(0, -32, 19, 32, 0, 0, Math.PI * 2);
};
const pathNeck = (ctx: CanvasRenderingContext2D) => {
  // The neck is a small collar shape, like the top of a chess pawn.
  ctx.beginPath();
  ctx.moveTo(-12, 0); // Start bottom-left, where it meets the torso
  // Sweeping curve up to the top center
  ctx.bezierCurveTo(-11, -5, -9, -9, 0, -10);
  // Symmetrical curve back down to the bottom right
  ctx.bezierCurveTo(9, -9, 11, -5, 12, 0);
  ctx.closePath();
};
const pathTorso = (ctx: CanvasRenderingContext2D) => {
  ctx.beginPath();
  // Scaled to be 144 units high
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(28.125, -50.625, 38.25, -129.375);
  ctx.quadraticCurveTo(0, -144, -38.25, -129.375);
  ctx.quadraticCurveTo(-28.125, -50.625, 0, 0);
  ctx.closePath();
};
const pathWaist = (ctx: CanvasRenderingContext2D) => {
  ctx.beginPath();
  // Scaled to be 80 units high
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(25, 32.5, 25, 70);
  ctx.quadraticCurveTo(0, 80, -25, 70);
  ctx.quadraticCurveTo(-25, 32.5, 0, 0);
  ctx.closePath();
};
const pathUpperArm = (ctx: CanvasRenderingContext2D) => {
  ctx.beginPath();
  // Scaled to 96px long
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(32, -12, 64, -12);
  ctx.lineTo(96, 0);
  ctx.lineTo(64, 12);
  ctx.quadraticCurveTo(32, 12, 0, 0);
  ctx.closePath();
};
const pathForearm = (ctx: CanvasRenderingContext2D) => {
  ctx.beginPath();
  // Scaled to 96px long
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(32.4, -9.5, 64.8, -9.5);
  ctx.lineTo(96, 0);
  ctx.lineTo(64.8, 9.5);
  ctx.quadraticCurveTo(32.4, 9.5, 0, 0);
  ctx.closePath();
};
const pathHand = (ctx: CanvasRenderingContext2D) => {
  ctx.beginPath();
  // Scaled to 48px long
  ctx.moveTo(0, -5);
  ctx.lineTo(0, 5);
  ctx.lineTo(48, 0);
  ctx.closePath();
};
const pathThigh = (ctx: CanvasRenderingContext2D) => {
  ctx.beginPath();
  // Scaled to 112px long, drawn horizontally
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(37, -18, 74, -18);
  ctx.lineTo(112, 0);
  ctx.lineTo(74, 18);
  ctx.quadraticCurveTo(37, 18, 0, 0);
  ctx.closePath();
};
const pathShin = (ctx: CanvasRenderingContext2D) => {
  ctx.beginPath();
  // Scaled to 112px long, drawn horizontally
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(37, -13, 74, -13);
  ctx.lineTo(112, 0);
  ctx.lineTo(74, 13);
  ctx.quadraticCurveTo(37, 13, 0, 0);
  ctx.closePath();
};
const pathFoot = (ctx: CanvasRenderingContext2D) => {
  ctx.beginPath();
  // Scaled to 48px long, pointing right
  ctx.moveTo(0, -8);
  ctx.lineTo(0, 8);
  ctx.lineTo(48, 0);
  ctx.closePath();
};

const PATH_MAP: { [key: string]: (ctx: CanvasRenderingContext2D) => void } = {
  'ground': pathGround,
  'head': pathHead, 'neck': pathNeck, 'torso': pathTorso, 'waist': pathWaist,
  'left.shoulder': pathUpperArm, 'right.shoulder': pathUpperArm,
  'left.elbow': pathForearm, 'right.elbow': pathForearm,
  'left.hand': pathHand, 'right.hand': pathHand,
  'left.hip': pathThigh, 'right.hip': pathThigh,
  'left.knee': pathShin, 'right.knee': pathShin,
  'left.foot': pathFoot, 'right.foot': pathFoot,
};

const drawSelectionHighlight = (ctx: CanvasRenderingContext2D, bone: BoneSegment) => {
  const pathFn = PATH_MAP[bone.key];
  if (!pathFn) return;

  ctx.save();
  ctx.translate(bone.start.x, bone.start.y);
  ctx.rotate(bone.angle);
  
  // Apply same small offsets as drawing
  if (bone.key.includes('shoulder') || bone.key.includes('elbow') || bone.key.includes('hand') || bone.key.includes('hip') || bone.key.includes('knee') || bone.key.includes('foot')) {
    ctx.translate(1, 0);
  } else if (bone.key === 'head') {
    ctx.translate(0, -1);
  }
  
  pathFn(ctx);

  ctx.strokeStyle = SELECTION_COLOR;
  ctx.lineWidth = bone.key === 'ground' ? 20 : 12;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.5;
  ctx.stroke();
  ctx.restore();
};

const drawImageAsset = (ctx: CanvasRenderingContext2D, bone: BoneSegment, assetUrl: string) => {
    const drawImg = (img: HTMLImageElement) => {
        const boneLength = Math.hypot(bone.end.x - bone.start.x, bone.end.y - bone.start.y);
        if (boneLength < 1) return;

        const boneAngle = Math.atan2(bone.end.y - bone.start.y, bone.end.x - bone.start.x);
        const center = { x: (bone.start.x + bone.end.x) / 2, y: (bone.start.y + bone.end.y) / 2 };
        
        const h = bone.width;

        ctx.save();
        ctx.translate(center.x, center.y);
        ctx.rotate(boneAngle);
        ctx.drawImage(img, -boneLength / 2, -h / 2, boneLength, h);
        ctx.restore();
    };

    if (imageCache[assetUrl]) {
        if(imageCache[assetUrl].complete) {
            drawImg(imageCache[assetUrl]);
        }
    } else {
        const img = new Image();
        img.src = assetUrl;
        img.onload = () => {}; 
        imageCache[assetUrl] = img;
    }
};

const drawCustomPart = (ctx: CanvasRenderingContext2D, bone: BoneSegment) => {
  const pathFn = PATH_MAP[bone.key];
  if (!pathFn && bone.key !== 'ground') return;

  ctx.save();
  const yPos = bone.key === 'ground' ? GROUND_Y : bone.start.y;
  ctx.translate(bone.start.x, yPos);
  ctx.rotate(bone.angle);

  if (bone.key === 'ground') {
      ctx.beginPath();
      // Ground pivot is at canvas center horizontally. The line spans the full width.
      // We are in the bone's local space, so we draw relative to its pivot (0,0).
      ctx.moveTo(-W / 2, 0);
      ctx.lineTo(W / 2, 0);
      ctx.strokeStyle = getColor(bone.key);
      ctx.lineWidth = 2; // Make it slightly thicker than the grid
      ctx.stroke();

      ctx.restore();
      return;
  }

  // Apply small offsets to match original spec
  if (bone.key.includes('shoulder') || bone.key.includes('elbow') || bone.key.includes('hand') || bone.key.includes('hip') || bone.key.includes('knee') || bone.key.includes('foot')) {
    // All limbs are horizontal now
    ctx.translate(1, 0);
  } else if (bone.key === 'head') {
    ctx.translate(0, -1);
  }

  pathFn!(ctx);
  ctx.fillStyle = getColor(bone.key);
  ctx.fill();

  // Draw pivot/joint details
  ctx.fillStyle = bone.key === 'waist' ? '#FFFFFF' : '#111111';
  if (bone.key === 'neck') {
      // No circle for invisible neck
  } else if (bone.key === 'torso' || bone.key === 'waist') {
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
  }

  ctx.restore();
};

export const drawPart = (ctx: CanvasRenderingContext2D, bone: BoneSegment, isHighlighted: boolean, assetUrl: string | null) => {
    if (isHighlighted) {
        drawSelectionHighlight(ctx, bone);
    }
    
    if (assetUrl) {
        drawImageAsset(ctx, bone, assetUrl);
        return;
    }
    
    drawCustomPart(ctx, bone);
};

export const drawJoints = (ctx: CanvasRenderingContext2D, joints: { [key: string]: Point }, pinnedPoints?: { [key: string]: Point } | null) => {
    for (const key in joints) {
        if(key === 'ground') continue;
        const p = joints[key];
        
        const isPinned = pinnedPoints && pinnedPoints[key];
        const isHead = key === 'head';

        ctx.fillStyle = isPinned ? PIN_COLOR : JOINT_FILL_COLOR;
        const radius = isPinned ? JOINT_RADIUS * 1.5 : JOINT_RADIUS;
        
        if (isHead && !isPinned) continue; // Don't draw regular head dot, only pinned one

        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, 2 * Math.PI);
        ctx.fill();
    }
};