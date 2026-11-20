import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import "./index.css";
import { AuthProvider, useAuth } from "./auth";
import Login from "./pages/Login";
import Berths from "./pages/Berths";
import Occupancy from "./pages/Occupancy";
import Planned from "./pages/Planned";

const modules = [
  { path: "/", label: "Berths", el: <Berths /> },
  { path: "/customers", label: "Customers & vessels", el: <Planned title="Customers and vessels" items={["Customer search and edit", "Vessels and compliance documents", "Expiring insurance, EWOF, tag-and-test"]} /> },
  { path: "/agreements", label: "Agreements", el: <Planned title="Agreements" items={["Licences, casual stays, ownership, subleases", "Quote → Booked → Rented → Completed"]} /> },
  { path: "/bookings", label: "Bookings", el: <Planned title="Bookings and availability" items={["Availability search by size and dates", "Calendar by pier", "Arrivals and departures"]} /> },
  { path: "/billing", label: "Billing", el: <Planned title="Billing and invoicing" items={["Products and rates", "Monthly billing run", "Invoices and credit notes", "GL export"]} /> },
  { path: "/receivables", label: "Receivables", el: <Planned title="Receivables" items={["Receipts and allocation", "Aged trial balance", "Statements and debtor letters"]} /> },
  { path: "/reports/occupancy", label: "Occupancy", el: <Occupancy /> },
];

function App() {
  const { user, loading, signOut } = useAuth();
  if (loading) return <p className="p-8 text-slate-500">Loading…</p>;
  if (!user) return <Login />;
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:flex">
      <nav className="border-b border-slate-200 bg-white p-4 md:w-56 md:border-r md:border-b-0">
        <div className="mb-1 font-semibold">MarinaManagementOS</div>
        <div className="mb-4 text-xs text-slate-500">
          {user.name} · {user.role.replace("_", " ").toLowerCase()} ·{" "}
          <button className="underline" onClick={signOut}>Sign out</button>
        </div>
        <ul className="flex flex-wrap gap-2 md:flex-col">
          {modules.map((m) => (
            <li key={m.path}>
              <NavLink end to={m.path} className={({ isActive }) => `block rounded px-2 py-1 text-sm ${isActive ? "bg-sky-100 text-sky-900" : "hover:bg-slate-100"}`}>
                {m.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <main className="flex-1 p-4 md:p-8">
        <Routes>{modules.map((m) => <Route key={m.path} path={m.path} element={m.el} />)}</Routes>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter>
  </StrictMode>,
);
