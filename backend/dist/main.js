"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const helmet_1 = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const express_1 = require("express");
const app_module_1 = require("./app.module");
const defaultCorsOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
];
const normalizeOrigin = (origin) => origin.trim().replace(/\/+$/, "");
const parseCorsOrigins = () => {
    const raw = process.env.CORS_ORIGINS;
    const envOrigins = (raw ?? "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
        .map(normalizeOrigin);
    const defaults = defaultCorsOrigins.map(normalizeOrigin);
    const allowed = [...new Set([...defaults, ...envOrigins])];
    return allowed.length ? allowed : defaults;
};
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const allowedOrigins = parseCorsOrigins();
    app.set("trust proxy", 1);
    app.use((0, helmet_1.default)({ crossOriginResourcePolicy: false }));
    const sanitizePayload = (payload) => {
        if (!payload || typeof payload !== "object")
            return;
        mongoSanitize.sanitize(payload, { replaceWith: "_" });
    };
    app.use((req, _res, next) => {
        sanitizePayload(req.body);
        sanitizePayload(req.params);
        sanitizePayload(req.query);
        next();
    });
    app.use((0, express_1.json)({ limit: "1mb" }));
    app.use((0, express_1.urlencoded)({ extended: true, limit: "1mb" }));
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin)
                return callback(null, true);
            if (allowedOrigins.includes("*"))
                return callback(null, true);
            if (allowedOrigins.includes(normalizeOrigin(origin)))
                return callback(null, true);
            return callback(new Error("Not allowed by CORS"), false);
        },
        credentials: true,
        methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    const port = process.env.PORT ? Number(process.env.PORT) : 3001;
    await app.listen(port);
}
bootstrap();
