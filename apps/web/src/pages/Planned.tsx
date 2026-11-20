export default function Planned({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="mb-2 text-slate-600">{title} is planned. See docs/PLAN.md.</p>
      <ul className="list-disc pl-5 text-sm text-slate-600">{items.map((i) => <li key={i}>{i}</li>)}</ul>
    </div>
  );
}
