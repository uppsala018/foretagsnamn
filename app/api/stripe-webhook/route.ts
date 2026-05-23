import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  // Lazy imports — only run at request time, not build time
  const Stripe = (await import('stripe')).default
  const { initializeApp, getApps, cert } = await import('firebase-admin/app')
  const { getFirestore } = await import('firebase-admin/firestore')

  if (!getApps().length) {
    const rawKey = process.env.FIREBASE_PRIVATE_KEY
    const privateKey = rawKey
      ? rawKey.includes('\\n')
        ? rawKey.replace(/\\n/g, '\n')
        : rawKey
      : undefined

    initializeApp({
      credential: cert({
        projectId:   process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey,
      }),
    })
  }

  const db = getFirestore()
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')!

  let event
  try {
    event = stripe.webhooks.constructEvent(
      body, sig, process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
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
