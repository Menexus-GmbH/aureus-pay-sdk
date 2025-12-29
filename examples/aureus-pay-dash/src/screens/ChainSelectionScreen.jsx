import React from 'react';
import { Link2, CheckCircle2, AlertCircle, Info, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';
import Button from '../components/ui/Button';

const ChainSelectionScreen = ({ 
  businessInfo, 
  selectedChains, 
  onToggleChain, 
  onComplete,
  isLoading = false
}) => {
  console.log('🔍 ChainSelectionScreen props:', { businessInfo, selectedChains, isLoading });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-900 dark:text-slate-50">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-xl bg-slate-900 dark:bg-slate-700 flex items-center justify-center">
              <Link2 className="text-white h-6 w-6" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            {businessInfo?.businessName || 'Select Payment Chains'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Choose which blockchain networks to accept payments on
          </p>
        </div>

        {/* Chain Selection */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
          
          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 mx-auto mb-3 text-slate-400 animate-spin" />
              <p className="text-slate-500">Loading chains...</p>
            </div>
          )}

          {/* Chains Loaded */}
          {!isLoading && businessInfo?.chains && businessInfo.chains.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {businessInfo.chains.map((chain) => {
                  const isSelected = selectedChains.find(c => c.id === chain.id);
                  return (
                    <button
                      key={chain.id}
                      onClick={() => onToggleChain(chain)}
                      className={cn(
                        "p-4 rounded-lg border-2 text-left transition-all",
                        isSelected
                          ? "border-slate-900 bg-slate-50 dark:border-slate-50 dark:bg-slate-800"
                          : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-base">{chain.name}</span>
                        {isSelected && (
                          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mb-2 truncate">
                        {chain.address}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {chain.tokens?.map(token => (
                          <span
                            key={token}
                            className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded"
                          >
                            {token}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Info Box */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  You can select multiple chains. Customers will be able to pay using any of the selected networks.
                </p>
              </div>
            </>
          )}

          {/* No Chains */}
          {!isLoading && (!businessInfo?.chains || businessInfo.chains.length === 0) && (
            <div className="text-center py-8 text-slate-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No wallet addresses found for this business.</p>
              <p className="text-sm mt-2">Please set up wallet addresses in your Aureus app.</p>
            </div>
          )}

          {/* Footer */}
          <div className="pt-4 space-y-3 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Selected chains:</span>
              <span className="font-medium">
                {selectedChains.length > 0 
                  ? selectedChains.map(c => c.name).join(', ') 
                  : 'None'}
              </span>
            </div>
            <Button
              className="w-full"
              onClick={onComplete}
              disabled={selectedChains.length === 0 || isLoading}
            >
              Continue to Payment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChainSelectionScreen;