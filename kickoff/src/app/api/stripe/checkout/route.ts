import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServer } from "@/lib/supabase-server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICE_IDS: Record<string, string> = {
  pro: process.env.STRIPE_PRICE_PRO!,
  club: process.env.STRIPE_PRICE_CLUB!,
};

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan } = await req.json();
  const priceId = PRICE_IDS[plan];
  if (!priceId) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  const { data: profile } = await supabase.from("profiles").select("stripe_customer_id, username").eq("id", user.id).single();

  let customerId = profile?.stripe_customer_id ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: profile?.username ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${req.nextUrl.origin}/billing?success=1`,
    cancel_url: `${req.nextUrl.origin}/billing?canceled=1`,
    metadata: { supabase_user_id: user.id, plan },
    subscription_data: { metadata: { supabase_user_id: user.id, plan } },
  });

  return NextResponse.json({ url: session.url });
}
