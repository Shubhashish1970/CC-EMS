export type TaskStatus = 'sampled_in_queue' | 'in_progress' | 'completed' | 'not_reachable' | 'invalid_number';

/**
 * Display labels for task statuses
 */
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  sampled_in_queue: 'Sampled - in queue',
  in_progress: 'In Progress',
  completed: 'Completed',
  not_reachable: 'Not Reachable',
  invalid_number: 'Invalid Number',
};

/**
 * Get display label for a task status
 */
export const getTaskStatusLabel = (status: string): string => {
  return TASK_STATUS_LABELS[status as TaskStatus] || status;
};
