import type { PortalLink } from "./types";

export const PORTAL_HOST =
  process.env.NEXT_PUBLIC_PORTAL_HOST || process.env.PORTAL_HOST || "lms.solo-pr.ru";

export function chromeLinks(role: "staff" | "learner" | null): PortalLink[] {
  const all: PortalLink[] = [
    { id: "lms", label: "LMS", href: `https://${PORTAL_HOST}/` },
    { id: "cms", label: "CMS", href: "https://cms.solo-pr.ru/" },
    { id: "crm", label: "CRM", href: "https://crm.solo-pr.ru/" },
    { id: "voronka", label: "Воронка", href: "https://voronka.solo-pr.ru/ops/" },
  ];
  if (role === "staff") return all;
  // Learner: only public brand + LMS; no staff chrome.
  return [
    { id: "site", label: "solo-pr.ru", href: "https://solo-pr.ru/" },
    { id: "lms", label: "Учёба", href: `https://${PORTAL_HOST}/learner` },
  ];
}
