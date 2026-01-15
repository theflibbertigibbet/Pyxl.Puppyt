import type { Point, PoseData, PhysicsBody, PhysicsParticle, Skeleton, PhysicsConstraint } from './types';
import { computeSkeleton, hierarchy, W, H, GROUND_Y } from './kinematics';

// --- Simulation Constants ---
const FRICTION = 0.995; // A slight air damping to prevent chaotic runaway motion
const SOLVER_ITERATIONS = 10;
const BOUNCE_FACTOR = 0.7; // Energy retained after bouncing off a wall

/**
 * Creates a physics body (particles and constraints) from a static pose.
 */
export function createPhysicsBodyFromPose(pose: PoseData): PhysicsBody {
    const skeleton = computeSkeleton(pose);
    const particles: PhysicsParticle[] = [];
    const constraints: PhysicsConstraint[] = [];
    const particleMap = new Map<string, number>();

    // Create particles from joints
    Object.entries(skeleton.joints).forEach(([key, point]) => {
        if (key === 'ground') return; // Don't create a physics particle for the visual ground base
        const particle: PhysicsParticle = {
            id: key,
            pos: { ...point },
            prevPos: { ...point },
            mass: 1.0, // Default mass
        };
        // Heavier torso/waist for stability
        if (key === 'root' || key === 'waist' || key === 'torso' || key === 'neck') {
            particle.mass = 3.0;
        }
        // Lighter extremities
        if (key.includes('hand') || key.includes('foot')) {
            particle.mass = 0.5;
        }
        particleMap.set(key, particles.length);
        particles.push(particle);
    });

    // Create constraints by walking the defined hierarchy
    Object.keys(hierarchy).forEach(parentKey => {
        if (parentKey === 'ground') return;
        const parentIndex = particleMap.get(parentKey);
        if (parentIndex === undefined) return;
        const parentParticle = particles[parentIndex];

        hierarchy[parentKey].children.forEach(childKey => {
            const childIndex = particleMap.get(childKey);
            if(childIndex === undefined) return;
            const childParticle = particles[childIndex];
            
            const restLength = Math.hypot(childParticle.pos.x - parentParticle.pos.x, childParticle.pos.y - parentParticle.pos.y);
            if (restLength > 0.1) {
                constraints.push({ particleAIndex: parentIndex, particleBIndex: childIndex, restLength });
            }
        });
    });


    return { particles, constraints, particleMap };
}

/**
 * Runs one step of the physics simulation.
 */
export function updatePhysicsBody(body: PhysicsBody, dt: number): void {
    const dtSq = dt * dt;

    // 1. Apply forces (just friction) and integrate
    body.particles.forEach((p) => {
        if (p.mass === 0) return;

        const velocity = { x: (p.pos.x - p.prevPos.x) * FRICTION, y: (p.pos.y - p.prevPos.y) * FRICTION };
        p.prevPos = { ...p.pos };

        // No external forces like gravity or AI, just simple Verlet integration
        const accel = { x: 0, y: 0 };

        p.pos.x += velocity.x + accel.x * dtSq;
        p.pos.y += velocity.y + accel.y * dtSq;
    });

    // 2. Solve constraints
    for (let i = 0; i < SOLVER_ITERATIONS; i++) {
        body.constraints.forEach(c => {
            const pA = body.particles[c.particleAIndex];
            const pB = body.particles[c.particleBIndex];
            const delta = { x: pB.pos.x - pA.pos.x, y: pB.pos.y - pA.pos.y };
            const dist = Math.hypot(delta.x, delta.y);
            if (dist < 0.001) return;
            
            const diff = (dist - c.restLength) / dist;
            const totalMass = pA.mass + pB.mass;
            if (totalMass === 0) return;
            
            const pAShare = pA.mass > 0 ? pA.mass / totalMass : 1;
            const pBShare = pB.mass > 0 ? pB.mass / totalMass : 1;

            pA.pos.x += delta.x * diff * pBShare;
            pA.pos.y += delta.y * diff * pBShare;
            pB.pos.x -= delta.x * diff * pAShare;
            pB.pos.y -= delta.y * diff * pAShare;
        });
    }

    // 3. Apply rotational damping for balance
    const coreKeys = ['root', 'torso', 'waist'];
    const coreParticles = coreKeys.map(k => {
        const index = body.particleMap.get(k);
        return index !== undefined ? body.particles[index] : null;
    }).filter(p => p !== null) as PhysicsParticle[];

    if (coreParticles.length > 1) {
        const com = { x: 0, y: 0 };
        const comPrev = { x: 0, y: 0 };
        let totalMass = 0;
        
        coreParticles.forEach(p => {
            com.x += p.pos.x * p.mass;
            com.y += p.pos.y * p.mass;
            comPrev.x += p.prevPos.x * p.mass;
            comPrev.y += p.prevPos.y * p.mass;
            totalMass += p.mass;
        });

        com.x /= totalMass; com.y /= totalMass;
        comPrev.x /= totalMass; comPrev.y /= totalMass;
        
        const ROTATIONAL_DAMPING = 0.98; // a value slightly less than 1 to reduce spin

        coreParticles.forEach(p => {
            const r = { x: p.pos.x - com.x, y: p.pos.y - com.y };
            const rPrev = { x: p.prevPos.x - comPrev.x, y: p.prevPos.y - comPrev.y };
            const vel_tangential = { x: r.x - rPrev.x, y: r.y - rPrev.y };
            const new_vel_tangential = { x: vel_tangential.x * ROTATIONAL_DAMPING, y: vel_tangential.y * ROTATIONAL_DAMPING };
            const delta_vel = { x: new_vel_tangential.x - vel_tangential.x, y: new_vel_tangential.y - vel_tangential.y };
            p.pos.x += delta_vel.x;
            p.pos.y += delta_vel.y;
        });
    }

    // 4. Handle collisions with boundaries
    const PARTICLE_RADIUS = 5; // A small radius for each physics particle to prevent clipping
    const GROUND_Y_PHYSICS = GROUND_Y - PARTICLE_RADIUS;
    body.particles.forEach(p => {
        const vel = { x: p.pos.x - p.prevPos.x, y: p.pos.y - p.prevPos.y };

        // Bottom wall
        if (p.pos.y > H - PARTICLE_RADIUS) {
            p.pos.y = H - PARTICLE_RADIUS;
            p.prevPos.y = p.pos.y + vel.y * BOUNCE_FACTOR;
        }
        // Top wall
        if (p.pos.y < PARTICLE_RADIUS) {
            p.pos.y = PARTICLE_RADIUS;
            p.prevPos.y = p.pos.y + vel.y * BOUNCE_FACTOR;
        }
        // Right wall
        if (p.pos.x > W - PARTICLE_RADIUS) {
            p.pos.x = W - PARTICLE_RADIUS;
            p.prevPos.x = p.pos.x + vel.x * BOUNCE_FACTOR;
        }
        // Left wall
        if (p.pos.x < PARTICLE_RADIUS) {
            p.pos.x = PARTICLE_RADIUS;
            p.prevPos.x = p.pos.x + vel.x * BOUNCE_FACTOR;
        }

        // Ground collision for feet
        if (p.id.includes('foot') && p.pos.y > GROUND_Y_PHYSICS) {
            p.pos.y = GROUND_Y_PHYSICS;
            p.prevPos.y = p.pos.y + vel.y * BOUNCE_FACTOR;
        }
    });
}


/**
 * Converts the physics body's particle positions back into a PoseData object.
 */
export function extractPoseFromPhysicsBody(body: PhysicsBody, initialPose: PoseData): PoseData {
    const newPose: PoseData = JSON.parse(JSON.stringify(initialPose));
    const worldAngles: Map<string, number> = new Map();

    const getParticlePos = (key: string): Point | undefined => {
        const index = body.particleMap.get(key);
        return index !== undefined ? body.particles[index].pos : undefined;
    };
    
    const calculateAngles = (parentKey: string, parentWorldAngle: number) => {
        hierarchy[parentKey].children.forEach(childKey => {
            const parentPos = getParticlePos(parentKey);
            const childPos = getParticlePos(childKey);

            if (parentPos && childPos) {
                const dx = childPos.x - parentPos.x;
                const dy = childPos.y - parentPos.y;
                const childWorldAngle = Math.atan2(dy, dx);
                
                worldAngles.set(childKey, childWorldAngle);

                let localAngle = childWorldAngle - parentWorldAngle;

                const parts = childKey.split('.');
                if (parts.length === 2) {
                    (newPose as any)[parts[0]][parts[1]] = localAngle;
                } else {
                    (newPose as any)[childKey] = localAngle;
                }
                
                calculateAngles(childKey, childWorldAngle);
            }
        });
    };

    const rootPos = getParticlePos('root');
    const torsoPos = getParticlePos('torso');
    const waistPos = getParticlePos('waist');
    
    if (rootPos && torsoPos && waistPos) {
        const avgCoreX = (torsoPos.x + waistPos.x) / 2;
        const avgCoreY = (torsoPos.y + waistPos.y) / 2;
        const groundAngle = Math.atan2(avgCoreY - rootPos.y, avgCoreX - rootPos.x) - (Math.PI / 2);
        
        newPose.groundTilt = groundAngle;
        worldAngles.set('root', groundAngle);
        
        // The offset now tracks the root particle's position relative to the
        // center of the canvas, making the camera follow the floating puppet.
        newPose.offset.x = rootPos.x - (W / 2);
        newPose.offset.y = rootPos.y - (H / 2);
        
        calculateAngles('root', groundAngle);
    }
    
    return newPose;
}