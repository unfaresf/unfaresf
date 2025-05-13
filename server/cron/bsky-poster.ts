import { defineCronHandler } from '#nuxt/cron'
import { DB as db } from "../sqlite-service";
import { broadcasts as broadcastsTable, integrations } from "../../db/schema";
import { eq, sql } from 'drizzle-orm';
import unfareLogger from '../../shared/utils/unfareLogger';
import { RichText, Agent } from '@atproto/api';
import { AtpAgent } from '@atproto/api'

async function postToBsky(agent:Agent, text:string) {
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
    where: eq(integrations.name, 'bsky')
  });


  if (!integration || !integration.enable || !(integration?.options?.type === 'bsky')) {
    unfareLogger.debug('bsky-poster: integration disabled or not configured. Exitting...');
    return;
  }

  const { options } = integration;

  if (!options.handle || !options.appPassword) {
    throw new Error('bsky-poster: integration option missing appPassword or handle');
  }

  const unpublishedBroadcasts = await fetchUnpublishedBroadcasts('bsky', 30);

  unfareLogger.debug(`bsky-poster: Posting ${unpublishedBroadcasts.length} items`);

  // TODO: if bsky is ever actually federated, make this configurable
  const agent = new AtpAgent({
    service: 'https://bsky.social'
  });

  // login is a rate limits API call, so only do it if we need too.
  if (unpublishedBroadcasts.length > 0) {
    await agent.login({ identifier: options.handle, password: options.appPassword });
  }

  const tootings = unpublishedBroadcasts.map(async cast => {
    const platformList = sql`CONCAT_WS(',', ${broadcastsTable.platforms}, 'bsky')`
    const broadcastObj = {
      status: cast.message,
    };

    if (bskyDryRun) {
      unfareLogger.log(`bsky-poster: dryrun toot: ${JSON.stringify(broadcastObj)}`);
    } else {
      await postToBsky(agent, broadcastObj.status);
      unfareLogger.debug(`bsky-poster: toot: ${JSON.stringify(broadcastObj)}`);
      await db.update(broadcastsTable).set({ platforms: platformList }).where(eq(broadcastsTable.id, cast.id));
    }
  });

  const settledP = await Promise.allSettled(tootings);
  settledP.filter(r => r.status === 'rejected').forEach(r => unfareLogger.error('bsky-poster: ', r.reason));
});