'use client';

import { suggestSubtasks } from '@/ai/flows/suggest-subtasks';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { ScrollArea } from './ui/scroll-area';

type SuggestSubtasksDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskDescription: string;
  onAddSubtasks: (subtasks: string[]) => void;
};

export function SuggestSubtasksDialog({
  open,
  onOpenChange,
  taskDescription,
  onAddSubtasks,
}: SuggestSubtasksDialogProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    if (open && taskDescription) {
      setSuggestions([]);
      startTransition(async () => {
        try {
          const result = await suggestSubtasks({ taskDescription });
          setSuggestions(result.subtasks);
          const initialSelections = result.subtasks.reduce(
            (acc, task) => ({ ...acc, [task]: true }),
            {}
          );
          setSelectedSuggestions(initialSelections);
        } catch (error) {
          console.error('Failed to suggest subtasks:', error);
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not generate subtask suggestions.',
          });
          onOpenChange(false);
        }
      });
    }
  }, [open, taskDescription, toast, onOpenChange]);

  const handleAddClick = () => {
    const toAdd = Object.entries(selectedSuggestions)
      .filter(([, isSelected]) => isSelected)
      .map(([task]) => task);
    onAddSubtasks(toAdd);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>AI-Suggested Subtasks</DialogTitle>
          <DialogDescription>
            Here are some subtasks suggested by AI. Select which ones to add.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {isPending ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-4 text-muted-foreground">Generating ideas...</p>
            </div>
          ) : (
            <ScrollArea className="h-64 pr-4">
              <div className="space-y-3">
                {suggestions.map((suggestion, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <Checkbox
                      id={`suggestion-${index}`}
                      checked={selectedSuggestions[suggestion] ?? false}
                      onCheckedChange={(checked) =>
                        setSelectedSuggestions((prev) => ({
                          ...prev,
                          [suggestion]: !!checked,
                        }))
                      }
                      className="mt-1"
                    />
                    <Label
                      htmlFor={`suggestion-${index}`}
                      className="font-normal text-sm flex-1"
                    >
                      {suggestion}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleAddClick} disabled={isPending || suggestions.length === 0}>
            Add Selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
