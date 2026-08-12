type R2PutOptions = {
  httpMetadata?: { contentType?: string };
  customMetadata?: Record<string, string>;
};

export type RuntimeEnvironment = {
  DB?: unknown;
  BUCKET?: {
    put(key: string, value: ReadableStream, options?: R2PutOptions): Promise<unknown>;
    delete(key: string): Promise<void>;
  };
};

declare global {
  var __COSPHARM_RUNTIME_ENV__: RuntimeEnvironment | undefined;
}

export function setRuntimeEnvironment(environment: RuntimeEnvironment) {
  globalThis.__COSPHARM_RUNTIME_ENV__ = environment;
}

export function getRuntimeEnvironment() {
  const environment = globalThis.__COSPHARM_RUNTIME_ENV__;
  if (!environment) throw new Error("Runtime bindings are unavailable");
  return environment;
}
