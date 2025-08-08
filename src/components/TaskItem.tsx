'use client';

import { Task } from '@/lib/types';
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Plus,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { Checkbox } from './ui/checkbox';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { Calendar } from './ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { SuggestSubtasksDialog } from './SuggestSubtasksDialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from './ui/dropdown-menu';

type TaskItemProps = {
  task: Task;
  onUpdate: (id: string, updates: Partial<Omit<Task, 'id' | 'subtasks' | 'icon'>>) => void;
  onToggleComplete: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onAddSubtask: (parentId: string, subtaskData: Omit<Task, 'id' | 'subtasks'>) => void;
};

export function TaskItem({
  task,
  onUpdate,
  onToggleComplete,
  onDelete,
  onAddSubtask,
}: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState({ ...task });
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showSubtaskSuggestions, setShowSubtaskSuggestions] = useState(false);

  const handleSave = () => {
    onUpdate(task.id, {
      title: editedTask.title,
      description: editedTask.description,
      dueDate: editedTask.dueDate,
    });
    setIsEditing(false);
  };

  const handleAddSubtask = () => {
    if (newSubtaskTitle.trim()) {
      onAddSubtask(task.id, { title: newSubtaskTitle.trim(), completed: false });
      setNewSubtaskTitle('');
      setIsAddingSubtask(false);
      setIsExpanded(true);
    }
  };

  const handleAddSuggestedSubtasks = (subtasks: string[]) => {
    subtasks.forEach((title) => {
      onAddSubtask(task.id, { title, completed: false });
    });
    setIsExpanded(true);
  };

  const handleCancelEdit = () => {
    setEditedTask({ ...task });
    setIsEditing(false);
  };
  
  const TaskIcon = task.icon;

  return (
    <Card
      className={cn('w-full transition-all duration-300', task.completed ? 'bg-muted/50' : 'bg-card')}
    >
      <div className="p-3 sm:p-4 flex flex-col gap-2">
        {isEditing ? (
          <div className="flex flex-col gap-3">
            <Input
              value={editedTask.title}
              onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
              className="text-lg font-semibold"
              aria-label="Edit task title"
            />
            <div className="relative">
              <Textarea
                value={editedTask.description || ''}
                onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
                placeholder="Add a description or comment..."
                aria-label="Edit task description"
                rows={2}
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowSubtaskSuggestions(true)}
                title="Suggest Subtasks with AI"
                className="absolute bottom-2 right-2 h-7 w-7"
                disabled={!editedTask.description}
              >
                <Sparkles className="h-4 w-4 text-primary" />
              </Button>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={'outline'} className={cn('w-full justify-start text-left font-normal', !editedTask.dueDate && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {editedTask.dueDate ? format(editedTask.dueDate, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={editedTask.dueDate}
                  onSelect={(date) => setEditedTask({ ...editedTask, dueDate: date ?? undefined })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="ghost" onClick={handleCancelEdit}>Cancel</Button>
              <Button onClick={handleSave}>Save</Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <Checkbox
              id={`task-${task.id}`}
              checked={task.completed}
              onCheckedChange={(checked) => onToggleComplete(task.id, !!checked)}
              className="mt-1"
              aria-labelledby={`task-label-${task.id}`}
            />
            <div className="flex-grow">
              <div className="flex items-start justify-between gap-2">
                <label
                  id={`task-label-${task.id}`}
                  htmlFor={`task-${task.id}`}
                  className={cn(
                    'font-medium transition-colors cursor-pointer',
                    task.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                  )}
                  onClick={() => !isEditing && setIsEditing(true)}
                >
                  {task.title}
                </label>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {task.dueDate && (
                    <span className={cn(
                      "text-xs rounded-full px-2 py-0.5 whitespace-nowrap",
                      new Date() > new Date(task.dueDate) && !task.completed ? "bg-destructive/20 text-destructive-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      {format(task.dueDate, 'MMM d')}
                    </span>
                  )}
                  <TaskIcon className="h-4 w-4 text-muted-foreground" />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setIsEditing(true)}>Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-destructive focus:text-destructive">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              {task.description && (
                <p className="text-sm text-muted-foreground mt-1 cursor-pointer" onClick={() => !isEditing && setIsEditing(true)}>{task.description}</p>
              )}
            </div>
          </div>
        )}

        {(task.subtasks.length > 0 || isAddingSubtask || isExpanded) && (
          <div className="pl-8 pt-2 space-y-2">
            {task.subtasks.length > 0 && (
                <button onClick={() => setIsExpanded(!isExpanded)} className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-2 -ml-8 pl-8 w-full py-1">
                  {isExpanded ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
                  <span>{task.subtasks.length} Subtask{task.subtasks.length !== 1 && 's'}</span>
                </button>
            )}
            
            {isExpanded && (
              <>
                <div className="flex flex-col gap-2">
                  {task.subtasks.map(subtask => (
                    <TaskItem
                      key={subtask.id}
                      task={subtask}
                      onUpdate={onUpdate}
                      onToggleComplete={onToggleComplete}
                      onDelete={onDelete}
                      onAddSubtask={onAddSubtask}
                    />
                  ))}
                </div>
              
                {isAddingSubtask ? (
                  <div className="flex gap-2 items-center">
                    <Input
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                      placeholder="New subtask title"
                      autoFocus
                      className="h-9"
                    />
                    <Button onClick={handleAddSubtask} size="sm">Add</Button>
                    <Button variant="ghost" onClick={() => setIsAddingSubtask(false)} size="sm">Cancel</Button>
                  </div>
                ) : (
                  <Button variant="ghost" onClick={() => setIsAddingSubtask(true)} className="text-muted-foreground hover:text-primary -ml-2 h-9">
                    <Plus className="h-4 w-4 mr-2" />
                    Add subtask
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </div>
      {editedTask.description && <SuggestSubtasksDialog
        open={showSubtaskSuggestions}
        onOpenChange={setShowSubtaskSuggestions}
        taskDescription={editedTask.description}
        onAddSubtasks={handleAddSuggestedSubtasks}
      />}
    </Card>
  );
}
