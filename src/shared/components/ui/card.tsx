import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/utils/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-cave-dark p-4 border border-cave-rock hover:border-cave-smoke transition-colors",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
