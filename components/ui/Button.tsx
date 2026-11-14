import React from "react";

export type ButtonVariant =
  | "primary"
  | "positive"
  | "secondary"
  | "ghost"
  | "danger";

export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-pamplex-turquesa text-pamplex-dark font-semibold hover:bg-pamplex-aqua active:brightness-95",
  positive:
    "bg-pamplex-esmeralda text-pamplex-dark font-semibold hover:bg-pamplex-menta active:brightness-95",
  secondary:
    "bg-pamplex-surface text-pamplex-text-primary border border-pamplex-border font-medium hover:bg-pamplex-elevated",
  ghost:
    "bg-transparent text-pamplex-text-secondary font-medium hover:bg-pamplex-surface hover:text-pamplex-text-primary",
  danger:
    "bg-pamplex-danger text-pamplex-text-primary font-semibold hover:brightness-110 active:brightness-95",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs rounded-[8px] gap-1.5",
  md: "h-9 px-4 text-sm rounded-[8px] gap-2",
  lg: "h-11 px-5 text-sm rounded-[8px] gap-2",
  icon: "h-9 w-9 p-0 rounded-[8px] justify-center",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={[
        "inline-flex items-center justify-center select-none transition-all duration-150 cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pamplex-turquesa focus-visible:ring-offset-2 focus-visible:ring-offset-pamplex-bg",
        "active:scale-[0.98]",
        "disabled:opacity-45 disabled:pointer-events-none disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}