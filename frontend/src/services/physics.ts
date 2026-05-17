/**
 * PhysicsEngine — Core Matter.js wrapper service
 *
 * Decouples the physics simulation from React's render cycle.
 * Manages engine lifecycle, body/constraint CRUD, serialization,
 * and frame-by-frame analytics callbacks.
 */
import Matter from 'matter-js';
import { v4 as uuidv4 } from 'uuid';
import type {
  BodyType,
  SerializedBody,
  SerializedConstraint,
  ConstraintType,
  WorldState,
  Vec2,
} from '@shared/types';

// ─── Default Colors ────────────────────────────────────────────────
const BODY_COLORS: Record<BodyType, string> = {
  rectangle: '#6c5ce7',
  circle: '#00cec9',
  trapezoid: '#fdcb6e',
};

const CONSTRAINT_COLORS: Record<ConstraintType, string> = {
  spring: '#a29bfe',
  rope: '#e8e8f0',
  pivot: '#ff6b6b',
  motor: '#fd79a8',
};

// ─── Type Augmentation ─────────────────────────────────────────────
interface BodyWithMeta extends Matter.Body {
  customId?: string;
  bodyType?: BodyType;
}

interface ConstraintWithMeta extends Matter.Constraint {
  customId?: string;
  constraintType?: ConstraintType;
}

// ─── Frame Callback ────────────────────────────────────────────────
export type FrameCallback = (bodies: Map<string, {
  position: Vec2;
  velocity: Vec2;
  speed: number;
  angle: number;
  angularVelocity: number;
  mass: number;
}>) => void;

// ─── Engine Options ────────────────────────────────────────────────
export interface PhysicsEngineOptions {
  width: number;
  height: number;
  gravity?: Vec2;
  wireframes?: boolean;
  background?: string;
}

// ─── PhysicsEngine Class ───────────────────────────────────────────
export class PhysicsEngine {
  private engine: Matter.Engine;
  private render: Matter.Render;
  private runner: Matter.Runner;
  private canvas: HTMLCanvasElement;
  private mouse: Matter.Mouse | null = null;
  private mouseConstraint: Matter.MouseConstraint | null = null;
  private bodies: Map<string, BodyWithMeta> = new Map();
  private constraints: Map<string, ConstraintWithMeta> = new Map();
  private frameCallbacks: Set<FrameCallback> = new Set();
  private _isPlaying = false;
  private _initialWorldState: WorldState | null = null;
  private width: number;
  private height: number;

  constructor(container: HTMLElement, options: PhysicsEngineOptions) {
    this.width = options.width;
    this.height = options.height;

    // Create engine
    this.engine = Matter.Engine.create({
      gravity: {
        x: options.gravity?.x ?? 0,
        y: options.gravity?.y ?? 1,
        scale: 0.001,
      },
    });

    // Create canvas
    this.canvas = document.createElement('canvas');
    container.appendChild(this.canvas);

    // Create renderer
    this.render = Matter.Render.create({
      canvas: this.canvas,
      engine: this.engine,
      options: {
        width: options.width,
        height: options.height,
        wireframes: options.wireframes ?? false,
        background: options.background ?? '#0a0a0f',
        pixelRatio: window.devicePixelRatio || 1,
      },
    });

    // Create runner
    this.runner = Matter.Runner.create({
      delta: 1000 / 60,
    } as any);

    // Setup mouse interaction
    this.setupMouse();

    // Setup frame callback listener
    Matter.Events.on(this.engine, 'afterUpdate', () => {
      this.emitFrameData();
    });

    // Add world boundaries (ground + walls)
    this.addBoundaries();

    // Start renderer (but not the physics runner)
    Matter.Render.run(this.render);
  }

  // ─── Mouse Interaction ─────────────────────────────────────────
  private setupMouse(): void {
    this.mouse = Matter.Mouse.create(this.canvas);
    this.mouseConstraint = Matter.MouseConstraint.create(this.engine, {
      mouse: this.mouse,
      constraint: {
        stiffness: 0.2,
        render: {
          visible: false,
        },
      },
    });
    Matter.Composite.add(this.engine.world, this.mouseConstraint);

    // Keep the render in sync with mouse
    this.render.mouse = this.mouse;
  }

  // ─── Boundaries ────────────────────────────────────────────────
  private addBoundaries(): void {
    const thickness = 60;
    const ground = Matter.Bodies.rectangle(
      this.width / 2, this.height + thickness / 2,
      this.width * 2, thickness,
      { isStatic: true, render: { fillStyle: '#1a1a28' }, label: 'ground' }
    );
    const leftWall = Matter.Bodies.rectangle(
      -thickness / 2, this.height / 2,
      thickness, this.height * 2,
      { isStatic: true, render: { fillStyle: '#1a1a28' }, label: 'wall-left' }
    );
    const rightWall = Matter.Bodies.rectangle(
      this.width + thickness / 2, this.height / 2,
      thickness, this.height * 2,
      { isStatic: true, render: { fillStyle: '#1a1a28' }, label: 'wall-right' }
    );
    Matter.Composite.add(this.engine.world, [ground, leftWall, rightWall]);
  }

  // ─── Body CRUD ─────────────────────────────────────────────────
  addBody(
    type: BodyType,
    position: Vec2,
    options: Partial<{
      width: number;
      height: number;
      radius: number;
      slope: number;
      isStatic: boolean;
      mass: number;
      friction: number;
      restitution: number;
      angle: number;
      fillStyle: string;
      label: string;
      id: string;
    }> = {}
  ): string {
    const id = options.id || uuidv4();
    const color = options.fillStyle || BODY_COLORS[type];
    let body: BodyWithMeta;

    const commonOpts: any = {
      isStatic: options.isStatic ?? false,
      friction: options.friction ?? 0.5,
      restitution: options.restitution ?? 0.3,
      angle: options.angle ?? 0,
      label: options.label || `${type}-${id.slice(0, 6)}`,
      render: {
        fillStyle: color,
        strokeStyle: 'rgba(255,255,255,0.1)',
        lineWidth: 1,
      },
    };

    if (options.mass) {
      commonOpts.mass = options.mass;
    }

    switch (type) {
      case 'rectangle': {
        const w = options.width ?? 80;
        const h = options.height ?? 80;
        body = Matter.Bodies.rectangle(position.x, position.y, w, h, commonOpts) as BodyWithMeta;
        break;
      }
      case 'circle': {
        const r = options.radius ?? 40;
        body = Matter.Bodies.circle(position.x, position.y, r, commonOpts) as BodyWithMeta;
        break;
      }
      case 'trapezoid': {
        const w = options.width ?? 120;
        const h = options.height ?? 60;
        const slope = options.slope ?? 0.5;
        body = Matter.Bodies.trapezoid(position.x, position.y, w, h, slope, commonOpts) as BodyWithMeta;
        break;
      }
      default:
        throw new Error(`Unknown body type: ${type}`);
    }

    body.customId = id;
    body.bodyType = type;
    this.bodies.set(id, body);
    Matter.Composite.add(this.engine.world, body);
    return id;
  }

  removeBody(id: string): void {
    const body = this.bodies.get(id);
    if (!body) return;
    Matter.Composite.remove(this.engine.world, body);
    this.bodies.delete(id);
  }

  getBody(id: string): BodyWithMeta | undefined {
    return this.bodies.get(id);
  }

  getAllBodies(): Map<string, BodyWithMeta> {
    return this.bodies;
  }

  // ─── Constraint CRUD ───────────────────────────────────────────
  addConstraint(
    type: ConstraintType,
    bodyAId: string | null,
    bodyBId: string | null,
    options: Partial<{
      pointA: Vec2;
      pointB: Vec2;
      stiffness: number;
      length: number;
      damping: number;
      id: string;
    }> = {}
  ): string {
    const id = options.id || uuidv4();
    const bodyA = bodyAId ? this.bodies.get(bodyAId) ?? null : null;
    const bodyB = bodyBId ? this.bodies.get(bodyBId) ?? null : null;

    const defaults: Record<ConstraintType, { stiffness: number; damping: number }> = {
      spring: { stiffness: 0.05, damping: 0.05 },
      rope: { stiffness: 1, damping: 0 },
      pivot: { stiffness: 1, damping: 0 },
      motor: { stiffness: 0.5, damping: 0 },
    };

    const constraintDef: Matter.IConstraintDefinition = {
      bodyA: bodyA ?? undefined,
      bodyB: bodyB ?? undefined,
      pointA: options.pointA ?? { x: 0, y: 0 },
      pointB: options.pointB ?? { x: 0, y: 0 },
      stiffness: options.stiffness ?? defaults[type].stiffness,
      damping: options.damping ?? defaults[type].damping,
      render: {
        strokeStyle: CONSTRAINT_COLORS[type],
        lineWidth: 2,
      },
    };

    if (type === 'pivot') {
      constraintDef.length = 0;
    } else if (options.length !== undefined) {
      constraintDef.length = options.length;
    }

    const constraint = Matter.Constraint.create(constraintDef) as ConstraintWithMeta;
    constraint.customId = id;
    constraint.constraintType = type;
    this.constraints.set(id, constraint);
    Matter.Composite.add(this.engine.world, constraint);
    return id;
  }

  removeConstraint(id: string): void {
    const constraint = this.constraints.get(id);
    if (!constraint) return;
    Matter.Composite.remove(this.engine.world, constraint);
    this.constraints.delete(id);
  }

  // ─── Simulation Controls ───────────────────────────────────────
  play(): void {
    if (this._isPlaying) return;
    this._isPlaying = true;
    if (!this._initialWorldState) {
      this._initialWorldState = this.serializeWorld();
    }
    Matter.Runner.run(this.runner, this.engine);
  }

  pause(): void {
    if (!this._isPlaying) return;
    this._isPlaying = false;
    Matter.Runner.stop(this.runner);
  }

  reset(): void {
    this.pause();
    if (this._initialWorldState) {
      this.deserializeWorld(this._initialWorldState);
    }
  }

  step(delta = 1000 / 60): void {
    Matter.Engine.update(this.engine, delta);
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  // ─── Gravity & Timestep ────────────────────────────────────────
  setGravity(x: number, y: number): void {
    this.engine.gravity.x = x;
    this.engine.gravity.y = y;
  }

  setTimestep(delta: number): void {
    this.runner.delta = delta;
  }

  // ─── Body Property Updates ─────────────────────────────────────
  setBodyPosition(id: string, position: Vec2): void {
    const body = this.bodies.get(id);
    if (body) Matter.Body.setPosition(body, position);
  }

  setBodyVelocity(id: string, velocity: Vec2): void {
    const body = this.bodies.get(id);
    if (body) Matter.Body.setVelocity(body, velocity);
  }

  setBodyAngle(id: string, angle: number): void {
    const body = this.bodies.get(id);
    if (body) Matter.Body.setAngle(body, angle);
  }

  setBodyStatic(id: string, isStatic: boolean): void {
    const body = this.bodies.get(id);
    if (body) Matter.Body.setStatic(body, isStatic);
  }

  // ─── Serialization ────────────────────────────────────────────
  serializeWorld(): WorldState {
    const bodies: SerializedBody[] = [];
    this.bodies.forEach((body, id) => {
      const dims: SerializedBody['dimensions'] = {};
      if (body.bodyType === 'circle') {
        dims.radius = (body as any).circleRadius || 40;
      } else if (body.bodyType === 'trapezoid') {
        dims.width = 120;
        dims.height = 60;
        dims.slope = 0.5;
      } else {
        const bounds = body.bounds;
        dims.width = bounds.max.x - bounds.min.x;
        dims.height = bounds.max.y - bounds.min.y;
      }

      bodies.push({
        id,
        type: body.bodyType || 'rectangle',
        label: body.label,
        position: { x: body.position.x, y: body.position.y },
        angle: body.angle,
        velocity: { x: body.velocity.x, y: body.velocity.y },
        angularVelocity: body.angularVelocity,
        isStatic: body.isStatic,
        mass: body.mass,
        friction: body.friction,
        restitution: body.restitution,
        dimensions: dims,
        render: {
          fillStyle: (body.render as any).fillStyle || '#6c5ce7',
          strokeStyle: (body.render as any).strokeStyle || 'rgba(255,255,255,0.1)',
          lineWidth: (body.render as any).lineWidth || 1,
        },
      });
    });

    const constraints: SerializedConstraint[] = [];
    this.constraints.forEach((c, id) => {
      constraints.push({
        id,
        type: c.constraintType || 'spring',
        bodyAId: c.bodyA ? (c.bodyA as BodyWithMeta).customId || null : null,
        bodyBId: c.bodyB ? (c.bodyB as BodyWithMeta).customId || null : null,
        pointA: { x: c.pointA?.x ?? 0, y: c.pointA?.y ?? 0 },
        pointB: { x: c.pointB?.x ?? 0, y: c.pointB?.y ?? 0 },
        stiffness: c.stiffness ?? 1,
        length: c.length ?? 0,
        damping: c.damping ?? 0,
        render: {
          strokeStyle: (c.render as any)?.strokeStyle || '#a29bfe',
          lineWidth: (c.render as any)?.lineWidth || 2,
        },
      });
    });

    return {
      gravity: { x: this.engine.gravity.x, y: this.engine.gravity.y },
      bodies,
      constraints,
    };
  }

  deserializeWorld(state: WorldState): void {
    // Clear current
    this.bodies.forEach((body) => Matter.Composite.remove(this.engine.world, body));
    this.constraints.forEach((c) => Matter.Composite.remove(this.engine.world, c));
    this.bodies.clear();
    this.constraints.clear();

    // Set gravity
    this.setGravity(state.gravity.x, state.gravity.y);

    // Restore bodies
    for (const sb of state.bodies) {
      this.addBody(sb.type, sb.position, {
        id: sb.id,
        width: sb.dimensions.width,
        height: sb.dimensions.height,
        radius: sb.dimensions.radius,
        slope: sb.dimensions.slope,
        isStatic: sb.isStatic,
        mass: sb.isStatic ? undefined : sb.mass,
        friction: sb.friction,
        restitution: sb.restitution,
        angle: sb.angle,
        fillStyle: sb.render.fillStyle,
        label: sb.label,
      });

      if (sb.velocity.x !== 0 || sb.velocity.y !== 0) {
        this.setBodyVelocity(sb.id, sb.velocity);
      }
    }

    // Restore constraints
    for (const sc of state.constraints) {
      this.addConstraint(sc.type, sc.bodyAId, sc.bodyBId, {
        id: sc.id,
        pointA: sc.pointA,
        pointB: sc.pointB,
        stiffness: sc.stiffness,
        length: sc.length,
        damping: sc.damping,
      });
    }
  }

  // ─── Analytics Frame Emission ──────────────────────────────────
  onFrame(callback: FrameCallback): () => void {
    this.frameCallbacks.add(callback);
    return () => this.frameCallbacks.delete(callback);
  }

  private emitFrameData(): void {
    if (this.frameCallbacks.size === 0) return;
    const data = new Map<string, {
      position: Vec2;
      velocity: Vec2;
      speed: number;
      angle: number;
      angularVelocity: number;
      mass: number;
    }>();

    this.bodies.forEach((body, id) => {
      data.set(id, {
        position: { x: body.position.x, y: body.position.y },
        velocity: { x: body.velocity.x, y: body.velocity.y },
        speed: body.speed,
        angle: body.angle,
        angularVelocity: body.angularVelocity,
        mass: body.mass,
      });
    });

    this.frameCallbacks.forEach((cb) => cb(data));
  }

  // ─── Canvas / Resize ───────────────────────────────────────────
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.render.options.width = width;
    this.render.options.height = height;
    this.render.canvas.width = width;
    this.render.canvas.height = height;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getEngine(): Matter.Engine {
    return this.engine;
  }

  // ─── Cleanup ───────────────────────────────────────────────────
  destroy(): void {
    this.pause();
    this.frameCallbacks.clear();
    if (this.mouseConstraint) {
      Matter.Composite.remove(this.engine.world, this.mouseConstraint);
    }
    Matter.Render.stop(this.render);
    Matter.Engine.clear(this.engine);
    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}
