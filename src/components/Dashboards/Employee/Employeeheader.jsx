import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../../../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { FaCoins, FaExchangeAlt, FaShoppingCart, FaClipboardList, FaChartLine, FaFileAlt, FaChevronDown, FaUserCircle, FaSignOutAlt, FaGem } from 'react-icons/fa';
import { MdDashboard } from 'react-icons/md';
import { GiGoldBar, GiDiamondRing, GiJewelCrown } from 'react-icons/gi';
 
function stringToInitials(nameOrEmail) {
  if (!nameOrEmail) return 'U';
  const parts = nameOrEmail.split(' ');
  if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (nameOrEmail.includes('@')) return nameOrEmail[0].toUpperCase();
  return nameOrEmail.slice(0, 2).toUpperCase();
}
 
function Employeeheader() {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showOrderNotification, setShowOrderNotification] = useState(false);
  const [hasSeenOrderNotification, setHasSeenOrderNotification] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const navigate = useNavigate();
 
  useEffect(() => {
    const fetchUserName = async () => {
      const user = auth.currentUser;
      if (user) {
        setUserEmail(user.email);
        const q = query(collection(db, 'users'), where('email', '==', user.email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          setUserName(userData.name || user.email);
        } else {
          setUserName(user.email);
        }
      }
    };
    fetchUserName();
  }, []);
 
  const handleLogout = async () => {
    // If user hasn't seen the order notification yet, show it first
    if (!hasSeenOrderNotification) {
      setShowLogoutModal(false);
      setShowOrderNotification(true);
      return;
    }
   
    // If user has already seen the notification, proceed with logout
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };
 
  const handleVisitOrderManagement = () => {
    setShowOrderNotification(false);
    setHasSeenOrderNotification(true);
    navigate('/employee/order-management');
  };
 
  const handleCancelOrderNotification = () => {
    setShowOrderNotification(false);
    setHasSeenOrderNotification(true);
    setShowLogoutModal(true); // Show logout modal after canceling order notification
  };
 
  return (
    <header className="bg-gradient-to-r from-amber-900 via-yellow-700 to-amber-600 shadow-lg border-b-2 border-yellow-400">
      <div className="w-full flex items-center justify-between py-2 px-4 sm:px-6">
        {/* Logo Section */}
        <div className="flex items-center space-x-2">
          <Link
            to="/employee"
            className="rounded-lg px-2 py-1 flex items-center transition hover:bg-amber-800/40 active:scale-95 focus:outline-none focus:ring-2 focus:ring-yellow-300"
            style={{ textDecoration: 'none' }}
          >
            <GiJewelCrown className="h-6 w-6 text-yellow-300 mr-2 drop-shadow-lg" />
            <span className="text-lg font-bold tracking-tight text-white drop-shadow-lg">S M D B Employee Portal</span>
          </Link>
        </div>
 
        {/* Navigation Section */}
        <nav className="hidden lg:flex items-center gap-3">
          <Link to="/employee/tokens" className="flex items-center gap-1 px-3 py-1.5 rounded-md text-white hover:bg-amber-800/60 transition font-medium text-sm border border-yellow-400/30">
            <FaCoins className="w-4 h-4 text-yellow-300" />
            Tokens
          </Link>
          <Link to="/employee/exchanges" className="flex items-center gap-1 px-3 py-1.5 rounded-md text-white hover:bg-amber-800/60 transition font-medium text-sm border border-yellow-400/30">
            <FaExchangeAlt className="w-4 h-4 text-yellow-300" />
            Exchanges
          </Link>
          <Link to="/employee/sales" className="flex items-center gap-1 px-3 py-1.5 rounded-md text-white hover:bg-amber-800/60 transition font-medium text-sm border border-yellow-400/30">
            <FaChartLine className="w-4 h-4 text-yellow-300" />
            Sales
          </Link>
          <Link to="/employee/purchases" className="flex items-center gap-1 px-3 py-1.5 rounded-md text-white hover:bg-amber-800/60 transition font-medium text-sm border border-yellow-400/30">
            <FaShoppingCart className="w-4 h-4 text-yellow-300" />
            Purchases
          </Link>
          <Link to="/employee/order-management" className="flex items-center gap-1 px-3 py-1.5 rounded-md text-white hover:bg-amber-800/60 transition font-medium text-sm border border-yellow-400/30">
            <FaClipboardList className="w-4 h-4 text-yellow-300" />
            Orders
          </Link>
          <Link to="/employee/reports" className="flex items-center gap-1 px-3 py-1.5 rounded-md text-white hover:bg-amber-800/60 transition font-medium text-sm border border-yellow-400/30">
            <FaShoppingCart className="w-4 h-4 text-yellow-300" />
            Reports
          </Link>
        </nav>
 
        {/* Mobile Navigation */}
        <nav className="flex lg:hidden items-center gap-2">
          <Link to="/employee/tokens" className="flex items-center gap-1 px-2 py-1 rounded-md text-white hover:bg-amber-800/60 transition text-xs border border-yellow-400/30">
            <FaCoins className="w-3 h-3 text-yellow-300" />
            <span className="hidden sm:inline">Tokens</span>
          </Link>
          <Link to="/employee/exchanges" className="flex items-center gap-1 px-2 py-1 rounded-md text-white hover:bg-amber-800/60 transition text-xs border border-yellow-400/30">
            <FaExchangeAlt className="w-3 h-3 text-yellow-300" />
            <span className="hidden sm:inline">Exchanges</span>
          </Link>
          <Link to="/employee/sales" className="flex items-center gap-1 px-2 py-1 rounded-md text-white hover:bg-amber-800/60 transition text-xs border border-yellow-400/30">
            <FaChartLine className="w-3 h-3 text-yellow-300" />
            <span className="hidden sm:inline">Sales</span>
          </Link>
          <Link to="/employee/purchases" className="flex items-center gap-1 px-2 py-1 rounded-md text-white hover:bg-amber-800/60 transition text-xs border border-yellow-400/30">
            <FaShoppingCart className="w-3 h-3 text-yellow-300" />
            <span className="hidden sm:inline">Purchases</span>
          </Link>
          <Link to="/employee/order-management" className="flex items-center gap-1 px-2 py-1 rounded-md text-white hover:bg-amber-800/60 transition text-xs border border-yellow-400/30">
            <FaClipboardList className="w-3 h-3 text-yellow-300" />
            <span className="hidden sm:inline">Orders</span>
          </Link>
        </nav>
 
        {/* User Section */}
        <div className="flex items-center">
          <button
            onClick={() => setShowLogoutModal(true)}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-colors hover:bg-amber-800/40 border border-yellow-400/30"
          >
            <FaUserCircle className="w-6 h-6 text-amber-900 bg-yellow-300 rounded-full border border-yellow-400" />
            <FaChevronDown className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>
 
      {/* Order Management Notification Modal */}
      {showOrderNotification && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 backdrop-blur-sm transition-opacity duration-300" onClick={handleCancelOrderNotification}></div>
          <div className="relative bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4 animate-fadeIn">
            <div className="flex flex-col items-center">
              <FaClipboardList className="w-12 h-12 text-blue-500 mb-2" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Check Order Management</h3>
              <p className="text-gray-600 mb-6 text-center">
                Before logging out, please visit the Order Management page to check for any pending orders or tasks.
              </p>
              <div className="flex w-full justify-center space-x-3">
                <button
                  onClick={handleCancelOrderNotification}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVisitOrderManagement}
                  className="px-4 py-2 text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors font-medium shadow flex items-center gap-2"
                >
                  <FaClipboardList className="w-4 h-4" />
                  Visit Orders
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
 
      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 backdrop-blur-sm transition-opacity duration-300" onClick={() => setShowLogoutModal(false)}></div>
          <div className="relative bg-white rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4 animate-fadeIn">
            <div className="flex flex-col items-center">
              <FaSignOutAlt className="w-12 h-12 text-red-500 mb-2" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Logout</h3>
              <p className="text-gray-600 mb-6 text-center">Are you sure you want to logout?</p>
              <div className="flex w-full justify-end space-x-3">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors font-medium shadow"
                >
                  Logout
                </button>
              </div>
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
    </header>
  );
}
export default Employeeheader;