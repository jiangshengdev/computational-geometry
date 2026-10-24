import { verifiedBrowser as verify } from "../../shared/tools/browser.ts";
export const verifiedBrowser = () => verify(import.meta.url);
