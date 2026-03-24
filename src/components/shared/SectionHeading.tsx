import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  title: string;
  accent?: string;
  accentColor?: "primary" | "secondary" | "tertiary";
  className?: string;
}

const accentColors = {
  primary:   "text-primary",
  secondary: "text-secondary",
  tertiary:  "text-tertiary",
};

export function SectionHeading({
  title, accent, accentColor = "secondary", className,
}: SectionHeadingProps) {
  return (
    <div className={cn("mb-12", className)}>
      <h2 className="font-headline text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">
        {title}{" "}
        {accent && (
          <span className={accentColors[accentColor]}>{accent}</span>
        )}
      </h2>
      <div className="h-2 w-24 bg-tertiary mt-3" />
    </div>
  );
}
