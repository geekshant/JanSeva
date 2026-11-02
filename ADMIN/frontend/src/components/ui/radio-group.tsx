import { createContext, useContext, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// RadioGroup — lightweight wrapper around native radio inputs.
// No external dependency; styled with Tailwind to match the Radix-based
// components used elsewhere in this project.
// ---------------------------------------------------------------------------

interface RadioGroupContextValue {
  name: string;
  value: string;
  onChange: (val: string) => void;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

interface RadioGroupProps {
  name?: string;
  value: string;
  onValueChange: (val: string) => void;
  className?: string;
  children: ReactNode;
}

export function RadioGroup({
  name,
  value,
  onValueChange,
  className,
  children,
}: RadioGroupProps) {
  const groupName = name ?? `radio-group-${Math.random().toString(36).slice(2)}`;
  return (
    <RadioGroupContext.Provider value={{ name: groupName, value, onChange: onValueChange }}>
      <div role="radiogroup" className={cn('grid gap-2', className)}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

interface RadioGroupItemProps {
  value: string;
  id?: string;
  className?: string;
  disabled?: boolean;
}

export function RadioGroupItem({ value, id, className, disabled }: RadioGroupItemProps) {
  const ctx = useContext(RadioGroupContext);
  if (!ctx) {
    throw new Error('RadioGroupItem must be used within a RadioGroup');
  }
  const checked = ctx.value === value;
  return (
    <input
      type="radio"
      name={ctx.name}
      value={value}
      id={id}
      checked={checked}
      disabled={disabled}
      onChange={() => ctx.onChange(value)}
      className={cn(
        'h-4 w-4 shrink-0 cursor-pointer rounded-full border border-input ring-offset-background',
        'accent-[hsl(var(--primary))] transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    />
  );
}
