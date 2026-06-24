import { z } from "zod";

import { IntegrationError } from "./errors";

const VENDURE_API_URL = process.env.VENDURE_API_URL || "http://localhost:3000/shop-api";

const GraphQLErrorSchema = z.object({ message: z.string() });
const GraphQLResponseSchema = z.object({
  data: z.unknown().optional(),
  errors: z.array(GraphQLErrorSchema).optional(),
});
const FetchResponseSchema = z.promise(z.instanceof(Response));

function isTransientConnectionError(error: unknown): boolean {
  if (!(error instanceof TypeError) || error.message !== "fetch failed") {
    return false;
  }

  const cause = error.cause;
  if (cause && typeof cause === "object" && "code" in cause) {
    const code = (cause as { code?: string }).code;
    return code === "ECONNREFUSED" || code === "ETIMEDOUT";
  }

  return false;
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  attempts = 5,
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await FetchResponseSchema.parseAsync(fetch(url, init));
    } catch (error: unknown) {
      lastError = error;
      if (!isTransientConnectionError(error) || attempt === attempts - 1) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }

  throw lastError;
}

export interface GraphQLResponse<T> {
  data: T;
  errors?: Array<{ message: string }>;
  token?: string | null;
}

export async function runQuery<T, V = Record<string, unknown>>(
  query: string,
  variables?: V,
  token?: string | null,
): Promise<GraphQLResponse<T>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["vendure-auth-token"] = token;
  }

  const response = await fetchWithRetry(VENDURE_API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new IntegrationError(
      "UPSTREAM_API_ERROR",
      `Vendure API returned HTTP ${response.status}`,
      { status: response.status },
    );
  }

  const newToken = response.headers.get("vendure-auth-token");
  const result = GraphQLResponseSchema.parse(await response.json());

  if (result.errors && result.errors.length > 0) {
    console.error("GraphQL errors:", result.errors);
    throw new IntegrationError(
      "UPSTREAM_API_ERROR",
      result.errors[0]?.message ?? "GraphQL query execution failed",
      { errors: result.errors },
    );
  }

  return {
    data: result.data as T,
    errors: result.errors,
    token: newToken,
  };
}
