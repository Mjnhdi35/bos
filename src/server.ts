import { app } from "./app";
import { env } from "./env";

app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`BOS API listening on port ${String(env.PORT)}`);
});
