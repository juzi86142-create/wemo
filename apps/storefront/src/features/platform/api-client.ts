import { ApiErrorSchema } from "@wemo/contracts";

const API_PREFIX = "/api/v1";

export class ApiError extends Error {
  readonly status: number;
  readonly requestId: string | undefined;
  readonly fieldErrors: Array<{ field: string; message: string }>;

  constructor(
    message: string,
    status: number,
    requestId?: string,
    fieldErrors: Array<{ field: string; message: string }> = [],
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.requestId = requestId;
    this.fieldErrors = fieldErrors;
  }
}

function resolveUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const configuredBase =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.WEMO_API_ORIGIN;

  if (configuredBase?.startsWith("http")) {
    return new URL(
      normalizedPath.startsWith(API_PREFIX)
        ? normalizedPath
        : `${API_PREFIX}${normalizedPath}`,
      configuredBase.endsWith(API_PREFIX)
        ? `${configuredBase}/`
        : `${configuredBase.replace(/\/$/, "")}/`,
    ).toString();
  }

  return normalizedPath.startsWith(API_PREFIX)
    ? normalizedPath
    : `${API_PREFIX}${normalizedPath}`;
}

export async function requestJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(resolveUrl(path), {
      ...init,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError("The service is temporarily unavailable.", 0);
  }

  const raw = await response.text();
  let payload: unknown = null;

  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const parsed = ApiErrorSchema.safeParse(payload);
    throw new ApiError(
      parsed.success ? parsed.data.message : "The request could not be completed.",
      response.status,
      parsed.success ? parsed.data.request_id : undefined,
      parsed.success ? parsed.data.field_errors : [],
    );
  }

  if (payload === null) {
    throw new ApiError("The service returned an empty response.", response.status);
  }

  return payload as T;
}

export function toQueryString(values: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && String(value).length > 0) {
      query.set(key, String(value));
    }
  }

  return query.toString();
}
