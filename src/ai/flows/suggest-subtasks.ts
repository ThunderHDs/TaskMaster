'use server';

/**
 * @fileOverview An AI agent that suggests subtasks for a given task description.
 *
 * - suggestSubtasks - A function that suggests subtasks for a given task description.
 * - SuggestSubtasksInput - The input type for the suggestSubtasks function.
 * - SuggestSubtasksOutput - The return type for the suggestSubtasks function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestSubtasksInputSchema = z.object({
  taskDescription: z
    .string()
    .describe('The description of the main task for which subtasks are to be suggested.'),
});
export type SuggestSubtasksInput = z.infer<typeof SuggestSubtasksInputSchema>;

const SuggestSubtasksOutputSchema = z.object({
  subtasks: z
    .array(z.string())
    .describe('An array of suggested subtasks for the main task.'),
});
export type SuggestSubtasksOutput = z.infer<typeof SuggestSubtasksOutputSchema>;

export async function suggestSubtasks(input: SuggestSubtasksInput): Promise<SuggestSubtasksOutput> {
  return suggestSubtasksFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestSubtasksPrompt',
  input: {schema: SuggestSubtasksInputSchema},
  output: {schema: SuggestSubtasksOutputSchema},
  prompt: `You are a helpful task management assistant. Your goal is to suggest a list of subtasks for a given task description.

Task Description: {{{taskDescription}}}

Please provide a list of subtasks that would be necessary to complete the main task. The subtasks should be specific and actionable.

Format your response as a JSON array of strings.`,
});

const suggestSubtasksFlow = ai.defineFlow(
  {
    name: 'suggestSubtasksFlow',
    inputSchema: SuggestSubtasksInputSchema,
    outputSchema: SuggestSubtasksOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
