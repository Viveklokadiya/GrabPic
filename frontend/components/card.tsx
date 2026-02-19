import { ReactNode } from "react";

type Props = {
  title?: string;
  children: ReactNode;
  className?: string;
};

export default function Card({ title, children, className }: Props) {
  return (
    <section className={`rounded-md border border-line bg-surface p-6 shadow-sm animate-rise ${className || ""}`}>
      {title ? <h2 className="text-xl font-semibold tracking-tight">{title}</h2> : null}
      <div className={title ? "mt-4" : ""}>{children}</div>
    </section>
  );
}

