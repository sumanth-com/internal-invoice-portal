"use client";

import {
  invitePortalUser,
  resendPortalInvite,
  setPortalUserActive,
  updatePortalUser,
} from "@/app/(portal)/admin/actions";
import { Modal, ModalBody, ModalFooter, useModal } from "@/components/portal/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatInvoiceTimestamp } from "@/lib/invoice";
import type { AppRole } from "@/lib/portal";
import {
  emptyPortalUserFormState,
  emptyPortalUserMutationState,
  userMatchesFilters,
  type PortalUserFormState,
  type PortalUserList,
  type PortalUserRow,
} from "@/lib/portal-users";
import { cn } from "@/lib/utils";
import { ChevronDown, Loader2, MoreHorizontal, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useCallback, useEffect, useRef, useState, type ReactNode } from "react";

const selectClass =
  "h-9 w-full appearance-none rounded-md border border-input bg-transparent py-0 pl-3 pr-9 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

function accessLabel(role: AppRole) {
  return role === "admin" ? "Administrator" : "Team Member";
}

function StatCard({
  label,
  value,
  onSelect,
}: {
  label: string;
  value: number;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="rounded-xl border bg-card p-4 text-left shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
    </button>
  );
}

function FilterSelect({
  name,
  label,
  value,
  onChange,
  children,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="relative w-full sm:w-44">
      <select
        name={name}
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={selectClass}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function Notice({ tone, children }: { tone: "success" | "error"; children: string }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        tone === "error"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-emerald-600/20 bg-emerald-600/10 text-emerald-800 dark:text-emerald-200",
      )}
    >
      {children}
    </p>
  );
}

function RoleBadge({ role }: { role: PortalUserRow["role"] }) {
  return <Badge variant={role === "admin" ? "default" : "secondary"}>{accessLabel(role)}</Badge>;
}

function StatusBadge({ status }: { status: PortalUserRow["status"] }) {
  if (status === "pending") {
    return (
      <Badge variant="outline" className="border-amber-700/30 bg-amber-500/10 text-amber-800 dark:text-amber-200">
        Pending
      </Badge>
    );
  }
  if (status === "inactive") return <Badge variant="outline">Inactive</Badge>;
  return <Badge variant="secondary">Active</Badge>;
}

function displayName(user: PortalUserRow) {
  return user.fullName?.trim() || "—";
}

function applySaved(data: PortalUserList, saved: PortalUserRow): PortalUserList {
  const previous = data.users.find((user) => user.id === saved.id);
  let { total, active, inactive } = data;
  if (!previous) {
    total += 1;
    if (saved.isActive) active += 1;
    else inactive += 1;
  } else if (previous.isActive !== saved.isActive) {
    active += saved.isActive ? 1 : -1;
    inactive += saved.isActive ? -1 : 1;
  }

  const others = data.users.filter((user) => user.id !== saved.id);
  const users = userMatchesFilters(saved, data)
    ? [...others, saved].sort((left, right) =>
        displayName(left).localeCompare(displayName(right), "en"),
      )
    : others;

  return { ...data, users, total, active, inactive };
}

const inviteRoles = [
  {
    value: "internal_user" as const,
    title: "Team Member",
    detail:
      "They can work with invoices, payments, beneficiaries, and reports. They cannot manage users, view the audit log, or change portal settings.",
  },
  {
    value: "admin" as const,
    title: "Administrator",
    detail:
      "Admin access. They can do everything a Team Member can, plus manage users, view the audit log, change portal settings, cancel invoices, and delete draft invoices.",
  },
];

function AddUserForm({ onSaved }: { onSaved: (user: PortalUserRow) => void }) {
  const modal = useModal();
  const [role, setRole] = useState<AppRole>("internal_user");
  const [state, formAction, pending] = useActionState(invitePortalUser, emptyPortalUserFormState);
  const handled = useRef<PortalUserFormState | null>(null);

  useEffect(() => {
    modal.setBusy(pending);
  }, [pending, modal]);

  useEffect(() => {
    if (!state.saved || handled.current === state) return;
    handled.current = state;
    modal.setDirty(false);
    onSaved(state.saved);
  }, [state, onSaved, modal]);

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
      onChange={() => modal.setDirty(true)}
    >
      <ModalBody>
        <fieldset disabled={pending} className="grid gap-4 p-4 sm:p-6">
          {state.error ? <Notice tone="error">{state.error}</Notice> : null}
          <p className="text-sm text-muted-foreground">
            An invitation email is sent through the existing sign-in flow. The role below is the access they receive.
          </p>
          <div className="grid gap-2">
            <Label htmlFor="full_name">
              Name<span className="text-destructive"> *</span>
            </Label>
            <Input id="full_name" name="full_name" maxLength={120} required autoComplete="name" data-autofocus />
            {state.fieldErrors.full_name ? (
              <p className="text-sm text-destructive">{state.fieldErrors.full_name}</p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">
              Email<span className="text-destructive"> *</span>
            </Label>
            <Input id="email" name="email" type="email" maxLength={160} required autoComplete="email" />
            {state.fieldErrors.email ? (
              <p className="text-sm text-destructive">{state.fieldErrors.email}</p>
            ) : null}
          </div>
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">Role / Portal access</legend>
            <div className="grid gap-2">
              {inviteRoles.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "grid cursor-pointer grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg border p-3",
                    role === option.value && "border-primary bg-primary/5",
                  )}
                >
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    checked={role === option.value}
                    onChange={() => setRole(option.value)}
                    className="mt-1 size-4"
                  />
                  <span className="text-sm font-medium">{option.title}</span>
                  <span className="col-start-2 text-sm text-muted-foreground">{option.detail}</span>
                </label>
              ))}
            </div>
            {state.fieldErrors.role ? (
              <p className="text-sm text-destructive">{state.fieldErrors.role}</p>
            ) : null}
          </fieldset>
        </fieldset>
      </ModalBody>
      <ModalFooter>
        <Button type="button" variant="outline" disabled={pending} onClick={modal.requestClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          {pending ? "Sending invite…" : "Send invite"}
        </Button>
      </ModalFooter>
    </form>
  );
}

function EditUserForm({
  user,
  isSelf,
  onSaved,
}: {
  user: PortalUserRow;
  isSelf: boolean;
  onSaved: (user: PortalUserRow) => void;
}) {
  const modal = useModal();
  const [name, setName] = useState(user.fullName ?? "");
  const [role, setRole] = useState(user.role);
  const [active, setActive] = useState(user.isActive);
  const [state, formAction, pending] = useActionState(updatePortalUser, emptyPortalUserFormState);
  const handled = useRef<PortalUserFormState | null>(null);

  useEffect(() => {
    modal.setBusy(pending);
  }, [pending, modal]);

  useEffect(() => {
    if (!state.saved || handled.current === state) return;
    handled.current = state;
    modal.setDirty(false);
    onSaved(state.saved);
  }, [state, onSaved, modal]);

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
      onChange={() => modal.setDirty(true)}
    >
      <input type="hidden" name="id" value={user.id} />
      <input type="hidden" name="role" value={isSelf ? "admin" : role} />
      <input type="hidden" name="is_active" value={isSelf || active ? "true" : "false"} />
      <ModalBody>
        <fieldset disabled={pending} className="grid gap-4 p-4 sm:p-6">
          {state.error ? <Notice tone="error">{state.error}</Notice> : null}
          <div className="grid gap-2">
            <Label htmlFor="edit_full_name">
              Name<span className="text-destructive"> *</span>
            </Label>
            <Input
              id="edit_full_name"
              name="full_name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
              required
              data-autofocus
            />
            {state.fieldErrors.full_name ? (
              <p className="text-sm text-destructive">{state.fieldErrors.full_name}</p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit_email">Email</Label>
            <Input id="edit_email" value={user.email} disabled />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit_role">Role</Label>
            <select
              id="edit_role"
              value={isSelf ? "admin" : role}
              onChange={(event) => setRole(event.target.value === "admin" ? "admin" : "internal_user")}
              disabled={isSelf}
              className={cn(selectClass, "w-full")}
            >
              <option value="admin">Administrator</option>
              <option value="internal_user">Team Member</option>
            </select>
            {isSelf ? (
              <p className="text-xs text-muted-foreground">You cannot change your own role.</p>
            ) : null}
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={isSelf || user.status === "pending" || active}
              onChange={(event) => setActive(event.target.checked)}
              disabled={isSelf || user.status === "pending"}
              className="mt-0.5 size-4 rounded border border-input"
            />
            <span>
              Active
              {isSelf ? (
                <span className="mt-1 block text-muted-foreground">
                  You cannot deactivate your own account.
                </span>
              ) : user.status === "pending" ? (
                <span className="mt-1 block text-muted-foreground">
                  This invitation is pending until they accept it and set a password.
                </span>
              ) : (
                <span className="mt-1 block text-muted-foreground">
                  Inactive users cannot use the portal.
                </span>
              )}
            </span>
          </label>
        </fieldset>
      </ModalBody>
      <ModalFooter>
        <Button type="button" variant="outline" disabled={pending} onClick={modal.requestClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          {pending ? "Saving…" : "Save user"}
        </Button>
      </ModalFooter>
    </form>
  );
}

function DeactivateUserForm({
  user,
  onSaved,
}: {
  user: PortalUserRow;
  onSaved: (user: PortalUserRow) => void;
}) {
  const modal = useModal();
  const [state, formAction, pending] = useActionState(
    setPortalUserActive,
    emptyPortalUserMutationState,
  );
  const handled = useRef(state);

  useEffect(() => {
    modal.setBusy(pending);
  }, [pending, modal]);

  useEffect(() => {
    if (!state.saved || handled.current === state) return;
    handled.current = state;
    onSaved(state.saved);
  }, [state, onSaved]);

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
    >
      <input type="hidden" name="id" value={user.id} />
      <input type="hidden" name="is_active" value="false" />
      <ModalBody>
        <div className="grid gap-4 p-4 sm:p-6">
          {state.error ? <Notice tone="error">{state.error}</Notice> : null}
          <p className="text-sm text-muted-foreground">
            Their invoices, payments, and beneficiaries stay as they are. This only turns off portal access.
          </p>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button type="button" variant="outline" disabled={pending} onClick={modal.requestClose}>
          Cancel
        </Button>
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending ? "Deactivating…" : "Deactivate"}
        </Button>
      </ModalFooter>
    </form>
  );
}

function UserActions({
  user,
  isSelf,
  onEdit,
  onDeactivate,
  onActivated,
  onResent,
}: {
  user: PortalUserRow;
  isSelf: boolean;
  onEdit: () => void;
  onDeactivate: () => void;
  onActivated: (user: PortalUserRow) => void;
  onResent: (user: PortalUserRow) => void;
}) {
  const [state, formAction, pending] = useActionState(
    setPortalUserActive,
    emptyPortalUserMutationState,
  );
  const [resendState, resendAction, resendPending] = useActionState(
    resendPortalInvite,
    emptyPortalUserMutationState,
  );
  const handled = useRef(state);
  const resent = useRef(resendState);

  useEffect(() => {
    if (!state.saved || handled.current === state) return;
    handled.current = state;
    onActivated(state.saved);
  }, [state, onActivated]);

  useEffect(() => {
    if (!resendState.saved || resent.current === resendState) return;
    resent.current = resendState;
    onResent(resendState.saved);
  }, [resendState, onResent]);

  return (
    <div className="flex flex-col items-end gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" aria-label={`Actions for ${displayName(user)}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onEdit}>Edit</DropdownMenuItem>
          {user.status === "pending" && !isSelf ? (
            <DropdownMenuItem
              disabled={resendPending}
              onSelect={(event) => {
                event.preventDefault();
                const formData = new FormData();
                formData.set("id", user.id);
                startTransition(() => resendAction(formData));
              }}
            >
              {resendPending ? "Sending…" : "Resend invitation"}
            </DropdownMenuItem>
          ) : null}
          {user.status === "active" ? (
            <DropdownMenuItem disabled={isSelf} onSelect={onDeactivate}>
              Deactivate
            </DropdownMenuItem>
          ) : null}
          {user.status === "inactive" ? (
            <DropdownMenuItem
              disabled={pending}
              onSelect={(event) => {
                event.preventDefault();
                const formData = new FormData();
                formData.set("id", user.id);
                formData.set("is_active", "true");
                startTransition(() => formAction(formData));
              }}
            >
              {pending ? "Activating…" : "Activate"}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {state.error ? <p className="max-w-48 text-right text-xs text-destructive">{state.error}</p> : null}
      {resendState.error ? (
        <p className="max-w-48 text-right text-xs text-destructive">{resendState.error}</p>
      ) : null}
    </div>
  );
}

export function AdminUsers({
  data: serverData,
  currentUserId,
}: {
  data: PortalUserList;
  currentUserId: string;
}) {
  const [source, setSource] = useState(serverData);
  const [data, setData] = useState(serverData);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<PortalUserRow | null>(null);
  const [deactivating, setDeactivating] = useState<PortalUserRow | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState(serverData.search);
  const [role, setRole] = useState(serverData.role);
  const [status, setStatus] = useState(serverData.status);
  const router = useRouter();

  if (source !== serverData) {
    setSource(serverData);
    setData(serverData);
    setSearch(serverData.search);
    setRole(serverData.role);
    setStatus(serverData.status);
  }

  function onSaved(user: PortalUserRow, message: string) {
    setData((current) => applySaved(current, user));
    setAdding(false);
    setEditing(null);
    setDeactivating(null);
    setNotice(message);
  }

  const filtering = data.search.length > 0 || data.role !== "all" || data.status !== "all";

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const pushFilters = useCallback(
    (next?: { search?: string; role?: string; status?: string }) => {
      const params = new URLSearchParams();
      const query = (next?.search ?? search).trim();
      const nextRole = next?.role ?? role;
      const nextStatus = next?.status ?? status;
      if (query) params.set("q", query);
      if (nextRole !== "all") params.set("role", nextRole);
      if (nextStatus !== "all") params.set("status", nextStatus);
      const href = params.size ? `/admin?${params}` : "/admin";
      startTransition(() => router.push(href));
    },
    [search, role, status, router],
  );

  useEffect(() => {
    const query = search.trim();
    if (query === data.search) return;
    const timer = window.setTimeout(() => pushFilters({ search: query }), 300);
    return () => window.clearTimeout(timer);
  }, [search, data.search, pushFilters]);

  return (
    <div className="flex flex-col gap-6">
      {notice ? (
        <p
          role="status"
          className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-emerald-600/20 bg-card px-4 py-3 text-sm text-emerald-800 shadow-lg dark:text-emerald-200"
        >
          {notice}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total users"
          value={data.total}
          onSelect={() => {
            setStatus("all");
            pushFilters({ status: "all" });
          }}
        />
        <StatCard
          label="Active"
          value={data.active}
          onSelect={() => {
            setStatus("active");
            pushFilters({ status: "active" });
          }}
        />
        <StatCard
          label="Inactive"
          value={data.inactive}
          onSelect={() => {
            setStatus("inactive");
            pushFilters({ status: "inactive" });
          }}
        />
      </div>

      <section className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-start justify-between gap-4 border-b p-4">
          <div>
            <h2 className="text-base font-semibold">{filtering ? "Matching users" : "All users"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {filtering ? "Users matching the current filters." : "Admins and internal users."}
            </p>
          </div>
          <Button type="button" onClick={() => setAdding(true)} className="shrink-0">
            <Plus />
            Add user
          </Button>
        </div>
        <div className="flex flex-col gap-2 border-b p-4 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name or email"
              aria-label="Search name or email"
              className="pl-8"
            />
          </div>
          <FilterSelect
            name="role"
            label="Role"
            value={role}
            onChange={(value) => {
              setRole(value === "admin" || value === "internal_user" ? value : "all");
              pushFilters({ role: value });
            }}
          >
            <option value="all">All roles</option>
            <option value="admin">Administrator</option>
            <option value="internal_user">Team Member</option>
          </FilterSelect>
          <FilterSelect
            name="status"
            label="Status"
            value={status}
            onChange={(value) => {
              const next =
                value === "pending" || value === "active" || value === "inactive" ? value : "all";
              setStatus(next);
              pushFilters({ status: next });
            }}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </FilterSelect>
        </div>

        {data.users.length === 0 ? (
          <div className="px-4 py-10">
            <p className="text-sm text-muted-foreground">
              {filtering ? "No users match these filters." : "No portal users yet."}
            </p>
            {filtering ? null : (
              <Button type="button" className="mt-4" onClick={() => setAdding(true)}>
                <Plus />
                Add user
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="max-h-[32rem] overflow-auto">
              <table className="w-full min-w-[52rem] border-separate border-spacing-0 text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-muted text-left text-foreground">
                    {["Name", "Email", "Role", "Status", "Created", "Updated"].map((label) => (
                      <th
                        key={label}
                        className="border-b bg-muted px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                      >
                        {label}
                      </th>
                    ))}
                    <th className="border-b bg-muted px-4 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((user) => (
                    <tr key={user.id} className="bg-card">
                      <td className="border-b px-4 py-3 font-medium">
                        {displayName(user)}
                        {user.id === currentUserId ? (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">You</span>
                        ) : null}
                      </td>
                      <td className="border-b px-4 py-3">{user.email}</td>
                      <td className="border-b px-4 py-3">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="border-b px-4 py-3">
                        <StatusBadge status={user.status} />
                      </td>
                      <td className="border-b px-4 py-3 text-muted-foreground">
                        {formatInvoiceTimestamp(user.createdAt)}
                      </td>
                      <td className="border-b px-4 py-3 text-muted-foreground">
                        {user.updatedAt ? formatInvoiceTimestamp(user.updatedAt) : "—"}
                      </td>
                      <td className="border-b px-4 py-3 text-right">
                        <UserActions
                          user={user}
                          isSelf={user.id === currentUserId}
                          onEdit={() => setEditing(user)}
                          onDeactivate={() => setDeactivating(user)}
                          onActivated={(saved) => onSaved(saved, "User activated.")}
                          onResent={(saved) => onSaved(saved, "Invitation sent again.")}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-4 py-3 text-sm text-muted-foreground">
              {data.users.length === 1 ? "1 user." : `${data.users.length} users.`}
            </p>
          </>
        )}
      </section>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Add user"
        description="Invite someone to the internal portal."
        discardMessage="This invitation has not been sent."
      >
        <AddUserForm
          onSaved={(user) =>
            onSaved(
              user,
              user.role === "admin"
                ? "Invitation sent. The account is an Administrator."
                : "Invitation sent. The account is a Team Member.",
            )
          }
        />
      </Modal>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Edit user"
        description="Update the name, role, or status."
        discardMessage="These user changes have not been saved."
      >
        {editing ? (
          <EditUserForm
            key={editing.id}
            user={editing}
            isSelf={editing.id === currentUserId}
            onSaved={(user) => onSaved(user, "User saved.")}
          />
        ) : null}
      </Modal>

      <Modal
        open={deactivating !== null}
        onClose={() => setDeactivating(null)}
        title="Deactivate user"
        description={
          deactivating
            ? `${displayName(deactivating)} will not be able to use the portal until an admin activates them.`
            : undefined
        }
      >
        {deactivating ? (
          <DeactivateUserForm
            key={deactivating.id}
            user={deactivating}
            onSaved={(user) => onSaved(user, "User deactivated.")}
          />
        ) : null}
      </Modal>
    </div>
  );
}
