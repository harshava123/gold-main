import React, { useState } from 'react'
import { auth, db } from '../../../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import goldWave from '../../../assets/gold-wave.jpg';
import { sendPasswordResetEmail } from 'firebase/auth';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const q = query(collection(db, 'users'), where('email', '==', user.email));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        setError('User not found in the system');
        setLoading(false);
        return;
      }
      const userData = querySnapshot.docs[0].data();
      const userRole = userData.role.toLowerCase();
      if (userRole === 'admin') {
        navigate('/admin');
      } else if (userRole === 'employee') {
        navigate('/employee');
      } else {
        setError('Invalid user role');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      if (err.code !== 'auth/user-not-found') {
        setError(err.message);
        return;
      }
    }
    setSuccess('If an account with that email exists, a password reset link has been sent.');
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center relative"
      style={{ backgroundImage: `url(${goldWave})` }}
    >
      <div className="absolute backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-md rounded-2xl shadow-2xl p-8 flex flex-col items-center border border-yellow-400 bg-white/80 backdrop-blur-lg" style={{ boxShadow: '0 4px 32px 0 rgba(212,175,55,0.15), 0 1.5px 0 0 #FFD700 inset' }}>
        <div className="w-24 h-2 rounded-full mb-6 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 shadow-lg" />
        <h1 className="text-4xl font-semibold font-sans text-yellow-700 mb-2 tracking-tight">S M D B</h1>
        <h2 className="text-xl font-semibold font-sans mb-4 text-yellow-600 w-full text-center">{showForgot ? 'Reset Password' : 'Log In'}</h2>
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded w-full text-center animate-pulse">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded w-full text-center animate-pulse">
            {success}
          </div>
        )}
        {showForgot ? (
          <form onSubmit={handleForgotPassword} className="space-y-5 w-full">
            <div>
              <label className="block text-sm font-medium font-sans text-gray-700 mb-1">Enter your registered email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white/70 backdrop-blur"
                placeholder="Enter your email"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-white font-semibold py-2 rounded-full transition duration-200 shadow-md text-lg border-2 border-yellow-300"
            >
              Send Reset Email
            </button>
            <button
              type="button"
              onClick={() => { setShowForgot(false); setError(''); setSuccess(''); }}
              className="w-full mt-2 text-yellow-700 hover:underline text-sm"
            >
              Back to Login
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 w-full">
            <div>
              <label className="block text-sm font-medium font-sans text-gray-700 mb-1">Your email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white/70 backdrop-blur"
                placeholder="Enter your email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white/70 backdrop-blur"
                placeholder="Enter your password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-white font-semibold py-2 rounded-full transition duration-200 shadow-md text-lg border-2 border-yellow-300 ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  Logging in...
                </span>
              ) : (
                'Log In'
              )}
            </button>
          </form>
        )}
        <div className="w-full flex justify-between mt-4 text-xs text-gray-500">
          <button
            type="button"
            className="hover:underline"
            onClick={() => { setShowForgot(true); setError(''); setSuccess(''); }}
          >
            I forgot my password
          </button>
          <span>&copy; smdb 2025</span>
        </div>
      </div>
      <style>{`
        .animate-fadeIn {
          animation: fadeIn 1s ease;
        }
        .delay-200 {
          animation-delay: 0.2s;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  )
}

export default Login
