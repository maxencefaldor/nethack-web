import type {
  EngineCatalog,
  EngineEvent,
  EngineReplies,
  EngineRequest,
  EngineRequestType,
} from "@nethack-web/protocol";
import type { EngineHost, PendingRequest } from "./engine.js";

/** Everything that crossed the engine boundary during a session, in order. */
export type SessionEntry =
  | { readonly kind: "catalog"; readonly catalog: EngineCatalog }
  | { readonly kind: "events"; readonly events: readonly EngineEvent[] }
  | { readonly kind: "request"; readonly request: EngineRequest }
  | { readonly kind: "reply"; readonly reply: EngineReplies[EngineRequestType] }
  | { readonly kind: "exit"; readonly code: number };

export interface SessionTranscript {
  readonly engineVersion: string | null;
  readonly entries: readonly SessionEntry[];
}

/**
 * Wraps a host so that every message and reply is appended to a transcript.
 * Transcripts replay through the reducer in tests without an engine present.
 */
export class RecordingHost implements EngineHost {
  private readonly entries: SessionEntry[] = [];
  private engineVersion: string | null = null;

  constructor(private readonly inner: EngineHost) {}

  transcript(): SessionTranscript {
    return { engineVersion: this.engineVersion, entries: [...this.entries] };
  }

  onCatalog(catalog: EngineCatalog): void {
    this.engineVersion = catalog.version;
    this.entries.push({ kind: "catalog", catalog });
    this.inner.onCatalog(catalog);
  }

  onEvents(events: readonly EngineEvent[]): void {
    this.entries.push({ kind: "events", events });
    this.inner.onEvents(events);
  }

  onRequest(pending: PendingRequest): void {
    this.entries.push({ kind: "request", request: pending.request });
    const recorded = {
      ...pending,
      reply: (value: EngineReplies[EngineRequestType]) => {
        this.entries.push({ kind: "reply", reply: value });
        (pending.reply as (value: EngineReplies[EngineRequestType]) => void)(value);
      },
    } as PendingRequest;
    this.inner.onRequest(recorded);
  }

  onSaves(saves: Parameters<EngineHost["onSaves"]>[0]): void {
    this.inner.onSaves(saves);
  }

  onExit(code: number, report: string | null): void {
    this.entries.push({ kind: "exit", code });
    this.inner.onExit(code, report);
  }

  onError(message: string): void {
    this.inner.onError(message);
  }
}
