import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { name, email, businessType, brief } = await req.json();

    if (!name || !email || !businessType || !brief) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 }
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Contact route error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
