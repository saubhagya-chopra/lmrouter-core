import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import logger from "morgan";
import requestIp from "request-ip";

import v1Router from "./routes/v1/v1.js";
import { getConfig } from "./utils/config.js";
import { getUptime } from "./utils/utils.js";

const app = express();
const cfg = getConfig();

logger.token(
  "clientIp",
  (req: express.Request, res: express.Response) => req.clientIp,
);
if (cfg.server.logging === "dev") {
  app.use(logger("dev"));
} else {
  app.use(
    logger(
      ':clientIp - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms',
    ),
  );
}

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(requestIp.mw());

app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    message: "Welcome to LMRouter Core!",
    uptime: getUptime(),
    apis_available: ["v1"],
  });
});

app.use("/v1", v1Router);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: {
      message: "Internal Server Error",
      stack: cfg.server.logging === "dev" ? err.stack : undefined,
    },
  });
});

app.all("*splat", (req: Request, res: Response) => {
  res.status(404).json({
    error: {
      message: "Not Found",
    },
  });
});

export default app;
