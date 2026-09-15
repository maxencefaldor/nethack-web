import type {
  EngineCatalog,
  EngineEvent,
  EngineReplies,
  EngineRequest,
  EngineRequestType,
  EngineStartOptions,
  EngineToHostMessage,
  HostToEngineMessage,
  SaveFile,
} from "@nethack-web/protocol";

/**
 * A request the engine is blocked on, with a typed way to answer it.
 *
 * Narrowing on `type` narrows both `request` and the accepted `reply` shape.
 */
export type PendingRequest = {
  [T in EngineRequestType]: {
    readonly type: T;
    readonly request: Extract<EngineRequest, { type: T }>;
    reply(value: EngineReplies[T]): void;
  };
}[EngineRequestType];

/** What the host must provide to run a game. */
export interface EngineHost {
  onCatalog(catalog: EngineCatalog): void;
  onEvents(events: readonly EngineEvent[]): void;
  onRequest(pending: PendingRequest): void;
  onSaves(saves: readonly SaveFile[]): void;
  onExit(code: number, report: string | null): void;
  onError(message: string): void;
}

/** Runs the engine in a worker and routes its traffic to an `EngineHost`. */
export class Engine {
  private readonly worker: Worker;
  private replied = new Set<number>();

  constructor(private readonly host: EngineHost) {
    this.worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    this.worker.onmessage = (event: MessageEvent<EngineToHostMessage>) => this.receive(event.data);
    this.worker.onerror = (event) => host.onError(event.message);
  }

  start(options: EngineStartOptions): void {
    this.send({ kind: "start", options });
  }

  terminate(): void {
    this.worker.terminate();
  }

  private send(message: HostToEngineMessage): void {
    this.worker.postMessage(message);
  }

  private receive(message: EngineToHostMessage): void {
    switch (message.kind) {
      case "loaded":
        return;
      case "catalog":
        this.host.onCatalog(message.catalog);
        return;
      case "events":
        this.host.onEvents(message.events);
        return;
      case "request":
        this.host.onRequest(this.pending(message.id, message.request));
        return;
      case "saves":
        this.host.onSaves(message.saves);
        return;
      case "exited":
        this.host.onExit(message.code, message.report);
        return;
      case "error":
        this.host.onError(message.message);
        return;
    }
  }

  private pending(id: number, request: EngineRequest): PendingRequest {
    const reply = (value: unknown) => {
      if (this.replied.has(id)) {
        throw new Error(`Engine request ${id} (${request.type}) was already answered`);
      }
      this.replied.add(id);
      this.send({ kind: "reply", id, reply: value as EngineReplies[EngineRequestType] });
    };
    return { type: request.type, request, reply } as PendingRequest;
  }
}
