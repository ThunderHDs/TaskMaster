'use client';

import type { Task } from '@/lib/types';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { addDays, format, isWithinInterval, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isEqual, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from './ui/badge';

// Helper function to flatten the task tree
function getAllTasks(tasks: Task[]): Task[] {
  let allTasks: Task[] = [];
  tasks.forEach(task => {
    allTasks.push(task);
    if (task.subtasks && task.subtasks.length > 0) {
      allTasks = allTasks.concat(getAllTasks(task.subtasks));
    }
  });
  return allTasks;
}

export function CalendarView({ tasks }: { tasks: Task[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  const allTasks = useMemo(() => getAllTasks(tasks), [tasks]);

  const tasksByDate = useMemo(() => {
    return allTasks.reduce((acc, task) => {
      if (task.dateRange?.from) {
        const from = startOfDay(new Date(task.dateRange.from));
        const to = task.dateRange.to ? startOfDay(new Date(task.dateRange.to)) : from;
        
        let currentDate = from;
        while (currentDate <= to) {
          const dateKey = format(currentDate, 'yyyy-MM-dd');
          if (!acc[dateKey]) {
            acc[dateKey] = [];
          }
          acc[dateKey].push(task);
          currentDate = addDays(currentDate, 1);
        }
      } else if(task.dateRange?.to) {
        const to = startOfDay(new Date(task.dateRange.to));
        const dateKey = format(to, 'yyyy-MM-dd');
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(task);
      }
      return acc;
    }, {} as Record<string, Task[]>);
  }, [allTasks]);

  const tasksOnSelectedDate = selectedDate
    ? tasksByDate[format(selectedDate, 'yyyy-MM-dd')] || []
    : [];
  
  const firstDayOfMonth = startOfMonth(currentDate);
  const lastDayOfMonth = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: firstDayOfMonth, end: lastDayOfMonth });
  const startingDayIndex = getDay(firstDayOfMonth);

  const prevMonth = () => setCurrentDate(prev => addDays(startOfMonth(prev), -1));
  const nextMonth = () => setCurrentDate(prev => addDays(endOfMonth(prev), 1));
  const goToToday = () => setCurrentDate(new Date());

  return (
    <div className="grid lg:grid-cols-3 gap-6 items-start">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold">{format(currentDate, 'MMMM yyyy')}</h2>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" onClick={goToToday}>Today</Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 text-center font-semibold text-sm text-muted-foreground border-b">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="py-2">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 grid-rows-5">
              {Array.from({ length: startingDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} className="border-r border-b h-28" />
              ))}
              {daysInMonth.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const tasksForDay = tasksByDate[dateKey] || [];
                const isToday = isEqual(startOfDay(day), startOfDay(new Date()));
                const isSelected = selectedDate && isEqual(startOfDay(day), startOfDay(selectedDate));
                return (
                  <div 
                    key={day.toString()} 
                    className={cn(
                      "border-r border-b p-2 text-sm text-left relative h-28 flex flex-col cursor-pointer",
                      isSelected ? "bg-accent/50" : "hover:bg-accent/20"
                    )}
                    onClick={() => setSelectedDate(day)}
                  >
                    <span className={cn(
                      "font-semibold mb-1",
                      isToday ? "text-primary font-bold" : "text-foreground"
                    )}>
                      {format(day, 'd')}
                    </span>
                    <ScrollArea className="flex-grow">
                      <div className="space-y-1">
                        {tasksForDay.slice(0, 3).map(task => (
                           <div key={task.id} className="flex items-center gap-1.5">
                              <div className={cn("h-2 w-2 rounded-full", task.completed ? "bg-success" : "bg-primary")} />
                              <p className="text-xs truncate">{task.title}</p>
                           </div>
                        ))}
                        {tasksForDay.length > 3 && (
                            <p className="text-xs text-muted-foreground mt-1">+{tasksForDay.length - 3} more</p>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>
              Tasks for {selectedDate ? format(selectedDate, 'PPP') : 'selected date'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[28rem]">
              {tasksOnSelectedDate.length > 0 ? (
                <ul className="space-y-4 pr-4">
                  {tasksOnSelectedDate.map(task => (
                    <li key={task.id} className="flex items-start gap-3">
                      <task.icon className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                      <div className="flex-grow">
                        <p className={cn(
                          'font-medium',
                          task.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                        )}>
                          {task.title}
                        </p>
                        {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center text-muted-foreground py-10 h-full flex items-center justify-center">
                  <p>No tasks scheduled for this day.</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
