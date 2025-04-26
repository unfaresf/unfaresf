import type { NodeSavedSession, NodeSavedSessionStore } from '@atproto/oauth-client-node'
import { DB as db } from "../sqlite-service";
import { keyValue } from '../../db/schema';
import { eq } from 'drizzle-orm';

export class ATProtoSessionStore implements NodeSavedSessionStore {
  private readonly sessionKey = 'oauth-bluesky-session'

  constructor() {}

  async get(): Promise<NodeSavedSession | undefined> {
    const result = await db.query.keyValue.findFirst({
      columns: {
        value: true
      },
      where: eq(keyValue.key, this.sessionKey)
    });
    if (!result?.value) return
    return JSON.parse(result.value);
  }

  async set(key: string, val: NodeSavedSession) {
    await db.insert(keyValue).values({
      key: this.sessionKey,
      value: JSON.stringify(val)
    });
  }

  async del() {
    await db.delete(keyValue).where(eq(keyValue.key, this.sessionKey));
  }
}