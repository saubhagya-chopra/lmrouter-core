import app from "./app.js";
import { getConfig } from "./utils/config.js";

const main = () => {
  const config = getConfig();
  app.listen(config.server.port, config.server.host, () => {
    console.log(
      `LMRouter Core listening on http://${config.server.host}:${config.server.port}/`,
    );
  });
};

main();
