import { Resend } from "resend";
import { NextRequest, NextResponse, after } from "next/server";
import { clientIp, consume } from "@/lib/rate-limit";
import { record, remember } from "@/lib/stats";
import { telegram, clip } from "@/lib/notify";

const resend = new Resend(process.env.RESEND_API_KEY);

const CONTACT_LIMIT = 10;

const MAX = {
  name: 120,
  email: 254,
  businessType: 120,
  brief: 5000,
} as const;

function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // Honeypot — hidden from real users, catnip to bots.
    if (body?.company) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const name = clean(body?.name, MAX.name);
    const email = clean(body?.email, MAX.email);
    const businessType = clean(body?.businessType, MAX.businessType);
    const brief = clean(body?.brief, MAX.brief);

    if (!name || !email || !businessType || !brief) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const limit = await consume(`rl:contact:${clientIp(req)}`, CONTACT_LIMIT);
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many messages from this connection. Try again tomorrow." },
        { status: 429 }
      );
    }

    const { error } = await resend.emails.send({
      from: "GetWebPage <hello@safarisaev.ai>",
      to: "saf@safarisaev.ai",
      replyTo: email,
      subject: `New enquiry — ${name} · ${businessType}`,
      text: `Name: ${name}\nEmail: ${email}\nBusiness: ${businessType}\nBrief: ${brief}`,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json(
        { error: "We couldn't send that. Please try again." },
        { status: 500 }
      );
    }

    after(async () => {
      await record("enquiry");
      await remember("leads:enquiries", { name, email, businessType, brief });
      await telegram(
        `🔥 New enquiry\n${clip(name, 80)} · ${clip(businessType, 80)}\n${email}\n\n“${clip(brief)}”`
      );
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Contact route error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
