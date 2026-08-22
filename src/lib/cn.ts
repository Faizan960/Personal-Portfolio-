/** Joins class names, dropping falsy entries. Keeps components dependency-free. */
export function cn(
  ...parts: Array<string | false | null | undefined>
): string {
  return parts.filter(Boolean).join(" ");
}
