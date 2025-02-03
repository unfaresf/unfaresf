import { defineCronHandler } from '#nuxt/cron'
import { createRestAPIClient } from "masto";
import { DB as db } from "../sqlite-service";
import { broadcasts as broadcastsTable, type SelectIntegration, integrations } from "../../db/schema";
import { sql, isNull, or } from 'drizzle-orm';
import unfareLogger from '../../shared/utils/unfareLogger';

export default defineCronHandler('everyMinute', async () => {
  unfareLogger.debug('masto-poster: running');
  const { mastodonDryRun } = useRuntimeConfig();
  unfareLogger.debug(`masto-poster: dry run: ${mastodonDryRun}`);

  let integration:SelectIntegration;
  try {
    const [firstRow] = await db.select().from(integrations).limit(1);

    if (!firstRow || !firstRow.enable) {
      return;
    }
    integration = firstRow;
  } catch (err:any) {
    unfareLogger.info('Unable to read options form DB.');
    return;
  }

  const masto = createRestAPIClient({
    url: integration.options?.url || '',
    accessToken: integration.options?.token || '',
  });

  let unpublishedBroadcasts
  try {
    unpublishedBroadcasts = await db
      .select()
      .from(broadcastsTable)
      .where(
        or(
          sql`lower(${broadcastsTable.platforms}) NOT like lower('%mastodon%')`,
          isNull(broadcastsTable.platforms)
        )
      );
  } catch (err) {
    unfareLogger.error('masto-poster:', err);
    return
  }

  unfareLogger.debug(`masto-poster: Posting ${unpublishedBroadcasts.length} items`);

  const tootings = unpublishedBroadcasts.map(async cast => {
    const platformList = cast.platforms === null ? 'mastodon' : `${cast.platforms},mastodon`;
    const broadcastObj = {
      status: cast.message,
    };

    if (mastodonDryRun) {
      unfareLogger.log(`masto-poster: toot: ${JSON.stringify(broadcastObj)}`);
      unfareLogger.log(`masto-poster: DB update: ${platformList}`);
    } else {
      await masto.v1.statuses.create(broadcastObj);
      unfareLogger.debug(`masto-poster: toot: ${JSON.stringify(broadcastObj)}`);
      await db.update(broadcastsTable).set({platforms: platformList});
      unfareLogger.debug(`masto-poster: DB update: ${platformList}`);
    }
  });

  const settledP = await Promise.allSettled(tootings);
  settledP.filter(r => r.status === 'rejected').forEach(r => unfareLogger.error('masto-poster: ', r.reason));
});