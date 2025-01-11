import type { User as DBuser } from './db/schema';

declare module '#auth-utils' {
  interface User {
    id?: DBuser.id,
    userName?: DBuser.userName
  }

  interface UserSession {
    user: {
      id: number
    },
    loggedInAt: number,
  }

  interface SecureSessionData {}
}

export {}