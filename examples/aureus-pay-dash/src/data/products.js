export const products = [
  {
    id: 'robot',
    name: 'Robot',
    price: 0.1,
    currency: 'USDC',
    emoji: '🤖'
  },
  {
    id: 'coffee',
    name: 'Coffee',
    price: 0.05,
    currency: 'USDC',
    emoji: '☕'
  },
  {
    id: 'laptop',
    name: 'Laptop',
    price: 500,
    currency: 'USDC',
    emoji: '💻'
  }
];

export const getTokensForChain = (chainName) => {
  const tokenMap = {
    'ethereum': ['ETH', 'USDC', 'USDT'],
    'polygon': ['MATIC', 'USDC', 'USDT'],
    'base': ['ETH', 'USDC'],
    'arbitrum': ['ETH', 'USDC', 'USDT'],
    'optimism': ['ETH', 'USDC', 'USDT'],
    'bsc': ['BNB', 'USDC', 'USDT'],
  };
  
  return tokenMap[chainName.toLowerCase()] || ['USDC', 'USDT'];
};