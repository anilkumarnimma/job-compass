import { useMemo } from "react";

const COMPANIES = [
  "Google",
  "Microsoft",
  "Amazon",
  "Apple",
  "Meta",
  "Netflix",
  "Tesla",
  "Nvidia",
  "Adobe",
  "Salesforce",
  "Oracle",
  "IBM",
  "Intel",
  "Spotify",
  "Airbnb",
  "Uber",
  "Stripe",
  "Shopify",
  "LinkedIn",
  "Snowflake",
];

function logoUrl(company: string) {
  const domainMap: Record<string, string> = {
    Google: "google.com",
    Microsoft: "microsoft.com",
    Amazon: "amazon.com",
    Apple: "apple.com",
    Meta: "meta.com",
    Netflix: "netflix.com",
    Tesla: "tesla.com",
    Nvidia: "nvidia.com",
    Adobe: "adobe.com",
    Salesforce: "salesforce.com",
    Oracle: "oracle.com",
    IBM: "ibm.com",
    Intel: "intel.com",
    Spotify: "spotify.com",
    Airbnb: "airbnb.com",
    Uber: "uber.com",
    Stripe: "stripe.com",
    Shopify: "shopify.com",
    LinkedIn: "linkedin.com",
    Snowflake: "snowflake.com",
  };
  const domain = domainMap[company] ?? `${company.toLowerCase()}.com`;
  return `https://logo.clearbit.com/${domain}`;
}

export function CompanyLogoMarquee() {
  // Duplicate list for a seamless infinite scroll
  const items = useMemo(() => [...COMPANIES, ...COMPANIES], []);

  return (
    <div className="relative w-full overflow-hidden mb-10" aria-label="Featured companies">
      {/* Edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent z-10" />

      <div className="flex w-max animate-logo-marquee gap-12 py-2">
        {items.map((company, idx) => (
          <div
            key={`${company}-${idx}`}
            className="flex items-center justify-center h-12 w-32 shrink-0 opacity-60 hover:opacity-100 transition-opacity duration-300 grayscale hover:grayscale-0"
            title={company}
          >
            <img
              src={logoUrl(company)}
              alt={`${company} logo`}
              loading="lazy"
              className="max-h-10 max-w-[120px] object-contain"
              onError={(e) => {
                // Fallback to plain company name if logo fails to load
                const target = e.currentTarget;
                target.style.display = "none";
                const parent = target.parentElement;
                if (parent && !parent.querySelector(".logo-fallback")) {
                  const span = document.createElement("span");
                  span.className =
                    "logo-fallback font-display font-semibold text-foreground/70 text-base";
                  span.textContent = company;
                  parent.appendChild(span);
                }
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
