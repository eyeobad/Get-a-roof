import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import mongoSanitize = require("express-mongo-sanitize");
import { json, urlencoded } from "express";
import { AppModule } from "./app.module";

const defaultCorsOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

const parseCorsOrigins = () => {
  const raw = process.env.CORS_ORIGINS;
  if (!raw) return defaultCorsOrigins;
  const origins = raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return origins.length ? origins : defaultCorsOrigins;
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins = parseCorsOrigins();
  app.set("trust proxy", 1);
  app.use(helmet({ crossOriginResourcePolicy: false }));
  const sanitizePayload = (payload: unknown) => {
    if (!payload || typeof payload !== "object") return;
    mongoSanitize.sanitize(payload, { replaceWith: "_" });
  };
  app.use((req, _res, next) => {
    sanitizePayload(req.body);
    sanitizePayload(req.params);
    sanitizePayload(req.query);
    next();
  });
  app.use(json({ limit: "1mb" }));
  app.use(urlencoded({ extended: true, limit: "1mb" }));

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes("*")) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"), false);
    },
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    })
  );

  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port);
}

bootstrap();
