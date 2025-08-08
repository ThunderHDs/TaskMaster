import type { LucideIcon } from 'lucide-react';

export type Task = {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date;
  completed: boolean;
  subtasks: Task[];
  icon: LucideIcon;
};
