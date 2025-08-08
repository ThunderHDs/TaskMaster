'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Activity, Tag, Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TaskItem } from './TaskItem';
import { Briefcase, Home, ShoppingBasket, Plus, ArrowDownUp, ListTodo, Calendar as CalendarIcon, Check, X, Tag as TagIcon, Edit } from 'lucide-react';
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

const initialTags: Tag[] = [
  { id: 'tag-1', label: 'Marketing', color: '#EF4444' },
  { id: 'tag-2', label: 'Development', color: '#3B82F6' },
  { id: 'tag-3', label: 'Design', color: '#F97316' },
  { id: 'tag-4', label: 'Personal', color: '#8B5CF6' },
];

const icons = [Briefcase, Home, ShoppingBasket];

type FilterType = 'all' | 'done' | 'undone';

export default function TaskPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  
  useEffect(() => {
    const now = new Date();
    const initialTasksWithDates = [
      {
        id: '1',
        title: 'Plan Q3 marketing campaign',
        description: 'Outline strategy, budget, and KPIs for the next quarter\'s marketing efforts.',
        completed: false,
        icon: Briefcase,
        dateRange: { from: new Date(now.getFullYear(), now.getMonth(), 10), to: new Date(now.getFullYear(), now.getMonth(), 20) },
        tags: ['tag-1'],
        activity: [{ id: crypto.randomUUID(), type: 'log', content: 'Task created.', timestamp: new Date(now.getFullYear(), now.getMonth(), 9), taskId: '1' }],
        subtasks: [
          { id: '1-1', title: 'Finalize campaign goals', completed: true, icon: Briefcase, subtasks: [], dateRange: { from: new Date(now.getFullYear(), now.getMonth(), 10), to: new Date(now.getFullYear(), now.getMonth(), 11) }, tags:[], activity: [{ id: crypto.randomUUID(), type: 'log', content: 'Task marked as complete.', timestamp: new Date(), taskId: '1-1' }] },
          { id: '1-2', title: 'Allocate budget for channels', completed: false, icon: Briefcase, subtasks: [], dateRange: { from: new Date(now.getFullYear(), now.getMonth(), 12), to: new Date(now.getFullYear(), now.getMonth(), 15)}, tags:[], activity: [] },
        ],
      },
      {
        id: '2',
        title: 'Grocery shopping',
        description: 'Buy ingredients for this week\'s meals.',
        completed: false,
        icon: ShoppingBasket,
        dateRange: { to: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3) },
        tags: ['tag-4'],
        activity: [{ id: crypto.randomUUID(), type: 'log', content: 'Task created.', timestamp: new Date(), taskId: '2' }],
        subtasks: [],
      },
      {
        id: '3',
        title: 'Organize home office',
        description: 'Declutter desk, sort documents, and set up new monitor.',
        completed: true,
        icon: Home,
        dateRange: { from: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2), to: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1) },
        tags: ['tag-4'],
        activity: [{ id: crypto.randomUUID(), type: 'log', content: 'Task marked as complete.', timestamp: new Date(), taskId: '3' }],
        subtasks: [
          { id: '3-1', title: 'Sort papers and file important documents', completed: true, icon: Home, subtasks: [], tags:[], dateRange: { from: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2), to: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2) }, activity: [{id: crypto.randomUUID(), type: 'log', content: 'Task marked as complete.', timestamp: new Date(), taskId: '3-1'}] },
          { id: '3-2', title: 'Wipe down all surfaces', completed: true, icon: Home, subtasks: [], tags: [], dateRange: { from: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1), to: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1) }, activity: [{id: crypto.randomUUID(), type: 'log', content: 'Task marked as complete.', timestamp: new Date(), taskId: '3-2'}] },
        ],
      },
    ];
    setTasks(initialTasksWithDates);
    setTags(initialTags);
  }, []);

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

  const handleUpdateTag = () => {
    if (!editingTag || !editingTag.label.trim()) {
      toast({ title: "Tag name can't be empty", variant: "destructive" });
      return;
    }
    setTags(tags.map(t => t.id === editingTag.id ? editingTag : t));
    setEditingTag(null);
    toast({ title: "Tag updated!" });
  }

  const handleDeleteTag = (tagId: string) => {
    setTags(tags.filter(t => t.id !== tagId));
    setTasks(prevTasks => {
      const removeTagFromTasks = (taskList: Task[]): Task[] => {
        return taskList.map(task => {
          const newTags = task.tags?.filter(tId => tId !== tagId);
          const newSubtasks = task.subtasks ? removeTagFromTasks(task.subtasks) : [];
          return {...task, tags: newTags, subtasks: newSubtasks};
        });
      };
      return removeTagFromTasks(prevTasks);
    });
    setEditingTag(null);
    toast({ title: "Tag deleted and removed from all tasks." });
  };


  const handleAddTag = () => {
    if (newTagLabel.trim() && !tags.find(t => t.label.toLowerCase() === newTagLabel.trim().toLowerCase())) {
      const newTag: Tag = {
        id: crypto.randomUUID(),
        label: newTagLabel.trim(),
        color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`
      };
      setTags(prev => [...prev, newTag]);
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

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      const randomIcon = icons[Math.floor(Math.random() * icons.length)];
      
      let finalDateRange = newTaskDateRange;
      if (finalDateRange?.to && !finalDateRange.from) {
        finalDateRange = { from: new Date(), to: finalDateRange.to };
      }

      const newTaskId = crypto.randomUUID();
      const newTask: Task = {
        id: newTaskId,
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() || undefined,
        completed: false,
        icon: randomIcon,
        subtasks: [],
        tags: newTaskTags,
        dateRange: finalDateRange,
        activity: [{ id: crypto.randomUUID(), type: 'log', content: 'Task created.', timestamp: new Date(), taskId: newTaskId }]
      };
      setTasks((prevTasks) => [newTask, ...prevTasks]);
      resetNewTaskForm();
      toast({ title: "Task added!", description: `"${newTask.title}" has been added.` });
    }
  };

  const updateTaskRecursively = (
    taskList: Task[],
    id: string,
    updateFn: (task: Task) => Task,
    parentId?: string
  ): Task[] => {
    return taskList.map((task) => {
      if (task.id === id) {
        return updateFn(task);
      }
      if (task.subtasks && task.subtasks.length > 0) {
        return { ...task, subtasks: updateTaskRecursively(task.subtasks, id, updateFn, task.id) };
      }
      return task;
    });
  };

  const addActivityToParent = (tasks: Task[], parentId: string, activity: Activity) => {
    return tasks.map(task => {
        if (task.id === parentId) {
            const newActivity = [...(task.activity || []), activity].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            return {...task, activity: newActivity};
        }
        if (task.subtasks && task.subtasks.length > 0) {
            return {...task, subtasks: addActivityToParent(task.subtasks, parentId, activity)};
        }
        return task;
    })
  }

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

  const handleAddComment = useCallback((taskId: string, comment: string) => {
    setTasks(prev => {
        const newActivity: Activity = {
            id: crypto.randomUUID(),
            type: 'comment',
            content: comment,
            timestamp: new Date(),
            taskId,
        };
        let updatedTasks = updateTaskRecursively(prev, taskId, task => ({
            ...task,
            activity: [...(task.activity || []), newActivity].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
        }));

        const parentId = findParentId(updatedTasks, taskId);
        if (parentId) {
            updatedTasks = addActivityToParent(updatedTasks, parentId, newActivity);
        }

        return updatedTasks;
    });
  }, []);

  const handleUpdate = useCallback((id: string, updates: Partial<Omit<Task, 'id' | 'subtasks' | 'icon' | 'activity'>>, activityLog?: string) => {
    setTasks(prev => {
        let updatedTasks = prev;
        const newActivity: Activity | null = activityLog ? {
            id: crypto.randomUUID(),
            type: 'log',
            content: activityLog,
            timestamp: new Date(),
            taskId: id,
        } : null;

        updatedTasks = updateTaskRecursively(updatedTasks, id, task => {
            const updatedTask = { ...task, ...updates };
            if (newActivity) {
                updatedTask.activity = [...(updatedTask.activity || []), newActivity].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            }
            return updatedTask;
        });

        if (newActivity) {
            const parentId = findParentId(updatedTasks, id);
            if (parentId) {
                updatedTasks = addActivityToParent(updatedTasks, parentId, newActivity);
            }
        }
        return updatedTasks;
    });
  }, []);

  const handleToggleComplete = useCallback((id: string, completed: boolean) => {
    const logContent = completed ? 'Task marked as complete.' : 'Task marked as incomplete.';
    const newActivity: Activity = { id: crypto.randomUUID(), type: 'log', content: logContent, timestamp: new Date(), taskId: id };

    let tasksAfterUpdate: Task[] = [];

    const toggleChildrenAndLog = (tasks: Task[], parentCompleted: boolean): Task[] => {
        return tasks.map(task => ({
            ...task,
            completed: parentCompleted,
            activity: [...(task.activity || []), {...newActivity, taskId: task.id}].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
            subtasks: task.subtasks ? toggleChildrenAndLog(task.subtasks, parentCompleted) : [],
        }));
    };

    const updateParents = (tasks: Task[], originalTasks: Task[]): Task[] => {
        return tasks.map(task => {
            if (task.subtasks && task.subtasks.length > 0) {
                const newSubtasks = updateParents(task.subtasks, originalTasks);
                const allChildrenCompleted = newSubtasks.every(sub => sub.completed);
                const originalTask = findTaskById(originalTasks, task.id);

                if (originalTask && originalTask.completed !== allChildrenCompleted) {
                    const parentLogContent = allChildrenCompleted ? 'All subtasks completed, marking parent task as complete.' : 'Subtask marked as incomplete, marking parent task as incomplete.';
                    const parentNewActivity: Activity = { id: crypto.randomUUID(), type: 'log', content: parentLogContent, timestamp: new Date(), taskId: task.id };

                    return { 
                        ...task, 
                        subtasks: newSubtasks, 
                        completed: allChildrenCompleted,
                        activity: [...(task.activity || []), parentNewActivity].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
                    };
                }
                return { ...task, subtasks: newSubtasks, completed: allChildrenCompleted };
            }
            return task;
        });
    };
    
    const findTaskById = (tasks: Task[], taskId: string): Task | null => {
        for (const task of tasks) {
            if (task.id === taskId) return task;
            if (task.subtasks) {
                const found = findTaskById(task.subtasks, taskId);
                if (found) return found;
            }
        }
        return null;
    }

    const updateTasks = (tasks: Task[], targetId: string, isCompleted: boolean): Task[] => {
        return tasks.map(task => {
            if (task.id === targetId) {
                const updatedTask = { 
                  ...task, 
                  completed: isCompleted,
                  activity: [...(task.activity || []), newActivity].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
                };
                if (updatedTask.subtasks) {
                    updatedTask.subtasks = toggleChildrenAndLog(updatedTask.subtasks, isCompleted);
                }
                return updatedTask;
            }
            if (task.subtasks && task.subtasks.length > 0) {
                return { ...task, subtasks: updateTasks(task.subtasks, targetId, isCompleted) };
            }
            return task;
        });
    };

    setTasks(currentTasks => {
        const tasksWithToggledItem = updateTasks(currentTasks, id, completed);
        const tasksWithParentUpdates = updateParents(tasksWithToggledItem, currentTasks);
        
        const parentId = findParentId(tasksWithParentUpdates, id);
        if (parentId) {
            return addActivityToParent(tasksWithParentUpdates, parentId, newActivity);
        }
        return tasksWithParentUpdates;
    });
  }, []);

  const handleDelete = useCallback((id: string) => {
    const deleteRecursively = (taskList: Task[], idToDelete: string): Task[] => {
      return taskList.filter(task => task.id !== idToDelete).map(task => {
        if (task.subtasks && task.subtasks.length > 0) {
          return { ...task, subtasks: deleteRecursively(task.subtasks, idToDelete) };
        }
        return task;
      });
    };
    setTasks(prev => deleteRecursively(prev, id));
    toast({ title: "Task deleted.", variant: "destructive" });
  }, [toast]);
  
  const handleAddSubtask = useCallback((parentId: string, subtaskData: Omit<Task, 'id' | 'subtasks'>, parentUpdate?: Partial<Task>) => {
    setTasks(prevTasks => {
        const randomIcon = icons[Math.floor(Math.random() * icons.length)];
        let finalSubtaskData = { ...subtaskData };
        if (finalSubtaskData.dateRange?.to && !finalSubtaskData.dateRange.from) {
            finalSubtaskData.dateRange.from = new Date();
        }
        
        const newSubtaskId = crypto.randomUUID();
        const newSubtask: Task = {
            ...finalSubtaskData,
            id: newSubtaskId,
            icon: randomIcon,
            subtasks: [],
            activity: [{ id: crypto.randomUUID(), type: 'log', content: 'Subtask created.', timestamp: new Date(), taskId: newSubtaskId }],
        };

        let tasksAfterUpdate = prevTasks;
        if (parentUpdate) {
            tasksAfterUpdate = updateTaskRecursively(tasksAfterUpdate, parentId, task => ({ ...task, ...parentUpdate }));
        }

        const addLogToParentActivity: Activity = {
            id: crypto.randomUUID(),
            type: 'log',
            content: `New subtask added: "${newSubtask.title}"`,
            timestamp: new Date(),
            taskId: newSubtaskId,
        };

        return updateTaskRecursively(tasksAfterUpdate, parentId, task => ({ 
            ...task, 
            subtasks: [...(task.subtasks || []), newSubtask], 
            completed: false,
            activity: [...(task.activity || []), addLogToParentActivity].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
        }));
    });
  }, []);

  const filteredAndSortedTasks = useMemo(() => {
    let filteredTasks = [...tasks];
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
  }, [tasks, sortAsc, filter]);

  const handleNewTaskTagToggle = (tagId: string) => {
    setNewTaskTags(prev => 
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
    );
  };
  
  const handleToggleActivity = (taskId: string) => {
    setOpenActivityTaskId(prevId => (prevId === taskId ? null : taskId));
  };


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
            <TabsTrigger value="list">
              <ListTodo className="mr-2 h-4 w-4" />
              List View
            </TabsTrigger>
            <TabsTrigger value="calendar">
              <CalendarIcon className="mr-2 h-4 w-4" />
              Calendar View
            </TabsTrigger>
          </TabsList>
          <TabsContent value="list">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <Button variant={filter === 'all' ? 'secondary' : 'ghost'} size="sm" onClick={() => setFilter('all')}>All</Button>
                    <Button variant={filter === 'done' ? 'secondary' : 'ghost'} size="sm" onClick={() => setFilter('done')}><Check className="mr-2 h-4 w-4" />Done</Button>
                    <Button variant={filter === 'undone' ? 'secondary' : 'ghost'} size="sm" onClick={() => setFilter('undone')}><X className="mr-2 h-4 w-4" />Undone</Button>
                </div>
                <div className="flex items-center gap-2">
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
                                                          onClick={(e) => {
                                                              e.stopPropagation();
                                                              setEditingTag({ ...tag });
                                                          }}
                                                      >
                                                          <Edit className="h-4 w-4" />
                                                      </Button>
                                                      <AlertDialog>
                                                          <AlertDialogTrigger asChild>
                                                              <Button
                                                                  variant="ghost"
                                                                  size="icon"
                                                                  className="h-6 w-6 text-destructive hover:text-destructive"
                                                                  onClick={(e) => e.stopPropagation()}
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
                  isActivityOpen={openActivityTaskId === task.id}
                  level={0}
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
                                    const newColor = e.target.value;
                                    setEditingTag({...editingTag, color: newColor});
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
