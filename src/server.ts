import { createApp } from "./app/create-app";
import { env } from "./shared/config/env";

async function main(): Promise<void> {
  const app = await createApp();
  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`BOS API listening on port ${String(env.PORT)}`);
  });
}

void main();
