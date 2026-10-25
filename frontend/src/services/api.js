const API_URL = import.meta.env.VITE_API_URL ?? "";

export async function apiRequest(path, options = {}, token = "") {
  const headers = new Headers(options.headers ?? {});
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail ?? "The request could not be completed.");
  return data;
}
