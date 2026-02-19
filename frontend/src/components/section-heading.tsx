type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  centered?: boolean;
};

export default function SectionHeading({ eyebrow, title, description, centered = false }: SectionHeadingProps) {
  return (
    <div className={centered ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      {eyebrow ? <p className="text-sm font-semibold uppercase tracking-[0.12em] text-teal-700">{eyebrow}</p> : null}
      <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">{title}</h2>
      {description ? <p className="mt-3 text-base leading-relaxed text-slate-600">{description}</p> : null}
    </div>
  );
}
