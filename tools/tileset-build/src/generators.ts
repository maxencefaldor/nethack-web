import { createCanvas } from "@napi-rs/canvas";
import type { CatalogEntry } from "./catalog.ts";
import type { GeneratorChoice, StyleSpecification } from "./style.ts";

export interface GenerationRequest {
  readonly entry: CatalogEntry;
  readonly prompt: string;
  readonly seed: number;
  readonly size: number;
}

/** Produces a PNG for one tile. Implementations differ in where the pixels come from. */
export interface ImageGenerator {
  readonly id: string;
  generate(request: GenerationRequest): Promise<Uint8Array>;
}

/**
 * Draws the engine's own symbol in its colour on a transparent tile: no
 * network, deterministic, and a complete tileset in seconds. It exists to
 * exercise the pipeline end to end, not as a look of its own.
 */
export class PlaceholderGenerator implements ImageGenerator {
  readonly id = "placeholder";

  generate({ entry, size }: GenerationRequest): Promise<Uint8Array> {
    const canvas = createCanvas(size, size);
    const context = canvas.getContext("2d");
    context.fillStyle = entry.color;
    context.font = `${Math.round(size * 0.7)}px "IBM Plex Mono", Menlo, monospace`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(entry.symbol, size / 2, size / 2 + size * 0.04);
    return Promise.resolve(new Uint8Array(canvas.toBuffer("image/png")));
  }
}

/**
 * Calls an OpenAI-compatible image generation endpoint. Needs OPENAI_API_KEY;
 * OPENAI_BASE_URL may point at any compatible provider. Untested until a key
 * and a model are chosen.
 */
export class OpenAiImagesGenerator implements ImageGenerator {
  readonly id = "openai-images";

  constructor(
    private readonly model: string,
    private readonly imageSize: string,
    private readonly apiKey = process.env["OPENAI_API_KEY"] ?? "",
    private readonly baseUrl = process.env["OPENAI_BASE_URL"] ?? "https://api.openai.com/v1",
  ) {}

  async generate({ prompt }: GenerationRequest): Promise<Uint8Array> {
    if (this.apiKey === "") throw new Error("OPENAI_API_KEY is not set");
    const response = await fetch(`${this.baseUrl}/images/generations`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        prompt,
        n: 1,
        size: this.imageSize,
        response_format: "b64_json",
      }),
    });
    if (!response.ok)
      throw new Error(`Image generation failed: ${response.status} ${await response.text()}`);
    const body = (await response.json()) as { data: { b64_json: string }[] };
    const image = body.data[0]?.b64_json;
    if (image === undefined) throw new Error("Image generation returned no image");
    return new Uint8Array(Buffer.from(image, "base64"));
  }
}

export function generatorFor(style: StyleSpecification): ImageGenerator {
  const choice: GeneratorChoice = style.generator;
  switch (choice.kind) {
    case "placeholder":
      return new PlaceholderGenerator();
    case "openai-images":
      return new OpenAiImagesGenerator(choice.model, choice.size);
  }
}
