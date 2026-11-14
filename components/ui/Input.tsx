import React from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  id,
  className = "",
  ...props
}: InputProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-pamplex-text-secondary select-none"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3 flex items-center text-pamplex-text-muted">
            {leftIcon}
          </span>
        )}

        <input
          id={inputId}
          className={[
            "h-9 w-full rounded-[8px] bg-pamplex-dark text-sm text-pamplex-text-primary placeholder:text-pamplex-text-muted",
            "border transition-colors duration-150",
            error
              ? "border-pamplex-danger focus:border-pamplex-danger focus:ring-2 focus:ring-pamplex-danger/25"
              : "border-pamplex-border focus:border-pamplex-turquesa focus:ring-2 focus:ring-pamplex-turquesa/25",
            "focus:outline-none",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            leftIcon ? "pl-9 pr-3" : "px-3",
            className,
          ].join(" ")}
          {...props}
        />
      </div>

      {error ? (
        <p className="text-xs text-pamplex-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-pamplex-text-muted">{hint}</p>
      ) : null}
    </div>
  );
}