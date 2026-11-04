// Keep mathematical atom classes and script groups, discarding only color nodes.
export function uncoloredMathTree(node: unknown): unknown {
  if (Array.isArray(node))
    return node.flatMap((child) => {
      const value = uncoloredMathTree(child);
      return Array.isArray(value) ? value : [value];
    });
  if (!node || typeof node !== "object") return node;
  const fields = node as Record<string, unknown>;
  if (fields.type === "color") return uncoloredMathTree(fields.body);
  return Object.fromEntries(
    Object.entries(fields)
      .filter(([key]) => key !== "loc")
      .map(([key, value]) => {
        const result = uncoloredMathTree(value);
        return [
          key,
          !Array.isArray(value) && Array.isArray(result) && result.length === 1
            ? result[0]
            : result,
        ];
      }),
  );
}
