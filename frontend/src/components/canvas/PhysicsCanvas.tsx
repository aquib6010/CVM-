/**
 * PhysicsCanvas — Main canvas component integrating Matter.js engine.
 * Handles click-to-add bodies based on active tool, mouse tracking,
 * and renders the cursor overlay for multiplayer.
 * Includes undo/redo support via command pattern.
 */
import React, { useRef, useEffect, useCallback, useState } from 'react';
import Matter from 'matter-js';
import { usePhysicsEngine } from '@/hooks/usePhysicsEngine';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useLabStore } from '@/stores/useLabStore';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import CanvasControls from './CanvasControls';
import BodyPropertyEditor from './BodyPropertyEditor';
import AnalyticsPanel from '@/components/analytics/AnalyticsPanel';
import CursorOverlay from './CursorOverlay';
import type { BodyType, ConstraintType } from '@shared/types';

interface PhysicsCanvasProps {
  width: number;
  height: number;
  onBodyAdded?: (id: string, type: BodyType, position: { x: number; y: number }) => void;
  onBodyRemoved?: (id: string) => void;
  onSerializeWorld?: (state: any) => void;
}

const PhysicsCanvas: React.FC<PhysicsCanvasProps> = ({
  width,
  height,
  onBodyAdded,
  onBodyRemoved,
  onSerializeWorld,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [undoRedoState, setUndoRedoState] = useState({ canUndo: false, canRedo: false });
  
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
    setGravity,
    serializeWorld,
    onFrame,
  } = usePhysicsEngine(containerRef, {
    width,
    height,
    gravity: { x: 0, y: 1 },
    wireframes: false,
    background: 'transparent',
  });

  const { pushAction, undo, redo, canUndo, canRedo, clear } = useUndoRedo();

  // Update undo/redo UI state
  useEffect(() => {
    setUndoRedoState({ canUndo, canRedo });
  }, [canUndo, canRedo]);

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

  // Handle canvas click to add bodies or create constraints with undo/redo
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      // Use the container's rect for consistent coordinates
      const rect = container.getBoundingClientRect();
      // Snap to 25px grid for easy alignment
      const GRID = 25;
      const x = Math.round((e.clientX - rect.left) / GRID) * GRID;
      const y = Math.round((e.clientY - rect.top) / GRID) * GRID;

      console.log(`[Canvas] Click at (${x}, ${y}) tool=${activeTool}`);

      const bodyTools: BodyType[] = ['rectangle', 'circle', 'trapezoid'];
      const constraintTools: ConstraintType[] = ['spring', 'rope', 'pivot', 'motor'];

      if (bodyTools.includes(activeTool as BodyType)) {
        // Add body with undo support
        let addedId: string | null = null;
        pushAction({
          type: 'addBody',
          description: `Add ${activeTool}`,
          execute: () => {
            addedId = addBody(activeTool as BodyType, { x, y });
            console.log(`[Canvas] Body created: ${addedId} type=${activeTool}`);
            if (addedId) {
              setSelectedBodyId(addedId);
              setTrackedBodyId(addedId);
              onBodyAdded?.(addedId, activeTool as BodyType, { x, y });
            }
          },
          undo: () => {
            if (addedId) {
              removeBody(addedId);
              onBodyRemoved?.(addedId);
              setSelectedBodyId(null);
              console.log(`[Canvas] Body removed (undo): ${addedId}`);
            }
          },
        });
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
            let addedConstraintId: string | null = null;

            pushAction({
              type: 'addConstraint',
              description: `Add ${constraintType} constraint`,
              execute: () => {
                addedConstraintId = addConstraint(constraintType, constraintSourceId, clickedBodyId);
                console.log(`[Canvas] Constraint created: ${addedConstraintId} (${constraintType}) ${constraintSourceId} → ${clickedBodyId}`);
              },
              undo: () => {
                // TODO: Implement constraint removal when physics engine supports it
                console.log(`[Canvas] Constraint removal not yet implemented: ${addedConstraintId}`);
              },
            });
          }
          setConstraintSourceId(null);
        }
      } else if (activeTool === 'delete') {
        const clickedBodyId = findBodyAtPoint(x, y);
        if (clickedBodyId) {
          // Capture body state before removal for undo
          const engine = engineRef.current;
          if (!engine) return;

          const userBodies = engine.getAllBodies();
          const bodyToDelete = userBodies.get(clickedBodyId);
          const deletedBodyState = bodyToDelete
            ? {
                id: clickedBodyId,
                type: bodyToDelete.type,
                position: bodyToDelete.position,
                angle: bodyToDelete.angle,
                // ... store other properties as needed
              }
            : null;

          pushAction({
            type: 'removeBody',
            description: `Delete body`,
            execute: () => {
              removeBody(clickedBodyId);
              onBodyRemoved?.(clickedBodyId);
              if (selectedBodyId === clickedBodyId) {
                setSelectedBodyId(null);
              }
              console.log(`[Canvas] Body deleted: ${clickedBodyId}`);
            },
            undo: () => {
              // Re-add body with same properties
              if (deletedBodyState) {
                addBody(deletedBodyState.type as BodyType, deletedBodyState.position);
                console.log(`[Canvas] Body restored (undo): ${clickedBodyId}`);
              }
            },
          });
        }
      } else if (activeTool === 'select') {
        // Click to select a body and load its properties
        const clickedBodyId = findBodyAtPoint(x, y);
        if (clickedBodyId) {
          setSelectedBodyId(clickedBodyId);
          setTrackedBodyId(clickedBodyId);
        } else {
          setSelectedBodyId(null);
        }
      }
    },
    [
      activeTool,
      addBody,
      addConstraint,
      removeBody,
      findBodyAtPoint,
      constraintSourceId,
      setConstraintSourceId,
      setSelectedBodyId,
      setTrackedBodyId,
      selectedBodyId,
      onBodyAdded,
      onBodyRemoved,
      pushAction,
      engineRef,
    ]
  );

  // Keyboard shortcuts including undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Undo/Redo shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (canUndo) {
          undo();
          console.log('[Canvas] Undo executed');
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        if (canRedo) {
          redo();
          console.log('[Canvas] Redo executed');
        }
        return;
      }

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
          clear();
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
  }, [isPlaying, selectedBodyId, play, pause, reset, removeBody, setActiveTool, setSelectedBodyId, onBodyRemoved, undo, redo, canUndo, canRedo, clear]);

  // Periodically serialize world state for save
  useEffect(() => {
    const interval = setInterval(() => {
      const state = serializeWorld();
      onSerializeWorld?.(state);
    }, 2000); // Serialize every 2 seconds

    return () => clearInterval(interval);
  }, [serializeWorld, onSerializeWorld]);

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

        {/* Click capture layer — z-20, captures clicks in all modes */}
        <div
          className="absolute inset-0 z-20"
          style={{ width, height, cursor: activeTool === 'select' ? 'pointer' : activeTool === 'delete' ? 'not-allowed' : 'crosshair' }}
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
          {/* Undo/Redo buttons */}
          <div className="glass-card flex gap-1 p-1">
            <button
              onClick={undo}
              disabled={!undoRedoState.canUndo}
              className="px-2 py-1 text-[10px] font-medium text-lab-text hover:bg-lab-bg disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors"
              title="Undo (Ctrl+Z)"
            >
              ↶ Undo
            </button>
            <div className="w-px bg-lab-border" />
            <button
              onClick={redo}
              disabled={!undoRedoState.canRedo}
              className="px-2 py-1 text-[10px] font-medium text-lab-text hover:bg-lab-bg disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors"
              title="Redo (Ctrl+Y)"
            >
              Redo ↷
            </button>
          </div>
        </div>

        {/* Body property editor (velocity, mass, friction, etc.) */}
        <BodyPropertyEditor engineRef={engineRef} />

        {/* Simulation controls */}
        <CanvasControls
          onPlay={play}
          onPause={pause}
          onReset={reset}
          onStep={step}
          onTimestepChange={setTimestep}
          onGravityChange={setGravity}
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
