import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { createServer, type AddressInfo } from "node:net";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const root = resolve(import.meta.dirname, "..");
const checks = [
  { consumer: "apps/api", packageName: "@wemo/contracts" },
  { consumer: "apps/api", packageName: "@wemo/database" },
  { consumer: "apps/storefront", packageName: "@wemo/contracts" },
  { consumer: "apps/storefront", packageName: "@wemo/ui" },
] as const;

const failures = checks.flatMap(({ consumer, packageName }) => {
  const result = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      `await import(${JSON.stringify(packageName)})`,
    ],
    {
      cwd: resolve(root, consumer),
      encoding: "utf8",
    },
  );

  if (result.status === 0) return [];

  const detail = result.stderr.trim() || result.stdout.trim() || "未知错误";
  return [`${consumer} 无法通过原生 Node 加载 ${packageName}: ${detail}`];
});

async function availablePort(): Promise<number> {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = (server.address() as AddressInfo).port;
  server.close();
  await once(server, "close");
  return port;
}

async function checkApiHealth(): Promise<string[]> {
  const apiRoot = resolve(root, "apps", "api");
  const port = await availablePort();
  const output: string[] = [];
  const api = spawn(process.execPath, ["dist/main.js"], {
    cwd: apiRoot,
    env: { ...process.env, API_PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });

  api.stdout.on("data", (chunk: Buffer) => output.push(chunk.toString()));
  api.stderr.on("data", (chunk: Buffer) => output.push(chunk.toString()));

  try {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (api.exitCode !== null) break;

      try {
        const response = await fetch(`http://127.0.0.1:${port}/api/v1/health`);
        if (response.ok) {
          const body = (await response.json()) as Record<string, unknown>;
          return body.status === "ok" && body.service === "wemove-api"
            ? []
            : [`API 健康检查响应不符合预期: ${JSON.stringify(body)}`];
        }
      } catch {
        // 服务仍在启动时继续短暂轮询。
      }

      await delay(100);
    }

    const detail =
      output.join("").trim() || `进程退出码 ${String(api.exitCode)}`;
    return [`API 构建产物未能通过真实 HTTP 健康检查: ${detail}`];
  } finally {
    if (api.exitCode === null) api.kill();
    await Promise.race([once(api, "exit"), delay(2_000)]);
  }
}

async function main(): Promise<void> {
  failures.push(...(await checkApiHealth()));

  if (failures.length) {
    console.error("运行时检查失败：");
    console.error(failures.join("\n"));
    process.exit(1);
  }

  console.log(
    `运行时检查通过：${checks.length} 条共享包消费者导入链可由原生 Node 加载，API 构建产物健康接口返回正常。`,
  );
}

void main().catch((error: unknown) => {
  console.error("运行时检查异常：", error);
  process.exit(1);
});
