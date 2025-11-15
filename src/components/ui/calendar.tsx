"use client"

import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from "lucide-react"
import { DayPicker, getDefaultClassNames } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: "default" | "outline" | "ghost"
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  modifiersClassNames: modifiersClassNamesProp,
  ...props
}: CalendarProps) {
  const defaultClassNames = getDefaultClassNames()
  const modifiersClassNames = {
    selected:
      "bg-primary text-primary-foreground font-semibold shadow-sm hover:bg-primary/90",
    today:
      "bg-accent text-accent-foreground font-medium ring-1 ring-primary/30",
    ...modifiersClassNamesProp,
  }

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "p-3",
        "[--rdp-accent-color:hsl(var(--primary))]",
        "[--rdp-accent-background-color:hsl(var(--primary))]", 
        "[--rdp-background-color:hsl(var(--primary))]",
        "[--rdp-selected-background-color:hsl(var(--primary))]",
        "[--rdp-selected-color:hsl(var(--primary-foreground))]",
        "[--rdp-today-color:hsl(var(--accent-foreground))]",
        className
      )}
      captionLayout={captionLayout}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "flex flex-col gap-2 sm:flex-row relative",
          defaultClassNames.months
        ),
        month: cn("flex flex-col w-full gap-3", defaultClassNames.month),
        month_caption: cn(
          "flex items-center justify-center h-9 w-full relative",
          defaultClassNames.month_caption
        ),
        caption_label: cn(
          "text-sm font-medium select-none flex items-center gap-1 h-7",
          captionLayout === "dropdown" && "[&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:shrink-0 [&>svg]:opacity-50",
          defaultClassNames.caption_label
        ),
        dropdowns: cn(
          "flex items-center justify-center gap-1.5",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "relative inline-flex items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm h-7 min-w-[80px] hover:bg-accent hover:text-accent-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-ring transition-colors cursor-pointer",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn(
          "absolute inset-0 opacity-0 cursor-pointer z-10 w-full appearance-none",
          defaultClassNames.dropdown
        ),
        nav: cn(
          "flex items-center justify-between w-full absolute inset-x-0 top-0 h-9 z-10 pointer-events-none",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: "ghost" }),
          "h-7 w-7 p-0 hover:bg-accent hover:text-accent-foreground rounded-md disabled:opacity-50 disabled:pointer-events-none pointer-events-auto mr-auto",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost" }),
          "h-7 w-7 p-0 hover:bg-accent hover:text-accent-foreground rounded-md disabled:opacity-50 disabled:pointer-events-none pointer-events-auto ml-auto",
          defaultClassNames.button_next
        ),
        month_grid: cn("w-full border-collapse mt-3", defaultClassNames.month_grid),
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "text-muted-foreground rounded-md w-9 font-normal text-[0.75rem] select-none",
          defaultClassNames.weekday
        ),
        week: cn("flex w-full mt-1.5", defaultClassNames.week),
        day: cn(
          "relative w-9 h-9 p-0 text-center text-sm select-none rounded-md",
          "[&:has(button)]:hover:bg-accent",
          defaultClassNames.day
        ),
        day_button: cn(
          "h-9 w-9 p-0 font-normal text-sm rounded-md transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          // Outside ve disabled
          "data-[outside=true]:text-muted-foreground data-[outside=true]:opacity-50",
          "data-[disabled=true]:text-muted-foreground data-[disabled=true]:opacity-50 data-[disabled=true]:pointer-events-none",
          defaultClassNames.day_button
        ),
        range_start: cn("rounded-l-md", defaultClassNames.range_start),
        range_middle: cn(
          "rounded-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground",
          defaultClassNames.range_middle
        ),
        range_end: cn("rounded-r-md", defaultClassNames.range_end),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          // Navigation chevrons - sol/sağ ok
          if (orientation === "left") {
            return <ChevronLeftIcon className="h-4 w-4 text-foreground" />
          }
          if (orientation === "right") {
            return <ChevronRightIcon className="h-4 w-4 text-foreground" />
          }
          // Dropdown chevrons - aşağı ok
          return <ChevronDownIcon className="h-3.5 w-3.5" />
        },
      }}
      modifiersClassNames={modifiersClassNames}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }

