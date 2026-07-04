interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  handwritten?: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}

export default function SectionHeading({
  eyebrow,
  title,
  handwritten,
  description,
  align = "center",
  className = "",
}: SectionHeadingProps) {
  const alignClasses = align === "center" ? "text-center items-center mx-auto" : "text-left items-start";

  return (
    <div className={`flex flex-col gap-4 ${alignClasses} max-w-2xl ${className}`}>
      {eyebrow && (
        <span className="text-xs md:text-sm font-semibold uppercase tracking-[0.2em] text-ocean">
          {eyebrow}
        </span>
      )}
      <h2 className="font-cormorant text-3xl md:text-4xl lg:text-5xl font-semibold text-ocean-deep leading-tight text-balance">
        {title}
        {handwritten && (
          <span className="block font-hand text-2xl md:text-3xl text-ocean font-normal mt-1">
            {handwritten}
          </span>
        )}
      </h2>
      {description && (
        <p className="text-base md:text-lg text-ink-muted leading-relaxed text-pretty">
          {description}
        </p>
      )}
    </div>
  );
}
