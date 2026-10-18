import { AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Props = {
  message?: string;
  className?: string;
};

export function ErrorState({ message, className }: Props) {
  return (
    <Card className={cn('border-destructive/30 bg-destructive/5', className)}>
      <CardContent className="flex items-center gap-3 py-4 text-sm text-destructive">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>{message || 'Something went wrong. Please try again.'}</span>
      </CardContent>
    </Card>
  );
}
