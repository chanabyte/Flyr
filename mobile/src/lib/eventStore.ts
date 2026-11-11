import type { FlyerEvent } from "./types";

// Tiny in-memory handoff between the capture and review screens.
let current: FlyerEvent | null = null;

export const eventStore = {
  set(event: FlyerEvent) {
    current = event;
  },
  get(): FlyerEvent | null {
    return current;
  },
};
