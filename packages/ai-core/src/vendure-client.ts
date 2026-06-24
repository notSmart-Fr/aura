import { z } from "zod";

import { IntegrationError } from "./errors.js";

const VENDURE_API_URL =
  process.env.VENDURE_API_URL || "http://localhost:3000/shop-api";

const GraphQLErrorSchema = z.object({ message: z.string() });
const GraphQLResponseSchema = z.object({
  data: z.record(z.string(), z.unknown()).optional(),
  errors: z.array(GraphQLErrorSchema).optional(),
});
const FetchResponseSchema = z.promise(z.instanceof(Response));

export async function runVendureQuery<T>(
  query: string,
  variables?: Record<string, unknown>,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  const response = await FetchResponseSchema.parseAsync(
    fetch(VENDURE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...extraHeaders,
      },
      body: JSON.stringify({ query, variables }),
    }),
  );

  if (!response.ok) {
    throw new IntegrationError(
      "UPSTREAM_API_ERROR",
      `Vendure API returned HTTP ${response.status}`,
      { status: response.status },
    );
  }

  const body = GraphQLResponseSchema.parse(await response.json());

  if (body.errors && body.errors.length > 0) {
    throw new IntegrationError(
      "UPSTREAM_API_ERROR",
      body.errors[0]?.message ?? "GraphQL query execution failed",
      { errors: body.errors },
    );
  }

  if (!body.data) {
    throw new IntegrationError(
      "UPSTREAM_API_ERROR",
      "Vendure API returned an empty data payload",
    );
  }

  return body.data as T;
}
