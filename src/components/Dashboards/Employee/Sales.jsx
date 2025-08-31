import { useState, useEffect } from 'react';
import Employeeheader from './Employeeheader';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../Admin/StoreContext';
 

function Sales() {
  const [saleType, setSaleType] = useState('GOLD');
  const [form, setForm] = useState({
    name: '',
    weight: '',
    rate: '',
    mode: 'CASH',
  });
  const [amount, setAmount] = useState('');
  const [selectedSource, setSelectedSource] = useState('LOCAL GOLD');
  
  const navigate = useNavigate();
  
  const { selectedStore } = useStore();
  
  // Note: Navigation guard removed to allow access even if no store is selected

  // Payment source labels
  const localLabel = saleType === 'SILVER' ? 'Pay from local silver' : 'Pay from local gold';
  const bankLabel = saleType === 'SILVER' ? 'Pay from kamal silver' : 'Pay from bank gold';
  const localSource = saleType === 'SILVER' ? 'LOCAL SILVER' : 'LOCAL GOLD';
  const bankSource = saleType === 'SILVER' ? 'KAMAL SILVER' : 'BANK GOLD';

  useEffect(() => {
    setSelectedSource(localSource);
  }, [saleType]);

  useEffect(() => {
    const weight = parseFloat(form.weight) || 0;
    const rate = parseFloat(form.rate) || 0;
    setAmount(weight && rate ? ((weight * rate) / 10).toFixed(0) : '');
  }, [form.weight, form.rate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleContinue = () => {
    navigate('/employee/sales/confirm', {
      state: {
        ...form,
        saleType,
        amount,
        source: selectedSource,
        storeId: selectedStore?.id,
        storeName: selectedStore?.name,
      },
    });
  };

  const isFormValid = form.name && form.weight && form.rate && form.mode;

  return (
    <>
      <Employeeheader />
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50">
        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Store Indicator */}
          {selectedStore && (
            <div className="mb-4">
              <div className="bg-gradient-to-r from-yellow-100 to-amber-100 border border-yellow-300 rounded-xl p-3 text-center shadow-lg">
                <h3 className="text-lg font-bold text-yellow-800">
                  🏪 Working for: <span className="text-yellow-900">{selectedStore.name}</span>
                </h3>
                <p className="text-yellow-700 text-xs mt-1">
                  All sales transactions will be recorded for {selectedStore.name}
                </p>
          </div>
            </div>
          )}

          {/* Sales Form Card */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-yellow-100">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-2">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {saleType === 'GOLD' ? 'Gold Sale' : 'Silver Sale'}
                  </h2>
                  <p className="text-gray-600 text-sm">
                    Process {saleType.toLowerCase()} sales with automatic amount calculation
                  </p>
                </div>
              </div>
              
            </div>

            {/* Sale Type Selection */}
            <div className="space-y-2 mb-4">
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Sale Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'GOLD', label: 'Gold Sale', icon: '🥇', desc: 'Sell gold items' },
                  { value: 'SILVER', label: 'Silver Sale', icon: '🥈', desc: 'Sell silver items' }
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`relative p-3 rounded-xl border-2 transition-all duration-200 ${
                      saleType === option.value
                        ? 'border-red-400 bg-gradient-to-r from-red-50 to-pink-50 shadow-lg'
                        : 'border-gray-200 bg-white hover:border-red-300 hover:bg-red-50'
                    }`}
                    onClick={() => setSaleType(option.value)}
                  >
                    <div className="text-center">
                      <div className="text-xl mb-1">{option.icon}</div>
                      <div className="font-bold text-gray-900 text-sm">{option.label}</div>
                      <div className="text-xs text-gray-600">{option.desc}</div>
                      {saleType === option.value && (
                        <div className="absolute top-1 right-1">
                          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <form className="space-y-4">
              {/* Customer Details */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Customer Name
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-green-400 group-focus-within:text-green-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input 
                    name="name" 
                    value={form.name} 
                    onChange={handleChange} 
                    required 
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 text-base transition-all duration-200 bg-gray-50 focus:bg-white" 
                    placeholder="Enter customer name" 
                  />
                </div>
              </div>

              {/* Sale Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Weight (grams)
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-green-400 group-focus-within:text-green-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                      </svg>
                    </div>
                    <input 
                      name="weight" 
                      value={form.weight} 
                      onChange={handleChange} 
                      required 
                      type="number" 
                      min="0" 
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 text-base transition-all duration-200 bg-gray-50 focus:bg-white" 
                      placeholder="Enter weight" 
                      style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Rate (₹/10 grams)
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-green-400 group-focus-within:text-green-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <input 
                      name="rate" 
                      value={form.rate} 
                      onChange={handleChange} 
                      required 
                      type="number" 
                      min="0" 
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 text-base transition-all duration-200 bg-gray-50 focus:bg-white" 
                      placeholder="Enter rate for 10 grams" 
                      style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                    />
                  </div>
                </div>
              </div>

              {/* Amount Calculation */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Amount Calculation</h3>
                <div className="text-center">
                  <div className="text-xs text-gray-600 mb-1">(Weight × Rate) ÷ 10 =</div>
                  <div className="bg-white rounded-lg p-3 border border-green-200">
                    <span className="text-2xl font-bold text-green-600">₹{amount || '0'}</span>
                    <div className="text-xs text-gray-500">(rate is per 10 grams)</div>
                  </div>
                </div>
              </div>

              {/* Payment Mode */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Payment Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'CASH', label: 'Cash', icon: '💵', desc: 'Cash payment' },
                    { value: 'ONLINE', label: 'Online', icon: '💳', desc: 'Digital payment' }
                  ].map((option) => (
                    <label 
                      key={option.value}
                      className={`relative cursor-pointer group transition-all duration-200 ${
                        form.mode === option.value 
                          ? 'ring-4 ring-green-200 bg-gradient-to-br from-green-50 to-emerald-50 border-green-400' 
                          : 'bg-white border-gray-200 hover:border-green-300 hover:bg-green-50'
                      } border-2 rounded-xl p-3 text-center`}
                    >
                      <input 
                        type="radio" 
                        name="mode" 
                        value={option.value} 
                        checked={form.mode === option.value} 
                        onChange={handleChange} 
                        className="sr-only" 
                      />
                      <div className="text-lg mb-1">{option.icon}</div>
                      <div className="font-bold text-gray-900 text-sm">{option.label}</div>
                      <div className="text-xs text-gray-600">{option.desc}</div>
                      {form.mode === option.value && (
                        <div className="absolute top-1 right-1">
                          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </label>
                  ))}
                </div>
            </div>

              {/* Source Selection */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-800">Source Selection</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                type="button"
                    className={`relative p-3 rounded-xl border-2 transition-all duration-200 ${
                      selectedSource === localSource
                        ? 'border-blue-500 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 text-gray-700'
                    } hover:shadow-md`}
                onClick={() => setSelectedSource(localSource)}
              >
                    <div className="text-center">
                      <div className="text-lg mb-1">🏪</div>
                      <div className="font-semibold text-sm">{localLabel}</div>
                      <div className="text-xs opacity-75">{localSource}</div>
                    </div>
              </button>
                  
              <button
                type="button"
                    className={`relative p-3 rounded-xl border-2 transition-all duration-200 ${
                      selectedSource === bankSource
                        ? 'border-yellow-500 bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-lg'
                        : 'border-gray-200 bg-white hover:border-yellow-300 hover:bg-yellow-50 text-gray-700'
                    } hover:shadow-md`}
                onClick={() => setSelectedSource(bankSource)}
              >
                    <div className="text-center">
                      <div className="text-lg mb-1">🏦</div>
                      <div className="font-semibold text-sm">{bankLabel}</div>
                      <div className="text-xs opacity-75">{bankSource}</div>
                    </div>
              </button>
            </div>
              </div>

              {/* Continue Button */}
              <div className="flex justify-center pt-4">
              <button
                type="button"
                disabled={!isFormValid}
                  className={`px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-bold text-lg flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${!isFormValid ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={handleContinue}
              >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  Continue to Confirmation
              </button>
                          </div>
            </form>
          </div>
        </div>

        
      </div>
      
      {/* Remove number input spinners */}
      <style>{`
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>
    </>
  );
}

export default Sales;
