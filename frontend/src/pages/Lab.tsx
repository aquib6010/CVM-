/**
 * Lab Page — Main workspace with 3-panel layout:
 * [Toolbar | Physics Canvas | Analytics Panel]
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import PhysicsToolbar from '@/components/toolbar/PhysicsToolbar';
import PhysicsCanvas from '@/components/canvas/PhysicsCanvas';
import SaveModal from '@/components/experiments/SaveModal';
import { useLabStore } from '@/stores/useLabStore';
import { useSocket } from '@/hooks/useSocket';
import { useAuthStore } from '@/stores/useAuthStore';
import { experimentsAPI } from '@/services/api';

const Lab: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { setRoomId, setInitialWorldState } = useLabStore();
  const { activeTool } = useLabStore();  // Debug: get activeTool
  const { user } = useAuthStore();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [experimentId, setExperimentId] = useState<string | undefined>();
  const [experimentName, setExperimentName] = useState<string | undefined>();
  const [worldStateRef, setWorldStateRef] = useState<any>(null);

  // Derive canvas dimensions from window size
  const [canvasSize, setCanvasSize] = useState({
    width: window.innerWidth - 72 - 300, // minus toolbar and analytics panel
    height: window.innerHeight,
  });

  // Load experiment from URL param or create new room
  useEffect(() => {
    const loadExperiment = async () => {
      const experimentIdParam = searchParams.get('experiment');
      if (experimentIdParam) {
        try {
          const response = await experimentsAPI.getById(experimentIdParam);
          setExperimentId(experimentIdParam);
          setExperimentName(response.data.name);
          setInitialWorldState(response.data.worldState);
          console.log('[Lab] Loaded experiment:', experimentIdParam);
        } catch (err) {
          console.error('[Lab] Failed to load experiment:', err);
        }
      }
    };

    loadExperiment();
  }, [searchParams, setInitialWorldState]);

  // Room setup (multiplayer)
  useEffect(() => {
    const roomId = searchParams.get('room') || `lab-${uuidv4().slice(0, 8)}`;
    setRoomId(roomId);

    // Update URL with room ID if not present
    if (!searchParams.get('room')) {
      const url = new URL(window.location.href);
      url.searchParams.set('room', roomId);
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams, setRoomId]);

  // Socket integration for multiplayer
  const roomId = searchParams.get('room') || '';
  // Stabilize userId so it doesn't change on every render (was causing infinite re-render loop)
  const anonIdRef = useRef(`anon-${uuidv4()}`);
  const userId = useMemo(() => user?._id || anonIdRef.current, [user?._id]);
  const displayName = user?.displayName || 'Anonymous';

  useSocket({
    roomId,
    userId,
    displayName,
    onBodyAdded: (body) => {
      console.log('[Lab] Remote body added:', body);
    },
    onBodyUpdated: (bodyId, position, angle) => {
      console.log('[Lab] Remote body updated:', bodyId, position, angle);
    },
    onBodyRemoved: (bodyId) => {
      console.log('[Lab] Remote body removed:', bodyId);
    },
  });

  // Responsive resize
  useEffect(() => {
    const handleResize = () => {
      const showAnalytics = useLabStore.getState().showAnalytics;
      setCanvasSize({
        width: window.innerWidth - 72 - (showAnalytics ? 300 : 0),
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    // Also subscribe to analytics toggle
    let prevShowAnalytics = useLabStore.getState().showAnalytics;
    const unsub = useLabStore.subscribe((state) => {
      if (state.showAnalytics !== prevShowAnalytics) {
        prevShowAnalytics = state.showAnalytics;
        setCanvasSize({
          width: window.innerWidth - 72 - (state.showAnalytics ? 300 : 0),
          height: window.innerHeight,
        });
      }
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      unsub();
    };
  }, []);

  const handleSaveExperiment = (newExperimentId: string) => {
    setExperimentId(newExperimentId);
    setExperimentName('Updated Experiment');
    console.log('[Lab] Experiment saved:', newExperimentId);
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-lab-bg">
      {/* Top bar with save button */}
      <div className="absolute top-0 right-0 z-40 p-3 flex gap-2">
        <button
          onClick={() => setShowSaveModal(true)}
          className="px-4 py-2 bg-lab-accent text-white rounded hover:bg-lab-accent-light transition-colors text-sm font-medium"
        >
          💾 Save Experiment
        </button>
      </div>

      {/* Left Toolbar */}
      <PhysicsToolbar />

      {/* Center Canvas + Right Analytics */}
      <PhysicsCanvas
        width={canvasSize.width}
        height={canvasSize.height}
        onSerializeWorld={(state) => setWorldStateRef(state)}
      />

      {/* Save Modal */}
      <SaveModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveExperiment}
        worldState={worldStateRef}
        existingExperimentId={experimentId}
        existingExperimentName={experimentName}
      />
    </div>
  );
};

export default Lab;
