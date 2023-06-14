// pages/api/logout.ts
import { getAuth } from "../../lib/lucia";
import type { APIRoute } from "astro";

export const prerender = false;

export const post: APIRoute = async (Astro) => {
  const auth = getAuth(await Deno.openKv());
  const authRequest = auth.handleRequest(Astro);
  const { session } = await authRequest.validateUser();
  if (!session) {
    return new Response(null, {
      status: 400,
    });
  }

  await auth.invalidateSession(session.sessionId); // invalidate current session
  authRequest.setSession(null); // clear session cookie

  // redirect to login page
  return new Response(null, {
    status: 302,
    headers: {
      location: "/login",
    },
  });
};
