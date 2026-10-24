// One writer per counter. Rapid clicks update the target while writes stay ordered.
export class QuantityQueue {
  private entries = new Map<string, { quantity: number }>();

  private delayMs: number;

  constructor(delayMs = 250) { this.delayMs = delayMs; }

  change(id: string, initial: number, delta: number, save: (quantity: number) => Promise<void>,
    update: (quantity: number | null) => void, fail: () => void) {
    const existing = this.entries.get(id);
    const entry = existing ?? { quantity: initial };
    entry.quantity = Math.max(0, entry.quantity + delta);
    update(entry.quantity);
    if (existing) return;
    this.entries.set(id, entry);
    void (async () => {
      try {
        while (true) {
          await new Promise((resolve) => setTimeout(resolve, this.delayMs));
          const target = entry.quantity;
          await save(target);
          if (entry.quantity === target) break;
        }
      } catch {
        fail();
      } finally {
        this.entries.delete(id);
        update(null);
      }
    })();
  }
}
