export function PageHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="px-5 pt-2 pb-4">
      <div className="font-display text-sm tracking-wide text-text-dim">{eyebrow}</div>
      <h1 className="font-display font-semibold text-[32px] leading-tight">{title}</h1>
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="font-display font-semibold text-lg px-5 mb-2.5">{children}</div>;
}

export function SectionSubLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-text-dim px-5 -mt-1.5 mb-3">{children}</div>;
}

export function ChartCard({
  title,
  sub,
  children,
  className = "",
}: {
  title?: string;
  sub?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-5 mb-4 bg-bg-raised border border-line rounded-2xl p-4 ${className}`}>
      {title && <div className="text-[13px] font-semibold mb-0.5">{title}</div>}
      {sub && <div className="text-[11px] text-text-dim mb-3">{sub}</div>}
      {children}
    </div>
  );
}

export function EmptyChartState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="border border-dashed border-line rounded-xl px-4 py-6 text-center text-text-dim text-[12.5px] leading-relaxed">
      <div className="text-2xl mb-2">{icon}</div>
      {message}
    </div>
  );
}

export function RangeTabs({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-2 px-5 mb-5 overflow-x-auto">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3.5 py-1.5 rounded-full text-[13px] border whitespace-nowrap ${
            value === opt.value
              ? "bg-text text-bg border-text font-semibold"
              : "border-line text-text-dim"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
