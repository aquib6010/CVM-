/**
 * PhysicsCanvas — Main canvas component integrating Matter.js engine.
 * Handles click-to-add bodies based on active tool, mouse tracking,
 * and renders the cursor overlay for multiplayer.
 */
import React, { useRef, useEffect, useCallback } from 'react';
import Matter from 'matter-js';
import { usePhysicsEngine } from '@/hooks/usePhysicsEngine';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useLabStore } from '@/stores/useLabStore';
import CanvasControls from './CanvasControls';
import AnalyticsPanel from '@/components/analytics/AnalyticsPanel';
import CursorOverlay from './CursorOverlay';
import type { BodyType, ConstraintType } from '@shared/types';

interface PhysicsCanvasProps {
  width: number;
  height: number;
  onBodyAdded?: (id: string, type: BodyType, position: { x: number; y: number }) => void;
  onBodyRemoved?: (id: string) => void;
}

const PhysicsCanvas: React.FC<PhysicsCanvasProps> = ({
  width,
  height,
  onBodyAdded,
  onBodyRemoved,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    engineRef,
    addBody,
    removeBody,
    addConstraint,
    play,
    pause,
    reset,
    step,
    setTimestep,
    serializeWorld,
    onFrame,
  } = usePhysicsEngine(containerRef, {
    width,
    height,
    gravity: { x: 0, y: 1 },
    wireframes: false,
    background: 'transparent',
  });

  const {
    activeTool,
    setActiveTool,
    selectedBodyId,
    setSelectedBodyId,
    showAnalytics,
    trackedBodyId,
    setTrackedBodyId,
    isPlaying,
    isConnected,
    roomUsers,
    constraintSourceId,
    setConstraintSourceId,
  } = useLabStore();

  const { frames, latestFrame } = useAnalytics(engineRef, trackedBodyId);

  // Find which body was clicked using Matter.Query.point
  const findBodyAtPoint = useCallback(
    (x: number, y: number): string | null => {
      const engine = engineRef.current;
      if (!engine) return null;

      // Use Matter.Query.point for proper collision detection
      const allMatterBodies = Matter.Composite.allBodies(engine.getEngine().world);
      const hitBodies = Matter.Query.point(allMatterBodies, { x, y });

      // Find a user-created body (not walls/ground)
      const userBodies = engine.getAllBodies();
      for (const hit of hitBodies) {
        for (const [id, userBody] of userBodies) {
          if (userBody.id === hit.id) {
            return id;
          }
        }
      }

      // Fallback: distance-based check for small bodies (within 25px)
      let closestId: string | null = null;
      let closestDist = 25;
      for (const [id, body] of userBodies) {
        const dx = body.position.x - x;
        const dy = body.position.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < closestDist) {
          closestDist = dist;
          closestId = id;
        }
      }
      return closestId;
    },
    [engineRef]
  );

  // Handle canvas click to add bodies or create constraints
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      // Use the container's rect for consistent coordinates
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      console.log(`[Canvas] Click at (${Math.round(x)}, ${Math.round(y)}) tool=${activeTool}`);

      const bodyTools: BodyType[] = ['rectangle', 'circle', 'trapezoid'];
      const constraintTools: ConstraintType[] = ['spring', 'rope', 'pivot', 'motor'];

      if (bodyTools.includes(activeTool as BodyType)) {
        const id = addBody(activeTool as BodyType, { x, y });
        console.log(`[Canvas] Body created: ${id} type=${activeTool}`);
        if (id) {
          setSelectedBodyId(id);
          setTrackedBodyId(id);
          onBodyAdded?.(id, activeTool as BodyType, { x, y });
        }
      } else if (constraintTools.includes(activeTool as ConstraintType)) {
        // Two-click flow: first click = source body, second click = target body
        const clickedBodyId = findBodyAtPoint(x, y);
        console.log(`[Canvas] Constraint click — found body: ${clickedBodyId}, source: ${constraintSourceId}`);

        if (!clickedBodyId) {
          if (constraintSourceId) {
            setConstraintSourceId(null);
            console.log('[Canvas] Constraint cancelled — clicked empty space');
          }
          return;
        }

        if (!constraintSourceId) {
          // First click — set source body
          setConstraintSourceId(clickedBodyId);
          setSelectedBodyId(clickedBodyId);
          console.log(`[Canvas] Constraint source set: ${clickedBodyId}`);
        } else {
          // Second click — create constraint between source and target
          if (clickedBodyId !== constraintSourceId) {
            const constraintType = activeTool as ConstraintType;
            const cid = addConstraint(constraintType, constraintSourceId, clickedBodyId);
            console.log(`[Canvas] Constraint created: ${cid} (${constraintType}) ${constraintSourceId} → ${clickedBodyId}`);
          }
          setConstraintSourceId(null);
        }
      } else if (activeTool === 'delete') {
        const clickedBodyId = findBodyAtPoint(x, y);
        if (clickedBodyId) {
          removeBody(clickedBodyId);
          onBodyRemoved?.(clickedBodyId);
          if (selectedBodyId === clickedBodyId) {
            setSelectedBodyId(null);
          }
        }
      }
    },
    [activeTool, addBody, addConstraint, removeBody, findBodyAtPoint, constraintSourceId, setConstraintSourceId, setSelectedBodyId, setTrackedBodyId, selectedBodyId, onBodyAdded, onBodyRemoved]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (isPlaying) {
            pause();
            useLabStore.getState().setIsPlaying(false);
          } else {
            play();
            useLabStore.getState().setIsPlaying(true);
          }
          break;
        case 'r':
        case 'R':
          reset();
          useLabStore.getState().setIsPlaying(false);
          break;
        case 'Delete':
        case 'Backspace':
          if (selectedBodyId) {
            removeBody(selectedBodyId);
            onBodyRemoved?.(selectedBodyId);
            setSelectedBodyId(null);
          }
          break;
        case 'Escape':
          setActiveTool('select');
          setSelectedBodyId(null);
          break;
        case '1':
          setActiveTool('select');
          break;
        case '2':
          setActiveTool('rectangle');
          break;
        case '3':
          setActiveTool('circle');
          break;
        case '4':
          setActiveTool('trapezoid');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, selectedBodyId, play, pause, reset, removeBody, setActiveTool, setSelectedBodyId, onBodyRemoved]);

  return (
    <div className="flex-1 flex relative overflow-hidden">
      {/* Canvas Area */}
      <div className="flex-1 relative bg-lab-bg">
        {/* Grid background — z-0 */}
        <div className="absolute inset-0 grid-bg opacity-60 pointer-events-none z-0" />

        {/* Matter.js canvas container — z-10 */}
        <div
          ref={containerRef}
          className="absolute inset-0 z-10"
          style={{ width, height }}
        />

        {/* Click capture layer — z-20, above canvas. Only passes through in select mode */}
        <div
          className={`absolute inset-0 z-20 ${activeTool === 'select' ? 'pointer-events-none' : ''}`}
          style={{ width, height, cursor: activeTool === 'select' ? 'default' : activeTool === 'delete' ? 'not-allowed' : 'crosshair' }}
          onClick={handleCanvasClick}
        />

        {/* Multiplayer cursor overlay */}
        <CursorOverlay users={roomUsers} />

        {/* Connection & room info bar */}
        <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
          <div className="glass-card px-3 py-1.5 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-lab-success' : 'bg-lab-danger'} animate-pulse`} />
            <span className="text-[10px] text-lab-muted font-medium uppercase tracking-wider">
              {isConnected ? 'Connected' : 'Offline'}
            </span>
          </div>
          {roomUsers.length > 0 && (
            <div className="glass-card px-3 py-1.5 flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-lab-muted">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span className="text-[10px] text-lab-muted font-medium">{roomUsers.length}</span>
            </div>
          )}
        </div>

        {/* Active tool indicator */}
        <div className="absolute top-3 right-3 z-30 flex flex-col items-end gap-2">
          <div className="glass-card px-3 py-1.5">
            <span className="text-[10px] text-lab-accent font-semibold uppercase tracking-wider">
              {activeTool}
            </span>
          </div>
          {/* Constraint creation hint */}
          {(['spring', 'rope', 'pivot', 'motor'] as const).includes(activeTool as any) && (
            <div className="glass-card px-3 py-1.5">
              <span className="text-[10px] text-lab-warning font-medium">
                {constraintSourceId
                  ? '⬤ Click target body'
                  : '○ Click source body'}
              </span>
            </div>
          )}
        </div>

        {/* Simulation controls */}
        <CanvasControls
          onPlay={play}
          onPause={pause}
          onReset={reset}
          onStep={step}
          onTimestepChange={setTimestep}
        />
      </div>

      {/* Analytics Panel */}
      {showAnalytics && (
        <AnalyticsPanel
          frames={frames}
          latestFrame={latestFrame}
          trackedBodyId={trackedBodyId}
        />
      )}
    </div>
  );
};

export default PhysicsCanvas;
