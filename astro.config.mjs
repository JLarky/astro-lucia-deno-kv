import { defineConfig } from "astro/config";
import deno from "npm:@astrojs/deno";

// to manage deno deps
import "lucia-auth";

// https://astro.build/config
export default defineConfig({
  output: "hybrid",
  adapter: deno(),
});
