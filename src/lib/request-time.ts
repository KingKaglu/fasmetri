// "Now" for server components. They render once per request, so reading the
// clock there is fine, but the React Compiler purity rule
// (react-hooks/purity) cannot tell a server component from a client one and
// rejects a direct Date.now() in a component body. Going through a named
// helper keeps the intent explicit: this is request time, not render state.

export function requestNow(): number {
  return Date.now();
}

/** The moment `ms` milliseconds before this request. */
export function msAgo(ms: number): Date {
  return new Date(requestNow() - ms);
}
