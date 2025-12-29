import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, ShieldCheck, ArrowLeft, Loader2, Building2, Wallet, LogOut } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { db } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const SettingsModal = ({ onClose }) => {
  const { apiKey, businessInfo: savedBusinessInfo, saveSettings, clearSettings } = useSettings();
  
  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [businessInfo, setBusinessInfo] = useState(savedBusinessInfo);
  const [showConfig, setShowConfig] = useState(!savedBusinessInfo);

  // Check if already configured on mount
  useEffect(() => {
    if (savedBusinessInfo && apiKey) {
      setBusinessInfo(savedBusinessInfo);
      setIsValid(true);
      setLocalApiKey(apiKey);
      setShowConfig(false);
    }
  }, [savedBusinessInfo, apiKey]);

  const validateApiKey = async (key) => {
    if (!key || key.trim() === '') {
      setError('Please enter an API key');
      setIsValid(false);
      return false;
    }

    setIsValidating(true);
    setError('');
    setIsValid(false);

    try {
      const parts = key.split('.');
      
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      const payload = JSON.parse(atob(parts[1]));

      if (!payload.uId) {
        throw new Error('Invalid JWT - missing user ID');
      }

      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('API key has expired');
      }

      console.log('✅ JWT decoded, uId:', payload.uId);

      const usersRef = collection(db, 'Users');
      const q = query(usersRef, where('uId', '==', payload.uId));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('Business not found in database');
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      if (userData.isFlagged || userData.autoBlock) {
        throw new Error('This account has been flagged or blocked');
      }

      console.log('✅ Business found:', userData.businessName || userData.userName);

      const chains = [];

      if (userData.walletAddress) {
        chains.push({
          id: 'hedera-hts',
          name: 'Hedera (HTS)',
          address: userData.walletAddress,
          tokens: ['HBAR', 'USDC', 'USDT'],
          type: 'hts'
        });
      }

      if (userData.accountAddress) {
        chains.push({
          id: 'hedera-evm',
          name: 'Hedera (EVM)',
          address: userData.accountAddress,
          tokens: ['USDC', 'USDT'],
          type: 'evm'
        });
      }

      if (userData.tradingAddress) {
        chains.push({
          id: 'ethereum',
          name: 'Ethereum',
          address: userData.tradingAddress,
          tokens: ['USDC', 'USDT', 'ETH'],
          type: 'evm'
        });
      }

      const info = {
        uId: payload.uId,
        businessName: userData.businessName || userData.userName,
        walletAddress: userData.walletAddress,
        userEmail: userData.userEmail,
        accountAddress: userData.accountAddress,
        tradingAddress: userData.tradingAddress,
        chains: chains
      };

      setBusinessInfo(info);
      setIsValid(true);
      setIsValidating(false);
      return true;

    } catch (err) {
      console.error('❌ API key validation failed:', err);
      
      let errorMessage = 'Invalid API key';
      
      if (err.message.includes('Invalid JWT format')) {
        errorMessage = 'Invalid API key format. Please check and try again.';
      } else if (err.message.includes('expired')) {
        errorMessage = 'API key has expired. Please generate a new one.';
      } else if (err.message.includes('missing user ID')) {
        errorMessage = 'Invalid API key structure.';
      } else if (err.message.includes('not found')) {
        errorMessage = 'Business not found. The API key may be invalid.';
      } else if (err.message.includes('flagged or blocked')) {
        errorMessage = 'This account has been suspended. Please contact support.';
      } else {
        errorMessage = `Validation failed: ${err.message}`;
      }

      setError(errorMessage);
      setIsValid(false);
      setIsValidating(false);
      return false;
    }
  };

  const handleValidate = async () => {
    await validateApiKey(localApiKey);
  };

  const handleSave = async () => {
    const valid = await validateApiKey(localApiKey);
    
    if (valid && businessInfo) {
      saveSettings(localApiKey, businessInfo, true, businessInfo.chains || []);
      setShowConfig(false);
      onClose();
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to disconnect? You will need to re-enter your API key.')) {
      clearSettings();
      setLocalApiKey('');
      setError('');
      setIsValid(false);
      setBusinessInfo(null);
      setShowConfig(true);
    }
  };

  const handleReconfigure = () => {
    setShowConfig(true);
  };

  const handleApiKeyChange = (e) => {
    setLocalApiKey(e.target.value);
    setError('');
    setIsValid(false);
  };

  // If already configured, show business dashboard
  if (!showConfig && businessInfo) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-slate-700 dark:text-slate-300" />
              </button>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Business Settings
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5 text-slate-700 dark:text-slate-300" />
            </button>
          </div>

          {/* Business Info */}
          <div className="p-6 space-y-6">
            {/* Business Card */}
            <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <div className="h-14 w-14 rounded-xl bg-slate-900 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                <Building2 className="text-white h-7 w-7" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
                  {businessInfo.businessName}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {businessInfo.userEmail || 'No email'}
                </p>
              </div>
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">Connected</span>
              </div>
            </div>

            {/* Wallet Addresses */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Wallet Addresses
              </h4>
              <div className="space-y-2">
                {businessInfo.chains?.map((chain) => (
                  <div
                    key={chain.id}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {chain.name}
                      </p>
                      <p className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate max-w-xs">
                        {chain.address}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {chain.tokens.slice(0, 3).map(token => (
                        <span
                          key={token}
                          className="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded text-slate-700 dark:text-slate-300"
                        >
                          {token}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="outline"
                onClick={handleReconfigure}
                className="flex-1"
              >
                Change API Key
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="flex-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show configuration form
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => businessInfo ? setShowConfig(false) : onClose()}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-slate-700 dark:text-slate-300" />
            </button>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Aureus Pay Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5 text-slate-700 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="flex justify-center">
                <div className="h-12 w-12 rounded-xl bg-slate-900 dark:bg-slate-700 flex items-center justify-center">
                  <ShieldCheck className="text-white h-6 w-6" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Configure Aureus Pay</h3>
              <p className="text-slate-600 dark:text-slate-300">
                Enter your API token to enable cryptocurrency payments
              </p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Input
                  label="API Authorization Token"
                  type="text"
                  placeholder="Enter your token..."
                  value={localApiKey}
                  onChange={handleApiKeyChange}
                  disabled={isValidating}
                />
                
                {isValid && !isValidating && (
                  <div className="absolute right-3 top-9">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                )}
                
                {isValidating && (
                  <div className="absolute right-3 top-9">
                    <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
                  </div>
                )}
              </div>

              {/* Business Info Display */}
              {isValid && businessInfo && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-700 dark:text-green-300">
                        API key validated successfully!
                      </p>
                      <div className="mt-2 text-sm text-green-600 dark:text-green-400 space-y-1">
                        <p><span className="font-medium">Business:</span> {businessInfo.businessName}</p>
                        {businessInfo.walletAddress && (
                          <p><span className="font-medium">Wallet:</span> {businessInfo.walletAddress}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => businessInfo ? setShowConfig(false) : onClose()}
                  className="flex-1 text-slate-900 dark:text-slate-100"
                  disabled={isValidating}
                >
                  Cancel
                </Button>
                
                {!isValid && (
                  <Button
                    onClick={handleValidate}
                    disabled={!localApiKey || isValidating}
                    className="flex-1"
                  >
                    {isValidating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      'Validate Key'
                    )}
                  </Button>
                )}
                
                {isValid && (
                  <Button
                    onClick={handleSave}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Save API Key
                  </Button>
                )}
              </div>
            </div>

            {/* Help Text */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-2">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                How to get your API key:
              </p>
              <ol className="text-sm text-slate-600 dark:text-slate-300 space-y-1 list-decimal list-inside">
                <li>Open the Aureus mobile app</li>
                <li>Go to your business settings</li>
                <li>Click "Generate API Key"</li>
                <li>Copy and paste it here</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;