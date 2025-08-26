import { useState, useEffect } from 'react';
import { db } from '../../../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FaDownload, FaFileExcel, FaFilePdf, FaCalendar, FaFilter, FaTimes } from 'react-icons/fa';
import { useStore } from '../Admin/StoreContext';

function DailyReports({ transactionType, onClose }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const [availableDates, setAvailableDates] = useState([]);
  const [filters, setFilters] = useState({
    employee: '',
    type: '',
    subType: '',
    source: '',
    mode: ''
  });
  
  const { selectedStore } = useStore();

  // Collection mapping
  const collectionMap = {
    'tokens': 'tokens',
    'exchanges': 'exchanges',
    'purchases': 'purchases',
    'sales': 'sales'
  };

  // Column configurations for different transaction types
  const columnConfigs = {
    tokens: [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Token No', key: 'tokenNo', width: 15 },
      { header: 'Customer Name', key: 'name', width: 25 },
      { header: 'Purpose', key: 'purpose', width: 20 },
      { header: 'Amount (₹)', key: 'amount', width: 15 },
      { header: 'Employee', key: 'employee', width: 20 },
      { header: 'Store', key: 'storeName', width: 20 }
    ],
    exchanges: [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Customer Name', key: 'name', width: 25 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Weight (g)', key: 'weight', width: 15 },
      { header: 'Touch (%)', key: 'touch', width: 15 },
      { header: 'Less (%)', key: 'less', width: 15 },
      { header: 'Fine (g)', key: 'fine', width: 15 },
      { header: 'Amount (₹)', key: 'amount', width: 15 },
      { header: 'Source', key: 'source', width: 20 },
      { header: 'Employee', key: 'employee', width: 20 },
      { header: 'Store', key: 'storeName', width: 20 }
    ],
    purchases: [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Customer Name', key: 'name', width: 25 },
      { header: 'Main Type', key: 'mainType', width: 15 },
      { header: 'Sub Type', key: 'subType', width: 20 },
      { header: 'Weight (g)', key: 'weight', width: 15 },
      { header: 'Touch (%)', key: 'touch', width: 15 },
      { header: 'Less (%)', key: 'less', width: 15 },
      { header: 'Fine (g)', key: 'fine', width: 15 },
      { header: 'Rate (₹/g)', key: 'rate', width: 15 },
      { header: 'Amount (₹)', key: 'amount', width: 15 },
      { header: 'Payment Type', key: 'paymentType', width: 20 },
      { header: 'Employee', key: 'employee', width: 20 },
      { header: 'Store', key: 'storeName', width: 20 }
    ],
    sales: [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Customer Name', key: 'name', width: 25 },
      { header: 'Sale Type', key: 'saleType', width: 15 },
      { header: 'Weight (g)', key: 'weight', width: 15 },
      { header: 'Rate (₹/g)', key: 'rate', width: 15 },
      { header: 'Amount (₹)', key: 'amount', width: 15 },
      { header: 'Payment Mode', key: 'mode', width: 20 },
      { header: 'Source', key: 'source', width: 20 },
      { header: 'Employee', key: 'employee', width: 20 },
      { header: 'Store', key: 'storeName', width: 20 }
    ]
  };

  // Fetch transactions for selected date
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!selectedStore || !selectedDate) return;
      
      setLoading(true);
      try {
        const collectionName = collectionMap[transactionType];
        if (!collectionName) return;

        // Convert the selected date to the same format used when storing
        // Parse the ISO date string (YYYY-MM-DD) and convert to DD/MM/YYYY format
        const [year, month, day] = selectedDate.split('-');
        const queryDate = `${day}/${month}/${year}`;
        


        const q = query(
          collection(db, collectionName),
          where('storeId', '==', selectedStore.id)
        );

        const snapshot = await getDocs(q);
        
        const data = snapshot.docs.map(doc => {
          const docData = doc.data();
          return {
            id: doc.id,
            ...docData
          };
        }).filter(doc => doc.date === queryDate) // Filter by date on client side
        .sort((a, b) => {
          // Sort by createdAt timestamp (most recent first)
          if (a.createdAt && b.createdAt) {
            return b.createdAt.toDate() - a.createdAt.toDate();
          }
          return 0;
        });

        setTransactions(data);
        setFilteredTransactions(data);
        
        // Debug info
        setDebugInfo(`Query: ${collectionName} collection, Date: ${queryDate}, Store: ${selectedStore.id}, Found: ${data.length} documents`);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [selectedStore, selectedDate, transactionType]);

  // Load available dates when component mounts
  useEffect(() => {
    if (selectedStore && transactionType) {
      loadAvailableDates();
    }
  }, [selectedStore, transactionType]);

  // Apply filters
  useEffect(() => {
    let filtered = [...transactions];

    if (filters.employee) {
      filtered = filtered.filter(t => 
        t.employee && t.employee.toLowerCase().includes(filters.employee.toLowerCase())
      );
    }

    if (filters.type) {
      if (transactionType === 'exchanges') {
        filtered = filtered.filter(t => t.type === filters.type);
      } else if (transactionType === 'purchases') {
        filtered = filtered.filter(t => t.mainType === filters.type);
      } else if (transactionType === 'sales') {
        filtered = filtered.filter(t => t.saleType === filters.type);
      }
    }

    if (filters.subType && transactionType === 'purchases') {
      filtered = filtered.filter(t => t.subType === filters.subType);
    }

    if (filters.source) {
      filtered = filtered.filter(t => t.source === filters.source);
    }

    if (filters.mode) {
      if (transactionType === 'sales') {
        filtered = filtered.filter(t => t.mode === filters.mode);
      } else if (transactionType === 'purchases') {
        filtered = filtered.filter(t => t.paymentType === filters.mode);
      }
    }

    setFilteredTransactions(filtered);
  }, [transactions, filters, transactionType]);

  // Generate Excel report
  const generateExcelReport = async () => {
    if (filteredTransactions.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`${transactionType.toUpperCase()} Report`);

    // Add title
    worksheet.addRow([`${transactionType.toUpperCase()} TRANSACTIONS - ${selectedDate}`]);
    worksheet.addRow([`Store: ${selectedStore?.name}`]);
    worksheet.addRow([]);

    // Add headers
    const columns = columnConfigs[transactionType];
    const headers = columns.map(col => col.header);
    worksheet.addRow(headers);

    // Style headers
    const headerRow = worksheet.getRow(4);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F3FF' }
    };

    // Add data
    filteredTransactions.forEach(transaction => {
      const row = columns.map(col => {
        const value = transaction[col.key];
        return value !== undefined ? value : '';
      });
      worksheet.addRow(row);
    });

    // Auto-fit columns
    columns.forEach((col, index) => {
      worksheet.getColumn(index + 1).width = col.width;
    });

    // Add summary
    worksheet.addRow([]);
    worksheet.addRow(['Summary']);
    worksheet.addRow(['Total Transactions:', filteredTransactions.length]);

    if (transactionType === 'tokens') {
      const totalAmount = filteredTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
      worksheet.addRow(['Total Amount:', `₹${totalAmount.toFixed(2)}`]);
    } else if (transactionType === 'exchanges') {
      const totalFine = filteredTransactions.reduce((sum, t) => sum + (parseFloat(t.fine) || 0), 0);
      const totalAmount = filteredTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
      worksheet.addRow(['Total Fine Weight:', `${totalFine.toFixed(3)}g`]);
      worksheet.addRow(['Total Amount:', `₹${totalAmount.toFixed(2)}`]);
    } else if (transactionType === 'purchases') {
      const totalWeight = filteredTransactions.reduce((sum, t) => sum + (parseFloat(t.weight) || 0), 0);
      const totalAmount = filteredTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
      worksheet.addRow(['Total Weight:', `${totalWeight.toFixed(3)}g`]);
      worksheet.addRow(['Total Amount:', `₹${totalAmount.toFixed(2)}`]);
    } else if (transactionType === 'sales') {
      const totalWeight = filteredTransactions.reduce((sum, t) => sum + (parseFloat(t.weight) || 0), 0);
      const totalAmount = filteredTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
      worksheet.addRow(['Total Weight:', `${totalWeight.toFixed(3)}g`]);
      worksheet.addRow(['Total Amount:', `₹${totalAmount.toFixed(2)}`]);
    }

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${transactionType}_report_${selectedDate}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // Generate PDF report
  const generatePDFReport = () => {
    if (filteredTransactions.length === 0) return;

    const doc = new jsPDF();
    const columns = columnConfigs[transactionType];

    // Add title
    doc.setFontSize(16);
    doc.text(`${transactionType.toUpperCase()} TRANSACTIONS - ${selectedDate}`, 14, 20);
    doc.setFontSize(12);
    doc.text(`Store: ${selectedStore?.name}`, 14, 30);

    // Prepare table data
    const tableData = filteredTransactions.map(transaction => {
      return columns.map(col => {
        const value = transaction[col.key];
        return value !== undefined ? value.toString() : '';
      });
    });

    // Add table
    autoTable(doc, {
      head: [columns.map(col => col.header)],
      body: tableData,
      startY: 40,
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255
      }
    });

    // Add summary
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text('Summary:', 14, finalY);
    doc.setFontSize(10);
    doc.text(`Total Transactions: ${filteredTransactions.length}`, 14, finalY + 10);

    let summaryY = finalY + 20;
    if (transactionType === 'tokens') {
      const totalAmount = filteredTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
      doc.text(`Total Amount: ₹${totalAmount.toFixed(2)}`, 14, summaryY);
    } else if (transactionType === 'exchanges') {
      const totalFine = filteredTransactions.reduce((sum, t) => sum + (parseFloat(t.fine) || 0), 0);
      const totalAmount = filteredTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
      doc.text(`Total Fine Weight: ${totalFine.toFixed(3)}g`, 14, summaryY);
      doc.text(`Total Amount: ₹${totalAmount.toFixed(2)}`, 14, summaryY + 7);
    } else if (transactionType === 'purchases') {
      const totalWeight = filteredTransactions.reduce((sum, t) => sum + (parseFloat(t.weight) || 0), 0);
      const totalAmount = filteredTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
      doc.text(`Total Weight: ${totalWeight.toFixed(3)}g`, 14, summaryY);
      doc.text(`Total Amount: ₹${totalAmount.toFixed(2)}`, 14, summaryY + 7);
    } else if (transactionType === 'sales') {
      const totalWeight = filteredTransactions.reduce((sum, t) => sum + (parseFloat(t.weight) || 0), 0);
      const totalAmount = filteredTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
      doc.text(`Total Weight: ${totalWeight.toFixed(3)}g`, 14, summaryY);
      doc.text(`Total Amount: ₹${totalAmount.toFixed(2)}`, 14, summaryY + 7);
    }

    // Download PDF
    doc.save(`${transactionType}_report_${selectedDate}.pdf`);
  };

  // Get unique values for filters
  const getUniqueValues = (field) => {
    const values = transactions.map(t => t[field]).filter(Boolean);
    return [...new Set(values)];
  };

  // Load available dates from database
  const loadAvailableDates = async () => {
    if (!selectedStore) return;
    
    try {
      const collectionName = collectionMap[transactionType];
      if (!collectionName) return;
      
      // Query all documents for this store
      const q = query(
        collection(db, collectionName),
        where('storeId', '==', selectedStore.id)
      );
      
      const snapshot = await getDocs(q);
      
      const dates = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.date) {
          dates.push(data.date);
        }
      });
      
      const uniqueDates = [...new Set(dates)];
      
      // Convert dates to ISO format for the date picker
      const isoDates = uniqueDates.map(dateStr => {
        const [day, month, year] = dateStr.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }).sort(); // Sort dates chronologically
      
      setAvailableDates(isoDates);
      setDebugInfo(prev => prev + ` | Available dates: ${uniqueDates.join(', ')}`);
      
      
      
    } catch (error) {
      console.error('Error loading available dates:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Daily {transactionType.toUpperCase()} Report</h2>
              <p className="text-blue-100 mt-1">Generate and download daily transaction reports</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-200 transition-colors"
            >
              <FaTimes className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                     {/* Date Selection */}
           <div className="mb-6">
             <label className="block text-sm font-semibold text-gray-700 mb-2">
               <FaCalendar className="inline w-4 h-4 mr-2" />
               Select Date
             </label>
             <div className="flex gap-2">
               <input
                 type="date"
                 value={selectedDate}
                 onChange={(e) => setSelectedDate(e.target.value)}
                 className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200"
               />
               <button
                 onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                 className="px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors"
               >
                 Today
               </button>
             </div>
             
             {/* Available Dates Dropdown */}
             {availableDates.length > 0 && (
               <div className="mt-3">
                 <label className="block text-xs font-medium text-gray-600 mb-1">
                   Available Dates with Transactions:
                 </label>
                 <select
                   value={selectedDate}
                   onChange={(e) => setSelectedDate(e.target.value)}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                 >
                   {availableDates.map(date => (
                     <option key={date} value={date}>
                       {new Date(date).toLocaleDateString('en-GB')} ({date})
                     </option>
                   ))}
                 </select>
               </div>
             )}
           </div>

          {/* Filters */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-gray-700">
                <FaFilter className="inline w-4 h-4 mr-2" />
                Filters
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </button>
                {showFilters && (
                  <button
                    onClick={() => setFilters({ employee: '', type: '', subType: '', source: '', mode: '' })}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-xl">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Employee</label>
                  <input
                    type="text"
                    placeholder="Filter by employee"
                    value={filters.employee}
                    onChange={(e) => setFilters({...filters, employee: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {(transactionType === 'exchanges' || transactionType === 'purchases' || transactionType === 'sales') && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                    <select
                      value={filters.type}
                      onChange={(e) => setFilters({...filters, type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Types</option>
                      {transactionType === 'exchanges' && getUniqueValues('type').map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                      {transactionType === 'purchases' && getUniqueValues('mainType').map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                      {transactionType === 'sales' && getUniqueValues('saleType').map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                )}

                {transactionType === 'purchases' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Sub Type</label>
                    <select
                      value={filters.subType}
                      onChange={(e) => setFilters({...filters, subType: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Sub Types</option>
                      {getUniqueValues('subType').map(subType => (
                        <option key={subType} value={subType}>{subType}</option>
                      ))}
                    </select>
                  </div>
                )}

                {(transactionType === 'exchanges' || transactionType === 'sales' || transactionType === 'purchases') && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Source</label>
                    <select
                      value={filters.source}
                      onChange={(e) => setFilters({...filters, source: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Sources</option>
                      {getUniqueValues('source').map(source => (
                        <option key={source} value={source}>{source}</option>
                      ))}
                    </select>
                  </div>
                )}

                {(transactionType === 'sales' || transactionType === 'purchases') && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {transactionType === 'sales' ? 'Payment Mode' : 'Payment Type'}
                    </label>
                    <select
                      value={filters.mode}
                      onChange={(e) => setFilters({...filters, mode: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All {transactionType === 'sales' ? 'Modes' : 'Types'}</option>
                      {transactionType === 'sales' && getUniqueValues('mode').map(mode => (
                        <option key={mode} value={mode}>{mode}</option>
                      ))}
                      {transactionType === 'purchases' && getUniqueValues('paymentType').map(paymentType => (
                        <option key={paymentType} value={paymentType}>{paymentType}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

                     {/* Transaction Count */}
           <div className="mb-6">
             <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
               <div className="flex items-center justify-between">
                 <div>
                   <h3 className="text-lg font-semibold text-gray-800">
                     {filteredTransactions.length} Transactions Found
                   </h3>
                   <p className="text-sm text-gray-600">
                     Date: {new Date(selectedDate).toLocaleDateString('en-GB')}
                   </p>
                   {/* Active Filters Summary */}
                   {Object.values(filters).some(filter => filter !== '') && (
                     <div className="mt-2">
                       <p className="text-xs text-gray-500">Active Filters:</p>
                       <div className="flex flex-wrap gap-1 mt-1">
                         {filters.employee && (
                           <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                             Employee: {filters.employee}
                           </span>
                         )}
                         {filters.type && (
                           <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                             Type: {filters.type}
                           </span>
                         )}
                         {filters.subType && (
                           <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                             Sub Type: {filters.subType}
                           </span>
                         )}
                         {filters.source && (
                           <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                             Source: {filters.source}
                           </span>
                         )}
                         {filters.mode && (
                           <span className="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                             {transactionType === 'sales' ? 'Mode' : 'Payment Type'}: {filters.mode}
                           </span>
                         )}
                       </div>
                     </div>
                   )}
                 </div>
                 <div className="text-right">
                   <p className="text-sm text-gray-600">Store</p>
                   <p className="font-semibold text-gray-800">{selectedStore?.name}</p>
                 </div>
               </div>
             </div>
             
             {/* Debug Information */}
             {debugInfo && (
               <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                 <p className="text-xs text-yellow-800 font-mono">{debugInfo}</p>
               </div>
             )}
             
             
           </div>

          {/* Export Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <button
              onClick={generateExcelReport}
              disabled={loading || filteredTransactions.length === 0}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <FaFileExcel className="w-5 h-5" />
              Export to Excel
            </button>
            <button
              onClick={generatePDFReport}
              disabled={loading || filteredTransactions.length === 0}
              className="flex-1 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <FaFilePdf className="w-5 h-5" />
              Export to PDF
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading transactions...</p>
            </div>
          )}

          {/* No Data State */}
          {!loading && filteredTransactions.length === 0 && (
            <div className="text-center py-8">
              <FaDownload className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Transactions Found</h3>
              <p className="text-gray-500">No {transactionType} transactions found for the selected date.</p>
            </div>
          )}

          {/* Transaction Preview */}
          {!loading && filteredTransactions.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Transaction Preview</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white border-b border-gray-200">
                      {columnConfigs[transactionType].slice(0, 5).map((col, index) => (
                        <th key={index} className="px-3 py-2 text-left font-semibold text-gray-700">
                          {col.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.slice(0, 5).map((transaction, index) => (
                      <tr key={transaction.id} className="bg-white border-b border-gray-100 hover:bg-gray-50">
                        {columnConfigs[transactionType].slice(0, 5).map((col, colIndex) => (
                          <td key={colIndex} className="px-3 py-2 text-gray-700">
                            {transaction[col.key] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredTransactions.length > 5 && (
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    Showing first 5 transactions. Download the full report to see all {filteredTransactions.length} transactions.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DailyReports; 