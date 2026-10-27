import { createTeachingMathLines } from "../../../shared/ui/TeachingMathLines";
import { Latex, MathText } from "./MathText";
import { pages } from "./storyboard";
import {
  colorMath,
  lineMarks,
  objectColors,
  pageRoles,
} from "./teaching-emphasis";

export const MathLines = createTeachingMathLines({
  pages,
  Latex,
  MathText,
  colorMath,
  lineMarks,
  objectColors,
  pageRoles,
});
