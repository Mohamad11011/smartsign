"use client";

import { signOut } from "next-auth/react";
import { User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UserHeaderProps {
  name?: string | null;
}

export function UserHeader({ name }: UserHeaderProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-surface-light border border-surface-border">
        <User className="h-4 w-4 text-accent-muted" />
        <span className="text-sm text-accent truncate max-w-[120px]">
          {name ?? "Admin"}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="gap-1.5 text-accent-muted hover:text-primary"
      >
        <LogOut className="h-4 w-4" />
        Logout
      </Button>
    </div>
  );
}
