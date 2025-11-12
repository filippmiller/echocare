import { getRequestConfig } from "next-intl/server";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { defaultLocale } from "./config";

export default getRequestConfig(async () => {
  // Try to get user's preferred locale from profile
  let locale = defaultLocale;

  try {
    const session = await getServerAuthSession();
    if (session) {
      const profile = await prisma.profile.findUnique({
        where: { userId: session.user.id },
        select: { locale: true },
      });

      if (profile?.locale && (profile.locale === "en" || profile.locale === "ru")) {
        locale = profile.locale as "en" | "ru";
      }
    }
  } catch (error) {
    console.error("Error getting user locale:", error);
    // Fallback to default locale
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});

