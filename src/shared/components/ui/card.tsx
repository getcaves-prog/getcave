import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/utils/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-[#1A1A1A] p-4 border border-[#2A2A2A]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
