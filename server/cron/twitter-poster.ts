import { defineCronHandler } from '#nuxt/cron'
import { DB as db } from "../sqlite-service";
import { broadcasts as broadcastsTable, integrations, type SelectIntegration } from "../../db/schema";
import { sql, isNull, or, eq } from 'drizzle-orm';
import unfareLogger from '../../shared/utils/unfareLogger';

type BroadcastObj = {
  status: string;
};

async function createTweet(token:string, status:BroadcastObj) {
  return $fetch('https://api.twitter.com/2/tweets', {
    method: 'post',
    headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
    body: {text:status.status}
  });
}

export default defineCronHandler('everyMinute', async () => {
  unfareLogger.debug('twitter-poster: running');
  const { twitterDryRun } = useRuntimeConfig();
  unfareLogger.debug(`twitter-poster: dry run: ${twitterDryRun}`);

  const integration = await db.query.integrations.findFirst({
    where: eq(integrations.name, 'twitter')
  });

  let unpublishedBroadcasts
  try {
    unpublishedBroadcasts = await db
      .select()
      .from(broadcastsTable)
      .where(
        or(
          sql`lower(${broadcastsTable.platforms}) NOT like lower('%twitter%')`,
          isNull(broadcastsTable.platforms)
        )
      );
  } catch (err) {
    unfareLogger.error('twitter-poster:', err);
    return
  }

  unfareLogger.debug(`twitter-poster: Posting ${unpublishedBroadcasts.length} items`);

  const tootings = unpublishedBroadcasts.map(async cast => {
    const platformList = cast.platforms === null ? 'twitter' : `${cast.platforms},twitter`;
    const broadcastObj:BroadcastObj = {
      status: cast.message,
    };

    if (twitterDryRun) {
      unfareLogger.log(`twitter-poster: tweet: ${JSON.stringify(broadcastObj)}`);
      unfareLogger.log(`twitter-poster: DB update: ${platformList}`);
    } else {
      await createTweet(integration?.options?.bearerToken, broadcastObj);
      unfareLogger.debug(`twitter-poster: tweet: ${JSON.stringify(broadcastObj)}`);
      await db.update(broadcastsTable).set({platforms: platformList});
      unfareLogger.debug(`twitter-poster: DB update: ${platformList}`);
    }
  });

  const settledP = await Promise.allSettled(tootings);
  settledP.filter(r => r.status === 'rejected').forEach(r => unfareLogger.error('twitter-poster: ', r.reason));
});