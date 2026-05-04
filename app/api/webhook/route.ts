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

    const { tier, fullPrice, depositAmount } = session.metadata ?? {};
    const customerEmail = session.customer_details?.email ?? "unknown";
    const customerName = session.customer_details?.name ?? "unknown";

    // Notification to owner
    await resend.emails.send({
      from: "GetWebPage <hello@safarisaev.ai>",
      to: "saf@safarisaev.ai",
      subject: `New paid order — ${tier} — ${customerEmail}`,
      text: `New order received.\n\nTier: ${tier}\nName: ${customerName}\nEmail: ${customerEmail}\nDeposit paid: £${Number(depositAmount) / 100}\nFull price: £${Number(fullPrice) / 100}\nStripe session: ${session.id}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1612">
          <h2 style="font-size:20px;margin-bottom:16px">New paid order 🎉</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr><td style="padding:8px 0;color:#6b6358;width:140px">Tier</td><td style="padding:8px 0;font-weight:600">${tier}</td></tr>
            <tr><td style="padding:8px 0;color:#6b6358">Name</td><td style="padding:8px 0">${customerName}</td></tr>
            <tr><td style="padding:8px 0;color:#6b6358">Email</td><td style="padding:8px 0">${customerEmail}</td></tr>
            <tr><td style="padding:8px 0;color:#6b6358">Deposit paid</td><td style="padding:8px 0;font-weight:600">£${Number(depositAmount) / 100}</td></tr>
            <tr><td style="padding:8px 0;color:#6b6358">Full price</td><td style="padding:8px 0">£${Number(fullPrice) / 100}</td></tr>
            <tr><td style="padding:8px 0;color:#6b6358">Stripe session</td><td style="padding:8px 0;font-size:12px;color:#9a9188">${session.id}</td></tr>
          </table>
        </div>
      `,
    });

    // Confirmation to customer
    await resend.emails.send({
      from: "GetWebPage <hello@safarisaev.ai>",
      to: customerEmail,
      subject: "Your deposit is confirmed — fill in your brief",
      text: `Hi ${customerName},\n\nYour deposit for the ${tier} package is confirmed.\n\nNext step — fill in your brief:\nhttps://tally.so/r/lbV7Zo\n\nTakes about 8 minutes. The sooner you send it, the sooner we start.\n\nQuestions? Reply to this email.\n\nGetWebPage\ngetwebpage.co.uk`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1612">
          <div style="background:#f7f3ec;border-radius:6px;padding:40px 36px">

            <p style="font-size:13px;letter-spacing:0.1em;text-transform:uppercase;color:#c87850;margin:0 0 16px">GetWebPage</p>

            <h1 style="font-size:26px;font-weight:400;margin:0 0 8px;line-height:1.2">Deposit received.</h1>
            <p style="font-size:18px;color:#a04020;margin:0 0 32px;font-style:italic">You're in.</p>

            <p style="font-size:14px;color:#4a443e;line-height:1.7;margin:0 0 8px">
              Hi ${customerName},
            </p>
            <p style="font-size:14px;color:#4a443e;line-height:1.7;margin:0 0 32px">
              Your <strong>${tier}</strong> package deposit of <strong>£${Number(depositAmount) / 100}</strong> is confirmed.
            </p>

            <div style="background:#fff;border:1px solid #e8e3d8;border-radius:6px;padding:28px 32px;margin-bottom:32px">
              <p style="font-size:13px;font-weight:600;margin:0 0 8px;color:#1a1612">Next step — fill in your brief</p>
              <p style="font-size:13px;color:#6b6358;line-height:1.65;margin:0 0 20px">
                Takes about 8 minutes. The sooner you send it, the sooner we start.
              </p>
              <a href="https://tally.so/r/lbV7Zo"
                 style="display:inline-block;background:#a04020;color:#ffffff;text-decoration:none;border-radius:4px;padding:12px 28px;font-size:14px;font-weight:500;letter-spacing:0.01em">
                Fill in the brief →
              </a>
            </div>

            <p style="font-size:13px;color:#9a9188;line-height:1.7;margin:0">
              Questions? Reply to this email or write to
              <a href="mailto:saf@safarisaev.ai" style="color:#a04020;text-decoration:none">saf@safarisaev.ai</a>
            </p>

          </div>
          <p style="font-size:11px;color:#9a9188;text-align:center;margin-top:20px">
            GetWebPage · getwebpage.co.uk<br>
            Trading name of OPTIFLOW LABS LTD, England &amp; Wales
          </p>
        </div>
      `,
    });
  }

  return NextResponse.json({ received: true });
}
