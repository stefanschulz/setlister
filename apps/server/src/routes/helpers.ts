import type { Context } from "hono";
import type { z } from "zod";

export function parseIdParam(c: Context, name = "id"): number | null {
  const id = Number(c.req.param(name));
  return Number.isInteger(id) && id > 0 ? id : null;
}

type ParsedBody<T> = { success: true; data: T } | { success: false; response: Response };

/** Parses and validates a JSON request body against a Zod schema in one step. */
export async function parseBody<T extends z.ZodTypeAny>(
  c: Context,
  schema: T,
): Promise<ParsedBody<z.infer<T>>> {
  let json: unknown;
  try {
    json = await c.req.json();
  } catch {
    return { success: false, response: c.json({ error: "Invalid JSON body" }, 400) };
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return { success: false, response: c.json({ error: parsed.error.flatten() }, 400) };
  }

  return { success: true, data: parsed.data };
}
