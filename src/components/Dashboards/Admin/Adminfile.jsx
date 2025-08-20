import { useEffect, useState } from 'react';
import Adminheader from './Adminheader';
import { db } from '../../../firebase';
import { collection, getDocs, query, where, orderBy, deleteDoc, doc, Timestamp, addDoc, serverTimestamp } from 'firebase/firestore';
import { useStore } from './StoreContext';
import { useNavigate } from 'react-router-dom';

function Adminfile() {
  const [ledger, setLedger] = useState('');
  const [online, setOnline] = useState('');
  const [tokenAmount, setTokenAmount] = useState(0);
  const [salesAmount, setSalesAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  const [tokenDetails, setTokenDetails] = useState([]);
  const [gtsTokens, setGtsTokens] = useState([]);
  const [solderingTokens, setSolderingTokens] = useState([]);
  const [customTokens, setCustomTokens] = useState([]);
  const [gtsAmount, setGtsAmount] = useState(0);
  const [solderingAmount, setSolderingAmount] = useState(0);
  const [customAmount, setCustomAmount] = useState(0);
  const [tokenTab, setTokenTab] = useState('all'); // 'all', 'gts', 'soldering', 'custom'
  const [salesDetails, setSalesDetails] = useState([]);
  const [goldSalesDetails, setGoldSalesDetails] = useState([]);
  const [silverSalesDetails, setSilverSalesDetails] = useState([]);
  const [goldSalesAmount, setGoldSalesAmount] = useState(0);
  const [silverSalesAmount, setSilverSalesAmount] = useState(0);
  const [salesTab, setSalesTab] = useState('all'); // 'all', 'gold', 'silver'
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [isCleaning, setIsCleaning] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  
  const { selectedStore } = useStore();
  const navigate = useNavigate();
  
  // Function to check if reminder should be shown
  const checkReminder = () => {
    const lastReminder = localStorage.getItem('lastDataCleanupReminder');
    const currentDate = new Date();
    
    if (!lastReminder) {
      // First time - set reminder for next month
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      localStorage.setItem('lastDataCleanupReminder', nextMonth.toISOString());
      return false;
    }
    
    const lastReminderDate = new Date(lastReminder);
    const daysSinceLastReminder = Math.floor((currentDate - lastReminderDate) / (1000 * 60 * 60 * 24));
    
    // Show reminder if it's been more than 30 days since last reminder
    if (daysSinceLastReminder >= 30) {
      setShowReminder(true);
      return true;
    }
    
    return false;
  };

  // Function to send WhatsApp notification
  const sendWhatsAppNotification = async () => {
    try {
      const message = `🔔 Data Cleanup Reminder\n\nYour Gold Management System has data older than 1 month that needs to be cleaned up.\n\nPlease log into your admin dashboard and use the "Clean Old Data" button to remove old records.\n\nThis helps keep your system running efficiently.\n\nStore: ${selectedStore?.name || 'All Stores'}\nDate: ${new Date().toLocaleDateString('en-GB')}`;
      
      const whatsappUrl = `https://wa.me/917207856531?text=${encodeURIComponent(message)}`;
      
      // Open WhatsApp in new tab
      window.open(whatsappUrl, '_blank');
      
      console.log('WhatsApp notification sent');
    } catch (error) {
      console.error('Error sending WhatsApp notification:', error);
    }
  };

  // Function to create admin notification
  const createAdminNotification = async () => {
    try {
      await addDoc(collection(db, 'admin_notifications'), {
        title: 'Data Cleanup Reminder',
        message: 'Your system has data older than 1 month that needs to be cleaned up. Please use the "Clean Old Data" button to remove old records.',
        type: 'cleanup_reminder',
        storeId: selectedStore?.id,
        storeName: selectedStore?.name,
        createdAt: serverTimestamp(),
        seen: false,
        priority: 'high'
      });
    } catch (error) {
      console.error('Error creating admin notification:', error);
    }
  };
  
  // Navigate to admin dashboard if no store is selected
  useEffect(() => {
    if (!selectedStore) navigate('/admin');
  }, [selectedStore, navigate]);

  // Auto-hide toast after 2 seconds
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast({ show: false, message: '', type: 'success' });
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  // Function to clean up old data (older than 1 month)
  const cleanupOldData = async (showToast = false) => {
    if (!selectedStore) return;
    
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const oneMonthAgoTimestamp = Timestamp.fromDate(oneMonthAgo);
    
    try {
      setIsCleaning(true);
      let totalDeleted = 0;
      
      // Collections to clean up
      const collections = ['tokens', 'sales', 'purchases', 'exchanges'];
      
      for (const collectionName of collections) {
        try {
          // Try with index first
          const q = query(
            collection(db, collectionName),
            where('storeId', '==', selectedStore.id),
            where('createdAt', '<', oneMonthAgoTimestamp)
          );
          
          const snapshot = await getDocs(q);
          const deletePromises = snapshot.docs.map(docSnap => 
            deleteDoc(doc(db, collectionName, docSnap.id))
          );
          
          if (deletePromises.length > 0) {
            await Promise.all(deletePromises);
            totalDeleted += deletePromises.length;
            console.log(`Cleaned up ${deletePromises.length} old ${collectionName} records`);
          }
        } catch (indexError) {
          if (indexError.message.includes('index')) {
            console.log(`Index not ready for ${collectionName}, skipping cleanup for this collection`);
            continue;
          }
          throw indexError;
        }
      }
      
      if (showToast) {
        setToast({ 
          show: true, 
          message: `Cleaned up ${totalDeleted} old records (older than 1 month)`, 
          type: 'success' 
        });
      }
    } catch (error) {
      console.error('Error cleaning up old data:', error);
      if (showToast) {
        setToast({ 
          show: true, 
          message: 'Error cleaning up old data', 
          type: 'error' 
        });
      }
    } finally {
      setIsCleaning(false);
    }
  };

  const handleManualCleanup = async () => {
    await cleanupOldData(true);
    
    // Mark reminder as completed
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    localStorage.setItem('lastDataCleanupReminder', nextMonth.toISOString());
    setShowReminder(false);
  };

  useEffect(() => {
    const fetchAllData = async () => {
      if (!selectedStore) return;
      
      // Check for reminder
      const shouldShowReminder = checkReminder();
      if (shouldShowReminder) {
        // Send WhatsApp notification
        sendWhatsAppNotification();
        // Create admin notification
        createAdminNotification();
      }
      
      // Clean up old data first
      await cleanupOldData();
      
      // Fetch cash reserves
      const cashQuery = query(
        collection(db, 'cashreserves'),
        where('storeId', '==', selectedStore.id)
      );
      const cashSnapshot = await getDocs(cashQuery);
      let ledgerVal = '';
      let onlineVal = '';
      cashSnapshot.forEach(docSnap => {
        const d = docSnap.data();
        if (d.type === 'LEDGER') {
          ledgerVal = d.available;
        } else if (d.type === 'ONLINE') {
          onlineVal = d.available;
        }
      });
      setLedger(ledgerVal);
      setOnline(onlineVal);
      
      // Fetch tokens
      const tokensQuery = query(
        collection(db, 'tokens'),
        where('storeId', '==', selectedStore.id),
        orderBy('createdAt', 'desc')
      );
      const tokensSnapshot = await getDocs(tokensQuery);
      let tokenTotal = 0;
      let gtsTotal = 0;
      let solderingTotal = 0;
      let customTotal = 0;
      const tokenData = [];
      const gtsData = [];
      const solderingData = [];
      const customData = [];
      
      tokensSnapshot.forEach(docSnap => {
        const d = docSnap.data();
        const amount = parseFloat(d.amount) || 0;
        const purpose = d.purpose;
        
        const tokenRecord = {
          id: docSnap.id,
          name: d.name,
          purpose: purpose,
          amount: amount,
          date: d.date,
          tokenNo: d.tokenNo
        };
        
        tokenTotal += amount;
        tokenData.push(tokenRecord);
        
        if (purpose === 'GTS') {
          gtsTotal += amount;
          gtsData.push(tokenRecord);
        } else if (purpose === 'SOLDERING') {
          solderingTotal += amount;
          solderingData.push(tokenRecord);
        } else {
          customTotal += amount;
          customData.push(tokenRecord);
        }
      });
      
      setTokenAmount(tokenTotal);
      setTokenDetails(tokenData);
      setGtsAmount(gtsTotal);
      setSolderingAmount(solderingTotal);
      setCustomAmount(customTotal);
      setGtsTokens(gtsData);
      setSolderingTokens(solderingData);
      setCustomTokens(customData);
      
      // Fetch sales
      const salesQuery = query(
        collection(db, 'sales'),
        where('storeId', '==', selectedStore.id),
        orderBy('createdAt', 'desc')
      );
      const salesSnapshot = await getDocs(salesQuery);
      let salesTotal = 0;
      let goldTotal = 0;
      let silverTotal = 0;
      const salesData = [];
      const goldData = [];
      const silverData = [];
      
      salesSnapshot.forEach(docSnap => {
        const d = docSnap.data();
        const amount = parseFloat(d.amount) || 0;
        
        // Skip deduction records (negative amounts from purchases)
        if (d.isDeduction) {
          return;
        }
        const saleRecord = {
          id: docSnap.id,
          name: d.name,
          weight: d.weight,
          rate: d.rate,
          amount: amount,
          date: d.date,
          saleType: d.saleType,
          source: d.source
        };
        
        salesTotal += amount;
        salesData.push(saleRecord);
        
        if (d.saleType === 'GOLD') {
          goldTotal += amount;
          goldData.push(saleRecord);
        } else if (d.saleType === 'SILVER') {
          silverTotal += amount;
          silverData.push(saleRecord);
        }
      });
      
      setSalesAmount(salesTotal);
      setSalesDetails(salesData);
      setGoldSalesAmount(goldTotal);
      setSilverSalesAmount(silverTotal);
      setGoldSalesDetails(goldData);
      setSilverSalesDetails(silverData);
      
      // Calculate total
      const total = parseFloat(ledgerVal || 0) + parseFloat(onlineVal || 0) + tokenTotal + salesTotal;
      setTotalAmount(total);
    };
    fetchAllData();
  }, [selectedStore]);

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => setToast({ ...toast, show: false }), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  return (
    <>
      <Adminheader />
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fffcf5] py-8 px-2">
        {/* Store Indicator */}
        {selectedStore && (
          <div className="w-full max-w-4xl mb-4">
            <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 text-center">
              <h3 className="text-lg font-bold text-yellow-800">
                🏪 Viewing: <span className="text-yellow-900">{selectedStore.name}</span>
              </h3>
              <p className="text-yellow-700 text-sm mt-1">
                Financial overview for {selectedStore.name}
              </p>
            </div>
          </div>
        )}
        
        <div className="w-full max-w-4xl bg-white/90 rounded-2xl shadow-xl p-8 border border-yellow-100">
          {/* Data Cleanup Reminder */}
          {showReminder && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="text-red-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-red-800">Data Cleanup Reminder</h3>
                  <p className="text-red-700 text-sm">Your system has data older than 1 month that needs to be cleaned up. WhatsApp notification has been sent to 7207856531.</p>
                </div>
                <button
                  onClick={() => setShowReminder(false)}
                  className="text-red-500 hover:text-red-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-yellow-700">Financial Management</h2>
            <button
              onClick={handleManualCleanup}
              disabled={isCleaning}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                isCleaning
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
            >
              {isCleaning ? 'Cleaning...' : 'Clean Old Data (1+ month)'}
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg font-semibold ${
                activeTab === 'overview'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('tokens')}
              className={`px-4 py-2 rounded-lg font-semibold ${
                activeTab === 'tokens'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tokens
            </button>
            <button
              onClick={() => setActiveTab('sales')}
              className={`px-4 py-2 rounded-lg font-semibold ${
                activeTab === 'sales'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Sales
            </button>
          </div>
          
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="font-bold text-blue-800 mb-2">Cash Reserves</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ledger:</span>
                      <span className="font-semibold">₹{ledger || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Online:</span>
                      <span className="font-semibold">₹{online || 0}</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-bold text-blue-800">
                        <span>Total Cash:</span>
                        <span>₹{parseFloat(ledger || 0) + parseFloat(online || 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h3 className="font-bold text-green-800 mb-2">Revenue Sources</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tokens:</span>
                      <span className="font-semibold">₹{tokenAmount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sales:</span>
                      <span className="font-semibold">₹{salesAmount}</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-bold text-green-800">
                        <span>Total Revenue:</span>
                        <span>₹{tokenAmount + salesAmount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h3 className="font-bold text-yellow-800 mb-2">Total Financial Overview</h3>
                <div className="text-2xl font-bold text-yellow-900 text-center">
                  ₹{totalAmount}
                </div>
                <p className="text-sm text-yellow-700 text-center mt-1">
                  Total (Cash + Tokens + Sales)
                </p>
              </div>
            </div>
          )}
          
          {/* Tokens Tab */}
          {activeTab === 'tokens' && (
            <div className="space-y-4">
              {/* Token Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h3 className="font-bold text-green-800 mb-2">Total Tokens</h3>
                <div className="text-xl font-bold text-green-900">₹{tokenAmount}</div>
                  <p className="text-sm text-green-700">From {tokenDetails.length} tokens</p>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="font-bold text-blue-800 mb-2">GTS Tokens</h3>
                  <div className="text-xl font-bold text-blue-900">₹{gtsAmount}</div>
                  <p className="text-sm text-blue-700">From {gtsTokens.length} tokens</p>
                </div>
                
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h3 className="font-bold text-yellow-800 mb-2">Soldering Tokens</h3>
                  <div className="text-xl font-bold text-yellow-900">₹{solderingAmount}</div>
                  <p className="text-sm text-yellow-700">From {solderingTokens.length} tokens</p>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <h3 className="font-bold text-purple-800 mb-2">Custom Tokens</h3>
                  <div className="text-xl font-bold text-purple-900">₹{customAmount}</div>
                  <p className="text-sm text-purple-700">From {customTokens.length} tokens</p>
                </div>
              </div>

              {/* Token Type Tabs */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setTokenTab('all')}
                  className={`px-4 py-2 rounded-lg font-semibold ${
                    tokenTab === 'all'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Tokens
                </button>
                <button
                  onClick={() => setTokenTab('gts')}
                  className={`px-4 py-2 rounded-lg font-semibold ${
                    tokenTab === 'gts'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  GTS Tokens
                </button>
                <button
                  onClick={() => setTokenTab('soldering')}
                  className={`px-4 py-2 rounded-lg font-semibold ${
                    tokenTab === 'soldering'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Soldering Tokens
                </button>
                <button
                  onClick={() => setTokenTab('custom')}
                  className={`px-4 py-2 rounded-lg font-semibold ${
                    tokenTab === 'custom'
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Custom Tokens
                </button>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border border-gray-300 px-3 py-2 text-left">Token No</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Name</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Purpose</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Amount</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokenTab === 'all' && tokenDetails.map((token) => (
                      <tr key={token.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-3 py-2">{token.tokenNo}</td>
                        <td className="border border-gray-300 px-3 py-2">{token.name}</td>
                        <td className="border border-gray-300 px-3 py-2">{token.purpose}</td>
                        <td className="border border-gray-300 px-3 py-2 font-semibold">₹{token.amount}</td>
                        <td className="border border-gray-300 px-3 py-2">{token.date}</td>
                      </tr>
                    ))}
                    {tokenTab === 'gts' && gtsTokens.map((token) => (
                      <tr key={token.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-3 py-2">{token.tokenNo}</td>
                        <td className="border border-gray-300 px-3 py-2">{token.name}</td>
                        <td className="border border-gray-300 px-3 py-2">{token.purpose}</td>
                        <td className="border border-gray-300 px-3 py-2 font-semibold">₹{token.amount}</td>
                        <td className="border border-gray-300 px-3 py-2">{token.date}</td>
                      </tr>
                    ))}
                    {tokenTab === 'soldering' && solderingTokens.map((token) => (
                      <tr key={token.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-3 py-2">{token.tokenNo}</td>
                        <td className="border border-gray-300 px-3 py-2">{token.name}</td>
                        <td className="border border-gray-300 px-3 py-2">{token.purpose}</td>
                        <td className="border border-gray-300 px-3 py-2 font-semibold">₹{token.amount}</td>
                        <td className="border border-gray-300 px-3 py-2">{token.date}</td>
                      </tr>
                    ))}
                    {tokenTab === 'custom' && customTokens.map((token) => (
                      <tr key={token.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-3 py-2">{token.tokenNo}</td>
                        <td className="border border-gray-300 px-3 py-2">{token.name}</td>
                        <td className="border border-gray-300 px-3 py-2">{token.purpose}</td>
                        <td className="border border-gray-300 px-3 py-2 font-semibold">₹{token.amount}</td>
                        <td className="border border-gray-300 px-3 py-2">{token.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Sales Tab */}
          {activeTab === 'sales' && (
            <div className="space-y-4">
              {/* Sales Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="font-bold text-blue-800 mb-2">Total Sales</h3>
                <div className="text-xl font-bold text-blue-900">₹{salesAmount}</div>
                  <p className="text-sm text-blue-700">From {salesDetails.length} sales</p>
                </div>
                
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h3 className="font-bold text-yellow-800 mb-2">Gold Sales</h3>
                  <div className="text-xl font-bold text-yellow-900">₹{goldSalesAmount}</div>
                  <p className="text-sm text-yellow-700">From {goldSalesDetails.length} sales</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="font-bold text-gray-800 mb-2">Silver Sales</h3>
                  <div className="text-xl font-bold text-gray-900">₹{silverSalesAmount}</div>
                  <p className="text-sm text-gray-700">From {silverSalesDetails.length} sales</p>
                </div>
              </div>

              {/* Sales Type Tabs */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setSalesTab('all')}
                  className={`px-4 py-2 rounded-lg font-semibold ${
                    salesTab === 'all'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Sales
                </button>
                <button
                  onClick={() => setSalesTab('gold')}
                  className={`px-4 py-2 rounded-lg font-semibold ${
                    salesTab === 'gold'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Gold Sales
                </button>
                <button
                  onClick={() => setSalesTab('silver')}
                  className={`px-4 py-2 rounded-lg font-semibold ${
                    salesTab === 'silver'
                      ? 'bg-gray-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Silver Sales
                </button>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border border-gray-300 px-3 py-2 text-left">Name</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Type</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Weight</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Rate</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Amount</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Source</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesTab === 'all' && salesDetails.map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-3 py-2">{sale.name}</td>
                        <td className="border border-gray-300 px-3 py-2">{sale.saleType}</td>
                        <td className="border border-gray-300 px-3 py-2">{sale.weight}g</td>
                        <td className="border border-gray-300 px-3 py-2">₹{sale.rate}</td>
                        <td className="border border-gray-300 px-3 py-2 font-semibold">₹{sale.amount}</td>
                        <td className="border border-gray-300 px-3 py-2">{sale.source}</td>
                        <td className="border border-gray-300 px-3 py-2">{sale.date}</td>
                      </tr>
                    ))}
                    {salesTab === 'gold' && goldSalesDetails.map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-3 py-2">{sale.name}</td>
                        <td className="border border-gray-300 px-3 py-2">{sale.saleType}</td>
                        <td className="border border-gray-300 px-3 py-2">{sale.weight}g</td>
                        <td className="border border-gray-300 px-3 py-2">₹{sale.rate}</td>
                        <td className="border border-gray-300 px-3 py-2 font-semibold">₹{sale.amount}</td>
                        <td className="border border-gray-300 px-3 py-2">{sale.source}</td>
                        <td className="border border-gray-300 px-3 py-2">{sale.date}</td>
                      </tr>
                    ))}
                    {salesTab === 'silver' && silverSalesDetails.map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-3 py-2">{sale.name}</td>
                        <td className="border border-gray-300 px-3 py-2">{sale.saleType}</td>
                        <td className="border border-gray-300 px-3 py-2">{sale.weight}g</td>
                        <td className="border border-gray-300 px-3 py-2">₹{sale.rate}</td>
                        <td className="border border-gray-300 px-3 py-2 font-semibold">₹{sale.amount}</td>
                        <td className="border border-gray-300 px-3 py-2">{sale.source}</td>
                        <td className="border border-gray-300 px-3 py-2">{sale.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        
        {toast.show && (
          <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-xl shadow-lg z-[9999] flex items-center gap-2 text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            <span>{toast.message}</span>
          </div>
        )}
      </div>
    </>
  );
}

export default Adminfile;
