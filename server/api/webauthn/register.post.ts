// server/api/webauthn/register.post.ts
import { and, eq, sql, between } from 'drizzle-orm';
import { users, credentials, invites, Roles, type InsertUser, type SelectUser, type InsertCredential } from '../../../db/schema';
import { DB as db } from '../../sqlite-service';
import { validate as uuidValidate } from 'uuid';
import type { WebAuthnCredential } from '#auth-utils';


const insertUser = db.$client.prepare<InsertUser, SelectUser>('INSERT INTO users (userName, roles) VALUES (@userName, @roles) RETURNING *');
const insertCredential = db.$client.prepare<InsertCredential, void>('INSERT INTO credentials (userId, id, publicKey, counter, backedUp, transports) VALUES (@userId, @id, @publicKey, @counter, @backedUp, @transports)');
const updateInvte = db.$client.prepare<[boolean, number], void>('UPDATE invites SET used = ? WHERE id = ?');

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

    (db.$client.transaction((user:{ userName: string; inviteId: unknown; roles: Roles[]; }, credential:WebAuthnCredential) => {
      let userId = dbUser[0].id;

      if (!dbUser.length) {
        // Store new user in database
        // If using the env var sign up key, give admin permissions
        const insertResult = insertUser.run({
          ...user,
          roles: JSON.stringify(usingSignUpKey ? [Roles.Admin, Roles.Editor] : [Roles.Editor]),
        });
        userId = Number(insertResult.lastInsertRowid);
      }

      // we now need to store the credential in our database and link it to the user
      insertCredential.run({
        userId: userId,
        id: credential.id,
        publicKey: credential.publicKey,
        counter: credential.counter,
        backedUp: credential.backedUp ? 1 : 0,
        transports: JSON.stringify(credential.transports ?? [])
      });

      if (typeof user.inviteId === 'string' && !usingSignUpKey) {
        updateInvte.run(true, userId);
      }
    }))(user, credential);

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