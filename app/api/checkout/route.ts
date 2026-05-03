import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";

const TIERS = {
  starter:  { name: "Starter",  deposit: 25000, full: 50000  },
  standard: { name: "Standard", deposit: 40000, full: 80000  },
  identity: { name: "Identity", deposit: 60000, full: 120000 },
};

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const { tier } = await req.json();
  const selected = TIERS[tier as keyof typeof TIERS];
  if (!selected) return NextResponse.json({ error: "Invalid tier" }, { status: 400 });

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
      tier,
      fullPrice: selected.full,
      depositAmount: selected.deposit,
    },
    billing_address_collection: "required",
    consent_collection: {
      terms_of_service: "required",
    },
    custom_text: {
      terms_of_service_acceptance: {
        message: "I agree to the GetWebPage Terms of Service",
      },
    },
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing`,
  });

  return NextResponse.json({ url: session.url });
}
