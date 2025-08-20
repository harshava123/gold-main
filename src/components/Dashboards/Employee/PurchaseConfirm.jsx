import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { db, auth } from '../../../firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, where, orderBy } from 'firebase/firestore';
import Employeeheader from './Employeeheader';
import { useStore } from '../Admin/StoreContext';
 
function PurchaseConfirm() {
  const location = useLocation();
  const navigate = useNavigate();
  const data = location.state || {};
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [employee, setEmployee] = useState('');
  const [insufficient, setInsufficient] = useState(false);
  // Add for sales amounts
  const [availableGoldSales, setAvailableGoldSales] = useState(0);
  const [availableSilverSales, setAvailableSilverSales] = useState(0);
  const [remainingGoldSales, setRemainingGoldSales] = useState(0);
  const [remainingSilverSales, setRemainingSilverSales] = useState(0);
  
  const { selectedStore } = useStore();
  
  // Navigate to employee dashboard if no store is selected
  useEffect(() => {
    if (!selectedStore) navigate('/employee');
  }, [selectedStore, navigate]);

  // Auto-hide toast after 2 seconds
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast({ show: false, message: '', type: 'success' });
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [toast.show]);
 
  // Fetch employee name
  useState(() => {
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
 
  // Fetch sales amounts
  useEffect(() => {
    const fetchAll = async () => {
      if (!selectedStore) return;
      
      const amt = parseFloat(data.amount) || 0;
      
      // Fetch sales amounts
         // Fetch all sales data
         const allSalesQuery = query(
           collection(db, 'sales'),
           where('storeId', '==', selectedStore.id),
           orderBy('createdAt', 'desc')
         );
         const allSalesSnapshot = await getDocs(allSalesQuery);
         
                   let goldSalesTotal = 0;
          let silverSalesTotal = 0;
         
                   allSalesSnapshot.forEach(docSnap => {
        const d = docSnap.data();
            const amount = parseFloat(d.amount) || 0;
            
            // Skip deduction records
            if (d.isDeduction) {
              return;
            }
            
            if (d.saleType === 'GOLD') {
              goldSalesTotal += amount;
            } else if (d.saleType === 'SILVER') {
              silverSalesTotal += amount;
            }
          });
         setAvailableGoldSales(goldSalesTotal);
         setAvailableSilverSales(silverSalesTotal);
         setRemainingGoldSales(goldSalesTotal - amt);
         setRemainingSilverSales(silverSalesTotal - amt);
         
         // Check insufficient based on purchase type
         if (data.mainType === 'GOLD') {
           setInsufficient((goldSalesTotal - amt) < 0);
         } else if (data.mainType === 'SILVER') {
           setInsufficient((silverSalesTotal - amt) < 0);
         }
    };
    fetchAll();
  }, [data.amount, data.mainType, selectedStore]);
 
  const handleApprove = async () => {
    if (insufficient) return;
    setLoading(true);
    try {
      const amt = parseFloat(data.amount) || 0;
      
      // Deduct from sales amounts based on purchase type
      // For gold purchases, deduct from gold sales
      if (data.mainType === 'GOLD') {
        // Create a deduction record in sales collection
        await addDoc(collection(db, 'sales'), {
          storeId: selectedStore.id,
          storeName: selectedStore.name,
          saleType: 'GOLD',
          name: `Purchase Deduction - ${data.name}`,
          amount: -amt, // Negative amount to represent deduction
          date: new Date().toLocaleDateString('en-GB'),
          createdAt: serverTimestamp(),
          isDeduction: true,
          purchaseId: data.id || 'purchase-deduction'
        });
      }
      
      // For silver purchases, deduct from silver sales
      if (data.mainType === 'SILVER') {
        // Create a deduction record in sales collection
        await addDoc(collection(db, 'sales'), {
          storeId: selectedStore.id,
          storeName: selectedStore.name,
          saleType: 'SILVER',
          name: `Purchase Deduction - ${data.name}`,
          amount: -amt, // Negative amount to represent deduction
          date: new Date().toLocaleDateString('en-GB'),
          createdAt: serverTimestamp(),
          isDeduction: true,
          purchaseId: data.id || 'purchase-deduction'
        });
      }
      
      // Save the purchase record
      await addDoc(collection(db, 'purchases'), {
        ...data,
        employee,
        storeId: selectedStore.id,
        storeName: selectedStore.name,
        date: new Date().toLocaleDateString('en-GB'),
        createdAt: serverTimestamp(),
      });
      
      setToast({ show: true, message: 'Purchase approved and saved!', type: 'success' });
      
      // Print receipt after successful transaction
      printReceipt();
      
      setTimeout(() => navigate('/employee/purchases'), 1500);
    } catch (error) {
      console.error('Error saving purchase:', error);
      setToast({ show: true, message: 'Error saving purchase.', type: 'error' });
    }
    setLoading(false);
  };
 
  const handleDeny = () => {
    navigate('/employee/purchases');
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
            ${data.mainType === 'GOLD' ? 'GOLD PURCHASE' : 'SILVER PURCHASE'}
          </div>
          <div style="font-size: 12px; font-weight: bold; margin-bottom: 8px; text-align: center;">
            ${data.subType === 'KACHA_GOLD' ? 'KACHA GOLD' : data.subType === 'FINE_GOLD' ? 'FINE GOLD' : data.subType === 'KACHA_SILVER' ? 'KACHA SILVER' : 'FINE SILVER'}
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
            ${data.subType.includes('KACHA') ? `
            <div style="margin: 2px 0;"><span style="font-weight: bold; display: inline-block; width: 80px;">TOUCH</span>: ${data.touch} %</div>
            <div style="margin: 2px 0;"><span style="font-weight: bold; display: inline-block; width: 80px;">LESS</span>: ${data.less} %</div>
            ` : ''}
            <div style="margin: 2px 0;"><span style="font-weight: bold; display: inline-block; width: 80px;">AMOUNT</span>: <span style="font-weight: bold;">₹${data.amount}</span></div>
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
 
  // Purchase details rendering
  const renderCalc = () => {
    if (data.subType === 'KACHA_GOLD' || data.subType === 'KACHA_SILVER') {
      return (
        <>
          <div><b>Name</b>: {data.name}</div>
          <div><b>Weight</b>: {data.weight} gms</div>
          <div><b>Touch</b>: {data.touch} %</div>
          <div><b>Less</b>: {data.less} %</div>
          <div><b>Fine</b>: {data.fine} gms</div>
          <div><b>Rate</b>: ₹{data.rate}</div>
          <div><b>Amount</b>: ₹{data.amount}</div>
        </>
      );
    } else if (data.subType === 'FINE_GOLD' || data.subType === 'FINE_SILVER') {
      return (
        <>
          <div><b>Name</b>: {data.name}</div>
          <div><b>Weight</b>: {data.weight} gms</div>
          <div><b>Rate</b>: ₹{data.rate}</div>
          <div><b>Amount</b>: ₹{data.amount}</div>
        </>
      );
    }
    return null;
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
                  Purchase will be recorded for {selectedStore.name}
                </p>
              </div>
            </div>
          )}

          {/* Purchase Confirmation Card */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-yellow-100">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl p-2">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Purchase Confirmation</h2>
                <p className="text-gray-600 text-sm">
                  Review and confirm the purchase details
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Purchase Details */}
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Purchase Details</h3>
                  <div id="purchase-receipt" className="font-mono text-sm space-y-2">
                    <div className="mb-3 p-3 bg-white rounded-lg border border-blue-200">
                      <div className="font-bold text-blue-700 mb-2">
                        {data.mainType === 'GOLD' ? 
                          (data.subType === 'KACHA_GOLD' ? '🥇 Kacha Gold Purchase' : '🥇 Fine Gold Purchase') : 
                          (data.subType === 'KACHA_SILVER' ? '🥈 Kacha Silver Purchase' : '🥈 Fine Silver Purchase')
                        }
                      </div>
                      {renderCalc()}
                    </div>
                  </div>
                </div>

                {/* Payment Information */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Payment Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-semibold">Payment Type:</span>
                      <span className="text-green-700">
                        {data.mainType === 'GOLD' 
                          ? '🏦 Pay from available gold amount' 
                          : '🏦 Pay from available silver amount'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">Employee:</span>
                      <span className="text-green-700">{employee}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Sales Availability */}
              <div className="space-y-4">

                                 {/* Sales Amounts */}
                 {(
                   <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200">
                     <h3 className="text-lg font-semibold text-gray-800 mb-3">Sales Amount Available</h3>
                     
                     {/* Show only relevant sales amount based on purchase type */}
                     {data.mainType === 'GOLD' && (
                       <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                         <div className="flex items-center gap-2 mb-3">
                           <span className="text-lg">🥇</span>
                           <span className="font-semibold text-gray-700">Gold Sales Available</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="bg-white rounded-lg p-2 border border-yellow-200">
                          <div className="text-xs text-gray-500">Available</div>
                             <div className="font-bold text-blue-600">₹{availableGoldSales.toLocaleString()}</div>
                        </div>
                        <div className="bg-white rounded-lg p-2 border border-yellow-200">
                          <div className="text-xs text-gray-500">Paying</div>
                          <div className="font-bold text-red-600">₹{data.amount}</div>
                        </div>
                        <div className="bg-white rounded-lg p-2 border border-yellow-200">
                          <div className="text-xs text-gray-500">Remaining</div>
                             <div className={`font-bold ${remainingGoldSales >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                               ₹{remainingGoldSales.toLocaleString()}
                          </div>
                        </div>
                      </div>
                         {insufficient && (
                        <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded-lg">
                          <div className="text-red-700 text-sm font-semibold flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                               Insufficient gold sales amount!
                          </div>
                        </div>
                      )}
                    </div>
                     )}

                     {data.mainType === 'SILVER' && (
                       <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                         <div className="flex items-center gap-2 mb-3">
                           <span className="text-lg">🥈</span>
                           <span className="font-semibold text-gray-700">Silver Sales Available</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                           <div className="bg-white rounded-lg p-2 border border-gray-200">
                          <div className="text-xs text-gray-500">Available</div>
                             <div className="font-bold text-blue-600">₹{availableSilverSales.toLocaleString()}</div>
                        </div>
                           <div className="bg-white rounded-lg p-2 border border-gray-200">
                          <div className="text-xs text-gray-500">Paying</div>
                          <div className="font-bold text-red-600">₹{data.amount}</div>
                        </div>
                           <div className="bg-white rounded-lg p-2 border border-gray-200">
                          <div className="text-xs text-gray-500">Remaining</div>
                             <div className={`font-bold ${remainingSilverSales >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                               ₹{remainingSilverSales.toLocaleString()}
                          </div>
                        </div>
                      </div>
                         {insufficient && (
                        <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded-lg">
                          <div className="text-red-700 text-sm font-semibold flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                               Insufficient silver sales amount!
                          </div>
                        </div>
                      )}
                    </div>
                     )}
                  </div>
                )}

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
                          Approve Purchase
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={handleDeny}
                      disabled={loading}
                      className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Deny Purchase
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
 
export default PurchaseConfirm;
 