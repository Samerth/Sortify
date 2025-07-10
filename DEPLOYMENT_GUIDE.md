# Live Deployment Guide

## Prerequisites for Live Environment

### 1. Stripe Configuration
- Create products and prices in your Stripe dashboard
- Set up webhook endpoint: `https://yourdomain.com/api/stripe/webhooks`
- Configure webhook events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`

### 2. Environment Variables
```
# Production Stripe Keys
STRIPE_SECRET_KEY=sk_live_...
VITE_STRIPE_PUBLIC_KEY=pk_live_...

# Database
DATABASE_URL=your_production_postgres_url

# Email Service
SENDGRID_API_KEY=your_sendgrid_api_key
```

### 3. Domain Configuration
- Update return URLs in Stripe settings
- Configure CORS for your domain
- Set up SSL certificates

## Current System Status

✅ **Ready for Production:**
- Stripe subscription management
- Customer portal integration
- Webhook processing
- License enforcement
- Database schema
- Email notifications

✅ **Environment Detection:**
- Demo mode: Shows friendly messages
- Live mode: Full Stripe integration active

## Testing in Live Environment

1. **Test Subscription Flow:**
   - Create real subscriptions
   - Verify webhook processing
   - Test customer portal access

2. **Test License Enforcement:**
   - Verify user limits work
   - Test invitation restrictions
   - Confirm billing updates

3. **Test Email Notifications:**
   - Invitation emails
   - Payment confirmations
   - Subscription updates

## Deployment Steps

1. Deploy to production environment
2. Configure production environment variables
3. Set up Stripe webhooks
4. Test with small transaction
5. Monitor logs and webhooks
6. Scale as needed

The system is production-ready and will automatically switch from demo mode to live mode when real Stripe customer IDs are detected.