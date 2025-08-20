import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut, getAuth } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { db, auth } from '../../../firebase';
import { useStore } from './StoreContext';
import { useNavigate } from 'react-router-dom';
import store1Image from '../../../assets/store1.jpg';
import store2Image from '../../../assets/store2.jpg';

function Admindashboard() {
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [employeeData, setEmployeeData] = useState({
    name: '',
    mobile: '',
    email: '',
    password: '',
    role: 'Employee',
    storeName: ''
  });
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false); // For Add Employee loading state
  const { selectStore } = useStore();
  const navigate = useNavigate();

  const stores = [
    { id: 'store1', name: 'Store 1', location: 'Dilshuk Nagar', type: 'Traditional Jewelry', image: store1Image },
    { id: 'store2', name: 'Store 2', location: 'Shopping Complex', type: 'Modern Designs', image: store2Image }
  ];

  useEffect(() => {
    const fetchEmployees = async () => {
      const snapshot = await getDocs(collection(db, 'users'));
      setEmployees(snapshot.docs.map(doc => doc.data()));
    };
    fetchEmployees();
  }, [notification]);

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    // Mobile number validation: must be exactly 10 digits
    if (employeeData.mobile.length !== 10) {
      showNotification('Mobile number must be exactly 10 digits', 'error');
      return;
    }
    setLoading(true);
    
    try {
      const emailQuery = query(collection(db, 'users'), where('email', '==', employeeData.email));
      const emailSnapshot = await getDocs(emailQuery);
      if (!emailSnapshot.empty) {
        showNotification('Email already exists', 'error');
        setLoading(false);
        return;
      }

      const mobileQuery = query(collection(db, 'users'), where('mobile', '==', employeeData.mobile));
      const mobileSnapshot = await getDocs(mobileQuery);
      if (!mobileSnapshot.empty) {
        showNotification('Mobile number already exists', 'error');
        setLoading(false);
        return;
      }

      // Create a secondary Firebase app instance for creating the employee
      // This prevents the admin from being signed out
      const firebaseConfig = {
        apiKey: "AIzaSyCis5yYuh-rFvEcBbMDcqoM0eksSaCagvc",
        authDomain: "gold-18ea4.firebaseapp.com",
        projectId: "gold-18ea4",
        storageBucket: "gold-18ea4.firebasestorage.app",
        messagingSenderId: "802568938489",
        appId: "1:802568938489:web:0a5d98272ac04921ac9328",
        measurementId: "G-GRTH07VG3Z"
      };
      
      const secondaryApp = initializeApp(firebaseConfig, 'secondary');
      const secondaryAuth = getAuth(secondaryApp);

      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        employeeData.email,
        employeeData.password
      );

      await addDoc(collection(db, 'users'), {
        name: employeeData.name.trim(),
        mobile: employeeData.mobile.trim(),
        email: employeeData.email.trim(),
        role: employeeData.role,
        storeName: employeeData.storeName,
        storeId: selectedStore.id,
        createdAt: new Date().toISOString(),
        uid: userCredential.user.uid
      });

      // Sign out from the secondary app
      await signOut(secondaryAuth);

      setEmployeeData({
        name: '',
        mobile: '',
        email: '',
        password: '',
        role: 'Employee',
        storeName: ''
      });
      setShowAddEmployeeModal(false);
      showNotification('Employee added successfully', 'success');
      
    } catch (error) {
      console.error('Error adding employee:', error);
      showNotification(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch {
      showNotification('Error logging out', 'error');
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  return (
    <div className="min-h-screen bg-[#fffcf5] py-6 px-4 relative">
      <div className={showAddEmployeeModal ? 'blur-md transition duration-300' : ''}>
        {/* Top left */}
        <div className="absolute top-4 left-4 md:top-6 md:left-6">
          <h1 className="text-lg md:text-2xl font-semibold font-sans text-yellow-700">S M D B</h1>
          <div className="h-1 w-12 md:w-21 bg-yellow-500 mt-1 rounded-full"></div>
        </div>

        {/* Top right */}
        <div className="absolute top-4 right-4 md:top-6 md:right-6">
          <button
            onClick={handleLogout}
            className="bg-yellow-500 text-white px-3 py-1 md:px-4 md:py-2 rounded-lg hover:bg-yellow-600 font-semibold text-sm md:text-base"
          >
            Logout
          </button>
        </div>

        <div className="text-center mb-8 md:mb-12 px-2">
          <h1 className="text-2xl md:text-4xl font-semibold font-sans text-gray-900">
            Gold Shop <span className="text-yellow-500">Management Center</span>
          </h1>
          <p className="mt-2 text-gray-500 text-xl  font-sans md:text-lg max-w-xl mx-auto">
            Manage your precious jewelry stores with elegance and precision
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-10 max-w-6xl mx-auto w-full px-2">
          {stores.map(store => (
            <div
              key={store.id}
              onClick={() => {
                selectStore(store);
                navigate('/admin/dashboard');
              }}
              className="rounded-2xl p-4 md:p-6 shadow-lg hover:shadow-2xl transition cursor-pointer relative border-2 border-yellow-400 bg-white/30 backdrop-blur-md h-[440px] flex flex-col justify-between"
            >
              <div className="relative">
                <img
                  src={store.image}
                  alt={store.name}
                  className="absolute top-0 right-0 w-12 h-12 md:w-16 md:h-16 object-cover rounded-bl-xl shadow-md"
                />
                <div className="mb-3 md:mb-4">
                  <h2 className="text-lg md:text-xl font-bold text-yellow-500">{store.name}</h2>
                  <p className="text-gray-500 text-xs md:text-sm">{store.location}</p>
                  <p className="text-gray-400 text-xs md:text-sm">{store.type}</p>
                </div>
                <div className="mb-3 md:mb-4 flex-1 flex flex-col">
                  <h3 className="text-xs md:text-sm font-semibold text-gray-600 mb-1 md:mb-2">Team Members</h3>
                  {employees.filter(emp => emp.storeId === store.id).length === 0 ? (
                    <p className="text-gray-400 text-xs md:text-sm">No employees added yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                      {employees.filter(emp => emp.storeId === store.id).map((emp, idx) => (
                        <div
                          key={emp.email + idx}
                          className="bg-gray-50 px-3 py-1.5 md:px-4 md:py-2 rounded-lg flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-2 md:space-x-3">
                            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-yellow-400 text-white font-semibold flex items-center justify-center uppercase text-xs md:text-sm">
                              {emp.name?.[0] || 'U'}
                            </div>
                            <div>
                              <p className="text-gray-800 font-medium text-xs md:text-sm">{emp.name}</p>
                              <p className="text-gray-500 text-[10px] md:text-xs">{emp.role}</p>
                            </div>
                          </div>
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedStore(store);
                  setEmployeeData(prev => ({ ...prev, storeName: store.name }));
                  setShowAddEmployeeModal(true);
                }}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-white font-semibold py-1.5 md:py-2 rounded-lg shadow mt-3 md:mt-4 text-sm md:text-base"
              >
                Add Team Member
              </button>
            </div>
          ))}
        </div>
      </div>
      {/* Add Employee Modal */}
      {showAddEmployeeModal && (
        // PREMIUM MODAL UPGRADE START
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 font-sans bg-black/20 backdrop-blur-sm" style={{ fontFamily: "'Poppins', 'Inter', 'sans-serif'" }}>
          <div className="relative bg-white rounded-2xl shadow-2xl border border-yellow-200 w-full max-w-md p-6 z-10 bg-gradient-to-br from-yellow-50 to-white">
            <h3 className="text-2xl font-bold mb-1 text-yellow-600 tracking-tight">Add Employee to {selectedStore?.name}</h3>
            <div className="h-1 w-16 bg-yellow-400 rounded-full mb-4"></div>
            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Name"
                  required
                  className="w-full border border-yellow-200 px-4 py-3 rounded-lg text-base bg-yellow-50 focus:ring-2 focus:ring-yellow-400 focus:outline-none transition pl-10"
                  value={employeeData.name}
                  onChange={e => setEmployeeData({ ...employeeData, name: e.target.value })}
                />
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-yellow-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </span>
              </div>
              <div className="relative">
                <input
                  type="tel"
                  placeholder="Mobile"
                  required
                  maxLength={10}
                  pattern="[0-9]{10}"
                  className="w-full border border-yellow-200 px-4 py-3 rounded-lg text-base bg-yellow-50 focus:ring-2 focus:ring-yellow-400 focus:outline-none transition pl-10"
                  value={employeeData.mobile}
                  onChange={e => {
                    // Only allow numbers and max 10 digits
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    if (val.length <= 10) setEmployeeData({ ...employeeData, mobile: val });
                  }}
                  inputMode="numeric"
                  autoComplete="off"
                />
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-yellow-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 7M7 13l-2 5m5-5v5m4-5v5m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v1m6 0H6" /></svg>
                </span>
              </div>
              <div className="relative">
                <input
                  type="email"
                  placeholder="Email"
                  required
                  className="w-full border border-yellow-200 px-4 py-3 rounded-lg text-base bg-yellow-50 focus:ring-2 focus:ring-yellow-400 focus:outline-none transition pl-10"
                  value={employeeData.email}
                  onChange={e => setEmployeeData({ ...employeeData, email: e.target.value })}
                />
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-yellow-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12H8m8 0a4 4 0 11-8 0 4 4 0 018 0zm0 0v1a4 4 0 01-8 0v-1m8 0H8" /></svg>
                </span>
              </div>
              <div className="relative">
                <input
                  type="password"
                  placeholder="Password"
                  required
                  minLength={6}
                  className="w-full border border-yellow-200 px-4 py-3 rounded-lg text-base bg-yellow-50 focus:ring-2 focus:ring-yellow-400 focus:outline-none transition pl-10"
                  value={employeeData.password}
                  onChange={e => setEmployeeData({ ...employeeData, password: e.target.value })}
                />
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-yellow-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0-1.104.896-2 2-2s2 .896 2 2-.896 2-2 2-2-.896-2-2zm0 0V7m0 4v4m0 0a4 4 0 100-8 4 4 0 000 8z" /></svg>
                </span>
              </div>
              <select
                className="w-full border border-yellow-200 px-4 py-3 rounded-lg text-base bg-yellow-50 focus:ring-2 focus:ring-yellow-400 focus:outline-none transition"
                value={employeeData.role}
                onChange={e => setEmployeeData({ ...employeeData, role: e.target.value })}
              >
                <option value="Employee">Employee</option>
              </select>
              <div className="flex justify-end space-x-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddEmployeeModal(false)}
                  className="px-4 py-2 text-gray-500 hover:text-gray-700 text-base transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-6 py-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white rounded-lg shadow-lg hover:from-yellow-500 hover:to-yellow-600 font-semibold text-base transition flex items-center justify-center ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
                  disabled={loading}
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                    </svg>
                  ) : null}
                  {loading ? 'Adding...' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
        // PREMIUM MODAL UPGRADE END
      )}

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
                onClick={confirmLogout}
                className="px-6 py-2 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white rounded-lg shadow-lg font-semibold text-base transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Notification Toast */}
        {notification.show && (
          <div
            className={`fixed top-6 left-1/2 transform -translate-x-1/2 p-3 md:p-4 rounded-xl text-white z-[9999] ${
              notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            } text-sm md:text-base`}
          >
            {notification.message}
          </div>
        )}
    </div>
  );
}

export default Admindashboard;
