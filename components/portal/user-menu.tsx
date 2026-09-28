"use client";

import { createClient } from "@/lib/supabase/client";
import { displayName, roleLabel, userInitials, type PortalUser } from "@/lib/portal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function UserMenu({ user }: { user: PortalUser }) {
  const router = useRouter();
  const name = displayName(user);

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto gap-3 px-2 py-1.5"
          aria-label="Account menu"
        >
          <span className="hidden text-right sm:block">
            <span className="block max-w-48 truncate text-sm font-medium">
              {name}
            </span>
            <span className="block text-xs font-normal text-muted-foreground">
              {roleLabel(user.role)}
            </span>
          </span>
          <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
            {userInitials(user)}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate text-sm font-medium">{name}</span>
          <span className="mt-1 block truncate text-xs text-muted-foreground">
            {user.email}
          </span>
          <Badge variant="secondary" className="mt-2">
            {roleLabel(user.role)}
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void logout()}>
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
