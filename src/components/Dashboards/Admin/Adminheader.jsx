import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../../../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { useStore } from './StoreContext';
 
function Adminheader() {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [userName, setUserName] = useState('');
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const { selectedStore } = useStore();
  const navigate = useNavigate();
 
  useEffect(() => {
    const fetchUserName = async () => {
      const user = auth.currentUser;
      if (user) {
        const q = query(collection(db, 'users'), where('email', '==', user.email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          setUserName(userData.name || user.email);
        }
      }
    };
    fetchUserName();
  }, []);
 
  // Listen for admin notifications
  useEffect(() => {
    const notifQ = query(collection(db, 'admin_notifications'), where('seen', '==', false));
    const unsub = onSnapshot(notifQ, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);
 
  const handleNotifClick = async (notif) => {
    setShowNotif(false);
    // Mark as seen
    await updateDoc(doc(db, 'admin_notifications', notif.id), { seen: true });
    // Navigate to the relevant reserves page
    navigate(notif.link);
  };

  const handleMarkAllAsRead = async () => {
    try {
      // Get all unseen notifications
      const unseenNotifications = notifications.filter(notif => !notif.seen);
      
      if (unseenNotifications.length === 0) {
        setShowNotif(false);
        return;
      }
      
      // Update all unseen notifications to seen
      const updatePromises = unseenNotifications.map(notif => 
        updateDoc(doc(db, 'admin_notifications', notif.id), { seen: true })
      );
      
      await Promise.all(updatePromises);
      setShowNotif(false);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };
 
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };
 
  // Helper to get initials from userName
  const getInitials = (name) => {
    if (!name) return 'A';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };
 
  return (
    <header className="bg-gradient-to-r from-amber-900 via-yellow-700 to-amber-600 shadow-lg border-b-2 border-yellow-400">
      <div className="w-full flex items-center justify-between py-2 px-4 sm:px-6">
        {/* Logo Section */}
        <div className="flex items-center space-x-2">
          <a href="/admin/dashboard" className="flex items-center space-x-2">
            <div className="text-lg font-bold tracking-tight text-white drop-shadow-lg flex items-center">
              <span className="bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent mr-2">&#11044;</span>
              <span className="">Admin Dashboard</span>
            </div>
          </a>
          <div className="text-xs font-semibold text-yellow-100 bg-yellow-800/60 px-2 py-1 rounded-md shadow border border-yellow-300/30">
            {selectedStore ? `Store: ${selectedStore.name}` : 'No Store Selected'}
          </div>
        </div>
 
        {/* Navigation Section */}
        <nav className="hidden lg:flex items-center gap-3">
          <Link to="/admin/tokens" className="flex items-center gap-1 px-3 py-1.5 rounded-md text-white hover:bg-yellow-800/60 transition font-medium text-sm border border-yellow-400/30">
            Tokens
          </Link>
          <Link to="/admin/gold-reserves" className="flex items-center gap-1 px-3 py-1.5 rounded-md text-white hover:bg-yellow-800/60 transition font-medium text-sm border border-yellow-400/30">
            Gold Reserves
          </Link>
          <Link to="/admin/silver-reserves" className="flex items-center gap-1 px-3 py-1.5 rounded-md text-white hover:bg-yellow-800/60 transition font-medium text-sm border border-yellow-400/30">
            Silver Reserves
          </Link>
          <Link to="/admin/file" className="flex items-center gap-1 px-3 py-1.5 rounded-md text-white hover:bg-yellow-800/60 transition font-medium text-sm border border-yellow-400/30">
            Cash Management
          </Link>
          <Link to="/admin/reports" className="flex items-center gap-1 px-3 py-1.5 rounded-md text-white hover:bg-yellow-800/60 transition font-medium text-sm border border-yellow-400/30">
            Reports
          </Link>
        </nav>
 
        {/* Mobile Navigation */}
        <nav className="flex lg:hidden items-center gap-2">
          <Link to="/admin/tokens" className="flex items-center gap-1 px-2 py-1 rounded-md text-white hover:bg-yellow-800/60 transition text-xs border border-yellow-400/30">
            <span className="hidden sm:inline">Tokens</span>
          </Link>
          <Link to="/admin/gold-reserves" className="flex items-center gap-1 px-2 py-1 rounded-md text-white hover:bg-yellow-800/60 transition text-xs border border-yellow-400/30">
            <span className="hidden sm:inline">Gold</span>
          </Link>
          <Link to="/admin/silver-reserves" className="flex items-center gap-1 px-2 py-1 rounded-md text-white hover:bg-yellow-800/60 transition text-xs border border-yellow-400/30">
            <span className="hidden sm:inline">Silver</span>
          </Link>
          <Link to="/admin/file" className="flex items-center gap-1 px-2 py-1 rounded-md text-white hover:bg-yellow-800/60 transition text-xs border border-yellow-400/30">
            <span className="hidden sm:inline">File</span>
          </Link>
          <Link to="/admin/reports" className="flex items-center gap-1 px-2 py-1 rounded-md text-white hover:bg-yellow-800/60 transition text-xs border border-yellow-400/30">
            <span className="hidden sm:inline">Reports</span>
          </Link>
        </nav>
 
        {/* Actions Section */}
        <div className="flex items-center gap-2">
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotif((v) => !v)}
              className="relative flex items-center justify-center w-8 h-8 rounded-lg hover:bg-yellow-600/70 focus:outline-none transition-colors border border-yellow-400/30"
              title="Notifications"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {notifications.length > 0 && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse"></span>
              )}
            </button>
            {showNotif && (
              <div className="absolute right-0 mt-2 w-96 bg-white text-black rounded-2xl shadow-2xl z-50 border-2 border-yellow-300 animate-fade-in backdrop-blur-sm">
                {/* Header */}
                <div className="bg-gradient-to-r from-yellow-500 to-amber-500 p-4 rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="bg-white/20 p-2 rounded-lg mr-3">
                        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg">Notifications</h3>
                        <p className="text-yellow-100 text-sm">
                          {notifications.length === 0 ? 'All caught up!' : `${notifications.length} new notification${notifications.length > 1 ? 's' : ''}`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowNotif(false)}
                      className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
                    >
                      <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
 
                {/* Content */}
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-gray-500 font-medium">No new notifications</p>
                      <p className="text-gray-400 text-sm mt-1">You&apos;re all caught up!</p>
                    </div>
                  ) : (
                    <div className="p-2">
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className="group relative bg-gradient-to-r from-yellow-50 to-amber-50 hover:from-yellow-100 hover:to-amber-100 border border-yellow-200 hover:border-yellow-300 rounded-xl p-4 mb-2 cursor-pointer transition-all duration-200 hover:shadow-md transform hover:-translate-y-0.5"
                          onClick={() => handleNotifClick(notif)}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="bg-gradient-to-r from-yellow-400 to-amber-400 p-2 rounded-lg flex-shrink-0">
                              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-gray-800 font-medium text-sm leading-relaxed">
                                {notif.message}
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-gray-500 bg-white/60 px-2 py-1 rounded-full">
                                  New
                                </span>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <svg className="h-4 w-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                          </div>
                         
                          {/* Notification indicator */}
                          <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
 
                {/* Footer */}
                {notifications.length > 0 && (
                  <div className="bg-gray-50 p-3 rounded-b-2xl border-t border-gray-200">
                    <button 
                      onClick={handleMarkAllAsRead}
                      className="w-full text-center text-yellow-700 hover:text-yellow-800 font-medium text-sm py-2 hover:bg-yellow-100 rounded-lg transition-colors"
                    >
                      Mark all as read
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
         
          {/* User/Logout Button */}
          <button
            onClick={() => setShowLogoutModal(true)}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-colors hover:bg-yellow-800/40 border border-yellow-400/30"
          >
            <span className="w-6 h-6 rounded-full bg-yellow-200 flex items-center justify-center text-yellow-800 font-bold text-sm border border-yellow-400">
              {getInitials(userName)}
            </span>
            <span className="font-semibold text-white text-sm hidden sm:inline">{userName || 'Admin'}</span>
          </button>
        </div>
      </div>
 
      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 font-sans bg-black/20 backdrop-blur-sm">
          <div className="relative bg-white rounded-2xl shadow-2xl border border-yellow-200 w-full max-w-md p-6 z-10 bg-gradient-to-br from-yellow-50 to-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-r from-red-500 to-pink-500 rounded-xl p-2">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Confirm Logout</h3>
                <p className="text-gray-600 text-sm">Are you sure you want to logout?</p>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 text-gray-500 hover:text-gray-700 text-base transition"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-6 py-2 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white rounded-lg shadow-lg font-semibold text-base transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
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
    </header>
  );
}
 
export default Adminheader;