'use client';

import { useState, useCallback, useMemo } from 'react';
import { Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TaskItem } from './TaskItem';
import { Briefcase, Home, ShoppingBasket, Plus, ArrowDownUp, ListTodo, Calendar, Check, X } from 'lucide-react';
import Header from './Header';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { CalendarView } from './CalendarView';
import { cn } from '@/lib/utils';

const initialTasks: Task[] = [
  {
    id: '1',
    title: 'Plan Q3 marketing campaign',
    description: 'Outline strategy, budget, and KPIs for the next quarter\'s marketing efforts.',
    completed: false,
    icon: Briefcase,
    dueDate: new Date(new Date().setDate(new Date().getDate() + 5)),
    subtasks: [
      { id: '1-1', title: 'Finalize campaign goals', completed: true, icon: Briefcase, subtasks: [], dueDate: new Date(new Date().setDate(new Date().getDate() + 1)) },
      { id: '1-2', title: 'Allocate budget for channels', completed: false, icon: Briefcase, subtasks: [], dueDate: new Date(new Date().setDate(new Date().getDate() + 3))},
    ],
  },
  {
    id: '2',
    title: 'Grocery shopping',
    description: 'Buy ingredients for this week\'s meals.',
    completed: false,
    icon: ShoppingBasket,
    dueDate: new Date(),
    subtasks: [],
  },
  {
    id: '3',
    title: 'Organize home office',
    description: 'Declutter desk, sort documents, and set up new monitor.',
    completed: true,
    icon: Home,
    dueDate: new Date(new Date().setDate(new Date().getDate() - 2)),
    subtasks: [
      { id: '3-1', title: 'Sort papers and file important documents', completed: true, icon: Home, subtasks: [] },
      { id: '3-2', title: 'Wipe down all surfaces', completed: true, icon: Home, subtasks: [] },
    ],
  },
];

const icons = [Briefcase, Home, ShoppingBasket];

type FilterType = 'all' | 'done' | 'undone';

export default function TaskPage() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const { toast } = useToast();

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      const randomIcon = icons[Math.floor(Math.random() * icons.length)];
      const newTask: Task = {
        id: crypto.randomUUID(),
        title: newTaskTitle.trim(),
        completed: false,
        icon: randomIcon,
        subtasks: [],
      };
      setTasks((prevTasks) => [newTask, ...prevTasks]);
      setNewTaskTitle('');
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
    const toggleRecursively = (tasks: Task[], parentCompleted: boolean): Task[] => {
      return tasks.map(task => {
        const currentCompleted = parentCompleted || completed;
        return {
          ...task,
          completed: currentCompleted,
          subtasks: toggleRecursively(task.subtasks, currentCompleted)
        };
      });
    };
    
    setTasks(prev => updateTaskRecursively(prev, id, task => {
      const newCompleted = completed;
      // Auto-complete parent if all subtasks are done
      const updatedSubtasks = toggleRecursively(task.subtasks, newCompleted);
      const allSubtasksCompleted = updatedSubtasks.every(st => st.completed);
      
      return { 
        ...task,
        completed: newCompleted || (updatedSubtasks.length > 0 && allSubtasksCompleted),
        subtasks: updatedSubtasks
      };
    }));
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
      const aDate = a.dueDate?.getTime() || (sortAsc ? Infinity : -Infinity);
      const bDate = b.dueDate?.getTime() || (sortAsc ? Infinity : -Infinity);
      return sortAsc ? aDate - bDate : bDate - aDate;
    });
  }, [tasks, sortAsc, filter]);

  return (
    <div className="w-full">
      <Header />
      <div className="w-full max-w-4xl mx-auto px-4 pb-8">
        <div className="flex gap-2 mb-6">
          <Input
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
            placeholder="Add a new task..."
            className="flex-grow"
          />
          <Button onClick={handleAddTask}>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>
        
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="list">
              <ListTodo className="mr-2 h-4 w-4" />
              List View
            </TabsTrigger>
            <TabsTrigger value="calendar">
              <Calendar className="mr-2 h-4 w-4" />
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
              <Button variant="ghost" onClick={() => setSortAsc(!sortAsc)}>
                <ArrowDownUp className="h-4 w-4 mr-2" />
                Sort by Due Date
              </Button>
            </div>
            <div className="flex flex-col gap-3">
              {filteredAndSortedTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onUpdate={handleUpdate}
                  onToggleComplete={handleToggleComplete}
                  onDelete={handleDelete}
                  onAddSubtask={handleAddSubtask}
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
    </div>
  );
}
