import { DB as db } from "../sqlite-service";
import { eq } from 'drizzle-orm';
import webpush from 'web-push';
import { type SelectSubscription, subscriptions as subscriptionsTable } from '../../db/schema';

type PushNotificationBody = {
  notification: {
    reportId: number;
    title: string;
    body: string;
    tag: string;
  }
};
async function triggerPushMsg (subscription:SelectSubscription, dataToSend:PushNotificationBody) {
  try {
    await webpush.sendNotification(subscription.details, JSON.stringify(dataToSend));
  } catch (err:any) {
    if (err.statusCode === 404 || err.statusCode === 410) {
      await db.delete(subscriptionsTable).where(eq(subscriptionsTable.id, subscription.id));
    } else {
      throw err;
    }
  }
};

export default defineEventHandler(async (event) => {
  const { vapidPrivateKey, public: {vapidPublicKey} } = useRuntimeConfig(event);
  webpush.setVapidDetails(
    'https://unfaresf.org',
    vapidPublicKey,
    vapidPrivateKey
  );

  const user = await db.query.users.findFirst({ with: { subscriptions: true } });
  const report = await db.query.reports.findFirst({
    orderBy: (reports, { desc }) => [desc(reports.createdAt)],
  });
  // @ts-ignore TS isn't picking up the relation type on the subscriptions join
  if (!report || !user || !user.subscriptions || !user.subscriptions.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'no user or no user.subscriptions',
    });
  }

  // @ts-ignore TS isn't picking up the relation type on the subscriptions join
  await triggerPushMsg(user.subscriptions[0], {
    notification: {
      reportId: report.id,
      title: 'New Report',
      body: `${report.route?.agencyName} ${report.route?.routeShortName} ${report.route?.direction} near ${report.stop?.stopName}`,
      tag: 'new-report',
    }
  })
});