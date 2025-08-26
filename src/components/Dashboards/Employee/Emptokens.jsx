import { useState, useEffect } from 'react';
import Adminheader from './Employeeheader';
import { db } from '../../../firebase';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { FaCheckCircle, FaExclamationCircle, FaUser, FaFileAlt, FaEdit, FaRupeeSign, FaPrint, FaFileSignature } from 'react-icons/fa';
import { useStore } from '../Admin/StoreContext';
import { useNavigate } from 'react-router-dom';
 
 
function Emptokens() {
  const [form, setForm] = useState({ name: '', purpose: 'GTS', amount: '' });
  const [customPurpose, setCustomPurpose] = useState('');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
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
            <p className="text-gray-600 mb-6">Please select a store from the employee dashboard to generate tokens.</p>
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
    const fetchTokenCount = async () => {
      if (!selectedStore) return;
      const snapshot = await getDocs(collection(db, 'tokens'));
      // Count only tokens for the selected store
      const storeTokens = snapshot.docs.filter(doc => doc.data().storeId === selectedStore.id);
      const nextNum = storeTokens.length + 1;
      // Generate token number directly without state
      const tokenNumber = `Tk-${String(nextNum).padStart(2, '0')}`;
      return tokenNumber;
    };
    fetchTokenCount();
  }, [preview, selectedStore]);
 
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === 'purpose' && value !== 'CUSTOM') setCustomPurpose('');
  };
 
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.amount.trim() || (form.purpose === 'CUSTOM' && !customPurpose.trim())) {
      setToast({ show: true, message: 'Please fill all required fields.', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'tokens'));
      const nextNum = snapshot.size + 1;
      const tokenNumber = `Tk-${String(nextNum).padStart(2, '0')}`;
      const today = new Date();
      const dateStr = today.toLocaleDateString('en-GB');
      await addDoc(collection(db, 'tokens'), {
        name: form.name,
        purpose: form.purpose === 'CUSTOM' ? customPurpose : form.purpose,
        amount: form.amount,
        tokenNo: tokenNumber,
        date: dateStr,
        storeId: selectedStore?.id,
        storeName: selectedStore?.name,
        createdAt: serverTimestamp(),
      });
      const currentTime = new Date().toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'});
      setPreview({ ...form, purpose: form.purpose === 'CUSTOM' ? customPurpose : form.purpose, tokenNo: tokenNumber, date: dateStr, time: currentTime });
      setForm({ name: '', purpose: 'GTS', amount: '' });
      setCustomPurpose('');
      setToast({ show: true, message: 'Token generated successfully!', type: 'success' });
    } catch {
      setToast({ show: true, message: 'Error generating token.', type: 'error' });
    }
    setLoading(false);
  };
 
  const handlePrint = () => {
    const printContents = document.getElementById('token-preview').innerHTML;
    const win = window.open('', '', 'height=600,width=500');
    win.document.write('<html><head><title>Token</title>');
    win.document.write('<style>@page { margin: 0 !important; size: auto !important; } body { margin: 0 !important; padding: 0 !important; background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } * { margin: 0 !important; padding: 0 !important; } #token-preview { border: 2px solid #000 !important; padding: 0 !important; width: 280px !important; margin: 0 auto !important; background: white !important; position: relative !important; top: 0 !important; left: 0 !important; right: auto !important; height: auto !important; } #token-preview > div { margin: 0 !important; padding: 15px !important; } .text-center{text-align:center;} .font-bold{font-weight:bold;} .font-semibold{font-weight:600;} .flex{display:flex;} .justify-between{justify-content:space-between;} .mb-2{margin-bottom:4px;} .mb-1{margin-bottom:2px;} .mb-3{margin-bottom:6px;} .mt-4{margin-top:16px;} .mt-2{margin-top:8px;} .w-20{width:80px;} .inline-block{display:inline-block;} .text-sm{font-size:11px;} .text-lg{font-size:15px;}</style>');
    win.document.write('</head><body>');
    win.document.write(printContents);
    win.document.write('</body></html>');
    win.document.close();
    win.print();
  };
 
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => setToast({ ...toast, show: false }), 2500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
 
  return (
    <>
      <Adminheader />
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50">
        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Token Creation Section */}
            <div className="space-y-8">
              <div className="bg-white rounded-3xl shadow-2xl p-8 border border-yellow-100">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-r from-yellow-500 to-amber-500 rounded-2xl p-3">
                      <FaFileSignature className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900">Create New Token</h2>
                      <p className="text-gray-600 mt-1">Fill in the details below to generate a professional token</p>
                    </div>
                  </div>
                  
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Customer Name */}
                  <div className="space-y-3">
                    <label className="block text-lg font-semibold text-gray-800 mb-3">
                      <FaUser className="inline w-5 h-5 mr-2 text-yellow-500" />
                      Customer Name
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FaUser className="h-6 w-6 text-yellow-400 group-focus-within:text-yellow-500 transition-colors" />
                      </div>
                      <input 
                        name="name" 
                        value={form.name} 
                        onChange={handleChange} 
                        required 
                        className="w-full pl-14 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-yellow-100 focus:border-yellow-500 text-lg transition-all duration-200 bg-gray-50 focus:bg-white" 
                        placeholder="Enter customer full name" 
                      />
              </div>
            </div>

                  {/* Purpose Selection */}
            <div className="space-y-4">
                    <label className="block text-lg font-semibold text-gray-800 mb-3">
                      <FaFileAlt className="inline w-5 h-5 mr-2 text-yellow-500" />
                      Service Purpose
                </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { value: 'GTS', label: 'GTS', icon: '🏆', desc: 'Gold Testing Service' },
                        { value: 'SOLDERING', label: 'Soldering', icon: '🔧', desc: 'Jewelry Repair' },
                        { value: 'CUSTOM', label: 'Custom', icon: '✨', desc: 'Other Services' }
                      ].map((option) => (
                        <label 
                          key={option.value}
                          className={`relative cursor-pointer group transition-all duration-200 ${
                            form.purpose === option.value 
                              ? 'ring-4 ring-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-400' 
                              : 'bg-white border-gray-200 hover:border-yellow-300 hover:bg-yellow-50'
                          } border-2 rounded-2xl p-6 text-center`}
                        >
                          <input 
                            type="radio" 
                            name="purpose" 
                            value={option.value} 
                            checked={form.purpose === option.value} 
                            onChange={handleChange} 
                            className="sr-only" 
                          />
                          <div className="text-3xl mb-2">{option.icon}</div>
                          <div className="font-bold text-gray-900 text-lg">{option.label}</div>
                          <div className="text-sm text-gray-600 mt-1">{option.desc}</div>
                          {form.purpose === option.value && (
                            <div className="absolute top-2 right-2">
                              <FaCheckCircle className="w-6 h-6 text-yellow-500" />
                            </div>
                          )}
                </label>
                      ))}
              </div>
                    
              {form.purpose === 'CUSTOM' && (
                      <div className="mt-6 animate-fade-in">
                        <label className="block text-base font-semibold text-gray-700 mb-2">
                          <FaEdit className="inline w-4 h-4 mr-2 text-yellow-500" />
                          Custom Purpose Details
                        </label>
                  <div className="relative">
                          <FaEdit className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-400 w-5 h-5" />
                    <input
                      type="text"
                      value={customPurpose}
                      onChange={e => setCustomPurpose(e.target.value)}
                      required
                            className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-yellow-100 focus:border-yellow-500 text-lg transition-all duration-200 bg-gray-50 focus:bg-white" 
                            placeholder="Describe the custom service purpose" 
                    />
                  </div>
                </div>
              )}
            </div>

                  {/* Amount */}
                  <div className="space-y-3">
                    <label className="block text-lg font-semibold text-gray-800 mb-3">
                      <FaRupeeSign className="inline w-5 h-5 mr-2 text-yellow-500" />
                      Service Amount
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FaRupeeSign className="h-6 w-6 text-yellow-400 group-focus-within:text-yellow-500 transition-colors" />
                      </div>
                      <input 
                        name="amount" 
                        value={form.amount} 
                        onChange={handleChange} 
                        required 
                        className="w-full pl-14 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-yellow-100 focus:border-yellow-500 text-lg transition-all duration-200 bg-gray-50 focus:bg-white" 
                        type="number" 
                        min="0" 
                        placeholder="Enter amount in rupees" 
                        style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button 
                    type="submit" 
                    disabled={loading} 
                    className="w-full bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 hover:from-yellow-600 hover:via-amber-600 hover:to-orange-600 text-white font-bold py-5 rounded-2xl text-xl flex items-center justify-center gap-3 transition-all duration-200 shadow-lg hover:shadow-2xl transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {loading ? (
                      <>
                        <span className="animate-spin"><FaFileAlt className="w-6 h-6" /></span>
                        Generating Token...
                      </>
                    ) : (
                      <>
                        <FaFileSignature className="w-6 h-6" />
                        Generate Professional Token
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Token Preview Section */}
            <div className="space-y-8">
              {preview ? (
                <div className="bg-white rounded-3xl shadow-2xl p-8 border border-yellow-100">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-3">
                      <FaCheckCircle className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900">Token Preview</h2>
                      <p className="text-gray-600 mt-1">Your generated token is ready for printing</p>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <div id="token-preview" className="p-0 w-[280px] bg-white relative shadow-2xl transform rotate-1 hover:rotate-0 transition-transform duration-300" style={{fontFamily: 'monospace'}}>
                      <div className="p-4">
                        <div className="text-center font-bold text-lg mb-1 text-yellow-800">SMDB</div>
                        <div className="text-center font-bold text-sm mb-1 text-yellow-800">Dilshuknagar, Hyderabad</div>
                        <div className="text-center font-bold text-sm mb-1 text-yellow-800">TOKEN RECEIPT</div>
                        <div className="text-yellow-700 font-semibold mb-1">DETAILS:</div>
                        
                        <div className="flex justify-between mb-1 text-base">
                          <span className="font-semibold">DATE: {preview.date}</span>
                          <span className="font-semibold">TIME: {preview.time}</span>
                        </div>
                        <div className="mb-2">
                          <div className="flex mb-1"><span className="w-20 inline-block font-semibold">NAME</span>: {preview.name}</div>
                          <div className="flex mb-1"><span className="w-20 inline-block font-semibold">PURPOSE</span>: {preview.purpose}</div>
                          <div className="flex mb-1"><span className="w-20 inline-block font-semibold">AMOUNT</span>: <span className="font-bold">₹{preview.amount}</span></div>
                        </div>
                        <div className="text-center text-yellow-700 font-semibold text-sm">THANK YOU VISIT AGAIN</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center mt-8">
                    <button 
                      onClick={handlePrint} 
                      className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl font-bold shadow-lg hover:shadow-2xl flex items-center gap-3 text-lg transition-all duration-200 transform hover:scale-105"
                    >
                      <FaPrint className="w-6 h-6" />
                      Print Token
            </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-3xl shadow-2xl p-8 border border-yellow-100">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="bg-gradient-to-r from-gray-400 to-gray-500 rounded-2xl p-3">
                      <FaFileAlt className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900">Token Preview</h2>
                      <p className="text-gray-600 mt-1">Generate a token to see the preview here</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-center items-center h-64 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
                    <div className="text-center">
                      <FaFileAlt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg font-medium">No token generated yet</p>
                      <p className="text-gray-400 text-sm mt-1">Fill the form and generate a token to see preview</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Toast Notification */}
        {toast.show && (
          <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 px-8 py-4 rounded-2xl shadow-2xl z-[9999] flex items-center gap-3 text-white text-lg font-semibold ${toast.type === 'success' ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-red-500 to-pink-600'} animate-fade-in`}>
            {toast.type === 'success' ? <FaCheckCircle className="w-6 h-6" /> : <FaExclamationCircle className="w-6 h-6" />}
            <span>{toast.message}</span>
          </div>
        )}

        
      </div>
      
      {/* Animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.25s ease;
        }
        
        /* Remove number input spinners */
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
 
export default Emptokens;
 