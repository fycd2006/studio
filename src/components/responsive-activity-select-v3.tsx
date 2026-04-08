"use client"

import * as React from "react"
import { Layout, Check, ChevronDown } from "lucide-react"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

export function ResponsiveActivitySelectV3({ 
  value, 
  onValueChange, 
  options,
  disabled = false,
}: { 
  value: string, 
  onValueChange: (val: string) => void,
  options: string[],
  disabled?: boolean,
}) {
  const [open, setOpen] = React.useState(false)
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  // 點擊外面時自動關閉 (處理桌面版的 absolute 下拉)
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open && isDesktop) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open, isDesktop])

  const OptionList = () => (
    <div className="flex flex-col gap-1 w-full" role="listbox" aria-label="活動類型">
      {options.map((type) => {
        const isSelected = value === type
        return (
          <button
            key={type}
            role="option"
            aria-selected={isSelected}
            onClick={() => {
              if (disabled) return
              onValueChange(type)
              setOpen(false)
            }}
            onKeyDown={(e) => {
              if (disabled) return
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onValueChange(type)
                setOpen(false)
              }
            }}
            className={`
              relative flex w-full items-center justify-between rounded-xl px-4 py-4 text-left font-bold transition-all duration-200 outline-none
              focus-visible:ring-2 focus-visible:ring-orange-500
              ${isSelected 
                ? "bg-orange-100/50 text-orange-600 dark:bg-amber-900/40 dark:text-amber-400" 
                : "hover:bg-stone-50 dark:hover:bg-slate-700 active:bg-stone-100"}
            `}
          >
            <span className="text-base">{type}</span>
            {isSelected && <Check className="h-5 w-5 text-orange-500 dark:text-amber-400" strokeWidth={3} />}
          </button>
        )
      })}
    </div>
  )

  if (isDesktop) {
    // 桌面版：棄用 Popover 的 Floating Portal 算出位置的機制，
    // 改用「最傳統但最穩固」的 DOM relative > absolute 結構。
    // 這將 100% 絕對綁定在父元件內，不論是網頁縮放 transform: scale() 還是任意容器捲動，它永遠死死黏在按鈕下方！
    return (
      <div className="relative w-full" ref={containerRef}>
        <Button 
          variant="ghost" 
          role="combobox"
          onClick={() => !disabled && setOpen(!open)}
          aria-expanded={open}
          disabled={disabled}
          className="w-full h-12 justify-between rounded-xl px-4 font-bold text-base bg-transparent dark:bg-transparent shadow-none hover:bg-stone-50 dark:hover:bg-slate-700 border-none transition-colors"
        >
          {value || <span className="text-muted-foreground font-normal">-- 請選擇活動類型 --</span>}
          <ChevronDown className={`ml-2 h-5 w-5 shrink-0 transition-transform duration-200 ${open ? "rotate-180 opacity-100" : "opacity-50"}`} />
        </Button>
        
        {open && (
          <div 
            className="absolute top-full left-0 mt-2 z-[100] w-full p-1 rounded-2xl shadow-xl border border-stone-100 dark:border-slate-700 bg-white dark:bg-slate-800 animate-in fade-in-0 zoom-in-95"
          >
            <div className="max-h-[300px] overflow-y-auto w-full custom-scrollbar pr-1">
               <OptionList />
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <Button 
        variant="ghost" 
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
        className="w-full h-14 justify-between rounded-xl px-4 font-bold text-base bg-stone-50/50 dark:bg-slate-800/50 shadow-sm active:scale-[0.98] transition-transform"
      >
        {value || <span className="text-muted-foreground font-normal">-- 請選擇活動類型 --</span>}
        <ChevronDown className="ml-2 h-5 w-5 shrink-0 opacity-50" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-8 px-4 flex flex-col gap-4 bg-white dark:bg-slate-900 border-t-0 max-h-[85vh]">
          <SheetHeader className="text-left pb-2 border-b border-stone-100 dark:border-slate-800">
            <SheetTitle className="text-lg font-bold flex items-center gap-2 text-stone-700 dark:text-stone-300">
              <Layout className="w-5 h-5 text-orange-500" /> 選擇活動類型
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 w-full mt-2 max-h-[60vh] overflow-y-auto pr-1">
            <OptionList />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
