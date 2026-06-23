import PQueue from "p-queue";

// Caps how many soffice processes run at once so a burst of requests
// doesn't exhaust CPU/RAM on a small Railway/Render instance.
export const conversionQueue = new PQueue({ concurrency: 2 });
