import { defineCronHandler } from '#nuxt/cron'
import { createRestAPIClient } from "masto";
import { DB as db } from "../sqlite-service";
import { broadcasts as broadcastsTable, integrations } from "../../db/schema";
import { isNull, or, eq, lt, and, notLike } from 'drizzle-orm';
import unfareLogger from '../../shared/utils/unfareLogger';
import { sub } from 'date-fns';

export default defineCronHandler('everyMinute', async () => {
  unfareLogger.debug('masto-poster: running');
  const { mastodonDryRun } = useRuntimeConfig();
  unfareLogger.debug(`masto-poster: dry run: ${mastodonDryRun}`);

  const integration = await db.query.integrations.findFirst({
    where: eq(integrations.name, 'mastodon')
  });

  if (!integration || !integration.enable || !integration.options || !(integration.options.type === 'mastodon')) return;

  let unpublishedBroadcasts
  try {
    const beginningOfPostWindow = sub(new Date(), {
      minutes: 30
    });
    unpublishedBroadcasts = await db
      .select()
      .from(broadcastsTable)
      .where(
        and(
          lt(broadcastsTable.createdAt, beginningOfPostWindow),
          or(
            notLike(broadcastsTable.platforms, "%mastodon%"),
            isNull(broadcastsTable.platforms)
          )
        )
      );
  } catch (err) {
    unfareLogger.error('masto-poster:', err);
    return
  }

  const masto = createRestAPIClient({
    url: integration.options?.url || '',
    accessToken: integration.options?.token || '',
  });

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