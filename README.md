# Aureus Pay SDK 💳

**Accept cryptocurrency payments effortlessly**  
Enable USDC/USDT payments on Hedera and EVM chains with just a few lines of code.

---

## 📦 Installation

```bash
npm install aureus-pay
```

---

## 🚀 Quick Start (5 minutes)

### 1. Get Your API Key
1. Download the [Aureus Wallet App](https://aureus.money)
2. Go to **Settings** → **Developer** → **Generate API Key**
3. Copy your API key

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

- **Never expose your API key** in client-side code
- **Always validate** payment confirmation on your backend
- **Use webhooks** (coming soon) for production reliability
- **Store API keys** in environment variables

```bash
# .env file
AUREUS_API_KEY=your_api_key_here
```

---

## 🌍 Supported Networks

- ✅ **Hedera** (USDC, USDT, HBAR)
- ✅ **Ethereum** (USDC, USDT)
- ✅ **Polygon** (USDC, USDT)
- ✅ **Base** (USDC)
- ✅ **Arbitrum** (USDC, USDT)
- ✅ **Optimism** (USDC, USDT)

---

## 🆘 Troubleshooting

### "Invalid API Key"
- Check your API key is correct
- Ensure you're using the right environment (`production` vs `testnet`)
- Regenerate key in Aureus app if needed

### Payment not confirming
- Wait up to 30 seconds for blockchain confirmation
- Check customer scanned the correct QR code
- Verify customer has sufficient balance
- Check `payment.status` for error details

### Events not firing
- Make sure you called `payment.startListening()`
- Check console for WebSocket connection errors
- Verify your server allows WebSocket connections

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
