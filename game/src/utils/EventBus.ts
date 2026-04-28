type Handler = (...args: unknown[]) => void;

const _listeners = new Map<string, Set<Handler>>();

export const EventBus = {
  on(event: string, handler: Handler): void {
    let set = _listeners.get(event);
    if (!set) { set = new Set(); _listeners.set(event, set); }
    set.add(handler);
  },

  off(event: string, handler: Handler): void {
    _listeners.get(event)?.delete(handler);
  },

  emit(event: string, ...args: unknown[]): void {
    _listeners.get(event)?.forEach(h => h(...args));
  },

  clear(): void {
    _listeners.clear();
  },
};
