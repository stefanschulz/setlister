/**
 * For optional text inputs: an untouched field submits "" rather than
 * omitting the value, which would fail a `z.string().min(1).optional()`
 * check (empty string is still "provided"). Use as `setValueAs` on
 * react-hook-form's `register()` for such fields.
 */
export function emptyToUndefined(value: string): string | undefined {
  return value === '' ? undefined : value
}
