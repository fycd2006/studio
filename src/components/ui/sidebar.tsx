
"use client"

import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { Slot } from "@radix-ui/react-slot"
import { VariantProps, cva } from "class-variance-authority"
import { PanelLeft } from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipProvider,
} from "@/components/ui/tooltip"

const SIDEBAR_WIDTH = "16rem"
const SIDEBAR_WIDTH_MOBILE = "18rem"
const SIDEBAR_WIDTH_ICON = "3.5rem"

type SidebarContext = {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
  isPinned: boolean
  togglePin: () => void
}

const SidebarContext = React.createContext<SidebarContext | null>(null)

export function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) throw new Error("useSidebar must be used within a SidebarProvider.")
  return context
}

export const SidebarProvider = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & { defaultOpen?: boolean }
>(({ defaultOpen = false, className, style, children, ...props }, ref) => {
  const isMobile = useIsMobile()
  const [openMobile, setOpenMobile] = React.useState(false)
  const [open, setOpen] = React.useState(defaultOpen)
  const [isPinned, setIsPinned] = React.useState(false)

  const toggleSidebar = React.useCallback(() => {
    return isMobile ? setOpenMobile(o => !o) : setOpen(o => !o)
  }, [isMobile])

  const togglePin = React.useCallback(() => {
    setIsPinned(p => !p)
  }, [])

  const state = open ? ("expanded" as const) : ("collapsed" as const)

  const contextValue = React.useMemo(() => ({
    state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar, isPinned, togglePin
  }), [state, open, isMobile, openMobile, toggleSidebar, isPinned, togglePin])

  return (
    <SidebarContext.Provider value={contextValue}>
      <TooltipProvider delayDuration={0}>
        <div
          style={{ "--sidebar-width": SIDEBAR_WIDTH, "--sidebar-width-icon": SIDEBAR_WIDTH_ICON, ...style } as React.CSSProperties}
          className={cn("group/sidebar-wrapper flex min-h-svh w-full", className)}
          ref={ref}
          {...props}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  )
})
SidebarProvider.displayName = "SidebarProvider"

export const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & { collapsible?: "offcanvas" | "icon" | "none" }
>(({ collapsible = "offcanvas", className, children, ...props }, ref) => {
  const { isMobile, state, openMobile, setOpenMobile, isPinned } = useSidebar()

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent side="left" className="w-[--sidebar-width] bg-brand-navy p-0 text-sidebar-foreground border-none flex flex-col h-full overflow-hidden shadow-2xl">
          <SheetTitle className="sr-only">側邊欄選單</SheetTitle>
          <div className="flex-1 w-full overflow-y-auto overflow-x-hidden scrollbar-hide bg-brand-navy">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div
      ref={ref}
      className="group peer hidden md:block text-sidebar-foreground z-40"
      data-state={state}
      data-collapsible={state === "collapsed" ? collapsible : ""}
      data-pinned={isPinned.toString()}
    >
      <div className={cn(
        "duration-300 relative h-svh bg-transparent transition-[width] ease-in-out",
        state === "expanded" && isPinned ? "w-[--sidebar-width]" : "w-0"
      )} />
      <div className={cn(
        "duration-300 fixed inset-y-0 z-50 hidden h-svh transition-[left,right,width,background-color] ease-in-out md:flex flex-col left-0",
        state === "expanded" ? "w-[--sidebar-width]" : "w-[--sidebar-width-icon]",
        state === "expanded" && !isPinned ? "bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-2xl border-r border-stone-200/50 dark:border-white/10" : "",
        state === "expanded" && isPinned ? "bg-white dark:bg-slate-900 border-r border-stone-200 dark:border-white/10" : "",
        state === "collapsed" ? "bg-transparent border-none pointer-events-none" : "",
        className
      )} {...props}>
        <div data-sidebar="sidebar" className={cn("flex h-full w-full flex-col", state === "collapsed" && "pointer-events-auto")}>{children}</div>
      </div>
    </div>
  )
})
Sidebar.displayName = "Sidebar"

export const SidebarTrigger = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar } = useSidebar()
  return (
    <Button ref={ref} data-sidebar="trigger" variant="ghost" size="icon" className={cn("h-8 w-8", className)} onClick={(e) => { onClick?.(e); toggleSidebar(); }} {...props}>
      <PanelLeft className="h-5 w-5" />
      <span className="sr-only">切換側邊欄</span>
    </Button>
  )
})
SidebarTrigger.displayName = "SidebarTrigger"

export const SidebarHeader = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => (
  <div ref={ref} data-sidebar="header" className={cn("flex flex-col gap-2 p-3 shrink-0", className)} {...props} />
))
SidebarHeader.displayName = "SidebarHeader"

export const SidebarContent = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => (
  <div ref={ref} data-sidebar="content" className={cn("flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden scrollbar-hide pb-20", className)} {...props} />
))
SidebarContent.displayName = "SidebarContent"

export const SidebarFooter = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => (
  <div ref={ref} data-sidebar="footer" className={cn("flex flex-col gap-2 p-3 shrink-0", className)} {...props} />
))
SidebarFooter.displayName = "SidebarFooter"

export const SidebarGroup = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => (
  <div ref={ref} data-sidebar="group" className={cn("relative flex w-full min-w-0 flex-col p-2", className)} {...props} />
))
SidebarGroup.displayName = "SidebarGroup"

export const SidebarGroupLabel = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => (
  <div ref={ref} data-sidebar="group-label" className={cn("duration-200 flex h-7 shrink-0 items-center rounded-md px-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] outline-none transition-[margin,opa] ease-linear group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0", className)} {...props} />
))
SidebarGroupLabel.displayName = "SidebarGroupLabel"

export const SidebarGroupContent = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => (
  <div ref={ref} data-sidebar="group-content" className={cn("w-full text-sm", className)} {...props} />
))
SidebarGroupContent.displayName = "SidebarGroupContent"

export const SidebarMenu = React.forwardRef<HTMLUListElement, React.ComponentProps<"ul">>(({ className, ...props }, ref) => (
  <ul ref={ref} data-sidebar="menu" className={cn("flex w-full min-w-0 flex-col gap-0.5", className)} {...props} />
))
SidebarMenu.displayName = "SidebarMenu"

export const SidebarMenuItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    data-sidebar="menu-item"
    className={cn("group/menu-item relative", className)}
    {...props}
  />
))
SidebarMenuItem.displayName = "SidebarMenuItem"

export const SidebarMenuButton = React.forwardRef<HTMLButtonElement, React.ComponentProps<"button"> & { isActive?: boolean }>(({ isActive, className, ...props }, ref) => (
  <button ref={ref} data-sidebar="menu-button" data-active={isActive} className={cn("peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 [&>svg]:size-4 [&>svg]:shrink-0", className)} {...props} />
))
SidebarMenuButton.displayName = "SidebarMenuButton"
