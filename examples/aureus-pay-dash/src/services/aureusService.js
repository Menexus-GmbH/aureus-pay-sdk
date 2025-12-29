import AureusPay from 'aureus-pay';
import { fetchBusinessData, fetchTransactionData } from './firebaseService';

// Initialize Aureus Pay instance
export async function initializeAureus(apiKey, addLog) {
  try {
    console.log('🔵 Creating AureusPay instance...');
    addLog('info', 'Initializing Aureus Pay Terminal...');
    
    // Create AureusPay instance with JWT
    const instance = new AureusPay({
      apiKey: apiKey,
      debug: true
    });
    
    console.log('✅ AureusPay instance created');
    
    // Fetch business data from Firebase
    const businessData = await fetchBusinessData(apiKey);
    
    if (businessData) {
      console.log('✅ Business data loaded:', businessData);
      addLog('success', `Loaded: ${businessData.businessName}`);
      
      if (businessData.chains && businessData.chains.length > 0) {
        addLog('info', `Available chains: ${businessData.chains.map(c => c.name).join(', ')}`);
      }
    }
    
    console.log('✅ Terminal initialized');
    addLog('success', 'Terminal initialized successfully.');
    
    return { instance, businessData };
    
  } catch (error) {
    console.error('❌ Initialization error:', error);
    addLog('error', `Initialization failed: ${error.message}`);
    throw error;
  }
}

// Create payment for a product
export async function createPayment(terminal, product, selectedChains, addLog) {
  try {
    addLog('info', `Creating payment for ${product.name}...`);
    
    const payment = await terminal.payments.create({
      amount: product.price.toString(),
      currency: product.currency,
      metadata: {
        product: product.name,
        productId: product.id,
        chains: selectedChains.map(c => c.id),
      }
    });

    addLog('success', `Payment created: ${payment.id}`);
    console.log('💳 Payment created:', payment);
    
    return payment;
    
  } catch (error) {
    console.error('❌ Create payment error:', error);
    addLog('error', `Create Payment Failed: ${error.message}`);
    throw error;
  }
}

export function setupPaymentListeners(payment, terminal, callbacks, addLog) {
  const { onStatusChange, onConfirmed, onExpired, onCancelled } = callbacks;
  
  if (typeof payment.on !== 'function') {
    console.warn('⚠️ Payment object does not support event listeners');
    addLog('warning', 'Event listeners not available for this payment');
    return;
  }

  // Helper function for payment completion
  async function handlePaymentComplete(data) {
    addLog('success', '🎉 PAYMENT CONFIRMED!');
    
    try {
      const transactionData = await fetchTransactionData(payment.id);
      
      if (transactionData) {
        console.log('📄 Complete transaction data:', transactionData);
        addLog('success', `Transaction: ${transactionData.txHash || 'N/A'}`);
        
        // Call onConfirmed with complete data
        onConfirmed({
          ...payment,
          txHash: transactionData.txHash,
          confirmedAt: transactionData.confirmedAt,
          destinations: transactionData.destinations,
          uId: transactionData.uId,
          userName: transactionData.userName,
          fullData: transactionData
        });
      } else {
        // No transaction data found, use payment data
        onConfirmed(data || payment);
      }
    } catch (error) {
      console.error('❌ Error fetching transaction data:', error);
      addLog('warning', 'Could not fetch full transaction data');
      onConfirmed(data || payment);
    }
  }

  // Status change event
  payment.on('status_change', (status) => {
    console.log('📊 Status change:', status);
    addLog('event', `Status Change: ${status}`);
    onStatusChange(status);
    
    // ✅ ADD THIS - Handle "completed" status from mobile app
    if (status === 'completed' || status === 'confirmed') {
      handlePaymentComplete();
    }
  });

  // Confirmed event
  payment.on('confirmed', (data) => {
    console.log('✅ Payment confirmed event');
    handlePaymentComplete(data);
  });

  // Expired event
  payment.on('expired', () => {
    console.log('⏰ Payment expired');
    addLog('warning', 'Payment EXPIRED');
    onExpired();
  });

  // Cancelled event
  payment.on('cancelled', () => {
    console.log('🚫 Payment cancelled');
    addLog('error', 'Payment CANCELLED');
    onCancelled();
  });

  // Failed event
  payment.on('failed', (data) => {
    console.log('❌ Payment failed');
    addLog('error', 'Payment FAILED');
    if (callbacks.onFailed) {
      callbacks.onFailed(data);
    }
  });

  // Error event
  payment.on('error', (error) => {
    console.error('⚠️ Payment error:', error);
    addLog('error', `Error: ${error.message}`);
  });

  // Start listening with the terminal's API client
  if (typeof payment.startListening === 'function') {
    payment.startListening(terminal.apiClient, 3000); // Poll every 3 seconds
    addLog('info', 'Listening for payment events...');
    console.log('👂 Started listening for payment updates (polling every 3s)');
  } else {
    console.warn('⚠️ startListening not available');
    addLog('warning', 'Real-time updates not available');
  }
}

// Stop payment listeners
export function stopPaymentListeners(payment, addLog) {
  if (payment && typeof payment.stopListening === 'function') {
    payment.stopListening();
    console.log('🛑 Stopped listening for payment updates');
    if (addLog) {
      addLog('info', 'Stopped listening for payment events');
    }
  }
}

// Cancel a payment
export async function cancelPayment(terminal, paymentId, addLog) {
  try {
    addLog('info', `Cancelling payment ${paymentId}...`);
    
    const cancelledPayment = await terminal.payments.cancel(paymentId);
    
    addLog('success', 'Payment cancelled');
    console.log('🚫 Payment cancelled:', cancelledPayment);
    
    return cancelledPayment;
    
  } catch (error) {
    console.error('❌ Cancel payment error:', error);
    addLog('error', `Cancel failed: ${error.message}`);
    throw error;
  }
}

// Get payment details
export async function getPayment(terminal, paymentId, addLog) {
  try {
    addLog('info', `Fetching payment ${paymentId}...`);
    
    const payment = await terminal.payments.get(paymentId);
    
    addLog('success', 'Payment retrieved');
    console.log('📄 Payment details:', payment);
    
    return payment;
    
  } catch (error) {
    console.error('❌ Get payment error:', error);
    addLog('error', `Fetch failed: ${error.message}`);
    throw error;
  }
}