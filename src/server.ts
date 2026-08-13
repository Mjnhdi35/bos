import { createApp } from "./app/create-app";
import { env } from "./shared/config/env";

const app = createApp();

app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`BOS API listening on port ${String(env.PORT)}`);
});
