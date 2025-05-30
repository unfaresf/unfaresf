// server/api/webauthn/register.post.ts
import { and, eq, sql, between, inArray } from 'drizzle-orm';
import { users, credentials, invites, Roles, type Credential } from '../../../db/schema';
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

    return {
      userName,
      inviteId,
      roles: [Roles.Admin]
    };
  },
  async onSuccess(event, { credential, user }) {
    // The credential creation has been successful
    // We need to create a user if it does not exist
    const { signUpKey } = useRuntimeConfig();

    // are they using the root env var sign up key?
    const usingSignUpKey = user.inviteId === signUpKey;

    // Get the user from the database
    let dbUser = await db.select().from(users).where(eq(users.userName, user.userName));

    /*
     * Begin Transaction: This should be done in a transaction but isn't because of a long
     * running bug in Drizzle ORM that throws an error when using an async function as
     * the transation callback.
     * See ticket: https://github.com/drizzle-team/drizzle-orm/issues/2275
    */
    if (!dbUser.length) {
      // Store new user in database
      // If using the env var sign up key, give admin permissions.
      dbUser = await db.insert(users).values({
        userName: user.userName,
        roles: JSON.stringify(usingSignUpKey ? [Roles.Admin, Roles.Editor] : [Roles.Editor]),
      }).returning();
    }

    let newCred: Credential[];
    try {
      // we now need to store the credential in our database and link it to the user
      newCred = await db.insert(credentials).values({
        userId: dbUser[0].id,
        id: credential.id,
        publicKey: credential.publicKey,
        counter: credential.counter,
        backedUp: credential.backedUp ? 1 : 0,
        transports: JSON.stringify(credential.transports ?? [])
      }).returning();
    } catch (error) {
      // this is an ugly hack because transactions are broken.
      await db.delete(users).where(inArray(users.id, dbUser.map(u => u.id)));
      throw error;
    }

    if (typeof user.inviteId === 'string' && !usingSignUpKey) {
      try {
        await db.update(invites)
          .set({ used: true })
          .where(eq(invites.id, user.inviteId));
      } catch (error) {
        // this is an ugly hack because transactions are broken.
        await db.delete(users).where(inArray(users.id, dbUser.map(u => u.id)));
        await db.delete(credentials).where(inArray(credentials.id, newCred.map(c => c.id)));
        throw error;
      }

    }

    // Set the user session
    await setUserSession(event, {
      user: {
        id: dbUser[0].id,
        userName: dbUser[0].userName,
        roles: JSON.parse(dbUser[0].roles),
      },
      loggedInAt: Date.now(),
    })
  },
})