import type { MetadataRoute } from "next";

function getAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://foretagsnamn.app").replace(/\/+$/, "");
}

export default function sitemap(): MetadataRoute.Sitemap {
  const appUrl = getAppUrl();
  const now = new Date();

  return [
    {
      url: appUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
