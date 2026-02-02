import React, { useState, useEffect } from 'react';
import { tasksAPI, usersAPI } from '../services/api';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import Button from './shared/Button';
import Modal from './shared/Modal';
import InfoBanner from './shared/InfoBanner';

interface Task {
  _id: string;
  farmerId: {
    preferredLanguage: string;
  };
  assignedAgentId: {
    _id: string;
    name: string;
  };
}

interface Agent {
  _id: string;
  name: string;
  email: string;
  employeeId: string;
  languageCapabilities: string[];
}

interface ReassignModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onReassigned: ((agentId: string) => void | Promise<void>) | (() => void);
  isBulkMode?: boolean;
  selectedTaskIds?: string[];
}

const ReassignModal: React.FC<ReassignModalProps> = ({ isOpen, onClose, task, onReassigned, isBulkMode = false, selectedTaskIds = [] }) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch agents with matching language capability
  useEffect(() => {
    if (isOpen) {
      const fetchAgents = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const response = await usersAPI.getUsers({ role: 'cc_agent', isActive: true }) as any;
          if (response.success && response.data?.users) {
            const allAgents = response.data.users;
            
            if (isBulkMode) {
              // In bulk mode, show all agents (language matching will be handled by backend)
              setAgents(allAgents);
              if (allAgents.length > 0) {
                setSelectedAgentId(allAgents[0]._id);
              }
            } else if (task) {
              // Filter agents by language capability for single task
              const capableAgents = allAgents.filter((agent: Agent) =>
                agent.languageCapabilities && agent.languageCapabilities.includes(task.farmerId.preferredLanguage)
              );
              setAgents(capableAgents);
              
              // Pre-select current agent if they have the language capability
              const currentAgent = capableAgents.find((a: Agent) => a._id === task.assignedAgentId._id);
              if (currentAgent) {
                setSelectedAgentId(currentAgent._id);
              } else if (capableAgents.length > 0) {
                setSelectedAgentId(capableAgents[0]._id);
              }
            }
          }
        } catch (err: any) {
          setError(err.message || 'Failed to load agents');
        } finally {
          setIsLoading(false);
        }
      };
      fetchAgents();
    }
  }, [isOpen, task, isBulkMode]);

  const handleReassign = async () => {
    if (!selectedAgentId) {
      setError('Please select an agent');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      if (isBulkMode && selectedTaskIds.length > 0) {
        // Bulk reassign
        if (typeof onReassigned === 'function' && onReassigned.length === 1) {
          await (onReassigned as (agentId: string) => void | Promise<void>)(selectedAgentId);
        }
        setSuccess(true);
        setTimeout(() => {
          handleClose();
        }, 1500);
      } else if (task) {
        // Single task reassign
        const response = await tasksAPI.reassignTask(task._id, selectedAgentId) as any;
        if (response.success) {
          setSuccess(true);
          setTimeout(() => {
            if (typeof onReassigned === 'function' && onReassigned.length === 0) {
              (onReassigned as () => void)();
            }
          }, 1500);
        } else {
          setError('Failed to reassign task');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reassign task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedAgentId('');
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={isBulkMode ? `Reassign ${selectedTaskIds.length} Tasks` : "Reassign Task"} size="md">
      <div className="space-y-6">
        {/* Current Assignment Info */}
        {!isBulkMode && task && (
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Current Assignment</p>
            <p className="text-sm font-medium text-slate-700">
              {task.assignedAgentId.name}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Farmer Language: <span className="font-medium">{task.farmerId.preferredLanguage}</span>
            </p>
          </div>
        )}

        {isBulkMode && (
          <InfoBanner title={`Reassign ${selectedTaskIds.length} task(s)`}>
            You are about to reassign <strong>{selectedTaskIds.length} task(s)</strong> to a new agent.
            Language matching will be validated by the system. Tasks may be skipped if the selected agent doesn&apos;t have the required language capabilities.
          </InfoBanner>
        )}

        {/* Agent Selection */}
        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="animate-spin mx-auto mb-4 text-green-700" size={32} />
            <p className="text-sm text-slate-600 font-medium">Loading agents...</p>
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="mx-auto mb-4 text-orange-500" size={32} />
            <p className="text-sm text-orange-600 font-medium mb-2">
              {isBulkMode 
                ? 'No active agents available'
                : `No agents available with language capability: ${task?.farmerId.preferredLanguage}`
              }
            </p>
            <p className="text-xs text-slate-500">
              Please assign language capabilities to agents first.
            </p>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
              Select New Agent
            </label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {agents.map((agent) => (
                <div
                  key={agent._id}
                  onClick={() => setSelectedAgentId(agent._id)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    selectedAgentId === agent._id
                      ? 'border-green-500 bg-green-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black text-slate-900">{agent.name}</p>
                      <p className="text-xs text-slate-600">{agent.email}</p>
                      <p className="text-xs text-slate-500 mt-1">ID: {agent.employeeId}</p>
                    </div>
                    {selectedAgentId === agent._id && (
                      <CheckCircle className="text-green-600" size={20} />
                    )}
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <p className="text-xs text-slate-500">
                      Languages: <span className="font-medium">{agent.languageCapabilities.join(', ')}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="text-red-600" size={18} />
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="text-green-600" size={18} />
              <p className="text-sm text-green-600 font-medium">Task reassigned successfully!</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleReassign}
            disabled={!selectedAgentId || isSubmitting || isLoading || agents.length === 0}
            loading={isSubmitting}
          >
            {isBulkMode ? `Reassign ${selectedTaskIds.length} Tasks` : 'Reassign Task'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ReassignModal;
