# Aureus Pay SDK 💳

**Accept cryptocurrency payments effortlessly**  
Enable USDC/USDT payments on Hedera and EVM chains with just a few lines of code.

---

## 🏗️ Account Architecture

Understanding how Aureus manages accounts:

### Personal Account
When you sign up, you get:
- **Hedera (HTS) Wallet** - Your personal crypto wallet
- **Nostr Profile** - Decentralized identity
- *Optional:* **EVM Wallets** - Create wallets on Ethereum, Polygon, Base, Arbitrum, Optimism, etc.

### Business Account
When you create a business, you get:
- **Hedera Multi-Sig Account (HTS)** 
  - Signed with your personal HTS private key
  - Invite team members for multi-signature security
  - Primary account for receiving crypto payments

- **Safe Global Multi-Sig Wallets**
  - EVM-compatible (Ethereum, Polygon, Base, etc.)
  - Signed with your personal EVM wallet keys
  - Multi-chain payment support

- **Business Nostr Profile**
  - Used for business identity and authentication
  - Sign in to business account with Nostr private key

### API Key Authentication
- API keys are **Business Account specific**
- Generated in: Business Settings → Aureus Pay → API Key
- Used to authenticate payment requests via SDK
- Each business can have separate API keys

```
Personal Account (Google/Apple/Email)
    ├── Hedera (HTS) Wallet
    ├── Nostr Profile  
    └── EVM Wallets (Optional)
         └── Ethereum, Polygon, Base, etc.

Business Account (Multi-Sig)
    ├── Hedera Multi-Sig (HTS)
    │    └── Signed with Personal HTS Key
    ├── Safe Global EVM Multi-Sig
    │    └── Signed with Personal EVM Keys
    ├── Business Nostr Profile
    └── API Keys (for SDK)
```

---

## 📦 Installation

```bash
npm install aureus-pay
```

---

## 🚀 Quick Start (5 minutes)

### 1. Get Your API Key

**Step 1: Create Your Account**
1. Download the [Aureus Wallet App](https://aureus.money)
2. Sign up with Google, Apple, or Email
   - Your personal Hedera (HTS) account is created automatically
   - Your Nostr profile is generated

**Step 2: Create a Business Account**
1. In the app, go to **Business** → **Create Business Account**
2. Your business gets:
   - ✅ **Hedera Multi-Sig Account** (HTS) - signed with your personal HTS key
   - ✅ **Safe Global EVM Wallets** - multi-chain support (Ethereum, Polygon, Base, etc.)
   - ✅ **Nostr Account** - for business identity
3. *Optional:* Invite team members to the multi-sig

**Step 3: Generate API Key**
1. **Log in as your Business** (switch from personal to business account)
2. Go to **Settings** → **Aureus Pay** → **API Key**
3. Click **Generate API Key**
4. Copy the key (keep it secure!)

> ⚠️ **Important:** 
> - API keys are tied to your **Business Account**, not your personal account
> - You must be logged into your business to generate/use API keys
> - Multi-sig business accounts provide enhanced security for payment processing

### 2. Create Your First Payment

```javascript
const AureusPay = require('aureus-pay');

// Initialize with your API key
const aureus = new AureusPay({
  apiKey: 'your-api-key-here',
  environment: 'production' // Use 'testnet' for testing
});

// Create a payment request
const payment = await aureus.payments.create({
  amount: '10.00',        // Amount in USD
  currency: 'USDC',       // USDC or USDT
  orderId: 'ORDER_123'    // Your order reference
});

// Show QR code to customer
console.log('Payment QR Code:', payment.qrCode);
console.log('Deep Link:', payment.deepLink);

// Listen for payment confirmation
payment.on('confirmed', (data) => {
  console.log('✅ Payment received!');
  console.log('Transaction:', data.txHash);
  // ✨ Fulfill order, send receipt, etc.
});

// Start monitoring for payment
payment.startListening();
```

### 3. Display Payment to Customer

**Option A: QR Code** (Recommended)
```javascript
// Show QR code image
<img src={payment.qrCode} alt="Scan to pay" />
```

**Option B: Deep Link** (Mobile)
```javascript
// Redirect mobile users
window.location.href = payment.deepLink;
// Opens Aureus app directly
```

---

## 📚 Complete API Reference

### Initialize SDK

```javascript
const aureus = new AureusPay({
  apiKey: 'your-api-key',        // Required: Get from Aureus app
  environment: 'production'       // 'production' or 'testnet'
});
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `apiKey` | string | ✅ Yes | Your API key from Aureus app |
| `environment` | string | ❌ No | `'production'` (default) or `'testnet'` |

---

### Create Payment

```javascript
const payment = await aureus.payments.create({
  amount: '100.00',
  currency: 'USDC',
  orderId: 'ORDER_123',
  metadata: {
    customerEmail: 'customer@example.com',
    productName: 'Premium Subscription'
  }
});
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `amount` | string | ✅ Yes | Payment amount (e.g., `'10.00'`) |
| `currency` | string | ✅ Yes | `'USDC'` or `'USDT'` |
| `orderId` | string | ❌ No | Your internal order reference |
| `metadata` | object | ❌ No | Custom data (stored with payment) |

**Returns:** Payment object (see below)

---

### Listen for Events

```javascript
// Monitor payment status changes
payment.on('status_change', (status) => {
  console.log('Status updated:', status);
  // 'pending' → 'processing' → 'confirmed'
});

// Payment confirmed (funds received)
payment.on('confirmed', (data) => {
  console.log('✅ Payment confirmed!');
  console.log('Transaction hash:', data.txHash);
  console.log('Confirmed at:', data.confirmedAt);
  // Fulfill order here
});

// Payment expired (15 min timeout)
payment.on('expired', () => {
  console.log('⏱️ Payment expired');
  // Notify customer to retry
});

// Payment cancelled by customer
payment.on('cancelled', () => {
  console.log('❌ Payment cancelled');
});

// Payment failed
payment.on('failed', (error) => {
  console.log('💥 Payment failed:', error);
});

// Start listening (required!)
payment.startListening();
```

**Event Timeline:**
```
Create Payment
     ↓
'pending' → Customer scans QR
     ↓
'processing' → Transaction submitted
     ↓
'confirmed' → Payment received ✅
```

---

### Get Payment Status

```javascript
// Retrieve existing payment
const payment = await aureus.payments.get('payment_xyz123');

console.log(payment.status);     // Current status
console.log(payment.amount);     // Payment amount
console.log(payment.confirmedAt); // When confirmed (if confirmed)
```

---

### Cancel Payment

```javascript
// Cancel pending payment
await aureus.payments.cancel('payment_xyz123');
```

⚠️ **Note:** Can only cancel payments with status `'pending'`

---

## 🎯 Payment Object

Every payment has these properties:

```javascript
{
  // Identifiers
  id: 'payment_xyz123',           // Unique payment ID
  orderId: 'ORDER_123',           // Your order reference
  
  // Amount & Currency
  amount: '10.00',                // Payment amount
  currency: 'USDC',               // USDC or USDT
  
  // Status
  status: 'confirmed',            // See statuses below
  
  // Display to Customer
  qrCode: 'data:image/png;base64,...',  // QR code image (Base64)
  deepLink: 'aureus://pay?id=xyz123',   // Mobile deep link
  
  // Timing
  createdAt: Date,                // When created
  expiresAt: Date,                // Expires 15 min after creation
  confirmedAt: Date,              // When confirmed (if confirmed)
  
  // Blockchain Details (after confirmation)
  txHash: '0xabc...',             // Transaction hash
  network: 'hedera',              // 'hedera', 'ethereum', etc.
  
  // Custom Data
  metadata: { ... }               // Your custom data
}
```

### Payment Statuses

| Status | Description |
|--------|-------------|
| `pending` | Waiting for customer to pay |
| `processing` | Transaction submitted to blockchain |
| `confirmed` | ✅ Payment received and confirmed |
| `expired` | ⏱️ Payment timeout (15 min) |
| `cancelled` | ❌ Cancelled by customer or merchant |
| `failed` | 💥 Transaction failed |

---

## 🎨 Frontend Examples

### React Component

```jsx
import { useState, useEffect } from 'react';
import AureusPay from 'aureus-pay';

function CheckoutPage({ orderId, amount }) {
  const [payment, setPayment] = useState(null);
  const [status, setStatus] = useState('creating');

  useEffect(() => {
    const aureus = new AureusPay({
      apiKey: process.env.AUREUS_API_KEY,
      environment: 'production'
    });

    async function createPayment() {
      const p = await aureus.payments.create({
        amount: amount,
        currency: 'USDC',
        orderId: orderId
      });

      p.on('confirmed', () => {
        setStatus('confirmed');
        // Redirect to success page
        window.location.href = '/order-success';
      });

      p.on('expired', () => setStatus('expired'));
      p.startListening();
      
      setPayment(p);
      setStatus('pending');
    }

    createPayment();
  }, []);

  if (status === 'creating') return <div>Loading...</div>;
  if (status === 'expired') return <div>Payment expired. Please try again.</div>;
  
  return (
    <div>
      <h1>Scan to Pay ${amount} USDC</h1>
      <img src={payment.qrCode} alt="Payment QR Code" />
      <p>Status: {status}</p>
    </div>
  );
}
```

### Express.js Backend

```javascript
const express = require('express');
const AureusPay = require('aureus-pay');

const app = express();
const aureus = new AureusPay({
  apiKey: process.env.AUREUS_API_KEY,
  environment: 'production'
});

app.post('/api/create-payment', async (req, res) => {
  const { amount, orderId } = req.body;
  
  try {
    const payment = await aureus.payments.create({
      amount,
      currency: 'USDC',
      orderId,
      metadata: {
        userId: req.user.id
      }
    });

    // Listen for confirmation in background
    payment.on('confirmed', async (data) => {
      // Update database
      await db.orders.update(orderId, {
        status: 'paid',
        txHash: data.txHash
      });
      
      // Send confirmation email
      await sendEmail(req.user.email, 'Payment Confirmed');
    });

    payment.startListening();

    res.json({
      paymentId: payment.id,
      qrCode: payment.qrCode,
      deepLink: payment.deepLink
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000);
```

---

## ⚡ Best Practices

### ✅ DO

- **Always call `payment.startListening()`** after creating a payment
- **Store `payment.id`** in your database for order tracking
- **Handle all events** (`confirmed`, `expired`, `failed`)
- **Use testnet** during development
- **Set meaningful `orderId`** for easy reconciliation
- **Add customer info** in `metadata` for support

### ❌ DON'T

- Don't show QR code without calling `startListening()`
- Don't reuse payments - create new payment for each order
- Don't expose your API key in frontend code
- Don't assume payment confirmed without `confirmed` event

---

## 🔒 Security

### API Key Security
- **Never expose your API key** in client-side code
- **Always validate** payment confirmation on your backend
- **Store API keys** in environment variables
- **Rotate keys regularly** from business settings

```bash
# .env file
AUREUS_API_KEY=your_business_api_key_here
```

### Multi-Signature Security
Business accounts use multi-sig for enhanced security:

**Hedera Multi-Sig (HTS)**
- Requires signatures from authorized team members
- Configurable threshold (e.g., 2 of 3 signatures required)
- All payment settlements go through multi-sig verification

**Safe Global Multi-Sig (EVM)**
- Industry-standard multi-sig wallet protocol
- Team member management with customizable permissions
- Secure cross-chain payment processing

### Best Practices
- ✅ Use **business accounts** for production payments
- ✅ Invite trusted team members to multi-sig
- ✅ Set appropriate signature thresholds
- ✅ Monitor payment activity in business dashboard
- ✅ Keep your Nostr private key secure (for business login)
- ❌ Never share business Nostr private key
- ❌ Don't use personal accounts for business payments

---

## 🌍 Supported Networks

Your business account can accept payments on:

### Hedera (HTS) - Primary
- **USDC** - USD Coin
- **USDT** - Tether
- **HBAR** - Native Hedera token
- Uses your business multi-sig Hedera account

### EVM Chains (via Safe Global)
All supported through your business Safe multi-sig wallets:

- **Ethereum** - USDC, USDT
- **Polygon** - USDC, USDT  
- **Base** - USDC
- **Arbitrum** - USDC, USDT
- **Optimism** - USDC, USDT
- **BSC** - USDC, USDT

> 💡 **Note:** You can enable/disable specific chains in your business settings. Customers can pay using any enabled chain/token combination.

---

## 🆘 Troubleshooting

### "Invalid API Key"
- ✅ Check you're logged into your **Business Account** (not personal)
- ✅ Verify API key was copied correctly (no extra spaces)
- ✅ Ensure you're using the right environment (`production` vs `testnet`)
- ✅ Regenerate key in Business Settings → Aureus Pay if needed
- ❌ Personal account API keys won't work - must use business API key

### "Business Account Required"
- You must create a business account first
- Go to Aureus app → Business → Create Business Account
- Switch to business login before generating API key

### Payment not confirming
- ⏱️ Wait up to 30 seconds for blockchain confirmation
- 🔍 Check customer scanned the correct QR code
- 💰 Verify customer has sufficient balance
- 🔗 Check enabled chains match customer's wallet
- 📊 Check `payment.status` for error details
- 🔐 Verify business multi-sig has no pending approvals blocking settlement

### Events not firing
- ✅ Make sure you called `payment.startListening()`
- ✅ Check console for WebSocket connection errors
- ✅ Verify your server allows WebSocket connections
- ✅ Ensure API key is valid and not expired

### Multi-Sig Issues
- If payments pending approval, check business dashboard
- Ensure sufficient signers are available
- Verify signature threshold configuration
- Team members must approve via Aureus app

---

## 📞 Support

- 📖 **Documentation:** [docs.aureus.com](https://docs.aureus.com)
- 💬 **Discord:** [discord.gg/aureus](https://discord.gg/aureus)
- 📧 **Email:** support@aureus.com
- 🐛 **Issues:** [GitHub Issues](https://github.com/aureus-wallet/aureus-pay-sdk/issues)

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 🎉 Examples

Check out complete examples:
- [React E-commerce](./examples/react-ecommerce)
- [Express API](./examples/express-api)
- [Next.js Full Stack](./examples/nextjs-fullstack)

---

**Made with ❤️ by Aureus**  
[Website](https://aureus.com) • [GitHub](https://github.com/aureus-wallet) • [Twitter](https://twitter.com/aureuswallet)
