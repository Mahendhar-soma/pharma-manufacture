"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

const LOGO_SRC = "/logo.png";

type BrandLogoProps = {
  /** Visual size preset for common placements */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** Show brand name beside the mark */
  showText?: boolean;
  /** Optional secondary line under the brand name */
  subtitle?: string;
  className?: string;
  textClassName?: string;
  priority?: boolean;
};

const sizeMap = {
  xs: { box: "h-7 w-7 sm:h-8 sm:w-8", img: 32, text: "text-xs sm:text-sm", gap: "gap-2" },
  sm: { box: "h-9 w-9 sm:h-10 sm:w-10", img: 40, text: "text-sm", gap: "gap-2.5" },
  md: { box: "h-10 w-10 sm:h-11 sm:w-11", img: 44, text: "text-sm sm:text-base", gap: "gap-3" },
  lg: { box: "h-14 w-14 sm:h-16 sm:w-16", img: 64, text: "text-lg sm:text-xl", gap: "gap-3" },
  xl: { box: "h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28", img: 112, text: "text-xl sm:text-2xl", gap: "gap-4" },
} as const;

export default function BrandLogo({
  size = "md",
  showText = true,
  subtitle,
  className,
  textClassName,
  priority = false,
}: BrandLogoProps) {
  const s = sizeMap[size];

  return (
    <div className={cn("flex min-w-0 items-center", s.gap, className)}>
      <div className={cn("relative shrink-0 overflow-hidden", s.box)}>
        <Image
          src={LOGO_SRC}
          alt="Pharma Life Sciences"
          fill
          sizes="(max-width: 640px) 56px, 112px"
          className="object-contain"
          priority={priority}
        />
      </div>
      {showText ? (
        <div className="min-w-0">
          <div className={cn("truncate font-semibold leading-tight", s.text, textClassName)}>
            Pharma Life
          </div>
          {subtitle ? (
            <div className="truncate text-[10px] leading-tight text-slate-400 sm:text-xs">
              {subtitle}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function BrandMark({
  className,
  size = 40,
  priority = false,
}: {
  className?: string;
  size?: number;
  priority?: boolean;
}) {
  return (
    <Image
      src={LOGO_SRC}
      alt="Pharma Life Sciences"
      width={size}
      height={size}
      className={cn("h-auto w-auto object-contain", className)}
      priority={priority}
    />
  );
}
