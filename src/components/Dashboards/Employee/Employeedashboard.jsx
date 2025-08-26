import { useState, useEffect } from 'react'
import Employeeheader from './Employeeheader'
import { Link } from 'react-router-dom'
import { FaCoins, FaExchangeAlt, FaShoppingCart, FaClipboardList, FaChartLine, FaFileAlt, FaEdit, FaSave, FaTimes, FaClock, FaCalendarAlt, FaStore } from 'react-icons/fa'
import { GiGoldBar, GiJewelCrown, GiGoldNuggets } from 'react-icons/gi'
import { db } from '../../../firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { useStore } from '../Admin/StoreContext'
import store1Image from '../../../assets/store1.jpg'
import store2Image from '../../../assets/store2.jpg'
 
const QUICK_ACTIONS = [
  {
    label: 'Tokens',
    to: '/employee/tokens',
    icon: <FaCoins className="w-10 h-10 text-yellow-600 mb-3" />,
    description: 'Manage tokens & inventory',
    bgColor: 'bg-gradient-to-br from-yellow-100 to-amber-100',
    hoverColor: 'hover:from-yellow-200 hover:to-amber-200',
    borderColor: 'border-yellow-300'
  },
  {
    label: 'Exchanges',
    to: '/employee/exchanges',
    icon: <FaExchangeAlt className="w-10 h-10 text-amber-600 mb-3" />,
    description: 'Exchange operations & rates',
    bgColor: 'bg-gradient-to-br from-amber-100 to-orange-100',
    hoverColor: 'hover:from-amber-200 hover:to-orange-200',
    borderColor: 'border-amber-300'
  },
  {
    label: 'Purchases',
    to: '/employee/purchases',
    icon: <FaShoppingCart className="w-10 h-10 text-purple-600 mb-3" />,
    description: 'Purchase transactions',
    bgColor: 'bg-gradient-to-br from-purple-100 to-pink-100',
    hoverColor: 'hover:from-purple-200 hover:to-pink-200',
    borderColor: 'border-purple-300'
  },
  {
    label: 'Orders',
    to: '/employee/order-management',
    icon: <FaClipboardList className="w-10 h-10 text-blue-600 mb-3" />,
    description: 'Order management',
    bgColor: 'bg-gradient-to-br from-blue-100 to-indigo-100',
    hoverColor: 'hover:from-blue-200 hover:to-indigo-200',
    borderColor: 'border-blue-300'
  },
  {
    label: 'Sales',
    to: '/employee/sales',
    icon: <FaChartLine className="w-10 h-10 text-green-600 mb-3" />,
    description: 'Sales performance & analytics',
    bgColor: 'bg-gradient-to-br from-green-100 to-emerald-100',
    hoverColor: 'hover:from-green-200 hover:to-emerald-200',
    borderColor: 'border-green-300'
  },
  {
    label: 'Reports',
    to: '/employee/reports',
    icon: <FaFileAlt className="w-10 h-10 text-gray-600 mb-3" />,
    description: 'Business reports & analytics',
    bgColor: 'bg-gradient-to-br from-gray-100 to-slate-100',
    hoverColor: 'hover:from-gray-200 hover:to-slate-200',
    borderColor: 'border-gray-300'
  },
]
 
function Employeedashboard() {
  // State for rates - can be updated daily
  const [goldRate, setGoldRate] = useState(5850);
  const [silverRate, setSilverRate] = useState(75);
  const [goldChange, setGoldChange] = useState(2.5);
  const [silverChange, setSilverChange] = useState(1.8);
 
  // Edit modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editType, setEditType] = useState(''); // 'gold' or 'silver'
  const [tempRate, setTempRate] = useState('');
  const [tempChange, setTempChange] = useState('');
 
  // Current time state
  const [currentTime, setCurrentTime] = useState(new Date());

  // State for totals
  const [localGoldTotal, setLocalGoldTotal] = useState(0);
  const [bankGoldTotal, setBankGoldTotal] = useState(0);
  const [localSilverTotal, setLocalSilverTotal] = useState(0);
  const [bankSilverTotal, setBankSilverTotal] = useState(0);

  const { selectedStore, selectStore } = useStore();

  // Store options
  const stores = [
    { id: 'store1', name: 'Store 1', location: 'Dilshuk Nagar', type: 'Traditional Jewelry', image: store1Image },
    { id: 'store2', name: 'Store 2', location: 'Shopping Complex', type: 'Modern Designs', image: store2Image }
  ];
 
  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
 
  // Load rates from localStorage on component mount
  useEffect(() => {
    const savedGoldRate = localStorage.getItem('goldRate');
    const savedSilverRate = localStorage.getItem('silverRate');
    const savedGoldChange = localStorage.getItem('goldChange');
    const savedSilverChange = localStorage.getItem('silverChange');
 
    if (savedGoldRate) setGoldRate(parseFloat(savedGoldRate));
    if (savedSilverRate) setSilverRate(parseFloat(savedSilverRate));
    if (savedGoldChange) setGoldChange(parseFloat(savedGoldChange));
    if (savedSilverChange) setSilverChange(parseFloat(savedSilverChange));
  }, []);
 
  // Save rates to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('goldRate', goldRate.toString());
    localStorage.setItem('silverRate', silverRate.toString());
    localStorage.setItem('goldChange', goldChange.toString());
    localStorage.setItem('silverChange', silverChange.toString());
  }, [goldRate, silverRate, goldChange, silverChange]);

  // Fetch totals from database
  const fetchTotals = async () => {
    if (!selectedStore) return;
    
    try {
      // Fetch Gold Totals
      const goldQuery = query(
        collection(db, 'goldreserves'),
        where('storeId', '==', selectedStore.id)
      );
      const goldSnapshot = await getDocs(goldQuery);
      
      let localGold = 0;
      let bankGold = 0;
      
      goldSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.type === 'LOCAL GOLD' && data.totalingms) {
          localGold = data.totalingms;
        } else if (data.type === 'BANK GOLD' && data.totalingms) {
          bankGold = data.totalingms;
        }
      });
      
      setLocalGoldTotal(localGold);
      setBankGoldTotal(bankGold);
      
      // Fetch Silver Totals
      const silverQuery = query(
        collection(db, 'silverreserves'),
        where('storeId', '==', selectedStore.id)
      );
      const silverSnapshot = await getDocs(silverQuery);
      
      let localSilver = 0;
      let bankSilver = 0;
      
      silverSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.type === 'LOCAL SILVER' && data.totalingms) {
          localSilver = data.totalingms;
        } else if (data.type === 'KAMAL SILVER' && data.totalingms) {
          bankSilver = data.totalingms;
        }
      });
      
      setLocalSilverTotal(localSilver);
      setBankSilverTotal(bankSilver);
    } catch (error) {
      console.error('Error fetching totals:', error);
    }
  };

  // Fetch totals when store changes
  useEffect(() => {
    fetchTotals();
  }, [selectedStore]);
 
  // Handle opening edit modal
  const handleEditRate = (type) => {
    setEditType(type);
    if (type === 'gold') {
      setTempRate(goldRate.toString());
      setTempChange(goldChange.toString());
    } else {
      setTempRate(silverRate.toString());
      setTempChange(silverChange.toString());
    }
    setShowEditModal(true);
  };
 
  // Handle saving edited rates
  const handleSaveRate = () => {
    const rate = parseFloat(tempRate);
    const change = parseFloat(tempChange);
   
    if (isNaN(rate) || isNaN(change)) {
      alert('Please enter valid numbers');
      return;
    }
 
    if (editType === 'gold') {
      setGoldRate(rate);
      setGoldChange(change);
    } else {
      setSilverRate(rate);
      setSilverChange(change);
    }
   
    setShowEditModal(false);
    setTempRate('');
    setTempChange('');
  };
 
  // Handle closing modal
  const handleCloseModal = () => {
    setShowEditModal(false);
    setTempRate('');
    setTempChange('');
  };
 
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-100">
      <Employeeheader/>
      <div className="w-[80%] mx-auto px-4 py-10">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="animate-pulse">
              <GiJewelCrown className="w-14 h-14 text-yellow-600 drop-shadow-lg" />
            </div>
            <h1 className="text-5xl font-semibold font-sans bg-gradient-to-r from-yellow-700 via-amber-600 to-orange-600 bg-clip-text text-transparent drop-shadow-sm">
              S M D B Employee Portal
            </h1>
            <div className="animate-pulse">
              <GiJewelCrown className="w-14 h-14 text-yellow-600 drop-shadow-lg" />
            </div>
          </div>
          <p className="text-yellow-700 text-xl font-semibold mb-4">Manage your gold business operations efficiently</p>
          <div className="flex items-center justify-center gap-2 text-yellow-600 mb-6">
            <GiGoldBar className="w-5 h-5" />
            <span className="text-sm font-medium">Premium Gold & Jewelry Management System</span>
            <GiGoldBar className="w-5 h-5" />
          </div>
         
          {/* Time and Date */}
          <div className="flex items-center justify-center gap-4">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl px-4 py-2 shadow-md border border-yellow-200">
              <div className="flex items-center gap-2 text-yellow-700">
                <FaClock className="w-4 h-4" />
                <span className="font-mono text-sm font-semibold">
                  {currentTime.toLocaleTimeString()}
                </span>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl px-4 py-2 shadow-md border border-yellow-200">
              <div className="flex items-center gap-2 text-yellow-700">
                <FaCalendarAlt className="w-4 h-4" />
                <span className="text-sm font-semibold">
                  {currentTime.toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Store Selection Section */}
        {!selectedStore ? (
          <div className="text-center mb-12">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-yellow-200">
              <div className="flex items-center justify-center gap-3 mb-6">
                <FaStore className="w-8 h-8 text-yellow-600" />
                <h2 className="text-2xl font-bold text-yellow-700">Select Your Store</h2>
              </div>
              <p className="text-gray-600 mb-8">Please select a store to continue with your operations</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {stores.map(store => (
                  <div
                    key={store.id}
                    onClick={() => selectStore(store)}
                    className="rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 border-yellow-300 bg-white hover:border-yellow-500 hover:scale-105"
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={store.image}
                        alt={store.name}
                        className="w-16 h-16 object-cover rounded-xl shadow-md"
                      />
                      <div className="text-left">
                        <h3 className="text-xl font-bold text-yellow-600">{store.name}</h3>
                        <p className="text-gray-600 text-sm">{store.location}</p>
                        <p className="text-gray-500 text-xs">{store.type}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center mb-8">
            <div className="bg-gradient-to-r from-yellow-400 to-amber-500 rounded-2xl p-4 shadow-lg inline-block">
              <div className="flex items-center gap-3 text-white">
                <FaStore className="w-6 h-6" />
                <span className="font-semibold">Currently Working: {selectedStore.name}</span>
                <button
                  onClick={() => selectStore(null)}
                  className="ml-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-all duration-200"
                >
                  Change Store
                </button>
              </div>
            </div>
          </div>
        )}
 
        {/* Rate Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-transform duration-300 relative group">
            <button
              onClick={() => handleEditRate('gold')}
              className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
            >
              <FaEdit className="w-4 h-4 text-white" />
            </button>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm font-medium">Today&apos;s Gold Rate</p>
                <p className="text-3xl font-bold">₹{goldRate.toLocaleString()}/g</p>
                <p className="text-yellow-200 text-xs mt-1">
                  {goldChange >= 0 ? '↑' : '↓'} {goldChange >= 0 ? '+' : ''}{goldChange}% from yesterday
                </p>
              </div>
              <GiGoldBar className="w-12 h-12 text-yellow-200" />
            </div>
          </div>
         
          <div className="bg-gradient-to-br from-gray-400 to-slate-500 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-transform duration-300 relative group">
            <button
              onClick={() => handleEditRate('silver')}
              className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
            >
              <FaEdit className="w-4 h-4 text-white" />
            </button>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-100 text-sm font-medium">Today&apos;s Silver Rate</p>
                <p className="text-3xl font-bold">₹{silverRate.toLocaleString()}/g</p>
                <p className="text-gray-200 text-xs mt-1">
                  {silverChange >= 0 ? '↑' : '↓'} {silverChange >= 0 ? '+' : ''}{silverChange}% from yesterday
                </p>
              </div>
              <GiGoldNuggets className="w-12 h-12 text-gray-200" />
            </div>
          </div>
        </div>

        {/* Store Totals Section */}
        {selectedStore && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <GiGoldBar className="w-8 h-8 text-yellow-600" />
              <h2 className="text-2xl font-bold text-yellow-700">Store Inventory Totals</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Local Gold */}
              <div className="bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl p-4 text-white shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Local Gold</span>
                  <GiGoldBar className="w-6 h-6 text-yellow-200" />
                </div>
                <div className="text-2xl font-bold">{localGoldTotal.toLocaleString()}g</div>
                <div className="text-xs text-yellow-200 mt-1">Available Stock</div>
              </div>

              {/* Bank Gold */}
              <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-4 text-white shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Bank Gold</span>
                  <GiGoldBar className="w-6 h-6 text-amber-200" />
                </div>
                <div className="text-2xl font-bold">{bankGoldTotal.toLocaleString()}g</div>
                <div className="text-xs text-amber-200 mt-1">Available Stock</div>
              </div>

              {/* Local Silver */}
              <div className="bg-gradient-to-br from-gray-400 to-slate-500 rounded-xl p-4 text-white shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Local Silver</span>
                  <GiGoldNuggets className="w-6 h-6 text-gray-200" />
                </div>
                <div className="text-2xl font-bold">{localSilverTotal.toLocaleString()}g</div>
                <div className="text-xs text-gray-200 mt-1">Available Stock</div>
              </div>

              {/* Bank Silver */}
              <div className="bg-gradient-to-br from-slate-500 to-gray-600 rounded-xl p-4 text-white shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Bank Silver</span>
                  <GiGoldNuggets className="w-6 h-6 text-slate-200" />
                </div>
                <div className="text-2xl font-bold">{bankSilverTotal.toLocaleString()}g</div>
                <div className="text-xs text-slate-200 mt-1">Available Stock</div>
              </div>
            </div>
          </div>
        )}
 
        {/* Quick Actions Grid */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 mb-10 border border-yellow-200">
          <div className="flex items-center gap-3 mb-8">
            <GiGoldNuggets className="w-8 h-8 text-yellow-600" />
            <h2 className="text-2xl font-bold text-yellow-700">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.label}
                to={action.to}
                className={`group relative overflow-hidden rounded-2xl ${action.bgColor} ${action.hoverColor} transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 border-2 ${action.borderColor} p-6`}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4 transform group-hover:scale-110 transition-transform duration-300">
                    {action.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-gray-900 transition-colors">
                    {action.label}
                  </h3>
                  <p className="text-sm text-gray-600 group-hover:text-gray-700 transition-colors">
                    {action.description}
                  </p>
                </div>
                {/* Decorative elements */}
                <div className="absolute top-2 right-2 opacity-20 group-hover:opacity-30 transition-opacity">
                  <GiGoldBar className="w-6 h-6 text-amber-600" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
 
      {/* Edit Rate Modal */}
      {showEditModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCloseModal}></div>
          <div className="relative bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4 animate-fadeIn">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                {editType === 'gold' ? (
                  <>
                    <GiGoldBar className="w-6 h-6 text-yellow-600" />
                    Edit Gold Rate
                  </>
                ) : (
                  <>
                    <GiGoldNuggets className="w-6 h-6 text-gray-600" />
                    Edit Silver Rate
                  </>
                )}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FaTimes className="w-5 h-5 text-gray-500" />
              </button>
            </div>
           
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rate (₹ per gram)
                </label>
                <input
                  type="number"
                  value={tempRate}
                  onChange={(e) => setTempRate(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all duration-200"
                  placeholder="Enter rate"
                  step="0.01"
                />
              </div>
             
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Change from yesterday (%)
                </label>
                <input
                  type="number"
                  value={tempChange}
                  onChange={(e) => setTempChange(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all duration-200"
                  placeholder="Enter percentage change (e.g., 2.5 or -1.2)"
                  step="0.1"
                />
              </div>
            </div>
           
            <div className="flex gap-3 mt-8">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRate}
                className="flex-1 px-4 py-3 text-white bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 rounded-xl transition-all duration-200 font-medium flex items-center justify-center gap-2"
              >
                <FaSave className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
 
      <style>{`
        .animate-fadeIn {
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
 
export default Employeedashboard
 
 
 