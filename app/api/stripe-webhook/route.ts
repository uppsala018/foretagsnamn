import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Initialize Firebase Admin (server-side, idempotent)
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

const db = getFirestore()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    const metadata = session.metadata || {}
    const col = metadata.type === 'domain' ? 'domain_orders' : 'report_orders'

    await db.collection(col).add({
      stripeSessionId: session.id,
      customerEmail:   session.customer_details?.email,
      amountTotal:     session.amount_total,
      currency:        session.currency,
      metadata,
      status:          'completed',
      createdAt:       new Date(),
    })
  }

  return NextResponse.json({ received: true })
}
