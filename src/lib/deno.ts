import type {
  SessionSchema,
  Adapter,
  AdapterFunction,
  KeySchema,
  UserSchema,
} from "lucia-auth";

export const DEFAULT_SESSION_PREFIX = "session";
export const DEFAULT_USER_SESSIONS_PREFIX = "user_sessions";
export const DEFAULT_USER_KEYS_PREFIX = "user_keys";
export const DEFAULT_KEY_PREFIX = "key";
export const DEFAULT_USER_PREFIX = "user";

export const denoKvAdapter = (
  kv: Deno.Kv,
  prefixes?: {
    session: string;
    userSessions: string;
    userKeys: string;
    user: string;
    key: string;
  }
): AdapterFunction<Adapter> => {
  const sessionKey = (sessionId: string) => {
    invariant(sessionId !== undefined, "sessionId is required");
    return [prefixes?.session ?? DEFAULT_SESSION_PREFIX, sessionId];
  };
  const userSessionsKey = (userId: string) => {
    invariant(userId !== undefined, "userId is required");
    return [prefixes?.userSessions ?? DEFAULT_USER_SESSIONS_PREFIX, userId];
  };
  const userKeysKey = (userId: string) => {
    invariant(userId !== undefined, "userId is required");
    return [prefixes?.userKeys ?? DEFAULT_USER_KEYS_PREFIX, userId];
  };
  const userKey = (userId: string) => {
    invariant(userId !== undefined, "userId is required");
    return [prefixes?.user ?? DEFAULT_USER_PREFIX, userId];
  };
  const keyKey = (keyId: string) => {
    invariant(keyId !== undefined, "keyId is required");
    return [prefixes?.key ?? DEFAULT_KEY_PREFIX, keyId];
  };

  return (LuciaError) => {
    return proxyDebug({
      getUser: async (userId) => {
        const user = await kv.get<Omit<UserSchema, "id">>(userKey(userId));
        if (user.value) {
          return { id: userId, ...user.value };
        }
        return null;
      },
      setUser: async (userId, attributes, key) => {
        if (key) {
          const existingKey = await kv.get<typeof key>(keyKey(key.id));
          if (existingKey.value) {
            throw new LuciaError("AUTH_DUPLICATE_KEY_ID");
          }
        }
        const tx = kv.atomic().set(userKey(userId), attributes);
        if (key) {
          const userKeys = await kv.get<string[]>(userKeysKey(userId));
          const newUserKeys = [...(userKeys.value || []), key.id];
          tx.set(keyKey(key.id), key);
          tx.set(userKeysKey(userId), newUserKeys);
        }
        const res = await tx.commit();
        if (!res.ok) {
          throw new LuciaError("UNKNOWN_ERROR");
        }
        return {
          id: userId,
          ...(attributes as any as Omit<UserSchema, "id">),
        };
      },
      deleteUser: async (userId) => {
        await kv.delete(userKey(userId));
      },
      updateUserAttributes: async (userId, partialUser) => {
        const user = await kv.get<Omit<UserSchema, "id">>(userKey(userId));
        if (!user.value) {
          throw new LuciaError("AUTH_INVALID_USER_ID");
        }
        const newAttributes = { ...user.value, ...partialUser };
        const tx = kv.atomic();
        tx.check(user);
        tx.set(userKey(userId), newAttributes);
        const res = await tx.commit();
        if (!res.ok) {
          throw new LuciaError("UNKNOWN_ERROR");
        }
        return { id: userId, ...newAttributes };
      },
      getSession: async (sessionId) => {
        const session = await kv.get<SessionSchema>(sessionKey(sessionId));
        return session.value;
      },
      getSessionsByUserId: async (userId) => {
        const sessionIds = await kv.get<string[]>(userSessionsKey(userId));
        const sessionData = await Promise.all(
          (sessionIds.value || []).map((sessionId) =>
            kv.get<SessionSchema>(sessionKey(sessionId))
          )
        );
        const sessions = sessionData
          .map((val) => val.value as SessionSchema | null)
          .filter((val): val is SessionSchema => val !== null);
        return sessions;
      },
      setSession: async (session) => {
        console.log("setSession", session);
        if (!session.user_id) {
          throw new LuciaError("AUTH_INVALID_USER_ID");
        }
        const user = await kv.get(userKey(session.user_id));
        if (!user.value) {
          throw new LuciaError("AUTH_INVALID_USER_ID");
        }
        const existingSession = await kv.get<SessionSchema>(
          sessionKey(session.id)
        );
        if (existingSession.value) {
          throw new LuciaError("AUTH_DUPLICATE_SESSION_ID");
        }
        const existingSessions = await kv.get<string[]>(
          userSessionsKey(session.user_id)
        );
        const newSessions = [...(existingSessions.value || []), session.id];
        const tx = kv.atomic();
        tx.check(existingSessions);
        tx.set(sessionKey(session.id), session);
        tx.set(userSessionsKey(session.user_id), newSessions);
        const res = await tx.commit();
        if (!res.ok) {
          throw new LuciaError("UNKNOWN_ERROR");
        }
      },
      deleteSession: async (sessionId) => {
        kv.delete(sessionKey(sessionId));
      },
      deleteSessionsByUserId: async (userId) => {
        if (userId) {
          await kv.delete(userSessionsKey(userId));
        }
      },

      getKey: async (keyId) => {
        const key = await kv.get<KeySchema>(keyKey(keyId));
        return key.value;
      },
      getKeysByUserId: async (userId) => {
        const userKeyIds = await kv.get<string[]>(userKeysKey(userId));
        const keyData = await Promise.all(
          (userKeyIds.value || []).map((keyId) =>
            kv.get<KeySchema>(keyKey(keyId))
          )
        );
        const keys = keyData
          .map((val) => val.value as KeySchema | null)
          .filter((val): val is KeySchema => val !== null);
        return keys;
      },

      setKey: async (key) => {
        if (!key.user_id) {
          throw new LuciaError("AUTH_INVALID_USER_ID");
        }
        const user = await kv.get(userKey(key.user_id));
        if (!user.value) {
          throw new LuciaError("AUTH_INVALID_USER_ID");
        }
        const existingKey = await kv.get<KeySchema>(sessionKey(key.id));
        if (existingKey.value) {
          throw new LuciaError("AUTH_DUPLICATE_KEY_ID");
        }
        await kv.set(keyKey(key.id), key);
      },
      deleteNonPrimaryKey: async (keyId) => {
        await kv.delete(keyKey(keyId));
      },
      deleteKeysByUserId: async (userId) => {
        const userKeyIds = await kv.get<string[]>(userKeysKey(userId));
        const tx = kv.atomic();
        tx.check(userKeyIds);
        if (userKeyIds.value) {
          userKeyIds.value.map((keyId) => tx.delete(keyKey(keyId)));
        }
        tx.delete(userKeysKey(userId));
        const res = await tx.commit();
        if (!res.ok) {
          throw new LuciaError("UNKNOWN_ERROR");
        }
      },
      updateKeyPassword: async (userId, hashedPassword) => {
        const key = await kv.get<KeySchema>(keyKey(userId));
        if (!key.value) {
          throw new LuciaError("AUTH_INVALID_KEY_ID");
        }
        const newAttributes = { ...key.value, hashed_password: hashedPassword };
        const tx = kv.atomic();
        tx.check(key);
        tx.set(keyKey(userId), newAttributes);
        const res = await tx.commit();
        if (!res.ok) {
          throw new LuciaError("UNKNOWN_ERROR");
        }
        return newAttributes;
      },
      // we can't get the user from the session in one query in Deno KV
      // not implemented: getSessionAndUserBySessionId
    } satisfies Adapter);
  };
};

const isProduction = !import.meta.env.DEV;

function invariant(
  condition: boolean,
  onError?: string | (() => void),
  devOnly?: string | (() => void)
): asserts condition {
  // License MIT: https://github.com/alexreardon/tiny-invariant/blob/master/LICENSE
  // License MIT: https://github.com/iyegoroff/ts-tiny-invariant/blob/master/LICENSE
  if (condition) {
    return;
  }

  if (!isProduction) {
    const provided = typeof devOnly === "function" ? devOnly() : devOnly;
    if (provided) {
      throw new Error("Invariant failed " + provided);
    }
  }

  const provided = typeof onError === "function" ? onError() : onError;
  throw new Error("Invariant failed" + (provided ? " " + provided : ""));
}

function proxyDebug<T extends { [key: string]: unknown }>(t: T): T {
  if (isProduction) return t;
  const handler = {
    get(target: T, property: any) {
      console.log(`> Property ${property} has been read.`);
      const fn = target[property];
      if (typeof fn === "function") {
        return function (this: any, ...args: any[]) {
          console.log(`> Calling ${property} with`, args);
          const out = fn.apply(this, args);
          if (out instanceof Promise) {
            out
              .then((result) => {
                console.log("> promise result", result);
              })
              .catch((err) => {
                console.log("> promise error", err);
              });
          }
          console.log("> result", out);
          return out;
        };
      }
      return target[property];
    },
  };
  return new Proxy(t, handler);
}
