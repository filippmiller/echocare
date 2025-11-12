import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "./i18n/config";

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "as-needed", // Don't prefix default locale (en)
});

export const config = {
  // Match all pathnames except for
  // - API routes
  // - _next (Next.js internals)
  // - static files (e.g., favicon.ico)
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};

