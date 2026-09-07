import { createApiApp } from "./src/bootstrap";
async function main() {
  const app = await createApiApp({ logger: false });
  await app.init();
  const server = app.getHttpAdapter().getInstance();
  const r = await server.inject({
    method: "GET",
    url: "/api/v1/admin/jobs",
    headers: { "x-wemo-actor": JSON.stringify({ user_id: 1, audience: "staff", permissions: ["jobs:read"] }) },
  });
  console.log(r.statusCode, r.body.slice(0, 200));
  await app.close();
}
main().catch((e) => { console.error("ERR", e?.message ?? e); process.exit(1); });
