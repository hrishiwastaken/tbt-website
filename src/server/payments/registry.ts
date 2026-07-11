import type { PaymentProvider } from "./types";
import { manualProvider } from "./manualProvider";

// Adapter registry. A future gateway integration is: implement
// PaymentProvider, add it here, flip DEFAULT_PAYMENT_PROVIDER.

const providers = new Map<string, PaymentProvider>([
  [manualProvider.name, manualProvider],
]);

export const DEFAULT_PAYMENT_PROVIDER =
  process.env.PAYMENT_PROVIDER || "manual";

export function getPaymentProvider(
  name: string = DEFAULT_PAYMENT_PROVIDER,
): PaymentProvider {
  const provider = providers.get(name);
  if (!provider) {
    throw new Error(`Unknown payment provider "${name}"`);
  }
  return provider;
}

export function registerPaymentProvider(provider: PaymentProvider): void {
  providers.set(provider.name, provider);
}
