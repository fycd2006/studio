"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        root: "relative",
        months: "relative flex flex-col gap-4 sm:flex-row sm:gap-6",
        month: "space-y-3",
        month_caption: "relative flex h-8 items-center justify-center pt-1",
        caption_label: "text-sm font-medium text-foreground",
        nav: "pointer-events-none absolute inset-x-0 top-1 z-10 flex items-center justify-between px-1",
        button_previous: cn(
          buttonVariants({ variant: "ghost" }),
          "pointer-events-auto h-7 w-7 rounded-lg p-0 text-muted-foreground hover:bg-stone-100 hover:text-foreground dark:hover:bg-white/10",
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost" }),
          "pointer-events-auto h-7 w-7 rounded-lg p-0 text-muted-foreground hover:bg-stone-100 hover:text-foreground dark:hover:bg-white/10",
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "w-9 rounded-md text-center text-[0.75rem] font-normal text-muted-foreground",
        weeks: "mt-1 flex flex-col gap-1",
        week: "flex w-full",
        day: "relative h-9 w-9 p-0 text-center text-sm focus-within:relative focus-within:z-20",
        day_button:
          "inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-sm font-normal transition-colors hover:bg-orange-500/15 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 dark:hover:text-orange-200",
        selected:
          "[&>button]:bg-orange-500 [&>button]:font-medium [&>button]:text-white [&>button]:hover:bg-orange-600 [&>button]:hover:text-white",
        range_start:
          "rounded-l-md bg-orange-500/15 [&>button]:rounded-md [&>button]:bg-orange-500 [&>button]:font-medium [&>button]:text-white [&>button]:hover:bg-orange-600",
        range_end:
          "rounded-r-md bg-orange-500/15 [&>button]:rounded-md [&>button]:bg-orange-500 [&>button]:font-medium [&>button]:text-white [&>button]:hover:bg-orange-600",
        range_middle:
          "rounded-none bg-orange-500/15 [&>button]:rounded-none [&>button]:bg-transparent [&>button]:font-normal [&>button]:text-orange-900 [&>button]:hover:bg-orange-500/25 dark:[&>button]:text-orange-100",
        today:
          "[&>button]:font-semibold [&>button]:ring-1 [&>button]:ring-orange-500/50",
        outside:
          "text-muted-foreground/45 [&>button]:text-muted-foreground/45",
        disabled:
          "text-muted-foreground/30 opacity-50 [&>button]:cursor-not-allowed",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: iconClassName, ...chevronProps }) => {
          switch (orientation) {
            case "left":
              return <ChevronLeft className={cn("h-4 w-4", iconClassName)} {...chevronProps} />;
            case "right":
              return <ChevronRight className={cn("h-4 w-4", iconClassName)} {...chevronProps} />;
            case "up":
              return <ChevronUp className={cn("h-4 w-4", iconClassName)} {...chevronProps} />;
            case "down":
              return <ChevronDown className={cn("h-4 w-4", iconClassName)} {...chevronProps} />;
            default:
              return <></>;
          }
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
