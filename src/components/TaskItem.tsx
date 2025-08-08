'use client';

import { Tag, Task } from '@/lib/types';
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Plus,
  Sparkles,
  Tag as TagIcon,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Checkbox } from './ui/checkbox';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { Calendar } from './ui/calendar';
import { format, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';
import { SuggestSubtasksDialog } from './SuggestSubtasksDialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from './ui/dropdown-menu';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { DateRange } from 'react-day-picker';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';

type TaskItemProps = {
  task: Task;
  allTags: Tag[];
  onUpdate: (id: string, updates: Partial<Omit<Task, 'id' | 'subtasks' | 'icon'>>) => void;
  onToggleComplete: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onAddSubtask: (parentId: string, subtaskData: Omit<Task, 'id' | 'subtasks'>) => void;
  parentTask?: Task;
};

export function TaskItem({
  task,
  allTags,
  onUpdate,
  onToggleComplete,
  onDelete,
  onAddSubtask,
  parentTask,
}: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState({ ...task });
  
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskDescription, setNewSubtaskDescription] = useState('');
  const [newSubtaskDateRange, setNewSubtaskDateRange] = useState<DateRange | undefined>();
  const [newSubtaskTags, setNewSubtaskTags] = useState<string[]>([]);
  
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [showSubtaskOptions, setShowSubtaskOptions] = useState(false);
  
  const [isExpanded, setIsExpanded] = useState(true);
  const [showSubtaskSuggestions, setShowSubtaskSuggestions] = useState(false);
  const [showDateWarning, setShowDateWarning] = useState(false);
  const [newDateRange, setNewDateRange] = useState<DateRange | undefined>(undefined);

  const handleDateChange = (range: DateRange | undefined) => {
    if (parentTask?.dateRange?.to && range?.to && isAfter(range.to, parentTask.dateRange.to)) {
      setNewDateRange(range);
      setShowDateWarning(true);
    } else {
      setEditedTask({ ...editedTask, dateRange: range ?? undefined });
    }
  };
  
  const confirmDateChange = () => {
    if (newDateRange && parentTask) {
        onUpdate(parentTask.id, { dateRange: { ...parentTask.dateRange, to: newDateRange.to } });
        setEditedTask({ ...editedTask, dateRange: newDateRange });
    }
    setShowDateWarning(false);
    setNewDateRange(undefined);
  };

  const cancelDateChange = () => {
    setShowDateWarning(false);
    setNewDateRange(undefined);
  };

  const handleSave = () => {
    onUpdate(task.id, {
      title: editedTask.title,
      description: editedTask.description,
      dateRange: editedTask.dateRange,
      tags: editedTask.tags,
    });
    setIsEditing(false);
  };

  const resetNewSubtaskForm = () => {
    setNewSubtaskTitle('');
    setNewSubtaskDescription('');
    setNewSubtaskDateRange(undefined);
    setNewSubtaskTags([]);
    setIsAddingSubtask(false);
    setShowSubtaskOptions(false);
  }

  const handleAddSubtask = () => {
    if (newSubtaskTitle.trim()) {
      onAddSubtask(task.id, { 
        title: newSubtaskTitle.trim(),
        description: newSubtaskDescription.trim() || undefined,
        dateRange: newSubtaskDateRange,
        tags: newSubtaskTags,
        completed: false
      });
      resetNewSubtaskForm();
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

  const handleCancelAddSubtask = () => {
    resetNewSubtaskForm();
  }

  const handleNewSubtaskTagToggle = (tagId: string) => {
    setNewSubtaskTags(prev => 
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
    );
  };

  const calculateProgress = () => {
    if (!task.subtasks || task.subtasks.length === 0) {
      return task.completed ? 100 : 0;
    }
    const completedSubtasks = task.subtasks.filter((subtask) => subtask.completed).length;
    return (completedSubtasks / task.subtasks.length) * 100;
  };

  const handleTagToggle = (tagId: string) => {
    const newTags = editedTask.tags?.includes(tagId)
      ? editedTask.tags.filter((t) => t !== tagId)
      : [...(editedTask.tags || []), tagId];
    setEditedTask({ ...editedTask, tags: newTags });
  };

  const progress = calculateProgress();
  const TaskIcon = task.icon;
  const taskTags = allTags.filter((tag) => task.tags?.includes(tag.id));

  const getDueDateString = () => {
    if (!task.dateRange) return null;
    if (task.dateRange.from && task.dateRange.to) {
       if (format(task.dateRange.from, 'MMM d') === format(task.dateRange.to, 'MMM d')) {
        return format(task.dateRange.from, 'MMM d');
       }
      return `${format(task.dateRange.from, 'MMM d')} - ${format(task.dateRange.to, 'MMM d')}`;
    }
    if (task.dateRange.from) return `From ${format(task.dateRange.from, 'MMM d')}`;
    if (task.dateRange.to) return `By ${format(task.dateRange.to, 'MMM d')}`;
    return null;
  }
  
  const dueDateString = getDueDateString();
  const isOverdue = task.dateRange?.to ? new Date() > new Date(task.dateRange.to) && !task.completed : false;

  return (
    <Card className={cn('w-full transition-all duration-300', task.completed ? 'bg-muted/50' : 'bg-card')}>
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

            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <Button
                  key={tag.id}
                  variant={editedTask.tags?.includes(tag.id) ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => handleTagToggle(tag.id)}
                  style={{
                    backgroundColor: editedTask.tags?.includes(tag.id) ? tag.color : undefined,
                    borderColor: tag.color,
                    color: editedTask.tags?.includes(tag.id) ? 'white' : tag.color,
                  }}
                  className="text-xs"
                >
                  {tag.label}
                </Button>
              ))}
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn('w-full justify-start text-left font-normal', !editedTask.dateRange && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {editedTask.dateRange?.from ? (
                    editedTask.dateRange.to ? (
                      <>
                        {format(editedTask.dateRange.from, 'LLL dd, y')} -{' '}
                        {format(editedTask.dateRange.to, 'LLL dd, y')}
                      </>
                    ) : (
                      format(editedTask.dateRange.from, 'LLL dd, y')
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={editedTask.dateRange?.from}
                  selected={editedTask.dateRange as DateRange}
                  onSelect={handleDateChange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="ghost" onClick={handleCancelEdit}>
                Cancel
              </Button>
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
                  {dueDateString && (
                    <span
                      className={cn(
                        'text-xs rounded-full px-2 py-0.5 whitespace-nowrap',
                        isOverdue
                          ? 'bg-destructive/20 text-destructive-foreground'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {dueDateString}
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
                      <DropdownMenuItem
                        onClick={() => onDelete(task.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              {task.description && (
                <p
                  className="text-sm text-muted-foreground mt-1 cursor-pointer"
                  onClick={() => !isEditing && setIsEditing(true)}
                >
                  {task.description}
                </p>
              )}
               {taskTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {taskTags.map(tag => (
                     <Badge key={tag.id} variant="outline" style={{ borderColor: tag.color, color: tag.color }} className="text-xs">
                       {tag.label}
                     </Badge>
                  ))}
                </div>
              )}
              {task.subtasks && task.subtasks.length > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <Progress value={progress} className="h-2 w-full" />
                  <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
                </div>
              )}
            </div>
          </div>
        )}

        {task.subtasks && (
          <div className="pl-8 pt-2 space-y-2">
            {task.subtasks.length > 0 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-2 -ml-8 pl-8 w-full py-1"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 mr-1" />
                ) : (
                  <ChevronRight className="h-4 w-4 mr-1" />
                )}
                <span>
                  {task.subtasks.length} Subtask{task.subtasks.length !== 1 && 's'}
                </span>
              </button>
            )}

            {isExpanded && (
              <div className="flex flex-col gap-2">
                {task.subtasks.map((subtask) => (
                  <TaskItem
                    key={subtask.id}
                    task={subtask}
                    allTags={allTags}
                    onUpdate={onUpdate}
                    onToggleComplete={onToggleComplete}
                    onDelete={onDelete}
                    onAddSubtask={onAddSubtask}
                    parentTask={task}
                  />
                ))}

                {isAddingSubtask ? (
                  <div className="flex flex-col gap-2 p-3 border rounded-lg bg-muted/50">
                    <Input
                      value={newSubtaskTitle}
                      onChange={(e) => {
                        setNewSubtaskTitle(e.target.value);
                        if(e.target.value.length > 0 && !showSubtaskOptions) {
                            setShowSubtaskOptions(true);
                        } else if (e.target.value.length === 0) {
                            setShowSubtaskOptions(false);
                        }
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                      placeholder="New subtask title"
                      autoFocus
                    />
                    {showSubtaskOptions && (
                        <div className="space-y-3 pt-2">
                             <Textarea 
                                value={newSubtaskDescription}
                                onChange={e => setNewSubtaskDescription(e.target.value)}
                                placeholder="Add description..."
                                rows={2}
                            />
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant={'outline'} size="sm" className={cn('w-full justify-start text-left font-normal text-xs', !newSubtaskDateRange && 'text-muted-foreground')}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {newSubtaskDateRange?.from ? (
                                                newSubtaskDateRange.to ? (
                                                    <>{format(newSubtaskDateRange.from, 'LLL dd')} - {format(newSubtaskDateRange.to, 'LLL dd')}</>
                                                ) : (
                                                    format(newSubtaskDateRange.from, 'LLL dd, y')
                                                )
                                            ) : (
                                                <span>Pick a date range</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            initialFocus
                                            mode="range"
                                            defaultMonth={newSubtaskDateRange?.from}
                                            selected={newSubtaskDateRange}
                                            onSelect={setNewSubtaskDateRange}
                                            numberOfMonths={1}
                                        />
                                    </PopoverContent>
                                </Popover>

                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant={'outline'} size="sm" className="w-full justify-start text-left font-normal text-xs">
                                            <TagIcon className="mr-2 h-4 w-4" />
                                            <span>{newSubtaskTags.length > 0 ? `${newSubtaskTags.length} tags` : 'Add tags'}</span>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-2">
                                        <div className="flex flex-wrap gap-1 max-w-xs">
                                            {allTags.map(tag => (
                                                <Badge
                                                    key={tag.id}
                                                    variant={newSubtaskTags.includes(tag.id) ? 'secondary' : 'outline'}
                                                    onClick={() => handleNewSubtaskTagToggle(tag.id)}
                                                    style={{
                                                        backgroundColor: newSubtaskTags.includes(tag.id) ? tag.color : undefined,
                                                        borderColor: tag.color,
                                                        color: newSubtaskTags.includes(tag.id) ? 'white' : tag.color,
                                                        cursor: 'pointer'
                                                    }}
                                                    className="text-xs"
                                                >
                                                    {tag.label}
                                                </Badge>
                                            ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    )}
                    <div className="flex gap-2 items-center justify-end">
                      <Button variant="ghost" onClick={handleCancelAddSubtask} size="sm">
                        Cancel
                      </Button>
                       <Button onClick={handleAddSubtask} size="sm" disabled={!newSubtaskTitle.trim()}>
                        Add
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={() => setIsAddingSubtask(true)}
                    className="text-muted-foreground hover:text-primary -ml-2 h-9"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add subtask
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {editedTask.description && (
        <SuggestSubtasksDialog
          open={showSubtaskSuggestions}
          onOpenChange={setShowSubtaskSuggestions}
          taskDescription={editedTask.description}
          onAddSubtasks={handleAddSuggestedSubtasks}
        />
      )}
       <AlertDialog open={showDateWarning} onOpenChange={setShowDateWarning}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Update Parent Task Date?</AlertDialogTitle>
                    <AlertDialogDescription>
                        The selected date for this subtask is after the parent task's due date.
                        Would you like to extend the parent task's due date to match?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={cancelDateChange}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDateChange}>Update Parent</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </Card>
  );
}
