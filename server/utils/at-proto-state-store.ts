import type { NodeSavedState, NodeSavedStateStore } from '@atproto/oauth-client-node'
import { DB as db } from "../sqlite-service";
import { keyValue } from '../../db/schema';
import { eq } from 'drizzle-orm';

export class ATProtoStateStore implements NodeSavedStateStore {
  private readonly stateKey = 'oauth-bluesky-state'

  constructor() {}

  async get(): Promise<NodeSavedState | undefined> {
    const result = await db.query.keyValue.findFirst({
      columns: {
        value: true
      },
      where: eq(keyValue.key, this.stateKey)
    });
    if (!result?.value) return
    return JSON.parse(result.value);
  }

  async set(key: string, val: NodeSavedState) {
    await db.insert(keyValue).values({
      key: this.stateKey,
      value: JSON.stringify(val)
    });
  }

  async del() {
    await db.delete(keyValue).where(eq(keyValue.key, this.stateKey));
  }
}