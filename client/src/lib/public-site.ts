export const PUBLIC_CONTACT = {
  email: "eagle@eagleeyeautomation.com",
  phoneDisplay: "+1 571-462-2407",
  mailto: "mailto:eagle@eagleeyeautomation.com",
  tel: "tel:+15714622407",
};

export const SETUP_FEE = {
  label: "One-Time Setup and Onboarding Fee",
  price: "$250",
  disclosure: "The one-time setup and onboarding fee is due when onboarding begins and is separate from the monthly subscription.",
  covers: [
    "Account setup",
    "Organization configuration",
    "GoHighLevel connection",
    "Location setup",
    "Initial data synchronization",
    "Dashboard configuration",
    "Basic customer training",
    "Launch support",
  ],
};

export const FOUNDING_CUSTOMER_PROMO_ENABLED = false;

export const FOUNDING_CUSTOMER_PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "$99",
    cadence: "/month",
    customerType: "For a single-location business beginning with executive visibility.",
    locationLimit: "1 GoHighLevel location",
    cta: "Request Starter Demo",
    features: [
      "Owner Command Center access",
      "GoHighLevel connection",
      "Executive briefing from synchronized data",
      "Business health view when enough verified activity exists",
      "Integration status",
      "Secure owner sign-in",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    price: "$199",
    cadence: "/month",
    customerType: "For a growing business that needs clearer follow-up and operating visibility.",
    locationLimit: "Up to 3 GoHighLevel locations",
    cta: "Request Growth Demo",
    featured: true,
    features: [
      "Everything in Starter",
      "Multi-location command center views",
      "Executive timeline from verified events",
      "Knowledge graph when synchronized data is available",
      "AI recommendations when verified signals support them",
      "Launch support for leadership review",
    ],
  },
  {
    id: "scale",
    name: "Scale",
    price: "$299",
    cadence: "/month",
    customerType: "For a multi-location operator preparing for deeper executive intelligence.",
    locationLimit: "Up to 5 GoHighLevel locations",
    cta: "Request Scale Demo",
    features: [
      "Everything in Growth",
      "Expanded location setup",
      "Owner and operations review support",
      "Priority dashboard configuration",
      "Workflow automation planning",
      "GoHighLevel-first operating system roadmap",
    ],
  },
];

export const EEOS_BRAIN_QUESTIONS = [
  "What can EEOS do for my business?",
  "How can EEOS help me grow?",
  "Which plan fits my company?",
  "How does EEOS connect to GoHighLevel?",
  "How can AI help me manage smarter?",
];
