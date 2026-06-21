import { z } from "zod";

const VENDURE_API_URL = process.env.VENDURE_API_URL || "http://localhost:3000/shop-api";

export interface GraphQLResponse<T> {
  data: T;
  errors?: any[];
  token?: string | null;
}

export async function runQuery<T, V = any>(
  query: string,
  variables?: V,
  token?: string | null
): Promise<GraphQLResponse<T>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["vendure-auth-token"] = token;
  }

  const response = await z.unknown().parseAsync(
    fetch(VENDURE_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables }),
    })
  ) as Response;

  const newToken = response.headers.get("vendure-auth-token");
  const result = await response.json();

  if (result.errors && result.errors.length > 0) {
    console.error("GraphQL errors:", result.errors);
    throw new Error(result.errors[0].message || "GraphQL query execution failed");
  }

  return {
    data: result.data as T,
    errors: result.errors,
    token: newToken,
  };
}
