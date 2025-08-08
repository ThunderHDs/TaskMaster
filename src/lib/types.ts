import type { LucideIcon } from 'lucide-react';

export type Tag = {
  id: string;
  label: string;
  color: string;
};

export type Activity = {
  id: string;
  type: 'comment' | 'log';
  content: string;
  timestamp: Date | string;
};

export type Task = {
  id: string;
  title: string;
  description?: string;
  dateRange?: {
    from?: Date | string;
    to?: Date | string;
  };
  completed: boolean;
  subtasks: Task[];
  icon: LucideIcon;
  tags?: string[];
  activity?: Activity[];
};
