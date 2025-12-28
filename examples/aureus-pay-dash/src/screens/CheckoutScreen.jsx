import React, { useState, useEffect } from 'react';
import { ArrowLeft, QrCode, Clock, CheckCircle2 } from 'lucide-react';
import QRCode from 'react-qr-code';
import { cn } from '../utils/cn';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { createPayment, setupPaymentListeners, stopPaymentListeners } from '../services/aureusService';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import SuccessModal from '../components/SuccessModal';
import Receipt from '../components/Receipt';

const CheckoutScreen = ({ onBack }) => {
  const { cartItems, getCartTotal, clearCart } = useCart();
  const { terminal, selectedChains, businessInfo, apiKey, setTerminal, setBusinessInfo, saveSettings } = useSettings();
  
  const [activePayment, setActivePayment] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showChainSelection, setShowChainSelection] = useState(false);
  const [availableChains, setAvailableChains] = useState([]);
  const [localSelectedChains, setLocalSelectedChains] = useState([]);
  const [isInitializing, setIsInitializing] = useState(false);

  // Initialize terminal and fetch business info
  useEffect(() => {
    const initTerminal = async () => {
      if (!terminal && apiKey) {
        setIsInitializing(true);
        try {
          const { initializeAureus } = await import('../services/aureusService');
          const { instance, businessData } = await initializeAureus(apiKey, () => {});
          setTerminal(instance);
          setBusinessInfo(businessData);
          setAvailableChains(businessData.chains || []);
          
          // Only set local chains if already saved in settings
          if (selectedChains && selectedChains.length > 0) {
            setLocalSelectedChains(selectedChains);
          }
        } catch (error) {
          console.error('Failed to initialize terminal:', error);
        } finally {
          setIsInitializing(false);
        }
      } else if (businessInfo?.chains) {
        setAvailableChains(businessInfo.chains);
        // Sync with saved chains
        if (selectedChains && selectedChains.length > 0) {
          setLocalSelectedChains(selectedChains);
        }
      }
    };
    initTerminal();
  }, [terminal, apiKey, selectedChains, setTerminal, setBusinessInfo, businessInfo]);

  useEffect(() => {
    return () => {
      if (activePayment) {
        stopPaymentListeners(activePayment);
      }
    };
  }, [activePayment]);

  const handlePayWithAureus = () => {
    console.log('🔵 Pay button clicked');
    console.log('🔵 localSelectedChains:', localSelectedChains);
    console.log('🔵 availableChains:', availableChains);
    
    // Always show chain selection first
    if (!localSelectedChains || localSelectedChains.length === 0) {
      console.log('🔵 No chains selected - showing selection modal');
      setShowChainSelection(true);
    } else {
      console.log('🔵 Chains already selected - creating payment');
      handleCreatePayment();
    }
  };

  const handleChainSelectionComplete = () => {
    if (localSelectedChains.length === 0) return;
    
    // Save selected chains
    saveSettings(apiKey, localSelectedChains, true, terminal, businessInfo);
    setShowChainSelection(false);
    handleCreatePayment();
  };

  const toggleChain = (chain) => {
    setLocalSelectedChains(prev => {
      const exists = prev.find(c => c.id === chain.id);
      if (exists) {
        return prev.filter(c => c.id !== chain.id);
      }
      return [...prev, chain];
    });
  };

  const handleCreatePayment = async () => {
    if (!terminal || cartItems.length === 0) return;

    setIsCreating(true);
    setShowSuccess(false);

    const orderData = {
      price: getCartTotal(),
      currency: 'USDC',
      name: `Order (${cartItems.length} items)`,
      id: `order-${Date.now()}`,
      items: cartItems
    };

    try {
      const payment = await createPayment(terminal, orderData, localSelectedChains, () => {});

      setActivePayment(payment);
      setPaymentStatus('pending');

      setupPaymentListeners(
        payment,
        {
          onStatusChange: (status) => {
            setPaymentStatus(status);
          },
          onConfirmed: (paymentData) => {
            setPaymentStatus('confirmed');
            setActivePayment(paymentData);
            setShowSuccess(true);
          },
          onExpired: () => {
            setPaymentStatus('expired');
          },
          onCancelled: () => {
            setPaymentStatus('cancelled');
          }
        },
        () => {}
      );

    } catch (error) {
      console.error('Payment creation failed:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleNewTransaction = () => {
    if (activePayment) {
      stopPaymentListeners(activePayment);
    }
    setActivePayment(null);
    setPaymentStatus(null);
    setShowSuccess(false);
    clearCart();
    onBack();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="h-6 w-6 text-slate-900 dark:text-slate-100" />
          </button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Order Summary */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-50">Order Summary</h2>
            
            <div className="space-y-3 mb-6">
              {cartItems.map(item => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{item.emoji}</span>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-50">{item.name}</p>
                      <p className="text-sm text-slate-500">Qty: {item.quantity}</p>
                    </div>
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-slate-50">
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
              <div className="flex justify-between text-xl font-bold mb-4">
                <span className="text-slate-900 dark:text-slate-50">Total</span>
                <span className="text-slate-900 dark:text-slate-50">${getCartTotal().toFixed(2)} USDC</span>
              </div>

              {!activePayment && (
                <Button
                  onClick={handlePayWithAureus}
                  disabled={isCreating || isInitializing}
                  isLoading={isCreating || isInitializing}
                  className="w-full"
                >
                  Pay with Aureus Pay
                </Button>
              )}
            </div>
          </div>

          {/* Payment Gateway */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-slate-500" />
                <h2 className="font-semibold text-lg text-slate-900 dark:text-slate-50">Payment</h2>
              </div>
              {paymentStatus && <StatusBadge status={paymentStatus} />}
            </div>

            {activePayment ? (
              <div className="text-center space-y-6">
                {/* QR Code */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 inline-block">
                  <QRCode
                    value={`aureus://pay?id=${activePayment.id}`}
                    size={200}
                    className="h-auto w-full max-w-[200px]"
                  />
                </div>

                {/* Payment Info */}
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-1">Amount</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-slate-50">
                      ${getCartTotal().toFixed(2)} USDC
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-1">Payment ID</p>
                    <p className="text-xs font-mono bg-slate-100 dark:bg-slate-800 py-2 px-3 rounded text-slate-700 dark:text-slate-300 break-all">
                      {activePayment.id}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-1">Networks</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {localSelectedChains.map(c => c.name).join(', ')}
                    </p>
                  </div>
                </div>

                {paymentStatus === 'pending' && (
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-500 animate-pulse">
                    <Clock className="h-4 w-4" />
                    <span>Scan QR code to pay</span>
                  </div>
                )}

                <Button
                  variant="outline"
                  onClick={() => {
                    stopPaymentListeners(activePayment);
                    setActivePayment(null);
                    setPaymentStatus(null);
                  }}
                  className="w-full"
                >
                  Cancel Payment
                </Button>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <QrCode className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p>Click "Pay with Aureus Pay" to generate QR code</p>
              </div>
            )}
          </div>
        </div>

        {/* Success Modal */}
        {showSuccess && !showReceipt && (
          <SuccessModal
            payment={activePayment}
            product={{ 
              price: getCartTotal().toFixed(2), 
              currency: 'USDC',
              name: `Order (${cartItems.length} items)`
            }}
            onViewReceipt={() => setShowReceipt(true)}
            onNewTransaction={handleNewTransaction}
          />
        )}

        {/* Chain Selection Modal */}
        {showChainSelection && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header with back button */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowChainSelection(false)}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                  </button>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Select Payment Chains
                  </h2>
                </div>
              </div>
              
              <div className="p-6">
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <p className="text-slate-600 dark:text-slate-300">
                      Choose which blockchain networks to accept for this payment
                    </p>
                  </div>

                  {availableChains.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {availableChains.map((chain) => {
                        const isSelected = localSelectedChains.find(c => c.id === chain.id);
                        return (
                          <button
                            key={chain.id}
                            onClick={() => toggleChain(chain)}
                            className={cn(
                              "p-4 rounded-lg border-2 text-left transition-all",
                              isSelected
                                ? "border-slate-900 bg-slate-50 dark:border-slate-400 dark:bg-slate-700"
                                : "border-slate-200 hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-500 dark:bg-slate-800"
                            )}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-slate-900 dark:text-slate-100">{chain.name}</span>
                              {isSelected && <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />}
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 font-mono mb-1 truncate">{chain.address}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {chain.tokens?.join(', ') || 'USDC, USDT'}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <p>Loading chains...</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowChainSelection(false)}
                      className="flex-1 text-slate-900 dark:text-slate-100"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleChainSelectionComplete}
                      disabled={localSelectedChains.length === 0}
                      className="flex-1"
                    >
                      Continue to Payment
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Receipt */}
        {showReceipt && (
          <Receipt
            payment={activePayment}
            product={{ 
              price: getCartTotal().toFixed(2), 
              currency: 'USDC',
              name: `Order (${cartItems.length} items)`,
              emoji: '🛒'
            }}
            businessInfo={businessInfo}
            selectedChains={localSelectedChains}
            onClose={handleNewTransaction}
          />
        )}
      </div>
    </div>
  );
};

export default CheckoutScreen;