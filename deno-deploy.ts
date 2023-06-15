const p = Deno.run({ cmd: ["deno", "task", "build"] });

await p.status();

console.log(p);

const p2 = Deno.run({ cmd: ["ls", "-l"] });

await p2.status();

console.log(p2);

const p3 = Deno.run({ cmd: ["pwd"] });

await p3.status();

console.log(p3);

console.error(`Starting on http://localhost:8085`);

await import("./dist/server/entry.mjs");
