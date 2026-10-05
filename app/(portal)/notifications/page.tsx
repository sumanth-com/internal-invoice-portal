import { NotificationCenter } from "@/components/portal/notification-center";

export const metadata = {
  title: "Notifications",
};

export default function NotificationsPage() {
  return (
    <div className="flex h-full min-h-[32rem] flex-col lg:min-h-0">
      <NotificationCenter />
    </div>
  );
}
