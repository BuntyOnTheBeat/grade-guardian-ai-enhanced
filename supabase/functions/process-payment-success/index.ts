import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@11.1.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2022-11-15",
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  // --- CORS preflight handler ---
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  const { sessionId } = await req.json();

  try {
    // Retrieve the checkout session to verify payment
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status !== 'paid') {
      throw new Error('Payment not completed');
    }

    // Get the subscription details
    const subscription = session.subscription ? 
      await stripe.subscriptions.retrieve(session.subscription as string) : null;

    // Determine subscription type from the price metadata
    let subscriptionType = 'student'; // default
    if (subscription && subscription.items.data.length > 0) {
      const price = subscription.items.data[0].price;
      if (price.metadata.subscription_type) {
        subscriptionType = price.metadata.subscription_type;
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      subscriptionType,
      sessionId: session.id,
      customerId: session.customer
    }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
    });
  } catch (error) {
    console.error("Error processing payment success:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
    });
  }
}); 