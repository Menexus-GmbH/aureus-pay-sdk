import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getTokensForChain } from '../data/products';

export const fetchBusinessData = async (apiKey) => {
  try {
    // Decode JWT to get uId
    const parts = apiKey.split('.');
    
    if (parts.length !== 3) {
      throw new Error('Invalid API key format');
    }

    const payload = JSON.parse(atob(parts[1]));
    const userId = payload.uId;
    
    if (!userId) {
      throw new Error('No user ID found in API key');
    }
    
    console.log('🔵 Fetching data for business:', userId);
    
    const db = getFirestore();
    
    // Query Users collection by uId field
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const usersRef = collection(db, 'Users');
    const q = query(usersRef, where('uId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error('Business not found');
    }
    
    const businessDoc = querySnapshot.docs[0];
    const data = businessDoc.data();
    console.log('📄 Business data:', data);
    
    const chains = [];
    
    // Hedera HTS
    if (data.walletAddress) {
      chains.push({
        id: 'hedera-hts',
        name: 'Hedera (HTS)',
        address: data.walletAddress,
        tokens: ['USDC', 'USDT', 'HBAR']
      });
    }
    
    // Hedera Native
    if (data.accountAddress && data.accountAddress !== data.walletAddress) {
      chains.push({
        id: 'hedera-native',
        name: 'Hedera (Native)',
        address: data.accountAddress,
        tokens: ['HBAR']
      });
    }
    
    // EVM Chains
    if (data.tradingAddressesByChain) {
      Object.entries(data.tradingAddressesByChain).forEach(([chainName, address]) => {
        const formattedChainName = chainName.charAt(0).toUpperCase() + chainName.slice(1);
        chains.push({
          id: chainName.toLowerCase(),
          name: formattedChainName,
          address: address,
          tokens: getTokensForChain(chainName)
        });
      });
    }
    
    // Fallback
    if (data.tradingAddress && !data.tradingAddressesByChain) {
      chains.push({
        id: 'ethereum',
        name: 'Ethereum',
        address: data.tradingAddress,
        tokens: ['ETH', 'USDC', 'USDT']
      });
    }
    
    return {
      businessId: userId,
      businessName: data.businessName || data.userName || 'Business',
      chains: chains,
      walletAddress: data.walletAddress,
      accountAddress: data.accountAddress,
      tradingAddress: data.tradingAddress,
      rawData: data
    };
    
  } catch (error) {
    console.error('❌ Error fetching business data:', error);
    throw error;
  }
};

export const fetchTransactionData = async (paymentId) => {
  try {
    const db = getFirestore();
    const paymentDoc = await getDoc(doc(db, 'payments', paymentId));
    
    if (paymentDoc.exists()) {
      return paymentDoc.data();
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching transaction data:', error);
    throw error;
  }
};