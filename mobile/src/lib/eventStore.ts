import type { ExtractResponse } from "./types";

// Tiny in-memory handoff between the capture and review screens.
let current: ExtractResponse | null = null;

export const eventStore = {
  set(result: ExtractResponse) {
    current = result;
  },
  get(): ExtractResponse | null {
    return current;
  },
};
