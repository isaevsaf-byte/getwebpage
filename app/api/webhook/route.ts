import Stripe from "stripe";
import { NextRequest, NextResponse, after } from "next/server";
import { Resend } from "resend";
import { kv } from "@vercel/kv";
import { record, remember } from "@/lib/stats";
import { telegram } from "@/lib/notify";

/** Values reach the email from Stripe's billing fields — never trust them as markup. */
function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const resend = new Resend(process.env.RESEND_API_KEY);

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Webhook signature failed" }, { status: 400 });
  }

  const handled = ["checkout.session.completed", "checkout.session.expired"];
  if (handled.includes(event.type)) {
    // Stripe retries on any non-2xx. Without this guard a failed send would
    // replay the whole handler and alert the owner twice.
    const seenKey = `stripe:event:${event.id}`;
    try {
      const fresh = await kv.set(seenKey, 1, { nx: true, ex: 604800 });
      if (fresh === null) {
        return NextResponse.json({ received: true, duplicate: true });
      }
    } catch {
      // KV unavailable — proceed rather than dropping a paid order.
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const email = session.customer_details?.email ?? null;
    const tier = session.metadata?.tier ?? "unknown";

    after(async () => {
      await record("checkout_abandoned");
      if (email) {
        await remember("leads:abandoned", { email, tier, sessionId: session.id });
      }
      await telegram(
        email
          ? `⏳ Checkout abandoned — ${tier}\n${email}\nThey got as far as payment. Worth a friendly nudge today.`
          : `⏳ Checkout abandoned — ${tier}\nNo email was entered, so there's no one to follow up.`
      );
    });

    return NextResponse.json({ received: true });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const { tier, fullPrice, depositAmount } = session.metadata ?? {};
    const customerEmail = session.customer_details?.email ?? "unknown";
    const customerName = session.customer_details?.name ?? "there";

    const deposit = Number(depositAmount) / 100;
    const full = Number(fullPrice) / 100;

    const results = await Promise.allSettled([
      // Notification to owner
      resend.emails.send({
        from: "GetWebPage <hello@safarisaev.ai>",
        to: "saf@safarisaev.ai",
        subject: `New paid order — ${tier} — ${customerEmail}`,
        text: `New order received.\n\nTier: ${tier}\nName: ${customerName}\nEmail: ${customerEmail}\nDeposit paid: £${deposit}\nFull price: £${full}\nStripe session: ${session.id}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#14181a">
            <h2 style="font-size:20px;margin-bottom:16px">New paid order 🎉</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr><td style="padding:8px 0;color:#5a6360;width:140px">Tier</td><td style="padding:8px 0;font-weight:600">${esc(tier)}</td></tr>
              <tr><td style="padding:8px 0;color:#5a6360">Name</td><td style="padding:8px 0">${esc(customerName)}</td></tr>
              <tr><td style="padding:8px 0;color:#5a6360">Email</td><td style="padding:8px 0">${esc(customerEmail)}</td></tr>
              <tr><td style="padding:8px 0;color:#5a6360">Deposit paid</td><td style="padding:8px 0;font-weight:600">£${esc(deposit)}</td></tr>
              <tr><td style="padding:8px 0;color:#5a6360">Full price</td><td style="padding:8px 0">£${esc(full)}</td></tr>
              <tr><td style="padding:8px 0;color:#5a6360">Stripe session</td><td style="padding:8px 0;font-size:12px;color:#636b67">${esc(session.id)}</td></tr>
            </table>
          </div>
        `,
      }),

      // Confirmation to customer
      resend.emails.send({
        from: "GetWebPage <hello@safarisaev.ai>",
        to: customerEmail,
        subject: "Your deposit is confirmed — fill in your brief",
        text: `Hi ${customerName},\n\nYour deposit for the ${tier} package is confirmed.\n\nNext step — fill in your brief:\nhttps://tally.so/r/lbV7Zo\n\nTakes about 8 minutes. The sooner you send it, the sooner we start.\n\nQuestions? Reply to this email.\n\nGetWebPage\ngetwebpage.co.uk`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#14181a">
            <div style="background:#eaece7;border-radius:6px;padding:40px 36px">

              <p style="font-size:13px;letter-spacing:0.1em;text-transform:uppercase;color:#8f3446;margin:0 0 16px">GetWebPage</p>

              <h1 style="font-size:26px;font-weight:400;margin:0 0 8px;line-height:1.2">Deposit received.</h1>
              <p style="font-size:18px;color:#7d2436;margin:0 0 32px;font-style:italic">You're in.</p>

              <p style="font-size:14px;color:#4c534f;line-height:1.7;margin:0 0 8px">
                Hi ${esc(customerName)},
              </p>
              <p style="font-size:14px;color:#4c534f;line-height:1.7;margin:0 0 32px">
                Your <strong>${esc(tier)}</strong> package deposit of <strong>£${esc(deposit)}</strong> is confirmed.
              </p>

              <div style="background:#fff;border:1px solid #d5d9d2;border-radius:6px;padding:28px 32px;margin-bottom:32px">
                <p style="font-size:13px;font-weight:600;margin:0 0 8px;color:#14181a">Next step — fill in your brief</p>
                <p style="font-size:13px;color:#5a6360;line-height:1.65;margin:0 0 20px">
                  Takes about 8 minutes. The sooner you send it, the sooner we start.
                </p>
                <a href="https://tally.so/r/lbV7Zo"
                   style="display:inline-block;background:#7d2436;color:#ffffff;text-decoration:none;border-radius:4px;padding:12px 28px;font-size:14px;font-weight:500;letter-spacing:0.01em">
                  Fill in the brief →
                </a>
              </div>

              <p style="font-size:13px;color:#636b67;line-height:1.7;margin:0">
                Questions? Reply to this email or write to
                <a href="mailto:saf@safarisaev.ai" style="color:#7d2436;text-decoration:none">saf@safarisaev.ai</a>
              </p>

            </div>
            <p style="font-size:11px;color:#636b67;text-align:center;margin-top:20px">
              GetWebPage · getwebpage.co.uk<br>
              Trading name of OPTIFLOW LABS LTD, England &amp; Wales
            </p>
          </div>
        `,
      }),
    ]);

    // Log failures but still acknowledge — a retry would only duplicate the
    // email that did go out, and the order is already paid.
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        console.error(`Order email ${i === 0 ? "to owner" : "to customer"} failed:`, r.reason);
      }
    });

    after(async () => {
      await record("order_paid");
      await remember("leads:orders", {
        tier, name: customerName, email: customerEmail, deposit, full, sessionId: session.id,
      });
      await telegram(
        `💷 DEPOSIT PAID — ${tier}\n${customerName} · ${customerEmail}\n` +
          `£${deposit} in, £${full - deposit} due on delivery.\nThe 7-day clock starts when their brief lands.`
      );
    });
  }

  return NextResponse.json({ received: true });
}
