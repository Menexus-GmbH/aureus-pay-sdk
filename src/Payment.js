

import  EventEmitter from 'events'
import { onSnapshot, doc } from 'firebase/firestore';


class Payment extends EventEmitter {
  constructor(data, db) {
    super();
    
     // Payment data (handle both formats)
    this.id = data.paymentId || data.id;
    this.paymentId = data.paymentId || data.id;
    this.status = data.status;
    this.amount = data.amount;
    this.currency = data.currency;
    this.userId = data.userId;
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
    
    // Timestamps (convert to Date if they're numbers)
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    this.confirmedAt = data.confirmedAt ? new Date(data.confirmedAt) : null;
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
    
    // Firebase
    this.db = db;
    this.listener = null;
  
  }
  
  // Start listening for status changes
  // Start listening for status changes
startListening() {
  if (this.listener) return; // Already listening
  
  const docRef = doc(this.db, 'payments', this.id);
  
  this.listener = onSnapshot(docRef, (snapshot) => {
    if (!snapshot.exists()) return;
    
    const data = snapshot.data();
    const oldStatus = this.status;
    const newStatus = data.status;
    
    // Update internal state
    this.status = newStatus;
    this.txHash = data.txHash || null;
    this.confirmedAt = data.confirmedAt ? new Date(data.confirmedAt) : null;
    
    // Emit events if status changed
    if (oldStatus !== newStatus) {
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
      }
    }
  }, (error) => {
    this.emit('error', error);
  });
}
  
  // Stop listening
  stopListening() {
    if (this.listener) {
      this.listener(); // Unsubscribe
      this.listener = null;
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
    return Date.now() > this.expiresAt.getTime();
  }
  
  // Refresh status from server (manual)
  async refresh(apiClient) {
    try {
      const response = await apiClient.get(`/payments/${this.id}`);
      const data = response.data;
      
      this.status = data.status;
      this.txHash = data.txHash || null;
      this.confirmedAt = data.confirmedAt ? new Date(data.confirmedAt) : null;
      
      return this;
    } catch (error) {
      throw new Error(`Failed to refresh payment: ${error.message}`);
    }
  }
}

export default Payment; 
