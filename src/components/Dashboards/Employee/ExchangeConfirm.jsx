import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db, auth } from '../../../firebase';
import { collection, addDoc, getDocs, query, where, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import Employeeheader from './Employeeheader';
import { useStore } from '../Admin/StoreContext';
 
function ExchangeConfirm() {
  const location = useLocation();
  const navigate = useNavigate();
  const data = location.state || {};
 
  const [available, setAvailable] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [loading, setLoading] = useState(false);
  const [employee, setEmployee] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [insufficient, setInsufficient] = useState(false);
 
  const localType = data.type === 'SILVER' ? 'LOCAL SILVER' : 'LOCAL GOLD';
  const bankType = data.type === 'SILVER' ? 'KAMAL SILVER' : 'BANK GOLD';
 
  const { selectedStore } = useStore();
  
  // Navigate to employee dashboard if no store is selected
  useEffect(() => {
    if (!selectedStore) navigate('/employee');
  }, [selectedStore, navigate]);

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
            <p className="text-gray-600 mb-6">Please select a store from the employee dashboard to confirm exchanges.</p>
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

  // Auto-hide toast after 2 seconds
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast({ show: false, message: '', type: 'success' });
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [toast.show]);
  
  const [selectedSource, setSelectedSource] = useState(data.source || localType);
 
  // Labels
  const localLabel = data.type === 'SILVER' ? 'Pay from local silver' : 'Pay from local gold';
  const bankLabel = data.type === 'SILVER' ? 'Pay from kamal silver' : 'Pay from bank gold';
  const availableLabel = selectedSource === localType
    ? localLabel.replace('Pay from ', 'Available ')
    : bankLabel.replace('Pay from ', 'Available ');
 
  // Get current employee
  useEffect(() => {
    const fetchUser = async () => {
      const user = auth.currentUser;
      if (user) {
        const q = query(collection(db, 'users'), where('email', '==', user.email));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const userData = snapshot.docs[0].data();
          setEmployee(userData.name || user.email);
        }
      }
    };
    fetchUser();
  }, []);
 
  // Fetch available stock
  useEffect(() => {
    const fetchAvailable = async () => {
      if (!selectedStore) return;
      
      const reservesCol = data.type === 'GOLD' ? 'goldreserves' : 'silverreserves';
      const typeVal = selectedSource === localType ? localType : bankType;
      const q = query(
        collection(db, reservesCol), 
        where('type', '==', typeVal),
        where('storeId', '==', selectedStore.id)
      );
      const snapshot = await getDocs(q);
      let latestTotal = 0;
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        if (typeof d.totalingms === 'number' && d.totalingms > latestTotal) {
          latestTotal = d.totalingms;
        }
      });
      setAvailable(latestTotal);
      const fine = parseFloat(data.fine) || 0;
      const rem = latestTotal - fine;
      setRemaining(rem);
      setInsufficient(rem < 0);
 
      // Notify admin if insufficient
      if (rem < 0) {
        const notifCol = collection(db, 'admin_notifications');
        const notifQ = query(
          notifCol, 
          where('reserveType', '==', typeVal), 
          where('storeId', '==', selectedStore.id),
          where('seen', '==', false)
        );
        const notifSnap = await getDocs(notifQ);
        if (notifSnap.empty) {
          await addDoc(notifCol, {
            reserveType: typeVal,
            storeId: selectedStore.id,
            storeName: selectedStore.name,
            message: `${typeVal} is insufficient for transaction in ${selectedStore.name}! Only ${latestTotal}g available.`,
            createdAt: serverTimestamp(),
            seen: false,
            link: reservesCol === 'goldreserves' ? '/admin/gold-reserves' : '/admin/silver-reserves',
          });
        }
      }
    };
    fetchAvailable();
  }, [data.type, selectedSource, data.fine, selectedStore]);
 
  const handleApprove = async () => {
    if (insufficient) return;
    setLoading(true);
    try {
      const reservesCol = data.type === 'GOLD' ? 'goldreserves' : 'silverreserves';
      const typeVal = selectedSource === localType ? localType : bankType;
 
      const q = query(
        collection(db, reservesCol), 
        where('type', '==', typeVal),
        where('storeId', '==', selectedStore.id)
      );
      const snapshot = await getDocs(q);
 
      let latestTotal = 0;
      let latestDocId = null;
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        if (typeof d.totalingms === 'number' && d.totalingms > latestTotal) {
          latestTotal = d.totalingms;
          latestDocId = docSnap.id;
        }
      });
 
      const fine = parseFloat(data.fine) || 0;
      const newTotal = latestTotal - fine;
 
      if (latestDocId) {
        await updateDoc(doc(db, reservesCol, latestDocId), {
          availableingms: newTotal,
          totalingms: newTotal,
        });
      }
 
      // Low stock notification logic
      if (newTotal < 10) {
        const notifCol = collection(db, 'admin_notifications');
        const notifQ = query(
          notifCol, 
          where('reserveType', '==', typeVal), 
          where('storeId', '==', selectedStore.id),
          where('seen', '==', false)
        );
        const notifSnap = await getDocs(notifQ);
        if (notifSnap.empty) {
          await addDoc(notifCol, {
            reserveType: typeVal,
            storeId: selectedStore.id,
            storeName: selectedStore.name,
            message: `${typeVal} is low in ${selectedStore.name}: ${newTotal}g remaining!`,
            createdAt: serverTimestamp(),
            seen: false,
            link: reservesCol === 'goldreserves' ? '/admin/gold-reserves' : '/admin/silver-reserves',
          });
        }
      }
 
      await addDoc(collection(db, 'exchanges'), {
        ...data,
        source: selectedSource,
        employee,
        storeId: selectedStore.id,
        storeName: selectedStore.name,
        date: new Date().toLocaleDateString('en-GB'),
        createdAt: serverTimestamp(),
      });
 
      setToast({ show: true, message: 'Transaction approved!', type: 'success' });
      
      // Print receipt after successful transaction
      printReceipt();
      
      setTimeout(() => navigate('/employee/exchanges'), 1500);
    } catch (err) {
      console.error(err);
      setToast({ show: true, message: 'Error approving transaction.', type: 'error' });
    }
    setLoading(false);
  };
 
  const printReceipt = () => {
    const currentDate = new Date().toLocaleDateString('en-GB');
    const currentTime = new Date().toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'});
    
    // Create a temporary div for printing
    const printDiv = document.createElement('div');
    printDiv.innerHTML = `
      <div class="print-content" style="
        font-family: 'Courier New', monospace; 
        margin: 0; 
        font-size: 12px;
        line-height: 1.4;
        background: white;
        padding: 0;
        width: 280px;
        margin: 0 auto;
        text-align: center;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        z-index: 9999;
        border: 2px solid #000;
      ">
        <div style="padding: 15px;">
        <div style="font-size: 16px; font-weight: bold; margin-bottom: 8px;">
          SMDB
        </div>
        <div style="font-size: 12px; font-weight: bold; margin-bottom: 8px;">
          Dilshuknagar, Hyderabad
        </div>
        <div style="font-size: 12px; font-weight: bold; margin-bottom: 8px; text-align: center;">
          ${data.type === 'GOLD' ? 'GOLD EXCHANGE' : 'SILVER EXCHANGE'}
        </div>
        <div style="font-size: 12px; font-weight: bold; margin-bottom: 8px; text-align: left;">
          DETAILS:
        </div>
        
        <div style="text-align: left; margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; margin: 2px 0;">
            <span style="font-weight: bold;">DATE: ${currentDate}</span>
            <span style="font-weight: bold;">TIME: ${currentTime}</span>
          </div>
          <div style="margin: 2px 0;"><span style="font-weight: bold; display: inline-block; width: 80px;">NAME</span>: ${data.name}</div>
          <div style="margin: 2px 0;"><span style="font-weight: bold; display: inline-block; width: 80px;">WEIGHT</span>: ${data.weight} gms</div>
          <div style="margin: 2px 0;"><span style="font-weight: bold; display: inline-block; width: 80px;">TOUCH</span>: ${data.touch} %</div>
          <div style="margin: 2px 0;"><span style="font-weight: bold; display: inline-block; width: 80px;">LESS</span>: ${data.less} %</div>
          <div style="margin: 2px 0;"><span style="font-weight: bold; display: inline-block; width: 80px;">FINE</span>: ${data.fine} gms</div>
          ${data.type === 'SILVER' ? `<div style="margin: 2px 0;"><span style="font-weight: bold; display: inline-block; width: 80px;">AMOUNT</span>: <span style="font-weight: bold;">₹${data.amount}</span></div>` : ''}
        </div>
        
        <div style="margin-top: 8px; font-size: 11px; font-weight: bold; text-align: center;">
          THANK YOU VISIT AGAIN
        </div>
        </div>
      </div>
    `;
    
    // Add the print div to the page temporarily
    document.body.appendChild(printDiv);
    
    // Hide the entire page content
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.style.display = 'none';
    }
    
    // Hide all other body elements
    const bodyChildren = document.body.children;
    for (let i = 0; i < bodyChildren.length; i++) {
      const child = bodyChildren[i];
      if (child !== printDiv) {
        child.style.display = 'none';
      }
    }
    
    // Add print-specific styles to remove margins and padding
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        @page {
          margin: 0 !important;
          size: auto !important;
        }
        body {
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        * {
          margin: 0 !important;
          padding: 0 !important;
        }
        .print-content {
          margin: 0 !important;
          padding: 0 !important;
          border: 2px solid #000 !important;
          box-shadow: none !important;
          position: relative !important;
          top: 0 !important;
          left: 0 !important;
          right: auto !important;
          width: 280px !important;
          height: auto !important;
        }
        .print-content > div {
          margin: 0 !important;
          padding: 15px !important;
        }
      }
    `;
    document.head.appendChild(style);
    
    // Print
    window.print();
    
    // Restore original display after printing
    setTimeout(() => {
      // Show the root element again
      if (rootElement) {
        rootElement.style.display = '';
      }
      
      // Show all body children again
      for (let i = 0; i < bodyChildren.length; i++) {
        const child = bodyChildren[i];
        if (child !== printDiv) {
          child.style.display = '';
        }
      }
      
      // Remove the print div and style
      document.body.removeChild(printDiv);
      document.head.removeChild(style);
    }, 1000);
  };

  const handleDeny = () => {
    if (insufficient) return;
    navigate('/employee/exchanges');
  };
 
  return (
    <>
      <Employeeheader />
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50">
        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Store Indicator */}
          {selectedStore && (
            <div className="mb-4">
              <div className="bg-gradient-to-r from-yellow-100 to-amber-100 border border-yellow-300 rounded-xl p-3 text-center shadow-lg">
                <h3 className="text-lg font-bold text-yellow-800">
                  🏪 Working for: <span className="text-yellow-900">{selectedStore.name}</span>
                </h3>
                <p className="text-yellow-700 text-xs mt-1">
                  Transaction will be recorded for {selectedStore.name}
                </p>
              </div>
            </div>
          )}

          {/* Exchange Confirmation Card */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-yellow-100">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl p-2">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Exchange Confirmation</h2>
                <p className="text-gray-600 text-sm">
                  Review and confirm the exchange details
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Exchange Details */}
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Exchange Details</h3>
                  <div className="font-mono text-sm space-y-2">
                    <div className="mb-3 p-3 bg-white rounded-lg border border-purple-200">
                      <div className="font-bold text-purple-700 mb-2">
                        {data.type === 'GOLD' ? '🥇 Gold Exchange' : '🥈 Silver Exchange'}
                      </div>
                      <div className="space-y-1">
                        <div><b>Name</b>: {data.name}</div>
                        <div><b>Weight</b>: {data.weight} gms</div>
                        <div><b>Touch</b>: {data.touch} %</div>
                        <div><b>Less</b>: {data.less} %</div>
                        <div><b>Fine</b>: {data.fine} gms</div>
                        {data.type === 'SILVER' && (
                          <div><b>Amount</b>: <b>₹{data.amount}</b></div>
                        )}
                        <div><b>Type</b>: {data.type}</div>
                        <div><b>Source</b>: {data.source}</div>
                        <div><b>Employee</b>: {employee}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Source Selection */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Payment Source</h3>
                  <div className="flex justify-center">
                    {selectedSource === localType ? (
                      <button
                        type="button"
                        className="relative p-4 rounded-xl border-2 border-blue-500 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transition-all duration-200 hover:shadow-xl"
                      >
                        <div className="text-center">
                          <div className="text-xl mb-2">🏪</div>
                          <div className="font-semibold text-lg">{localLabel}</div>
                          <div className="text-sm opacity-90">{localType}</div>
                          <div className="text-xs opacity-75 mt-1">Selected</div>
                        </div>
                      </button>
                    ) : selectedSource === bankType ? (
                      <button
                        type="button"
                        className="relative p-4 rounded-xl border-2 border-yellow-500 bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-lg transition-all duration-200 hover:shadow-xl"
                      >
                        <div className="text-center">
                          <div className="text-xl mb-2">🏦</div>
                          <div className="font-semibold text-lg">{bankLabel}</div>
                          <div className="text-sm opacity-90">{bankType}</div>
                          <div className="text-xs opacity-75 mt-1">Selected</div>
                        </div>
                      </button>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedSource(localType)}
                          className="relative p-3 rounded-xl border-2 border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 text-gray-700 transition-all duration-200 hover:shadow-md"
                        >
                          <div className="text-center">
                            <div className="text-lg mb-1">🏪</div>
                            <div className="font-semibold text-sm">{localLabel}</div>
                            <div className="text-xs opacity-75">{localType}</div>
                          </div>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setSelectedSource(bankType)}
                          className="relative p-3 rounded-xl border-2 border-gray-200 bg-white hover:border-yellow-300 hover:bg-yellow-50 text-gray-700 transition-all duration-200 hover:shadow-md"
                        >
                          <div className="text-center">
                            <div className="text-lg mb-1">🏦</div>
                            <div className="font-semibold text-sm">{bankLabel}</div>
                            <div className="text-xs opacity-75">{bankType}</div>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Stock Availability */}
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-4 border border-yellow-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Stock Availability</h3>
                  
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{data.type === 'SILVER' ? '🥈' : '🥇'}</span>
                      <span className="font-semibold text-gray-700">{availableLabel}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="bg-white rounded-lg p-2 border border-yellow-200">
                        <div className="text-xs text-gray-500">Available</div>
                        <div className="font-bold text-blue-600">{available.toLocaleString()}g</div>
                      </div>
                      <div className="bg-white rounded-lg p-2 border border-yellow-200">
                        <div className="text-xs text-gray-500">Exchanging</div>
                        <div className="font-bold text-red-600">{data.fine}g</div>
                      </div>
                      <div className="bg-white rounded-lg p-2 border border-yellow-200">
                        <div className="text-xs text-gray-500">Remaining</div>
                        <div className={`font-bold ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {remaining.toLocaleString()}g
                        </div>
                      </div>
                    </div>
                    {insufficient && (
                      <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded-lg">
                        <div className="text-red-700 text-sm font-semibold flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Insufficient balance in {availableLabel.toLowerCase()}!
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Exchange Summary */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                    <h4 className="text-md font-semibold text-gray-800 mb-3">Exchange Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="font-semibold">Customer Name:</span>
                        <span className="text-green-700">{data.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">Exchange Type:</span>
                        <span className="text-green-700">{data.type} Exchange</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">Fine Weight:</span>
                        <span className="text-green-700">{data.fine}g</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">Amount:</span>
                        <span className="text-green-700 font-bold">₹{data.amount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">Source:</span>
                        <span className="text-green-700">{selectedSource}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleApprove}
                      disabled={loading || insufficient}
                      className={`px-6 py-3 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
                        loading || insufficient
                          ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                          : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white'
                      }`}
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Approve Exchange
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={handleDeny}
                      disabled={loading || insufficient}
                      className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Deny Exchange
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Toast Notification */}
        {toast.show && (
          <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 px-8 py-4 rounded-2xl shadow-2xl z-[9999] flex items-center gap-3 text-white text-lg font-semibold ${toast.type === 'success' ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-red-500 to-pink-600'} animate-fade-in`}>
            {toast.type === 'success' ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
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
      `}</style>
    </>
  );
}
 
export default ExchangeConfirm;
 
 