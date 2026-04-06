import { cookies } from "next/headers";
import { env } from "./env";

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("badminton-session");

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie
          ? `badminton-session=${sessionCookie.value}`
          : "",
        ...options.headers,
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message || `API error: ${res.status}`);
    }

    return res.json() as Promise<T>;
  }

  async get<T>(path: string): Promise<T> {
    return this.fetch<T>(path);
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.fetch<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    return this.fetch<T>(path, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  async delete<T>(path: string): Promise<T> {
    return this.fetch<T>(path, { method: "DELETE" });
  }
}

export const apiClient = new ApiClient(env.API_BASE_URL);
