import { defineCronHandler } from '#nuxt/cron'
import { createRestAPIClient } from "masto";
import { DB as db } from "../sqlite-service";
import { broadcasts as broadcastsTable } from "../../db/schema";
import { sql, isNull, or } from 'drizzle-orm';
import unfareLogger from '../../shared/utils/unfareLogger';

export default defineCronHandler('everyMinute', async () => {
  unfareLogger.debug('running masto-poster');
  const config = useRuntimeConfig();
  unfareLogger.debug(`dry run: ${config.mastodonDryRun}`);

  const masto = createRestAPIClient({
    url: config.mastodonUrl,
    accessToken: config.mastodonToken,
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
    unfareLogger.error(err);
    return
  }

  unfareLogger.debug(`Posting ${unpublishedBroadcasts.length} items`);

  const tootings = unpublishedBroadcasts.map(async cast => {
    const platformList = cast.platforms === null ? 'mastodon' : `${cast.platforms},mastodon`;
    const broadcastObj = {
      status: cast.message,
    };

    if (config.mastodonDryRun) {
      unfareLogger.log(`toot: ${JSON.stringify(broadcastObj)}`);
      unfareLogger.log(`DB update: ${platformList}`);
    } else {
      await masto.v1.statuses.create(broadcastObj);
      unfareLogger.debug(`toot: ${JSON.stringify(broadcastObj)}`);
      await db.update(broadcastsTable).set({platforms: platformList});
      unfareLogger.debug(`DB update: ${platformList}`);
    }
  });

  const settledP = await Promise.allSettled(tootings);
  settledP.filter(r => r.status === 'rejected').forEach(r => unfareLogger.error(r.reason));
});