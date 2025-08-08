import { ListChecks } from 'lucide-react';

export default function Header() {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 pt-8 pb-4">
      <div className="flex items-center space-x-3">
        <div className="bg-primary/10 p-2 rounded-lg">
          <ListChecks className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          TaskMaster
        </h1>
      </div>
      <p className="text-muted-foreground mt-1">
        Your personal AI-powered to-do list.
      </p>
    </div>
  );
}
