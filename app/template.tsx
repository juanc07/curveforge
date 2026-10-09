import type { ReactNode } from "react";
import JourneyNavigation from "./components/JourneyNavigation";

export default function Template({ children }: { children: ReactNode }) {
  return <><JourneyNavigation />{children}</>;
}
