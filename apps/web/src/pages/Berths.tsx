import { useApi } from "../api";

interface Berth {
  id: string;
  name: string;
  status: string;
  nominalLengthM: string;
  type: { name: string };
  pier: { name: string } | null;
}

export default function Berths() {
  const { data, error } = useApi<Berth[]>("/berths");
  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return <p>Loading berths…</p>;
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-slate-500">
        <tr><th className="py-2">Berth</th><th>Pier</th><th>Type</th><th>Length (m)</th><th>Status</th></tr>
      </thead>
      <tbody>
        {data.map((b) => (
          <tr key={b.id} className="border-t border-slate-200">
            <td className="py-2 font-medium">{b.name}</td>
            <td>{b.pier?.name ?? "-"}</td>
            <td>{b.type.name}</td>
            <td>{b.nominalLengthM}</td>
            <td>{b.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
