import type { PaymentProvider } from "./types";
import { manualProvider } from "./manualProvider";
import { phonepeProvider } from "./phonepeProvider";

// Adapter registry. A gateway integration is: implement PaymentProvider,
// add it here, flip PAYMENT_PROVIDER in the environment.

const providers = new Map<string, PaymentProvider>([
  [manualProvider.name, manualProvider],
  [phonepeProvider.name, phonepeProvider],
]);

/** Resolved lazily so deploys (and tests) can flip the env without a reload. */
export function defaultPaymentProviderName(): string {
  return process.env.PAYMENT_PROVIDER || "manual";
}

export function getPaymentProvider(name?: string): PaymentProvider {
  const resolved = name ?? defaultPaymentProviderName();
  const provider = providers.get(resolved);
  if (!provider) {
    throw new Error(`Unknown payment provider "${resolved}"`);
  }
  return provider;
}

export function registerPaymentProvider(provider: PaymentProvider): void {
  providers.set(provider.name, provider);
}
