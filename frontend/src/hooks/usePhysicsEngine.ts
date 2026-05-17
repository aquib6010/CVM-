/**
 * usePhysicsEngine — React hook wrapping the PhysicsEngine service.
 * Uses useRef to persist the engine across re-renders without triggering them.
 */
import { useEffect, useRef, useCallback } from 'react';
import { PhysicsEngine, type PhysicsEngineOptions, type FrameCallback } from '@/services/physics';
import type { BodyType, ConstraintType, Vec2, WorldState } from '@shared/types';

interface UsePhysicsEngineReturn {
  engineRef: React.MutableRefObject<PhysicsEngine | null>;
  addBody: (type: BodyType, position: Vec2, options?: any) => string | null;
  removeBody: (id: string) => void;
  addConstraint: (type: ConstraintType, bodyAId: string | null, bodyBId: string | null, options?: any) => string | null;
  removeConstraint: (id: string) => void;
  play: () => void;
  pause: () => void;
  reset: () => void;
  step: () => void;
  serializeWorld: () => WorldState | null;
  deserializeWorld: (state: WorldState) => void;
  setGravity: (x: number, y: number) => void;
  setTimestep: (delta: number) => void;
  onFrame: (callback: FrameCallback) => (() => void);
}

export function usePhysicsEngine(
  containerRef: React.RefObject<HTMLDivElement | null>,
  options: PhysicsEngineOptions
): UsePhysicsEngineReturn {
  const engineRef = useRef<PhysicsEngine | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear any existing canvas children
    const container = containerRef.current;
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const engine = new PhysicsEngine(container, options);
    engineRef.current = engine;

    // Ensure the Matter.js canvas fills the container
    const canvas = engine.getCanvas();
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef]);

  // Resize engine when dimensions change
  useEffect(() => {
    if (engineRef.current && options.width > 0 && options.height > 0) {
      engineRef.current.resize(options.width, options.height);
    }
  }, [options.width, options.height]);

  const addBody = useCallback(
    (type: BodyType, position: Vec2, opts?: any) => {
      return engineRef.current?.addBody(type, position, opts) ?? null;
    },
    []
  );

  const removeBody = useCallback((id: string) => {
    engineRef.current?.removeBody(id);
  }, []);

  const addConstraint = useCallback(
    (type: ConstraintType, bodyAId: string | null, bodyBId: string | null, opts?: any) => {
      return engineRef.current?.addConstraint(type, bodyAId, bodyBId, opts) ?? null;
    },
    []
  );

  const removeConstraint = useCallback((id: string) => {
    engineRef.current?.removeConstraint(id);
  }, []);

  const play = useCallback(() => engineRef.current?.play(), []);
  const pause = useCallback(() => engineRef.current?.pause(), []);
  const reset = useCallback(() => engineRef.current?.reset(), []);
  const step = useCallback(() => engineRef.current?.step(), []);

  const serializeWorld = useCallback(
    () => engineRef.current?.serializeWorld() ?? null,
    []
  );

  const deserializeWorld = useCallback((state: WorldState) => {
    engineRef.current?.deserializeWorld(state);
  }, []);

  const setGravity = useCallback((x: number, y: number) => {
    engineRef.current?.setGravity(x, y);
  }, []);

  const setTimestep = useCallback((delta: number) => {
    engineRef.current?.setTimestep(delta);
  }, []);

  const onFrame = useCallback((callback: FrameCallback) => {
    return engineRef.current?.onFrame(callback) ?? (() => {});
  }, []);

  return {
    engineRef,
    addBody,
    removeBody,
    addConstraint,
    removeConstraint,
    play,
    pause,
    reset,
    step,
    serializeWorld,
    deserializeWorld,
    setGravity,
    setTimestep,
    onFrame,
  };
}
