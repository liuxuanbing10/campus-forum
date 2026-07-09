import { Helmet } from 'react-helmet-async';

interface MetaManagerProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'profile';
  twitterCard?: 'summary' | 'summary_large_image';
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  canonical?: string;
  url?: string;
}

export default function MetaManager({
  title,
  description = '校园交流论坛 - 分享知识，连接校园',
  keywords = '校园论坛,社区,交流,校园生活,学习',
  ogTitle,
  ogDescription,
  ogImage,
  ogType = 'website',
  twitterCard = 'summary',
  twitterTitle,
  twitterDescription,
  twitterImage,
  canonical,
  url,
}: MetaManagerProps) {
  const siteTitle = '校园论坛';
  const fullTitle = title ? `${title} - ${siteTitle}` : siteTitle;
  const pageUrl = url || window.location.href;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content="Campus Forum" />
      <meta name="theme-color" content="#4f46e5" />
      
      {canonical && <link rel="canonical" href={canonical} />}

      {/* Open Graph */}
      <meta property="og:title" content={ogTitle || fullTitle} />
      <meta property="og:description" content={ogDescription || description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:site_name" content={siteTitle} />
      {ogImage && <meta property="og:image" content={ogImage} />}

      {/* Twitter Card */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={twitterTitle || fullTitle} />
      <meta name="twitter:description" content={twitterDescription || description} />
      {twitterImage && <meta name="twitter:image" content={twitterImage} />}

      {/* Structured Data (JSON-LD) */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": ogType === 'article' ? 'Article' : ogType === 'profile' ? 'Person' : 'WebSite',
          name: fullTitle,
          description,
          url: pageUrl,
          ...(ogType === 'article' && {
            author: {
              "@type": "Person",
              name: "Campus Forum",
            },
          }),
        })}
      </script>
    </Helmet>
  );
}
