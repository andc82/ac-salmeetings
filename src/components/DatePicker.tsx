import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Props {
  value?: string | null; // ISO date yyyy-MM-dd
  onChange: (v: string | null) => void;
  placeholder?: string;
  clearable?: boolean;
  min?: string;
  max?: string;
  className?: string;
}

export function DatePicker({ value, onChange, placeholder = "Seleziona data", clearable, min, max, className }: Props) {
  const date = value ? new Date(value + "T00:00:00") : undefined;
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "dd MMM yyyy", { locale: it }) : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            locale={it}
            selected={date}
            onSelect={(d) => onChange(d ? format(d, "yyyy-MM-dd") : null)}
            disabled={(d) => {
              if (min && format(d, "yyyy-MM-dd") < min) return true;
              if (max && format(d, "yyyy-MM-dd") > max) return true;
              return false;
            }}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
      {clearable && value && (
        <Button type="button" variant="ghost" size="icon" aria-label="Rimuovi data" onClick={() => onChange(null)}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
