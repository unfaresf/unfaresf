import { eq } from 'drizzle-orm';
import { credentials, users, challenges } from '../../../db/schema';
import { DB as db } from '../../sqlite-service';

export default defineWebAuthnAuthenticateEventHandler({
  async storeChallenge(event, challenge, attemptId) {
    // Store the challenge in a KV store or DB
    // await useStorage().setItem(`attempt:${attemptId}`, challenge)
    await db.insert(challenges).values({
      id: attemptId,
      challenge,
    });
  },
  async getChallenge(event, attemptId) {
    const challenge = (await db
      .delete(challenges)
      .where(eq(challenges.id, attemptId))
      .returning({ challenge: challenges.challenge }))[0];

    if (!challenge) {
      throw createError({ statusCode: 400, message: 'Challenge expired' });
    }

    return challenge.challenge;
  },
  async getCredential(event, credentialId) {
    const rows = await db
      .select()
      .from(credentials)
      .where(eq(credentials.id, credentialId))
    // The credential trying to authenticate is not registered, so there is no account to log in to
    if (!rows.length)
      throw createError({ statusCode: 400, message: 'Credential not found' })

    const [credential] = rows
    return {
      ...credential,
      backedUp: Boolean(credential.backedUp),
      transports: JSON.parse(credential.transports),
    }
  },
  async onSuccess(event, { credential, authenticationInfo }) {
    const rows = await db
      .select({ userName: users.userName, id: users.id })
      .from(credentials)
      .innerJoin(users, eq(users.id, credentials.userId))
      .where(eq(credentials.id, credential.id))

    // Update the counter
    await db
      .update(credentials)
      .set({counter: authenticationInfo.newCounter})
      .where(eq(credentials.id, credential.id))

    const [{ userName, id }] = rows
    await setUserSession(event, {
      user: {
        id,
        userName,
      },
      loggedInAt: Date.now(),
    })
  },
})