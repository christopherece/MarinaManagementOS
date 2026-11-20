import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function Card({ title, children, actions }: { title?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="font-medium">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Button({ variant = "primary", className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" }) {
  const look =
    variant === "primary"
      ? "bg-sky-700 text-white hover:bg-sky-800 disabled:bg-slate-300"
      : "border border-slate-300 bg-white hover:bg-slate-50 disabled:text-slate-400";
  return <button className={`rounded px-3 py-1.5 text-sm ${look} ${className}`} {...rest} />;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

const inputCls = "w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-sky-600 focus:outline-none";
export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input className={inputCls} {...p} />;
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select className={inputCls} {...p} />;

export function ErrorText({ error }: { error: string | null }) {
  return error ? <p className="my-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null;
}

export function Table({ head, children, empty }: { head: string[]; children: ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-slate-500">
          <tr>{head.map((h) => <th key={h} className="whitespace-nowrap py-2 pr-4 font-normal">{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {empty && <p className="py-4 text-sm text-slate-500">Nothing to show.</p>}
    </div>
  );
}

export function Badge({ tone, children }: { tone: "green" | "amber" | "red" | "slate"; children: ReactNode }) {
  const t = { green: "bg-green-100 text-green-800", amber: "bg-amber-100 text-amber-800", red: "bg-red-100 text-red-800", slate: "bg-slate-100 text-slate-700" }[tone];
  return <span className={`rounded px-2 py-0.5 text-xs ${t}`}>{children}</span>;
}

/** Turns form strings into API values: "" -> null, numbers parsed. */
export const num = (s: string) => (s.trim() === "" ? null : Number(s));
export const text = (s: string) => (s.trim() === "" ? null : s.trim());
