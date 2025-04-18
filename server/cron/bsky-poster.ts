import { defineCronHandler } from '#nuxt/cron'
import { DB as db } from "../sqlite-service";
import { broadcasts as broadcastsTable, integrations } from "../../db/schema";
import { sql, isNull, or, eq } from 'drizzle-orm';
import unfareLogger from '../../shared/utils/unfareLogger';
import { AtpAgent, RichText } from '@atproto/api';

async function postToBsky(agent:AtpAgent, text:string) {
  const rt = new RichText({
    text
  });
  await rt.detectFacets(agent) // automatically detects mentions and links
  const postRecord = {
    $type: 'app.bsky.feed.post',
    text: rt.text,
    facets: rt.facets,
    createdAt: new Date().toISOString(),
  }
  await agent.post(postRecord);
}

export default defineCronHandler('everyMinute', async () => {
  unfareLogger.debug('bsky-poster: running');
  const { bskyDryRun } = useRuntimeConfig();
  unfareLogger.debug(`bsky-poster: dry run: ${bskyDryRun}`);

  const integration = await db.query.integrations.findFirst({
    where: eq(integrations.name, 'twitter')
  });

  if (!integration || !integration.enable || !(integration?.options?.type === 'bsky')) return;

  const {options} = integration;

  // bail if required options haven't been set yet
  if (!options.identifier || !options.appPassword) return;

  const agent = new AtpAgent({ service: 'https://public.api.bsky.app' });
  await agent.login({
    identifier: options.identifier,
    password: options.appPassword,
  });

  let unpublishedBroadcasts
  try {
    unpublishedBroadcasts = await db
      .select()
      .from(broadcastsTable)
      .where(
        or(
          sql`lower(${broadcastsTable.platforms}) NOT like lower('%bsky%')`,
          isNull(broadcastsTable.platforms)
        )
      );
  } catch (err) {
    unfareLogger.error('bsky-poster:', err);
    return
  }

  unfareLogger.debug(`bsky-poster: Posting ${unpublishedBroadcasts.length} items`);

  const tootings = unpublishedBroadcasts.map(async cast => {
    const platformList = cast.platforms === null ? 'bsky' : `${cast.platforms},bsky`;
    const broadcastObj = {
      status: cast.message,
    };

    if (bskyDryRun) {
      unfareLogger.log(`bsky-poster: toot: ${JSON.stringify(broadcastObj)}`);
      unfareLogger.log(`bsky-poster: DB update: ${platformList}`);
    } else {
      await postToBsky(agent, broadcastObj.status);
      unfareLogger.debug(`bsky-poster: toot: ${JSON.stringify(broadcastObj)}`);
      await db.update(broadcastsTable).set({ platforms: platformList });
      unfareLogger.debug(`bsky-poster: DB update: ${platformList}`);
    }
  });

  const settledP = await Promise.allSettled(tootings);
  settledP.filter(r => r.status === 'rejected').forEach(r => unfareLogger.error('bsky-poster: ', r.reason));
});