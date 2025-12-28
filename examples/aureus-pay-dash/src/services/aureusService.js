import { fetchBusinessData, fetchTransactionData } from './firebaseService';

// Initialize Aureus Pay instance
export async function initializeAureus(apiKey, addLog) {
  try {
    console.log('🔵 Creating AureusPay instance...');
    addLog('info', 'Initializing Aureus Pay Terminal...');
    
    // Dynamically import AureusPay to avoid bundling issues
    const AureusPayModule = await import('aureus-pay');
    const AureusPay = AureusPayModule.default || AureusPayModule;
    
    const instance = new AureusPay({ customToken: apiKey });
    
    if (instance.authPromise) {
      console.log('🔵 Waiting for authentication...');
      addLog('info', 'Verifying token...');
      await instance.authPromise;
      console.log('✅ Authentication complete');
    }
    
    // Fetch business data from Firebase
    console.log('🔵 Fetching business information...');
    addLog('info', 'Loading business information...');
    
    const businessData = await fetchBusinessData(instance);
    
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
    throw error;
  }
}

// Create payment for a product
export async function createPayment(terminal, product, selectedChains, addLog) {
  try {
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
    return payment;
    
  } catch (error) {
    addLog('error', `Create Payment Failed: ${error.message}`);
    throw error;
  }
}

// Setup payment event listeners
export function setupPaymentListeners(payment, callbacks, addLog) {
  const { onStatusChange, onConfirmed, onExpired, onCancelled } = callbacks;
  
  if (typeof payment.on !== 'function') {
    console.warn('Payment object does not support event listeners');
    return;
  }

  // Helper function for payment completion
  async function handlePaymentComplete() {
    addLog('success', '🎉 PAYMENT CONFIRMED!');
    
    try {
      const transactionData = await fetchTransactionData(payment.id);
      
      if (transactionData) {
        console.log('📄 Complete transaction data:', transactionData);
        addLog('success', `Transaction: ${transactionData.txHash}`);
        
        // Call onConfirmed with complete data
        onConfirmed({
          ...payment,
          txHash: transactionData.txHash,
          confirmedAt: transactionData.confirmedAt,
          destinations: transactionData.destinations,
          userId: transactionData.userId,
          userName: transactionData.userName,
          fullData: transactionData
        });
      }
    } catch (error) {
      console.error('Error fetching transaction data:', error);
      onConfirmed(payment);
    }
  }

  payment.on('status_change', (status) => {
    addLog('event', `Status Change: ${status}`);
    onStatusChange(status);
    
    if (status === 'completed') {
      handlePaymentComplete();
    }
  });

  payment.on('confirmed', () => {
    handlePaymentComplete();
  });

  payment.on('expired', () => {
    addLog('warning', 'Payment EXPIRED');
    onExpired();
  });

  payment.on('cancelled', () => {
    addLog('error', 'Payment CANCELLED');
    onCancelled();
  });

  if (typeof payment.startListening === 'function') {
    payment.startListening();
    addLog('info', 'Listening for payment events...');
  }
}

// Stop payment listeners
export function stopPaymentListeners(payment) {
  if (payment && typeof payment.stopListening === 'function') {
    payment.stopListening();
  }
}