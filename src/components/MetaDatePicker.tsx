import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface MetaDatePickerProps {
  value?: Date;
  onChange: (value?: Date) => void;
  placeholder?: string;
  disabled?: boolean;
  closeOnSelect?: boolean;
  children?: React.ReactNode;
  fromYear?: number;
  toYear?: number;
}

export function MetaDatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  disabled,
  closeOnSelect = true,
  children,
  fromYear = 1900,
  toYear = 2100,
}: MetaDatePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          data-empty={!value}
          className={cn(
            'w-full justify-start text-left font-normal gap-2',
            !value && 'text-muted-foreground',
          )}
        >
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <span className="truncate">
            {value ? format(value, 'PPP') : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          defaultMonth={value}
          onSelect={(date) => {
            onChange(date);
            if (closeOnSelect) {
              setOpen(false);
            }
          }}
          captionLayout="dropdown"
          fromYear={fromYear}
          toYear={toYear}
          initialFocus
        />
        {children ? (
          <div className="border-t border-border bg-card/50 p-3">{children}</div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

