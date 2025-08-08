'use client';

import { Activity, Tag, Task } from '@/lib/types';
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronRight,
  History,
  MessageSquare,
  MoreVertical,
  Plus,
  Send,
  Sparkles,
  Tag as TagIcon,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Checkbox } from './ui/checkbox';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { format, isAfter, isBefore, startOfDay, formatDistanceToNow } from 'date-fns';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type ViewMode = 'default' | 'compact';

type TaskItemProps = {
  task: Task;
  allTags: Tag[];
  onUpdate: (id: string, updates: Partial<Omit<Task, 'id' | 'subtasks' | 'icon' | 'activity'>>, activityLog?: string) => void;
  onToggleComplete: (id: string, completed: boolean, title: string) => void;
  onDelete: (id: string) => void;
  onAddSubtask: (parentId: string, subtaskData: Omit<Task, 'id' | 'subtasks'>, parentUpdate?: Partial<Task>) => void;
  onAddComment: (taskId: string, comment: string) => void;
  onToggleActivity: (taskId: string) => void;
  openActivityTaskId: string | null;
  parentTask?: Task;
  level?: number;
  viewMode?: ViewMode;
  onTaskClick?: (task: Task) => void;
  userId: string;
};

export function TaskItem({
  task,
  allTags,
  onUpdate,
  onToggleComplete,
  onDelete,
  onAddSubtask,
  onAddComment,
  onToggleActivity,
  openActivityTaskId,
  parentTask,
  level = 0,
  viewMode = 'default',
  onTaskClick,
  userId,
}: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState({ ...task });
  const [activity, setActivity] = useState<Activity[]>([]);
  
  const [newComment, setNewComment] = useState('');

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
  const [dateChangeTarget, setDateChangeTarget] = useState<'task' | 'subtask' | null>(null);

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  
  const [stagedParentUpdate, setStagedParentUpdate] = useState<Partial<Task> | null>(null);

  const getTaskPath = (taskId: string) => {
     let path = `users/${userId}/tasks/${taskId}`;
     if (parentTask) {
        path = `users/${userId}/tasks/${parentTask.id}/subtasks/${taskId}`
     }
     if(level > 1 && parentTask) {
        // This is a naive implementation for deep nesting. A better solution would involve passing the path down.
     }
     return path;
  }

  useEffect(() => {
    const taskPath = getTaskPath(task.id);
    const q = query(collection(db, taskPath, 'activity'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const activityData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                timestamp: data.timestamp.toDate()
            } as Activity;
        });
        setActivity(activityData);
    });
    return () => unsubscribe();
  }, [task.id, userId]);

  const handleAddComment = () => {
    if (newComment.trim()) {
      onAddComment(task.id, newComment.trim());
      setNewComment('');
    }
  };

  const handleDateSelection = (range: DateRange | undefined) => {
    handleDateChange(range, 'task');
  };

  const handleSubtaskDateSelection = (range: DateRange | undefined) => {
    handleDateChange(range, 'subtask');
  }

  const handleDateChange = (range: DateRange | undefined, target: 'task' | 'subtask') => {
    setDateChangeTarget(target);

    const relevantParent = target === 'subtask' ? task : parentTask;

    if (!relevantParent || (!range?.from && !range?.to)) {
      if (target === 'task') {
        setEditedTask({ ...editedTask, dateRange: range });
      } else {
        setNewSubtaskDateRange(range);
      }
      return;
    }

    const parentFrom = relevantParent.dateRange?.from ? startOfDay(new Date(relevantParent.dateRange.from)) : null;
    const parentTo = relevantParent.dateRange?.to ? startOfDay(new Date(relevantParent.dateRange.to)) : null;
    const rangeFrom = range?.from ? startOfDay(new Date(range.from)) : null;
    const rangeTo = range?.to ? startOfDay(new Date(range.to)) : null;

    const startConflict = (parentFrom && rangeFrom && isBefore(rangeFrom, parentFrom)) || (!parentFrom && rangeFrom);
    const endConflict = (parentTo && rangeTo && isAfter(rangeTo, parentTo)) || (!parentTo && rangeTo);

    if (startConflict || endConflict) {
      setNewDateRange(range);
      setShowDateWarning(true);
    } else {
      if (target === 'task') {
        setEditedTask({ ...editedTask, dateRange: range });
      } else {
        setNewSubtaskDateRange(range);
      }
    }
  };

  const confirmDateChange = () => {
    const relevantParent = dateChangeTarget === 'subtask' ? task : parentTask;
  
    if (newDateRange && relevantParent) {
      const parentUpdate: Partial<Task> = {
        dateRange: { from: relevantParent.dateRange?.from, to: relevantParent.dateRange?.to },
      };
  
      const parentFrom = relevantParent.dateRange?.from ? startOfDay(new Date(relevantParent.dateRange.from)) : null;
      const parentTo = relevantParent.dateRange?.to ? startOfDay(new Date(relevantParent.dateRange.to)) : null;
      const rangeFrom = newDateRange.from ? startOfDay(new Date(newDateRange.from)) : null;
      const rangeTo = newDateRange.to ? startOfDay(new Date(newDateRange.to)) : null;
  
      if ((parentFrom && rangeFrom && isBefore(rangeFrom, parentFrom)) || (!parentFrom && rangeFrom)) {
        parentUpdate.dateRange!.from = newDateRange.from;
      }
      if ((parentTo && rangeTo && isAfter(rangeTo, parentTo)) || (!parentTo && rangeTo)) {
        parentUpdate.dateRange!.to = newDateRange.to;
      }
      
      setStagedParentUpdate(parentUpdate);
  
      if (dateChangeTarget === 'task') {
        setEditedTask({ ...editedTask, dateRange: newDateRange });
      } else if (dateChangeTarget === 'subtask') {
        setNewSubtaskDateRange(newDateRange);
      }
    }
  
    setShowDateWarning(false);
  };

  const cancelDateChange = () => {
    setShowDateWarning(false);
    setNewDateRange(undefined);
    setDateChangeTarget(null);
  };

  const handleSave = () => {
    let activityLog = '';
    if (task.description !== editedTask.description) {
      activityLog = 'Description updated.';
    }

    const updates: Partial<Omit<Task, 'id' | 'subtasks' | 'icon' | 'activity'>> = {
      title: editedTask.title,
      description: editedTask.description,
      dateRange: editedTask.dateRange,
      tags: editedTask.tags,
    }
    
    if (parentTask && stagedParentUpdate && dateChangeTarget === 'task') {
        onUpdate(parentTask.id, stagedParentUpdate, `Date range extended for subtask: ${task.title}`);
    }
    
    onUpdate(task.id, updates, activityLog);

    setIsEditing(false);
    setStagedParentUpdate(null);
    setDateChangeTarget(null);
  };

  const resetNewSubtaskForm = () => {
    setNewSubtaskTitle('');
    setNewSubtaskDescription('');
    setNewSubtaskDateRange(undefined);
    setNewSubtaskTags([]);
    setIsAddingSubtask(false);
    setShowSubtaskOptions(false);
    setStagedParentUpdate(null);
    setDateChangeTarget(null);
  };

  const handleAddSubtask = () => {
    if (newSubtaskTitle.trim()) {
      let finalDateRange = newSubtaskDateRange;
      if (finalDateRange?.to && !finalDateRange.from) {
        finalDateRange.from = new Date();
      }

      onAddSubtask(task.id, {
        title: newSubtaskTitle.trim(),
        description: newSubtaskDescription.trim() || undefined,
        dateRange: finalDateRange,
        tags: newSubtaskTags,
        completed: false,
        activity: []
      }, stagedParentUpdate ?? undefined);
      resetNewSubtaskForm();
      setIsExpanded(true);
    }
  };

  const handleAddSuggestedSubtasks = (subtasks: string[]) => {
    subtasks.forEach(title => {
      onAddSubtask(task.id, { title, completed: false, activity: [] });
    });
    setIsExpanded(true);
  };

  const handleCancelEdit = () => {
    setEditedTask({ ...task });
    setIsEditing(false);
    setStagedParentUpdate(null);
    setDateChangeTarget(null);
  };

  const handleCancelAddSubtask = () => {
    resetNewSubtaskForm();
  };

  const handleNewSubtaskTagToggle = (tagId: string) => {
    setNewSubtaskTags(prev => (prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]));
  };

  const calculateProgress = () => {
    if (!task.subtasks || task.subtasks.length === 0) {
      return task.completed ? 100 : 0;
    }
    const completedSubtasks = task.subtasks.filter(subtask => subtask.completed).length;
    return (completedSubtasks / task.subtasks.length) * 100;
  };

  const handleTagToggle = (tagId: string) => {
    const newTags = editedTask.tags?.includes(tagId)
      ? editedTask.tags.filter(t => t !== tagId)
      : [...(editedTask.tags || []), tagId];
    setEditedTask({ ...editedTask, tags: newTags });
  };
  
  const getTaskById = (tasks: Task[], id: string): Task | undefined => {
    for (const t of tasks) {
      if (t.id === id) return t;
      if (t.subtasks) {
        const found = getTaskById(t.subtasks, id);
        if (found) return found;
      }
    }
    return undefined;
  };
  
  const findRootTask = (currentTask: Task): Task => {
    let root = currentTask;
    // This is a simplified search, assuming a flat top-level `tasks` array exists in a reachable scope.
    // A more robust solution might need context or prop drilling for the full task tree.
    // For now, we'll assume we can't traverse up, and activity is on the immediate task.
    return root; 
  }

  const progress = calculateProgress();
  const TaskIcon = task.icon;
  const taskTags = allTags.filter(tag => task.tags?.includes(tag.id));
  const truncatedTitle = task.title.length > 40 ? `${task.title.substring(0, 40)}...` : task.title;

  const getDueDateString = () => {
    if (!task.dateRange) return null;
    if (task.dateRange.from && task.dateRange.to) {
      if (format(new Date(task.dateRange.from), 'MMM d') === format(new Date(task.dateRange.to), 'MMM d')) {
        return format(new Date(task.dateRange.from), 'MMM d');
      }
      return `${format(new Date(task.dateRange.from), 'MMM d')} - ${format(new Date(task.dateRange.to), 'MMM d')}`;
    }
    if (task.dateRange.from) return `From ${format(new Date(task.dateRange.from), 'MMM d')}`;
    if (task.dateRange.to) return `By ${format(new Date(task.dateRange.to), 'MMM d')}`;
    return null;
  };

  const dueDateString = getDueDateString();
  const isOverdue = task.dateRange?.to ? new Date() > new Date(task.dateRange.to) && !task.completed : false;
  const maxNestingLevel = 2;

  const getDateWarningDescription = () => {
    if (!newDateRange) return '';
    const relevantParent = dateChangeTarget === 'subtask' ? task : parentTask;
    if (!relevantParent) return '';

    const parentFrom = relevantParent.dateRange?.from ? startOfDay(new Date(relevantParent.dateRange.from)) : null;
    const parentTo = relevantParent.dateRange?.to ? startOfDay(new Date(relevantParent.dateRange.to)) : null;
    const rangeFrom = newDateRange.from ? startOfDay(new Date(newDateRange.from)) : null;
    const rangeTo = newDateRange.to ? startOfDay(new Date(newDateRange.to)) : null;

    const startConflict = (parentFrom && rangeFrom && isBefore(rangeFrom, parentFrom)) || (!parentFrom && rangeFrom);
    const endConflict = (parentTo && rangeTo && isAfter(rangeTo, parentTo)) || (!parentTo && rangeTo);

    if (startConflict && endConflict) {
      return "The selected dates are outside the parent task's date range. Would you like to expand the parent task's dates to match?";
    }
    if (startConflict) {
      return "The selected start date is before the parent task's start date. Would you like to update the parent task's start date to match?";
    }
    if (endConflict) {
      return "The selected end date is after the parent task's end date. Would you like to extend the parent task's end date to match?";
    }
    return '';
  };

  const isCompact = viewMode === 'compact' && level === 0;

  const handleCardClick = () => {
    if (isCompact && onTaskClick) {
      onTaskClick(task);
    }
  };

  return (
    <Card 
      className={cn(
        'w-full transition-all duration-300', 
        task.completed ? 'bg-muted/50' : 'bg-card',
        isCompact && 'cursor-pointer hover:bg-muted/80'
      )}
      onClick={handleCardClick}
    >
     <Collapsible open={openActivityTaskId === task.id && !isEditing} onOpenChange={() => onToggleActivity(task.id)}>
      <div className={cn("flex flex-col gap-2", isCompact ? 'p-2' : 'p-3 sm:p-4')}>
        {isEditing ? (
          <div className="flex flex-col gap-3">
            <Input
              value={editedTask.title}
              onChange={e => setEditedTask({ ...editedTask, title: e.target.value })}
              className="text-lg font-semibold"
              aria-label="Edit task title"
            />
            <div className="relative">
              <Textarea
                value={editedTask.description || ''}
                onChange={e => setEditedTask({ ...editedTask, description: e.target.value })}
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
              {allTags.map(tag => (
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

            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn('w-full justify-start text-left font-normal', !editedTask.dateRange && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {editedTask.dateRange?.from ? (
                    editedTask.dateRange.to ? (
                      <>
                        {format(new Date(editedTask.dateRange.from), 'LLL dd, y')} -{' '}
                        {format(new Date(editedTask.dateRange.to), 'LLL dd, y')}
                      </>
                    ) : (
                      format(new Date(editedTask.dateRange.from), 'LLL dd, y')
                    )
                  ) : editedTask.dateRange?.to ? (
                    `By ${format(new Date(editedTask.dateRange.to), 'LLL dd, y')}`
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={editedTask.dateRange?.from ? new Date(editedTask.dateRange.from) : undefined}
                  selected={
                    editedTask.dateRange
                      ? {
                          from: editedTask.dateRange.from ? new Date(editedTask.dateRange.from) : undefined,
                          to: editedTask.dateRange.to ? new Date(editedTask.dateRange.to) : undefined,
                        }
                      : undefined
                  }
                  onSelect={range => handleDateSelection(range)}
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
              onCheckedChange={checked => onToggleComplete(task.id, !!checked, task.title)}
              className="mt-1"
              aria-labelledby={`task-label-${task.id}`}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="flex-grow">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-grow flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <label
                    id={`task-label-${task.id}`}
                    htmlFor={`task-${task.id}`}
                    className={cn(
                      'font-medium transition-colors',
                      isCompact ? '' : 'cursor-pointer',
                      task.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                    )}
                    onClick={(e) => {
                      if (!isCompact) {
                        e.preventDefault();
                        setIsEditing(true)
                      }
                    }}
                  >
                    {truncatedTitle}
                  </label>
                   {taskTags.length > 0 && isCompact && (
                    <div className="flex flex-wrap gap-1 items-baseline">
                      {taskTags.map(tag => (
                        <Badge
                          key={tag.id}
                          variant="outline"
                          style={{ borderColor: tag.color, color: tag.color }}
                          className="text-xs"
                        >
                          {tag.label}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className={cn("flex items-center flex-shrink-0", isCompact ? 'gap-0' : 'gap-1')} onClick={(e) => e.stopPropagation()}>
                  {dueDateString && (
                    <span
                      className={cn(
                        'text-xs rounded-full px-2 py-0.5 whitespace-nowrap',
                        isOverdue
                          ? 'bg-destructive/20 text-destructive-foreground'
                          : 'bg-muted text-muted-foreground',
                        isCompact ? 'mr-1' : ''
                      )}
                    >
                      {dueDateString}
                    </span>
                  )}
                  {!isCompact && 
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleActivity(task.id);}}>
                        <History className="h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>
                  }
                  {!isCompact && <TaskIcon className="h-4 w-4 text-muted-foreground" />}
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
              {task.description && !isCompact && (
                <p
                  className="text-sm text-muted-foreground mt-1 cursor-pointer"
                  onClick={() => !isEditing && setIsEditing(true)}
                >
                  {task.description}
                </p>
              )}
              {taskTags.length > 0 && !isCompact &&(
                <div className="flex flex-wrap gap-1 mt-2">
                  {taskTags.map(tag => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      style={{ borderColor: tag.color, color: tag.color }}
                      className="text-xs"
                    >
                      {tag.label}
                    </Badge>
                  ))}
                </div>
              )}
              {task.subtasks && task.subtasks.length > 0 && (
                <div className={cn("flex items-center gap-2", isCompact ? 'mt-1' : 'mt-2')}>
                  <Progress value={progress} className="h-2 w-full" />
                  <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
                </div>
              )}
            </div>
          </div>
        )}

        {task.subtasks && level < maxNestingLevel && !isCompact && (
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
                {task.subtasks.map(subtask => (
                  <TaskItem
                    key={subtask.id}
                    task={subtask}
                    allTags={allTags}
                    onUpdate={onUpdate}
                    onToggleComplete={onToggleComplete}
                    onDelete={onDelete}
                    onAddSubtask={onAddSubtask}
                    onAddComment={onAddComment}
                    onToggleActivity={onToggleActivity}
                    openActivityTaskId={openActivityTaskId}
                    parentTask={task}
                    level={level + 1}
                    userId={userId}
                  />
                ))}

                {isAddingSubtask ? (
                  <div className="flex flex-col gap-2 p-3 border rounded-lg bg-muted/50">
                    <Input
                      value={newSubtaskTitle}
                      onChange={e => {
                        setNewSubtaskTitle(e.target.value);
                        if (e.target.value.length > 0 && !showSubtaskOptions) {
                          setShowSubtaskOptions(true);
                        } else if (e.target.value.length === 0) {
                          setShowSubtaskOptions(false);
                        }
                      }}
                      onKeyDown={e => e.key === 'Enter' && handleAddSubtask()}
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
                          <Popover onOpenChange={(open) => !open && setIsDatePickerOpen(false)}>
                            <PopoverTrigger asChild>
                              <Button
                                variant={'outline'}
                                size="sm"
                                onClick={() => setIsDatePickerOpen(true)}
                                className={cn(
                                  'w-full justify-start text-left font-normal text-xs',
                                  !newSubtaskDateRange && 'text-muted-foreground'
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {newSubtaskDateRange?.from ? (
                                  newSubtaskDateRange.to ? (
                                    <>
                                      {format(newSubtaskDateRange.from, 'LLL dd')} -{' '}
                                      {format(newSubtaskDateRange.to, 'LLL dd')}
                                    </>
                                  ) : (
                                    format(newSubtaskDateRange.from, 'LLL dd, y')
                                  )
                                ) : newSubtaskDateRange?.to ? (
                                  `By ${format(newSubtaskDateRange.to, 'LLL dd, y')}`
                                ) : (
                                  <span>Pick a date range</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                           {isDatePickerOpen && <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={newSubtaskDateRange?.from}
                                selected={newSubtaskDateRange}
                                onSelect={range => handleSubtaskDateSelection(range)}
                                numberOfMonths={1}
                              />
                            </PopoverContent>}
                          </Popover>

                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={'outline'}
                                size="sm"
                                className="w-full justify-start text-left font-normal text-xs"
                              >
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
                                      cursor: 'pointer',
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

      <CollapsibleContent>
        <Separator />
        <div className="p-3 sm:p-4 bg-muted/20">
            <h4 className="text-sm font-semibold mb-3 flex items-center text-muted-foreground">
                <History className="h-4 w-4 mr-2" />
                Activity
            </h4>
            <div className="space-y-4 mb-4">
                <div className="flex gap-3">
                    <Input 
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                    />
                    <Button size="icon" onClick={handleAddComment} disabled={!newComment.trim()}>
                        <Send className="h-4 w-4" />
                    </Button>
                </div>

                <ScrollArea className="h-40 pr-4">
                    <div className="space-y-4">
                        {activity.map(item => (
                            <div key={item.id} className="flex items-start gap-3">
                                <div className="flex-shrink-0 mt-1">
                                    {item.type === 'comment' ? (
                                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <History className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </div>
                                <div className="flex-grow">
                                    <p className="text-sm">{item.content}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {(!activity || activity.length === 0) && (
                            <p className="text-sm text-muted-foreground text-center py-4">No activity yet.</p>
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
      
      {editedTask.description && (
        <SuggestSubtasksDialog
          open={showSubtaskSuggestions}
          onOpenChange={setShowSubtaskSuggestions}
          taskDescription={editedTask.description}
          onAddSubtasks={handleAddSuggestedSubtasks}
        />
      )}
      <AlertDialog open={showDateWarning} onOpenChange={(open) => {
        if (!open) {
          cancelDateChange();
        }
        setShowDateWarning(open);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Parent Task Date?</AlertDialogTitle>
            <AlertDialogDescription>{getDateWarningDescription()}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDateChange}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              confirmDateChange();
              setIsDatePickerOpen(false);
            }}>Update Parent</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
