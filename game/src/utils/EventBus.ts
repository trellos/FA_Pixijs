import type { EventMap } from './Types';

/**
 * Type-safe pub/sub. The `EventMap` interface in `Types.ts` is the single
 * source of truth for both event names and payload types — adding an event
 * is one entry there, and every emit/on site is checked at compile time.
 *
 * The bus is intentionally minimal: no priority, no async dispatch, no
 * wildcards. Listeners are called synchronously in registration order. If
 * a listener throws, subsequent listeners still fire — this matches what
 * a 10-year codebase needs (one bad consumer can't break the others) and
 * is the only behavioral wrinkle worth knowing.
 */

type Handler<K extends keyof EventMap> = (payload: EventMap[K]) => void;

// Stored as a generic Set<Function> internally; the public API enforces
// types. The cast at dispatch is the only `any` boundary in the bus.
const listeners = new Map<keyof EventMap, Set<(p: unknown) => void>>();

export const EventBus = {
  on<K extends keyof EventMap>(event: K, handler: Handler<K>): void {
    let set = listeners.get(event);
    if (!set) { set = new Set(); listeners.set(event, set); }
    set.add(handler as (p: unknown) => void);
  },

  off<K extends keyof EventMap>(event: K, handler: Handler<K>): void {
    listeners.get(event)?.delete(handler as (p: unknown) => void);
  },

  emit<K extends keyof EventMap>(
    event: K,
    ...args: EventMap[K] extends void ? [] : [EventMap[K]]
  ): void {
    const set = listeners.get(event);
    if (!set) return;
    const payload = (args[0] as unknown);
    for (const h of set) {
      try { h(payload); }
      catch (err) { console.error(`[EventBus] listener for "${String(event)}" threw:`, err); }
    }
  },

  clear(): void {
    listeners.clear();
  },
};
