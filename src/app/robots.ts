import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://santhaya.local';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/staff/', '/api/', '/(staff-auth)/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

