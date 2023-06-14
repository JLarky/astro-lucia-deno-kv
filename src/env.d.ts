/// <reference types="astro/client" />
/// <reference types="lucia-auth" />
/// <reference types="./types/lib.deno" />
declare namespace Lucia {
  type Auth = import("./lib/lucia").Auth;
  type UserAttributes = {
    username: string;
  };
}
