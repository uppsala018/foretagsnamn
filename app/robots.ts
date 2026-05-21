import type { MetadataRoute } from "next";

function getAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://foretagsnamn.app").replace(/\/+$/, "");
}

export default function robots(): MetadataRoute.Robots {
  const appUrl = getAppUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
