import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/shared/lib/utils/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm text-cave-fog font-[family-name:var(--font-space-mono)]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-11 w-full rounded-xl bg-cave-ash px-4 text-cave-light placeholder:text-cave-smoke border border-cave-rock focus:border-neon-green focus:ring-2 focus:ring-neon-green/20 focus:outline-none transition-colors",
            error && "border-neon-pink",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-neon-pink">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input, type InputProps };
