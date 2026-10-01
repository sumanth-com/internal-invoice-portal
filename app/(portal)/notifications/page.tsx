import { PageHeader } from "@/components/portal/skeletons";
import { cn } from "@/lib/utils";
import { Bell } from "lucide-react";

export const metadata = {
  title: "Notifications",
};

type PortalNotification = {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
};

const notifications: PortalNotification[] = [];

export default function NotificationsPage() {
  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        <PageHeader title="Notifications" description="Updates for your account." />
      </div>
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
        {notifications.length === 0 ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-16 text-center">
            <span className="flex size-10 items-center justify-center rounded-full border bg-muted text-muted-foreground">
              <Bell className="size-4" />
            </span>
            <p className="mt-4 text-sm font-medium">No notifications</p>
            <p className="mt-1 text-sm text-muted-foreground">You are up to date.</p>
          </div>
        ) : (
          <ul className="min-h-0 flex-1 divide-y overflow-auto">
            {notifications.map((item) => (
              <li key={item.id} className={cn("flex items-start gap-3 px-4 py-3", !item.read && "bg-primary/5")}>
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground">
                  <Bell className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.time}</p>
                </div>
                <span className="sr-only">{item.read ? "Read" : "Unread"}</span>
                {!item.read ? <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-hidden /> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
