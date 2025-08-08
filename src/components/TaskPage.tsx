'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Tag, Task } from '@/lib/types';
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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { DateRange } from 'react-day-picker';
import { Calendar } from './ui/calendar';
import { format } from 'date-fns';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Label } from './ui/label';

const initialTags: Tag[] = [
  { id: 'tag-1', label: 'Marketing', color: '#EF4444' },
  { id: 'tag-2', label: 'Development', color: '#3B82F6' },
  { id: 'tag-3', label: 'Design', color: '#F97316' },
  { id: 'tag-4', label: 'Personal', color: '#8B5CF6' },
];

const initialTasks: Task[] = [
  {
    id: '1',
    title: 'Plan Q3 marketing campaign',
    description: 'Outline strategy, budget, and KPIs for the next quarter\'s marketing efforts.',
    completed: false,
    icon: Briefcase,
    dateRange: { from: new Date(new Date().setDate(new Date().getDate() - 1)), to: new Date(new Date().setDate(new Date().getDate() + 5)) },
    tags: ['tag-1'],
    subtasks: [
      { id: '1-1', title: 'Finalize campaign goals', completed: true, icon: Briefcase, subtasks: [], dateRange: { to: new Date(new Date().setDate(new Date().getDate() + 1)) }, tags:[] },
      { id: '1-2', title: 'Allocate budget for channels', completed: false, icon: Briefcase, subtasks: [], dateRange: { to: new Date(new Date().setDate(new Date().getDate() + 3))}, tags:[] },
    ],
  },
  {
    id: '2',
    title: 'Grocery shopping',
    description: 'Buy ingredients for this week\'s meals.',
    completed: false,
    icon: ShoppingBasket,
    dateRange: { to: new Date() },
    tags: ['tag-4'],
    subtasks: [],
  },
  {
    id: '3',
    title: 'Organize home office',
    description: 'Declutter desk, sort documents, and set up new monitor.',
    completed: true,
    icon: Home,
    dateRange: { to: new Date(new Date().setDate(new Date().getDate() - 2)) },
    tags: ['tag-4'],
    subtasks: [
      { id: '3-1', title: 'Sort papers and file important documents', completed: true, icon: Home, subtasks: [], tags:[] },
      { id: '3-2', title: 'Wipe down all surfaces', completed: true, icon: Home, subtasks: [], tags: [] },
    ],
  },
];

const icons = [Briefcase, Home, ShoppingBasket];

type FilterType = 'all' | 'done' | 'undone';

export default function TaskPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  
  useEffect(() => {
    setTasks(initialTasks);
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
  const { toast } = useToast();

  const handleUpdateTag = (tagToUpdate: Tag) => {
    if (!tagToUpdate.label.trim()) {
      toast({ title: "Tag name can't be empty", variant: "destructive" });
      return;
    }
    setTags(tags.map(t => t.id === tagToUpdate.id ? tagToUpdate : t));
    setEditingTag(null);
    toast({ title: "Tag updated!" });
  }

  const handleAddTag = () => {
    if (newTagLabel.trim() && !tags.find(t => t.label.toLowerCase() === newTagLabel.trim().toLowerCase())) {
      const newTag: Tag = {
        id: crypto.randomUUID(),
        label: newTagLabel.trim(),
        color: `hsl(${Math.random() * 360}, 70%, 50%)`
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
      const newTask: Task = {
        id: crypto.randomUUID(),
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() || undefined,
        completed: false,
        icon: randomIcon,
        subtasks: [],
        tags: newTaskTags,
        dateRange: newTaskDateRange
      };
      setTasks((prevTasks) => [newTask, ...prevTasks]);
      resetNewTaskForm();
      toast({ title: "Task added!", description: `"${newTask.title}" has been added.` });
    }
  };

  const updateTaskRecursively = (
    taskList: Task[],
    id: string,
    updateFn: (task: Task) => Task
  ): Task[] => {
    return taskList.map((task) => {
      if (task.id === id) {
        return updateFn(task);
      }
      if (task.subtasks.length > 0) {
        return { ...task, subtasks: updateTaskRecursively(task.subtasks, id, updateFn) };
      }
      return task;
    }).filter(Boolean) as Task[];
  };

  const handleUpdate = useCallback((id: string, updates: Partial<Omit<Task, 'id' | 'subtasks' | 'icon'>>) => {
    setTasks(prev => updateTaskRecursively(prev, id, task => ({ ...task, ...updates })));
  }, []);

  const handleToggleComplete = useCallback((id: string, completed: boolean) => {
    const checkParentCompletion = (tasks: Task[]): Task[] => {
      return tasks.map(task => {
        if (task.subtasks && task.subtasks.length > 0) {
          const updatedSubtasks = checkParentCompletion(task.subtasks);
          const allSubtasksCompleted = updatedSubtasks.every(st => st.completed);
          return {
            ...task,
            subtasks: updatedSubtasks,
            completed: allSubtasksCompleted,
          };
        }
        return task;
      });
    };

    const toggleAndUpdate = (tasks: Task[]): Task[] => {
      // First, toggle the specified task and its children
      let toggled = false;
      const newTasks = tasks.map(task => {
        if (task.id === id) {
          toggled = true;
          const toggleChildren = (t: Task, c: boolean): Task => ({
            ...t,
            completed: c,
            subtasks: t.subtasks.map(st => toggleChildren(st, c))
          });
          return toggleChildren(task, completed);
        }
        if (task.subtasks && task.subtasks.length > 0) {
          const { tasks: updatedSubtasks, toggled: subToggled } = (()=>{
            const res = toggleAndUpdate(task.subtasks);
            let toggled = false;
            if(res.some((t,i) => t.completed !== task.subtasks[i].completed)) toggled = true;
            return {tasks: res, toggled}
          })();
          if (subToggled) toggled = true;
          return { ...task, subtasks: updatedSubtasks };
        }
        return task;
      });

      if (!toggled) return tasks;

      // After toggling, re-evaluate parent completion status from the root
      return checkParentCompletion(newTasks);
    };

    setTasks(prevTasks => toggleAndUpdate(prevTasks));
  }, []);

  const handleDelete = useCallback((id: string) => {
    const deleteRecursively = (taskList: Task[], idToDelete: string): Task[] => {
      return taskList.filter(task => task.id !== idToDelete).map(task => {
        if (task.subtasks.length > 0) {
          return { ...task, subtasks: deleteRecursively(task.subtasks, idToDelete) };
        }
        return task;
      });
    };
    setTasks(prev => deleteRecursively(prev, id));
    toast({ title: "Task deleted.", variant: "destructive" });
  }, [toast]);
  
  const handleAddSubtask = useCallback((parentId: string, subtaskData: Omit<Task, 'id' | 'subtasks'>) => {
    const randomIcon = icons[Math.floor(Math.random() * icons.length)];
    const newSubtask: Task = {
        ...subtaskData,
        id: crypto.randomUUID(),
        icon: randomIcon,
        subtasks: [],
    };
    setTasks(prev => updateTaskRecursively(prev, parentId, task => ({ ...task, subtasks: [...task.subtasks, newSubtask], completed: false })));
  }, []);

  const filteredAndSortedTasks = useMemo(() => {
    let filteredTasks = tasks;
    if (filter === 'done') {
      filteredTasks = tasks.filter(task => task.completed);
    } else if (filter === 'undone') {
      filteredTasks = tasks.filter(task => !task.completed);
    }
    
    const tasksToSort = [...filteredTasks];
    
    return tasksToSort.sort((a, b) => {
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
                                    ) : (
                                        <span>Pick a date range</span>
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
                                <Command>
                                    <CommandInput placeholder="Filter tags..." />
                                    <CommandList>
                                        <CommandEmpty>No tags found.</CommandEmpty>
                                        <CommandGroup>
                                        {tags.map(tag => (
                                            <CommandItem key={tag.id} className="flex justify-between items-center" onSelect={(e) => { e.preventDefault() }}>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-4 w-4 rounded-full" style={{ backgroundColor: tag.color }} />
                                                    <span>{tag.label}</span>
                                                </div>
                                                <div className="flex items-center">
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingTag({...tag})}>
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                    </AlertDialog>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setTags(tags.filter(t => t.id !== tag.id))}>
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </CommandItem>
                                        ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
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
                                id="tag-color"
                                type="color"
                                value={editingTag.color} 
                                onChange={(e) => setEditingTag({...editingTag, color: e.target.value})}
                                className="p-1 h-10 w-14"
                            />
                             <Input 
                                value={editingTag.color} 
                                onChange={(e) => setEditingTag({...editingTag, color: e.target.value})}
                                className="flex-1"
                            />
                        </div>
                    </div>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setEditingTag(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleUpdateTag(editingTag)}>Save Changes</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
