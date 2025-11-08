import React, { useEffect } from 'react';

// Simple component to provide canonical and meta description for SEO
const SEO: React.FC<{ title: string; description?: string; canonicalPath?: string }>= ({ title, description, canonicalPath }) => {
  useEffect(() => {
    document.title = title;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    if (description) meta.setAttribute('content', description);

    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    if (canonicalPath) link.href = `${window.location.origin}${canonicalPath}`;
  }, [title, description, canonicalPath]);

  return null;
};

export default SEO;
