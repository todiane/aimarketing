// https://www.pedroalonso.net/blog/stripe-checkout-nextjs/

import stripe from "@/lib/stripe";
import { db } from "@/server/db";
import { stripeCustomersTable } from "@/server/db/schema";
import { clerkClient, getAuth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const baseUrl = process.env.APP_URL;
    if (!baseUrl) {
      throw new Error("APP_URL environment variable is not set");
    }

    const client = clerkClient();
    const user = await client.users.getUser(userId);
    const email = user.emailAddresses[0]?.emailAddress;

    const stripeCustomerId = await getOrCreateStripeCustomer(userId, email);

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${baseUrl}/settings?success=true`,
      cancel_url: `${baseUrl}/settings?canceled=true`,
      client_reference_id: userId,
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (error) {
    console.error("Error creating checkout session", error);
    return NextResponse.json(
      { error: "Error creating checkout session" },
      { status: 500 }
    );
  }
}

async function getOrCreateStripeCustomer(
  userId: string,
  email: string
): Promise<string> {
  // Check if we already have a Stripe customer for this user
  const existingCustomer = await db.query.stripeCustomersTable.findFirst({
    where: eq(stripeCustomersTable.userId, userId),
  });

  if (existingCustomer) {
    // If we have a customer, return their Stripe customer ID
    return existingCustomer.stripeCustomerId;
  }

  // If we don't have a customer, create one
  const customer = await stripe.customers.create({
    email: email,
    metadata: { userId: userId },
  });

  // Save the new Stripe customer ID to our database
  await db.insert(stripeCustomersTable).values({
    userId: userId,
    stripeCustomerId: customer.id,
  });

  return customer.id;
}
