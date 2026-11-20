import { useState } from "react";
import { useApi } from "../api";

interface Marina { id: string; name: string }
interface Result { availableDays: number; occupiedDays: number; occupancy: number | null; berths: number }

export default function Occupancy() {
  const now = new Date();
  const [marinaId, setMarinaId] = useState("");
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const marinas = useApi<Marina[]>("/marinas");
  const [y, m] = month.split("-");
  const result = useApi<Result>(marinaId ? `/reports/occupancy?marinaId=${marinaId}&year=${y}&month=${Number(m)}` : null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <select className="rounded border px-2 py-1" value={marinaId} onChange={(e) => setMarinaId(e.target.value)}>
          <option value="">Choose a marina</option>
          {marinas.data?.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
        <input className="rounded border px-2 py-1" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>
      {result.error && <p className="text-red-600">{result.error}</p>}
      {result.data && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Occupancy" value={result.data.occupancy === null ? "-" : `${(result.data.occupancy * 100).toFixed(1)}%`} />
          <Stat label="Occupied days" value={result.data.occupiedDays.toLocaleString()} />
          <Stat label="Available days" value={result.data.availableDays.toLocaleString()} />
        </div>
      )}
      <p className="text-xs text-slate-500">Paid days are capped at available days per berth. Private berths with a current ownership count as fully occupied.</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs uppercase text-slate-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
