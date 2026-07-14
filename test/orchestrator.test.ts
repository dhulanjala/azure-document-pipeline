// test/orchestrator.test.ts

import { documentOrchestratorFn } from "../src/functions/orchestrator";

function createFakeContext(input: unknown) {
  return {
    df: {
      getInput: () => input,
      callActivity: (name: string, payload: unknown) => ({
        __type: "callActivity",
        name,
        payload,
      }),
      callActivityWithRetry: (
        name: string,
        _policy: unknown,
        payload: unknown,
      ) => ({
        __type: "callActivityWithRetry",
        name,
        payload,
      }),
    },
  };
}

describe("documentOrchestratorFn", () => {
  const input = {
    documentId: "doc-1",
    blobName: "doc-1/test.pdf",
    container: "documents",
  };

  test("happy path: setStatus -> extractMetadata -> generateChecksum -> indexDocument -> setStatus(indexed)", () => {
    const ctx = createFakeContext(input);
    const gen = documentOrchestratorFn(ctx as any);

    // 1. First yield: setStatus("processing")
    let step = gen.next();
    expect(step.value).toMatchObject({
      name: "setStatus",
      payload: { id: "doc-1" },
    });

    expect((step.value as any).payload).toHaveProperty("status", "processing");

    // 2. extractMetadata
    step = gen.next(undefined);
    expect(step.value).toMatchObject({
      name: "extractMetadata",
      payload: input,
    });

    // 3. generateChecksum
    const metadata = { contentType: "application/pdf", sizeBytes: 4096 };
    step = gen.next(metadata);
    expect(step.value).toMatchObject({
      name: "generateChecksum",
      payload: input,
    });

    // 4. indexDocument — carries both metadata and checksum
    const checksum = "abc123";
    step = gen.next(checksum);
    expect(step.value).toMatchObject({ name: "indexDocument" });
    expect((step.value as any).payload).toMatchObject({
      documentId: "doc-1",
      checksum: "abc123",
      metadata,
    });

    // 5. final setStatus("indexed")
    step = gen.next("doc-1");
    expect(step.value).toMatchObject({
      name: "setStatus",
      payload: { id: "doc-1", status: "indexed" },
    });

    // 6. orchestration completes
    step = gen.next(undefined);
    expect(step.done).toBe(true);
  });

  test("failure path (original, isRetry falsy): setStatus(failed) -> deadLetter -> re-throws", () => {
    const ctx = createFakeContext(input);
    const gen = documentOrchestratorFn(ctx as any);

    gen.next(); // setStatus(processing)
    gen.next(); // extractMetadata requested

    const failure = gen.throw(new Error("Simulated failure"));
    expect(failure.value).toMatchObject({
      name: "setStatus",
      payload: { id: "doc-1", status: "failed" },
    });

    const deadLetterStep = gen.next(undefined);
    expect(deadLetterStep.value).toMatchObject({ name: "deadLetter" });

    expect(() => gen.next(undefined)).toThrow("Simulated failure");
  });

  test("failure path on retry (isRetry: true): does NOT call deadLetter again, still re-throws", () => {
    const retryInput = { ...input, isRetry: true };
    const ctx = createFakeContext(retryInput);
    const gen = documentOrchestratorFn(ctx as any);

    gen.next(); // setStatus(processing)
    gen.next(); // extractMetadata requested

    const failure = gen.throw(new Error("Simulated failure"));
    expect(failure.value).toMatchObject({
      name: "setStatus",
      payload: { id: "doc-1", status: "failed" },
    });

    expect(() => gen.next(undefined)).toThrow("Simulated failure");
  });
});
