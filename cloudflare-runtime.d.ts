interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

interface D1Database {}

interface R2Bucket {
  put(
    key: string,
    value: ReadableStream,
    options?: {
      httpMetadata?: { contentType?: string };
      customMetadata?: Record<string, string>;
    },
  ): Promise<unknown>;
  delete(key: string): Promise<void>;
}
