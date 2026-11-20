import { createApp } from "./app.js";

const port = Number(process.env.API_PORT ?? 4000);
// There is no sign-in yet (PLAN.md module 1), so listen on this machine only by default.
const host = process.env.API_HOST ?? "127.0.0.1";
createApp().listen(port, host, () => console.log(`MarinaManagementOS API on http://${host}:${port}`));
