import { eq } from 'drizzle-orm';
import { credentials, users, challenges, type Roles } from '../../../db/schema';
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

    const [credential] = rows;
    // The credential trying to authenticate is not registered, so there is no account to log in to
    if (!credential)
      throw createError({ statusCode: 400, message: 'Credential not found' })

    return {
      ...credential,
      backedUp: Boolean(credential.backedUp),
      transports: JSON.parse(credential.transports),
    }
  },
  async onSuccess(event, { credential, authenticationInfo }) {
    const rows = await db
      .select({ userName: users.userName, id: users.id, roles: users.roles })
      .from(credentials)
      .innerJoin(users, eq(users.id, credentials.userId))
      .where(eq(credentials.id, credential.id));

      const [user] = rows;
    if (!user)
      throw createError({ statusCode: 400, message: 'Credential not found' })

    // Update the counter
    await db
      .update(credentials)
      .set({ counter: authenticationInfo.newCounter })
      .where(eq(credentials.id, credential.id));

    await setUserSession(event, {
      user: {
        id: user.id,
        userName: user.userName,
        roles: JSON.parse(user.roles),
      },
      loggedInAt: Date.now(),
    });
  },
})