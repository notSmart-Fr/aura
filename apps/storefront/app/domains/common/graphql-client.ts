import { z } from "zod";

import { IntegrationError } from "./errors";

const VENDURE_API_URL = process.env.VENDURE_API_URL || "http://localhost:3000/shop-api";

const GraphQLErrorSchema = z.object({ message: z.string() });
const GraphQLResponseSchema = z.object({
  data: z.unknown().optional(),
  errors: z.array(GraphQLErrorSchema).optional(),
});

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

  const response = (await z.unknown().parseAsync(
    fetch(VENDURE_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables }),
    }),
  )) as Response;

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
