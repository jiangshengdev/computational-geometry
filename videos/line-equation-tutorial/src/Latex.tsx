import type { CSSProperties } from "react";
import { Latex as Formula } from "../../shared/ui/Latex";
import { colorObjectNotation } from "./teaching-emphasis";

export const Latex = ({
  children,
  ...props
}: {
  children: string;
  displayMode?: boolean;
  style?: CSSProperties;
}) => <Formula {...props}>{colorObjectNotation(children)}</Formula>;
