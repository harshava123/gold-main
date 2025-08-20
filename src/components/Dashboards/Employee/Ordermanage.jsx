import React, { useState } from 'react';
import Employeeheader from './Employeeheader';
import { FaPlus, FaTrash, FaWhatsapp, FaTimes, FaEdit, FaSave, FaEye } from 'react-icons/fa';
import { db } from '../../../firebase';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useStore } from '../Admin/StoreContext';
 
const ORNAMENT_TYPES = [
  'Necklace',
  'Earrings',
  'Ring',
  'Bangles',
  'Bracelet',
  'Pendant',
  'Chain',
  'Anklet',
  'Nose Pin',
  'Other',
];

const ORDER_STATUS = {
  PENDING: 'Pending',
  IN_PROGRESS: 'Work in Progress',
  DELAYED: 'Work in Delay',
  COMPLETED: 'Work Completed'
};

const ITEM_STATUS = {
  WITH_WORKER: 'Items with Worker',
  WITH_DEPARTMENT: 'Items with Department',
  DELIVERED: 'Items delivered to customer'
};
 
// Helper to generate the next available order ID in ascending order
function getNextOrderId(orders) {
  // Extract all numeric parts of order IDs
  const nums = orders
    .map(o => parseInt((o.orderId || '').replace('ORD-', ''), 10))
    .filter(n => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return 'ORD-' + String(max + 1).padStart(5, '0');
}
 
function Ordermanage() {
  const { selectedStore } = useStore();
  const [orders, setOrders] = useState([
    {
      orderId: 'ORD-00001',
      orderType: '', // 'GROUP' | 'INDIVIDUAL'
      customer: { name: '', contact: '', address: '' },
      subQuantity: '',
      totalWeight: '',
      advance: '', // amount in ₹ (if advanceType === 'AMOUNT')
      advanceType: 'AMOUNT', // 'AMOUNT' | 'GOLD'
      advanceGoldGms: '', // if advanceType === 'GOLD'
      advanceGoldRate: '', // if advanceType === 'GOLD'
      advanceAmountRate: '', // if advanceType === 'AMOUNT'
      requestedDeliveryDate: '',
      orderWeightage: '', // number of items
      orderPeopleContact: '', // Contact number for order people
      items: [
        { 
          sno: 1,
          ornamentType: 'Necklace', 
          weight: '', 
          advance: '', 
          customerNotes: '',
          photo: null,
          status: ORDER_STATUS.PENDING,
          itemStatus: ITEM_STATUS.WITH_WORKER,
          notes: '',
          isSubmitted: false
        },
      ],
      orderStatus: ORDER_STATUS.PENDING,
      isPlaced: false,
      reminderActive: false, // Track if reminder is active
      reminderCount: 0, // Count of reminders sent
      dailyChecklist: {
        day1: { status: 'NA', note: '' }, // FORWARDED | NOT_FORWARDED | NA
        day2: { status: 'NA', note: '' }, // PLACED | NOT_PLACED | NA
        day3: { status: 'NA', note: '' }, // INITIATED | NOT_INITIATED | NA
        day4: { deptVerified: false, workerVerified: false, note: '' },
        day5: { status: 'NA', note: '' }, // IN_PROGRESS | DELAY | COMPLETED | NA
        day6: { status: 'NA', note: '' },
        day7: { location: 'NA', note: '' }, // WORKER | DEPARTMENT | DELIVERED | NA
        day8: { location: 'NA', note: '' }
      }
    },
  ]);

  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState('');
  const [showTable, setShowTable] = useState(false);
  const [reminderIntervals, setReminderIntervals] = useState({}); // Store interval IDs

  // Filtered orders based on search
  const filteredOrders = orders.filter(order => {
    if (!search.trim()) return true;
    const s = search.trim().toLowerCase();
    return (
      order.orderId.toLowerCase().includes(s) ||
      (order.customer.name && order.customer.name.toLowerCase().includes(s)) ||
      (order.customer.contact && order.customer.contact.toLowerCase().includes(s))
    );
  });

  // Adjust activeTab to always be in range of filteredOrders
  React.useEffect(() => {
    if (activeTab >= filteredOrders.length) setActiveTab(0);
  }, [filteredOrders.length]);
 
  // Persist an order to Firestore (upsert)
  const saveOrderToDb = async (order) => {
    try {
      if (!order?.orderId || !selectedStore) return;
      const ref = doc(db, 'orders', order.orderId);
      const payload = {
        ...order,
        storeId: selectedStore.id,
        storeName: selectedStore.name,
        updatedAt: serverTimestamp(),
      };
      if (!order.createdAt) payload.createdAt = serverTimestamp();
      await setDoc(ref, payload, { merge: true });
    } catch (e) {
      console.error('Failed to save order', e);
    }
  };

  // Update order by index in filteredOrders
  const updateOrder = (filteredIdx, newOrder) => {
    const orderId = filteredOrders[filteredIdx]?.orderId;
    setOrders((prev) => {
      const mergedList = prev.map((o) => (o.orderId === orderId ? { ...o, ...newOrder } : o));
      const latest = mergedList.find(o => o.orderId === orderId);
      saveOrderToDb(latest);
      return mergedList;
    });
  };
 
  const currentOrder = filteredOrders[activeTab] || {};

  const handleCustomerChange = (field, value) => {
    updateOrder(activeTab, { 
      customer: { ...currentOrder.customer, [field]: value } 
    });
  };

  const handleOrderFieldChange = (field, value) => {
    updateOrder(activeTab, { [field]: value });
  };

  // Adjust items rows to match order quantity
  const adjustItemsCount = (count) => {
    const desired = Math.max(0, parseInt(count || '0', 10));
    let newItems = [...(currentOrder.items || [])];
    if (desired > newItems.length) {
      const toAdd = desired - newItems.length;
      for (let i = 0; i < toAdd; i++) {
        newItems.push({
          sno: newItems.length + 1,
          ornamentType: 'Necklace',
          weight: '',
          advance: '',
          customerNotes: '',
          photo: null,
          status: ORDER_STATUS.PENDING,
          itemStatus: ITEM_STATUS.WITH_WORKER,
          notes: '',
          isSubmitted: false
        });
      }
    } else if (desired < newItems.length) {
      newItems = newItems.slice(0, desired).map((it, idx) => ({ ...it, sno: idx + 1 }));
    }
    updateOrder(activeTab, { items: newItems, orderWeightage: count });
  };

  const handleItemChange = (idx, field, value) => {
    const newItems = currentOrder.items.map((item, i) => 
      i === idx ? { ...item, [field]: value } : item
    );
    updateOrder(activeTab, { items: newItems });
  };

  // Update daily checklist helper
  const setChecklist = (dayKey, field, value) => {
    const updated = {
      ...(currentOrder.dailyChecklist || {}),
      [dayKey]: { ...(currentOrder.dailyChecklist?.[dayKey] || {}), [field]: value }
    };
    updateOrder(activeTab, { dailyChecklist: updated });
  };

  const addItem = () => {
    const newSno = currentOrder.items.length + 1;
    updateOrder(activeTab, {
      items: [
        ...currentOrder.items,
        { 
          sno: newSno,
          ornamentType: 'Necklace', 
          weight: '', 
          advance: '', 
          customerNotes: '',
          photo: null,
          status: ORDER_STATUS.PENDING,
          itemStatus: ITEM_STATUS.WITH_WORKER,
          notes: '',
          isSubmitted: false
        },
      ],
    });
  };

  const removeItem = (idx) => {
    const newItems = currentOrder.items.filter((_, i) => i !== idx);
    // Renumber the items
    const renumberedItems = newItems.map((item, i) => ({ ...item, sno: i + 1 }));
    updateOrder(activeTab, { items: renumberedItems });
  };
 
  const addTab = () => {
    setOrders((prev) => {
      const newOrder = {
        orderId: getNextOrderId(prev),
        orderType: '',
        customer: { name: '', contact: '', address: '' },
        subQuantity: '',
        totalWeight: '',
        advance: '',
        advanceType: 'AMOUNT',
        advanceGoldGms: '',
        advanceGoldRate: '',
        advanceAmountRate: '',
        requestedDeliveryDate: '',
        orderWeightage: '',
        orderPeopleContact: '',
        items: [
          { 
            sno: 1,
            ornamentType: 'Necklace', 
            weight: '', 
            advance: '', 
            customerNotes: '',
            photo: null,
            status: ORDER_STATUS.PENDING,
            itemStatus: ITEM_STATUS.WITH_WORKER,
            notes: '',
            isSubmitted: false
          },
        ],
        orderStatus: ORDER_STATUS.PENDING,
        isPlaced: false,
        reminderActive: false,
        reminderCount: 0,
        dailyChecklist: {
          day1: { status: 'NA', note: '' },
          day2: { status: 'NA', note: '' },
          day3: { status: 'NA', note: '' },
          day4: { deptVerified: false, workerVerified: false, note: '' },
          day5: { status: 'NA', note: '' },
          day6: { status: 'NA', note: '' },
          day7: { location: 'NA', note: '' },
          day8: { location: 'NA', note: '' }
        }
      };
      const list = [...prev, newOrder];
      saveOrderToDb(newOrder);
      setActiveTab(list.length - 1);
      return list;
    });
  };

  const removeTab = (filteredIdx) => {
    if (orders.length === 1) return;
    const orderId = filteredOrders[filteredIdx]?.orderId;
    
    // Clear any active reminder for this order
    if (reminderIntervals[orderId]) {
      clearInterval(reminderIntervals[orderId]);
      setReminderIntervals(prev => {
        const newIntervals = { ...prev };
        delete newIntervals[orderId];
        return newIntervals;
      });
    }
    
    const newOrders = orders.filter((o) => o.orderId !== orderId);
    setOrders(newOrders);
    setActiveTab(0);
  };

  // Function to start reminder notifications with Firebase monitoring
  const startReminderNotifications = (order) => {
    const phoneNumber = order.orderPeopleContact?.replace(/\D/g, '');
    if (!phoneNumber || phoneNumber.length < 10) return;

    // Clear any existing reminder for this order
    if (reminderIntervals[order.orderId]) {
      clearInterval(reminderIntervals[order.orderId]);
    }

    // Update order to show reminder is active
    updateOrder(activeTab, { reminderActive: true, reminderCount: 0 });

    // Note: Firebase monitoring removed

    let reminderCount = 0;
    const intervalId = setInterval(() => {
      reminderCount++;
      
      const reminderMessage = `🔔 *REMINDER ${reminderCount}* - Order: ${order.orderId}\n\n` +
        `Please confirm receipt of the order details.\n\n` +
        `Reply "OK" or "RECEIVED" to stop these reminders.\n\n` +
        `Customer: ${order.customer.name || 'N/A'}\n` +
        `Contact: ${order.customer.contact || 'N/A'}`;

      const whatsappUrl = `https://wa.me/91${phoneNumber}?text=${encodeURIComponent(reminderMessage)}`;
      window.open(whatsappUrl, '_blank');

      // Update reminder count
      setOrders(prevOrders => 
        prevOrders.map(o => 
          o.orderId === order.orderId 
            ? { ...o, reminderCount: reminderCount }
            : o
        )
      );

      // Stop after 10 reminders (50 seconds)
      if (reminderCount >= 10) {
        clearInterval(intervalId);
        setReminderIntervals(prev => {
          const newIntervals = { ...prev };
          delete newIntervals[order.orderId];
          return newIntervals;
        });
        
        // Firebase monitoring removed
        
        setOrders(prevOrders => 
          prevOrders.map(o => 
            o.orderId === order.orderId 
              ? { ...o, reminderActive: false }
              : o
          )
        );
        
        alert(`Reminder notifications stopped for ${order.orderId} after 10 attempts.`);
      }
    }, 5000); // 5 seconds interval

    // Store the interval ID
    setReminderIntervals(prev => ({
      ...prev,
      [order.orderId]: intervalId
    }));
  };

  // Function to stop reminder notifications
  const stopReminderNotifications = (orderId) => {
    if (reminderIntervals[orderId]) {
      clearInterval(reminderIntervals[orderId]);
      setReminderIntervals(prev => {
        const newIntervals = { ...prev };
        delete newIntervals[orderId];
        return newIntervals;
      });

      // Firebase monitoring removed

      setOrders(prevOrders => 
        prevOrders.map(o => 
          o.orderId === orderId 
            ? { ...o, reminderActive: false }
            : o
        )
      );

      alert(`Reminder notifications stopped for ${orderId}.`);
    }
  };

  // Cleanup intervals on component unmount
  React.useEffect(() => {
    return () => {
      Object.values(reminderIntervals).forEach(intervalId => {
        clearInterval(intervalId);
      });
    };
  }, [reminderIntervals]);

  const placeOrder = () => {
    const order = currentOrder;
    
    // Validate required fields
    if (!order.orderPeopleContact) {
      alert('Please enter Order People Contact number before placing the order.');
      return;
    }

    // Create WhatsApp message
    const sendOrderToWhatsApp = () => {
      let message = `🔔 *NEW ORDER RECEIVED*\n\n`;
      message += `📋 *Order ID:* ${order.orderId}\n`;
      message += `👤 *Customer:* ${order.customer.name || 'N/A'}\n`;
      // Contact is intentionally omitted from WhatsApp message per requirement
      
      if (order.requestedDeliveryDate) {
        const deliveryDate = new Date(order.requestedDeliveryDate).toLocaleDateString();
        message += `📅 *Expected Delivery:* ${deliveryDate}\n`;
      }
      
      if (order.totalWeight) message += `⚖️ *Total Weight:* ${order.totalWeight} gms\n`;
      if (order.orderWeightage) message += `📊 *Order Quantity:* ${order.orderWeightage}\n`;
      if (order.orderType) message += `🧩 *Order Type:* ${order.orderType === 'GROUP' ? 'Group' : 'Individual'}\n`;

      // Advance details
      if (order.advanceType === 'AMOUNT') {
        if (order.advance) message += `💰 *Advance Amount:* ₹${order.advance}\n`;
      } else if (order.advanceType === 'GOLD') {
        if (order.advanceGoldGms) message += `🥇 *Advance Gold:* ${order.advanceGoldGms} gms\n`;
        if (order.advanceGoldRate) message += `💱 *Advance Gold Rate:* ₹${order.advanceGoldRate}/g\n`;
      }
      
      message += `\n📝 *ITEMS DETAILS:*\n`;
      message += `━━━━━━━━━━━━━━━━━━━━\n`;
      
      order.items.forEach((item, idx) => {
        message += `\n${idx + 1}. *${item.ornamentType}*\n`;
        if (item.weight) message += `   Weight: ${item.weight} gms\n`;
        if (item.customerNotes) message += `   Notes: ${item.customerNotes}\n`;
        message += `   ────────────────────\n`;
      });
      // Address is intentionally omitted from WhatsApp message per requirement

      // Clean phone number
      const phoneNumber = order.orderPeopleContact.replace(/\D/g, '');
      if (phoneNumber.length >= 10) {
        const whatsappUrl = `https://wa.me/91${phoneNumber}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        
        // Show success message
        alert('Order sent to WhatsApp!');
      } else {
        alert('Please enter a valid phone number for Order People Contact.');
        return;
      }
    };

    // Send to WhatsApp first
    sendOrderToWhatsApp();
    
    // Then update order status
    updateOrder(activeTab, { 
      isPlaced: true,
      orderStatus: ORDER_STATUS.IN_PROGRESS 
    });

    // Start reminder notifications
    setTimeout(() => {
      startReminderNotifications(order);
    }, 2000); // Start reminders 2 seconds after initial message
  };

  const updateOrderStatus = (newStatus) => {
    updateOrder(activeTab, { orderStatus: newStatus });
  };

  const sendPhotosToWhatsApp = () => {
    const order = currentOrder;
    const itemsWithPhotos = order.items.filter(item => item.photo);
    
    if (itemsWithPhotos.length === 0) {
      alert('No photos available to send.');
      return;
    }

    const phoneNumber = order.orderPeopleContact?.replace(/\D/g, '');
    if (!phoneNumber || phoneNumber.length < 10) {
      alert('Order People Contact not available.');
      return;
    }

    let message = `📸 *PHOTOS FOR ORDER: ${order.orderId}*\n\n`;
    message += `Please find the reference photos for the following items:\n\n`;
    
    itemsWithPhotos.forEach((item, idx) => {
      message += `${idx + 1}. ${item.ornamentType}`;
      if (item.customerNotes) {
        message += ` - ${item.customerNotes}`;
      }
      message += `\n`;
    });
    
    message += `\n📝 Note: Photos will be sent as separate messages after this text.`;

    const whatsappUrl = `https://wa.me/91${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    alert(`Photos message sent! Please manually send ${itemsWithPhotos.length} photo(s) in the WhatsApp chat.`);
  };
 

 
  return (
    <>
      <Employeeheader />
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50">
        {/* Main Content Container - Set to 75% width */}
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6" style={{width: '75%', maxWidth: '75vw'}}>
          {/* Header Section */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-yellow-100 to-amber-100 border border-yellow-300 rounded-2xl p-6 text-center shadow-lg mb-6">
              <h1 className="text-3xl font-bold text-yellow-800 mb-2">📋 Order Management System</h1>
              <p className="text-yellow-700 text-sm">
                Manage customer orders, track progress, and coordinate with production teams
              </p>
            </div>
            
            {/* Order Type Selection Gate */}
            {!currentOrder.orderType && (
              <div className="bg-white rounded-2xl shadow-2xl border border-yellow-100 p-6 mb-6">
                <h3 className="text-xl font-bold text-yellow-800 mb-4">Select Order Type</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    className="p-4 rounded-xl border-2 border-yellow-300 hover:border-yellow-400 bg-yellow-50 text-yellow-900 font-bold"
                    onClick={() => updateOrder(activeTab, { orderType: 'INDIVIDUAL' })}
                  >
                    🙍‍♂️ Individual Order
                  </button>
                  <button
                    className="p-4 rounded-xl border-2 border-amber-300 hover:border-amber-400 bg-amber-50 text-amber-900 font-bold"
                    onClick={() => updateOrder(activeTab, { orderType: 'GROUP' })}
                  >
                    👥 Group Order
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-3">Choose an order type to continue.</p>
              </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <button
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-bold text-base shadow-lg transition-all duration-200 transform hover:scale-105"
                onClick={() => setShowTable((prev) => !prev)}
              >
                {showTable ? '📝 Back to Orders' : '📊 View All Orders'}
              </button>
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setActiveTab(0); }}
                placeholder="🔍 Search by Order ID, Name, or Contact"
                className="px-6 py-3 rounded-2xl border-2 border-yellow-200 bg-white text-gray-800 placeholder:text-gray-500 text-base focus:ring-4 focus:ring-yellow-200 focus:border-yellow-400 transition-all duration-200 w-full md:w-96 shadow-lg"
              />
            </div>
          </div>
          {/* Orders Table View */}
          {showTable && (
            <div className="mb-8">
              <div className="bg-white rounded-3xl shadow-2xl border border-yellow-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-yellow-100">
                    <thead className="bg-gradient-to-r from-yellow-50 to-amber-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-bold text-yellow-800 uppercase tracking-wider">📋 Order ID</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-yellow-800 uppercase tracking-wider">👤 Customer Name</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-yellow-800 uppercase tracking-wider">📞 Contact</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-yellow-800 uppercase tracking-wider">📊 Status</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-yellow-800 uppercase tracking-wider">⚡ Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-yellow-50">
                      {orders.map((order, idx) => (
                        <tr key={order.orderId} className="hover:bg-gradient-to-r hover:from-yellow-50 hover:to-amber-50 transition-all duration-200">
                          <td className="px-6 py-4 font-mono text-gray-900 font-semibold">{order.orderId}</td>
                          <td className="px-6 py-4 text-gray-800">{order.customer.name || 'N/A'}</td>
                          <td className="px-6 py-4 text-gray-800">{order.customer.contact || 'N/A'}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                              order.orderStatus === ORDER_STATUS.PENDING ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                              order.orderStatus === ORDER_STATUS.IN_PROGRESS ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                              order.orderStatus === ORDER_STATUS.DELAYED ? 'bg-red-100 text-red-800 border border-red-200' :
                              'bg-green-100 text-green-800 border border-green-200'
                            }`}>
                              {order.orderStatus}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white text-sm font-bold shadow-lg transition-all duration-200 transform hover:scale-105"
                              onClick={() => {
                                setShowTable(false);
                                const filteredIdx = filteredOrders.findIndex(o => o.orderId === order.orderId);
                                if (filteredIdx !== -1) setActiveTab(filteredIdx);
                                else {
                                  setSearch('');
                                  setActiveTab(orders.findIndex(o => o.orderId === order.orderId));
                                }
                              }}
                            >
                              <FaEye className="inline mr-2" />
                              View/Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {/* Order Form View */}
          {!showTable && filteredOrders.length > 0 && (
            <>
              {/* Order Tabs */}
              <div className="flex gap-3 mb-8 border-b-2 border-yellow-200 w-full overflow-x-auto pb-2">
                {filteredOrders.map((order, idx) => (
                  <div key={order.orderId} className="relative">
                    <button
                      className={`px-6 py-3 rounded-t-2xl font-bold text-sm transition-all duration-200 whitespace-nowrap shadow-lg ${
                        activeTab === idx
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-b-4 border-amber-600 transform scale-105'
                          : 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 hover:from-yellow-200 hover:to-amber-200 border border-yellow-300'
                      }`}
                      onClick={() => setActiveTab(idx)}
                    >
                      📋 {order.orderId}
                      {order.isPlaced && <span className="ml-2 text-xs">✅</span>}
                    </button>
                    {orders.length > 1 && (
                      <button
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition-all duration-200 shadow-lg transform hover:scale-110"
                        onClick={() => removeTab(idx)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  className="px-6 py-3 rounded-t-2xl bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 transition-all duration-200 text-sm font-bold shadow-lg transform hover:scale-105"
                  onClick={addTab}
                >
                  <FaPlus className="inline mr-2" />
                  ➕ New Order
                </button>
              </div>
              {/* Order Form */}
              {currentOrder.orderType && (
              <div className="bg-white rounded-3xl shadow-2xl border border-yellow-100 p-8">
                {/* Order Header */}
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6 mb-8">
                  <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-r from-yellow-500 to-amber-500 rounded-2xl p-3">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900">
                        📋 {currentOrder.orderId}
                        {currentOrder.isPlaced && (
                          <span className="ml-4 px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 text-lg rounded-2xl border border-green-200 shadow-lg">
                            ✅ Order Placed
                          </span>
                        )}
                      </h2>
                      <p className="text-gray-600 mt-1">Manage order details and track progress</p>
                      <div className="mt-2">
                        <span className="px-3 py-1 rounded-xl text-sm font-bold border-2 border-yellow-300 bg-yellow-50 text-yellow-800">
                          🧩 Order Type: {currentOrder.orderType === 'GROUP' ? 'Group' : 'Individual'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    <div className="flex flex-col">
                      <label className="text-sm font-bold text-yellow-800 mb-2">📞 Order People Contact</label>
                      <input
                        type="tel"
                        value={currentOrder.orderPeopleContact || ''}
                        onChange={(e) => handleOrderFieldChange('orderPeopleContact', e.target.value)}
                        className="px-4 py-3 border-2 border-yellow-200 rounded-2xl focus:ring-4 focus:ring-yellow-200 focus:border-yellow-400 w-64 shadow-lg transition-all duration-200"
                        placeholder="WhatsApp Number"
                        disabled={currentOrder.isPlaced}
                      />
                    </div>
                    {currentOrder.isPlaced && (
                      <div className="flex flex-col">
                        <label className="text-sm font-bold text-yellow-800 mb-2">📊 Order Status</label>
                        <select
                          value={currentOrder.orderStatus}
                          onChange={(e) => updateOrderStatus(e.target.value)}
                          className="px-4 py-3 border-2 border-yellow-200 rounded-2xl focus:ring-4 focus:ring-yellow-200 focus:border-yellow-400 shadow-lg transition-all duration-200"
                        >
                          <option value={ORDER_STATUS.IN_PROGRESS}>Work in Progress</option>
                          <option value={ORDER_STATUS.DELAYED}>Work in Delay</option>
                          <option value={ORDER_STATUS.COMPLETED}>Work Completed</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Customer Information */}
                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-2xl p-6 mb-8 border border-yellow-200">
                  <h3 className="text-xl font-bold text-yellow-800 mb-6 flex items-center gap-2">
                    👤 Customer Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-bold text-yellow-800 mb-2">📝 Customer Name</label>
                      <input
                        type="text"
                        value={currentOrder.customer?.name || ''}
                        onChange={(e) => handleCustomerChange('name', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-yellow-200 rounded-2xl focus:ring-4 focus:ring-yellow-200 focus:border-yellow-400 shadow-lg transition-all duration-200"
                        placeholder="Enter customer name"
                        disabled={currentOrder.isPlaced}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-yellow-800 mb-2">📞 Contact Number</label>
                      <input
                        type="text"
                        value={currentOrder.customer?.contact || ''}
                        onChange={(e) => handleCustomerChange('contact', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-yellow-200 rounded-2xl focus:ring-4 focus:ring-yellow-200 focus:border-yellow-400 shadow-lg transition-all duration-200"
                        placeholder="Phone number"
                        disabled={currentOrder.isPlaced}
                      />
                    </div>
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-bold text-yellow-800 mb-2">🏠 Customer Address</label>
                    <textarea
                      value={currentOrder.customer?.address || ''}
                      onChange={(e) => handleCustomerChange('address', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-yellow-200 rounded-2xl focus:ring-4 focus:ring-yellow-200 focus:border-yellow-400 shadow-lg transition-all duration-200"
                      placeholder="Enter complete address"
                      rows="3"
                      disabled={currentOrder.isPlaced}
                    />
                  </div>
                </div>

                {/* Order Details */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 mb-8 border border-amber-200">
                  <h3 className="text-xl font-bold text-amber-800 mb-6 flex items-center gap-2">
                    📊 Order Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-amber-800 mb-2">⚖️ Total Weight</label>
                      <input
                        type="text"
                        value={currentOrder.totalWeight || ''}
                        onChange={(e) => handleOrderFieldChange('totalWeight', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-amber-200 rounded-2xl focus:ring-4 focus:ring-amber-200 focus:border-amber-400 shadow-lg transition-all duration-200"
                        placeholder="Weight in grams"
                        disabled={currentOrder.isPlaced}
                      />
                    </div>
                    {/* Advance Type */}
                    <div>
                      <label className="block text-sm font-bold text-amber-800 mb-2">💳 Advance Type</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          className={`px-3 py-2 rounded-xl border-2 ${currentOrder.advanceType === 'AMOUNT' ? 'border-green-500 bg-green-50' : 'border-amber-200 bg-white'} text-sm font-bold`}
                          onClick={() => updateOrder(activeTab, { advanceType: 'AMOUNT' })}
                          disabled={currentOrder.isPlaced}
                        >
                          ₹ Amount
                        </button>
                        <button
                          type="button"
                          className={`px-3 py-2 rounded-xl border-2 ${currentOrder.advanceType === 'GOLD' ? 'border-yellow-500 bg-yellow-50' : 'border-amber-200 bg-white'} text-sm font-bold`}
                          onClick={() => updateOrder(activeTab, { advanceType: 'GOLD' })}
                          disabled={currentOrder.isPlaced}
                        >
                          🥇 Gold
                        </button>
                      </div>
                    </div>
                    {currentOrder.advanceType === 'AMOUNT' ? (
                      <>
                        <div>
                          <label className="block text-sm font-bold text-amber-800 mb-2">💰 Advance Amount (₹)</label>
                          <input
                            type="number"
                            value={currentOrder.advance || ''}
                            onChange={(e) => handleOrderFieldChange('advance', e.target.value)}
                            className="w-full px-4 py-3 border-2 border-amber-200 rounded-2xl focus:ring-4 focus:ring-amber-200 focus:border-amber-400 shadow-lg transition-all duration-200"
                            placeholder="Advance payment in rupees"
                            disabled={currentOrder.isPlaced}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-amber-800 mb-2">💱 Rate (₹/g)</label>
                          <input
                            type="number"
                            value={currentOrder.advanceAmountRate || ''}
                            onChange={(e) => handleOrderFieldChange('advanceAmountRate', e.target.value)}
                            className="w-full px-4 py-3 border-2 border-amber-200 rounded-2xl focus:ring-4 focus:ring-amber-200 focus:border-amber-400 shadow-lg transition-all duration-200"
                            placeholder="Enter rate per gram"
                            disabled={currentOrder.isPlaced}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-sm font-bold text-amber-800 mb-2">🥇 Advance Gold (gms)</label>
                          <input
                            type="number"
                            value={currentOrder.advanceGoldGms || ''}
                            onChange={(e) => handleOrderFieldChange('advanceGoldGms', e.target.value)}
                            className="w-full px-4 py-3 border-2 border-amber-200 rounded-2xl focus:ring-4 focus:ring-amber-200 focus:border-amber-400 shadow-lg transition-all duration-200"
                            placeholder="Gold in grams"
                            disabled={currentOrder.isPlaced}
                          />
                        </div>
                      </>
                    )}
                    <div>
                      <label className="block text-sm font-bold text-amber-800 mb-2">📅 Delivery Date</label>
                      <input
                        type="date"
                        value={currentOrder.requestedDeliveryDate || ''}
                        onChange={(e) => handleOrderFieldChange('requestedDeliveryDate', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-amber-200 rounded-2xl focus:ring-4 focus:ring-amber-200 focus:border-amber-400 shadow-lg transition-all duration-200"
                        disabled={currentOrder.isPlaced}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-amber-800 mb-2">📦 Order Quantity (items)</label>
                      <input
                        type="number"
                        value={currentOrder.orderWeightage || ''}
                        onChange={(e) => adjustItemsCount(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-amber-200 rounded-2xl focus:ring-4 focus:ring-amber-200 focus:border-amber-400 shadow-lg transition-all duration-200"
                        placeholder="Number of items"
                        disabled={currentOrder.isPlaced}
                      />
                    </div>
                  </div>
                  {currentOrder.advanceType === 'GOLD' && (
                    <div className="mt-4 bg-white rounded-xl p-4 border border-amber-200">
                      <div className="text-sm text-amber-800 font-bold">Estimated Advance Value: ₹{((parseFloat(currentOrder.advanceGoldGms) || 0) * (parseFloat(currentOrder.advanceGoldRate) || 0)).toFixed(2)}</div>
                    </div>
                  )}
                </div>
                {/* Items Table */}
                <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl p-6 mb-8 border border-orange-200">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-orange-800 flex items-center gap-2">
                      💎 Order Items
                    </h3>
                    {!currentOrder.isPlaced && (
                      <button
                        onClick={addItem}
                        className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl hover:from-green-600 hover:to-emerald-600 transition-all duration-200 font-bold shadow-lg transform hover:scale-105"
                      >
                        <FaPlus className="inline mr-2" />
                        ➕ Add Item
                      </button>
                    )}
                  </div>

                  <div className="overflow-x-auto rounded-2xl shadow-lg">
                    <table className="w-full border border-orange-200 rounded-2xl overflow-hidden">
                      <thead className="bg-gradient-to-r from-orange-100 to-red-100">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-bold text-orange-800">📝 S.No</th>
                          <th className="px-6 py-4 text-left text-sm font-bold text-orange-800">💎 Ornament Type</th>
                          <th className="px-6 py-4 text-left text-sm font-bold text-orange-800">⚖️ Weight (gms)</th>
                          <th className="px-6 py-4 text-left text-sm font-bold text-orange-800">💰 Advance</th>
                          <th className="px-6 py-4 text-left text-sm font-bold text-orange-800">📝 Customer Notes</th>
                          <th className="px-6 py-4 text-left text-sm font-bold text-orange-800">📸 Photo</th>
                          {currentOrder.isPlaced && (
                            <>
                              <th className="px-6 py-4 text-left text-sm font-bold text-orange-800">📊 Status</th>
                              <th className="px-6 py-4 text-left text-sm font-bold text-orange-800">🏭 Item Status</th>
                              <th className="px-6 py-4 text-left text-sm font-bold text-orange-800">📝 Notes</th>
                              <th className="px-6 py-4 text-left text-sm font-bold text-orange-800">✅ Submit</th>
                            </>
                          )}
                          {!currentOrder.isPlaced && (
                            <th className="px-6 py-4 text-left text-sm font-bold text-orange-800">⚡ Actions</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-orange-100 bg-white">
                        {currentOrder.items?.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 transition-all duration-200">
                            <td className="px-6 py-4 text-sm font-semibold text-gray-800">{item.sno}</td>
                            <td className="px-6 py-4">
                              <select
                                value={item.ornamentType}
                                onChange={(e) => handleItemChange(idx, 'ornamentType', e.target.value)}
                                className="w-full px-3 py-2 border-2 border-orange-200 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-400 text-sm shadow-lg transition-all duration-200"
                                disabled={currentOrder.isPlaced}
                              >
                                {ORNAMENT_TYPES.map(type => (
                                  <option key={type} value={type}>{type}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-6 py-4">
                              <input
                                type="text"
                                value={item.weight}
                                onChange={(e) => handleItemChange(idx, 'weight', e.target.value)}
                                className="w-full px-3 py-2 border-2 border-orange-200 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-400 text-sm shadow-lg transition-all duration-200"
                                placeholder="Weight"
                                disabled={currentOrder.isPlaced}
                              />
                            </td>
                            <td className="px-6 py-4">
                              <input
                                type="text"
                                value={item.advance}
                                onChange={(e) => handleItemChange(idx, 'advance', e.target.value)}
                                className="w-full px-3 py-2 border-2 border-orange-200 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-400 text-sm shadow-lg transition-all duration-200"
                                placeholder="Advance"
                                disabled={currentOrder.isPlaced}
                              />
                            </td>
                            <td className="px-6 py-4">
                              <textarea
                                value={item.customerNotes || ''}
                                onChange={(e) => handleItemChange(idx, 'customerNotes', e.target.value)}
                                className="w-full px-3 py-2 border-2 border-orange-200 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-400 text-sm resize-none shadow-lg transition-all duration-200"
                                placeholder="Customer Notes"
                                rows="2"
                                disabled={currentOrder.isPlaced}
                              />
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-2">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onload = (event) => {
                                        handleItemChange(idx, 'photo', {
                                          file: file,
                                          url: event.target.result,
                                          name: file.name
                                        });
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                  className="w-full text-xs border border-orange-200 rounded-lg p-1"
                                  disabled={currentOrder.isPlaced}
                                />
                                {item.photo && (
                                  <div className="flex items-center gap-2">
                                    <img 
                                      src={item.photo.url} 
                                      alt="Item photo" 
                                      className="w-10 h-10 object-cover rounded-xl cursor-pointer shadow-lg border-2 border-orange-200 hover:border-orange-400 transition-all duration-200"
                                      onClick={() => {
                                        // Open image in modal or new tab
                                        window.open(item.photo.url, '_blank');
                                      }}
                                    />
                                    <span className="text-xs text-gray-600 truncate max-w-20 font-medium" title={item.photo.name}>
                                      {item.photo.name}
                                    </span>
                                    {!currentOrder.isPlaced && (
                                      <button
                                        onClick={() => handleItemChange(idx, 'photo', null)}
                                        className="text-red-500 hover:text-red-700 text-sm font-bold bg-red-100 hover:bg-red-200 rounded-full w-6 h-6 flex items-center justify-center transition-all duration-200"
                                      >
                                        ×
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                            {currentOrder.isPlaced && (
                              <>
                                <td className="px-6 py-4">
                                  <select
                                    value={item.status}
                                    onChange={(e) => handleItemChange(idx, 'status', e.target.value)}
                                    className="w-full px-3 py-2 border-2 border-orange-200 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-400 text-sm shadow-lg transition-all duration-200"
                                  >
                                    <option value={ORDER_STATUS.PENDING}>Pending</option>
                                    <option value={ORDER_STATUS.IN_PROGRESS}>In Progress</option>
                                    <option value={ORDER_STATUS.DELAYED}>Delayed</option>
                                    <option value={ORDER_STATUS.COMPLETED}>Completed</option>
                                  </select>
                                </td>
                                <td className="px-6 py-4">
                                  <select
                                    value={item.itemStatus}
                                    onChange={(e) => handleItemChange(idx, 'itemStatus', e.target.value)}
                                    className="w-full px-3 py-2 border-2 border-orange-200 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-400 text-sm shadow-lg transition-all duration-200"
                                  >
                                    <option value={ITEM_STATUS.WITH_WORKER}>Items with Worker</option>
                                    <option value={ITEM_STATUS.WITH_DEPARTMENT}>Items with Department</option>
                                    <option value={ITEM_STATUS.DELIVERED}>Items delivered to customer</option>
                                  </select>
                                </td>
                                <td className="px-6 py-4">
                                  <textarea
                                    value={item.notes || ''}
                                    onChange={(e) => handleItemChange(idx, 'notes', e.target.value)}
                                    className="w-full px-3 py-2 border-2 border-orange-200 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-400 text-sm resize-none shadow-lg transition-all duration-200"
                                    placeholder="Internal Notes"
                                    rows="2"
                                  />
                                </td>
                                <td className="px-6 py-4">
                                  <button
                                    onClick={() => {
                                      // Mark item as submitted
                                      handleItemChange(idx, 'isSubmitted', !item.isSubmitted);
                                    }}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 shadow-lg transform hover:scale-105 ${
                                      item.isSubmitted 
                                        ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 hover:from-green-200 hover:to-emerald-200 border border-green-300' 
                                        : 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 hover:from-blue-200 hover:to-cyan-200 border border-blue-300'
                                    }`}
                                  >
                                    {item.isSubmitted ? '✅ Submitted' : '📤 Submit'}
                                  </button>
                                </td>
                              </>
                            )}
                            {!currentOrder.isPlaced && (
                              <td className="px-6 py-4">
                                <button
                                  onClick={() => removeItem(idx)}
                                  className="px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 text-sm font-bold shadow-lg transform hover:scale-105"
                                  disabled={currentOrder.items.length === 1}
                                >
                                  <FaTrash />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Daily Workflow Checklist */}
                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-2xl p-6 mb-8 border border-yellow-200">
                  <h3 className="text-xl font-bold text-yellow-800 mb-6">🗓️ Daily Workflow</h3>
                  {/* Day 1 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-yellow-900 w-16">Day 1</span>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="radio" name="d1" checked={currentOrder.dailyChecklist?.day1?.status === 'FORWARDED'} onChange={() => setChecklist('day1', 'status', 'FORWARDED')} disabled={currentOrder.isPlaced && false} />
                        Order forwarded to Department
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="radio" name="d1" checked={currentOrder.dailyChecklist?.day1?.status === 'NOT_FORWARDED'} onChange={() => setChecklist('day1', 'status', 'NOT_FORWARDED')} />
                        Not forwarded
                      </label>
                    </div>
                    <input className="px-3 py-2 border-2 border-yellow-200 rounded-xl text-sm" placeholder="Note" value={currentOrder.dailyChecklist?.day1?.note || ''} onChange={e => setChecklist('day1', 'note', e.target.value)} />
                  </div>
                  {/* Day 2 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-yellow-900 w-16">Day 2</span>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="radio" name="d2" checked={currentOrder.dailyChecklist?.day2?.status === 'PLACED'} onChange={() => setChecklist('day2', 'status', 'PLACED')} />
                        Order placed
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="radio" name="d2" checked={currentOrder.dailyChecklist?.day2?.status === 'NOT_PLACED'} onChange={() => setChecklist('day2', 'status', 'NOT_PLACED')} />
                        Order not placed
                      </label>
                    </div>
                    <input className="px-3 py-2 border-2 border-yellow-200 rounded-xl text-sm" placeholder="Note" value={currentOrder.dailyChecklist?.day2?.note || ''} onChange={e => setChecklist('day2', 'note', e.target.value)} />
                  </div>
                  {/* Day 3 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-yellow-900 w-16">Day 3</span>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="radio" name="d3" checked={currentOrder.dailyChecklist?.day3?.status === 'INITIATED'} onChange={() => setChecklist('day3', 'status', 'INITIATED')} />
                        Work initiated
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="radio" name="d3" checked={currentOrder.dailyChecklist?.day3?.status === 'NOT_INITIATED'} onChange={() => setChecklist('day3', 'status', 'NOT_INITIATED')} />
                        Not initiated
                      </label>
                    </div>
                    <input className="px-3 py-2 border-2 border-yellow-200 rounded-xl text-sm" placeholder="Note" value={currentOrder.dailyChecklist?.day3?.note || ''} onChange={e => setChecklist('day3', 'note', e.target.value)} />
                  </div>
                  {/* Day 4 Verification */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-4">
                      <span className="font-semibold text-yellow-900 w-16">Day 4</span>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={currentOrder.dailyChecklist?.day4?.deptVerified || false} onChange={e => setChecklist('day4', 'deptVerified', e.target.checked)} />
                        Dept verified
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={currentOrder.dailyChecklist?.day4?.workerVerified || false} onChange={e => setChecklist('day4', 'workerVerified', e.target.checked)} />
                        Worker verified
                      </label>
                    </div>
                    <input className="px-3 py-2 border-2 border-yellow-200 rounded-xl text-sm" placeholder="Note" value={currentOrder.dailyChecklist?.day4?.note || ''} onChange={e => setChecklist('day4', 'note', e.target.value)} />
                  </div>
                  {/* Day 5/6 Status */}
                  {['day5','day6'].map((dayKey, i) => (
                    <div key={dayKey} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-yellow-900 w-16">Day {i+5}</span>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="radio" name={`${dayKey}`} checked={currentOrder.dailyChecklist?.[dayKey]?.status === 'IN_PROGRESS'} onChange={() => setChecklist(dayKey, 'status', 'IN_PROGRESS')} />
                          Work in progress
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="radio" name={`${dayKey}`} checked={currentOrder.dailyChecklist?.[dayKey]?.status === 'DELAY'} onChange={() => setChecklist(dayKey, 'status', 'DELAY')} />
                          Work in delay
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="radio" name={`${dayKey}`} checked={currentOrder.dailyChecklist?.[dayKey]?.status === 'COMPLETED'} onChange={() => setChecklist(dayKey, 'status', 'COMPLETED')} />
                          Work completed
                        </label>
                      </div>
                      <input className="px-3 py-2 border-2 border-yellow-200 rounded-xl text-sm" placeholder="Note" value={currentOrder.dailyChecklist?.[dayKey]?.note || ''} onChange={e => setChecklist(dayKey, 'note', e.target.value)} />
                    </div>
                  ))}
                  {/* Day 7/8 Location */}
                  {['day7','day8'].map((dayKey, i) => (
                    <div key={dayKey} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-yellow-900 w-16">Day {i+7}</span>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="radio" name={`${dayKey}`} checked={currentOrder.dailyChecklist?.[dayKey]?.location === 'WORKER'} onChange={() => setChecklist(dayKey, 'location', 'WORKER')} />
                          Item with worker
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="radio" name={`${dayKey}`} checked={currentOrder.dailyChecklist?.[dayKey]?.location === 'DEPARTMENT'} onChange={() => setChecklist(dayKey, 'location', 'DEPARTMENT')} />
                          Item with department
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="radio" name={`${dayKey}`} checked={currentOrder.dailyChecklist?.[dayKey]?.location === 'DELIVERED'} onChange={() => setChecklist(dayKey, 'location', 'DELIVERED')} />
                          Item delivered to customer
                        </label>
                      </div>
                      <input className="px-3 py-2 border-2 border-yellow-200 rounded-xl text-sm" placeholder="Note" value={currentOrder.dailyChecklist?.[dayKey]?.note || ''} onChange={e => setChecklist(dayKey, 'note', e.target.value)} />
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-6 justify-end">
                  {!currentOrder.isPlaced ? (
                    <div className="flex flex-col items-end gap-4">
                      {!currentOrder.orderPeopleContact && (
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                          <p className="text-sm text-red-700 font-semibold flex items-center gap-2">
                            ⚠️ Order People Contact is required to place order
                          </p>
                        </div>
                      )}
                      <button
                        onClick={placeOrder}
                        disabled={!currentOrder.orderPeopleContact}
                        className={`px-8 py-4 rounded-2xl transition-all duration-200 font-bold flex items-center gap-3 text-lg shadow-2xl transform hover:scale-105 ${
                          currentOrder.orderPeopleContact
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <FaWhatsapp className="text-xl" />
                        📤 Place Order & Send to WhatsApp
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-4 flex-wrap items-center">
                      {currentOrder.reminderActive && (
                        <div className="flex items-center gap-4 bg-orange-50 border border-orange-200 rounded-2xl p-4">
                          <span className="text-sm text-orange-700 font-bold flex items-center gap-2">
                            🔔 Sending reminders ({currentOrder.reminderCount || 0}/10)
                          </span>
                          <button
                            onClick={() => stopReminderNotifications(currentOrder.orderId)}
                            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl text-sm hover:from-orange-600 hover:to-red-600 transition-all duration-200 font-bold shadow-lg transform hover:scale-105"
                          >
                            🛑 Stop Reminders
                          </button>
                        </div>
                      )}
                    <button
                      onClick={() => {
                        const confirmDelete = window.confirm(
                          `Are you sure you want to mark Order ${currentOrder.orderId} as completed?\n\nThis will permanently delete the order from the database and stop any active reminders.`
                        );
                        
                        if (confirmDelete) {
                          // Clear any active reminder for this order
                          if (reminderIntervals[currentOrder.orderId]) {
                            clearInterval(reminderIntervals[currentOrder.orderId]);
                            setReminderIntervals(prev => {
                              const newIntervals = { ...prev };
                              delete newIntervals[currentOrder.orderId];
                              return newIntervals;
                            });
                          }
                          
                          // Remove the order from the database
                          deleteDoc(doc(db, 'orders', currentOrder.orderId)).catch(() => {});
                          const orderId = currentOrder.orderId;
                          const newOrders = orders.filter(order => order.orderId !== orderId);
                          setOrders(newOrders);
                          // Reset active tab if needed
                          if (newOrders.length === 0) {
                            // If no orders left, create a new empty order
                            setOrders([{
                              orderId: 'ORD-00001',
                              customer: { name: '', contact: '', address: '' },
                              subQuantity: '',
                              totalWeight: '',
                              advance: '',
                              requestedDeliveryDate: '',
                              orderWeightage: '',
                              orderPeopleContact: '',
                              items: [
                                { 
                                  sno: 1,
                                  ornamentType: 'Necklace', 
                                  weight: '', 
                                  advance: '', 
                                  customerNotes: '',
                                  photo: null,
                                  status: ORDER_STATUS.PENDING,
                                  itemStatus: ITEM_STATUS.WITH_WORKER,
                                  notes: '',
                                  isSubmitted: false
                                },
                              ],
                              orderStatus: ORDER_STATUS.PENDING,
                              isPlaced: false,
                              reminderActive: false,
                              reminderCount: 0,
                            }]);
                            setActiveTab(0);
                          } else {
                            // Adjust active tab to stay within bounds
                            if (activeTab >= newOrders.length) {
                              setActiveTab(newOrders.length - 1);
                            }
                          }
                          
                          alert(`Order ${orderId} has been completed and removed from the database.`);
                        }
                      }}
                        className="px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl hover:from-red-600 hover:to-red-700 transition-all duration-200 font-bold flex items-center gap-3 text-lg shadow-2xl transform hover:scale-105"
                      >
                        ✅ Order Completed
                      </button>
                    </div>
                  )}
                </div>
              </div>
              )}
            </>
          )}

          {/* No Orders Message */}
          {!showTable && filteredOrders.length === 0 && (
            <div className="text-center py-16">
              <div className="bg-white rounded-3xl shadow-2xl border border-yellow-100 p-12 max-w-md mx-auto">
                <div className="text-6xl mb-6">📋</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">No Orders Found</h3>
                <p className="text-gray-600 mb-8">Start by creating your first order to manage customer requests</p>
                <button
                  onClick={addTab}
                  className="px-8 py-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-2xl hover:from-amber-600 hover:to-yellow-600 transition-all duration-200 font-bold text-lg shadow-2xl transform hover:scale-105"
                >
                  ➕ Create New Order
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
export default Ordermanage;