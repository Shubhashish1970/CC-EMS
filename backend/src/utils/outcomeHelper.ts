import { TaskStatus, Outcome } from '../models/CallTask.js';

/**
 * Calculate outcome label from task status
 * This matches the frontend outcomeLabel function
 */
export const getOutcomeFromStatus = (status: TaskStatus): Outcome => {
  if (status === 'completed') return 'Completed Conversation';
  if (status === 'in_progress') return 'In Progress';
  if (status === 'invalid_number') return 'Unsuccessful';
  if (status === 'not_reachable') return 'Unsuccessful';
  return 'Unknown';
};
