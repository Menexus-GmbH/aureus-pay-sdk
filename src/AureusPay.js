import axios from 'axios';
import Payment from './Payment.js';

const BASE_URL = 'https://us-central1-aureus-money.cloudfunctions.net';

class AureusPay {
  constructor(config) {
    if (!config.apiKey) {
      throw new Error('API key is required. Get it from your Aureus dashboard.');
    }
    
    this.apiKey = config.apiKey;
    this.baseURL = BASE_URL;
    this.debug = config.debug || false;
    
    // Create axios client with JWT
    this.apiClient = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    // Error interceptor (no token refresh needed with JWT)
    this.apiClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this._log('❌ API key invalid or expired. Please generate a new one.');
        }
        return Promise.reject(error);
      }
    );
    
    this.payments = {
      create: this.createPayment.bind(this),
      get: this.getPayment.bind(this),
      cancel: this.cancelPayment.bind(this)
    };
    
    this._log('✅ AureusPay initialized');
  }
  
  _log(...args) {
    if (this.debug) {
      console.log('[AureusPay]', ...args);
    }
  }
  
  async createPayment(data) {
    // Validate
    if (!data.amount || !data.currency) {
      throw new Error('amount and currency are required');
    }
    
    const validCurrencies = ['USDC', 'USDT', 'USD'];
    if (!validCurrencies.includes(data.currency)) {
      throw new Error(`currency must be one of: ${validCurrencies.join(', ')}`);
    }
    
    try {
      const response = await this.apiClient.post('/createPayment', {
        amount: data.amount.toString(),
        currency: data.currency,
        metadata: data.metadata || {}
      });
      
      return new Payment(response.data, null); // No Firestore in SDK anymore
      
    } catch (error) {
      if (error.response) {
        const msg = error.response.data?.error || error.response.data?.message || error.response.statusText;
        throw new Error(`Payment creation failed: ${msg}`);
      } else if (error.request) {
        throw new Error('Payment creation failed: No response from server');
      } else {
        throw new Error(`Payment creation failed: ${error.message}`);
      }
    }
  }

  async getPayment(paymentId) {
    if (!paymentId) {
      throw new Error('paymentId is required');
    }
    
    try {
      const response = await this.apiClient.get('/getPayment', {
        params: { id: paymentId }
      });
      
      return new Payment(response.data, null);
      
    } catch (error) {
      if (error.response) {
        const msg = error.response.data?.error || error.response.data?.message || error.response.statusText;
        throw new Error(`Get payment failed: ${msg}`);
      }
      throw new Error(`Get payment failed: ${error.message}`);
    }
  }

  async cancelPayment(paymentId) {
    if (!paymentId) {
      throw new Error('paymentId is required');
    }
    
    try {
      const response = await this.apiClient.post('/cancelPayment', {
        paymentId: paymentId
      });
      
      return new Payment(response.data, null);
      
    } catch (error) {
      if (error.response) {
        const msg = error.response.data?.error || error.response.data?.message || error.response.statusText;
        throw new Error(`Cancel payment failed: ${msg}`);
      }
      throw new Error(`Cancel payment failed: ${error.message}`);
    }
  }
}

export default AureusPay;