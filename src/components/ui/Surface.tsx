import { ReactNode } from "react";

type Variant = "raised" | "inset" | "flat";
type Radius = "soft" | "surface" | "panel";

const variantClasses: Record<Variant, string> = {
  raised: "surface-raised",
  inset: "surface-inset",
  flat: "bg-surface border border-ocean/10",
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
        interactive && variant === "raised" ? "surface-raised-interactive" : ""
      } ${className}`}
    >
      {children}
    </Component>
  );
}
