import { DB as db } from "../../server/sqlite-service"
import {
  users as usersTable,
  subscriptions as subscriptionsTable,
  notifications as notificationsTable,
  type SelectReport,
  type SelectSubscription,
  type Prettify,
  type NotificationDetail,
} from "../../db/schema";
import { eq, lt, and, inArray, sql, isNull } from "drizzle-orm";
import webpush from 'web-push';
import { sub } from "date-fns";
import getPlainTextSummary, { type PartialReport } from '#shared/utils/get-plain-text-summary';

async function cleanOldNotifications() {
  const oneWeekAgo = sub(new Date(), {
    weeks: 1,
  });
  await db.delete(notificationsTable).where(lt(notificationsTable.createdAt, oneWeekAgo));
}

// gets the three users who least recently recieved notifications,
// or have never recieved one
async function getUsersToNotify() {
  // SELECT DISTINCT users.id
  return db.selectDistinct({
    id: usersTable.id
  })
  // FROM users
  .from(usersTable)
  // INNER JOIN subscriptions ON subscriptions.userId = users.id
  .innerJoin(subscriptionsTable, eq(subscriptionsTable.userId, usersTable.id))
  // LEFT OUTTER JOIN notifications ON notifications.subscriptionsID = subscriptions.id
  .leftJoin(notificationsTable, eq(notificationsTable.subscriptionId, subscriptionsTable.id))
  // ORDER BY notifications.createdAt DESC NULLS FIRST
  .orderBy(sql`${notificationsTable.createdAt} ASC NULLS FIRST`)
  // WHERE subscriptions.deletedAt IS NULL
  .where(isNull(subscriptionsTable.deletedAt))
  // LIMIT 3;
  .limit(3);
}

async function getSubscriptionsForUsers(userIds:number[]) {
  return db.select({
    id: subscriptionsTable.id,
    details: subscriptionsTable.details,
  })
  .from(subscriptionsTable)
  .where(
    and(
      inArray(subscriptionsTable.userId, userIds),
      isNull(subscriptionsTable.deletedAt)
    )
  );
}

function formatReportAsNotification(reports:SelectReport, totalOutstanding:number):NotificationDetail {
  const body = getPlainTextSummary(reports);

  return {
    title: '🚌 🐷 Report',
    body,
    tag: 'new-report',
    reportUrl: `/reports/${reports.id}`,
    unhandledReportsCount: totalOutstanding,
  }
}

async function triggerPushMsg(
  dataToSend:Prettify<NotificationDetail>,
  subscription:Prettify<Pick<SelectSubscription, "id" | "details">>
) {
  try {
    await webpush.sendNotification(subscription.details, JSON.stringify(dataToSend), {
      TTL: 60 * 3, // 3 minutes
      urgency: 'normal'
    });
    await db.insert(notificationsTable)
      .values({
        subscriptionId: subscription.id,
        details: dataToSend,
      });
  } catch (err:any) {
    if (err.statusCode === 404 || err.statusCode === 410) {
      console.error('400 level error sending push notification', err);
      await db.update(subscriptionsTable)
        .set({deletedAt: new Date()})
        .where(eq(subscriptionsTable.id, subscription.id));
    } else {
      throw err;
    }
  }
};

export default async function Notify(reports:SelectReport[]) {
  const notificationsBodies = reports.map(report => formatReportAsNotification(report, reports.length));
  // collect users to notify
  const users = await getUsersToNotify();

  // send notifications
  const { vapidPrivateKey, public: { vapidPublicKey } } = useRuntimeConfig();
  webpush.setVapidDetails(
    'https://unfaresf.org',
    vapidPublicKey,
    vapidPrivateKey
  );

  const subscriptions = await getSubscriptionsForUsers(users.map(u => u.id));
  return Promise.allSettled(subscriptions.flatMap(sub => {
    return notificationsBodies.map(body => triggerPushMsg(body, sub));
  }));
}