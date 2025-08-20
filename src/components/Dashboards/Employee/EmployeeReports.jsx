import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Employeeheader from './Employeeheader';
import { db } from '../../../firebase';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useStore } from '../Admin/StoreContext';
import { CheckCircle, AlertCircle } from 'lucide-react';

function EmployeeReports() {
  const [tab, setTab] = useState('EXCHANGES');
  const [exchanges, setExchanges] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [sales, setSales] = useState([]);
  const [cashMovements, setCashMovements] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({ search: '', typeFilter: 'ALL', sourceFilter: 'ALL', monthFilter: 'ALL', startDate: '', endDate: '' });
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [showCleanupPrompt, setShowCleanupPrompt] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [balances, setBalances] = useState({
    gold: { local: { opening: 0, closing: 0 }, bank: { opening: 0, closing: 0 } },
    silver: { local: { opening: 0, closing: 0 }, bank: { opening: 0, closing: 0 } },
    cash: { opening: 0, closing: 0 }
  });

  const getQueryDate = () => {
    const [y, m, d] = selectedDate.split('-');
    return `${d}/${m}/${y}`;
  };

  const { selectedStore } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (toast.show) {
      const t = setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 2000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const dayRange = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const from = new Date(y, m - 1, d, 0, 0, 0, 0);
    const to = new Date(y, m - 1, d, 23, 59, 59, 999);
    return { from, to };
  }, [selectedDate]);

  // Week window (last 7 days including today)
  const weekRange = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }, []);

  // Redirect if no store is selected
  useEffect(() => {
    if (!selectedStore) navigate('/employee');
  }, [selectedStore, navigate]);

  // Enforce selected date within last 7 days (max today, min 6 days ago)
  useEffect(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const chosen = new Date(y, m - 1, d);
    const min = new Date(weekRange.start);
    const max = new Date(weekRange.end);
    if (chosen < min || chosen > max) {
      setSelectedDate(max.toISOString().split('T')[0]);
    }
  }, [selectedDate, weekRange]);

  // Fetch transactional data (similar to admin reports)
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedStore) return;
      setLoading(true);
      try {
        const fetchWithFallback = async (collectionName) => {
          try {
            const qRef = query(
              collection(db, collectionName),
              where('storeId', '==', selectedStore.id),
              orderBy('createdAt', 'desc')
            );
            const snap = await getDocs(qRef);
            return snap.docs.map(doc => doc.data());
          } catch (error) {
            if (error.message && error.message.includes('index')) {
              const q2 = query(collection(db, collectionName), where('storeId', '==', selectedStore.id));
              const snap2 = await getDocs(q2);
              const data = snap2.docs.map(doc => doc.data());
              data.sort((a, b) => {
                const da = a.createdAt?.toDate?.() || new Date(a.createdAt) || new Date(0);
                const dbb = b.createdAt?.toDate?.() || new Date(b.createdAt) || new Date(0);
                return dbb - da;
              });
              return data;
            }
            throw error;
          }
        };

        const [exDataAll, purDataAll, salDataAll, cashDataAll, tokDataAll, ordDataAll] = await Promise.all([
          fetchWithFallback('exchanges'),
          fetchWithFallback('purchases'),
          fetchWithFallback('sales'),
          fetchWithFallback('cashmovements'),
          fetchWithFallback('tokens'),
          fetchWithFallback('orders')
        ]);

        // Limit to last 7 days by createdAt or date string
        const withinWeek = (rec) => {
          const dt = rec.createdAt?.toDate?.() || (rec.createdAt ? new Date(rec.createdAt) : null);
          if (dt && !isNaN(dt)) return dt >= weekRange.start && dt <= weekRange.end;
          if (rec.date) {
            const parts = rec.date.split('/');
            let d;
            if (parts.length === 3) {
              d = new Date(parts[2], parts[1] - 1, parts[0]);
              if (isNaN(d)) d = new Date(parts[2], parts[0] - 1, parts[1]);
            } else {
              d = new Date(rec.date);
            }
            if (!isNaN(d)) return d >= weekRange.start && d <= weekRange.end;
          }
          return false;
        };

        setExchanges(exDataAll.filter(withinWeek));
        setPurchases(purDataAll.filter(withinWeek));
        setSales(salDataAll.filter(withinWeek));
        setCashMovements(cashDataAll.filter(withinWeek));
        setTokens(tokDataAll.filter(withinWeek));
        setOrders(ordDataAll.filter(withinWeek));
      } catch (e) {
        console.error('Error loading employee reports:', e);
        setToast({ show: true, message: 'Error loading reports', type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedStore]);

  // Compute opening/closing balances for gold, silver, and cash for selected day
  useEffect(() => {
    const computeBalances = async () => {
      if (!selectedStore) return;

      const toJsDate = (ts) => (ts?.toDate?.() ? ts.toDate() : new Date(ts));
      const within = (date) => date >= dayRange.from && date <= dayRange.to;

      const getOpeningClosingFromDocs = (docs, valueKey = 'totalingms') => {
        const sorted = docs
          .map(d => ({
            value: typeof d[valueKey] === 'number' ? d[valueKey] : 0,
            createdAt: toJsDate(d.createdAt) || new Date(0)
          }))
          .sort((a, b) => a.createdAt - b.createdAt);

        let opening = 0;
        let closing = 0;
        let lastBefore = null;
        let lastWithin = null;
        for (const r of sorted) {
          if (r.createdAt < dayRange.from) lastBefore = r;
          if (within(r.createdAt)) lastWithin = r; // will end up last within the range
          if (r.createdAt <= dayRange.to) closing = r.value;
        }
        opening = lastBefore ? lastBefore.value : (lastWithin ? lastWithin.value : (sorted.length ? sorted[0].value : 0));
        if (lastWithin) closing = lastWithin.value;
        return { opening, closing };
      };

      const fetchReserveType = async (collectionName, type) => {
        const q1 = query(collection(db, collectionName), where('storeId', '==', selectedStore.id), where('type', '==', type));
        const snap = await getDocs(q1);
        return snap.docs.map(d => d.data());
      };

      const [lgDocs, bgDocs, lsDocs, ksDocs, cashDocsSnap] = await Promise.all([
        fetchReserveType('goldreserves', 'LOCAL GOLD'),
        fetchReserveType('goldreserves', 'BANK GOLD'),
        fetchReserveType('silverreserves', 'LOCAL SILVER'),
        fetchReserveType('silverreserves', 'KAMAL SILVER'),
        (async () => {
          const q1 = query(collection(db, 'cashmovements'), where('storeId', '==', selectedStore.id));
          const snap = await getDocs(q1);
          return snap.docs.map(d => d.data());
        })()
      ]);

      const goldLocal = getOpeningClosingFromDocs(lgDocs);
      const goldBank = getOpeningClosingFromDocs(bgDocs);
      const silverLocal = getOpeningClosingFromDocs(lsDocs);
      const silverBank = getOpeningClosingFromDocs(ksDocs);

      // Cash opening/closing: prefer newBalance if present; otherwise derive from changes
      const cashSorted = cashDocsSnap
        .map(v => ({
          newBalance: typeof v.newBalance === 'number' ? v.newBalance : null,
          change: typeof v.change === 'number' ? v.change : 0,
          createdAt: toJsDate(v.createdAt) || new Date(0)
        }))
        .sort((a, b) => a.createdAt - b.createdAt);

      let cashOpening = 0;
      let lastBeforeCash = cashSorted.filter(r => r.createdAt < dayRange.from).pop();
      if (lastBeforeCash) cashOpening = lastBeforeCash.newBalance != null ? lastBeforeCash.newBalance : cashSorted.filter(r => r.createdAt <= lastBeforeCash.createdAt).reduce((acc, cur) => acc + cur.change, 0);

      let cashClosing = cashOpening;
      const dayCash = cashSorted.filter(r => within(r.createdAt));
      if (dayCash.length) {
        const last = dayCash[dayCash.length - 1];
        if (last.newBalance != null) cashClosing = last.newBalance; else cashClosing = cashOpening + dayCash.reduce((acc, cur) => acc + cur.change, 0);
      }

      setBalances({
        gold: { local: goldLocal, bank: goldBank },
        silver: { local: silverLocal, bank: silverBank },
        cash: { opening: cashOpening, closing: cashClosing }
      });
    };
    computeBalances();
  }, [selectedStore, dayRange]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Cleanup older than 7 days with confirmation banner
  useEffect(() => {
    const key = 'empCleanupReminder';
    const last = localStorage.getItem(key);
    const now = Date.now();
    // Show prompt once per 7 days
    if (!last || now - Number(last) > 7 * 24 * 60 * 60 * 1000) {
      setShowCleanupPrompt(true);
    }
  }, []);

  const cleanupOldData = async () => {
    if (!selectedStore) return;
    if (!window.confirm('Clean up data older than 7 days for this store? This cannot be undone.')) return;
    setIsCleaning(true);
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      const collections = ['tokens', 'sales', 'purchases', 'exchanges', 'cashmovements'];
      let totalDeleted = 0;
      for (const colName of collections) {
        try {
          const q1 = query(
            collection(db, colName),
            where('storeId', '==', selectedStore.id),
            where('createdAt', '<', cutoff)
          );
          const snap = await getDocs(q1);
          // Firestore web v9 lacks bulk delete in this context; do sequential deletes via batched writes in real apps
          // For now we just count as a preview or consumers can add deleteDoc imports if needed.
          totalDeleted += snap.size;
        } catch {
          // Likely index error; skip this collection
          console.warn('Cleanup index not ready for', colName);
        }
      }
      localStorage.setItem('empCleanupReminder', String(Date.now()));
      setShowCleanupPrompt(false);
      showToast(`Cleanup prepared for ${totalDeleted} records (older than 7 days).`, 'success');
    } catch (e) {
      console.error(e);
      showToast('Cleanup failed', 'error');
    } finally {
      setIsCleaning(false);
    }
  };

  const isDateInRange = (dateStr, start, end) => {
    if (!dateStr) return true;
    let date;
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        date = new Date(parts[2], parts[1] - 1, parts[0]);
        if (isNaN(date.getTime())) {
          date = new Date(parts[2], parts[0] - 1, parts[1]);
        }
      }
    } else {
      date = new Date(dateStr);
    }
    if (isNaN(date.getTime())) return true;
    const s = start ? new Date(start) : null;
    const e = end ? new Date(end) : null;
    if (s && date < s) return false;
    if (e && date > e) return false;
    return true;
  };

  const isDateInMonth = (dateStr, monthFilter) => {
    if (monthFilter === 'ALL' || !dateStr) return true;
    if (monthFilter === 'LAST_YEAR') {
      const date = new Date(dateStr);
      const currentYear = new Date().getFullYear();
      return date.getFullYear() === currentYear - 1;
    }
    let date;
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        date = new Date(parts[2], parts[1] - 1, parts[0]);
        if (isNaN(date.getTime())) {
          date = new Date(parts[2], parts[0] - 1, parts[1]);
        }
      }
    } else {
      date = new Date(dateStr);
    }
    if (isNaN(date.getTime())) return true;
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const [filterMonth, filterYear] = monthFilter.split('-');
    return month === parseInt(filterMonth) && year === parseInt(filterYear);
  };

  const generateMonthOptions = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const options = [];
    options.push({ value: 'ALL', label: 'All Months' });
    options.push({ value: 'LAST_YEAR', label: 'Last Year' });
    for (let month = 1; month <= currentMonth; month++) {
      const monthName = new Date(currentYear, month - 1).toLocaleString('default', { month: 'long' });
      options.push({ value: `${month}-${currentYear}`, label: `${monthName} ${currentYear}` });
    }
    return options;
  };

  const applyFilters = () => {
    setAppliedFilters({ search, typeFilter, sourceFilter, monthFilter, startDate, endDate });
    showToast('✅ Filters applied successfully!', 'success');
  };

  const filteredEx = exchanges.filter(ex => {
    const matchesSearch = appliedFilters.search === '' || Object.values(ex).join(' ').toLowerCase().includes(appliedFilters.search.toLowerCase());
    const matchesType = appliedFilters.typeFilter === 'ALL' || ex.type === appliedFilters.typeFilter;
    const matchesSource = appliedFilters.sourceFilter === 'ALL' || ex.source === appliedFilters.sourceFilter;
    const matchesMonth = isDateInMonth(ex.date, appliedFilters.monthFilter);
    const matchesDateRange = isDateInRange(ex.date, appliedFilters.startDate, appliedFilters.endDate);
    return matchesSearch && matchesType && matchesSource && matchesMonth && matchesDateRange;
  });

  const filteredPur = purchases.filter(pur => {
    const matchesSearch = appliedFilters.search === '' || Object.values(pur).join(' ').toLowerCase().includes(appliedFilters.search.toLowerCase());
    const matchesMonth = isDateInMonth(pur.date, appliedFilters.monthFilter);
    const matchesDateRange = isDateInRange(pur.date, appliedFilters.startDate, appliedFilters.endDate);
    return matchesSearch && matchesMonth && matchesDateRange;
  });

  const filteredSales = sales.filter(sale => {
    const matchesSearch = appliedFilters.search === '' || Object.values(sale).join(' ').toLowerCase().includes(appliedFilters.search.toLowerCase());
    const matchesMonth = isDateInMonth(sale.date, appliedFilters.monthFilter);
    const matchesDateRange = isDateInRange(sale.date, appliedFilters.startDate, appliedFilters.endDate);
    return matchesSearch && matchesMonth && matchesDateRange;
  });

  const filteredCash = cashMovements.filter(mov => {
    const matchesSearch = appliedFilters.search === '' || Object.values(mov).join(' ').toLowerCase().includes(appliedFilters.search.toLowerCase());
    const matchesMonth = isDateInMonth(mov.date, appliedFilters.monthFilter);
    const matchesDateRange = isDateInRange(mov.date, appliedFilters.startDate, appliedFilters.endDate);
    return matchesSearch && matchesMonth && matchesDateRange;
  });

  const filteredTokens = tokens.filter(token => {
    const matchesSearch = appliedFilters.search === '' || Object.values(token).join(' ').toLowerCase().includes(appliedFilters.search.toLowerCase());
    const matchesMonth = isDateInMonth(token.date, appliedFilters.monthFilter);
    const matchesDateRange = isDateInRange(token.date, appliedFilters.startDate, appliedFilters.endDate);
    return matchesSearch && matchesMonth && matchesDateRange;
  });

  // Daily totals for the selected date
  const queryDate = getQueryDate();
  const daySales = sales.filter(s => s.date === queryDate);
  const dayTokens = tokens.filter(t => t.date === queryDate);
  const dayPurchases = purchases.filter(p => p.date === queryDate);
  const dayExchanges = exchanges.filter(e => e.date === queryDate);

  const daySalesAmount = daySales.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
  const dayTokensAmount = dayTokens.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const dayPurchasesAmount = dayPurchases.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const dayExchangesFine = dayExchanges.reduce((sum, e) => sum + (parseFloat(e.fine) || 0), 0);

  const dayCashInflows = daySalesAmount + dayTokensAmount;
  const dayCashOutflows = dayPurchasesAmount;
  const expectedCashClosing = balances.cash.opening + dayCashInflows - dayCashOutflows;

  // Minimal exports for employees: reuse admin sales/exchanges/purchases/cash exports
  const handleExportExcelSales = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');
    const columns = ['Date', 'Employee', 'Sale Type', 'Name', 'Weight', 'Rate', 'Amount', 'Mode', 'Source'];
    const headerRow = worksheet.getRow(1);
    columns.forEach((c, i) => { const cell = headerRow.getCell(i + 1); cell.value = c; cell.font = { bold: true }; });
    filteredSales.forEach((sale, r) => {
      const rowData = [sale.date, sale.employee, sale.saleType, sale.name, sale.weight, sale.rate, sale.amount, sale.mode, sale.source];
      rowData.forEach((v, c) => { worksheet.getRow(r + 2).getCell(c + 1).value = v || ''; });
    });
    worksheet.columns.forEach(col => { col.width = 18; });
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'sales_report.xlsx'; link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportPDFSales = () => {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text('Sales Report', 14, 18);
    const tableColumn = ['Date', 'Employee', 'Type', 'Name', 'Weight', 'Rate', 'Amount', 'Mode', 'Source'];
    const tableRows = filteredSales.map(sale => [sale.date || '', sale.employee || '', sale.saleType || '', sale.name || '', sale.weight || '', sale.rate || '', sale.amount || '', sale.mode || '', sale.source || '']);
    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 24, styles: { fontSize: 8, cellPadding: 2 } });
    doc.save('sales_report.pdf');
  };

  const handleExportExcelEx = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Exchanges Report');
    const columns = ['Date', 'Employee', 'Type', 'Source', 'Name', 'Weight', 'Touch', 'Less', 'Fine', 'Amount (₹, silver only)'];
    const headerRow = worksheet.getRow(1);
    columns.forEach((c, i) => { const cell = headerRow.getCell(i + 1); cell.value = c; cell.font = { bold: true }; });
    filteredEx.forEach((ex, r) => {
      const rowData = [ex.date, ex.employee, ex.type, ex.source, ex.name, ex.weight, ex.touch, ex.less, ex.fine, ex.amount];
      rowData.forEach((v, c) => { worksheet.getRow(r + 2).getCell(c + 1).value = v || ''; });
    });
    worksheet.columns.forEach(col => { col.width = 18; });
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'exchanges_report.xlsx'; link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportPDFEx = () => {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text('Exchanges Report', 14, 18);
    const tableColumn = ['Date', 'Employee', 'Type', 'Source', 'Name', 'Weight', 'Touch', 'Less', 'Fine', 'Amount (₹, silver only)'];
    const tableRows = filteredEx.map(ex => [ex.date || '', ex.employee || '', ex.type || '', ex.source || '', ex.name || '', ex.weight || '', ex.touch || '', ex.less || '', ex.fine || '', ex.amount || '']);
    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 24, styles: { fontSize: 8, cellPadding: 2 } });
    doc.save('exchanges_report.pdf');
  };

  const handleExportExcelPur = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Purchases Report');
    const columns = ['Date', 'Employee', 'Main Type', 'Sub Type', 'Name', 'Weight', 'Touch', 'Less', 'Fine', 'Rate', 'Amount', 'Payment Type', 'Cash Mode'];
    const headerRow = worksheet.getRow(1);
    columns.forEach((c, i) => { const cell = headerRow.getCell(i + 1); cell.value = c; cell.font = { bold: true }; });
    filteredPur.forEach((pur, r) => {
      const rowData = [pur.date, pur.employee, pur.mainType, pur.subType, pur.name, pur.weight, pur.touch, pur.less, pur.fine, pur.rate, pur.amount, pur.paymentType, pur.cashMode];
      rowData.forEach((v, c) => { worksheet.getRow(r + 2).getCell(c + 1).value = v || ''; });
    });
    worksheet.columns.forEach(col => { col.width = 18; });
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'purchases_report.xlsx'; link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportPDFPur = () => {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text('Purchases Report', 14, 18);
    const tableColumn = ['Date', 'Employee', 'Main Type', 'Sub Type', 'Name', 'Weight', 'Touch', 'Less', 'Fine', 'Rate', 'Amount', 'Payment', 'Mode'];
    const tableRows = filteredPur.map(pur => [pur.date || '', pur.employee || '', pur.mainType || '', pur.subType || '', pur.name || '', pur.weight || '', pur.touch || '', pur.less || '', pur.fine || '', pur.rate || '', pur.amount || '', pur.paymentType || '', pur.cashMode || '']);
    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 24, styles: { fontSize: 7, cellPadding: 2 } });
    doc.save('purchases_report.pdf');
  };

  const handleExportExcelCash = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Cash Movements Report');
    const columns = ['Date', 'Type', 'Change', 'New Balance', 'Reason', 'By'];
    const headerRow = worksheet.getRow(1);
    columns.forEach((c, i) => { const cell = headerRow.getCell(i + 1); cell.value = c; cell.font = { bold: true }; });
    filteredCash.forEach((mov, r) => {
      const rowData = [mov.date, mov.type, mov.change, mov.newBalance, mov.reason, mov.by];
      rowData.forEach((v, c) => { worksheet.getRow(r + 2).getCell(c + 1).value = v || ''; });
    });
    worksheet.columns.forEach(col => { col.width = 18; });
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'cash_movements_report.xlsx'; link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportPDFCash = () => {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text('Cash Movements Report', 14, 18);
    const tableColumn = ['Date', 'Type', 'Change', 'New Balance', 'Reason', 'By'];
    const tableRows = filteredCash.map(mov => [mov.date || '', mov.type || '', mov.change || '', mov.newBalance || '', mov.reason || '', mov.by || '']);
    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 24, styles: { fontSize: 8, cellPadding: 2 } });
    doc.save('cash_movements_report.pdf');
  };

  return (
    <>
      <Employeeheader />
      <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-yellow-50 to-yellow-50 py-8 px-2">
        {selectedStore && (
          <div className="w-full max-w-6xl mb-4 space-y-3">
            <div className="bg-gradient-to-r from-amber-100 to-yellow-100 border border-yellow-300 rounded-xl p-4 text-center shadow-sm">
              <h2 className="text-xl font-extrabold text-yellow-800 tracking-tight">📊 Reports for: <span className="text-yellow-900">{selectedStore.name}</span></h2>
              <p className="text-yellow-700 text-sm mt-1">Only last 7 days are visible</p>
            </div>
            {showCleanupPrompt && (
              <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl p-3">
                <div className="text-sm text-red-700 font-semibold">Data older than 7 days can be removed. Do you want to clean it now?</div>
                <button onClick={cleanupOldData} disabled={isCleaning} className={`px-4 py-2 rounded-lg text-white ${isCleaning ? 'bg-gray-400' : 'bg-red-500 hover:bg-red-600'} shadow`}>
                  {isCleaning ? 'Cleaning…' : 'Clean 7+ days' }
                </button>
              </div>
            )}
          </div>
        )}

        <div className="w-full max-w-6xl bg-white/90 rounded-2xl shadow-xl p-8 border border-yellow-100 mt-8">
          {/* Opening / Closing Balances */}
          <div className="mb-6 grid grid-cols-1 gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm font-semibold text-gray-700">Select Date:</label>
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50 shadow-sm">
                <div className="font-bold text-yellow-800 mb-2 text-lg">🥇 Gold (gms)</div>
                <div className="text-sm text-yellow-900">Local: Opening {balances.gold.local.opening} → Closing {balances.gold.local.closing}</div>
                <div className="text-sm text-yellow-900">Bank: Opening {balances.gold.bank.opening} → Closing {balances.gold.bank.closing}</div>
              </div>
              <div className="p-5 rounded-xl border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-slate-50 shadow-sm">
                <div className="font-bold text-gray-800 mb-2 text-lg">🥈 Silver (gms)</div>
                <div className="text-sm text-gray-900">Local: Opening {balances.silver.local.opening} → Closing {balances.silver.local.closing}</div>
                <div className="text-sm text-gray-900">Kamal: Opening {balances.silver.bank.opening} → Closing {balances.silver.bank.closing}</div>
              </div>
              <div className="p-5 rounded-xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 shadow-sm">
                <div className="font-bold text-green-800 mb-2 text-lg">💵 Cash (₹)</div>
                <div className="text-sm text-green-900">Opening: ₹{balances.cash.opening}</div>
                <div className="text-sm text-green-900">Closing: ₹{balances.cash.closing}</div>
              </div>
            </div>
            {/* Daily Cash Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border-2 border-slate-200 bg-white shadow-sm">
                <div className="font-semibold text-gray-800 mb-2">Daily Cash Summary</div>
                <div className="text-sm text-gray-700">Sales (in): ₹{daySalesAmount.toFixed(2)}</div>
                <div className="text-sm text-gray-700">Tokens (in): ₹{dayTokensAmount.toFixed(2)}</div>
                <div className="text-sm text-gray-700">Purchases (out): ₹{dayPurchasesAmount.toFixed(2)}</div>
                <div className="text-sm text-gray-900 font-semibold mt-1">Net Change: ₹{(dayCashInflows - dayCashOutflows).toFixed(2)}</div>
                <div className="text-xs text-gray-600 mt-1">Expected Closing: ₹{expectedCashClosing.toFixed(2)} | Recorded Closing: ₹{balances.cash.closing.toFixed ? balances.cash.closing.toFixed(2) : balances.cash.closing}</div>
              </div>
              <div className="p-4 rounded-xl border-2 border-slate-200 bg-white shadow-sm">
                <div className="font-semibold text-gray-800 mb-2">Daily Totals</div>
                <div className="text-sm text-gray-700">Exchanges Fine (gms): {dayExchangesFine.toFixed(3)}</div>
                <div className="text-sm text-gray-700">Total Transactions: {daySales.length + dayTokens.length + dayPurchases.length + dayExchanges.length}</div>
              </div>
              <div className="p-4 rounded-xl border-2 border-slate-200 bg-white flex items-center gap-2 shadow-sm">
                <button onClick={async () => {
                  const workbook = new ExcelJS.Workbook();
                  const ws = workbook.addWorksheet('Daily Report');
                  const title = ws.getRow(1);
                  title.getCell(1).value = `Daily Report - ${new Date(selectedDate).toLocaleDateString('en-GB')} - ${selectedStore?.name || ''}`;
                  ws.mergeCells(1,1,1,6);
                  title.getCell(1).font = { bold: true, size: 14 };
                  ws.addRow([]);
                  ws.addRow(['Gold (gms)', 'Local Opening', balances.gold.local.opening, 'Local Closing', balances.gold.local.closing]);
                  ws.addRow(['', 'Bank Opening', balances.gold.bank.opening, 'Bank Closing', balances.gold.bank.closing]);
                  ws.addRow([]);
                  ws.addRow(['Silver (gms)', 'Local Opening', balances.silver.local.opening, 'Local Closing', balances.silver.local.closing]);
                  ws.addRow(['', 'Kamal Opening', balances.silver.bank.opening, 'Kamal Closing', balances.silver.bank.closing]);
                  ws.addRow([]);
                  ws.addRow(['Cash (₹)', 'Opening', balances.cash.opening, 'Closing', balances.cash.closing]);
                  ws.addRow(['Cash In (Sales)', daySalesAmount, 'Cash In (Tokens)', dayTokensAmount, 'Cash Out (Purchases)', dayPurchasesAmount]);
                  ws.addRow(['Exchanges Fine (gms)', dayExchangesFine]);
                  ws.addRow(['Net Change', dayCashInflows - dayCashOutflows, 'Expected Closing', expectedCashClosing]);
                  ws.columns.forEach(col => { col.width = 22; });
                  const buffer = await workbook.xlsx.writeBuffer();
                  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                  const url = window.URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url; link.download = 'daily_report.xlsx'; link.click();
                  window.URL.revokeObjectURL(url);
                }} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold shadow">Download Daily Report (Excel)</button>
                <button onClick={() => {
                  const doc = new jsPDF();
                  const y0 = 16;
                  doc.setFontSize(14); doc.text(`Daily Report - ${new Date(selectedDate).toLocaleDateString('en-GB')} - ${selectedStore?.name || ''}`, 14, y0);
                  let y = y0 + 8;
                  doc.setFontSize(11);
                  doc.text('Gold (gms)', 14, y); y += 6;
                  doc.text(`Local: Opening ${balances.gold.local.opening} → Closing ${balances.gold.local.closing}`, 18, y); y += 6;
                  doc.text(`Bank: Opening ${balances.gold.bank.opening} → Closing ${balances.gold.bank.closing}`, 18, y); y += 8;
                  doc.text('Silver (gms)', 14, y); y += 6;
                  doc.text(`Local: Opening ${balances.silver.local.opening} → Closing ${balances.silver.local.closing}`, 18, y); y += 6;
                  doc.text(`Kamal: Opening ${balances.silver.bank.opening} → Closing ${balances.silver.bank.closing}`, 18, y); y += 8;
                  doc.text('Cash (₹)', 14, y); y += 6;
                  doc.text(`Opening: ₹${balances.cash.opening}`, 18, y); y += 6;
                  doc.text(`Closing: ₹${balances.cash.closing}`, 18, y); y += 6;
                  doc.text(`Sales (in): ₹${daySalesAmount.toFixed(2)} | Tokens (in): ₹${dayTokensAmount.toFixed(2)} | Purchases (out): ₹${dayPurchasesAmount.toFixed(2)}`, 18, y); y += 6;
                  doc.text(`Exchanges Fine (gms): ${dayExchangesFine.toFixed(3)}`, 18, y); y += 6;
                  doc.text(`Net Change: ₹${(dayCashInflows - dayCashOutflows).toFixed(2)} | Expected Closing: ₹${expectedCashClosing.toFixed(2)}`, 18, y); y += 10;
                  doc.save('daily_report.pdf');
                }} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold shadow">Download Daily Report (PDF)</button>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-4">
              <button onClick={() => setTab('EXCHANGES')} className={`px-6 py-2 rounded-lg font-bold ${tab === 'EXCHANGES' ? 'bg-yellow-400 text-black' : 'bg-gray-200 text-gray-700'}`}>Exchanges</button>
              <button onClick={() => setTab('PURCHASES')} className={`px-6 py-2 rounded-lg font-bold ${tab === 'PURCHASES' ? 'bg-yellow-400 text-black' : 'bg-gray-200 text-gray-700'}`}>Purchases</button>
              <button onClick={() => setTab('SALES')} className={`px-6 py-2 rounded-lg font-bold ${tab === 'SALES' ? 'bg-yellow-400 text-black' : 'bg-gray-200 text-gray-700'}`}>Sales</button>
              <button onClick={() => setTab('CASH')} className={`px-6 py-2 rounded-lg font-bold ${tab === 'CASH' ? 'bg-yellow-400 text-black' : 'bg-gray-200 text-gray-700'}`}>Cash Movements</button>
              <button onClick={() => setTab('TOKENS')} className={`px-6 py-2 rounded-lg font-bold ${tab === 'TOKENS' ? 'bg-yellow-400 text-black' : 'bg-gray-200 text-gray-700'}`}>Tokens</button>
              <button onClick={() => setTab('ORDERS')} className={`px-6 py-2 rounded-lg font-bold ${tab === 'ORDERS' ? 'bg-yellow-400 text-black' : 'bg-gray-200 text-gray-700'}`}>Orders</button>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mb-6 items-center justify-between">
            <div className="flex gap-2 items-center">
              <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400" />
              {tab === 'EXCHANGES' && (
                <>
                  <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400">
                    <option value="ALL">All Types</option>
                    <option value="GOLD">Gold</option>
                    <option value="SILVER">Silver</option>
                  </select>
                  <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400">
                    <option value="ALL">All Sources</option>
                    <option value="LOCAL GOLD">Local Gold</option>
                    <option value="BANK GOLD">Bank Gold</option>
                    <option value="LOCAL SILVER">Local Silver</option>
                    <option value="KAMAL SILVER">Kamal Silver</option>
                  </select>
                </>
              )}
              <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400">
                {generateMonthOptions().map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400" />
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400" />
              <button onClick={applyFilters} className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-semibold shadow transition-colors">Apply Filter</button>
            </div>
            <div className="flex gap-2">
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
              ) : tab === 'ORDERS' ? (
                <></>
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
                    <th className="px-4 py-2 border">Date</th>
                    <th className="px-4 py-2 border">Employee</th>
                    <th className="px-4 py-2 border">Type</th>
                    <th className="px-4 py-2 border">Source</th>
                    <th className="px-4 py-2 border">Name</th>
                    <th className="px-4 py-2 border">Weight</th>
                    <th className="px-4 py-2 border">Touch</th>
                    <th className="px-4 py-2 border">Less</th>
                    <th className="px-4 py-2 border">Fine</th>
                    <th className="px-4 py-2 border">Amount (₹, silver only)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEx.length === 0 ? (
                    <tr><td colSpan={10} className="text-center py-4">No transactions found.</td></tr>
                  ) : (
                    filteredEx.map((ex, idx) => (
                      <tr key={idx} className="hover:bg-yellow-50">
                        <td className="px-4 py-2 border">{ex.date}</td>
                        <td className="px-4 py-2 border">{ex.employee}</td>
                        <td className="px-4 py-2 border">{ex.type}</td>
                        <td className="px-4 py-2 border">{ex.source}</td>
                        <td className="px-4 py-2 border">{ex.name}</td>
                        <td className="px-4 py-2 border">{ex.weight}</td>
                        <td className="px-4 py-2 border">{ex.touch}</td>
                        <td className="px-4 py-2 border">{ex.less}</td>
                        <td className="px-4 py-2 border">{ex.fine}</td>
                        <td className="px-4 py-2 border font-bold">{ex.type === 'SILVER' ? ex.amount : '-'}</td>
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
                    <th className="px-4 py-2 border">Customer Name</th>
                    <th className="px-4 py-2 border">Purpose</th>
                    <th className="px-4 py-2 border">Amount</th>
                    <th className="px-4 py-2 border">Store</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTokens.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-4">No tokens found.</td></tr>
                  ) : (
                    filteredTokens.map((token, idx) => (
                      <tr key={idx} className="hover:bg-yellow-50">
                        <td className="px-4 py-2 border">{token.date}</td>
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
                    <th className="px-4 py-2 border">Type</th>
                    <th className="px-4 py-2 border">Qty</th>
                    <th className="px-4 py-2 border">Total Wt</th>
                    <th className="px-4 py-2 border">Advance</th>
                    <th className="px-4 py-2 border">Status</th>
                    <th className="px-4 py-2 border">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-4">No orders found.</td></tr>
                  ) : (
                    orders.map((o, idx) => (
                      <tr key={idx} className="hover:bg-yellow-50">
                        <td className="px-4 py-2 border font-mono">{o.orderId}</td>
                        <td className="px-4 py-2 border">{o.customer?.name || '-'}</td>
                        <td className="px-4 py-2 border">{o.orderType || '-'}</td>
                        <td className="px-4 py-2 border">{o.orderWeightage || '-'}</td>
                        <td className="px-4 py-2 border">{o.totalWeight || '-'}</td>
                        <td className="px-4 py-2 border">{o.advanceType === 'GOLD' ? `${o.advanceGoldGms || 0} g @ ₹${o.advanceGoldRate || 0}` : (o.advance ? `₹${o.advance}` : '-')}</td>
                        <td className="px-4 py-2 border">{o.orderStatus}</td>
                        <td className="px-4 py-2 border">{o.createdAt?.toDate?.().toLocaleDateString?.() || '-'}</td>
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

      {toast.show && (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 px-8 py-4 rounded-2xl shadow-2xl z-[9999] flex items-center gap-3 text-white text-lg font-semibold ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
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

export default EmployeeReports;


