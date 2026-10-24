import test from "node:test";
import assert from "node:assert/strict";
import { QuantityQueue } from "../src/lib/quantityQueue.ts";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

test("rapid clicks coalesce and clicks during a write are saved in order", async () => {
  const queue = new QuantityQueue(0);
  const firstStarted = deferred();
  const release = deferred();
  const finished = deferred();
  const writes: number[] = [];
  let displayed: number | null = null;
  const save = async (quantity: number) => {
    writes.push(quantity);
    if (writes.length === 1) { firstStarted.resolve(); await release.promise; }
  };
  const update = (quantity: number | null) => {
    displayed = quantity;
    if (quantity === null) finished.resolve();
  };
  const fail = () => assert.fail("unexpected save failure");
  queue.change("pt", 0, 1, save, update, fail);
  queue.change("pt", 0, 1, save, update, fail);
  queue.change("pt", 0, 1, save, update, fail);
  assert.equal(displayed, 3);
  await firstStarted.promise;
  queue.change("pt", 0, 1, save, update, fail);
  queue.change("pt", 0, -1, save, update, fail);
  queue.change("pt", 0, 1, save, update, fail);
  release.resolve();
  await finished.promise;
  assert.deepEqual(writes, [3, 4]);
  assert.equal(displayed, null);
});

test("failure clears the optimistic value and allows retry; counters stay independent", async () => {
  const queue = new QuantityQueue(0);
  const failed = deferred();
  const succeeded = deferred();
  let errors = 0;
  queue.change("pt", 0, 1, async () => { throw new Error("offline"); },
    (value) => { if (value === null) failed.resolve(); }, () => { errors++; });
  const writes: number[] = [];
  queue.change("en", 0, -1, async (value) => { writes.push(value); },
    (value) => { if (value === null) succeeded.resolve(); }, () => assert.fail());
  await Promise.all([failed.promise, succeeded.promise]);
  assert.equal(errors, 1);
  assert.deepEqual(writes, [0]);
  const retried = deferred();
  queue.change("pt", 2, 1, async (value) => { writes.push(value); },
    (value) => { if (value === null) retried.resolve(); }, () => assert.fail());
  await retried.promise;
  assert.deepEqual(writes, [0, 3]);
});
