# Lucia Auth Adapter for Deno KV (Astro example)

This is an implementation of the KV adapter for lucia-auth using Deno Deploy and Deno KV.

Astro https://astro.build/

Lucia Auth https://lucia-auth.com/

Deno KV https://deno.com/kv

Astro+Deno example https://github.com/JLarky/astro-deno-template

The adapter implementation is in the https://github.com/JLarky/astro-lucia-deno-kv/blob/main/src/lib/deno.ts, I will be working on upstreaming that to lucia-auth soon.

Create project:

```bash
git clone https://github.com/JLarky/astro-lucia-deno-kv/blob/main/src/lib/deno.ts
cd astro-lucia-deno-kv
```

Patch undici:

```bash
deno task build
# you will see an error
deno task patch
# and try again
deno task build
```

Dev:

```bash
deno task dev
# open http://localhost:3000
```

Build & preview:

```bash
deno task build
deno task preview
# open http://localhost:8085
```

Deploy:

```bash
export DENO_DEPLOY_TOKEN=...
deno task deploy
```

This project is a part of Deno KV Hackathon https://deno.com/blog/deno-kv-hackathon

My submission https://github.com/denoland/deno-kv-hackathon/issues/5
