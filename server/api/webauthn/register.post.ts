// server/api/webauthn/register.post.ts
import { and, eq, sql, between } from 'drizzle-orm';
import { users, credentials, invites } from '../../../db/schema';
import { DB as db } from '../../sqlite-service';
import { validate as uuidValidate } from 'uuid';

export default defineWebAuthnRegisterEventHandler({
  // optional
  async validateUser(signUpBody, event) {
    // bonus: check if the user is already authenticated to link a credential to his account
    // We first check if the user is already authenticated by getting the session
    // And verify that the email is the same as the one in session
    const session = await getUserSession(event)
    if (session.user && session.user.userName !== signUpBody.userName) {
      throw createError({ statusCode: 400, message: 'Username does not match current session' })
    }

    const { inviteId, userName } = signUpBody;

    if (!uuidValidate(inviteId)) {
      throw createError({ statusCode: 400, message: 'Invalid invite' });
    }

    let dbInvites = await db.select().from(invites).where(
      and(
        eq(invites.id, `${inviteId}`),
        eq(invites.used, false),
        between(invites.createdAt, sql`(unixepoch() - 86400)`, sql`unixepoch()`),
      )
    );

    const { signUpKey } = useRuntimeConfig();
    if (!dbInvites.length && signUpKey !== inviteId) {
      throw createError({ statusCode: 400, message: 'Invalid invite' });
    }

    let existingUser = await db.select().from(users).where(eq(users.userName, userName));
    if (existingUser.length) {
      throw createError({ statusCode: 400, message: 'User already exists' });
    }

    // If he registers a new account with credentials
    return {
      userName,
      inviteId
    }
  },
  async onSuccess(event, { credential, user }) {
    // The credential creation has been successful
    // We need to create a user if it does not exist
    const { signUpKey } = useRuntimeConfig();

    // Get the user from the database
    let dbUser = await db.select().from(users).where(eq(users.userName, user.userName));

    await db.transaction(async (tx) => {
      if (!dbUser.length) {
        // Store new user in database
        dbUser = await tx.insert(users).values({userName: user.userName}).returning();
      }

      // we now need to store the credential in our database and link it to the user
      await tx.insert(credentials).values({
        userId: dbUser[0].id,
        id: credential.id,
        publicKey: credential.publicKey,
        counter: credential.counter,
        backedUp: credential.backedUp ? 1 : 0,
        transports: JSON.stringify(credential.transports ?? [])
      });

      if (typeof user.inviteId === 'string' && user.inviteId !== signUpKey) {
        await tx.update(invites)
          .set({ used: true })
          .where(eq(invites.id, user.inviteId));
      }
    });
    // Set the user session
    await setUserSession(event, {
      user: {
        id: dbUser[0].id
      },
      loggedInAt: Date.now(),
    })
  },
})