const STORAGE_PREFIX = "wemo:demo";

export function demoStorageKey(scope: string, key: string): string {
  return `${STORAGE_PREFIX}:${scope}:${key}`;
}

function browserStorage(): Storage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

function resolveStorage(storage?: Storage): Storage | undefined {
  return storage ?? browserStorage();
}

export function readDemoValue<T>(
  storage: Storage | undefined,
  scope: string,
  key: string,
  fallback: T,
): T;
export function readDemoValue<T>(scope: string, key: string, fallback: T): T;
export function readDemoValue<T>(
  storageOrScope: Storage | string | undefined,
  scopeOrKey: string,
  keyOrFallback: unknown,
  maybeFallback?: unknown,
): T {
  const storageMode = typeof storageOrScope !== "string";
  const storage = storageMode ? storageOrScope : undefined;
  const scope = storageMode ? scopeOrKey : storageOrScope;
  const key = storageMode ? (keyOrFallback as string) : scopeOrKey;
  const fallback = storageMode ? maybeFallback as T : keyOrFallback as T;

  try {
    const value = resolveStorage(storage)?.getItem(demoStorageKey(scope, key));
    return value === null || value === undefined ? fallback : (JSON.parse(value) as T);
  } catch {
    return fallback;
  }
}

export function writeDemoValue<T>(
  storage: Storage | undefined,
  scope: string,
  key: string,
  value: T,
): boolean;
export function writeDemoValue<T>(scope: string, key: string, value: T): boolean;
export function writeDemoValue<T>(
  storageOrScope: Storage | string | undefined,
  scopeOrKey: string,
  keyOrValue: unknown,
  maybeValue?: unknown,
): boolean {
  const storageMode = typeof storageOrScope !== "string";
  const storage = storageMode ? storageOrScope : undefined;
  const scope = storageMode ? scopeOrKey : storageOrScope;
  const key = storageMode ? (keyOrValue as string) : scopeOrKey;
  const value = storageMode ? maybeValue as T : keyOrValue as T;

  try {
    const target = resolveStorage(storage);
    if (!target) return false;
    target.setItem(demoStorageKey(scope, key), JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeDemoValue(storage: Storage | undefined, scope: string, key: string): void;
export function removeDemoValue(scope: string, key: string): void;
export function removeDemoValue(
  storageOrScope: Storage | string | undefined,
  scopeOrKey: string,
  maybeKey?: string,
): void {
  const storageMode = typeof storageOrScope !== "string";
  const storage = storageMode ? storageOrScope : undefined;
  const scope = storageMode ? scopeOrKey : storageOrScope;
  const key = storageMode ? maybeKey as string : scopeOrKey;

  try {
    resolveStorage(storage)?.removeItem(demoStorageKey(scope, key));
  } catch {
    // Demo state must never make an action fail when storage is unavailable.
  }
}
