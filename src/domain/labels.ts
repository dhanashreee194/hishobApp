export const BUSINESS_LABEL: Record<string, string> = {
  flour: 'गिरणी',
  vegetable: 'भाजी',
  milk: 'दूध',
  general: 'सामाईक',
};

export const PARTNER_BUSINESS_LABEL: Record<string, string> = {
  vegetable: 'भाजी',
  flour: 'गिरणी',
  milk: 'दूध',
  general: 'इतर',
};

export const STANDING_LABEL = {
  paid: 'पूर्ण भरले',
  partial: 'अंशतः',
  pending: 'बाकी',
} as const;

export const OWNERSHIP_LABEL = {
  own: 'स्वतःचे उत्पन्न',
  shared: 'सामाईक उत्पन्न',
} as const;

export const PAYMENT_MODE_LABEL: Record<string, string> = {
  cash: 'रोख',
  upi: 'यूपीआय',
  bank: 'बँक',
};

export const MILK_RATE_ITEM_ID = 'milk';

export function businessLabel(value: string): string {
  return BUSINESS_LABEL[value] ?? value;
}

export function flourDisplayName(storedName: string, customName?: string | null): string {
  const custom = customName?.trim();
  return custom || storedName;
}
