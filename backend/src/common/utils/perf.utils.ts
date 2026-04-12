import { Logger } from "@nestjs/common";
import { performance } from "perf_hooks";

export async function measureAsync<T>(
  logger: Logger,
  label: string,
  work: () => Promise<T>,
  warnThresholdMs = 500
): Promise<T> {
  const startedAt = performance.now();
  try {
    return await work();
  } finally {
    const durationMs = performance.now() - startedAt;
    const message = `${label} completed in ${durationMs.toFixed(1)}ms`;
    if (durationMs >= warnThresholdMs) {
      logger.warn(message);
    } else {
      logger.debug(message);
    }
  }
}
