import type { Locale } from "./config";
import type messages from "../../messages/en.json";

// Typed locales and message keys (en.json is the source of truth).
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
