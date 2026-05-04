import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const resend = new Resend(process.env.RESEND_API_KEY);
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Webhook signature failed" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    console.log("Session metadata:", session.metadata);
    console.log("Customer details:", session.customer_details);

    const { tier, fullPrice, depositAmount } = session.metadata ?? {};
    const customerEmail = session.customer_details?.email ?? "unknown";
    const customerName = session.customer_details?.name ?? "unknown";

    await resend.emails.send({
      from: "GetWebPage <hello@safarisaev.ai>",
      to: "saf@safarisaev.ai",
      subject: `New paid order — ${tier} — ${customerEmail}`,
      text: `New order received.

Tier: ${tier}
Name: ${customerName}
Email: ${customerEmail}
Deposit paid: £${Number(depositAmount) / 100}
Full price: £${Number(fullPrice) / 100}
Stripe session: ${session.id}`,
    });

    await resend.emails.send({
      from: "GetWebPage <hello@safarisaev.ai>",
      to: customerEmail,
      subject: "Your deposit is confirmed — next step inside",
      text: `Hi ${customerName},

Your deposit for the ${tier} package is confirmed.

Next step — fill in your brief:
https://tally.so/r/lbV7Zo

Takes about 8 minutes. The sooner you send it, the sooner we start.

Questions? Reply to this email.

GetWebPage
getwebpage.co.uk`,
    });
  }

  return NextResponse.json({ received: true });
}
