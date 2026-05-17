/**
 * BodyPropertyEditor — Panel to edit physics properties of a selected body.
 * Enables IIT JEE style setups: set initial velocity, mass, static toggle, etc.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useLabStore } from '@/stores/useLabStore';
import type { PhysicsEngine } from '@/services/physics';

interface BodyPropertyEditorProps {
  engineRef: React.MutableRefObject<PhysicsEngine | null>;
}

interface BodyProps {
  vx: string;
  vy: string;
  mass: string;
  friction: string;
  restitution: string;
  angle: string;
  isStatic: boolean;
}

const BodyPropertyEditor: React.FC<BodyPropertyEditorProps> = ({ engineRef }) => {
  const { selectedBodyId, trackedBodyId, setTrackedBodyId } = useLabStore();
  const [props, setProps] = useState<BodyProps>({
    vx: '0', vy: '0', mass: '1', friction: '0.5', restitution: '0.3', angle: '0', isStatic: false,
  });
  const [bodyLabel, setBodyLabel] = useState('');

  // Load body properties when selection changes
  useEffect(() => {
    if (!selectedBodyId || !engineRef.current) return;
    const body = engineRef.current.getBody(selectedBodyId);
    if (!body) return;

    setBodyLabel(body.label || '');
    setProps({
      vx: body.velocity.x.toFixed(2),
      vy: body.velocity.y.toFixed(2),
      mass: body.mass.toFixed(2),
      friction: body.friction.toFixed(2),
      restitution: body.restitution.toFixed(2),
      angle: ((body.angle * 180) / Math.PI).toFixed(1),
      isStatic: body.isStatic,
    });
  }, [selectedBodyId, engineRef]);

  const applyProperty = useCallback(
    (key: keyof BodyProps, value: string | boolean) => {
      if (!selectedBodyId || !engineRef.current) return;
      const engine = engineRef.current;

      switch (key) {
        case 'vx':
        case 'vy': {
          const vx = key === 'vx' ? parseFloat(value as string) || 0 : parseFloat(props.vx) || 0;
          const vy = key === 'vy' ? parseFloat(value as string) || 0 : parseFloat(props.vy) || 0;
          engine.setBodyVelocity(selectedBodyId, { x: vx, y: vy });
          break;
        }
        case 'mass': {
          const m = parseFloat(value as string);
          if (m > 0) engine.setBodyMass(selectedBodyId, m);
          break;
        }
        case 'friction': {
          const f = parseFloat(value as string);
          if (f >= 0) engine.setBodyFriction(selectedBodyId, f);
          break;
        }
        case 'restitution': {
          const r = parseFloat(value as string);
          if (r >= 0) engine.setBodyRestitution(selectedBodyId, r);
          break;
        }
        case 'angle': {
          const deg = parseFloat(value as string) || 0;
          engine.setBodyAngle(selectedBodyId, (deg * Math.PI) / 180);
          break;
        }
        case 'isStatic': {
          engine.setBodyStatic(selectedBodyId, value as boolean);
          break;
        }
      }
    },
    [selectedBodyId, engineRef, props]
  );

  const handleChange = (key: keyof BodyProps, value: string) => {
    setProps((prev) => ({ ...prev, [key]: value }));
  };

  const handleBlur = (key: keyof BodyProps) => {
    applyProperty(key, props[key]);
  };

  const handleKeyDown = (e: React.KeyboardEvent, key: keyof BodyProps) => {
    if (e.key === 'Enter') {
      applyProperty(key, props[key]);
      (e.target as HTMLInputElement).blur();
    }
  };

  if (!selectedBodyId) return null;

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 glass-card p-4 min-w-[520px] animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-lab-accent" />
          <span className="text-xs font-semibold text-lab-text uppercase tracking-wider">
            Properties
          </span>
          <span className="text-[10px] text-lab-dim font-mono">
            {bodyLabel} ({selectedBodyId.slice(0, 8)})
          </span>
        </div>
        <button
          onClick={() => {
            if (trackedBodyId === selectedBodyId) {
              setTrackedBodyId(null);
            } else {
              setTrackedBodyId(selectedBodyId);
            }
          }}
          className={`text-[10px] px-2 py-1 rounded font-medium transition-colors ${
            trackedBodyId === selectedBodyId
              ? 'bg-lab-accent/20 text-lab-accent'
              : 'bg-lab-surface text-lab-muted hover:text-lab-text'
          }`}
        >
          {trackedBodyId === selectedBodyId ? '📊 Tracking' : '📊 Track'}
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 items-end">
        {/* Velocity X */}
        <div>
          <label className="block text-[9px] text-lab-muted font-medium mb-1 uppercase">Vx (m/s)</label>
          <input
            type="number"
            step="0.5"
            value={props.vx}
            onChange={(e) => handleChange('vx', e.target.value)}
            onBlur={() => handleBlur('vx')}
            onKeyDown={(e) => handleKeyDown(e, 'vx')}
            className="input-field text-xs py-1.5 px-2 text-center font-mono"
          />
        </div>

        {/* Velocity Y */}
        <div>
          <label className="block text-[9px] text-lab-muted font-medium mb-1 uppercase">Vy (m/s)</label>
          <input
            type="number"
            step="0.5"
            value={props.vy}
            onChange={(e) => handleChange('vy', e.target.value)}
            onBlur={() => handleBlur('vy')}
            onKeyDown={(e) => handleKeyDown(e, 'vy')}
            className="input-field text-xs py-1.5 px-2 text-center font-mono"
          />
        </div>

        {/* Mass */}
        <div>
          <label className="block text-[9px] text-lab-muted font-medium mb-1 uppercase">Mass (kg)</label>
          <input
            type="number"
            step="0.5"
            min="0.1"
            value={props.mass}
            onChange={(e) => handleChange('mass', e.target.value)}
            onBlur={() => handleBlur('mass')}
            onKeyDown={(e) => handleKeyDown(e, 'mass')}
            className="input-field text-xs py-1.5 px-2 text-center font-mono"
          />
        </div>

        {/* Friction */}
        <div>
          <label className="block text-[9px] text-lab-muted font-medium mb-1 uppercase">Friction</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="1"
            value={props.friction}
            onChange={(e) => handleChange('friction', e.target.value)}
            onBlur={() => handleBlur('friction')}
            onKeyDown={(e) => handleKeyDown(e, 'friction')}
            className="input-field text-xs py-1.5 px-2 text-center font-mono"
          />
        </div>

        {/* Restitution (Bounciness) */}
        <div>
          <label className="block text-[9px] text-lab-muted font-medium mb-1 uppercase">Bounce</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="1"
            value={props.restitution}
            onChange={(e) => handleChange('restitution', e.target.value)}
            onBlur={() => handleBlur('restitution')}
            onKeyDown={(e) => handleKeyDown(e, 'restitution')}
            className="input-field text-xs py-1.5 px-2 text-center font-mono"
          />
        </div>

        {/* Angle */}
        <div>
          <label className="block text-[9px] text-lab-muted font-medium mb-1 uppercase">Angle (°)</label>
          <input
            type="number"
            step="5"
            value={props.angle}
            onChange={(e) => handleChange('angle', e.target.value)}
            onBlur={() => handleBlur('angle')}
            onKeyDown={(e) => handleKeyDown(e, 'angle')}
            className="input-field text-xs py-1.5 px-2 text-center font-mono"
          />
        </div>

        {/* Static Toggle */}
        <div className="flex flex-col items-center">
          <label className="block text-[9px] text-lab-muted font-medium mb-1 uppercase">Pin</label>
          <button
            onClick={() => {
              const newVal = !props.isStatic;
              setProps((p) => ({ ...p, isStatic: newVal }));
              applyProperty('isStatic', newVal);
            }}
            className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-all ${
              props.isStatic
                ? 'bg-lab-warning/20 text-lab-warning border border-lab-warning/30'
                : 'bg-lab-surface text-lab-muted border border-lab-border hover:text-lab-text'
            }`}
          >
            {props.isStatic ? '📌' : '○'}
          </button>
        </div>
      </div>

      {/* Quick velocity presets */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-[9px] text-lab-dim uppercase font-medium">Quick:</span>
        {[
          { label: '← 5', vx: -5, vy: 0 },
          { label: '→ 5', vx: 5, vy: 0 },
          { label: '↑ 5', vx: 0, vy: -5 },
          { label: '→↑', vx: 5, vy: -5 },
          { label: '←↑', vx: -5, vy: -5 },
          { label: 'Stop', vx: 0, vy: 0 },
        ].map((preset) => (
          <button
            key={preset.label}
            onClick={() => {
              setProps((p) => ({ ...p, vx: String(preset.vx), vy: String(preset.vy) }));
              engineRef.current?.setBodyVelocity(selectedBodyId, { x: preset.vx, y: preset.vy });
            }}
            className="text-[10px] px-2 py-1 rounded bg-lab-surface border border-lab-border text-lab-muted hover:text-lab-accent hover:border-lab-accent/30 transition-all font-mono"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default BodyPropertyEditor;
