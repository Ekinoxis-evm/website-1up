import { cn } from "@/lib/utils";

interface SkewButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}

const variants = {
  primary: "bg-primary-container text-white hover:bg-primary hover:neo-shadow-pink",
  secondary: "bg-secondary-container text-white hover:bg-secondary hover:neo-shadow-blue",
  ghost: "border-2 border-primary text-primary hover:bg-primary hover:text-background",
};

const sizes = {
  sm:  "px-5 py-2 text-sm",
  md:  "px-8 py-3 text-base",
  lg:  "px-10 py-5 text-xl",
};

export function SkewButton({
  children, href, onClick, variant = "primary", size = "md",
  className, type = "button", disabled,
}: SkewButtonProps) {
  const base = cn(
    "inline-block font-headline font-black tracking-tight transition-all active:scale-95 skew-fix cursor-pointer",
    variants[variant],
    sizes[size],
    disabled && "opacity-50 cursor-not-allowed",
    className,
  );

  if (href) {
    return (
      <a href={href} className={base}>
        <span className="block skew-content">{children}</span>
      </a>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={base}>
      <span className="block skew-content">{children}</span>
    </button>
  );
}
