import type { RequestEnvelope, ResponseEnvelope } from "../types/contracts";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8000";

export async function dispatchTool(
  request: RequestEnvelope,
): Promise<ResponseEnvelope> {
  const response = await fetch(`${API_BASE_URL}/tools/dispatch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Dispatch failed with status ${response.status}`);
  }

  return (await response.json()) as ResponseEnvelope;
}

export async function fetchToolsCatalog(): Promise<unknown> {
  const response = await fetch(`${API_BASE_URL}/tools/catalog`);

  if (!response.ok) {
    throw new Error(`Catalog fetch failed with status ${response.status}`);
  }

  return response.json();
}
