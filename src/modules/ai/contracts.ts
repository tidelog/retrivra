// Server-side contracts only. No provider is enabled in this milestone.
export interface EmbeddingProvider {
  readonly id: string;
  readonly model: string;
  readonly dimensions: number;
  embed(texts: readonly string[], signal?: AbortSignal): Promise<readonly (readonly number[])[]>;
}
export interface SourcePassage {
  readonly documentId: string;
  readonly chunkId: string;
  readonly text: string; // Untrusted data, never instructions.
}
export interface AnswerProvider {
  readonly id: string;
  answer(input: { question: string; sources: readonly SourcePassage[] }, signal?: AbortSignal): Promise<{ text: string; citedChunkIds: readonly string[] }>;
}
