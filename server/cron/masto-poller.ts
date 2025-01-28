import { defineCronHandler } from '#nuxt/cron'
import { createRestAPIClient } from "masto";
import { DB as db } from "../sqlite-service";
import { reports } from "../../db/schema";
import { eq, desc } from 'drizzle-orm';
import unfareLogger from '../../shared/utils/unfareLogger';
import { URL } from 'node:url';
import sanitizeHtml from 'sanitize-html';

async function getLatestMentionId(): Promise<string|null> {
  const reportsUris = await db.select({uri: reports.uri}).from(reports).where(eq(reports.source, 'mastodon')).orderBy(desc(reports.createdAt)).limit(1);
  const latestUri = reportsUris[0]?.uri;

  if (!latestUri) return null;

  const latesetUriPathParts = new URL(latestUri).pathname.split('/')
  return latesetUriPathParts[latesetUriPathParts.length-1];
}

// export default defineCronHandler('everyTwoMinutes', async () => {
export default defineCronHandler('everyTwoMinutes', async () => {
  unfareLogger.debug('masto-poller: running masto-poller');
  const { mastodonToken, mastodonDryRun, mastodonUrl, mastodonAccountName } = useRuntimeConfig();
  unfareLogger.debug(`masto-poller: dry run: ${mastodonDryRun}`);

  const masto = createRestAPIClient({
    url: mastodonUrl,
    accessToken: mastodonToken,
  });

  const latestMentionId = await getLatestMentionId();
  unfareLogger.debug(`masto-poller: latestMentionId: ${latestMentionId}`);

  const mentions = await masto.v2.search.list({
    q: `@${mastodonAccountName}`,
    type: 'statuses',
    minId: latestMentionId,
    limit: 10,
  });
  unfareLogger.debug(`masto-poller: found ${mentions.statuses.length} new mentions`);

  const reportMentions = mentions.statuses.map((status) => {
    const message = sanitizeHtml(status.content, {
      allowedTags: [],
      allowedAttributes: {}
    });
    return {
      message,
      source: 'mastodon',
      uri: status.uri,
      createdAt: new Date(status.createdAt),
    };
  });

  if (mastodonDryRun) {
    unfareLogger.info(`masto-poller: would have created ${reportMentions.length} report(s)`);
    return;
  }

  unfareLogger.info(`masto-poller: creating ${reportMentions.length} report(s)`);
  if (reportMentions.length) {
    await db.insert(reports).values(reportMentions);
  }
});