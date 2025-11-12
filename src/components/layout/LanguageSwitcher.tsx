"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { Globe } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { locales, localeNames, type Locale } from "@/lib/i18n/config";

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isUpdating, setIsUpdating] = useState(false);

  // Get alternative locale (the one NOT currently active)
  const alternativeLocale = locales.find((loc) => loc !== locale) ?? locales[0];
  const alternativeName = localeNames[alternativeLocale];

  const switchLanguage = async (newLocale: Locale) => {
    if (newLocale === locale || isUpdating) return;

    setIsUpdating(true);
    try {
      // Save locale preference to profile
      await fetch("/api/profile/locale", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: newLocale }),
      });

      // Update URL with new locale
      const segments = pathname.split("/").filter(Boolean);
      const currentLocale = segments[0];

      // Remove current locale if present
      if (locales.includes(currentLocale as Locale)) {
        segments.shift();
      }

      // Add new locale (only if not default)
      const newPath = newLocale === "en" ? `/${segments.join("/")}` : `/${newLocale}/${segments.join("/")}`;

      router.push(newPath || "/");
      router.refresh();
    } catch (error) {
      console.error("Error switching language:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2" disabled={isUpdating}>
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline-block">{locale.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => void switchLanguage(alternativeLocale)} disabled={isUpdating}>
          {alternativeName}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

