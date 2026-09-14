import { EMPTY_SNAPSHOT, type GameSnapshot } from "./snapshot.js";

export type Listener = () => void;

/**
 * Holds the current snapshot and notifies subscribers when it changes.
 * Shaped for React's `useSyncExternalStore`, with no framework dependency.
 */
export class GameStore {
  private snapshot: GameSnapshot;
  private readonly listeners = new Set<Listener>();

  constructor(initial: GameSnapshot = EMPTY_SNAPSHOT) {
    this.snapshot = initial;
  }

  getSnapshot = (): GameSnapshot => this.snapshot;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  update(transition: (snapshot: GameSnapshot) => GameSnapshot): void {
    const next = transition(this.snapshot);
    if (next === this.snapshot) return;
    this.snapshot = next;
    for (const listener of this.listeners) listener();
  }
}
