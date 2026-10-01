"use client";

import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

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
  const query = value.trim().toLowerCase();
  const source = choices ?? (options ?? []).map((option) => ({ value: option, label: option }));
  const matches =
    query.length < 1
      ? []
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
          })
          .slice(0, 8);
  const visible = open && matches.length > 0;

  useEffect(() => {
    setActive(0);
  }, [value]);

  useEffect(() => {
    if (!visible) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    rootRef.current
      ?.querySelector('[role="option"][aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [active, visible]);

  function choose(option: { value: string }) {
    onValue(option.value);
    setOpen(false);
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
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => onBlur?.()}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            return;
          }
          if (!matches.length) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActive((current) => (current + 1) % matches.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setActive((current) => (current - 1 + matches.length) % matches.length);
          } else if (event.key === "Enter" && visible) {
            event.preventDefault();
            choose(matches[active] ?? matches[0]);
          }
        }}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
      />
      {visible ? (
        <ul
          id={listId}
          role="listbox"
          className={cn(
            "absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-card py-1 text-sm shadow-md",
            menuClassName,
          )}
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
        </ul>
      ) : null}
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
  className,
  menuClassName,
}: {
  id: string;
  value: string;
  onValue: (value: string) => void;
  choices: readonly { value: string; label: string }[];
  label: string;
  disabled?: boolean;
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

  useEffect(() => {
    if (!open) return;
    setActive(selectedIndex);
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, selectedIndex]);

  useEffect(() => {
    if (!open) return;
    rootRef.current
      ?.querySelector('[role="option"][aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

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
        className="flex h-9 w-full cursor-pointer items-center justify-between gap-1 rounded-md border border-input bg-transparent px-2.5 text-sm shadow-sm outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="truncate font-medium tabular-nums">{selected?.value ?? value}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </button>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className={cn(
            "absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-card py-1 text-sm shadow-md",
            menuClassName,
          )}
        >
          {choices.map((choice, index) => (
            <li key={choice.value} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-3 py-2 text-left",
                  index === active ? "bg-muted" : "hover:bg-muted/70",
                )}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(choice.value)}
              >
                <span>{choice.label}</span>
                <span className="font-medium tabular-nums text-muted-foreground">{choice.value}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
