import { defineCronHandler } from '#nuxt/cron'
import { createRestAPIClient } from "masto";
import { DB as db } from "../sqlite-service";
import { broadcasts as broadcastsTable, integrations } from "../../db/schema";
import { eq, sql} from 'drizzle-orm';
import unfareLogger from '../../shared/utils/unfareLogger';
import { fetchUnpublishedBroadcasts } from '#imports';

export default defineCronHandler('everyMinute', async () => {
  unfareLogger.debug('masto-poster: running');
  const { mastodonDryRun } = useRuntimeConfig();
  unfareLogger.debug(`masto-poster: dry run: ${mastodonDryRun}`);

  const integration = await db.query.integrations.findFirst({
    where: eq(integrations.name, 'mastodon')
  });

  if (!integration || !integration.enable || !integration.options || !(integration.options.type === 'mastodon')) return;

  const unpublishedBroadcasts = await fetchUnpublishedBroadcasts('mastodon', 30);

  const masto = createRestAPIClient({
    url: integration.options?.url || '',
    accessToken: integration.options?.token || '',
  });

  unfareLogger.debug(`masto-poster: Posting ${unpublishedBroadcasts.length} items`);

  const tootings = unpublishedBroadcasts.map(async cast => {
    const platformList = sql`CONCAT_WS(',', ${broadcastsTable.platforms}, 'mastodon')`
    const broadcastObj = {
      status: cast.message,
    };

    if (mastodonDryRun) {
      unfareLogger.log(`masto-poster: toot: ${JSON.stringify(broadcastObj)}`);
    } else {
      await masto.v1.statuses.create(broadcastObj);
      unfareLogger.debug(`masto-poster: toot: ${JSON.stringify(broadcastObj)}`);
      await db.update(broadcastsTable).set({ platforms: platformList }).where(eq(broadcastsTable.id, cast.id));
    }
  });

  const settledP = await Promise.allSettled(tootings);
  settledP.filter((r): r is PromiseRejectedResult => r.status === 'rejected').forEach(r => unfareLogger.error('masto-poster: ', r.reason));
});