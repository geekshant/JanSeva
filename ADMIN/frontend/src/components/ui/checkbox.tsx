import * as React from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked?: boolean | 'indeterminate';
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ className, checked = false, onCheckedChange, disabled, ...props }, ref) => {
    const isChecked = checked === true;
    const isIndeterminate = checked === 'indeterminate';

    return (
      <button
        ref={ref}
        type="button"
        role="checkbox"
        aria-checked={isIndeterminate ? 'mixed' : isChecked}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          onCheckedChange?.(!isChecked);
        }}
        className={cn(
          'peer h-4 w-4 shrink-0 rounded-[4px] border border-primary ring-offset-background',
          'flex items-center justify-center transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          (isChecked || isIndeterminate) && 'bg-primary text-primary-foreground',
          className,
        )}
        {...props}
      >
        {isChecked && <Check className="h-3 w-3" />}
        {isIndeterminate && <Minus className="h-3 w-3" />}
      </button>
    );
  },
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
