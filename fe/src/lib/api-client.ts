import { getSessionToken } from "./session";

export const API_URL = process.env.NEXT_PUBLIC_API_URL as string;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getSessionToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, formData: FormData) => request<T>(path, { method: "POST", body: formData }),
  // Used for zip-download endpoints, which stream a binary body instead of
  // JSON — request<T>() above always calls res.json(), so this bypasses it.
  downloadPost: async (path: string, body: unknown): Promise<{ blob: Blob; filename: string | null }> => {
    const token = getSessionToken();
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`API ${path} failed: ${res.status} ${await res.text()}`);
    const disposition = res.headers.get("Content-Disposition");
    const filename = disposition?.match(/filename="?([^"]+)"?/)?.[1] ?? null;
    return { blob: await res.blob(), filename };
  },
};
