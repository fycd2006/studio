"use client"

import * as React from "react"
import { Layout, Check, ChevronDown } from "lucide-react"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function ResponsiveActivitySelectV2({ 
  value, 
  onValueChange, 
  options 
}: { 
  value: string, 
  onValueChange: (val: string) => void,
  options: string[]
}) {
  const [open, setOpen] = React.useState(false)
  const isDesktop = useMediaQuery("(min-width: 768px)")

  const MobileOptionList = () => (
    <div className="flex flex-col gap-1 w-full max-h-[60vh] overflow-y-auto pr-1" role="listbox" aria-label="活動類型">
      {options.map((type) => {
        const isSelected = value === type
        return (
          <button
            key={type}
            role="option"
            aria-selected={isSelected}
            onClick={() => {
              onValueChange(type)
              setOpen(false)
            }}
            className={`
              relative flex w-full items-center justify-between rounded-xl px-4 py-4 text-left font-bold transition-all duration-200 outline-none
              focus-visible:ring-2 focus-visible:ring-purple-500
              ${isSelected 
                ? "bg-purple-100/50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" 
                : "hover:bg-stone-50 dark:hover:bg-slate-700 active:bg-stone-100"}
            `}
          >
            <span className="text-base">{type}</span>
            {isSelected && <Check className="h-5 w-5 text-purple-600 dark:text-purple-400" strokeWidth={3} />}
          </button>
        )
      })}
    </div>
  )

  if (isDesktop) {
    return (
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full h-12 justify-between rounded-xl px-4 font-bold text-base bg-transparent dark:bg-transparent shadow-none hover:bg-stone-50 dark:hover:bg-slate-700 border-none transition-colors focus:ring-0">
          <SelectValue placeholder="-- 請選擇活動類型 --" />
        </SelectTrigger>
        <SelectContent 
          position="popper" 
          sideOffset={8}
          className="w-[var(--radix-select-trigger-width)] max-h-[300px] overflow-y-auto rounded-2xl shadow-xl border border-stone-100 dark:border-slate-800 bg-white dark:bg-slate-800 p-1 custom-scrollbar"
        >
          {options.map((type) => (
             <SelectItem 
               key={type} 
               value={type}
               className="rounded-lg cursor-pointer px-4 py-3 font-bold hover:bg-[#FBF9F6] dark:hover:bg-slate-700 focus:bg-purple-100/50 focus:text-purple-700 data-[state=checked]:bg-purple-100 data-[state=checked]:text-purple-800 focus:text-purple-800 dark:data-[state=checked]:text-purple-300 dark:focus:text-purple-300 transition-colors"
             >
               {type}
             </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <>
      <Button 
        variant="ghost" 
        onClick={() => setOpen(true)}
        className="w-full h-14 justify-between rounded-xl px-4 font-bold text-base bg-stone-50/50 dark:bg-slate-800/50 shadow-sm active:scale-[0.98] transition-transform"
      >
        {value || <span className="text-muted-foreground font-normal">-- 請選擇活動類型 --</span>}
        <ChevronDown className="ml-2 h-5 w-5 shrink-0 opacity-50" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-8 px-4 flex flex-col gap-4 bg-white dark:bg-slate-900 border-t-0 max-h-[85vh]">
          <SheetHeader className="text-left pb-2 border-b border-stone-100 dark:border-slate-800">
            <SheetTitle className="text-lg font-bold flex items-center gap-2 text-stone-700 dark:text-stone-300">
              <Layout className="w-5 h-5 text-purple-500" /> 選擇活動類型
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 w-full mt-2">
            <MobileOptionList />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}