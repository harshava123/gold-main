import { useState, useEffect } from 'react';
import Employeeheader from './Employeeheader';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../Admin/StoreContext';
 

const purchaseTypes = [
  {
    value: 'GOLD',
    label: 'Gold purchase',
    sub: [
      { value: 'KACHA_GOLD', label: 'Kacha gold purchase' },
      { value: 'FINE_GOLD', label: 'Fine gold purchase' },
    ],
  },
  {
    value: 'SILVER',
    label: 'Silver purchase',
    sub: [
      { value: 'KACHA_SILVER', label: 'Kacha silver purchase' },
      { value: 'FINE_SILVER', label: 'Fine silver purchase' },
    ],
  },
];

function Purchases() {
  const [mainType, setMainType] = useState('GOLD');
  const [subType, setSubType] = useState('KACHA_GOLD');
  const [form, setForm] = useState({
    name: '',
    weight: '',
    touch: '',
    less: '',
    rate: '',
  });
  const [lessAuto, setLessAuto] = useState('');
  const [fineAuto, setFineAuto] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentType, setPaymentType] = useState('ACCOUNTS');
  
  const navigate = useNavigate();
  
  const { selectedStore } = useStore();
  
  // Note: Navigation guard removed to avoid blocking in Vercel static routing

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
            <p className="text-gray-600 mb-6">Please select a store from the employee dashboard to perform purchases.</p>
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

  useEffect(() => {
    if (mainType === 'GOLD') setSubType('KACHA_GOLD');
    else setSubType('KACHA_SILVER');
  }, [mainType]);

  useEffect(() => {
    const weight = parseFloat(form.weight) || 0;
    const touch = parseFloat(form.touch) || 0;
    const less = parseFloat(form.less) || 0;
    const rate = parseFloat(form.rate) || 0;

    let lessResult = '';
    let fineResult = '';
    let amt = '';

    if (subType === 'KACHA_GOLD' || subType === 'KACHA_SILVER') {
      lessResult = touch - less;
      fineResult = (lessResult / 100) * weight;
      amt = fineResult && rate ? (fineResult * rate).toFixed(0) : '';
    } else {
      fineResult = weight;
      amt = weight && rate ? (weight * rate).toFixed(0) : '';
    }

    setLessAuto(lessResult ? lessResult.toFixed(2) : '');
    setFineAuto(fineResult ? fineResult.toFixed(3) : '');
    setAmount(amt);
  }, [form, subType]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    navigate('/employee/purchases/confirm', {
      state: {
        ...form,
        mainType,
        subType,
        lessAuto,
        fine: fineAuto,
        amount,
        paymentType,
        storeId: selectedStore?.id,
        storeName: selectedStore?.name,
      },
    });
  };

  const isFormValid =
    form.name &&
    form.weight &&
    (subType.includes('FINE') || (form.touch && form.less)) &&
    form.rate;

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
                  All purchase transactions will be recorded for {selectedStore.name}
                </p>
              </div>
            </div>
          )}

          {/* Purchases Form Card */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-yellow-100">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl p-2">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m6 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Purchases</h2>
                  <p className="text-gray-600 text-sm">
                    Process {mainType.toLowerCase()} purchases with automatic calculations
                  </p>
                </div>
              </div>
              
            </div>

            {/* Purchase Type Selection */}
            <div className="space-y-4 mb-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Purchase Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {purchaseTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      className={`relative p-3 rounded-xl border-2 transition-all duration-200 ${
                        mainType === type.value
                          ? 'border-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg'
                          : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                      }`}
                      onClick={() => setMainType(type.value)}
                    >
                      <div className="text-center">
                        <div className="text-xl mb-1">{type.value === 'GOLD' ? '🥇' : '🥈'}</div>
                        <div className="font-bold text-gray-900 text-sm">{type.label}</div>
                        {mainType === type.value && (
                          <div className="absolute top-1 right-1">
                            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sub Type Selection */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Sub Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {purchaseTypes
                    .find((type) => type.value === mainType)
                    ?.sub.map((sub) => (
                      <button
                        key={sub.value}
                        type="button"
                        className={`relative p-3 rounded-xl border-2 transition-all duration-200 ${
                          subType === sub.value
                            ? 'border-indigo-400 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-lg'
                            : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50'
                        }`}
                        onClick={() => setSubType(sub.value)}
                      >
                        <div className="text-center">
                          <div className="text-lg mb-1">{sub.value.includes('KACHA') ? '🔧' : '✨'}</div>
                          <div className="font-bold text-gray-900 text-sm">{sub.label}</div>
                          {subType === sub.value && (
                            <div className="absolute top-1 right-1">
                              <svg className="w-4 h-4 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                </div>
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
                    <svg className="h-5 w-5 text-blue-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input 
                    name="name" 
                    value={form.name} 
                    onChange={handleChange} 
                    required 
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 text-base transition-all duration-200 bg-gray-50 focus:bg-white" 
                    placeholder="Enter customer name" 
                  />
                </div>
              </div>

              {/* Weight */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Weight (grams)
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-blue-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 text-base transition-all duration-200 bg-gray-50 focus:bg-white" 
                    placeholder="Enter weight" 
                    style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                  />
                </div>
              </div>

              {/* KACHA specific fields */}
              {subType.includes('KACHA') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Touch (%)
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-blue-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 text-base transition-all duration-200 bg-gray-50 focus:bg-white" 
                        placeholder="Enter touch %" 
                        style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Less
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-blue-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 text-base transition-all duration-200 bg-gray-50 focus:bg-white" 
                        placeholder="Enter less value" 
                        style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Auto Calculations for KACHA */}
              {subType.includes('KACHA') && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">Automatic Calculations</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-xs text-gray-600 mb-1">Touch - Less =</div>
                      <div className="bg-white rounded-lg p-2 border border-blue-200">
                        <span className="text-lg font-bold text-blue-700">{lessAuto || '0.00'}%</span>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-600 mb-1">Fine (grams)</div>
                      <div className="bg-white rounded-lg p-2 border border-blue-200">
                        <span className="text-lg font-bold text-blue-700">{fineAuto || '0.000'} gms</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Rate and Amount */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Rate (₹/gram)
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-blue-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 text-base transition-all duration-200 bg-gray-50 focus:bg-white" 
                      placeholder="Enter rate" 
                      style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Amount (₹)
                  </label>
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 border border-green-200">
                    <span className="text-2xl font-bold text-green-600 block text-center">₹{amount || '0'}</span>
                    <div className="text-xs text-gray-500 text-center">(automatically calculated)</div>
                  </div>
                </div>
              </div>

              {/* Payment Options */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-800">Payment Method</h3>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    className={`relative p-3 rounded-xl border-2 transition-all duration-200 ${
                      paymentType === 'ACCOUNTS'
                        ? 'border-yellow-500 bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-lg'
                        : 'border-gray-200 bg-white hover:border-yellow-300 hover:bg-yellow-50 text-gray-700'
                    } hover:shadow-md`}
                    onClick={() => setPaymentType('ACCOUNTS')}
                  >
                    <div className="text-center">
                      <div className="text-lg mb-1">🏦</div>
                      <div className="font-semibold text-sm">
                        {mainType === 'GOLD' 
                          ? 'Pay from available gold amount' 
                          : 'Pay from available silver amount'
                        }
                      </div>
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
                  onClick={handleSubmit}
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

export default Purchases;
