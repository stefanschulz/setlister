/** Zod's `SafeParseError["error"].flatten()` shape, as returned by the server for validation failures. */
interface FlattenedZodError {
  formErrors: string[];
  fieldErrors: Record<string, string[] | undefined>;
}

function isFlattenedZodError(value: unknown): value is FlattenedZodError {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as FlattenedZodError).formErrors) &&
    typeof (value as FlattenedZodError).fieldErrors === "object"
  );
}

function formatErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (isFlattenedZodError(error)) {
    const fieldMessages = Object.entries(error.fieldErrors).flatMap(([field, messages]) =>
      (messages ?? []).map((m) => `${field}: ${m}`),
    );
    return [...error.formErrors, ...fieldMessages].join("; ") || "Ungültige Eingabe";
  }
  return String(error);
}

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    const message =
      typeof body === "object" && body && "error" in body
        ? formatErrorMessage((body as { error: unknown }).error)
        : `API error ${status}`;
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: (path: string) => request<void>(path, { method: "DELETE" }),
};
