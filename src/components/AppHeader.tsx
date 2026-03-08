"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { UserHeader } from "@/components/UserHeader";

export function AppHeader() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <header className="h-14 shrink-0 border-b border-surface-border bg-surface-light/50 backdrop-blur-sm px-6 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="/favi.svg" alt="SmartSign" width={32} height={32} unoptimized />
          <span className="font-bold text-accent hidden sm:inline">SmartSign</span>
        </Link>
      </header>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <header className="h-14 shrink-0 border-b border-surface-border bg-surface-light/50 backdrop-blur-sm px-6 flex items-center justify-between">
      <div/>
      <UserHeader name={session.user.name} />
    </header>
  );
}
