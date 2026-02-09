import { useEffect } from "react";
import { useLocation } from "react-router-dom";

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  type?: string;
}

const DEFAULT_SEO = {
  title: "Food FPS - Free Multiplayer Shooter Game",
  description: "Play Food FPS - the ultimate free multiplayer top-down shooter game. Battle online with friends, unlock weapons, customize skins, and climb the leaderboards!",
  keywords: "fps game, multiplayer shooter, online game, free game, browser game, top-down shooter, food fps, action game",
  image: "https://storage.googleapis.com/gpt-engineer-file-uploads/JVfrJefbC3blCqpROsS2XX5VPa12/uploads/1769895945780-IMG_4176.JPG",
  type: "website",
};

const PAGE_SEO: Record<string, { title: string; description: string; keywords?: string }> = {
  "/": {
    title: "Food FPS - Free Multiplayer Shooter Game | Play Now",
    description: "Join Food FPS - the ultimate free browser-based multiplayer shooter! Battle friends, unlock 12+ weapons, customize skins, and compete on global leaderboards.",
    keywords: "fps game, multiplayer shooter, free online game, browser shooter, food fps game, action game",
  },
  "/auth": {
    title: "Login or Sign Up | Food FPS",
    description: "Create your free Food FPS account or login to save your progress, compete on leaderboards, and unlock exclusive rewards.",
    keywords: "food fps login, create account, sign up, game account",
  },
  "/hacks": {
    title: "Game Features & Tips | Food FPS",
    description: "Learn about Food FPS game features, tips, tricks, and strategies to dominate the battlefield.",
    keywords: "food fps tips, game strategies, fps tricks, gameplay guide",
  },
  "/owner": {
    title: "Owner Access | Food FPS",
    description: "Owner access portal for Food FPS game administration.",
  },
};

export const SEOHead = ({ title, description, keywords, image, type }: SEOHeadProps) => {
  const location = useLocation();
  const pathname = location.pathname;
  
  const pageSEO = PAGE_SEO[pathname] || DEFAULT_SEO;
  const finalTitle = title || pageSEO.title || DEFAULT_SEO.title;
  const finalDescription = description || pageSEO.description || DEFAULT_SEO.description;
  const finalKeywords = keywords || (pageSEO as any).keywords || DEFAULT_SEO.keywords;
  const finalImage = image || DEFAULT_SEO.image;
  const finalType = type || DEFAULT_SEO.type;
  
  const canonicalUrl = `https://foodfps.lovable.app${pathname}`;

  useEffect(() => {
    // Update document title
    document.title = finalTitle;

    // Helper to update or create meta tags
    const updateMeta = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? "property" : "name";
      let element = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attr, name);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    // Helper to update or create link tags
    const updateLink = (rel: string, href: string) => {
      let element = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
      if (!element) {
        element = document.createElement("link");
        element.setAttribute("rel", rel);
        document.head.appendChild(element);
      }
      element.setAttribute("href", href);
    };

    // Standard meta tags
    updateMeta("description", finalDescription);
    updateMeta("keywords", finalKeywords);
    updateMeta("robots", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
    updateMeta("author", "Food FPS");
    updateMeta("viewport", "width=device-width, initial-scale=1.0");

    // Open Graph tags
    updateMeta("og:title", finalTitle, true);
    updateMeta("og:description", finalDescription, true);
    updateMeta("og:image", finalImage, true);
    updateMeta("og:type", finalType, true);
    updateMeta("og:url", canonicalUrl, true);
    updateMeta("og:site_name", "Food FPS", true);
    updateMeta("og:locale", "en_US", true);

    // Twitter Card tags
    updateMeta("twitter:card", "summary_large_image");
    updateMeta("twitter:title", finalTitle);
    updateMeta("twitter:description", finalDescription);
    updateMeta("twitter:image", finalImage);
    updateMeta("twitter:site", "@foodfps");

    // Canonical URL
    updateLink("canonical", canonicalUrl);

    // Cleanup function not needed as we're updating, not removing
  }, [finalTitle, finalDescription, finalKeywords, finalImage, finalType, canonicalUrl]);

  return null;
};

// JSON-LD Structured Data Component
export const StructuredData = () => {
  useEffect(() => {
    // Remove any existing structured data
    const existing = document.querySelectorAll('script[type="application/ld+json"]');
    existing.forEach(el => el.remove());

    // Website Schema
    const websiteSchema = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "Food FPS",
      "url": "https://foodfps.lovable.app",
      "description": "Free multiplayer top-down shooter game with customizable skins and weapons",
      "potentialAction": {
        "@type": "PlayAction",
        "target": "https://foodfps.lovable.app"
      }
    };

    // VideoGame Schema
    const gameSchema = {
      "@context": "https://schema.org",
      "@type": "VideoGame",
      "name": "Food FPS",
      "url": "https://foodfps.lovable.app",
      "description": "Action-packed multiplayer top-down shooter with multiple weapons. Play solo or with friends online!",
      "genre": ["Shooter", "Action", "Multiplayer"],
      "gamePlatform": ["Web Browser", "Desktop", "Mobile"],
      "applicationCategory": "Game",
      "operatingSystem": "Any",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.5",
        "ratingCount": "1000",
        "bestRating": "5",
        "worstRating": "1"
      }
    };

    // Organization Schema
    const orgSchema = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Food FPS",
      "url": "https://foodfps.lovable.app",
      "logo": "https://storage.googleapis.com/gpt-engineer-file-uploads/JVfrJefbC3blCqpROsS2XX5VPa12/uploads/1769895945780-IMG_4176.JPG",
      "sameAs": []
    };

    // Breadcrumb Schema
    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://foodfps.lovable.app"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Play Game",
          "item": "https://foodfps.lovable.app"
        }
      ]
    };

    // Add all schemas
    const schemas = [websiteSchema, gameSchema, orgSchema, breadcrumbSchema];
    schemas.forEach(schema => {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
    });

    return () => {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      scripts.forEach(el => el.remove());
    };
  }, []);

  return null;
};
