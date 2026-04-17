import raw from "../../data/locations.json";
import type { Location } from "./types";

export const locations: Location[] = raw as Location[];

export function byId(id: string): Location | undefined {
  return locations.find((l) => l.id === id);
}
