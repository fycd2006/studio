"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Menu,
  Home,
  FolderOpen,
  ShieldCheck,
  Settings,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlans } from "@/hooks/use-plans";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: Home },
  { label: "Plans", href: "/plans", icon: FolderOpen },
  { label: "Admin", href: "/admin", icon: ShieldCheck },
  { label: "Settings", href: "/settings", icon: Settings },
] as const;

interface NavbarProps {
  groups?: Array<{ id: string; slug: string; nameZh: string; nameEn: string }>;
}

export function TransparentNavbar({ groups }: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeMegaMenu, setActiveMegaMenu] = useState<"plans" | "admin" | null>(null);

  const pathname = usePathname();
  const { camps, activeCampId, groups: allGroups } = usePlans();

  const activeCamp = camps?.find((c) => c.id === activeCampId);
  const displayGroups = groups || allGroups || [];

  const safeGroups = displayGroups.filter(
    (group): group is { id: string; slug: string; nameZh: string; nameEn: string } =>
      !!group &&
      typeof group.id === "string" &&
      group.id.length > 0 &&
      typeof group.slug === "string" &&
      group.slug.length > 0 &&
      typeof group.nameZh === "string" &&
      typeof group.nameEn === "string"
  );

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const isMenuOpen = activeMegaMenu !== null;
  const navTextClass = "text-white mix-blend-difference hover:opacity-80";
  const navIconClass = "text-white mix-blend-difference hover:opacity-80";

  const planDropdownGroups = safeGroups.slice(0, 10);
  const adminDropdownItems = [
    { label: "計時控制", href: "/admin/timer" },
    { label: "輪替表", href: "/admin/rotation" },
    { label: "道具清單", href: "/admin/props" },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 w-full z-50 bg-transparent border-none">
        <div
          className="relative bg-transparent border-none"
          onMouseLeave={() => setActiveMegaMenu(null)}
        >
          <div className="hidden md:flex items-center justify-between px-6 py-4 h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center gap-3 min-w-0">
                <div className="relative w-10 h-10 rounded-full overflow-hidden ring-1 ring-white/40 shadow-[0_4px_14px_rgba(0,0,0,0.35)] flex-shrink-0">
                  <Image
                    src="/NTUTCDlogo.png"
                    alt="NTUTCDlogo"
                    fill
                    sizes="40px"
                    className="object-cover"
                    priority
                  />
                </div>
                <div className="flex flex-col leading-tight text-white min-w-0">
                  <span className="text-[1.02rem] font-black tracking-[0.02em] truncate">
                    NTUT Chong De Camp
                  </span>
                  <span className="text-[0.68rem] font-semibold tracking-[0.08em] text-white/95 ">
                    北科崇德青年社
                  </span>
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-8 justify-center">
              <Link
                href="/"
                className={cn(
                  "font-bold tracking-wider uppercase text-sm transition-colors duration-300 ",
                  isActive("/")
                    ? "text-white underline underline-offset-8"
                    : "text-white hover:text-orange-200"
                )}
              >
                Dashboard
              </Link>

              <div className="relative group" onMouseEnter={() => setActiveMegaMenu("plans")}>
                <Link
                  href="/plans"
                  className={cn(
                    "font-bold tracking-wider uppercase text-sm transition-colors duration-300 inline-flex items-center gap-1 ",
                    isActive("/plans")
                      ? "text-white underline underline-offset-8"
                      : "text-white hover:text-orange-200"
                  )}
                >
                  Plans
                  <ChevronDown className={cn("w-3.5 h-3.5 opacity-90", navIconClass)} />
                </Link>
              </div>

              <div className="relative group" onMouseEnter={() => setActiveMegaMenu("admin")}>
                <Link
                  href="/admin"
                  className={cn(
                    "font-bold tracking-wider uppercase text-sm transition-colors duration-300 inline-flex items-center gap-1 ",
                    isActive("/admin")
                      ? "text-white underline underline-offset-8"
                      : "text-white hover:text-orange-200"
                  )}
                >
                  Admin
                  <ChevronDown className={cn("w-3.5 h-3.5 opacity-90", navIconClass)} />
                </Link>
              </div>

              <Link
                href="/settings"
                className={cn(
                  "font-bold tracking-wider uppercase text-sm transition-colors duration-300 ",
                  isActive("/settings")
                    ? "text-white underline underline-offset-8"
                    : "text-white hover:text-orange-200"
                )}
              >
                Settings
              </Link>
            </div>

            <div className="flex items-center gap-4">
              {activeCamp && (
                <div
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold text-white bg-white/15 backdrop-blur-sm "
                  )}
                >
                  {activeCamp.name}
                </div>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-9 w-9 rounded-lg bg-transparent transition-colors duration-300 hover:bg-white/15",
                      navIconClass
                    )}
                    aria-label="Desktop navigation menu"
                  >
                    <Menu className={cn("w-5 h-5", navIconClass)} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="rounded-xl border border-white/30 bg-black/70 backdrop-blur-md text-white shadow-2xl"
                >
                  {NAV_ITEMS.map((item) => (
                    <DropdownMenuItem
                      key={item.href}
                      asChild
                      className="rounded-md focus:bg-white/20 focus:text-white data-[highlighted]:bg-white/20 data-[highlighted]:text-white"
                    >
                      <Link href={item.href} className="w-full font-semibold cursor-pointer text-white hover:text-white">
                        <item.icon className="w-4 h-4 mr-2 text-white" />
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div
            className={cn(
              "hidden md:block absolute top-full left-0 w-full origin-top transition-all duration-300 ease-out",
              activeMegaMenu ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none"
            )}
            onMouseEnter={() => setActiveMegaMenu((prev) => prev ?? "plans")}
          >
            <div
              className={cn(
                "w-full border-t-0 rounded-t-none border-b border-white/20 bg-transparent"
              )}
            >
              <div className="max-w-6xl mx-auto px-6 py-6">
                {activeMegaMenu === "plans" && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {(planDropdownGroups.length > 0
                      ? planDropdownGroups
                      : [
                          { id: "activity", slug: "activity", nameZh: "活動組", nameEn: "Activity" },
                          { id: "teaching", slug: "teaching", nameZh: "教學組", nameEn: "Teaching" },
                        ]
                    ).map((group) => (
                      <Link
                        key={group.id}
                        href={`/plans?group=${group.slug}`}
                        className="block rounded-lg px-4 py-3 border border-white/20 bg-transparent text-white hover:border-white/35"
                      >
                        <p className="font-semibold ">{group.nameZh}</p>
                        <p className="text-[11px] uppercase tracking-wide text-white/80">{group.nameEn}</p>
                      </Link>
                    ))}
                  </div>
                )}

                {activeMegaMenu === "admin" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {adminDropdownItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block rounded-lg px-4 py-3 border border-white/20 bg-transparent text-white font-semibold hover:border-white/35"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="md:hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 min-h-16">
              <Link href="/" className="flex items-center gap-2.5 flex-1 pr-2 min-w-0">
                <div className="relative w-9 h-9 rounded-full overflow-hidden ring-1 ring-white/40 shadow-[0_4px_14px_rgba(0,0,0,0.35)] flex-shrink-0">
                  <Image
                    src="/NTUTCDlogo.png"
                    alt="NTUTCDlogo"
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col leading-tight text-white">
                  <span className="text-[0.82rem] font-extrabold tracking-[0.01em] ">
                    NTUT Chong De Camp
                  </span>
                  <span className="text-[0.61rem] font-semibold tracking-[0.04em] text-white/95 ">
                    北科崇德青年社
                  </span>
                </div>
              </Link>

              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className={cn(
                  "p-2 rounded-lg transition-colors duration-300 bg-transparent text-white hover:bg-white/15"
                )}
                aria-label="Open menu"
              >
                <Menu className={cn("w-5 h-5", navIconClass)} />
              </button>
            </div>

            <div className="px-4 pb-3">
              <div className="grid grid-cols-4 items-center text-center gap-2 w-full max-w-md mx-auto">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "text-[0.94rem] font-black uppercase tracking-wide whitespace-nowrap transition-colors duration-300 ",
                      isActive(item.href)
                        ? "text-white underline underline-offset-8"
                        : "text-white hover:text-orange-200"
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="right" className="w-full sm:w-96 flex flex-col bg-black/80 backdrop-blur-md border-white/20">
          <SheetHeader>
            <SheetTitle className="text-white ">Navigation</SheetTitle>
          </SheetHeader>
          <div className="flex-1 flex flex-col gap-4 mt-6 overflow-y-auto">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-all duration-300",
                  isActive(item.href)
                    ? "bg-white/20 text-white"
                    : "text-white hover:bg-white/15"
                )}
              >
                <item.icon className="w-5 h-5 text-white " />
                {item.label}
              </Link>
            ))}
          </div>

          {activeCamp && (
            <div className="border-t border-white/20 pt-4 mt-4">
              <p className="text-xs text-white/80 mb-2">Current Camp</p>
              <p className="font-semibold text-white ">{activeCamp.name}</p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
