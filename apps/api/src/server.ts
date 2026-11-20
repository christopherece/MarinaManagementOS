import { createApp } from "./app.js";

const port = Number(process.env.API_PORT ?? 4000);
createApp().listen(port, () => console.log(`MarinaManagementOS API on http://localhost:${port}`));
