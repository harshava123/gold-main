import { useEffect, useState } from 'react';
import Adminheader from './Adminheader';
import { db } from '../../../firebase';
import { collection, getDocs, query, orderBy, where, deleteDoc, doc, Timestamp, addDoc, serverTimestamp } from 'firebase/firestore';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { useStore } from './StoreContext';
import { useNavigate } from 'react-router-dom';

function Reports() {
  const [tab, setTab] = useState('EXCHANGES');
  const [exchanges, setExchanges] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [sales, setSales] = useState([]);
  const [cashMovements, setCashMovements] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    typeFilter: 'ALL',
    sourceFilter: 'ALL',
    monthFilter: 'ALL',
    startDate: '',
    endDate: ''
  });
  const [columnVisibility, setColumnVisibility] = useState({
    date: true,
    employee: false, // Initially hidden
    type: true,
    source: true,
    name: true,
    weight: true,
    touch: true,
    less: true,
    fine: true,
    amount: true,
    dropdownOpen: false
  });
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [isCleaning, setIsCleaning] = useState(false);
  const [showReminder, setShowReminder] = useState(false);

  const { selectedStore } = useStore();
  const navigate = useNavigate();

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

  const handleManualCleanup = async () => {
    await cleanupOldData(true);
    
    // Mark reminder as completed
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    localStorage.setItem('lastDataCleanupReminder', nextMonth.toISOString());
    setShowReminder(false);
  };

  // Navigate to admin if no store is selected
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

  useEffect(() => {
    const fetchData = async () => {
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
      
      setLoading(true);
      try {
        // Helper function to fetch data with fallback
        const fetchWithFallback = async (collectionName) => {
          try {
            // Try optimized query first
            const q = query(
              collection(db, collectionName), 
              where('storeId', '==', selectedStore.id),
              orderBy('createdAt', 'desc')
            );
            const snap = await getDocs(q);
            return snap.docs.map(doc => doc.data());
          } catch (error) {
            if (error.message.includes('index')) {
              // Fallback to client-side sorting if index not ready
              console.log(`Index not ready for ${collectionName}, using client-side sorting`);
              const q = query(
                collection(db, collectionName), 
                where('storeId', '==', selectedStore.id)
              );
              const snap = await getDocs(q);
              const data = snap.docs.map(doc => doc.data());
              // Sort in memory
              data.sort((a, b) => {
                const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt) || new Date(0);
                const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt) || new Date(0);
                return dateB - dateA;
              });
              return data;
            }
            throw error;
          }
        };

        // Fetch all data with fallback
        const [exchangesData, purchasesData, salesData, cashData, tokensData, ordersData] = await Promise.all([
          fetchWithFallback('exchanges'),
          fetchWithFallback('purchases'),
          fetchWithFallback('sales'),
          fetchWithFallback('cashmovements'),
          fetchWithFallback('tokens'),
          fetchWithFallback('orders')
        ]);

        setExchanges(exchangesData);
        setPurchases(purchasesData);
        setSales(salesData);
        setCashMovements(cashData);
        setTokens(tokensData);
        setOrders(ordersData);
      } catch (error) {
        console.error('Error fetching data:', error);
        showToast('Error loading reports data', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedStore]);

  // Helper function to show toast messages
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Helper function to check if date is within range
  const isDateInRange = (dateStr, start, end) => {
    if (!dateStr) return true;
    
    // Parse date string (assuming format like "DD/MM/YYYY" or "MM/DD/YYYY")
    let date;
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      // Try different date formats
      if (parts.length === 3) {
        // Try DD/MM/YYYY format first
        date = new Date(parts[2], parts[1] - 1, parts[0]);
        if (isNaN(date.getTime())) {
          // Try MM/DD/YYYY format
          date = new Date(parts[2], parts[0] - 1, parts[1]);
        }
      }
    } else {
      date = new Date(dateStr);
    }
    
    if (isNaN(date.getTime())) return true; // If date parsing fails, show the record
    
    const startDate = start ? new Date(start) : null;
    const endDate = end ? new Date(end) : null;
    
    if (startDate && date < startDate) return false;
    if (endDate && date > endDate) return false;
    return true;
  };

  // Apply filters function
  const applyFilters = () => {
    setAppliedFilters({
      search,
      typeFilter,
      sourceFilter,
      monthFilter,
      startDate,
      endDate
    });
    showToast('✅ Filters applied successfully!', 'success');
  };

  // Helper function to check if date matches month filter
  const isDateInMonth = (dateStr, monthFilter) => {
    if (monthFilter === 'ALL' || !dateStr) return true;
    if (monthFilter === 'LAST_YEAR') {
      const date = new Date(dateStr);
      const currentYear = new Date().getFullYear();
      return date.getFullYear() === currentYear - 1;
    }
    
    // Parse date string (assuming format like "DD/MM/YYYY" or "MM/DD/YYYY")
    let date;
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      // Try different date formats
      if (parts.length === 3) {
        // Try DD/MM/YYYY format first
        date = new Date(parts[2], parts[1] - 1, parts[0]);
        if (isNaN(date.getTime())) {
          // Try MM/DD/YYYY format
          date = new Date(parts[2], parts[0] - 1, parts[1]);
        }
      }
    } else {
      date = new Date(dateStr);
    }
    
    if (isNaN(date.getTime())) return true; // If date parsing fails, show the record
    
    const month = date.getMonth() + 1; // getMonth() returns 0-11
    const year = date.getFullYear();
    const [filterMonth, filterYear] = monthFilter.split('-');
    return month === parseInt(filterMonth) && year === parseInt(filterYear);
  };

  // Generate dynamic month options based on current date
  const generateMonthOptions = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const options = [];
    
    // Add "All Months" option
    options.push({ value: 'ALL', label: 'All Months' });
    
    // Add "Last Year" option
    options.push({ value: 'LAST_YEAR', label: 'Last Year' });
    
    // Add current year months (only up to current month, not future months)
    for (let month = 1; month <= currentMonth; month++) {
      const monthName = new Date(currentYear, month - 1).toLocaleString('default', { month: 'long' });
      options.push({ 
        value: `${month}-${currentYear}`, 
        label: `${monthName} ${currentYear}` 
      });
    }
    
    return options;
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (columnVisibility.dropdownOpen && !event.target.closest('.column-dropdown')) {
        setColumnVisibility(prev => ({ ...prev, dropdownOpen: false }));
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [columnVisibility.dropdownOpen]);

  // Filtering logic for exchanges
  const filteredEx = exchanges.filter(ex => {
    const matchesSearch =
      appliedFilters.search === '' ||
      Object.values(ex)
        .join(' ')
        .toLowerCase()
        .includes(appliedFilters.search.toLowerCase());
    const matchesType = appliedFilters.typeFilter === 'ALL' || ex.type === appliedFilters.typeFilter;
    const matchesSource = appliedFilters.sourceFilter === 'ALL' || ex.source === appliedFilters.sourceFilter;
    const matchesMonth = isDateInMonth(ex.date, appliedFilters.monthFilter);
    const matchesDateRange = isDateInRange(ex.date, appliedFilters.startDate, appliedFilters.endDate);
    return matchesSearch && matchesType && matchesSource && matchesMonth && matchesDateRange;
  });

  // Filtering logic for purchases
  const filteredPur = purchases.filter(pur => {
    const matchesSearch =
      appliedFilters.search === '' ||
      Object.values(pur)
        .join(' ')
        .toLowerCase()
        .includes(appliedFilters.search.toLowerCase());
    const matchesType = appliedFilters.typeFilter === 'ALL' || pur.mainType === appliedFilters.typeFilter;
    const matchesSource = appliedFilters.sourceFilter === 'ALL' || pur.subType === appliedFilters.sourceFilter;
    const matchesMonth = isDateInMonth(pur.date, appliedFilters.monthFilter);
    const matchesDateRange = isDateInRange(pur.date, appliedFilters.startDate, appliedFilters.endDate);
    return matchesSearch && matchesType && matchesSource && matchesMonth && matchesDateRange;
  });

  // Filtering logic for sales
  const filteredSales = sales.filter(sale => {
    const matchesSearch =
      appliedFilters.search === '' ||
      Object.values(sale)
        .join(' ')
        .toLowerCase()
        .includes(appliedFilters.search.toLowerCase());
    const matchesType = appliedFilters.typeFilter === 'ALL' || sale.saleType === appliedFilters.typeFilter;
    const matchesSource = appliedFilters.sourceFilter === 'ALL' || sale.source === appliedFilters.sourceFilter;
    const matchesMonth = isDateInMonth(sale.date, appliedFilters.monthFilter);
    const matchesDateRange = isDateInRange(sale.date, appliedFilters.startDate, appliedFilters.endDate);
    return matchesSearch && matchesType && matchesSource && matchesMonth && matchesDateRange;
  });

  // Filtering logic for cash movements
  const filteredCash = cashMovements.filter(mov => {
    const matchesSearch =
      appliedFilters.search === '' ||
      Object.values(mov)
        .join(' ')
        .toLowerCase()
        .includes(appliedFilters.search.toLowerCase());
    const matchesMonth = isDateInMonth(mov.date, appliedFilters.monthFilter);
    const matchesDateRange = isDateInRange(mov.date, appliedFilters.startDate, appliedFilters.endDate);
    return matchesSearch && matchesMonth && matchesDateRange;
  });

  // Filtering logic for tokens
  const filteredTokens = tokens.filter(token => {
    const matchesSearch =
      appliedFilters.search === '' ||
      Object.values(token)
        .join(' ')
        .toLowerCase()
        .includes(appliedFilters.search.toLowerCase());
    const matchesMonth = isDateInMonth(token.date, appliedFilters.monthFilter);
    const matchesDateRange = isDateInRange(token.date, appliedFilters.startDate, appliedFilters.endDate);
    return matchesSearch && matchesMonth && matchesDateRange;
  });

  // Filtering logic for orders (Order Management)
  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      appliedFilters.search === '' ||
      Object.values({
        orderId: order.orderId,
        name: order.customer?.name,
        contact: order.customer?.contact,
        orderType: order.orderType,
        status: order.orderStatus
      })
        .join(' ')
        .toLowerCase()
        .includes(appliedFilters.search.toLowerCase());

    const created = order.createdAt?.toDate?.() || (order.createdAt ? new Date(order.createdAt) : null);
    const dateStr = created ? created.toLocaleDateString('en-GB') : (order.requestedDeliveryDate || '');
    const matchesMonth = isDateInMonth(dateStr, appliedFilters.monthFilter);
    const matchesDateRange = isDateInRange(dateStr, appliedFilters.startDate, appliedFilters.endDate);
    return matchesSearch && matchesMonth && matchesDateRange;
  });

  // Export to Excel for exchanges with professional formatting
  const handleExportExcelEx = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Exchanges Report');
    
    // Add title
    const titleRow = worksheet.getRow(1);
    titleRow.getCell(1).value = `📊 EXCHANGES REPORT - ${selectedStore?.name || 'Unknown Store'}`;
    worksheet.mergeCells(1, 1, 1, 10);
    
    // Style title
    const titleCell = titleRow.getCell(1);
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2F5597' }
    };
    titleCell.font = {
      color: { argb: 'FFFFFFFF' },
      bold: true,
      size: 16
    };
    titleCell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };
    titleCell.border = {
      top: { style: 'medium', color: { argb: 'FF000000' } },
      left: { style: 'medium', color: { argb: 'FF000000' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      right: { style: 'medium', color: { argb: 'FF000000' } }
    };
    
    // Add headers
    const columns = ['Date', 'Employee', 'Type', 'Source', 'Name', 'Weight (gms)', 'Touch (%)', 'Less', 'Fine (gms)', 'Amount'];
    const headerRow = worksheet.getRow(3);
    columns.forEach((col, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = col;
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      cell.font = {
        color: { argb: 'FFFFFFFF' },
        bold: true,
        size: 12
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle'
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });
    
    // Add data rows
    filteredEx.forEach((ex, rowIndex) => {
      const dataRow = worksheet.getRow(4 + rowIndex);
      const rowData = [ex.date, ex.employee, ex.type, ex.source, ex.name, ex.weight, ex.touch, ex.less, ex.fine, ex.amount];
      
      rowData.forEach((value, colIndex) => {
        const cell = dataRow.getCell(colIndex + 1);
        cell.value = value || '';
        
        // Alternating row colors
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: rowIndex % 2 === 1 ? 'FFF2F2F2' : 'FFFFFFFF' }
        };
        cell.alignment = {
          vertical: 'middle'
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });
    });
    
    // Add total row
    const total = filteredEx.reduce((sum, ex) => sum + (parseFloat(ex.amount) || 0), 0);
    const totalRowIndex = 4 + filteredEx.length;
    const totalRow = worksheet.getRow(totalRowIndex);
    
    columns.forEach((col, index) => {
      const cell = totalRow.getCell(index + 1);
      if (index === 8) { // Fine column
        cell.value = 'TOTAL:';
      } else if (index === 9) { // Amount column
        cell.value = total.toFixed(2);
      } else {
        cell.value = '';
      }
      
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9E1F2' }
      };
      cell.font = {
        bold: true,
        size: 11
      };
      cell.alignment = {
        vertical: 'middle'
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });
    
    // Auto-size columns
    worksheet.columns.forEach(column => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(maxLength + 2, 50);
    });
    
    // Save the file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'exchanges_report.xlsx';
    link.click();
    window.URL.revokeObjectURL(url);
    
    // Show success message
    showToast('📊 Exchanges report exported successfully!', 'success');
  };
  // Export to Excel for purchases with professional formatting
  const handleExportExcelPur = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Purchases Report');
    
    // Add title
    const titleRow = worksheet.getRow(1);
    titleRow.getCell(1).value = `💰 PURCHASES REPORT - ${selectedStore?.name || 'Unknown Store'}`;
    worksheet.mergeCells(1, 1, 1, 13);
    
    // Style title
    const titleCell = titleRow.getCell(1);
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2F5597' }
    };
    titleCell.font = {
      color: { argb: 'FFFFFFFF' },
      bold: true,
      size: 16
    };
    titleCell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };
    titleCell.border = {
      top: { style: 'medium', color: { argb: 'FF000000' } },
      left: { style: 'medium', color: { argb: 'FF000000' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      right: { style: 'medium', color: { argb: 'FF000000' } }
    };
    
    // Add headers
    const columns = ['Date', 'Employee', 'Main Type', 'Sub Type', 'Name', 'Weight', 'Touch', 'Less', 'Fine', 'Rate', 'Amount', 'Payment Type', 'Cash Mode'];
    const headerRow = worksheet.getRow(3);
    columns.forEach((col, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = col;
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      cell.font = {
        color: { argb: 'FFFFFFFF' },
        bold: true,
        size: 12
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle'
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });
    
    // Add data rows
    filteredPur.forEach((pur, rowIndex) => {
      const dataRow = worksheet.getRow(4 + rowIndex);
      const rowData = [pur.date, pur.employee, pur.mainType, pur.subType, pur.name, pur.weight, pur.touch, pur.less, pur.fine, pur.rate, pur.amount, pur.paymentType, pur.cashMode];
      
      rowData.forEach((value, colIndex) => {
        const cell = dataRow.getCell(colIndex + 1);
        cell.value = value || '';
        
        // Alternating row colors
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: rowIndex % 2 === 1 ? 'FFF2F2F2' : 'FFFFFFFF' }
        };
        cell.alignment = {
          vertical: 'middle'
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });
    });
    
    // Add total row
    const total = filteredPur.reduce((sum, pur) => sum + (parseFloat(pur.amount) || 0), 0);
    const totalRowIndex = 4 + filteredPur.length;
    const totalRow = worksheet.getRow(totalRowIndex);
    
    columns.forEach((col, index) => {
      const cell = totalRow.getCell(index + 1);
      if (index === 9) { // Rate column
        cell.value = 'TOTAL:';
      } else if (index === 10) { // Amount column
        cell.value = total.toFixed(2);
      } else {
        cell.value = '';
      }
      
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9E1F2' }
      };
      cell.font = {
        bold: true,
        size: 11
      };
      cell.alignment = {
        vertical: 'middle'
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });
    
    // Auto-size columns
    worksheet.columns.forEach(column => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(maxLength + 2, 50);
    });
    
    // Save the file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'purchases_report.xlsx';
    link.click();
    window.URL.revokeObjectURL(url);
    
    // Show success message
    showToast('💰 Purchases report exported successfully!', 'success');
  };
  // Export to PDF for exchanges
  const handleExportPDFEx = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('📊 EXCHANGES REPORT', 14, 20);
    
    // Add subtitle with date
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    
    // Calculate total
    const total = filteredEx.reduce((sum, ex) => sum + (parseFloat(ex.amount) || 0), 0);
    
    const tableColumn = [
      'Date', 'Employee', 'Type', 'Source', 'Name', 'Weight (gms)', 'Touch (%)', 'Less', 'Fine (gms)', 'Amount',
    ];
    const tableRows = filteredEx.map(ex => [
      ex.date || '', 
      ex.employee || '', 
      ex.type || '', 
      ex.source || '', 
      ex.name || '', 
      ex.weight || '', 
      ex.touch || '', 
      ex.less || '', 
      ex.fine || '', 
      ex.amount || ''
    ]);
    
    // Add total row
    if (tableRows.length > 0) {
      tableRows.push(['', '', '', '', '', '', '', '', 'TOTAL:', total.toFixed(2)]);
    }
    
    autoTable(doc, { 
      head: [tableColumn], 
      body: tableRows, 
      startY: 35,
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [47, 85, 151],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      margin: { top: 35 }
    });
    
    doc.save('exchanges_report.pdf');
    
    // Show success message
    showToast('📊 Exchanges PDF exported successfully!', 'success');
  };
  
  // Export to PDF for purchases
  const handleExportPDFPur = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('💰 PURCHASES REPORT', 14, 20);
    
    // Add subtitle with date
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    
    // Calculate total
    const total = filteredPur.reduce((sum, pur) => sum + (parseFloat(pur.amount) || 0), 0);
    
    const tableColumn = [
      'Date', 'Employee', 'Main Type', 'Sub Type', 'Name', 'Weight', 'Touch', 'Less', 'Fine', 'Rate', 'Amount', 'Payment', 'Mode',
    ];
    const tableRows = filteredPur.map(pur => [
      pur.date || '', 
      pur.employee || '', 
      pur.mainType || '', 
      pur.subType || '', 
      pur.name || '', 
      pur.weight || '', 
      pur.touch || '', 
      pur.less || '', 
      pur.fine || '', 
      pur.rate || '', 
      pur.amount || '', 
      pur.paymentType || '', 
      pur.cashMode || ''
    ]);
    
    // Add total row
    if (tableRows.length > 0) {
      tableRows.push(['', '', '', '', '', '', '', '', '', 'TOTAL:', total.toFixed(2), '', '']);
    }
    
    autoTable(doc, { 
      head: [tableColumn], 
      body: tableRows, 
      startY: 35,
      styles: {
        fontSize: 7,
        cellPadding: 1
      },
      headStyles: {
        fillColor: [47, 85, 151],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      margin: { top: 35 }
    });
    
    doc.save('purchases_report.pdf');
    
    // Show success message
    showToast('💰 Purchases PDF exported successfully!', 'success');
  };
  // Export to Excel for sales with professional formatting
  const handleExportExcelSales = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');
    
    // Add title
    const titleRow = worksheet.getRow(1);
    titleRow.getCell(1).value = `🛒 SALES REPORT - ${selectedStore?.name || 'Unknown Store'}`;
    worksheet.mergeCells(1, 1, 1, 9);
    
    // Style title
    const titleCell = titleRow.getCell(1);
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2F5597' }
    };
    titleCell.font = {
      color: { argb: 'FFFFFFFF' },
      bold: true,
      size: 16
    };
    titleCell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };
    titleCell.border = {
      top: { style: 'medium', color: { argb: 'FF000000' } },
      left: { style: 'medium', color: { argb: 'FF000000' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      right: { style: 'medium', color: { argb: 'FF000000' } }
    };
    
    // Add headers
    const columns = ['Date', 'Employee', 'Sale Type', 'Name', 'Weight', 'Rate', 'Amount', 'Mode', 'Source'];
    const headerRow = worksheet.getRow(3);
    columns.forEach((col, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = col;
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      cell.font = {
        color: { argb: 'FFFFFFFF' },
        bold: true,
        size: 12
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle'
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });
    
    // Add data rows
    filteredSales.forEach((sale, rowIndex) => {
      const dataRow = worksheet.getRow(4 + rowIndex);
      const rowData = [sale.date, sale.employee, sale.saleType, sale.name, sale.weight, sale.rate, sale.amount, sale.mode, sale.source];
      
      rowData.forEach((value, colIndex) => {
        const cell = dataRow.getCell(colIndex + 1);
        cell.value = value || '';
        
        // Alternating row colors
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: rowIndex % 2 === 1 ? 'FFF2F2F2' : 'FFFFFFFF' }
        };
        cell.alignment = {
          vertical: 'middle'
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });
    });
    
    // Add total row
    const total = filteredSales.reduce((sum, sale) => sum + (parseFloat(sale.amount) || 0), 0);
    const totalRowIndex = 4 + filteredSales.length;
    const totalRow = worksheet.getRow(totalRowIndex);
    
    columns.forEach((col, index) => {
      const cell = totalRow.getCell(index + 1);
      if (index === 5) { // Rate column
        cell.value = 'TOTAL:';
      } else if (index === 6) { // Amount column
        cell.value = total.toFixed(2);
      } else {
        cell.value = '';
      }
      
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9E1F2' }
      };
      cell.font = {
        bold: true,
        size: 11
      };
      cell.alignment = {
        vertical: 'middle'
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });
    
    // Auto-size columns
    worksheet.columns.forEach(column => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(maxLength + 2, 50);
    });
    
    // Save the file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sales_report.xlsx';
    link.click();
    window.URL.revokeObjectURL(url);
  };
  // Export to PDF for sales
  const handleExportPDFSales = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('🛒 SALES REPORT', 14, 20);
    
    // Add subtitle with date
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    
    // Calculate total
    const total = filteredSales.reduce((sum, sale) => sum + (parseFloat(sale.amount) || 0), 0);
    
    const tableColumn = [
      'Date', 'Employee', 'Type', 'Name', 'Weight', 'Rate', 'Amount', 'Mode', 'Source',
    ];
    const tableRows = filteredSales.map(sale => [
      sale.date || '', 
      sale.employee || '', 
      sale.saleType || '', 
      sale.name || '', 
      sale.weight || '', 
      sale.rate || '', 
      sale.amount || '', 
      sale.mode || '', 
      sale.source || ''
    ]);
    
    // Add total row
    if (tableRows.length > 0) {
      tableRows.push(['', '', '', '', '', 'TOTAL:', total.toFixed(2), '', '']);
    }
    
    autoTable(doc, { 
      head: [tableColumn], 
      body: tableRows, 
      startY: 35,
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [47, 85, 151],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      margin: { top: 35 }
    });
    
    doc.save('sales_report.pdf');
    
    // Show success message
    showToast('🛒 Sales PDF exported successfully!', 'success');
  };
  // Export to Excel for cash movements with professional formatting
  const handleExportExcelCash = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Cash Movements Report');
    
    // Add title
    const titleRow = worksheet.getRow(1);
    titleRow.getCell(1).value = `💵 CASH MOVEMENTS REPORT - ${selectedStore?.name || 'Unknown Store'}`;
    worksheet.mergeCells(1, 1, 1, 6);
    
    // Style title
    const titleCell = titleRow.getCell(1);
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2F5597' }
    };
    titleCell.font = {
      color: { argb: 'FFFFFFFF' },
      bold: true,
      size: 16
    };
    titleCell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };
    titleCell.border = {
      top: { style: 'medium', color: { argb: 'FF000000' } },
      left: { style: 'medium', color: { argb: 'FF000000' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      right: { style: 'medium', color: { argb: 'FF000000' } }
    };
    
    // Add headers
    const columns = ['Date', 'Type', 'Change', 'New Balance', 'Reason', 'By'];
    const headerRow = worksheet.getRow(3);
    columns.forEach((col, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = col;
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      cell.font = {
        color: { argb: 'FFFFFFFF' },
        bold: true,
        size: 12
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle'
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });
    
    // Add data rows
    filteredCash.forEach((mov, rowIndex) => {
      const dataRow = worksheet.getRow(4 + rowIndex);
      const rowData = [mov.date, mov.type, mov.change, mov.newBalance, mov.reason, mov.by];
      
      rowData.forEach((value, colIndex) => {
        const cell = dataRow.getCell(colIndex + 1);
        cell.value = value || '';
        
        // Alternating row colors
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: rowIndex % 2 === 1 ? 'FFF2F2F2' : 'FFFFFFFF' }
        };
        cell.alignment = {
          vertical: 'middle'
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });
    });
    
    // Add total row
    const total = filteredCash.reduce((sum, mov) => sum + (parseFloat(mov.change) || 0), 0);
    const totalRowIndex = 4 + filteredCash.length;
    const totalRow = worksheet.getRow(totalRowIndex);
    
    columns.forEach((col, index) => {
      const cell = totalRow.getCell(index + 1);
      if (index === 1) { // Type column
        cell.value = 'TOTAL:';
      } else if (index === 2) { // Change column
        cell.value = total.toFixed(2);
      } else {
        cell.value = '';
      }
      
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9E1F2' }
      };
      cell.font = {
        bold: true,
        size: 11
      };
      cell.alignment = {
        vertical: 'middle'
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });
    
    // Auto-size columns
    worksheet.columns.forEach(column => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(maxLength + 2, 50);
    });
    
    // Save the file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cash_movements_report.xlsx';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // Export Exchanges and Purchases in a single unified table
  const handleExportExchangesPurchasesCombined = async () => {
    // Suppress Firebase secondary app errors
    const originalError = console.error;
    console.error = (...args) => {
      if (args[0] && args[0].toString().includes('secondaryApp.delete')) {
        return; // Ignore this specific error
      }
      originalError.apply(console, args);
    };
    
    try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Exchanges & Purchases Combined');
    
    // Add title
    const titleRow = worksheet.getRow(1);
    titleRow.getCell(1).value = `📊💰 EXCHANGES & PURCHASES UNIFIED REPORT - ${selectedStore?.name || 'Unknown Store'}`;
    worksheet.mergeCells(1, 1, 1, 14);
    
    // Style title
    const titleCell = titleRow.getCell(1);
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F4E79' }
    };
    titleCell.font = {
      color: { argb: 'FFFFFFFF' },
      bold: true,
      size: 16
    };
    titleCell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };
    titleCell.border = {
      top: { style: 'medium', color: { argb: 'FF000000' } },
      left: { style: 'medium', color: { argb: 'FF000000' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      right: { style: 'medium', color: { argb: 'FF000000' } }
    };
    
    // Create unified column structure
    const columns = [
      'Transaction Type', 'Date', 'Employee', 'Type/Main Type', 'Source/Sub Type', 
      'Name', 'Weight', 'Touch', 'Less', 'Fine', 'Rate', 'Amount', 'Payment Type', 'Cash Mode'
    ];
    
    // Add headers
    const headerRow = worksheet.getRow(3);
    columns.forEach((col, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = col;
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      cell.font = {
        color: { argb: 'FFFFFFFF' },
        bold: true,
        size: 12
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle'
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });
    
    // Combine and transform data
    const combinedData = [];
    
    // Add exchanges data
    exchanges.forEach(ex => {
      combinedData.push({
        transactionType: 'EXCHANGE',
        date: ex.date || '',
        employee: ex.employee || '',
        typeMainType: ex.type || '',
        sourceSubType: ex.source || '',
        name: ex.name || '',
        weight: ex.weight || '',
        touch: ex.touch || '',
        less: ex.less || '',
        fine: ex.fine || '',
        rate: '', // Exchanges don't have rate
        amount: ex.amount || '',
        paymentType: '', // Exchanges don't have payment type
        cashMode: '' // Exchanges don't have cash mode
      });
    });
    
    // Add purchases data
    purchases.forEach(pur => {
      combinedData.push({
        transactionType: 'PURCHASE',
        date: pur.date || '',
        employee: pur.employee || '',
        typeMainType: pur.mainType || '',
        sourceSubType: pur.subType || '',
        name: pur.name || '',
        weight: pur.weight || '',
        touch: pur.touch || '',
        less: pur.less || '',
        fine: pur.fine || '',
        rate: pur.rate || '',
        amount: pur.amount || '',
        paymentType: pur.paymentType || '',
        cashMode: pur.cashMode || ''
      });
    });
    
    // Sort combined data by date (most recent first)
    combinedData.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Add data rows
    combinedData.forEach((item, rowIndex) => {
      const dataRow = worksheet.getRow(4 + rowIndex);
      const rowData = [
        item.transactionType,
        item.date,
        item.employee,
        item.typeMainType,
        item.sourceSubType,
        item.name,
        item.weight,
        item.touch,
        item.less,
        item.fine,
        item.rate,
        item.amount,
        item.paymentType,
        item.cashMode
      ];
      
      rowData.forEach((value, colIndex) => {
        const cell = dataRow.getCell(colIndex + 1);
        cell.value = value || '';
        
        // Color coding based on transaction type
        let bgColor;
        if (item.transactionType === 'EXCHANGE') {
          bgColor = rowIndex % 2 === 1 ? 'FFE6F3FF' : 'FFF0F8FF'; // Light blue shades
        } else {
          bgColor = rowIndex % 2 === 1 ? 'FFE6FFE6' : 'FFF0FFF0'; // Light green shades
        }
        
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: bgColor }
        };
        cell.alignment = {
          vertical: 'middle'
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
        
        // Bold the transaction type column
        if (colIndex === 0) {
          cell.font = { bold: true };
        }
      });
    });
    
    // Calculate totals/counts for ALL columns
    const exchangeData = combinedData.filter(item => item.transactionType === 'EXCHANGE');
    const purchaseData = combinedData.filter(item => item.transactionType === 'PURCHASE');
    
    // Helper function to get unique count for text columns
    const getUniqueCount = (data, field) => {
      const unique = [...new Set(data.map(item => item[field]).filter(val => val && val.toString().trim() !== ''))];
      return unique.length;
    };
    
    // Helper function to get numeric total
    const getNumericTotal = (data, field) => {
      return data.reduce((sum, item) => sum + (parseFloat(item[field]) || 0), 0);
    };
    
    // Calculate totals for all columns
    const totals = {
      transactionType: `${exchangeData.length} EX + ${purchaseData.length} PUR`,
      date: getUniqueCount(combinedData, 'date'),
      employee: getUniqueCount(combinedData, 'employee'),
      typeMainType: getUniqueCount(combinedData, 'typeMainType'),
      sourceSubType: getUniqueCount(combinedData, 'sourceSubType'),
      name: getUniqueCount(combinedData, 'name'),
      weight: getNumericTotal(combinedData, 'weight'),
      touch: getNumericTotal(combinedData, 'touch'),
      less: getNumericTotal(combinedData, 'less'),
      fine: getNumericTotal(combinedData, 'fine'),
      rate: getNumericTotal(combinedData, 'rate'),
      amount: getNumericTotal(combinedData, 'amount'),
      paymentType: getUniqueCount(combinedData, 'paymentType'),
      cashMode: getUniqueCount(combinedData, 'cashMode')
    };
    
    // Calculate separate totals for exchanges
    const exchangeTotals = {
      transactionType: `${exchangeData.length} EXCHANGES`,
      date: getUniqueCount(exchangeData, 'date'),
      employee: getUniqueCount(exchangeData, 'employee'),
      typeMainType: getUniqueCount(exchangeData, 'typeMainType'),
      sourceSubType: getUniqueCount(exchangeData, 'sourceSubType'),
      name: getUniqueCount(exchangeData, 'name'),
      weight: getNumericTotal(exchangeData, 'weight'),
      touch: getNumericTotal(exchangeData, 'touch'),
      less: getNumericTotal(exchangeData, 'less'),
      fine: getNumericTotal(exchangeData, 'fine'),
      rate: 0, // Exchanges don't have rates
      amount: getNumericTotal(exchangeData, 'amount'),
      paymentType: 0, // Exchanges don't have payment types
      cashMode: 0 // Exchanges don't have cash modes
    };
    
    // Calculate separate totals for purchases
    const purchaseTotals = {
      transactionType: `${purchaseData.length} PURCHASES`,
      date: getUniqueCount(purchaseData, 'date'),
      employee: getUniqueCount(purchaseData, 'employee'),
      typeMainType: getUniqueCount(purchaseData, 'typeMainType'),
      sourceSubType: getUniqueCount(purchaseData, 'sourceSubType'),
      name: getUniqueCount(purchaseData, 'name'),
      weight: getNumericTotal(purchaseData, 'weight'),
      touch: getNumericTotal(purchaseData, 'touch'),
      less: getNumericTotal(purchaseData, 'less'),
      fine: getNumericTotal(purchaseData, 'fine'),
      rate: getNumericTotal(purchaseData, 'rate'),
      amount: getNumericTotal(purchaseData, 'amount'),
      paymentType: getUniqueCount(purchaseData, 'paymentType'),
      cashMode: getUniqueCount(purchaseData, 'cashMode')
    };
    
    let currentTotalRow = 4 + combinedData.length;
    
    // Add Exchange Totals Row
    const exchangeTotalRow = worksheet.getRow(currentTotalRow);
    columns.forEach((col, index) => {
      const cell = exchangeTotalRow.getCell(index + 1);
      
      switch(index) {
        case 0: // Transaction Type
          cell.value = exchangeTotals.transactionType;
          break;
        case 1: // Date
          cell.value = `${exchangeTotals.date} unique`;
          break;
        case 2: // Employee
          cell.value = `${exchangeTotals.employee} unique`;
          break;
        case 3: // Type/Main Type
          cell.value = `${exchangeTotals.typeMainType} unique`;
          break;
        case 4: // Source/Sub Type
          cell.value = `${exchangeTotals.sourceSubType} unique`;
          break;
        case 5: // Name
          cell.value = `${exchangeTotals.name} unique`;
          break;
        case 6: // Weight
          cell.value = exchangeTotals.weight.toFixed(2);
          break;
        case 7: // Touch
          cell.value = exchangeTotals.touch.toFixed(2);
          break;
        case 8: // Less
          cell.value = exchangeTotals.less.toFixed(2);
          break;
        case 9: // Fine
          cell.value = exchangeTotals.fine.toFixed(2);
          break;
        case 10: // Rate
          cell.value = '-';
          break;
        case 11: // Amount
          cell.value = exchangeTotals.amount.toFixed(2);
          break;
        case 12: // Payment Type
          cell.value = '-';
          break;
        case 13: // Cash Mode
          cell.value = '-';
          break;
        default:
          cell.value = '';
      }
      
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF5B9BD5' }
      };
      cell.font = {
        color: { argb: 'FFFFFFFF' },
        bold: true,
        size: 11
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle'
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });
    
    currentTotalRow++;
    
    // Add Purchase Totals Row
    const purchaseTotalRow = worksheet.getRow(currentTotalRow);
    columns.forEach((col, index) => {
      const cell = purchaseTotalRow.getCell(index + 1);
      
      switch(index) {
        case 0: // Transaction Type
          cell.value = purchaseTotals.transactionType;
          break;
        case 1: // Date
          cell.value = `${purchaseTotals.date} unique`;
          break;
        case 2: // Employee
          cell.value = `${purchaseTotals.employee} unique`;
          break;
        case 3: // Type/Main Type
          cell.value = `${purchaseTotals.typeMainType} unique`;
          break;
        case 4: // Source/Sub Type
          cell.value = `${purchaseTotals.sourceSubType} unique`;
          break;
        case 5: // Name
          cell.value = `${purchaseTotals.name} unique`;
          break;
        case 6: // Weight
          cell.value = purchaseTotals.weight.toFixed(2);
          break;
        case 7: // Touch
          cell.value = purchaseTotals.touch.toFixed(2);
          break;
        case 8: // Less
          cell.value = purchaseTotals.less.toFixed(2);
          break;
        case 9: // Fine
          cell.value = purchaseTotals.fine.toFixed(2);
          break;
        case 10: // Rate
          cell.value = purchaseTotals.rate.toFixed(2);
          break;
        case 11: // Amount
          cell.value = purchaseTotals.amount.toFixed(2);
          break;
        case 12: // Payment Type
          cell.value = `${purchaseTotals.paymentType} unique`;
          break;
        case 13: // Cash Mode
          cell.value = `${purchaseTotals.cashMode} unique`;
          break;
        default:
          cell.value = '';
      }
      
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF70AD47' }
      };
      cell.font = {
        color: { argb: 'FFFFFFFF' },
        bold: true,
        size: 11
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle'
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });
    
    currentTotalRow++;
    
    // Add Grand Totals Row
    const grandTotalRow = worksheet.getRow(currentTotalRow);
    columns.forEach((col, index) => {
      const cell = grandTotalRow.getCell(index + 1);
      
      switch(index) {
        case 0: // Transaction Type
          cell.value = totals.transactionType;
          break;
        case 1: // Date
          cell.value = `${totals.date} unique`;
          break;
        case 2: // Employee
          cell.value = `${totals.employee} unique`;
          break;
        case 3: // Type/Main Type
          cell.value = `${totals.typeMainType} unique`;
          break;
        case 4: // Source/Sub Type
          cell.value = `${totals.sourceSubType} unique`;
          break;
        case 5: // Name
          cell.value = `${totals.name} unique`;
          break;
        case 6: // Weight
          cell.value = totals.weight.toFixed(2);
          break;
        case 7: // Touch
          cell.value = totals.touch.toFixed(2);
          break;
        case 8: // Less
          cell.value = totals.less.toFixed(2);
          break;
        case 9: // Fine
          cell.value = totals.fine.toFixed(2);
          break;
        case 10: // Rate
          cell.value = totals.rate.toFixed(2);
          break;
        case 11: // Amount
          cell.value = totals.amount.toFixed(2);
          break;
        case 12: // Payment Type
          cell.value = `${totals.paymentType} unique`;
          break;
        case 13: // Cash Mode
          cell.value = `${totals.cashMode} unique`;
          break;
        default:
          cell.value = '';
      }
      
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F4E79' }
      };
      cell.font = {
        color: { argb: 'FFFFFFFF' },
        bold: true,
        size: 12
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle'
      };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'medium', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });
    
    // Add summary info below the table
    const summaryRowIndex = currentTotalRow + 2;
    const summaryRow = worksheet.getRow(summaryRowIndex);
    summaryRow.getCell(1).value = `📊 Exchanges: ${exchanges.length} | 💰 Purchases: ${purchases.length} | ⚖️ Weight: ${totals.weight.toFixed(2)} | 🔥 Touch: ${totals.touch.toFixed(2)} | ➖ Less: ${totals.less.toFixed(2)} | ✨ Fine: ${totals.fine.toFixed(2)} | 💎 Rate: ${totals.rate.toFixed(2)} | 💰 Amount: ₹${totals.amount.toFixed(2)}`;
    worksheet.mergeCells(summaryRowIndex, 1, summaryRowIndex, 14);
    
    const summaryCell = summaryRow.getCell(1);
    summaryCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' }
    };
    summaryCell.font = {
      bold: true,
      size: 11
    };
    summaryCell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };
    summaryCell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
    
    // Auto-size columns
    worksheet.columns.forEach(column => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(maxLength + 2, 50);
    });
    
    // Save the file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'exchanges_purchases_unified_table.xlsx';
    link.click();
    window.URL.revokeObjectURL(url);
    
    // Restore original console.error
    console.error = originalError;
    
    // Show success message
    showToast('📊💰 Exchanges & Purchases report exported successfully!', 'success');
    } catch (error) {
      // Restore original console.error in case of error
      if (typeof originalError !== 'undefined') {
        console.error = originalError;
      }
      console.error('Export error:', error);
      showToast('❌ Failed to export report. Please try again.', 'error');
    }
  };

  // Export all reports to a single Excel sheet with formatted tables using ExcelJS
  const handleExportAllToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Complete Reports Dashboard');
    
    let currentRow = 1;
    
    // Helper function to add a table with formatting
    const addTable = (title, data, columns) => {
      // Add title
      const titleRow = worksheet.getRow(currentRow);
      titleRow.getCell(1).value = title;
      
      // Merge cells for title
      worksheet.mergeCells(currentRow, 1, currentRow, columns.length);
      
      // Style title
      const titleCell = titleRow.getCell(1);
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2F5597' }
      };
      titleCell.font = {
        color: { argb: 'FFFFFFFF' },
        bold: true,
        size: 14
      };
      titleCell.alignment = {
        horizontal: 'center',
        vertical: 'middle'
      };
      titleCell.border = {
        top: { style: 'medium', color: { argb: 'FF000000' } },
        left: { style: 'medium', color: { argb: 'FF000000' } },
        bottom: { style: 'medium', color: { argb: 'FF000000' } },
        right: { style: 'medium', color: { argb: 'FF000000' } }
      };
      
      currentRow += 2;
      
      // Add headers
      const headerRow = worksheet.getRow(currentRow);
      columns.forEach((col, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = col;
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4472C4' }
        };
        cell.font = {
          color: { argb: 'FFFFFFFF' },
          bold: true,
          size: 12
        };
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle'
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });
      
      currentRow++;
      
      // Add data rows
      if (data.length > 0) {
        data.forEach((item, rowIndex) => {
          const dataRow = worksheet.getRow(currentRow + rowIndex);
          columns.forEach((col, colIndex) => {
            const cell = dataRow.getCell(colIndex + 1);
            cell.value = item[col] || '';
            
            // Alternating row colors
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: rowIndex % 2 === 1 ? 'FFF2F2F2' : 'FFFFFFFF' }
            };
            cell.alignment = {
              vertical: 'middle'
            };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FF000000' } },
              left: { style: 'thin', color: { argb: 'FF000000' } },
              bottom: { style: 'thin', color: { argb: 'FF000000' } },
              right: { style: 'thin', color: { argb: 'FF000000' } }
            };
          });
        });
        
        currentRow += data.length;
        
        // Calculate and add total
        const amountColumnIndex = columns.findIndex(col => col.toLowerCase().includes('amount') || col.toLowerCase().includes('change'));
        if (amountColumnIndex !== -1) {
          const total = data.reduce((sum, item) => {
            const amountKey = Object.keys(item).find(key => key.toLowerCase().includes('amount') || key.toLowerCase().includes('change'));
            return sum + (parseFloat(item[amountKey]) || 0);
          }, 0);
          
          const totalRow = worksheet.getRow(currentRow);
          columns.forEach((col, index) => {
            const cell = totalRow.getCell(index + 1);
            if (index === amountColumnIndex - 1) {
              cell.value = 'TOTAL:';
            } else if (index === amountColumnIndex) {
              cell.value = total.toFixed(2);
            } else {
              cell.value = '';
            }
            
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFD9E1F2' }
            };
            cell.font = {
              bold: true,
              size: 11
            };
            cell.alignment = {
              vertical: 'middle'
            };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FF000000' } },
              left: { style: 'thin', color: { argb: 'FF000000' } },
              bottom: { style: 'thin', color: { argb: 'FF000000' } },
              right: { style: 'thin', color: { argb: 'FF000000' } }
            };
          });
          
          currentRow++;
        }
      } else {
        const noDataRow = worksheet.getRow(currentRow);
        noDataRow.getCell(1).value = 'No data available';
        noDataRow.getCell(1).border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
        currentRow++;
      }
      
      currentRow += 2; // Add spacing between tables
    };
    
    // EXCHANGES TABLE
    if (exchanges.length > 0) {
      const exchangeColumns = ['Date', 'Employee', 'Type', 'Source', 'Name', 'Weight (gms)', 'Touch (%)', 'Less', 'Fine (gms)', 'Amount'];
      const exchangeData = exchanges.map(ex => ({
        'Date': ex.date || '',
        'Employee': ex.employee || '',
        'Type': ex.type || '',
        'Source': ex.source || '',
        'Name': ex.name || '',
        'Weight (gms)': ex.weight || '',
        'Touch (%)': ex.touch || '',
        'Less': ex.less || '',
        'Fine (gms)': ex.fine || '',
        'Amount': ex.amount || ''
      }));
      
      addTable('📊 EXCHANGES REPORT', exchangeData, exchangeColumns);
    }
    
    // PURCHASES TABLE
    if (purchases.length > 0) {
      const purchaseColumns = ['Date', 'Employee', 'Main Type', 'Sub Type', 'Name', 'Weight', 'Touch', 'Less', 'Fine', 'Rate', 'Amount', 'Payment Type', 'Cash Mode'];
      const purchaseData = purchases.map(pur => ({
        'Date': pur.date || '',
        'Employee': pur.employee || '',
        'Main Type': pur.mainType || '',
        'Sub Type': pur.subType || '',
        'Name': pur.name || '',
        'Weight': pur.weight || '',
        'Touch': pur.touch || '',
        'Less': pur.less || '',
        'Fine': pur.fine || '',
        'Rate': pur.rate || '',
        'Amount': pur.amount || '',
        'Payment Type': pur.paymentType || '',
        'Cash Mode': pur.cashMode || ''
      }));
      
      addTable('💰 PURCHASES REPORT', purchaseData, purchaseColumns);
    }
    
    // SALES TABLE
    if (sales.length > 0) {
      const salesColumns = ['Date', 'Employee', 'Sale Type', 'Name', 'Weight', 'Rate', 'Amount', 'Mode', 'Source'];
      const salesData = sales.map(sale => ({
        'Date': sale.date || '',
        'Employee': sale.employee || '',
        'Sale Type': sale.saleType || '',
        'Name': sale.name || '',
        'Weight': sale.weight || '',
        'Rate': sale.rate || '',
        'Amount': sale.amount || '',
        'Mode': sale.mode || '',
        'Source': sale.source || ''
      }));
      
      addTable('🛒 SALES REPORT', salesData, salesColumns);
    }
    
    // CASH MOVEMENTS TABLE
    if (cashMovements.length > 0) {
      const cashColumns = ['Date', 'Type', 'Change', 'New Balance', 'Reason', 'By'];
      const cashData = cashMovements.map(mov => ({
        'Date': mov.date || '',
        'Type': mov.type || '',
        'Change': mov.change || '',
        'New Balance': mov.newBalance || '',
        'Reason': mov.reason || '',
        'By': mov.by || ''
      }));
      
      addTable('💵 CASH MOVEMENTS REPORT', cashData, cashColumns);
    }
    
    // SUMMARY TABLE
    const exchangesTotal = exchanges.reduce((sum, ex) => sum + (parseFloat(ex.amount) || 0), 0);
    const purchasesTotal = purchases.reduce((sum, pur) => sum + (parseFloat(pur.amount) || 0), 0);
    const salesTotal = sales.reduce((sum, sale) => sum + (parseFloat(sale.amount) || 0), 0);
    const cashTotal = cashMovements.reduce((sum, mov) => sum + (parseFloat(mov.change) || 0), 0);
    const grandTotal = exchangesTotal + purchasesTotal + salesTotal + cashTotal;
    
    const summaryData = [
      { 'Category': 'Exchanges', 'Total Amount': exchangesTotal.toFixed(2), 'Count': exchanges.length },
      { 'Category': 'Purchases', 'Total Amount': purchasesTotal.toFixed(2), 'Count': purchases.length },
      { 'Category': 'Sales', 'Total Amount': salesTotal.toFixed(2), 'Count': sales.length },
      { 'Category': 'Cash Movements', 'Total Amount': cashTotal.toFixed(2), 'Count': cashMovements.length },
      { 'Category': '═══════════', 'Total Amount': '═══════════', 'Count': '═══════' },
      { 'Category': 'GRAND TOTAL', 'Total Amount': grandTotal.toFixed(2), 'Count': (exchanges.length + purchases.length + sales.length + cashMovements.length) }
    ];
    
    addTable('📈 SUMMARY REPORT', summaryData, ['Category', 'Total Amount', 'Count']);
    
    // Auto-size columns
    worksheet.columns.forEach(column => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(maxLength + 2, 50);
    });
    
    // Save the file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'complete_reports_dashboard.xlsx';
    link.click();
    window.URL.revokeObjectURL(url);
  };
  // Export to PDF for cash movements
  const handleExportPDFCash = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('💵 CASH MOVEMENTS REPORT', 14, 20);
    
    // Add subtitle with date
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    
    // Calculate total
    const total = filteredCash.reduce((sum, mov) => sum + (parseFloat(mov.change) || 0), 0);
    
    const tableColumn = [
      'Date', 'Type', 'Change', 'New Balance', 'Reason', 'By',
    ];
    const tableRows = filteredCash.map(mov => [
      mov.date || '', 
      mov.type || '', 
      mov.change || '', 
      mov.newBalance || '', 
      mov.reason || '', 
      mov.by || ''
    ]);
    
    // Add total row
    if (tableRows.length > 0) {
      tableRows.push(['', 'TOTAL:', total.toFixed(2), '', '', '']);
    }
    
    autoTable(doc, { 
      head: [tableColumn], 
      body: tableRows, 
      startY: 35,
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [47, 85, 151],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      margin: { top: 35 }
    });
    
    doc.save('cash_movements_report.pdf');
    
    // Show success message
    showToast('💵 Cash movements PDF exported successfully!', 'success');
  };

  return (
    <>
      <Adminheader />
      <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-yellow-50 to-yellow-50 py-8 px-2">
        {/* Store Indicator */}
        {selectedStore && (
          <div className="w-full max-w-6xl mb-4">
            <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 text-center">
              <h2 className="text-xl font-bold text-yellow-800">
                📊 Reports for: <span className="text-yellow-900">{selectedStore.name}</span>
              </h2>
              <p className="text-yellow-700 text-sm mt-1">
                Showing data exclusively for {selectedStore.name}
              </p>
            </div>
          </div>
        )}
        <div className="w-full max-w-6xl bg-white/90 rounded-2xl shadow-xl p-8 border border-yellow-100 mt-8">
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
            <div className="flex gap-4">
              <button onClick={() => setTab('EXCHANGES')} className={`px-6 py-2 rounded-lg font-bold ${tab === 'EXCHANGES' ? 'bg-yellow-400 text-black' : 'bg-gray-200 text-gray-700'}`}>Exchanges</button>
              <button onClick={() => setTab('PURCHASES')} className={`px-6 py-2 rounded-lg font-bold ${tab === 'PURCHASES' ? 'bg-yellow-400 text-black' : 'bg-gray-200 text-gray-700'}`}>Purchases</button>
              <button onClick={() => setTab('SALES')} className={`px-6 py-2 rounded-lg font-bold ${tab === 'SALES' ? 'bg-yellow-400 text-black' : 'bg-gray-200 text-gray-700'}`}>Sales</button>
              <button onClick={() => setTab('CASH')} className={`px-6 py-2 rounded-lg font-bold ${tab === 'CASH' ? 'bg-yellow-400 text-black' : 'bg-gray-200 text-gray-700'}`}>Cash Movements</button>
              <button onClick={() => setTab('ORDERS')} className={`px-6 py-2 rounded-lg font-bold ${tab === 'ORDERS' ? 'bg-yellow-400 text-black' : 'bg-gray-200 text-gray-700'}`}>Orders</button>
              <button onClick={() => setTab('TOKENS')} className={`px-6 py-2 rounded-lg font-bold ${tab === 'TOKENS' ? 'bg-yellow-400 text-black' : 'bg-gray-200 text-gray-700'}`}>Tokens</button>
            </div>
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

          <div className="flex flex-wrap gap-4 mb-6 items-center justify-between">
            <div className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400"
              />
              {(tab === 'EXCHANGES' || tab === 'PURCHASES' || tab === 'SALES') && (
                <>
                  <select
                    value={typeFilter}
                    onChange={e => setTypeFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400"
                  >
                    <option value="ALL">All Types</option>
                    {tab === 'EXCHANGES' && (
                      <>
                        <option value="GOLD">Gold</option>
                        <option value="SILVER">Silver</option>
                      </>
                    )}
                    {tab === 'PURCHASES' && (
                      [...new Set(purchases.map(p => p.mainType).filter(Boolean))].map(val => (
                        <option key={val} value={val}>{val}</option>
                      ))
                    )}
                    {tab === 'SALES' && (
                      [...new Set(sales.map(s => s.saleType).filter(Boolean))].map(val => (
                        <option key={val} value={val}>{val}</option>
                      ))
                    )}
                  </select>
                  <select
                    value={sourceFilter}
                    onChange={e => setSourceFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400"
                  >
                    <option value="ALL">All Sources</option>
                    {tab === 'EXCHANGES' && (
                      <>
                        <option value="LOCAL GOLD">Local Gold</option>
                        <option value="BANK GOLD">Bank Gold</option>
                        <option value="LOCAL SILVER">Local Silver</option>
                        <option value="KAMAL SILVER">Kamal Silver</option>
                      </>
                    )}
                    {tab === 'PURCHASES' && (
                      [...new Set(purchases.map(p => p.subType).filter(Boolean))].map(val => (
                        <option key={val} value={val}>{val}</option>
                      ))
                    )}
                    {tab === 'SALES' && (
                      [...new Set(sales.map(s => s.source).filter(Boolean))].map(val => (
                        <option key={val} value={val}>{val}</option>
                      ))
                    )}
                  </select>
                </>
              )}
              
              {/* Month Filter - Available for all tabs */}
              <select
                value={monthFilter}
                onChange={e => setMonthFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400"
              >
                {generateMonthOptions().map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              
              {/* Date Range Filters - Available for all tabs */}
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400"
                placeholder="Start Date"
              />
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400"
                placeholder="End Date"
              />
              
              {/* Apply Filter Button */}
              <button
                onClick={applyFilters}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-semibold shadow transition-colors"
              >
                Apply Filter
              </button>
            </div>
            
            {/* Column Visibility Controls */}
            <div className="relative mb-4 column-dropdown">
              <button
                onClick={() => setColumnVisibility(prev => ({ ...prev, dropdownOpen: !prev.dropdownOpen }))}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold shadow flex items-center gap-2"
              >
                <span>Show Columns</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {columnVisibility.dropdownOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-48">
                  <div className="p-3">
                    <div className="text-sm font-semibold text-gray-700 mb-2">Select Columns:</div>
                    {Object.entries(columnVisibility).filter(([key]) => key !== 'dropdownOpen').map(([column, isVisible]) => (
                      <label key={column} className="flex items-center gap-2 text-sm py-1 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={(e) => setColumnVisibility(prev => ({
                            ...prev,
                            [column]: e.target.checked
                          }))}
                          className="rounded"
                        />
                        <span className="capitalize">{column}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {/* Export All to Excel button - always visible */}
              <button 
                onClick={handleExportAllToExcel} 
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold shadow"
              >
                Export All to Excel
              </button>
              
              {/* Export Exchanges & Sales Combined button - always visible */}
              <button 
                onClick={handleExportExchangesPurchasesCombined} 
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold shadow"
              >
                📊🛒 Exchanges + Sales
              </button>
              
              {/* Individual export buttons based on current tab */}
              {tab === 'EXCHANGES' ? (
                <>
                  <button onClick={handleExportExcelEx} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold shadow">Export to Excel</button>
                  <button onClick={handleExportPDFEx} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold shadow">Export to PDF</button>
                </>
              ) : tab === 'PURCHASES' ? (
                <>
                  <button onClick={handleExportExcelPur} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold shadow">Export to Excel</button>
                  <button onClick={handleExportPDFPur} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold shadow">Export to PDF</button>
                </>
              ) : tab === 'SALES' ? (
                <>
                  <button onClick={handleExportExcelSales} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold shadow">Export to Excel</button>
                  <button onClick={handleExportPDFSales} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold shadow">Export to PDF</button>
                </>
              ) : (
                <>
                  <button onClick={handleExportExcelCash} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold shadow">Export to Excel</button>
                  <button onClick={handleExportPDFCash} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold shadow">Export to PDF</button>
                </>
              )}
            </div>
          </div>
          {loading ? (
            <div className="text-center text-gray-500">Loading...</div>
          ) : tab === 'EXCHANGES' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300 rounded-lg">
                <thead className="bg-yellow-100">
                  <tr>
                    {columnVisibility.date && <th className="px-4 py-2 border">Date</th>}
                    {columnVisibility.employee && <th className="px-4 py-2 border">Employee</th>}
                    {columnVisibility.type && <th className="px-4 py-2 border">Type</th>}
                    {columnVisibility.source && <th className="px-4 py-2 border">Source</th>}
                    {columnVisibility.name && <th className="px-4 py-2 border">Name</th>}
                    {columnVisibility.weight && <th className="px-4 py-2 border">Weight (gms)</th>}
                    {columnVisibility.touch && <th className="px-4 py-2 border">Touch (%)</th>}
                    {columnVisibility.less && <th className="px-4 py-2 border">Less</th>}
                    {columnVisibility.fine && <th className="px-4 py-2 border">Fine (gms)</th>}
                    {columnVisibility.amount && <th className="px-4 py-2 border">Amount</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredEx.length === 0 ? (
                    <tr><td colSpan={Object.values(columnVisibility).filter(Boolean).length} className="text-center py-4">No transactions found.</td></tr>
                  ) : (
                    filteredEx.map((ex, idx) => (
                      <tr key={idx} className="hover:bg-yellow-50">
                        {columnVisibility.date && <td className="px-4 py-2 border">{ex.date}</td>}
                        {columnVisibility.employee && <td className="px-4 py-2 border">{ex.employee}</td>}
                        {columnVisibility.type && <td className="px-4 py-2 border">{ex.type}</td>}
                        {columnVisibility.source && <td className="px-4 py-2 border">{ex.source}</td>}
                        {columnVisibility.name && <td className="px-4 py-2 border">{ex.name}</td>}
                        {columnVisibility.weight && <td className="px-4 py-2 border">{ex.weight}</td>}
                        {columnVisibility.touch && <td className="px-4 py-2 border">{ex.touch}</td>}
                        {columnVisibility.less && <td className="px-4 py-2 border">{ex.less}</td>}
                        {columnVisibility.fine && <td className="px-4 py-2 border">{ex.fine}</td>}
                        {columnVisibility.amount && <td className="px-4 py-2 border font-bold">{ex.amount}</td>}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : tab === 'PURCHASES' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300 rounded-lg">
                <thead className="bg-yellow-100">
                  <tr>
                    <th className="px-4 py-2 border">Date</th>
                    <th className="px-4 py-2 border">Employee</th>
                    <th className="px-4 py-2 border">Main Type</th>
                    <th className="px-4 py-2 border">Sub Type</th>
                    <th className="px-4 py-2 border">Name</th>
                    <th className="px-4 py-2 border">Weight</th>
                    <th className="px-4 py-2 border">Touch</th>
                    <th className="px-4 py-2 border">Less</th>
                    <th className="px-4 py-2 border">Fine</th>
                    <th className="px-4 py-2 border">Rate</th>
                    <th className="px-4 py-2 border">Amount</th>
                    <th className="px-4 py-2 border">Payment</th>
                    <th className="px-4 py-2 border">Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPur.length === 0 ? (
                    <tr><td colSpan={13} className="text-center py-4">No purchases found.</td></tr>
                  ) : (
                    filteredPur.map((pur, idx) => (
                      <tr key={idx} className="hover:bg-yellow-50">
                        <td className="px-4 py-2 border">{pur.date}</td>
                        <td className="px-4 py-2 border">{pur.employee}</td>
                        <td className="px-4 py-2 border">{pur.mainType}</td>
                        <td className="px-4 py-2 border">{pur.subType}</td>
                        <td className="px-4 py-2 border">{pur.name}</td>
                        <td className="px-4 py-2 border">{pur.weight}</td>
                        <td className="px-4 py-2 border">{pur.touch}</td>
                        <td className="px-4 py-2 border">{pur.less}</td>
                        <td className="px-4 py-2 border">{pur.fine}</td>
                        <td className="px-4 py-2 border">{pur.rate}</td>
                        <td className="px-4 py-2 border font-bold">{pur.amount}</td>
                        <td className="px-4 py-2 border">{pur.paymentType}</td>
                        <td className="px-4 py-2 border">{pur.cashMode}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : tab === 'SALES' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300 rounded-lg">
                <thead className="bg-yellow-100">
                  <tr>
                    <th className="px-4 py-2 border">Date</th>
                    <th className="px-4 py-2 border">Employee</th>
                    <th className="px-4 py-2 border">Type</th>
                    <th className="px-4 py-2 border">Name</th>
                    <th className="px-4 py-2 border">Weight</th>
                    <th className="px-4 py-2 border">Rate</th>
                    <th className="px-4 py-2 border">Amount</th>
                    <th className="px-4 py-2 border">Mode</th>
                    <th className="px-4 py-2 border">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-4">No sales found.</td></tr>
                  ) : (
                    filteredSales.map((sale, idx) => (
                      <tr key={idx} className="hover:bg-yellow-50">
                        <td className="px-4 py-2 border">{sale.date}</td>
                        <td className="px-4 py-2 border">{sale.employee}</td>
                        <td className="px-4 py-2 border">{sale.saleType}</td>
                        <td className="px-4 py-2 border">{sale.name}</td>
                        <td className="px-4 py-2 border">{sale.weight}</td>
                        <td className="px-4 py-2 border">{sale.rate}</td>
                        <td className="px-4 py-2 border font-bold">{sale.amount}</td>
                        <td className="px-4 py-2 border">{sale.mode}</td>
                        <td className="px-4 py-2 border">{sale.source}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : tab === 'TOKENS' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300 rounded-lg">
                <thead className="bg-yellow-100">
                  <tr>
                    <th className="px-4 py-2 border">Date</th>
                    <th className="px-4 py-2 border">Token No</th>
                    <th className="px-4 py-2 border">Customer Name</th>
                    <th className="px-4 py-2 border">Purpose</th>
                    <th className="px-4 py-2 border">Amount</th>
                    <th className="px-4 py-2 border">Store</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTokens.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-4">No tokens found.</td></tr>
                  ) : (
                    filteredTokens.map((token, idx) => (
                      <tr key={idx} className="hover:bg-yellow-50">
                        <td className="px-4 py-2 border">{token.date}</td>
                        <td className="px-4 py-2 border font-bold">{token.tokenNo}</td>
                        <td className="px-4 py-2 border">{token.name}</td>
                        <td className="px-4 py-2 border">{token.purpose}</td>
                        <td className="px-4 py-2 border font-bold">₹{token.amount}</td>
                        <td className="px-4 py-2 border">{token.storeName}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : tab === 'ORDERS' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300 rounded-lg">
                <thead className="bg-yellow-100">
                  <tr>
                    <th className="px-4 py-2 border">Order ID</th>
                    <th className="px-4 py-2 border">Customer</th>
                    <th className="px-4 py-2 border">Contact</th>
                    <th className="px-4 py-2 border">Order Type</th>
                    <th className="px-4 py-2 border">Status</th>
                    <th className="px-4 py-2 border">Requested Delivery</th>
                    <th className="px-4 py-2 border">Items</th>
                    <th className="px-4 py-2 border">Total Weight</th>
                    <th className="px-4 py-2 border">Advance</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-4">No orders found.</td></tr>
                  ) : (
                    filteredOrders.map((order, idx) => (
                      <tr key={idx} className="hover:bg-yellow-50">
                        <td className="px-4 py-2 border">{order.orderId}</td>
                        <td className="px-4 py-2 border">{order.customer?.name || '-'}</td>
                        <td className="px-4 py-2 border">{order.customer?.contact || '-'}</td>
                        <td className="px-4 py-2 border">{order.orderType || '-'}</td>
                        <td className="px-4 py-2 border">{order.orderStatus || '-'}</td>
                        <td className="px-4 py-2 border">{order.requestedDeliveryDate || '-'}</td>
                        <td className="px-4 py-2 border">{Array.isArray(order.items) ? order.items.length : 0}</td>
                        <td className="px-4 py-2 border">{order.totalWeight || '-'}</td>
                        <td className="px-4 py-2 border">{order.advanceType === 'GOLD' ? `${order.advanceGoldGms || 0} g` : (order.advance ? `₹${order.advance}` : '-')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300 rounded-lg">
                <thead className="bg-yellow-100">
                  <tr>
                    <th className="px-4 py-2 border">Date</th>
                    <th className="px-4 py-2 border">Type</th>
                    <th className="px-4 py-2 border">Change</th>
                    <th className="px-4 py-2 border">New Balance</th>
                    <th className="px-4 py-2 border">Reason</th>
                    <th className="px-4 py-2 border">By</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCash.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-4">No cash movements found.</td></tr>
                  ) : (
                    filteredCash.map((mov, idx) => (
                      <tr key={idx} className="hover:bg-yellow-50">
                        <td className="px-4 py-2 border">{mov.date}</td>
                        <td className="px-4 py-2 border">{mov.type}</td>
                        <td className="px-4 py-2 border font-bold">{mov.change}</td>
                        <td className="px-4 py-2 border">{mov.newBalance}</td>
                        <td className="px-4 py-2 border">{mov.reason}</td>
                        <td className="px-4 py-2 border">{mov.by}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 px-8 py-4 rounded-2xl shadow-2xl z-[9999] flex items-center gap-3 text-white text-lg font-semibold ${
          toast.type === 'success' ? 'bg-green-600 animate-bounce-in' : 'bg-red-600 animate-shake'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle className="w-7 h-7" />
          ) : (
            <AlertCircle className="w-7 h-7" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </>
  );
}

export default Reports;
