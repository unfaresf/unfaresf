import { it, expect, beforeEach, afterEach, describe } from 'vitest';
import fetchUnpublishedBroadcasts from './fetch-unpublished-broadcasts';
import { DB } from '../sqlite-service';
import { broadcasts as broadcastsTable, reports as reportsTable } from "../../db/schema";
import { faker } from '@faker-js/faker';

it('should return an empty array when the table is empty', async () => {
  await expect(fetchUnpublishedBroadcasts('bsky', 30)).resolves.toEqual([]);
});

describe('filtering stale broadcasts', () => {
  beforeEach(async () => {
    await DB.insert(reportsTable).values([
      {
        id: 1,
        source: 'bsky',
        uri: faker.internet.url(),
        createdAt: faker.date.past(),
        reviewedAt: faker.date.past(),
        message: faker.word.words(5),
      },
      {
        id: 2,
        source: 'bsky',
        uri: faker.internet.url(),
        reviewedAt: new Date(),
        message: faker.word.words(5),
      }
    ]);

    await DB.insert(broadcastsTable).values([
      {
        id: 1,
        message: faker.word.words(5),
        platforms: '',
        reportId: 1,
        createdAt: faker.date.past(),
      },
      {
        id: 2,
        message: faker.word.words(5),
        platforms: '',
        reportId: 2,
        createdAt: new Date(),
      }
    ])
  });

  afterEach(async () => {
    await DB.delete(broadcastsTable);
    await DB.delete(reportsTable);
  });

  it('should only return broadcasts from the last 30 minutes', async () => {
    const result = await fetchUnpublishedBroadcasts('bsky', 30);
    expect(result).lengthOf(1);
    expect(result).toEqual([
      expect.objectContaining({id:2})
    ]);
    expect(result).not.toEqual([
      expect.objectContaining({id:1})
    ]);
  });
});

describe('filter broadcasts that have already been posted to bsky', () => {
  beforeEach(async () => {
    await DB.insert(reportsTable).values([
      {
        id: 1,
        source: 'bsky',
        uri: faker.internet.url(),
        reviewedAt: new Date(),
        message: faker.word.words(5),
      },
      {
        id: 2,
        source: 'bsky',
        uri: faker.internet.url(),
        reviewedAt: new Date(),
        message: faker.word.words(5),
      },
      {
        id: 3,
        source: 'bsky',
        uri: faker.internet.url(),
        reviewedAt: new Date(),
        message: faker.word.words(5),
      },
      {
        id: 4,
        source: 'bsky',
        uri: faker.internet.url(),
        reviewedAt: new Date(),
        message: faker.word.words(5),
      },
      {
        id: 5,
        source: 'bsky',
        uri: faker.internet.url(),
        reviewedAt: new Date(),
        message: faker.word.words(5),
      }
    ]);

    await DB.insert(broadcastsTable).values([
      {
        id: 4,
        message: faker.word.words(5),
        platforms: 'bsky,mastodon',
        reportId: 1,
      },
      {
        id: 5,
        message: faker.word.words(5),
        platforms: 'mastodon,bsky',
        reportId: 2,
      },
      {
        id: 6,
        message: faker.word.words(5),
        platforms: 'bsky',
        reportId: 3,
      },
      {
        id: 7,
        message: faker.word.words(5),
        platforms: 'mastodon',
        reportId: 4,
      },
      {
        id: 8,
        message: faker.word.words(5),
        platforms: '',
        reportId: 5,
      },
    ])
  });

  afterEach(async () => {
    await DB.delete(broadcastsTable);
    await DB.delete(reportsTable);
  });

  it('should only return broadcasts that havent gone to bsky', async () => {
    const result = await fetchUnpublishedBroadcasts('bsky', 30);
    expect(result).lengthOf(2);
    expect(result).toEqual([
      expect.objectContaining({id:7}),
      expect.objectContaining({id:8}),
    ]);
    expect(result).not.toEqual([
      expect.objectContaining({id:4}),
      expect.objectContaining({id:5}),
      expect.objectContaining({id:6}),
    ]);
  });
});

describe('filter broadcasts that have already been posted to mastodon', () => {
  beforeEach(async () => {
    await DB.insert(reportsTable).values([
      {
        id: 1,
        source: 'bsky',
        uri: faker.internet.url(),
        reviewedAt: new Date(),
        message: faker.word.words(5),
      },
      {
        id: 2,
        source: 'bsky',
        uri: faker.internet.url(),
        reviewedAt: new Date(),
        message: faker.word.words(5),
      },
      {
        id: 3,
        source: 'bsky',
        uri: faker.internet.url(),
        reviewedAt: new Date(),
        message: faker.word.words(5),
      },
      {
        id: 4,
        source: 'bsky',
        uri: faker.internet.url(),
        reviewedAt: new Date(),
        message: faker.word.words(5),
      },
      {
        id: 5,
        source: 'bsky',
        uri: faker.internet.url(),
        reviewedAt: new Date(),
        message: faker.word.words(5),
      }
    ]);

    await DB.insert(broadcastsTable).values([
      {
        id: 4,
        message: faker.word.words(5),
        platforms: 'bsky,mastodon',
        reportId: 1,
      },
      {
        id: 5,
        message: faker.word.words(5),
        platforms: 'mastodon,bsky',
        reportId: 2,
      },
      {
        id: 6,
        message: faker.word.words(5),
        platforms: 'bsky',
        reportId: 3,
      },
      {
        id: 7,
        message: faker.word.words(5),
        platforms: 'mastodon',
        reportId: 4,
      },
      {
        id: 8,
        message: faker.word.words(5),
        platforms: '',
        reportId: 5,
      },
    ])
  });

  afterEach(async () => {
    await DB.delete(broadcastsTable);
    await DB.delete(reportsTable);
  });

  it('should only return broadcasts that havent gone to bsky', async () => {
    const result = await fetchUnpublishedBroadcasts('mastodon', 30);
    expect(result).lengthOf(2);
    expect(result).toEqual([
      expect.objectContaining({id:6}),
      expect.objectContaining({id:8}),
    ]);
    expect(result).not.toEqual([
      expect.objectContaining({id:4}),
      expect.objectContaining({id:5}),
      expect.objectContaining({id:7}),
    ]);
  });
});
