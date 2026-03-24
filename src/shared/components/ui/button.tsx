import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/shared/lib/utils/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
          {
            "bg-[#FF4D4D] text-white hover:bg-[#FF3333]":
              variant === "primary",
            "bg-[#2A2A2A] text-white hover:bg-[#333333]":
              variant === "secondary",
            "bg-transparent text-[#A0A0A0] hover:text-white hover:bg-[#1A1A1A]":
              variant === "ghost",
            "bg-red-600 text-white hover:bg-red-700": variant === "danger",
          },
          {
            "h-9 px-3 text-sm": size === "sm",
            "h-11 px-5 text-base": size === "md",
            "h-13 px-7 text-lg": size === "lg",
          },
          className
        )}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, type ButtonProps };
