const parseJson = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export const getApiErrorMessage = (err: unknown): string => {
  if (err instanceof Error) {
    const trimmed = err.message.trim();
    const parsed = parseJson(trimmed);
    if (parsed && typeof parsed === "object" && "message" in parsed) {
      return String((parsed as { message: unknown }).message);
    }
    return trimmed || "Something went wrong.";
  }
  return "Something went wrong.";
};

import { toast } from "sonner";

type ToastVariant = "default" | "success" | "error" | "info";

const buildMessage = (title?: string, text?: string) => {
  if (title && text) return title;
  return title ?? text ?? "Something happened.";
};

const buildDescription = (title?: string, text?: string) => {
  if (title && text) return text;
  return undefined;
};

export function showToast(options: {
  title?: string;
  text?: string;
  variant?: ToastVariant;
}) {
  if (typeof window === "undefined") return;

  const { title, text, variant = "default" } = options;
  const message = buildMessage(title, text);
  const description = buildDescription(title, text);
  const config = description ? { description } : undefined;

  switch (variant) {
    case "success":
      toast.success(message, config);
      break;
    case "error":
      toast.error(message, config);
      break;
    case "info":
      toast(message, config);
      break;
    default:
      toast(message, config);
  }
}
