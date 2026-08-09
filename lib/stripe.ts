import Stripe from "stripe";

let stripeClient: Stripe | null = null;

// Lazy singleton: the client is only constructed when a route that actually
// uses Stripe runs. Constructing at module scope used to make any importing
// route module — and `next build` — throw when STRIPE_API_KEY was absent
// from the environment. With this, the error surfaces only on first use.
export function stripe(): Stripe {
  const apiKey = process.env.STRIPE_API_KEY;
  if (!apiKey) {
    throw new Error("STRIPE_API_KEY is not set");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(apiKey, {
      apiVersion: "2023-08-16",
      typescript: true,
    });
  }
  return stripeClient;
}
