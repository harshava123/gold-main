import { useState, useEffect } from 'react';
import Adminheader from './Adminheader';
import { db } from '../../../firebase';
import { collection, query, where, getDocs, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { useStore } from './StoreContext';
import { useNavigate } from 'react-router-dom';
import { FaUniversity, FaCoins, FaPlus, FaInfoCircle } from 'react-icons/fa';
import { MdCelebration, MdError } from 'react-icons/md';
 
const RESERVE_TARGET = 5000;
 
function Goldreservers() {
  const [reserveType, setReserveType] = useState('LOCAL GOLD');
  const [available, setAvailable] = useState(0);
  const [addAmount, setAddAmount] = useState('');
  const [total, setTotal] = useState(0);
  const [pendingAdd, setPendingAdd] = useState(0);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [showTooltip, setShowTooltip] = useState(false);
 
  const { selectedStore } = useStore();
  const navigate = useNavigate();
  useEffect(() => {
    if (!selectedStore) navigate('/admin');
  }, [selectedStore, navigate]);
 
  // Fetch available gold for selected type
  useEffect(() => {
    const fetchAvailable = async () => {
      if (!selectedStore) return;
      const q = query(
        collection(db, 'goldreserves'),
        where('type', '==', reserveType),
        where('storeId', '==', selectedStore.id)
      );
      const snapshot = await getDocs(q);
      let latestTotal = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (typeof data.totalingms === 'number') {
          if (data.totalingms > latestTotal) {
            latestTotal = data.totalingms;
          }
        }
      });
      setAvailable(latestTotal);
      setTotal(latestTotal);
    };
    fetchAvailable();
  }, [reserveType, toast, selectedStore]);
 

 
  // Update total only when add button is clicked
  useEffect(() => {
    setTotal(available + pendingAdd);
  }, [pendingAdd, available]);
 
  const handleAdd = () => {
    if (!addAmount || isNaN(addAmount) || Number(addAmount) <= 0) {
      setToast({ show: true, message: 'Enter a valid amount to add.', type: 'error' });
      return;
    }
    setPendingAdd(Number(addAmount));
    setAddAmount('');
  };
 
  const handleApprove = async () => {
    if (!pendingAdd || isNaN(pendingAdd) || Number(pendingAdd) <= 0) {
      setToast({ show: true, message: 'Add an amount first.', type: 'error' });
      return;
    }
    try {
      // Unique doc id: storeId-type
      const docId = `${selectedStore.id}-${reserveType}`;
      const docRef = doc(db, 'goldreserves', docId);
      // Try to get the existing doc
      const q = query(
        collection(db, 'goldreserves'),
        where('type', '==', reserveType),
        where('storeId', '==', selectedStore.id)
      );
      const snapshot = await getDocs(q);
      let newAvailable = available;
      let newTotal = available + Number(pendingAdd);
      if (!snapshot.empty) {
        // Update existing
        await setDoc(docRef, {
          type: reserveType,
          availableingms: newAvailable,
          addedingms: Number(pendingAdd),
          totalingms: newTotal,
          storeId: selectedStore?.id,
          storeName: selectedStore?.name,
          createdAt: serverTimestamp(),
        }, { merge: true });
      } else {
        // Create new
        await setDoc(docRef, {
          type: reserveType,
          availableingms: 0,
          addedingms: Number(pendingAdd),
          totalingms: Number(pendingAdd),
          storeId: selectedStore?.id,
          storeName: selectedStore?.name,
          createdAt: serverTimestamp(),
        });
      }
      setPendingAdd(0);
      setToast({ show: true, message: 'Gold reserve updated!', type: 'success' });
    } catch {
      setToast({ show: true, message: 'Error updating gold reserve.', type: 'error' });
    }
  };
 
  // Toast auto-hide
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => setToast({ ...toast, show: false }), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
 
  // Icon for reserve type
  const getReserveIcon = () => {
    return reserveType === 'LOCAL GOLD' ? <FaCoins className="text-yellow-500 w-6 h-6 mr-2" /> : <FaUniversity className="text-yellow-700 w-6 h-6 mr-2" />;
  };
 
  // Progress bar percent
  const progressPercent = Math.min(100, Math.round((available / RESERVE_TARGET) * 100));
 
  // Animated feedback
  const FeedbackIcon = toast.type === 'success' ? MdCelebration : MdError;
 
  return (
    <>
      <Adminheader />
      <div className="min-h-screen flex flex-col items-center justify-center bg-white py-8 px-2">
        <div className="w-full max-w-2xl flex flex-col items-center">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl p-10 border border-yellow-100 mt-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-extrabold text-yellow-700 tracking-tight flex items-center">{getReserveIcon()}{reserveType} Management</h2>
              <div className="relative ml-2">
                <FaInfoCircle className="text-yellow-500 w-5 h-5 cursor-pointer" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)} />
                {showTooltip && (
                  <div className="absolute left-8 top-0 bg-yellow-100 text-yellow-900 text-xs rounded-lg shadow-lg px-4 py-2 z-50 w-64 animate-fade-in">
                    <b>Tip:</b> Use quick-add buttons for common increments. The progress bar shows how close you are to your target reserve.
                  </div>
                )}
              </div>
            </div>
           
            {/* Reserve Type Selector */}
            <div className="mb-6">
              <label className="block text-base font-semibold text-gray-700 mb-2">Select Gold Reserve Type</label>
              <select
                value={reserveType}
                onChange={(e) => setReserveType(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-400 text-lg bg-white shadow-sm"
              >
                <option value="LOCAL GOLD">LOCAL GOLD</option>
                <option value="BANK GOLD">BANK GOLD</option>
              </select>
            </div>
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between mb-1 text-sm font-semibold text-yellow-700">
                <span>Available: {available}g</span>
                <span>Target: {RESERVE_TARGET}g</span>
              </div>
              <div className="w-full bg-yellow-100 rounded-full h-4 shadow-inner">
                <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-4 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
              </div>
              <div className="text-right text-xs text-yellow-700 mt-1">{progressPercent}% of target</div>
            </div>
            {/* Quick Add Buttons */}
            <div className="mb-4 flex gap-2">
              {[10, 50, 100].map((amt) => (
                <button key={amt} type="button" onClick={() => setAddAmount(String(amt))} className="flex items-center gap-1 px-3 py-1 bg-yellow-200 hover:bg-yellow-400 text-yellow-900 rounded-lg font-semibold shadow transition text-sm">
                  <FaPlus className="w-3 h-3" />+{amt}g
                </button>
              ))}
            </div>
            <div className="mb-6">
              <label className="block text-base font-semibold text-gray-700 mb-2">Add new {reserveType.toLowerCase()} (in gms)</label>
              <div className="flex gap-3">
                <input
                  type="number"
                  min="0"
                  value={addAmount}
                  onChange={e => setAddAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-400 text-lg"
                  placeholder={`Enter amount in gms`}
                />
                <button
                  type="button"
                  onClick={handleAdd}
                  className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-bold shadow transition text-lg"
                >
                  Add
                </button>
              </div>
            </div>
            <div className="mb-8">
              <label className="block text-base font-semibold text-gray-700 mb-2">Total available {reserveType.toLowerCase()} in gms</label>
              <div className="px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-lg font-semibold text-yellow-800 shadow-inner">{total} gms</div>
            </div>
            <div className="flex gap-6 justify-center mb-8">
              <button
                onClick={handleApprove}
                className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow transition text-lg"
              >
                Approve
              </button>
              <button
                onClick={() => { setAddAmount(''); setPendingAdd(0); }}
                className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow transition text-lg"
              >
                Deny
              </button>
            </div>
            {/* Recent History */}
         
          </div>
        </div>
        {toast.show && (
          <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 px-8 py-4 rounded-2xl shadow-2xl z-[9999] flex items-center gap-3 text-white text-lg font-semibold ${toast.type === 'success' ? 'bg-green-600 animate-bounce-in' : 'bg-red-600 animate-shake'}`}>
            <FeedbackIcon className="w-7 h-7" />
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
        @keyframes bounce-in {
          0% { transform: scale(0.8); opacity: 0; }
          60% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); }
        }
        .animate-bounce-in {
          animation: bounce-in 0.5s;
        }
        @keyframes shake {
          0% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-8px); }
          80% { transform: translateX(8px); }
          100% { transform: translateX(0); }
        }
        .animate-shake {
          animation: shake 0.4s;
        }
      `}</style>
    </>
  );
}
 
export default Goldreservers;
 
 