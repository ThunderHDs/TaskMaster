'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Activity, Tag, Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TaskItem } from './TaskItem';
import { Briefcase, Home, ShoppingBasket, Plus, ArrowDownUp, ListTodo, Calendar as CalendarIcon, Check, X, Tag as TagIcon, Edit, Rows, Columns, ArrowLeft, Loader2 } from 'lucide-react';
import Header from './Header';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { CalendarView } from './CalendarView';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { DateRange } from 'react-day-picker';
import { Calendar } from './ui/calendar';
import { format } from 'date-fns';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, where, writeBatch, serverTimestamp, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LucideIcon } from 'lucide-react';

const initialTags: Tag[] = [
  { id: 'tag-1', label: 'Marketing', color: '#EF4444' },
  { id: 'tag-2', label: 'Development', color: '#3B82F6' },
  { id: 'tag-3', label: 'Design', color: '#F97316' },
  { id: 'tag-4', label: 'Personal', color: '#8B5CF6' },
];

const icons: Record<string, LucideIcon> = { Briefcase, Home, ShoppingBasket };
const iconNames = Object.keys(icons);

type FilterType = 'all' | 'done' | 'undone';
type ViewMode = 'default' | 'compact';

// Helper to convert Firestore timestamps to Dates
const convertTimestamps = (task: any): Task => {
  const toDate = (timestamp: any) => timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
  
  let dateRange;
  if (task.dateRange) {
    dateRange = {
      from: task.dateRange.from ? toDate(task.dateRange.from) : undefined,
      to: task.dateRange.to ? toDate(task.dateRange.to) : undefined,
    }
  }

  const activity = task.activity?.map((a: any) => ({ ...a, timestamp: toDate(a.timestamp) })) || [];
  const subtasks = task.subtasks?.map(convertTimestamps) || [];
  
  return { ...task, dateRange, activity, subtasks, icon: icons[task.icon] || Briefcase };
};

export default function TaskPage({ userId }: { userId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState<ViewMode>('default');
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);

  useEffect(() => {
    const savedViewMode = localStorage.getItem('task-view-mode') as ViewMode | null;
    if (savedViewMode) {
      setViewMode(savedViewMode);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    const q = query(collection(db, 'users', userId, 'tasks'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }));
      setTasks(tasksData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const tagsCollection = collection(db, 'users', userId, 'tags');
    const unsubscribe = onSnapshot(tagsCollection, (snapshot) => {
      if (snapshot.empty) {
        // If no tags, create initial tags
        const batch = writeBatch(db);
        initialTags.forEach(tag => {
          const newTagRef = doc(tagsCollection);
          batch.set(newTagRef, { ...tag, id: newTagRef.id });
        });
        batch.commit().then(() => {
          // Tags will be fetched by the snapshot listener
        });
      } else {
        const tagsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tag));
        setTags(tagsData);
      }
    });

    return () => unsubscribe();
  }, [userId]);
  

  const [newTagLabel, setNewTagLabel] = useState('');
  
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDateRange, setNewTaskDateRange] = useState<DateRange | undefined>();
  const [newTaskTags, setNewTaskTags] = useState<string[]>([]);
  const [showNewTaskOptions, setShowNewTaskOptions] = useState(false);
  
  const [sortAsc, setSortAsc] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [openActivityTaskId, setOpenActivityTaskId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleUpdateTag = async () => {
    if (!editingTag || !editingTag.label.trim()) {
      toast({ title: "Tag name can't be empty", variant: "destructive" });
      return;
    }
    const tagRef = doc(db, 'users', userId, 'tags', editingTag.id);
    await updateDoc(tagRef, { label: editingTag.label, color: editingTag.color });
    setEditingTag(null);
    toast({ title: "Tag updated!" });
  }

  const handleDeleteTag = async (tagId: string) => {
    await deleteDoc(doc(db, 'users', userId, 'tags', tagId));

    const batch = writeBatch(db);
    tasks.forEach(task => {
        const removeTagRecursively = (currentTask: Task, path: string) => {
            if (currentTask.tags?.includes(tagId)) {
                const taskRef = doc(db, path);
                const newTags = currentTask.tags.filter(t => t !== tagId);
                batch.update(taskRef, { tags: newTags });
            }
            currentTask.subtasks.forEach(sub => removeTagRecursively(sub, `${path}/subtasks/${sub.id}`));
        };
        removeTagRecursively(task, `users/${userId}/tasks/${task.id}`);
    });
    
    await batch.commit();
    setEditingTag(null);
    toast({ title: "Tag deleted and removed from all tasks." });
  };


  const handleAddTag = async () => {
    if (newTagLabel.trim() && !tags.find(t => t.label.toLowerCase() === newTagLabel.trim().toLowerCase())) {
      const newTag = {
        label: newTagLabel.trim(),
        color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`
      };
      await addDoc(collection(db, 'users', userId, 'tags'), newTag);
      setNewTagLabel('');
    }
  };

  const resetNewTaskForm = () => {
    setNewTaskTitle('');
    setNewTaskDescription('');
    setNewTaskDateRange(undefined);
    setNewTaskTags([]);
    setShowNewTaskOptions(false);
  }

  const handleAddTask = async () => {
    if (newTaskTitle.trim()) {
      const randomIconName = iconNames[Math.floor(Math.random() * iconNames.length)];
      
      let finalDateRange = newTaskDateRange;
      if (finalDateRange?.to && !finalDateRange.from) {
        finalDateRange = { from: new Date(), to: finalDateRange.to };
      }

      const newTask: Omit<Task, 'id' | 'icon'> & { icon: string, createdAt: any } = {
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() || undefined,
        completed: false,
        icon: randomIconName,
        subtasks: [],
        tags: newTaskTags,
        dateRange: finalDateRange,
        activity: [{ id: crypto.randomUUID(), type: 'log', content: 'Task created.', timestamp: new Date(), taskId: '' }],
        createdAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, 'users', userId, 'tasks'), newTask);
      await updateDoc(doc(db, 'users', userId, 'tasks', docRef.id, 'activity', newTask.activity[0].id), {taskId: docRef.id});

      resetNewTaskForm();
      toast({ title: "Task added!", description: `"${newTask.title}" has been added.` });
    }
  };

  const getTaskPath = (taskId: string) => {
    let path = `users/${userId}/tasks/${taskId}`;
    const findPath = (tasks: Task[], id: string, currentPath: string): string | null => {
      for (const task of tasks) {
        if (task.id === id) return `${currentPath}/${task.id}`;
        const subPath = findPath(task.subtasks, id, `${currentPath}/${task.id}/subtasks`);
        if (subPath) return subPath;
      }
      return null;
    }

    const fullPath = findPath(tasks, taskId, `users/${userId}/tasks`);
    return fullPath || path; // Fallback to top-level if not found (e.g., during creation)
  }

  const handleAddComment = useCallback(async (taskId: string, comment: string) => {
    const newActivity: Activity = {
      id: crypto.randomUUID(),
      type: 'comment',
      content: comment,
      timestamp: new Date(),
      taskId,
    };
    const taskPath = getTaskPath(taskId);
    await addDoc(collection(db, taskPath, 'activity'), newActivity);
    
    // Also add to parent if it's a subtask
    const parentId = findParentId(tasks, taskId);
    if (parentId) {
      const parentPath = getTaskPath(parentId);
      await addDoc(collection(db, parentPath, 'activity'), newActivity);
    }
  }, [userId, tasks]);

  const handleUpdate = useCallback(async (id: string, updates: Partial<Omit<Task, 'id' | 'subtasks' | 'icon' | 'activity'>>, activityLog?: string) => {
    const taskPath = getTaskPath(id);
    await updateDoc(doc(db, taskPath), updates);

    if (activityLog) {
      const newActivity: Omit<Activity, 'id'> = {
        type: 'log',
        content: activityLog,
        timestamp: new Date(),
        taskId: id,
      };
      await addDoc(collection(db, taskPath, 'activity'), newActivity);

      const parentId = findParentId(tasks, id);
      if (parentId) {
        const parentPath = getTaskPath(parentId);
        await addDoc(collection(db, parentPath, 'activity'), newActivity);
      }
    }
  }, [userId, tasks]);

  const findParentId = (tasks: Task[], childId: string): string | null => {
    for (const task of tasks) {
        if (task.subtasks?.some(sub => sub.id === childId)) {
            return task.id;
        }
        if (task.subtasks && task.subtasks.length > 0) {
            const parentId = findParentId(task.subtasks, childId);
            if (parentId) return parentId;
        }
    }
    return null;
  }

  const handleToggleComplete = useCallback(async (id: string, completed: boolean, title: string) => {
    const taskPath = getTaskPath(id);
    const taskRef = doc(db, taskPath);
    const logContent = completed ? 'Task marked as complete.' : 'Task marked as incomplete.';
    const newActivity: Omit<Activity, 'id'> = { type: 'log', content: logContent, timestamp: new Date(), taskId: id };

    const batch = writeBatch(db);

    const toggleChildrenRecursively = async (currentTaskRef: any, parentCompleted: boolean) => {
        batch.update(currentTaskRef, { completed: parentCompleted });
        const activityCol = collection(currentTaskRef, 'activity');
        batch.set(doc(activityCol), { ...newActivity, taskId: currentTaskRef.id });

        const subtasksSnapshot = await getDocs(collection(currentTaskRef, 'subtasks'));
        subtasksSnapshot.forEach(subDoc => {
            toggleChildrenRecursively(subDoc.ref, parentCompleted);
        });
    };

    await toggleChildrenRecursively(taskRef, completed);

    // Update parent completion status
    const updateParents = async (childId: string, isCompleted: boolean) => {
        const parentId = findParentId(tasks, childId);
        if (!parentId) return;

        const parentPath = getTaskPath(parentId);
        const parentRef = doc(db, parentPath);
        const subtasksCol = collection(parentRef, 'subtasks');
        const subtasksSnapshot = await getDocs(subtasksCol);
        
        // Check if all other siblings are completed
        let allSiblingsCompleted = isCompleted;
        if (isCompleted) {
            for (const subDoc of subtasksSnapshot.docs) {
                if (subDoc.id !== childId && !subDoc.data().completed) {
                    allSiblingsCompleted = false;
                    break;
                }
            }
        } else {
            allSiblingsCompleted = false;
        }

        if (allSiblingsCompleted !== (tasks.find(t => t.id === parentId)?.completed)) {
            batch.update(parentRef, { completed: allSiblingsCompleted });
            const parentLog = allSiblingsCompleted ? 'All subtasks completed, marking parent task as complete.' : 'Subtask marked as incomplete, marking parent task as incomplete.';
            batch.set(doc(collection(parentRef, 'activity')), { type: 'log', content: parentLog, timestamp: new Date(), taskId: parentId });
        }
        await updateParents(parentId, allSiblingsCompleted);
    };
    
    await updateParents(id, completed);

    const parentId = findParentId(tasks, id);
    if(parentId) {
      const parentLogContent = completed ? `Subtask '${title}' marked as complete.` : `Subtask '${title}' marked as incomplete.`;
      const parentPath = getTaskPath(parentId);
      batch.set(doc(collection(db, parentPath, 'activity')), { type: 'log', content: parentLogContent, timestamp: new Date(), taskId: id });
    }

    await batch.commit();

  }, [userId, tasks]);

  const handleDelete = useCallback(async (id: string) => {
    const taskPath = getTaskPath(id);
    await deleteDoc(doc(db, taskPath));
    toast({ title: "Task deleted.", variant: "destructive" });
  }, [userId, tasks]);
  
  const handleAddSubtask = useCallback(async (parentId: string, subtaskData: Omit<Task, 'id' | 'subtasks'>, parentUpdate?: Partial<Task>) => {
      const parentPath = getTaskPath(parentId);
      const parentRef = doc(db, parentPath);
      const randomIconName = iconNames[Math.floor(Math.random() * iconNames.length)];

      let finalSubtaskData: any = { ...subtaskData };
      if (finalSubtaskData.dateRange?.to && !finalSubtaskData.dateRange.from) {
          finalSubtaskData.dateRange.from = new Date();
      }
      
      const newSubtask: any = {
          ...finalSubtaskData,
          icon: randomIconName,
          subtasks: [],
          createdAt: serverTimestamp(),
      };
      
      const batch = writeBatch(db);

      if (parentUpdate) {
        batch.update(parentRef, parentUpdate);
      }

      const subtaskRef = await addDoc(collection(parentRef, 'subtasks'), newSubtask);
      const activityRef = collection(subtaskRef, 'activity');
      batch.set(doc(activityRef), { type: 'log', content: 'Subtask created.', timestamp: new Date(), taskId: subtaskRef.id });

      const addLogToParentActivity = {
          type: 'log',
          content: `New subtask added: "${newSubtask.title}"`,
          timestamp: new Date(),
          taskId: subtaskRef.id,
      };
      batch.set(doc(collection(parentRef, 'activity')), addLogToParentActivity);
      batch.update(parentRef, { completed: false });
      
      await batch.commit();

  }, [userId, tasks]);

  const handleTaskClick = (task: Task) => {
    if (viewMode === 'compact') {
      setFocusedTaskId(task.id);
    }
  };

  const clearFocusedTask = () => {
    setFocusedTaskId(null);
  }

  const filteredAndSortedTasks = useMemo(() => {
    let tasksToDisplay = tasks;

    if (viewMode === 'compact' && focusedTaskId) {
      const findTask = (tasks: Task[], id: string): Task | undefined => {
        for(const task of tasks) {
          if (task.id === id) return task;
          if (task.subtasks) {
            const found = findTask(task.subtasks, id);
            if(found) return found;
          }
        }
      }
      const focusedTask = findTask(tasks, focusedTaskId);
      tasksToDisplay = focusedTask ? [focusedTask] : [];
    }
    
    let filteredTasks = [...tasksToDisplay];

    if (filter === 'done') {
      filteredTasks = filteredTasks.filter(task => task.completed);
    } else if (filter === 'undone') {
      filteredTasks = filteredTasks.filter(task => !task.completed);
    }
    
    return filteredTasks.sort((a, b) => {
      const aDateValue = a.dateRange?.from || a.dateRange?.to;
      const bDateValue = b.dateRange?.from || b.dateRange?.to;
      const aDate = aDateValue ? new Date(aDateValue).getTime() : (sortAsc ? Infinity : -Infinity);
      const bDate = bDateValue ? new Date(bDateValue).getTime() : (sortAsc ? Infinity : -Infinity);
      return sortAsc ? aDate - bDate : bDate - aDate;
    });
  }, [tasks, sortAsc, filter, viewMode, focusedTaskId]);

  const handleNewTaskTagToggle = (tagId: string) => {
    setNewTaskTags(prev => 
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
    );
  };
  
  const handleToggleActivity = (taskId: string) => {
    setOpenActivityTaskId(prevId => (prevId === taskId ? null : taskId));
  };
  
  const toggleViewMode = () => {
    const newMode = viewMode === 'default' ? 'compact' : 'default';
    if (newMode === 'default') {
      clearFocusedTask();
    }
    setViewMode(newMode);
    localStorage.setItem('task-view-mode', newMode);
  };


  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading your tasks...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Header />
      <div className="w-full max-w-4xl mx-auto px-4 pb-8">
        <div className="bg-card border rounded-lg p-4 mb-6">
            <div className="flex gap-2">
                <Input
                    value={newTaskTitle}
                    onChange={(e) => {
                      setNewTaskTitle(e.target.value);
                      if (e.target.value.length > 0 && !showNewTaskOptions) {
                        setShowNewTaskOptions(true);
                      } else if (e.target.value.length === 0) {
                        setShowNewTaskOptions(false);
                      }
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                    placeholder="Add a new task..."
                    className="flex-grow text-base"
                />
                 <Button onClick={handleAddTask} disabled={!newTaskTitle.trim()}>
                    <Plus className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Add Task</span>
                </Button>
            </div>
            {showNewTaskOptions && (
                <div className="mt-4 space-y-4">
                    <Textarea 
                        value={newTaskDescription}
                        onChange={e => setNewTaskDescription(e.target.value)}
                        placeholder="Add description..."
                    />
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={'outline'} className={cn('w-full justify-start text-left font-normal', !newTaskDateRange && 'text-muted-foreground')}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {newTaskDateRange?.from ? (
                                        newTaskDateRange.to ? (
                                            <>{format(newTaskDateRange.from, 'LLL dd, y')} - {format(newTaskDateRange.to, 'LLL dd, y')}</>
                                        ) : (
                                            format(newTaskDateRange.from, 'LLL dd, y')
                                        )
                                    ) : newTaskDateRange?.to ? (
                                        `By ${format(newTaskDateRange.to, 'LLL dd, y')}`
                                    ) : (
                                        <span>Pick a date</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={newTaskDateRange?.from}
                                    selected={newTaskDateRange}
                                    onSelect={setNewTaskDateRange}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={'outline'} className="w-full justify-start text-left font-normal">
                                    <TagIcon className="mr-2 h-4 w-4" />
                                    <span>{newTaskTags.length > 0 ? `${newTaskTags.length} tags selected` : 'Add tags'}</span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-2">
                                <div className="flex flex-wrap gap-2 max-w-xs">
                                    {tags.map(tag => (
                                        <Badge
                                            key={tag.id}
                                            variant={newTaskTags.includes(tag.id) ? 'secondary' : 'outline'}
                                            onClick={() => handleNewTaskTagToggle(tag.id)}
                                            style={{
                                                backgroundColor: newTaskTags.includes(tag.id) ? tag.color : undefined,
                                                borderColor: tag.color,
                                                color: newTaskTags.includes(tag.id) ? 'white' : tag.color,
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
        </div>
        
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="list" onClick={clearFocusedTask}>
              <ListTodo className="mr-2 h-4 w-4" />
              List View
            </TabsTrigger>
            <TabsTrigger value="calendar" onClick={clearFocusedTask}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              Calendar View
            </TabsTrigger>
          </TabsList>
          <TabsContent value="list">
             {viewMode === 'compact' && focusedTaskId && (
              <div className="mb-4">
                <Button variant="ghost" onClick={clearFocusedTask}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to all tasks
                </Button>
              </div>
            )}
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <Button variant={filter === 'all' ? 'secondary' : 'ghost'} size="sm" onClick={() => setFilter('all')}>All</Button>
                    <Button variant={filter === 'done' ? 'secondary' : 'ghost'} size="sm" onClick={() => setFilter('done')}><Check className="mr-2 h-4 w-4" />Done</Button>
                    <Button variant={filter === 'undone' ? 'secondary' : 'ghost'} size="sm" onClick={() => setFilter('undone')}><X className="mr-2 h-4 w-4" />Undone</Button>
                </div>
                <div className="flex items-center gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" onClick={toggleViewMode} className='h-9 w-9'>
                            {viewMode === 'default' ? <Rows className="h-4 w-4" /> : <Columns className="h-4 w-4" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Toggle compact view</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button variant="outline" size="sm">
                            <TagIcon className="mr-2 h-4 w-4" />
                            Manage Tags
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <h4 className="font-medium leading-none">Manage Tags</h4>
                                    <p className="text-sm text-muted-foreground">
                                    Create and manage your tags.
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Input 
                                    placeholder="New tag name"
                                    value={newTagLabel}
                                    onChange={e => setNewTagLabel(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                                    />
                                    <Button onClick={handleAddTag}>Add</Button>
                                </div>
                                 <div className="space-y-2">
                                    <Label>Existing Tags</Label>
                                    <ScrollArea className="h-40">
                                      <div className="space-y-1 pr-2">
                                          {tags.map(tag => (
                                            <div
                                                key={tag.id}
                                                className="flex justify-between items-center w-full p-2 hover:bg-accent rounded-md group"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="flex items-center gap-2 flex-grow">
                                                    <div className="h-4 w-4 rounded-full" style={{ backgroundColor: tag.color }} />
                                                    <span className="text-sm">{tag.label}</span>
                                                </div>
                                                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        onClick={() => setEditingTag({ ...tag })}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 text-destructive hover:text-destructive"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This will permanently delete the tag &quot;{tag.label}&quot; and remove it from all tasks.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteTag(tag.id)}>Delete</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </div>
                                          ))}
                                      </div>
                                    </ScrollArea>
                                 </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                    <Button variant="ghost" size="sm" onClick={() => setSortAsc(!sortAsc)}>
                        <ArrowDownUp className="h-4 w-4 mr-2" />
                        Sort by Date
                    </Button>
                </div>
            </div>
            <div className="flex flex-col gap-3">
              {filteredAndSortedTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  allTags={tags}
                  onUpdate={handleUpdate}
                  onToggleComplete={handleToggleComplete}
                  onDelete={handleDelete}
                  onAddSubtask={handleAddSubtask}
                  onAddComment={handleAddComment}
                  onToggleActivity={handleToggleActivity}
                  openActivityTaskId={openActivityTaskId}
                  level={0}
                  viewMode={focusedTaskId && task.id === focusedTaskId ? 'default' : viewMode}
                  onTaskClick={handleTaskClick}
                  userId={userId}
                />
              ))}
              {filteredAndSortedTasks.length === 0 && (
                <div className="text-center text-muted-foreground py-10">
                  <p>No tasks match the current filter.</p>
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="calendar">
            <CalendarView tasks={tasks} />
          </TabsContent>
        </Tabs>
      </div>
      {editingTag && (
        <AlertDialog open={!!editingTag} onOpenChange={() => setEditingTag(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Edit Tag</AlertDialogTitle>
                    <AlertDialogDescription>
                        Update the label and color for your tag.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="tag-label">Tag Label</Label>
                        <Input 
                            id="tag-label"
                            value={editingTag.label} 
                            onChange={(e) => setEditingTag({...editingTag, label: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="tag-color">Tag Color</Label>
                        <div className="flex items-center gap-2">
                           <Input 
                                id="tag-color-picker"
                                type="color"
                                value={editingTag.color} 
                                onChange={(e) => setEditingTag({...editingTag, color: e.target.value})}
                                className="p-1 h-10 w-14"
                            />
                             <Input 
                                id="tag-color-hex"
                                value={editingTag.color} 
                                onChange={(e) => {
                                    const newColor = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`;
                                    if (/^#[0-9A-F]{6}$/i.test(newColor)) {
                                      setEditingTag({...editingTag, color: newColor});
                                    } else {
                                      setEditingTag({...editingTag, color: e.target.value});
                                    }
                                 }}
                                className="flex-1"
                            />
                        </div>
                    </div>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setEditingTag(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleUpdateTag}>Save Changes</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
