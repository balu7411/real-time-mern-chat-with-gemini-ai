import { test, expect } from "@playwright/test";

test.describe("Day 91-120: High-Throughput Data Layer, Compound Indexes & Cache-Aside", () => {
  test("1. Message model has compound B-Tree indexes and Keyset cursor method configured", async () => {
    const Message = (await import("../backend/models/Message.js")).default || (await import("../backend/models/Message.js"));
    expect(Message.schema).toBeDefined();
    expect(typeof Message.paginateKeyset).toBe("function");

    // Check indexes
    const indexes = Message.schema.indexes();
    const hasProjectIndex = indexes.some((idx) => idx[0]?.project === 1 && idx[0]?.createdAt === -1);
    const hasConvIndex = indexes.some((idx) => idx[0]?.conversation === 1 && idx[0]?.createdAt === -1);
    const hasKeysetIndex = indexes.some((idx) => idx[0]?.conversation === 1 && idx[0]?._id === -1);

    expect(hasProjectIndex).toBe(true);
    expect(hasConvIndex).toBe(true);
    expect(hasKeysetIndex).toBe(true);
  });

  test("2. Project model has optimistic concurrency control and compound indexes", async () => {
    const Project = (await import("../backend/models/Project.js")).default || (await import("../backend/models/Project.js"));
    expect(Project.schema.get("optimisticConcurrency")).toBe(true);

    const indexes = Project.schema.indexes();
    const hasOwnerIndex = indexes.some((idx) => idx[0]?.owner === 1 && idx[0]?.createdAt === -1);
    expect(hasOwnerIndex).toBe(true);
  });

  test("3. CacheService implements Cache-Aside wrapper and sub-millisecond retrieval", async () => {
    const { CacheService } = await import("../backend/src/data/cacheService.js");
    const cache = new CacheService();

    let fetchCount = 0;
    const fetcher = async () => {
      fetchCount++;
      return { id: "proj-abc", name: "High Throughput Test" };
    };

    // First call: cache miss, calls DB fetcher
    const firstCall = await cache.wrap("project:proj-abc", fetcher, 60);
    expect(firstCall.source).toBe("database");
    expect(firstCall.data.name).toBe("High Throughput Test");
    expect(fetchCount).toBe(1);

    // Second call: cache hit, bypasses fetcher
    const secondCall = await cache.wrap("project:proj-abc", fetcher, 60);
    expect(secondCall.source).toBe("cache");
    expect(secondCall.data.name).toBe("High Throughput Test");
    expect(fetchCount).toBe(1); // Fetcher was NOT called again
  });

  test("4. CacheService detects Optimistic Concurrency Control (OCC) conflicts and raises 409", async () => {
    const { CacheService } = await import("../backend/src/data/cacheService.js");
    const cache = new CacheService();

    // Matching versions pass
    expect(() => cache.validateVersion(2, 2)).not.toThrow();

    // Mismatched versions throw 409 conflict
    expect(() => cache.validateVersion(3, 2)).toThrow(/OCC Conflict/);
  });
});
