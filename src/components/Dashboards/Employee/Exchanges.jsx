import { useState, useEffect } from 'react';
import Employeeheader from './Employeeheader';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../Admin/StoreContext';
 

function Exchanges() {
  const [form, setForm] = useState({
    name: '',
    weight: '',
    touch: '',
    less: '',
    type: 'GOLD',
  });

  const [lessAuto, setLessAuto] = useState('');
  const [fineAuto, setFineAuto] = useState('');
  const [amount, setAmount] = useState('');
  const [exchangeRate, setExchangeRate] = useState('0.25');
  
  const navigate = useNavigate();
  
  const { selectedStore } = useStore();
  
  // Note: Navigation guard removed to avoid blocking routes on Vercel

  // Store selection guard
  if (!selectedStore) {
    return (
      <>
        <Employeeheader />
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 flex items-center justify-center">
          <div className="text-center bg-white rounded-3xl shadow-2xl p-12 border border-yellow-100 max-w-md">
            <div className="bg-yellow-100 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Store Not Selected</h2>
            <p className="text-gray-600 mb-6">Please select a store from the employee dashboard to perform exchanges.</p>
            <button
              onClick={() => navigate('/employee')}
              className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </>
    );
  }

  // Determine labels based on type
  const localLabel = form.type === 'SILVER' ? 'Pay from local silver' : 'Pay from local gold';
  const bankLabel = form.type === 'SILVER' ? 'Pay from kamal silver' : 'Pay from bank gold';
  const localSource = form.type === 'SILVER' ? 'LOCAL SILVER' : 'LOCAL GOLD';
  const bankSource = form.type === 'SILVER' ? 'KAMAL SILVER' : 'BANK GOLD';

  const [selectedSource, setSelectedSource] = useState(localSource);

  // Form validation check - different requirements for GOLD vs SILVER
  const isFormValid = form.name && form.weight && form.touch && 
    (form.type === 'GOLD' || (form.type === 'SILVER' && amount && exchangeRate));

  useEffect(() => {
    const weight = parseFloat(form.weight) || 0;
    const touch = parseFloat(form.touch) || 0;
    const less = parseFloat(form.less) || 0;

    const lessResult = touch - less;
    setLessAuto(less ? lessResult.toFixed(2) : '');
    const fineResult = (lessResult / 100) * weight;
    setFineAuto(fineResult ? fineResult.toFixed(3) : '');

    // Amount calculation only for SILVER exchange
    if (form.type === 'SILVER') {
      const rate = parseFloat(exchangeRate) || 0;
      const rawAmount = (fineResult ? fineResult : 0) * rate;
      // Round UP to next multiple of 5
      const amt = Math.ceil(rawAmount / 5) * 5;
    setAmount(fineResult ? amt : '');
    } else {
      // For GOLD exchange, no amount calculation
      setAmount('');
    }
  }, [form.weight, form.touch, form.less, form.type, exchangeRate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleExchangeRateChange = (e) => {
    setExchangeRate(e.target.value);
  };

  const handleSubmit = (source) => {
    navigate('/employee/exchanges/confirm', {
      state: {
        ...form,
        lessAuto,
        fine: fineAuto,
        amount,
        exchangeRate,
        source,
        type: form.type,
        storeId: selectedStore?.id,
        storeName: selectedStore?.name,
      },
    });
  };

  const handlePaymentClick = (source) => {
    setSelectedSource(source);
    handleSubmit(source);
  };

  return (
    <>
      <Employeeheader />
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50">
        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Store Indicator */}
          {selectedStore && (
            <div className="mb-8">
              <div className="bg-gradient-to-r from-yellow-100 to-amber-100 border border-yellow-300 rounded-2xl p-6 text-center shadow-lg">
                <h3 className="text-xl font-bold text-yellow-800">
                  🏪 Working for: <span className="text-yellow-900">{selectedStore.name}</span>
                </h3>
                <p className="text-yellow-700 text-sm mt-2">
                  All exchange transactions will be recorded for {selectedStore.name}
                </p>
              </div>
            </div>
          )}

          {/* Exchange Form Card */}
          <div className="bg-white rounded-3xl shadow-2xl p-8 border border-yellow-100">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-r from-yellow-500 to-amber-500 rounded-2xl p-3">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">
                    {form.type === 'GOLD' ? 'Gold Exchange' : 'Silver Exchange'}
                  </h2>
                  <p className="text-gray-600 mt-1">
                    {form.type === 'GOLD' ? 'Exchange gold without amount calculation' : 'Exchange silver with amount calculation'}
                  </p>
                </div>
              </div>
              
            </div>

            <form className="space-y-6">
              {/* Exchange Type Selection */}
              <div className="space-y-3">
                <label className="block text-lg font-semibold text-gray-800 mb-3">
                  Exchange Type
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { value: 'GOLD', label: 'Gold Exchange', desc: 'No Amount', icon: '🥇' },
                    { value: 'SILVER', label: 'Silver Exchange', desc: 'With Amount', icon: '🥈' }
                  ].map((option) => (
                    <label 
                      key={option.value}
                      className={`relative cursor-pointer group transition-all duration-200 ${
                        form.type === option.value 
                          ? 'ring-4 ring-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-400' 
                          : 'bg-white border-gray-200 hover:border-yellow-300 hover:bg-yellow-50'
                      } border-2 rounded-2xl p-4 text-center`}
                    >
                      <input 
                        type="radio" 
                        name="type" 
                        value={option.value} 
                        checked={form.type === option.value} 
                        onChange={handleChange} 
                        className="sr-only" 
                      />
                      <div className="text-2xl mb-2">{option.icon}</div>
                      <div className="font-bold text-gray-900">{option.label}</div>
                      <div className="text-sm text-gray-600 mt-1">{option.desc}</div>
                      {form.type === option.value && (
                        <div className="absolute top-2 right-2">
                          <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Customer Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block text-lg font-semibold text-gray-800 mb-3">
                    Customer Name
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="h-6 w-6 text-yellow-400 group-focus-within:text-yellow-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                      className="w-full pl-14 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-yellow-100 focus:border-yellow-500 text-lg transition-all duration-200 bg-gray-50 focus:bg-white" 
                placeholder="Enter customer name"
              />
            </div>
                </div>
                <div className="space-y-3">
                  <label className="block text-lg font-semibold text-gray-800 mb-3">
                    Weight (grams)
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="h-6 w-6 text-yellow-400 group-focus-within:text-yellow-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      className="w-full pl-14 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-yellow-100 focus:border-yellow-500 text-lg transition-all duration-200 bg-gray-50 focus:bg-white" 
                      placeholder="Enter weight" 
                      style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
              />
            </div>
                </div>
              </div>
              {/* Quality Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block text-lg font-semibold text-gray-800 mb-3">
                    Touch (%)
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="h-6 w-6 text-yellow-400 group-focus-within:text-yellow-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
              <input
                name="touch"
                value={form.touch}
                onChange={handleChange}
                required
                type="number"
                min="0"
                max="100"
                step="0.01"
                      className="w-full pl-14 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-yellow-100 focus:border-yellow-500 text-lg transition-all duration-200 bg-gray-50 focus:bg-white" 
                      placeholder="Enter touch %" 
                      style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
              />
            </div>
                </div>
                <div className="space-y-3">
                  <label className="block text-lg font-semibold text-gray-800 mb-3">
                    Less
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="h-6 w-6 text-yellow-400 group-focus-within:text-yellow-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </div>
              <input
                name="less"
                value={form.less}
                onChange={handleChange}
                type="number"
                min="0"
                step="0.01"
                      className="w-full pl-14 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-yellow-100 focus:border-yellow-500 text-lg transition-all duration-200 bg-gray-50 focus:bg-white" 
                placeholder="Enter less value"
                style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
              />
            </div>
                </div>
              </div>

              {/* Exchange Rate for Silver */}
              {form.type === 'SILVER' && (
                <div className="space-y-3">
                  <label className="block text-lg font-semibold text-gray-800 mb-3">
                    Exchange Rate
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="h-6 w-6 text-yellow-400 group-focus-within:text-yellow-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <input
                      name="exchangeRate"
                      value={exchangeRate}
                      onChange={handleExchangeRateChange}
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full pl-14 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-yellow-100 focus:border-yellow-500 text-lg transition-all duration-200 bg-gray-50 focus:bg-white" 
                      placeholder="Enter exchange rate (e.g., 0.25)"
                      style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Rate used to calculate amount: Fine × Rate = Amount
                  </p>
                </div>
              )}

              {/* Auto Calculations */}
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-2xl p-6 border border-yellow-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Automatic Calculations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-600 mb-1">Touch - Less =</div>
                    <div className="bg-white rounded-xl p-3 border border-yellow-200">
                      <span className="text-xl font-bold text-yellow-700">{lessAuto || '0.00'}%</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600 mb-1">Fine (grams)</div>
                    <div className="bg-white rounded-xl p-3 border border-yellow-200">
                      <span className="text-xl font-bold text-yellow-700">{fineAuto || '0.000'} gms</span>
                    </div>
                  </div>
                  {form.type === 'SILVER' && (
                    <>
                      <div className="text-center">
                        <div className="text-sm text-gray-600 mb-1">Exchange Rate</div>
                        <div className="bg-white rounded-xl p-3 border border-yellow-200">
                          <span className="text-xl font-bold text-blue-600">{exchangeRate || '0.00'}</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-600 mb-1">Amount (₹)</div>
                        <div className="bg-white rounded-xl p-3 border border-yellow-200">
                          <span className="text-xl font-bold text-green-600">₹{amount || '0'}</span>
                          <div className="text-xs text-gray-500 mt-1">(rounded up)</div>
                        </div>
                      </div>
                    </>
                  )}
            </div>
            </div>

              {/* Payment Options */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Payment Source</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                disabled={!isFormValid}
                    className={`relative p-6 rounded-2xl border-2 transition-all duration-200 ${
                  selectedSource === localSource
                        ? 'border-blue-500 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 text-gray-700'
                    } ${!isFormValid ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}`}
                onClick={() => handlePaymentClick(localSource)}
              >
                    <div className="text-center">
                      <div className="text-2xl mb-2">🏪</div>
                      <div className="font-semibold text-lg">{localLabel}</div>
                      <div className="text-sm opacity-75 mt-1">{localSource}</div>
                    </div>
              </button>
                  
              <button
                type="button"
                disabled={!isFormValid}
                    className={`relative p-6 rounded-2xl border-2 transition-all duration-200 ${
                  selectedSource === bankSource
                        ? 'border-yellow-500 bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-lg'
                        : 'border-gray-200 bg-white hover:border-yellow-300 hover:bg-yellow-50 text-gray-700'
                    } ${!isFormValid ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}`}
                onClick={() => handlePaymentClick(bankSource)}
              >
                    <div className="text-center">
                      <div className="text-2xl mb-2">🏦</div>
                      <div className="font-semibold text-lg">{bankLabel}</div>
                      <div className="text-sm opacity-75 mt-1">{bankSource}</div>
                    </div>
              </button>
                </div>
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

export default Exchanges;
