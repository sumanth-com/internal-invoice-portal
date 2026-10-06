"use client";

import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

function useAnchoredMenu(open: boolean, rootRef: RefObject<HTMLDivElement | null>) {
  const menuRef = useRef<HTMLUListElement>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [frame, setFrame] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const root = rootRef.current;
    if (!root) return;
    setHost(root.closest("dialog") ?? document.body);

    function place() {
      const current = rootRef.current;
      if (!current) return;
      const rect = current.getBoundingClientRect();
      const margin = 12;
      const gap = 4;
      const below = Math.max(0, window.innerHeight - rect.bottom - margin - gap);
      const above = Math.max(0, rect.top - margin - gap);
      const openUp = below < 220 && above > below;
      const maxHeight = Math.min(288, openUp ? above : below);
      const top = openUp ? Math.max(margin, rect.top - gap - maxHeight) : rect.bottom + gap;
      const left = rect.left;
      const width = rect.width;
      setFrame((currentFrame) =>
        currentFrame &&
        currentFrame.top === top &&
        currentFrame.left === left &&
        currentFrame.width === width &&
        currentFrame.maxHeight === maxHeight
          ? currentFrame
          : { top, left, width, maxHeight },
      );
    }

    function onScroll(event: Event) {
      const menu = menuRef.current;
      if (menu && event.target instanceof Node && menu.contains(event.target)) return;
      place();
    }

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, rootRef]);

  return { menuRef, host, frame };
}

function scrollOptionIntoMenu(menu: HTMLElement | null) {
  const option = menu?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]');
  if (!menu || !option) return;
  const menuRect = menu.getBoundingClientRect();
  const optionRect = option.getBoundingClientRect();
  if (optionRect.top < menuRect.top) menu.scrollTop -= menuRect.top - optionRect.top;
  else if (optionRect.bottom > menuRect.bottom) menu.scrollTop += optionRect.bottom - menuRect.bottom;
}

function AnchoredMenu({
  open,
  host,
  frame,
  menuRef,
  id,
  className,
  children,
}: {
  open: boolean;
  host: HTMLElement | null;
  frame: { top: number; left: number; width: number; maxHeight: number } | null;
  menuRef: RefObject<HTMLUListElement | null>;
  id: string;
  className?: string;
  children: ReactNode;
}) {
  if (!open || !host || !frame) return null;
  return createPortal(
    <ul
      ref={menuRef}
      id={id}
      role="listbox"
      style={{ top: frame.top, left: frame.left, width: frame.width, maxHeight: frame.maxHeight }}
      onWheel={(event) => event.stopPropagation()}
      className={cn(
        "fixed z-50 overflow-x-hidden overflow-y-auto overscroll-contain rounded-md border bg-card py-1 text-sm shadow-md",
        className,
      )}
    >
      {children}
    </ul>,
    host,
  );
}

export function SuggestField({
  id,
  name,
  value,
  onValue,
  options,
  choices,
  placeholder,
  maxLength,
  disabled,
  invalid,
  describedBy,
  label,
  className,
  menuClassName,
  onBlur,
}: {
  id: string;
  name?: string;
  value: string;
  onValue: (value: string) => void;
  options?: readonly string[];
  choices?: readonly { value: string; label: string }[];
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  label: string;
  className?: string;
  menuClassName?: string;
  onBlur?: () => void;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [filter, setFilter] = useState<string | null>(null);
  const [navigated, setNavigated] = useState(false);
  const source = choices ?? (options ?? []).map((option) => ({ value: option, label: option }));
  const query = (filter ?? "").trim().toLowerCase();
  const matches =
    filter === null || query.length < 1
      ? [...source]
      : [...source]
          .filter(
            (choice) =>
              choice.label.toLowerCase().includes(query) || choice.value.toLowerCase().includes(query),
          )
          .sort((left, right) => {
            const leftStarts =
              left.label.toLowerCase().startsWith(query) || left.value.toLowerCase().startsWith(query);
            const rightStarts =
              right.label.toLowerCase().startsWith(query) || right.value.toLowerCase().startsWith(query);
            if (leftStarts === rightStarts) return 0;
            return leftStarts ? -1 : 1;
          });
  const visible = open && matches.length > 0;
  const { menuRef, host, frame } = useAnchoredMenu(visible, rootRef);

  useEffect(() => {
    if (!open) return;
    const current = value.trim().toLowerCase();
    const index = matches.findIndex(
      (choice) => choice.value.toLowerCase() === current || choice.label.toLowerCase() === current,
    );
    setActive(index >= 0 ? index : 0);
    setNavigated(false);
    // `matches` is derived from `filter`; including the array would reset keyboard highlight every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, open]);

  useEffect(() => {
    if (!visible) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [visible, menuRef]);

  useEffect(() => {
    if (!visible) return;
    scrollOptionIntoMenu(menuRef.current);
  }, [active, visible, menuRef]);

  function choose(option: { value: string }) {
    onValue(option.value);
    setFilter(null);
    setNavigated(false);
    setOpen(false);
  }

  function reveal() {
    setFilter(null);
    setNavigated(false);
    setOpen(true);
  }

  return (
    <div ref={rootRef} className={cn("relative", visible && "z-20", className)}>
      <input
        id={id}
        name={name}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={maxLength}
        role="combobox"
        aria-label={label}
        aria-autocomplete="list"
        aria-expanded={visible}
        aria-controls={listId}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        onChange={(event) => {
          onValue(event.target.value);
          setFilter(event.target.value);
          setNavigated(false);
          setOpen(true);
        }}
        onFocus={reveal}
        onBlur={() => {
          window.setTimeout(() => {
            const activeElement = document.activeElement;
            if (
              rootRef.current?.contains(activeElement) ||
              menuRef.current?.contains(activeElement)
            ) {
              return;
            }
            setOpen(false);
          }, 0);
          onBlur?.();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            return;
          }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!open) reveal();
            if (!matches.length) return;
            const step = event.key === "ArrowDown" ? 1 : -1;
            setNavigated(true);
            setActive((current) => (current + step + matches.length) % matches.length);
            return;
          }
          if (event.key === "Enter" && visible) {
            event.preventDefault();
            if (navigated || filter !== null) choose(matches[active] ?? matches[0]);
            else setOpen(false);
          }
        }}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pr-8 text-base shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          invalid && "border-destructive",
        )}
      />
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled || source.length === 0}
        aria-label={`Show ${label} options`}
        className="absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground disabled:opacity-40"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          if (open) setOpen(false);
          else reveal();
        }}
      >
        <ChevronDown className="size-4" />
      </button>
      <AnchoredMenu
        open={visible}
        host={host}
        frame={frame}
        menuRef={menuRef}
        id={listId}
        className={menuClassName}
      >
        {matches.map((option, index) => (
          <li key={`${option.value}-${option.label}`} role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={index === active}
              className={cn(
                "flex w-full px-3 py-2 text-left",
                index === active ? "bg-muted" : "hover:bg-muted/70",
              )}
              onMouseEnter={() => setActive(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option)}
            >
              {option.label}
            </button>
          </li>
        ))}
      </AnchoredMenu>
    </div>
  );
}

export function ChoiceSelect({
  id,
  value,
  onValue,
  choices,
  label,
  disabled,
  invalid,
  display = "value",
  className,
  menuClassName,
}: {
  id: string;
  value: string;
  onValue: (value: string) => void;
  choices: readonly { value: string; label: string; lines?: readonly string[] }[];
  label: string;
  disabled?: boolean;
  invalid?: boolean;
  display?: "value" | "label";
  className?: string;
  menuClassName?: string;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const selectedIndex = Math.max(
    0,
    choices.findIndex((choice) => choice.value === value),
  );
  const selected = choices.find((choice) => choice.value === value);
  const { menuRef, host, frame } = useAnchoredMenu(open, rootRef);

  useEffect(() => {
    if (!open) return;
    setActive(selectedIndex);
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, selectedIndex, menuRef]);

  useEffect(() => {
    if (!open) return;
    scrollOptionIntoMenu(menuRef.current);
  }, [active, open, menuRef]);

  function choose(next: string) {
    onValue(next);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={cn("relative", open && "z-20", className)}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            return;
          }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!open) {
              setOpen(true);
              return;
            }
            const step = event.key === "ArrowDown" ? 1 : -1;
            setActive((current) => (current + step + choices.length) % choices.length);
          } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!open) setOpen(true);
            else choose(choices[active]?.value ?? value);
          }
        }}
        className={cn(
          "flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          invalid && "border-destructive",
        )}
      >
        <span className={cn("truncate", display === "value" && "font-medium tabular-nums")}>
          {display === "label" ? (selected?.label ?? value) : (selected?.value ?? value)}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </button>
      <AnchoredMenu
        open={open}
        host={host}
        frame={frame}
        menuRef={menuRef}
        id={listId}
        className={menuClassName}
      >
        {choices.map((choice, index) => (
          <li key={choice.value} role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={index === active}
              className={cn(
                "flex w-full px-3 py-2 text-left",
                choice.lines ? "items-start" : "items-center justify-between gap-3",
                index === active ? "bg-muted" : "hover:bg-muted/70",
              )}
              onMouseEnter={() => setActive(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(choice.value)}
            >
              <span className="min-w-0">
                <span className="block">{choice.label}</span>
                {choice.lines?.map((line, lineIndex) => (
                  <span key={lineIndex} className="block text-xs text-muted-foreground">
                    {line}
                  </span>
                ))}
              </span>
              {display === "value" ? (
                <span className="font-medium tabular-nums text-muted-foreground">{choice.value}</span>
              ) : null}
            </button>
          </li>
        ))}
      </AnchoredMenu>
    </div>
  );
}
