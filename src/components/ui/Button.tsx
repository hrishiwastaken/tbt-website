import Link from "next/link";
import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-ocean text-white shadow-surface-raised-sm hover:shadow-surface-raised hover:-translate-y-0.5 active:translate-y-0 active:shadow-surface-inset",
  secondary:
    "bg-surface text-ocean-deep shadow-surface-raised-sm hover:shadow-surface-raised hover:-translate-y-0.5 active:translate-y-0 active:shadow-surface-inset",
  outline:
    "bg-transparent text-ocean-deep border border-ocean/30 hover:bg-surface hover:border-ocean/50",
  ghost: "bg-transparent text-ocean hover:text-ocean-deep underline-offset-4 hover:underline",
};

const sizeClasses: Record<Size, string> = {
  sm: "text-sm px-4 py-2 min-h-[40px]",
  md: "text-base px-6 py-3 min-h-[44px]",
  lg: "text-base md:text-lg px-8 py-4 min-h-[52px]",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-dmsans font-medium cursor-pointer transition-all duration-200 ease-out-soft disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none";

interface CommonProps {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
}

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> & {
    href?: undefined;
  };

interface ButtonAsLink extends CommonProps {
  href: string;
  target?: string;
  rel?: string;
}

type ButtonProps = ButtonAsButton | ButtonAsLink;

function isLinkProps(props: ButtonProps): props is ButtonAsLink {
  return typeof (props as ButtonAsLink).href === "string";
}

export default function Button(props: ButtonProps) {
  const { variant = "primary", size = "md", children, className = "" } = props;
  const classes = `${base} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  if (isLinkProps(props)) {
    const { href, target, rel } = props;
    return (
      <Link href={href} target={target} rel={rel} className={classes}>
        {children}
      </Link>
    );
  }

  const { variant: _v, size: _s, className: _c, href: _h, ...rest } = props;
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
