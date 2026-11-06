import { updateSentencePauses } from "./sentence-plan.ts";

const args = process.argv.slice(2);
if (args.some((arg) => arg !== "--write"))
  throw Error(
    "Only --write is supported; without it, validate existing pauses",
  );
updateSentencePauses(args.includes("--write"));
