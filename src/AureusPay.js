import axios from 'axios';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import Payment from './Payment.js';

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCO3ybDZLqrphevvfzWNnb-7fHU-EFK3Ls",
  authDomain: "aureus-money.firebaseapp.com",
  projectId: "aureus-money",
  storageBucket: "aureus-money.appspot.com",
  messagingSenderId: "732676537783",
  measurementId: 'G-HSMLXNDWCR',
  appId: "1:732676537783:web:39c26fb75d1a8e25a1bc32"
};

const BASE_URL = 'https://us-central1-aureus-money.cloudfunctions.net';

class AureusPay {
  constructor(config) {
    if (!config.customToken) {
      throw new Error('Custom auth token is required. Get it from your Aureus dashboard.');
    }
    
    this.customToken = config.customToken;
    this.baseURL = BASE_URL;
    this.authenticated = false;
    this.debug = config.debug || false;
    
    if (getApps().length === 0) {
      initializeApp(FIREBASE_CONFIG);
    }
    
    this.auth = getAuth();
    this.db = getFirestore();
    this.authPromise = this.authenticate();
    
    this.payments = {
      create: this.createPayment.bind(this),
      get: this.getPayment.bind(this),
      cancel: this.cancelPayment.bind(this)
    };
  }
  
  _log(...args) {
    if (this.debug) {
      console.log('[AureusPay]', ...args);
    }
  }
  
  async authenticate() {
    try {
      const userCredential = await signInWithCustomToken(this.auth, this.customToken);
      this.user = userCredential.user;
      
      const idToken = await userCredential.user.getIdToken();
      
      this._log('✅ Authenticated as:', userCredential.user.uid);
      
      this.apiClient = axios.create({
        baseURL: this.baseURL,
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      // Auto-refresh expired tokens
      this.apiClient.interceptors.response.use(
        (response) => response,
        async (error) => {
          if (error.response?.status === 401 && this.user) {
            this._log('🔄 Refreshing token...');
            try {
              const newToken = await this.user.getIdToken(true);
              error.config.headers['Authorization'] = `Bearer ${newToken}`;
              return this.apiClient.request(error.config);
            } catch (refreshError) {
              return Promise.reject(refreshError);
            }
          }
          return Promise.reject(error);
        }
      );
      
      this.authenticated = true;
      return idToken;
      
    } catch (error) {
      this._log('❌ Authentication failed:', error.message);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }
  
  async createPayment(data) {
    await this.authPromise;
    
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
      
      return new Payment(response.data, this.db);
      
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
    await this.authPromise;
    
    if (!paymentId) {
      throw new Error('paymentId is required');
    }
    
    try {
      const response = await this.apiClient.get('/getPayment', {
        params: { id: paymentId }
      });
      
      return new Payment(response.data, this.db);
      
    } catch (error) {
      if (error.response) {
        const msg = error.response.data?.error || error.response.data?.message || error.response.statusText;
        throw new Error(`Get payment failed: ${msg}`);
      }
      throw new Error(`Get payment failed: ${error.message}`);
    }
  }

  async cancelPayment(paymentId) {
    await this.authPromise;
    
    if (!paymentId) {
      throw new Error('paymentId is required');
    }
    
    try {
      const response = await this.apiClient.post('/cancelPayment', {
        paymentId: paymentId
      });
      
      return new Payment(response.data, this.db);
      
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