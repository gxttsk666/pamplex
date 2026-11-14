import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  interactive?: boolean;
}

export function Card({
  elevated = false,
  interactive = false,
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={[
        "rounded-[12px] border border-pamplex-border p-4 transition-colors duration-150",
        elevated ? "bg-pamplex-elevated" : "bg-pamplex-surface",
        interactive
          ? "hover:border-pamplex-turquesa/50 hover:bg-pamplex-elevated/80 cursor-pointer"
          : "",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={["flex flex-col gap-1 pb-3", className].join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={[
        "text-base font-semibold text-pamplex-text-primary tracking-tight",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={["text-sm text-pamplex-text-secondary", className].join(" ")}
      {...props}
    >
      {children}
    </p>
  );
}