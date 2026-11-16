"use client";

interface AvatarImgProps {
  avatarUrl?: string | null;
  initials: string;
  accentColor: string;
  size?: "sm" | "md" | "lg";
  speaking?: boolean;
}

const SIZE = {
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-xs",
  lg: "h-10 w-10 text-sm",
};

export function AvatarImg({ avatarUrl, initials, accentColor, size = "md", speaking }: AvatarImgProps) {
  const ring = speaking ? "ring-2 ring-pamplex-esmeralda" : "";
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={initials}
        className={`${SIZE[size]} rounded-full object-cover shrink-0 ${ring}`}
      />
    );
  }
  return (
    <div className={`flex ${SIZE[size]} shrink-0 items-center justify-center rounded-full font-bold ${accentColor} ${ring}`}>
      {initials}
    </div>
  );
}
