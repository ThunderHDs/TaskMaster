'use client';

import type { Task } from '@/lib/types';
import { useState, useMemo } from 'react';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { addDays, format, isWithinInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';

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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  const allTasks = useMemo(() => getAllTasks(tasks), [tasks]);

  const tasksByDate = useMemo(() => {
    return allTasks.reduce((acc, task) => {
      if (task.dateRange?.from) {
        const from = new Date(task.dateRange.from);
        from.setUTCHours(0, 0, 0, 0);
        const to = task.dateRange.to ? new Date(task.dateRange.to) : from;
        to.setUTCHours(0,0,0,0);
        
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
        const to = new Date(task.dateRange.to);
        to.setUTCHours(0,0,0,0);
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

  const modifiers = {
    hasTasks: Object.keys(tasksByDate).map(dateStr => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(Date.UTC(year, month - 1, day));
    })
  };

  const DayContent = ({ date }: { date: Date }) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const tasksForDay = tasksByDate[dateKey] || [];
    
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        {format(date, 'd')}
        {tasksForDay.length > 0 && (
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex space-x-px">
            {tasksForDay.slice(0, 3).map((task, i) => (
              <div key={`${task.id}-${i}`} className={cn("h-1.5 w-1.5 rounded-full", task.completed ? "bg-success" : "bg-primary")} />
            ))}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="grid md:grid-cols-2 gap-6 items-start">
      <Card className="w-full">
        <CalendarUI
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          className="p-3 mx-auto"
          modifiers={modifiers}
          components={{ DayContent }}
        />
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            Tasks for {selectedDate ? format(selectedDate, 'PPP') : 'selected date'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-80">
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
  );
}
