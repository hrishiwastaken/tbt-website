import { ReactNode } from "react";

type Variant = "raised" | "inset" | "flat";
type Radius = "soft" | "surface" | "panel";

const variantClasses: Record<Variant, string> = {
  raised: "glass-card shadow-warm-soft",
  inset: "bg-warm-sand/40 border border-muted-sage/25",
  flat: "bg-warm-white border border-muted-sage/25",
};

const radiusClasses: Record<Radius, string> = {
  soft: "rounded-soft",
  surface: "rounded-surface",
  panel: "rounded-panel",
};

export default function Surface({
  children,
  variant = "raised",
  radius = "surface",
  interactive = false,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  variant?: Variant;
  radius?: Radius;
  interactive?: boolean;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}) {
  const Component = Tag as React.ElementType;
  return (
    <Component
      className={`${variantClasses[variant]} ${radiusClasses[radius]} ${
        interactive && variant === "raised"
          ? "transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
          : ""
      } ${className}`}
    >
      {children}
    </Component>
  );
}
