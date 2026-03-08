"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  FileStack,
  Trash2,
  Settings,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/templates", label: "Templates", icon: FileStack },
  { href: "#", label: "Trash", icon: Trash2, comingSoon: true },
  { href: "#", label: "Business Settings", icon: Settings, comingSoon: true },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 bg-surface flex flex-col border-r border-surface-border">
      <div className="p-4 border-b border-surface-border">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="/favi.svg" alt="SmartSign" width={36} height={36} unoptimized />
          <span className="font-bold text-accent">SmartSign</span>
        </Link>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const isDisabled = item.href === "#";
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={isDisabled ? "#" : item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-primary/20 text-primary"
                  : "text-accent-muted hover:bg-surface-light hover:text-accent"
              } ${isDisabled ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {item.comingSoon && (
                <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0">
                  Coming soon
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
