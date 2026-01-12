"use client";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("authToken");
}

export function getAuthHeaders(extra?: Record<string, string>) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(extra || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
