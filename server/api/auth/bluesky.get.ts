import { DB as db } from "../../sqlite-service";
import { integrations as integrationsTable, type BskyOptions} from "../../../db/schema";
import { updateIntegrations } from "../../../shared/utils/abilities";

export default defineOAuthBlueskyEventHandler({
  async onSuccess(event, result) {
    await authorize(event, updateIntegrations);
    const bskyOptions:BskyOptions = {
      type: 'bsky',
      ...result
    };
    const formattedValues = {
      name: 'bsky',
      options: bskyOptions,
    };

    try {
      await db.insert(integrationsTable)
        .values(formattedValues)
        .onConflictDoUpdate({target: integrationsTable.name, set: formattedValues});
    } catch (error: any) {
      console.error('Bluesky OAuth error:', error);
    }
    return sendRedirect(event, '/settings');
  },
  // Optional, will return a json error and 401 status code by default
  onError(event, error) {
    console.error('Bluesky OAuth error:', error)
    return sendRedirect(event, '/settings');
  },
})