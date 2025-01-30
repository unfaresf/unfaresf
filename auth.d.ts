import type { SelectUser as DBuser } from './db/schema';

declare module '#auth-utils' {
  interface User {
    id?: DBuser['id'],
    userName?: DBuser['userName'],
    roles: DBuser['roles'],
  }

  interface UserSession {
    user: {
      id: DBuser['id'],
      userName?: DBuser['userName'],
      role: DBuser['roles'],
    },
    loggedInAt: number,
  }

  interface SecureSessionData {}
}

export {}