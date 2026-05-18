/**
 * SaveModal — Modal to save/update physics experiment.
 * Captures experiment name, description, and publishes to backend.
 */
import React, { useState } from 'react';
import { experimentsAPI } from '@/services/api';

interface SaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (experimentId: string) => void;
  worldState: any; // Serialized world state
  existingExperimentId?: string;
  existingExperimentName?: string;
}

const SaveModal: React.FC<SaveModalProps> = ({
  isOpen,
  onClose,
  onSave,
  worldState,
  existingExperimentId,
  existingExperimentName,
}) => {
  const [name, setName] = useState(existingExperimentName || '');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Experiment name is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      let response;
      if (existingExperimentId) {
        // Update existing
        response = await experimentsAPI.update(existingExperimentId, {
          name,
          description,
          worldState,
        });
      } else {
        // Create new
        response = await experimentsAPI.create({
          name,
          description,
          worldState,
        });
      }

      const experimentId = response.data._id || response.data.id;
      onSave(experimentId);
      setName('');
      setDescription('');
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save experiment');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-lab-surface border border-lab-border rounded-lg p-6 w-96 shadow-lg">
        <h2 className="text-lg font-semibold text-lab-text mb-4">
          {existingExperimentId ? 'Update Experiment' : 'Save Experiment'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-lab-muted mb-1">
              Experiment Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Physics Simulation"
              className="w-full px-3 py-2 bg-lab-bg border border-lab-border rounded text-lab-text focus:outline-none focus:ring-2 focus:ring-lab-accent"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-lab-muted mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your experiment..."
              className="w-full px-3 py-2 bg-lab-bg border border-lab-border rounded text-lab-text focus:outline-none focus:ring-2 focus:ring-lab-accent resize-none h-24"
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="text-sm text-lab-danger bg-lab-danger/10 px-3 py-2 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 bg-lab-bg border border-lab-border rounded text-lab-text hover:bg-lab-border/50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-lab-accent text-white rounded hover:bg-lab-accent-light disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save Experiment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SaveModal;
