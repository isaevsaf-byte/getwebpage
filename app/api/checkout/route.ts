import Stripe from "stripe";
import { NextRequest, NextResponse, after } from "next/server";
import { clientIp, consume } from "@/lib/rate-limit";
import { record } from "@/lib/stats";
import { telegram } from "@/lib/notify";

export const TIERS = {
  starter:  { name: "Starter",  deposit: 25000, full: 50000  },
  standard: { name: "Standard", deposit: 40000, full: 80000  },
  identity: { name: "Identity", deposit: 60000, full: 120000 },
};

const CHECKOUT_LIMIT = 20;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { tier } = body as { tier?: string };

  const selected = TIERS[tier as keyof typeof TIERS];
  if (!selected) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const limit = await consume(`rl:checkout:${clientIp(req)}`, CHECKOUT_LIMIT);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 }
    );
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "gbp",
      line_items: [
        {
          price_data: {
            currency: "gbp",
            unit_amount: selected.deposit,
            product_data: {
              name: `GetWebPage ${selected.name} — 50% Deposit`,
              description: `50% deposit. Full price: £${selected.full / 100}. Balance due on delivery.`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        tier: tier!,
        fullPrice: selected.full,
        depositAmount: selected.deposit,
      },
      billing_address_collection: "required",
      consent_collection: {
        terms_of_service: "required",
      },
      custom_text: {
        terms_of_service_acceptance: {
          message: "I agree to the GetWebPage Terms of Service at getwebpage.co.uk/terms",
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing`,
    });

    after(async () => {
      await record("checkout_started");
      await telegram(
        `🛒 Someone opened checkout — ${selected.name} (£${selected.deposit / 100} deposit)\n` +
          `If they don't pay within 24h you'll get an "abandoned" alert with their email, if they typed it.`
      );
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 500 }
    );
  }
}
