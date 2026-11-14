import React from "react";

export type BadgeVariant =
  | "neutral"
  | "turquesa"
  | "esmeralda"
  | "floresta"
  | "warning"
  | "danger";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral:
    "bg-pamplex-elevated text-pamplex-text-secondary border-pamplex-border",
  turquesa:
    "bg-pamplex-turquesa/15 text-pamplex-aqua border-pamplex-turquesa/30",
  esmeralda:
    "bg-pamplex-esmeralda/15 text-pamplex-menta border-pamplex-esmeralda/30",
  floresta:
    "bg-pamplex-floresta-bg text-pamplex-esmeralda border-pamplex-floresta-deep",
  warning:
    "bg-pamplex-warning/15 text-pamplex-warning border-pamplex-warning/30",
  danger:
    "bg-pamplex-danger/15 text-pamplex-danger border-pamplex-danger/30",
};

const dotColors: Record<BadgeVariant, string> = {
  neutral: "bg-pamplex-text-secondary",
  turquesa: "bg-pamplex-turquesa",
  esmeralda: "bg-pamplex-esmeralda",
  floresta: "bg-pamplex-esmeralda",
  warning: "bg-pamplex-warning",
  danger: "bg-pamplex-danger",
};

export function Badge({
  variant = "neutral",
  dot = false,
  className = "",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-[6px] border select-none",
        variantClasses[variant],
        className,
      ].join(" ")}
      {...props}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotColors[variant]}`}
        />
      )}
      {children}
    </span>
  );
}
