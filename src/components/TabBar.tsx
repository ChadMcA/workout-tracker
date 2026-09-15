"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    href: "/",
    label: "Log",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={active ? "text-accent" : "text-text-dim"}>
        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/strength",
    label: "Strength",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={active ? "text-accent" : "text-text-dim"}>
        <path d="M6 3v18M12 8v13M18 3v18" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/cardio",
    label: "Cardio",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={active ? "text-accent" : "text-text-dim"}>
        <path d="M3 12h4l2-7 4 14 2-7h6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/bodyweight",
    label: "Bodyweight",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={active ? "text-accent" : "text-text-dim"}>
        <circle cx="12" cy="5" r="2" />
        <path d="M12 7v6M8 10l4 3 4-3M9 21l3-5 3 5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/calendar",
    label: "Calendar",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={active ? "text-accent" : "text-text-dim"}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </svg>
    ),
  },
];

export default function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[82px] pt-2 pb-[22px] flex bg-bg/95 backdrop-blur-md border-t border-line z-50">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex-1 flex flex-col items-center gap-1 text-[10.5px]"
          >
            <span className="w-[21px] h-[21px]">{tab.icon(active)}</span>
            <span className={active ? "text-accent" : "text-text-dim"}>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
