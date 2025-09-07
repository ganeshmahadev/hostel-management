"use client"

import * as React from "react"
import { format, addDays, isBefore, startOfDay } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { Calendar } from "@heroui/react"
import { today, getLocalTimeZone, isWeekend, parseDate, CalendarDate } from "@internationalized/date"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date: Date | undefined
  onDateChange: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  minDate?: Date
  maxDate?: Date
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "Pick a date",
  disabled = false,
  minDate = startOfDay(new Date()),
  maxDate = addDays(new Date(), 7)
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  // Convert Date to CalendarDate for HeroUI
  const convertToCalendarDate = (date: Date): CalendarDate => {
    // Validate the date first
    if (!date || isNaN(date.getTime())) {
      const today = new Date()
      return new CalendarDate(today.getFullYear(), today.getMonth() + 1, today.getDate())
    }
    
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    return new CalendarDate(year, month, day)
  }

  // Convert CalendarDate back to Date
  const convertToDate = (calendarDate: CalendarDate): Date => {
    try {
      // Set time to start of day to avoid timezone issues
      const date = new Date(calendarDate.year, calendarDate.month - 1, calendarDate.day, 0, 0, 0, 0)
      // Validate the created date
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date created')
      }
      return date
    } catch (error) {
      console.error('Error converting CalendarDate to Date:', error)
      return new Date() // Return current date as fallback
    }
  }

  const todayDate = today(getLocalTimeZone())
  const maxDate7Days = todayDate.add({ days: 7 })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[240px] justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "EEEE, MMM d") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          aria-label="Date picker"
          value={date ? convertToCalendarDate(date) : undefined}
          onChange={(calendarDate) => {
            if (calendarDate) {
              try {
                const convertedDate = convertToDate(calendarDate)
                onDateChange(convertedDate)
                setOpen(false)
              } catch (error) {
                console.error('Error handling date change:', error)
                // Don't close the popover if there's an error
              }
            }
          }}
          minValue={todayDate}
          maxValue={maxDate7Days}
          classNames={{
            base: "bg-content1",
            content: "w-full",
          }}
        />
        <div className="p-3 border-t text-xs text-muted-foreground bg-content1">
          Select a date from today to {format(addDays(new Date(), 7), "MMM d")}
        </div>
      </PopoverContent>
    </Popover>
  )
}