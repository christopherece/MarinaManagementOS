import { useState, type FormEvent } from "react";
import { api, toDateInput, useApi } from "../api";
import { useAuth } from "../auth";
import { Badge, Button, Card, ErrorText, Field, Input, PageHeader, Select, Table, num } from "../ui";

interface Pier { id: string; name: string }
interface Marina { id: string; code: string; name: string; piers: Pier[] }
interface BerthType { id: string; name: string }
export interface Berth {
  id: string;
  name: string;
  marinaId: string;
  pierId: string | null;
  typeId: string;
  status: "ACTIVE" | "INACTIVE" | "DECOMMISSIONED";
  nominalLengthM: string;
  nominalWidthM: string | null;
  nominalDepthM: string | null;
  decommissionedOn: string | null;
  type: BerthType;
  pier: Pier | null;
  marina: { code: string; name: string };
}

const statusTone = { ACTIVE: "green", INACTIVE: "amber", DECOMMISSIONED: "slate" } as const;

export default function Berths() {
  const { can } = useAuth();
  const marinas = useApi<Marina[]>("/marinas");
  const types = useApi<BerthType[]>("/berth-types");
  const [marinaId, setMarinaId] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const params = new URLSearchParams(Object.entries({ marinaId, status, q }).filter(([, v]) => v));
  const berths = useApi<Berth[]>(`/berths?${params}`);
  const [editing, setEditing] = useState<Berth | "new" | null>(null);

  return (
    <div>
      <PageHeader title="Berths">
        {can("BERTH_OFFICE") && <Button onClick={() => setEditing("new")}>Add berth</Button>}
      </PageHeader>

      {editing && marinas.data && types.data && (
        <BerthForm
          berth={editing === "new" ? null : editing}
          marinas={marinas.data}
          types={types.data}
          onDone={() => {
            setEditing(null);
            berths.reload();
          }}
        />
      )}

      <Card>
        <div className="mb-3 grid gap-2 sm:grid-cols-3">
          <Select value={marinaId} onChange={(e) => setMarinaId(e.target.value)} aria-label="Marina">
            <option value="">All marinas</option>
            {marinas.data?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="">Any status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="DECOMMISSIONED">Decommissioned</option>
          </Select>
          <Input placeholder="Berth name" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <ErrorText error={berths.error} />
        <Table head={["Berth", "Marina", "Pier", "Type", "Length (m)", "Width (m)", "Status", ""]} empty={berths.data?.length === 0}>
          {berths.data?.map((b) => (
            <tr key={b.id} className="border-t border-slate-100">
              <td className="py-2 pr-4 font-medium">{b.name}</td>
              <td className="pr-4">{b.marina.code}</td>
              <td className="pr-4">{b.pier?.name ?? "-"}</td>
              <td className="pr-4">{b.type.name}</td>
              <td className="pr-4">{b.nominalLengthM}</td>
              <td className="pr-4">{b.nominalWidthM ?? "-"}</td>
              <td className="pr-4"><Badge tone={statusTone[b.status]}>{b.status.toLowerCase()}</Badge></td>
              <td>{can("BERTH_OFFICE") && <Button variant="secondary" onClick={() => setEditing(b)}>Edit</Button>}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}

function BerthForm({ berth, marinas, types, onDone }: { berth: Berth | null; marinas: Marina[]; types: BerthType[]; onDone: () => void }) {
  const [f, setF] = useState({
    marinaId: berth?.marinaId ?? marinas[0]?.id ?? "",
    pierId: berth?.pierId ?? "",
    typeId: berth?.typeId ?? types[0]?.id ?? "",
    name: berth?.name ?? "",
    nominalLengthM: berth?.nominalLengthM ?? "",
    nominalWidthM: berth?.nominalWidthM ?? "",
    nominalDepthM: berth?.nominalDepthM ?? "",
    status: berth?.status ?? "ACTIVE",
    decommissionedOn: toDateInput(berth?.decommissionedOn),
  });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const piers = marinas.find((m) => m.id === f.marinaId)?.piers ?? [];

  async function submit(e: FormEvent) {
    e.preventDefault();
    const body = {
      marinaId: f.marinaId,
      pierId: f.pierId || null,
      typeId: f.typeId,
      name: f.name,
      nominalLengthM: num(f.nominalLengthM),
      nominalWidthM: num(f.nominalWidthM),
      nominalDepthM: num(f.nominalDepthM),
      status: f.status,
      decommissionedOn: f.decommissionedOn || null,
    };
    try {
      await api(berth ? `/berths/${berth.id}` : "/berths", { method: berth ? "PATCH" : "POST", body });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Card title={berth ? `Edit berth ${berth.name}` : "Add berth"}>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-3">
        <Field label="Marina">
          <Select value={f.marinaId} onChange={set("marinaId")}>{marinas.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select>
        </Field>
        <Field label="Pier">
          <Select value={f.pierId} onChange={set("pierId")}>
            <option value="">None</option>
            {piers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
        <Field label="Type">
          <Select value={f.typeId} onChange={set("typeId")}>{types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>
        </Field>
        <Field label="Berth name"><Input value={f.name} onChange={set("name")} required /></Field>
        <Field label="Length (m)"><Input type="number" step="0.01" min="0" value={f.nominalLengthM} onChange={set("nominalLengthM")} required /></Field>
        <Field label="Width (m)"><Input type="number" step="0.01" min="0" value={f.nominalWidthM} onChange={set("nominalWidthM")} /></Field>
        <Field label="Depth (m)"><Input type="number" step="0.01" min="0" value={f.nominalDepthM} onChange={set("nominalDepthM")} /></Field>
        <Field label="Status">
          <Select value={f.status} onChange={set("status")}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="DECOMMISSIONED">Decommissioned</option>
          </Select>
        </Field>
        {f.status === "DECOMMISSIONED" && (
          <Field label="Decommissioned on"><Input type="date" value={f.decommissionedOn} onChange={set("decommissionedOn")} required /></Field>
        )}
        <div className="flex items-end gap-2 sm:col-span-3">
          <Button type="submit">Save</Button>
          <Button type="button" variant="secondary" onClick={onDone}>Cancel</Button>
        </div>
      </form>
      <ErrorText error={error} />
    </Card>
  );
}
