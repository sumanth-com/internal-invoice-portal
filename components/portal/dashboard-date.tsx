"use client";

import { Clock } from "lucide-react";
import { useEffect, useState } from "react";

const timeZone = "Asia/Kolkata";

function portalClock(date: Date) {
  const month = new Intl.DateTimeFormat("en-US", { timeZone, month: "short" })
    .format(date)
    .toUpperCase();
  const day = new Intl.DateTimeFormat("en-US", { timeZone, day: "numeric" }).format(date);
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long" }).format(date);
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
    .format(date)
    .toLowerCase();
  return { month, day, weekday, time };
}

export function DashboardDateCard() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!now) {
    return <div className="h-[4.25rem] w-64 shrink-0 rounded-2xl border bg-card shadow-sm" aria-hidden />;
  }

  const clock = portalClock(now);

  return (
    <div className="flex w-64 shrink-0 items-center gap-4 rounded-2xl border bg-card px-3.5 py-2.5 shadow-sm">
      <div className="w-12 overflow-hidden rounded-lg border bg-card text-center shadow-sm dark:bg-[hsl(224,48%,8%)]">
        <div className="bg-primary py-1 text-[10px] font-semibold tracking-[0.14em] text-primary-foreground">
          {clock.month}
        </div>
        <div className="py-1.5 text-xl font-semibold leading-none tabular-nums">{clock.day}</div>
      </div>
      <div className="min-w-0">
        <p className="text-lg font-semibold leading-tight">{clock.weekday}</p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="size-3.5" />
          {clock.time}
        </p>
      </div>
    </div>
  );
}
