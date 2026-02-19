const navItems = [
  { href: "#how", label: "How it works" },
  { href: "#benefits", label: "Benefits" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export default function NavBar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex w-[min(1120px,92vw)] items-center justify-between gap-4 py-3">
        <a href="#" className="font-display text-xl font-semibold tracking-tight text-slate-950">
          GrabPic
        </a>
        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
              {item.label}
            </a>
          ))}
        </nav>
        <a href="#waitlist" className="btn btn-primary text-sm">
          Join waitlist
        </a>
      </div>
    </header>
  );
}
