import EventEmitter from 'events';

class Payment extends EventEmitter {
  constructor(data, db) {
    super();
    
    // Payment data
    this.id = data.paymentId || data.id;
    this.paymentId = data.paymentId || data.id;
    this.status = data.status;
    this.amount = data.amount;
    this.currency = data.currency;
    this.uId = data.uId;
    this.userEmail = data.userEmail || null;
    this.userName = data.userName || null;
    
    // QR and links
    this.qrCode = data.qrCode || data.deepLink;
    this.deepLink = data.deepLink;
    
    // Destinations
    this.destinations = data.destinations || {};
    
    // Metadata
    this.metadata = data.metadata || {};
    
    // Transaction info
    this.txHash = data.txHash || null;
    
    // Timestamps
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    this.confirmedAt = data.confirmedAt ? new Date(data.confirmedAt) : null;
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
    
    // Polling (no Firestore needed)
    this.pollingInterval = null;
    this.apiClient = null;
  }
  
  // Start polling for status changes
  startListening(apiClient, intervalMs = 3000) {
    if (this.pollingInterval) {
      console.log('[Payment] Already listening');
      return;
    }
    
    if (!apiClient) {
      throw new Error('API client is required for startListening');
    }
    
    this.apiClient = apiClient;
    
    console.log(`[Payment] Starting to poll every ${intervalMs}ms`);
    
    this.pollingInterval = setInterval(async () => {
      try {
        const response = await this.apiClient.get('/getPayment', {
          params: { id: this.id }
        });
        
        const data = response.data;
        const oldStatus = this.status;
        const newStatus = data.status;
        
        // Update internal state
        this.status = newStatus;
        this.txHash = data.txHash || null;
        this.confirmedAt = data.confirmedAt ? new Date(data.confirmedAt) : null;
        this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
        
        // Emit events if status changed
        if (oldStatus !== newStatus) {
          console.log(`[Payment] Status changed: ${oldStatus} → ${newStatus}`);
          this.emit('status_change', newStatus);
          
          // Emit specific status events
          if (newStatus === 'confirmed') {
            this.emit('confirmed', data);
            this.stopListening(); // Stop after confirmed
          } else if (newStatus === 'expired') {
            this.emit('expired');
            this.stopListening(); // Stop after expired
          } else if (newStatus === 'failed') {
            this.emit('failed', data);
            this.stopListening(); // Stop after failed
          } else if (newStatus === 'cancelled') {
            this.emit('cancelled', data);
            this.stopListening(); // Stop after cancelled
          }
        }
        
      } catch (error) {
        console.error('[Payment] Polling error:', error.message);
        this.emit('error', error);
      }
    }, intervalMs);
  }
  
  // Stop polling
  stopListening() {
    if (this.pollingInterval) {
      console.log('[Payment] Stopping polling');
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
  
  // Get current status
  getStatus() {
    return this.status;
  }
  
  // Get QR code
  getQRCode() {
    return this.qrCode;
  }
  
  // Get deep link
  getDeepLink() {
    return this.deepLink;
  }
  
  // Check if expired
  isExpired() {
    if (!this.expiresAt) return false;
    return Date.now() > this.expiresAt.getTime();
  }
  
  // Manual refresh
  async refresh(apiClient) {
    if (!apiClient) {
      throw new Error('API client is required for refresh');
    }
    
    try {
      const response = await apiClient.get('/getPayment', {
        params: { id: this.id }
      });
      
      const data = response.data;
      
      this.status = data.status;
      this.txHash = data.txHash || null;
      this.confirmedAt = data.confirmedAt ? new Date(data.confirmedAt) : null;
      this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
      
      return this;
    } catch (error) {
      throw new Error(`Failed to refresh payment: ${error.message}`);
    }
  }
}

export default Payment;