import React, { useState, useEffect } from 'react';
import { useTallyKeyboard } from './hooks/useTallyKeyboard';
import TallySalesInvoice from './TallySalesInvoice';
import TallyPurchaseInvoice from './TallyPurchaseInvoice';
import PartyLedger from './PartyLedger';
import { useAuth } from './hooks/AuthContext';
import LoginScreen from './LoginScreen';

const API_BASE = 'http://localhost:5010/api';

const originalFetch = window.fetch;
const fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const token = localStorage.getItem('openledger_token');
  if (typeof input === 'string' && input.startsWith(API_BASE) && token) {
    init = {
      ...init,
      headers: {
        ...init?.headers,
        'Authorization': `Bearer ${token}`
      }
    };
  }
  return originalFetch(input, init);
};

const getOSClientName = () => {
  const ua = window.navigator.userAgent;
  if (/Macintosh|MacIntel|MacPPC|Mac68K/gi.test(ua)) {
    return 'Mac Client';
  } else if (/Win32|Win64|Windows|wince/gi.test(ua)) {
    return 'Windows Client';
  } else if (/Linux/gi.test(ua)) {
    return 'Linux Client';
  } else if (/Android/gi.test(ua)) {
    return 'Android Client';
  } else if (/iPhone|iPad|iPod/gi.test(ua)) {
    return 'iOS Client';
  }
  return 'Client';
};

type Screen =
  | 'COMPANY_SELECT'
  | 'COMPANY_CREATE'
  | 'COMPANY_ALTER_LIST'
  | 'COMPANY_ALTER'
  | 'GATEWAY'
  | 'ACCOUNTS_INFO_MENU'
  | 'LEDGER_MENU'
  | 'GROUP_MENU'
  | 'LEDGER_CREATE'
  | 'LEDGER_DISPLAY_LIST'
  | 'LEDGER_ALTER_LIST'
  | 'GROUP_CREATE'
  | 'GROUP_DISPLAY_LIST'
  | 'GROUP_ALTER_LIST'
  | 'STOCK_CREATE'
  | 'VOUCHER_ENTRY'
  | 'REPORT_TRIAL_BALANCE'
  | 'REPORT_DAY_BOOK'
  | 'REPORT_PROFIT_LOSS'
  | 'REPORT_BALANCE_SHEET'
  | 'REPORT_STOCK_SUMMARY'
  | 'ITEMGROUPS_MASTER'
  | 'SALESGROUPS_MASTER'
  | 'CUSTOMER_MENU'
  | 'CUSTOMER_CREATE'
  | 'CUSTOMER_DISPLAY_LIST'
  | 'CUSTOMER_ALTER_LIST'
  | 'SALES_INVOICE_ENTRY'
  | 'REPORT_SALES_BY_CUSTOMER'
  | 'PARTY_LEDGER'
  | 'PRICE_LIST'
  | 'SUPPLIER_MENU'
  | 'SUPPLIER_CREATE'
  | 'SUPPLIER_DISPLAY_LIST'
  | 'SUPPLIER_ALTER_LIST'
  | 'PURCHASE_INVOICE_ENTRY'
  | 'REPORT_LEDGER_STATEMENT'
  | 'REPORT_SALES_REGISTER'
  | 'REPORT_PURCHASE_REGISTER'
  | 'REPORT_CASH_FLOW'
  | 'REPORT_RECEIVABLES'
  | 'REPORT_PAYABLES'
  | 'REPORT_GST_SUMMARY'
  | 'VOUCHER_LIST'
  | 'VOUCHER_ALTER';

interface Company {
  id: string;
  name: string;
  mailingName?: string;
  address?: string;
  state?: string;
  country?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  financialYearFrom: string;
  booksBeginningFrom: string;
  currencySymbol: string;
}

interface MenuItem {
  label: string;
  hotkey: string; // Single letter (must be unique in list)
  action: () => void;
}

function fmtDateForDisplay(dateStr: string, separator: string = ' ') {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  // Use UTC values or split values to prevent timezone offset shifts
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parts[2];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[monthIdx];
  return `${day}${separator}${month}${separator}${year}`;
}

export default function App() {
  const { isAuthenticated, logout, user } = useAuth();
  
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  const [currentScreen, setCurrentScreen] = useState<Screen>('COMPANY_SELECT');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [systemClock, setSystemClock] = useState('');
  
  // Loaded data for ledger/stock creation & drop-downs
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [stockItems, setStockItems] = useState<any[]>([]);

  // Menu navigation index
  const [menuIndex, setMenuIndex] = useState(0);

  // --- Form States ---
  // Company Create
  const [compName, setCompName] = useState('');
  const [compMailing, setCompMailing] = useState('');
  const [compAddress, setCompAddress] = useState('');
  const [compState, setCompState] = useState('Gujarat');
  const [compCountry, setCompCountry] = useState('India');
  const [compPincode, setCompPincode] = useState('');
  const [compPhone, setCompPhone] = useState('');
  const [compEmail, setCompEmail] = useState('');
  const [compFYStart, setCompFYStart] = useState('2026-04-01');
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);

  // Ledger Create
  const [ledName, setLedName] = useState('');
  const [ledGroupId, setLedGroupId] = useState('');
  const [ledOpeningBal, setLedOpeningBal] = useState('0');
  const [ledBalType, setLedBalType] = useState<'Dr' | 'Cr'>('Dr');
  
  // Party Details (for Ledger Create)
  const [ledContactPerson, setLedContactPerson] = useState('');
  const [ledPhone, setLedPhone] = useState('');
  const [ledEmail, setLedEmail] = useState('');
  const [ledAddress, setLedAddress] = useState('');
  const [ledCity, setLedCity] = useState('');
  const [ledState, setLedState] = useState('');
  const [ledPincode, setLedPincode] = useState('');
  const [ledGstin, setLedGstin] = useState('');
  const [ledPanNo, setLedPanNo] = useState('');

  // Ledger Alter & Display States
  const [editingLedgerId, setEditingLedgerId] = useState<string | null>(null);
  const [isLedgerReadOnly, setIsLedgerReadOnly] = useState(false);
  const [ledSearchQuery, setLedSearchQuery] = useState('');

  // Account Group Master States
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [isGroupReadOnly, setIsGroupReadOnly] = useState(false);
  const [groupSearchQuery, setGroupSearchQuery] = useState('');

  // Price List States
  const [priceListChanges, setPriceListChanges] = useState<Record<string, { make?: string; salePrice?: string; purchasePrice?: string; discount?: string; openingQty?: string; openingRate?: string }>>({});
  const [priceListGroupFilter, setPriceListGroupFilter] = useState('ALL');
  const [priceListSearchQuery, setPriceListSearchQuery] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupParentId, setGroupParentId] = useState('');
  const [groupType, setGroupType] = useState<'Asset' | 'Liability' | 'Income' | 'Expense'>('Asset');

  // Stock Item Create
  const [stockName, setStockName] = useState('');
  const [stockAliasCode, setStockAliasCode] = useState('');
  const [stockUom, setStockUom] = useState('Pcs');
  const [stockOpenQty, setStockOpenQty] = useState('0');
  const [stockOpenRate, setStockOpenRate] = useState('0');
  const [stockItemGroupId, setStockItemGroupId] = useState('');
  const [stockSalePrice, setStockSalePrice] = useState('0');
  const [stockPurchasePrice, setStockPurchasePrice] = useState('0');
  const [stockDiscount, setStockDiscount] = useState('0');
  const [stockDescription, setStockDescription] = useState('');
  const [stockHsn, setStockHsn] = useState('');

  // Item Groups
  const [itemGroups, setItemGroups] = useState<any[]>([]);
  const [newItemGroupName, setNewItemGroupName] = useState('');
  const [newItemGroupDesc, setNewItemGroupDesc] = useState('');

  // Sales Groups
  const [salesGroups, setSalesGroups] = useState<any[]>([]);
  const [newSalesGroupName, setNewSalesGroupName] = useState('');
  const [newSalesGroupDesc, setNewSalesGroupDesc] = useState('');

  // Customers
  const [customers, setCustomers] = useState<any[]>([]);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerGSTIN, setNewCustomerGSTIN] = useState('');
  const [editCustomerId, setEditCustomerId] = useState<string | null>(null);

  // Suppliers
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierEmail, setNewSupplierEmail] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [newSupplierGSTIN, setNewSupplierGSTIN] = useState('');
  const [newSupplierAddress, setNewSupplierAddress] = useState('');
  const [newSupplierCity, setNewSupplierCity] = useState('');
  const [newSupplierState, setNewSupplierState] = useState('');
  const [newSupplierPanNo, setNewSupplierPanNo] = useState('');
  const [editSupplierId, setEditSupplierId] = useState<string | null>(null);
  const [newSupplierGroupId, setNewSupplierGroupId] = useState('');
  const [isCustomerReadOnly, setIsCustomerReadOnly] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');



  // System Date and Financial Period State
  const [currentDate, setCurrentDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [currentPeriodStart, setCurrentPeriodStart] = useState('2026-04-01');
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState('2027-03-31');

  // Modals visibility
  const [showChangeDate, setShowChangeDate] = useState(false);
  const [showChangePeriod, setShowChangePeriod] = useState(false);

  // Temporary modal inputs
  const [tempDate, setTempDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [tempPeriodStart, setTempPeriodStart] = useState('2026-04-01');
  const [tempPeriodEnd, setTempPeriodEnd] = useState('2027-03-31');

  // Voucher Entry
  const [vType, setVType] = useState<'CONTRA' | 'PAYMENT' | 'RECEIPT' | 'JOURNAL' | 'SALES' | 'PURCHASE'>('PAYMENT');
  const [vNum, setVNum] = useState('');
  const [vDate, setVDate] = useState(new Date().toISOString().split('T')[0]);
  const [vRef, setVRef] = useState('');
  const [vNarration, setVNarration] = useState('');
  const [vEntries, setVEntries] = useState<Array<{ ledgerId: string; amount: string; entryType: 'Dr' | 'Cr' }>>([
    { ledgerId: '', amount: '', entryType: 'Dr' },
    { ledgerId: '', amount: '', entryType: 'Cr' },
  ]);
  const [vInventory, setVInventory] = useState<Array<{ stockItemId: string; qty: string; rate: string }>>([]);

  // Reports Loaded Data
  const [reportData, setReportData] = useState<any>(null);

  // Status Alerts
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Fetch all companies initially
  const fetchCompanies = async () => {
    try {
      const res = await fetch(`${API_BASE}/companies`);
      const data = await res.json();
      setCompanies(data);
    } catch (err) {
      console.error('Error fetching companies', err);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      const parts = formatter.formatToParts(now);
      const day = parts.find(p => p.type === 'day')?.value || '';
      const month = parts.find(p => p.type === 'month')?.value || '';
      const year = parts.find(p => p.type === 'year')?.value || '';
      const hour = parts.find(p => p.type === 'hour')?.value || '';
      const minute = parts.find(p => p.type === 'minute')?.value || '';
      const second = parts.find(p => p.type === 'second')?.value || '';
      const dayPeriod = (parts.find(p => p.type === 'dayPeriod')?.value || '').toUpperCase();
      const formatted = `${day}-${month}-${year} ${hour}:${minute}:${second} ${dayPeriod}`;
      setSystemClock(formatted);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch support data when active company changes
  useEffect(() => {
    if (activeCompany) {
      fetchLedgersAndGroups();
      fetchStockItems();
      fetchItemGroups();
      fetchSalesGroups();
      fetchCustomers();
      fetchSuppliers();
    }
  }, [activeCompany]);

  const fetchLedgersAndGroups = async () => {
    if (!activeCompany) return;
    try {
      const [ledRes, grpRes] = await Promise.all([
        fetch(`${API_BASE}/accounts/${activeCompany.id}/ledgers`),
        fetch(`${API_BASE}/accounts/${activeCompany.id}/groups`),
      ]);
      const ledData = await ledRes.json();
      const grpData = await grpRes.json();
      setLedgers(ledData);
      setGroups(grpData);
      if (grpData.length > 0 && !ledGroupId) {
        setLedGroupId(grpData[0].id);
      }
    } catch (err) {
      console.error('Error loading account master data', err);
    }
  };

  const fetchStockItems = async () => {
    if (!activeCompany) return;
    try {
      const res = await fetch(`${API_BASE}/reports/${activeCompany.id}/stock-summary`);
      const data = await res.json();
      setStockItems(data);
    } catch (err) {
      console.error('Error loading stock items', err);
    }
  };

  const fetchItemGroups = async () => {
    if (!activeCompany) return;
    try {
      const res = await fetch(`${API_BASE}/itemgroups/${activeCompany.id}`);
      const data = await res.json();
      setItemGroups(data);
    } catch (err) {
      console.error('Error loading item groups', err);
    }
  };

  const fetchSalesGroups = async () => {
    if (!activeCompany) return;
    try {
      const res = await fetch(`${API_BASE}/salesgroups/${activeCompany.id}`);
      const data = await res.json();
      setSalesGroups(data);
    } catch (err) {
      console.error('Error loading sales groups', err);
    }
  };

  const fetchCustomers = async () => {
    if (!activeCompany) return;
    try {
      const res = await fetch(`${API_BASE}/billing/${activeCompany.id}/customers`);
      const data = await res.json();
      setCustomers(data);
    } catch (err) {
      console.error('Error loading customers', err);
    }
  };

  const fetchSuppliers = async () => {
    if (!activeCompany) return;
    try {
      const res = await fetch(`${API_BASE}/supplier/${activeCompany.id}/suppliers`);
      const data = await res.json();
      setSuppliers(data);
    } catch (err) {
      console.error('Error loading suppliers', err);
    }
  };

  const showStatus = (text: string, type: 'success' | 'error') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  // --- Handlers ---
  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compName) return showStatus('Company Name is required', 'error');
    try {
      const res = await fetch(`${API_BASE}/companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: compName,
          mailingName: compMailing || compName,
          address: compAddress,
          state: compState,
          country: compCountry,
          pincode: compPincode,
          phone: compPhone,
          email: compEmail,
          financialYearFrom: compFYStart,
          booksBeginningFrom: compFYStart,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      showStatus(`Company "${data.name}" created successfully!`, 'success');
      setCompanies([...companies, data]);
      setActiveCompany(data);
      setCurrentScreen('GATEWAY');
      // Reset form
      setCompName(''); setCompMailing(''); setCompAddress(''); setCompPincode(''); setCompPhone(''); setCompEmail('');
    } catch (err: any) {
      showStatus(err.message || 'Error creating company', 'error');
    }
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompanyId || !compName) return showStatus('Company Name is required', 'error');
    try {
      const res = await fetch(`${API_BASE}/companies/${editingCompanyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: compName,
          mailingName: compMailing || compName,
          address: compAddress,
          state: compState,
          country: compCountry,
          pincode: compPincode,
          phone: compPhone,
          email: compEmail,
          financialYearFrom: compFYStart,
          booksBeginningFrom: compFYStart,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      showStatus(`Company "${data.name}" updated successfully!`, 'success');
      setCompanies(companies.map(c => c.id === data.id ? data : c));
      if (activeCompany && activeCompany.id === data.id) {
        setActiveCompany(data);
      }
      setCurrentScreen('COMPANY_SELECT');
      // Reset form
      setCompName(''); setCompMailing(''); setCompAddress(''); setCompPincode(''); setCompPhone(''); setCompEmail('');
      setEditingCompanyId(null);
    } catch (err: any) {
      showStatus(err.message || 'Error updating company', 'error');
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (!window.confirm('Delete Company?')) return;
    if (!window.confirm('Are you sure you want to delete this company and all its data? This action CANNOT be undone!')) return;
    
    try {
      const res = await fetch(`${API_BASE}/companies/${companyId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(await res.text());
      
      showStatus('Company deleted successfully!', 'success');
      setCompanies(companies.filter(c => c.id !== companyId));
      if (activeCompany && activeCompany.id === companyId) {
        setActiveCompany(null);
      }
      setCurrentScreen('COMPANY_SELECT');
      // Reset form
      setCompName(''); setCompMailing(''); setCompAddress(''); setCompPincode(''); setCompPhone(''); setCompEmail('');
      setEditingCompanyId(null);
    } catch (err: any) {
      showStatus(err.message || 'Error deleting company', 'error');
    }
  };

  const handleCreateLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany) return;
    if (!ledName || !ledGroupId) return showStatus('Ledger Name and Group are required', 'error');

    try {
      const url = editingLedgerId 
        ? `${API_BASE}/accounts/${activeCompany.id}/ledgers/${editingLedgerId}`
        : `${API_BASE}/accounts/${activeCompany.id}/ledgers`;
      const method = editingLedgerId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ledName,
          groupId: ledGroupId,
          openingBalance: parseFloat(ledOpeningBal) || 0.0,
          balanceType: ledBalType,
          contactPerson: ledContactPerson,
          phone: ledPhone,
          email: ledEmail,
          address: ledAddress,
          city: ledCity,
          state: ledState,
          pincode: ledPincode,
          gstin: ledGstin,
          panNo: ledPanNo,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      showStatus(`Ledger "${ledName}" ${editingLedgerId ? 'updated' : 'created'} successfully!`, 'success');
      // Reset & Reload
      setLedName('');
      setLedOpeningBal('0');
      setLedContactPerson('');
      setLedPhone('');
      setLedEmail('');
      setLedAddress('');
      setLedCity('');
      setLedState('');
      setLedPincode('');
      setLedGstin('');
      setLedPanNo('');
      setEditingLedgerId(null);
      fetchLedgersAndGroups();
      setCurrentScreen('LEDGER_MENU');
    } catch (err: any) {
      showStatus(err.message || 'Error saving ledger', 'error');
    }
  };

  const handleDeleteLedger = async () => {
    if (!activeCompany || !editingLedgerId) return;
    if (!window.confirm(`Are you sure you want to delete the ledger "${ledName}"?`)) return;

    try {
      const res = await fetch(`${API_BASE}/accounts/${activeCompany.id}/ledgers/${editingLedgerId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errText = await res.json();
        throw new Error(errText.error || 'Failed to delete ledger');
      }
      showStatus(`Ledger "${ledName}" deleted successfully!`, 'success');
      setLedName('');
      setEditingLedgerId(null);
      fetchLedgersAndGroups();
      setCurrentScreen('LEDGER_ALTER_LIST');
    } catch (err: any) {
      showStatus(err.message || 'Error deleting ledger', 'error');
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany) return;
    if (!groupName || !groupType) return showStatus('Group Name and Type are required', 'error');

    try {
      const url = editingGroupId 
        ? `${API_BASE}/accounts/${activeCompany.id}/groups/${editingGroupId}`
        : `${API_BASE}/accounts/${activeCompany.id}/groups`;
      const method = editingGroupId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: groupName,
          parentId: groupParentId || null,
          groupType
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      showStatus(`Group "${groupName}" ${editingGroupId ? 'updated' : 'created'} successfully!`, 'success');
      
      // Reset & Reload
      setGroupName('');
      setGroupParentId('');
      setGroupType('Asset');
      setEditingGroupId(null);
      fetchLedgersAndGroups();
      setCurrentScreen('GROUP_MENU');
    } catch (err: any) {
      showStatus(err.message || 'Error saving group', 'error');
    }
  };

  const handleDeleteGroup = async () => {
    if (!activeCompany || !editingGroupId) return;
    if (!window.confirm(`Are you sure you want to delete the group "${groupName}"?`)) return;

    try {
      const res = await fetch(`${API_BASE}/accounts/${activeCompany.id}/groups/${editingGroupId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errText = await res.json();
        throw new Error(errText.error || 'Failed to delete group');
      }
      showStatus(`Group "${groupName}" deleted successfully!`, 'success');
      setGroupName('');
      setEditingGroupId(null);
      fetchLedgersAndGroups();
      setCurrentScreen('GROUP_ALTER_LIST');
    } catch (err: any) {
      showStatus(err.message || 'Error deleting group', 'error');
    }
  };

  const handleCreateStockItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany) return;
    if (!stockName || !stockUom || !stockItemGroupId) return showStatus('Stock Name, Unit, and Item Group are required', 'error');

    try {
      const res = await fetch(`${API_BASE}/reports/${activeCompany.id}/stock-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: stockName,
          aliasCode: stockAliasCode || null,
          description: stockDescription || null,
          itemGroupId: stockItemGroupId,
          uom: stockUom,
          salePrice: parseFloat(stockSalePrice) || 0,
          purchasePrice: parseFloat(stockPurchasePrice) || 0,
          discount: parseFloat(stockDiscount) || 0,
          openingQty: parseFloat(stockOpenQty) || 0.0,
          openingRate: parseFloat(stockOpenRate) || 0.0,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      showStatus(`Stock Item "${stockName}" created successfully!`, 'success');
      // Reset & Reload
      setStockName('');
      setStockAliasCode('');
      setStockOpenQty('0');
      setStockOpenRate('0');
      setStockItemGroupId('');
      setStockSalePrice('0');
      setStockPurchasePrice('0');
      setStockDiscount('0');
      setStockDescription('');
      setStockHsn('');
      fetchStockItems();
      setCurrentScreen('GATEWAY');
    } catch (err: any) {
      showStatus(err.message || 'Error creating stock item', 'error');
    }
  };

  const handleSavePriceList = async () => {
    if (!activeCompany) return;
    const itemsToUpdate = Object.entries(priceListChanges).map(([id, changes]) => ({
      id,
      ...changes,
    }));

    if (itemsToUpdate.length === 0) {
      showStatus('No changes to save', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/reports/${activeCompany.id}/stock-items/bulk-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemsToUpdate),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      showStatus(`Successfully updated ${data.count} items`, 'success');
      setPriceListChanges({});
      fetchStockItems();
    } catch (err: any) {
      showStatus(err.message || 'Error saving price list changes', 'error');
    }
  };

  const handleCreateVoucher = async () => {
    if (!activeCompany) return;
    
    // Filter out blank entries
    const filteredEntries = vEntries.filter(e => e.ledgerId && e.amount);
    if (filteredEntries.length < 2) {
      return showStatus('Voucher must contain at least 2 entries (debit and credit)', 'error');
    }

    try {
      const res = await fetch(`${API_BASE}/vouchers/${activeCompany.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voucherType: vType,
          voucherNumber: vNum || undefined,
          date: vDate,
          referenceNo: vRef,
          narration: vNarration,
          entries: filteredEntries,
          inventory: vInventory.filter(i => i.stockItemId && i.qty && i.rate),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Voucher submission failed');
      
      showStatus(`Voucher recorded successfully!`, 'success');
      // Reset voucher state
      setVNum('');
      setVRef('');
      setVNarration('');
      setVEntries([
        { ledgerId: '', amount: '', entryType: 'Dr' },
        { ledgerId: '', amount: '', entryType: 'Cr' },
      ]);
      setVInventory([]);
      fetchLedgersAndGroups();
      fetchStockItems();
      setCurrentScreen('GATEWAY');
    } catch (err: any) {
      showStatus(err.message || 'Error submitting voucher', 'error');
    }
  };

  // Load report data
  const loadReport = async (reportType: 'trial-balance' | 'day-book' | 'profit-loss' | 'balance-sheet' | 'stock-summary') => {
    if (!activeCompany) return;
    try {
      let url = `${API_BASE}/reports/${activeCompany.id}/${reportType}`;
      if (reportType === 'balance-sheet') {
        url += `?to=${currentPeriodEnd}`;
      } else {
        url += `?from=${currentPeriodStart}&to=${currentPeriodEnd}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setReportData(data);
    } catch (err) {
      console.error(`Error loading report: ${reportType}`, err);
    }
  };

  // ===== NEW BILLING HANDLERS =====

  const handleCreateItemGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany) return;
    if (!newItemGroupName) return showStatus('Item Group Name is required', 'error');

    try {
      const res = await fetch(`${API_BASE}/itemgroups/${activeCompany.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newItemGroupName,
          description: newItemGroupDesc || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      showStatus(`Item Group "${newItemGroupName}" created!`, 'success');
      setNewItemGroupName('');
      setNewItemGroupDesc('');
      fetchItemGroups();
    } catch (err: any) {
      showStatus(err.message || 'Error creating item group', 'error');
    }
  };

  const handleCreateSalesGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany) return;
    if (!newSalesGroupName) return showStatus('Sales Group Name is required', 'error');

    try {
      const res = await fetch(`${API_BASE}/salesgroups/${activeCompany.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSalesGroupName,
          description: newSalesGroupDesc || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      showStatus(`Sales Group "${newSalesGroupName}" created!`, 'success');
      setNewSalesGroupName('');
      setNewSalesGroupDesc('');
      fetchSalesGroups();
    } catch (err: any) {
      showStatus(err.message || 'Error creating sales group', 'error');
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany) return;
    if (!newCustomerName) return showStatus('Customer Name is required', 'error');

    try {
      const url = editCustomerId 
        ? `${API_BASE}/billing/${activeCompany.id}/customers/${editCustomerId}`
        : `${API_BASE}/billing/${activeCompany.id}/customers`;
      const method = editCustomerId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCustomerName,
          email: newCustomerEmail || null,
          phone: newCustomerPhone || null,
          gstin: newCustomerGSTIN || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      showStatus(`Customer "${newCustomerName}" ${editCustomerId ? 'updated' : 'created'}!`, 'success');
      
      setNewCustomerName('');
      setNewCustomerEmail('');
      setNewCustomerPhone('');
      setNewCustomerGSTIN('');
      setEditCustomerId(null);
      fetchCustomers();
      setCurrentScreen('CUSTOMER_MENU');
    } catch (err: any) {
      showStatus(err.message || 'Error saving customer', 'error');
    }
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    if (!activeCompany) return;
    if (!window.confirm(`Are you sure you want to delete customer "${name}"?`)) return;

    try {
      const res = await fetch(`${API_BASE}/billing/${activeCompany.id}/customers/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(await res.text());
      showStatus(`Customer "${name}" deleted!`, 'success');
      
      if (editCustomerId === id) {
        setNewCustomerName('');
        setNewCustomerEmail('');
        setNewCustomerPhone('');
        setNewCustomerGSTIN('');
        setEditCustomerId(null);
      }
      fetchCustomers();
      setCurrentScreen('CUSTOMER_ALTER_LIST');
    } catch (err: any) {
      showStatus(err.message || 'Error deleting customer', 'error');
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany) return;
    if (!newSupplierName) return showStatus('Supplier Name is required', 'error');

    try {
      const url = editSupplierId 
        ? `${API_BASE}/supplier/${activeCompany.id}/suppliers/${editSupplierId}`
        : `${API_BASE}/supplier/${activeCompany.id}/suppliers`;
      const method = editSupplierId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSupplierName,
          email: newSupplierEmail || null,
          phone: newSupplierPhone || null,
          gstin: newSupplierGSTIN || null,
          address: newSupplierAddress || null,
          city: newSupplierCity || null,
          state: newSupplierState || null,
          panNo: newSupplierPanNo || null,
          groupId: newSupplierGroupId || undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      showStatus(`Supplier "${newSupplierName}" ${editSupplierId ? 'updated' : 'created'}!`, 'success');
      
      setNewSupplierName('');
      setNewSupplierEmail('');
      setNewSupplierPhone('');
      setNewSupplierGSTIN('');
      setNewSupplierAddress('');
      setNewSupplierCity('');
      setNewSupplierState('');
      setNewSupplierPanNo('');
      setNewSupplierGroupId('');
      setEditSupplierId(null);
      fetchSuppliers();
      setCurrentScreen('SUPPLIER_MENU');
    } catch (err: any) {
      showStatus(err.message || 'Error saving supplier', 'error');
    }
  };

  const handleDeleteSupplier = async (id: string, name: string) => {
    if (!activeCompany) return;
    if (!window.confirm(`Are you sure you want to delete supplier "${name}"?`)) return;

    try {
      const res = await fetch(`${API_BASE}/supplier/${activeCompany.id}/suppliers/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(await res.text());
      showStatus(`Supplier "${name}" deleted!`, 'success');
      
      if (editSupplierId === id) {
        setNewSupplierName('');
        setNewSupplierEmail('');
        setNewSupplierPhone('');
        setNewSupplierGSTIN('');
        setNewSupplierAddress('');
        setNewSupplierCity('');
        setNewSupplierState('');
        setNewSupplierPanNo('');
        setNewSupplierGroupId('');
        setEditSupplierId(null);
      }
      fetchSuppliers();
      setCurrentScreen('SUPPLIER_ALTER_LIST');
    } catch (err: any) {
      showStatus(err.message || 'Error deleting supplier', 'error');
    }
  };



  // Load report on screen change or period change
  useEffect(() => {
    setReportData(null); // Clear report data first to prevent type-mismatch crashes during transition
    if (!activeCompany) return;
    if (currentScreen === 'REPORT_TRIAL_BALANCE') loadReport('trial-balance');
    if (currentScreen === 'REPORT_DAY_BOOK') loadReport('day-book');
    if (currentScreen === 'REPORT_PROFIT_LOSS') loadReport('profit-loss');
    if (currentScreen === 'REPORT_BALANCE_SHEET') loadReport('balance-sheet');
    if (currentScreen === 'REPORT_STOCK_SUMMARY') loadReport('stock-summary');
    if (currentScreen === 'REPORT_SALES_BY_CUSTOMER') {
      // Load sales by customer report
      fetch(`${API_BASE}/billing/${activeCompany.id}/sales-by-customer`)
        .then(res => res.json())
        .then(data => setReportData(data))
        .catch(err => console.error('Error loading sales report', err));
    }
    if (currentScreen === 'REPORT_SALES_REGISTER') {
      fetch(`${API_BASE}/reports/${activeCompany.id}/sales-register?from=${currentPeriodStart}&to=${currentPeriodEnd}`)
        .then(res => res.json())
        .then(data => setReportData(data))
        .catch(err => console.error('Error loading sales register', err));
    }
    if (currentScreen === 'REPORT_PURCHASE_REGISTER') {
      fetch(`${API_BASE}/reports/${activeCompany.id}/purchase-register?from=${currentPeriodStart}&to=${currentPeriodEnd}`)
        .then(res => res.json())
        .then(data => setReportData(data))
        .catch(err => console.error('Error loading purchase register', err));
    }
    if (currentScreen === 'REPORT_CASH_FLOW') {
      fetch(`${API_BASE}/reports/${activeCompany.id}/cash-flow?from=${currentPeriodStart}&to=${currentPeriodEnd}`)
        .then(res => res.json())
        .then(data => setReportData(data))
        .catch(err => console.error('Error loading cash flow report', err));
    }
    if (currentScreen === 'REPORT_RECEIVABLES') {
      fetch(`${API_BASE}/reports/${activeCompany.id}/receivables?to=${currentPeriodEnd}`)
        .then(res => res.json())
        .then(data => setReportData(data))
        .catch(err => console.error('Error loading receivables', err));
    }
    if (currentScreen === 'REPORT_PAYABLES') {
      fetch(`${API_BASE}/reports/${activeCompany.id}/payables?to=${currentPeriodEnd}`)
        .then(res => res.json())
        .then(data => setReportData(data))
        .catch(err => console.error('Error loading payables', err));
    }
    if (currentScreen === 'REPORT_GST_SUMMARY') {
      fetch(`${API_BASE}/reports/${activeCompany.id}/gst-summary?from=${currentPeriodStart}&to=${currentPeriodEnd}`)
        .then(res => res.json())
        .then(data => setReportData(data))
        .catch(err => console.error('Error loading GST summary', err));
    }
  }, [currentScreen, activeCompany, currentPeriodStart, currentPeriodEnd]);

  // Global Escape key handler for reports and non-menu screens
  useEffect(() => {
    const handleReportEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const isInput = (e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA';
        if (isInput) return; // Don't interfere if user is typing
        
        // If on report screens, Escape should go back to Gateway
        if (
          currentScreen === 'REPORT_TRIAL_BALANCE' ||
          currentScreen === 'REPORT_DAY_BOOK' ||
          currentScreen === 'REPORT_PROFIT_LOSS' ||
          currentScreen === 'REPORT_BALANCE_SHEET' ||
          currentScreen === 'REPORT_STOCK_SUMMARY' ||
          currentScreen === 'REPORT_SALES_BY_CUSTOMER' ||
          currentScreen === 'REPORT_LEDGER_STATEMENT' ||
          currentScreen === 'REPORT_SALES_REGISTER' ||
          currentScreen === 'REPORT_PURCHASE_REGISTER' ||
          currentScreen === 'REPORT_CASH_FLOW' ||
          currentScreen === 'REPORT_RECEIVABLES' ||
          currentScreen === 'REPORT_PAYABLES' ||
          currentScreen === 'REPORT_GST_SUMMARY' ||
          currentScreen === 'VOUCHER_LIST'
        ) {
          e.preventDefault();
          setCurrentScreen('GATEWAY');
        }
      }
    };
    window.addEventListener('keydown', handleReportEscape);
    return () => window.removeEventListener('keydown', handleReportEscape);
  }, [currentScreen]);

  // Handle Voucher Type keys and number pad shortcuts
  useEffect(() => {
    const handleFunctionKeys = (e: KeyboardEvent) => {
      const switchVoucher = (type: typeof vType) => {
        e.preventDefault();
        setVType(type);
        setCurrentScreen('VOUCHER_ENTRY');
      };
      if (e.key === 'F4') switchVoucher('CONTRA');
      if (e.key === 'F5') switchVoucher('PAYMENT');
      if (e.key === 'F6') switchVoucher('RECEIPT');
      if (e.key === 'F7') switchVoucher('JOURNAL');
      if (e.key === 'F8') switchVoucher('SALES');
      if (e.key === 'F9') switchVoucher('PURCHASE');
    };
    window.addEventListener('keydown', handleFunctionKeys, true);
    return () => window.removeEventListener('keydown', handleFunctionKeys, true);
  }, [currentScreen, vType]);

  // --- Dynamic Menu Options Mapping ---
  const getMenuItems = (): MenuItem[] => {
    if (currentScreen === 'COMPANY_SELECT') {
      const usedHotkeys = new Set(['C', 'A']);
      const companyItems = companies.map(c => {
        let hotkey = '';
        for (const char of c.name) {
          const upperChar = char.toUpperCase();
          if (/[A-Z]/.test(upperChar) && !usedHotkeys.has(upperChar)) {
            hotkey = upperChar;
            usedHotkeys.add(upperChar);
            break;
          }
        }
        if (!hotkey) {
          hotkey = c.name.charAt(0).toUpperCase();
        }
        return {
          label: c.name,
          hotkey,
          action: () => {
            setActiveCompany(c);
            setCurrentScreen('GATEWAY');
          },
        };
      });

      return [
        ...companyItems,
        {
          label: 'Create Company',
          hotkey: 'C',
          action: () => {
            setCompName('');
            setCompMailing('');
            setCompAddress('');
            setCompState('Gujarat');
            setCompCountry('India');
            setCompPincode('');
            setCompPhone('');
            setCompEmail('');
            setCompFYStart('2026-04-01');
            setEditingCompanyId(null);
            setCurrentScreen('COMPANY_CREATE');
          },
        },
        {
          label: 'Alter Company',
          hotkey: 'A',
          action: () => setCurrentScreen('COMPANY_ALTER_LIST'),
        },
      ];
    }

    if (currentScreen === 'COMPANY_ALTER_LIST') {
      const usedHotkeys = new Set(['B']);
      const companyItems = companies.map(c => {
        let hotkey = '';
        for (const char of c.name) {
          const upperChar = char.toUpperCase();
          if (/[A-Z]/.test(upperChar) && !usedHotkeys.has(upperChar)) {
            hotkey = upperChar;
            usedHotkeys.add(upperChar);
            break;
          }
        }
        if (!hotkey) {
          hotkey = c.name.charAt(0).toUpperCase();
        }
        return {
          label: c.name,
          hotkey,
          action: () => {
            setEditingCompanyId(c.id);
            setCompName(c.name);
            setCompMailing(c.mailingName || '');
            setCompAddress(c.address || '');
            setCompState(c.state || '');
            setCompCountry(c.country || '');
            setCompPincode(c.pincode || '');
            setCompPhone(c.phone || '');
            setCompEmail(c.email || '');
            setCompFYStart(c.financialYearFrom ? c.financialYearFrom.split('T')[0] : '2026-04-01');
            setCurrentScreen('COMPANY_ALTER');
          },
        };
      });

      return [
        ...companyItems,
        {
          label: 'Back',
          hotkey: 'B',
          action: () => setCurrentScreen('COMPANY_SELECT'),
        },
      ];
    }

    if (currentScreen === 'GATEWAY') {
      return [
        { label: 'Accounts Info', hotkey: 'A', action: () => setCurrentScreen('ACCOUNTS_INFO_MENU') },
        { label: 'Inventory Info (Stock Creation)', hotkey: 'I', action: () => setCurrentScreen('STOCK_CREATE') },
        { label: 'Item Groups (Inventory Categories)', hotkey: 'G', action: () => setCurrentScreen('ITEMGROUPS_MASTER') },
        { label: 'Accounting Vouchers (Transaction)', hotkey: 'V', action: () => {
          setVType('PAYMENT');
          setCurrentScreen('VOUCHER_ENTRY');
        }},
        { label: 'Sales Groups (Invoice Categories)', hotkey: 'O', action: () => setCurrentScreen('SALESGROUPS_MASTER') },
        { label: 'Customers (Customer Master)', hotkey: 'M', action: () => setCurrentScreen('CUSTOMER_MENU') },
        { label: 'Suppliers (Supplier Master)', hotkey: 'U', action: () => setCurrentScreen('SUPPLIER_MENU') },
        { label: 'Sales Invoices (Billing)', hotkey: 'N', action: () => setCurrentScreen('SALES_INVOICE_ENTRY') },
        { label: 'Purchase Invoices (Entry)', hotkey: 'Y', action: () => setCurrentScreen('PURCHASE_INVOICE_ENTRY') },
        { label: 'Party Ledger (Receivables)', hotkey: 'L', action: () => setCurrentScreen('PARTY_LEDGER') },
        { label: 'Voucher List & Alteration', hotkey: 'X', action: () => setCurrentScreen('VOUCHER_LIST') },
        { label: 'Balance Sheet', hotkey: 'B', action: () => setCurrentScreen('REPORT_BALANCE_SHEET') },
        { label: 'Profit & Loss A/c', hotkey: 'P', action: () => setCurrentScreen('REPORT_PROFIT_LOSS') },
        { label: 'Stock Summary', hotkey: 'S', action: () => setCurrentScreen('REPORT_STOCK_SUMMARY') },
        { label: 'Price List (Inventory Price Manager)', hotkey: 'H', action: () => { fetchStockItems(); fetchItemGroups(); setPriceListChanges({}); setCurrentScreen('PRICE_LIST'); } },
        { label: 'Trial Balance', hotkey: 'T', action: () => setCurrentScreen('REPORT_TRIAL_BALANCE') },
        { label: 'Day Book', hotkey: 'D', action: () => setCurrentScreen('REPORT_DAY_BOOK') },
        { label: 'Sales Register', hotkey: 'E', action: () => setCurrentScreen('REPORT_SALES_REGISTER') },
        { label: 'Purchase Register', hotkey: 'F', action: () => setCurrentScreen('REPORT_PURCHASE_REGISTER') },
        { label: 'Cash Flow Statement', hotkey: 'W', action: () => setCurrentScreen('REPORT_CASH_FLOW') },
        { label: 'Outstanding Receivables', hotkey: 'J', action: () => setCurrentScreen('REPORT_RECEIVABLES') },
        { label: 'Outstanding Payables', hotkey: 'K', action: () => setCurrentScreen('REPORT_PAYABLES') },
        { label: 'GST Summary Report', hotkey: 'Z', action: () => setCurrentScreen('REPORT_GST_SUMMARY') },
        { label: 'Sales by Customer', hotkey: 'R', action: () => setCurrentScreen('REPORT_SALES_BY_CUSTOMER') },
        { label: 'Change Company', hotkey: 'C', action: () => {
          setActiveCompany(null);
          setCurrentScreen('COMPANY_SELECT');
        }},
      ];
    }

    if (currentScreen === 'ACCOUNTS_INFO_MENU') {
      return [
        { label: 'Groups', hotkey: 'G', action: () => setCurrentScreen('GROUP_MENU') },
        { label: 'Ledgers', hotkey: 'L', action: () => setCurrentScreen('LEDGER_MENU') },
        { label: 'Quit', hotkey: 'Q', action: () => setCurrentScreen('GATEWAY') },
      ];
    }

    if (currentScreen === 'LEDGER_MENU') {
      return [
        { label: 'Create', hotkey: 'C', action: () => {
          setEditingLedgerId(null);
          setIsLedgerReadOnly(false);
          setLedName('');
          setLedOpeningBal('0');
          setLedContactPerson('');
          setLedPhone('');
          setLedEmail('');
          setLedAddress('');
          setLedCity('');
          setLedState('');
          setLedPincode('');
          setLedGstin('');
          setLedPanNo('');
          if (groups.length > 0) {
            setLedGroupId(groups[0].id);
          }
          setCurrentScreen('LEDGER_CREATE');
        }},
        { label: 'Display', hotkey: 'D', action: () => {
          setLedSearchQuery('');
          setCurrentScreen('LEDGER_DISPLAY_LIST');
        }},
        { label: 'Alter', hotkey: 'A', action: () => {
          setLedSearchQuery('');
          setCurrentScreen('LEDGER_ALTER_LIST');
        }},
        { label: 'Quit', hotkey: 'Q', action: () => setCurrentScreen('ACCOUNTS_INFO_MENU') },
      ];
    }

    if (currentScreen === 'CUSTOMER_MENU') {
      return [
        { label: 'Create', hotkey: 'C', action: () => {
          setEditCustomerId(null);
          setIsCustomerReadOnly(false);
          setNewCustomerName('');
          setNewCustomerEmail('');
          setNewCustomerPhone('');
          setNewCustomerGSTIN('');
          setCurrentScreen('CUSTOMER_CREATE');
        }},
        { label: 'Display', hotkey: 'D', action: () => {
          setCustomerSearchQuery('');
          setCurrentScreen('CUSTOMER_DISPLAY_LIST');
        }},
        { label: 'Alter', hotkey: 'A', action: () => {
          setCustomerSearchQuery('');
          setCurrentScreen('CUSTOMER_ALTER_LIST');
        }},
        { label: 'Quit', hotkey: 'Q', action: () => setCurrentScreen('GATEWAY') },
      ];
    }

    if (currentScreen === 'SUPPLIER_MENU') {
      return [
        { label: 'Create', hotkey: 'C', action: () => {
          setEditSupplierId(null);
          setNewSupplierName('');
          setNewSupplierEmail('');
          setNewSupplierPhone('');
          setNewSupplierGSTIN('');
          setNewSupplierAddress('');
          setNewSupplierCity('');
          setNewSupplierState('');
          setNewSupplierPanNo('');
          setNewSupplierGroupId('');
          setCurrentScreen('SUPPLIER_CREATE');
        }},
        { label: 'Display', hotkey: 'D', action: () => {
          setCustomerSearchQuery(''); // Reuse or search state
          setCurrentScreen('SUPPLIER_DISPLAY_LIST');
        }},
        { label: 'Alter', hotkey: 'A', action: () => {
          setCustomerSearchQuery('');
          setCurrentScreen('SUPPLIER_ALTER_LIST');
        }},
        { label: 'Quit', hotkey: 'Q', action: () => setCurrentScreen('GATEWAY') },
      ];
    }

    if (currentScreen === 'GROUP_MENU') {
      return [
        { label: 'Create', hotkey: 'C', action: () => {
          setEditingGroupId(null);
          setIsGroupReadOnly(false);
          setGroupName('');
          setGroupParentId('');
          setGroupType('Asset');
          setCurrentScreen('GROUP_CREATE');
        }},
        { label: 'Display', hotkey: 'D', action: () => {
          setGroupSearchQuery('');
          setCurrentScreen('GROUP_DISPLAY_LIST');
        }},
        { label: 'Alter', hotkey: 'A', action: () => {
          setGroupSearchQuery('');
          setCurrentScreen('GROUP_ALTER_LIST');
        }},
        { label: 'Quit', hotkey: 'Q', action: () => setCurrentScreen('ACCOUNTS_INFO_MENU') },
      ];
    }

    return [];
  };

  const menuItems = getMenuItems();

  const isMenuScreen = currentScreen === 'COMPANY_SELECT' || 
                       currentScreen === 'COMPANY_ALTER_LIST' ||
                       currentScreen === 'GATEWAY' || 
                       currentScreen === 'ACCOUNTS_INFO_MENU' || 
                       currentScreen === 'LEDGER_MENU' || 
                       currentScreen === 'GROUP_MENU';

  // --- Keyboard Hook Listeners ---
  useTallyKeyboard(
    // Arrow Up
    () => {
      if (menuItems.length > 0 && isMenuScreen) {
        setMenuIndex(prev => (prev === 0 ? menuItems.length - 1 : prev - 1));
      }
    },
    // Arrow Down
    () => {
      if (menuItems.length > 0 && isMenuScreen) {
        setMenuIndex(prev => (prev === menuItems.length - 1 ? 0 : prev + 1));
      }
    },
    // Enter
    () => {
      // In menus, select option
      if (isMenuScreen && menuItems.length > 0 && menuItems[menuIndex]) {
        menuItems[menuIndex].action();
      }
    },
    // Escape (go back)
    () => {
      if (currentScreen === 'COMPANY_CREATE') setCurrentScreen('COMPANY_SELECT');
      else if (currentScreen === 'COMPANY_ALTER_LIST') setCurrentScreen('COMPANY_SELECT');
      else if (currentScreen === 'COMPANY_ALTER') setCurrentScreen('COMPANY_ALTER_LIST');
      else if (currentScreen === 'GATEWAY') {
        setActiveCompany(null);
        setCurrentScreen('COMPANY_SELECT');
      } 
      else if (currentScreen === 'ACCOUNTS_INFO_MENU') setCurrentScreen('GATEWAY');
      else if (currentScreen === 'LEDGER_MENU' || currentScreen === 'GROUP_MENU') setCurrentScreen('ACCOUNTS_INFO_MENU');
      else if (currentScreen === 'LEDGER_CREATE' || currentScreen === 'LEDGER_DISPLAY_LIST' || currentScreen === 'LEDGER_ALTER_LIST') {
        setCurrentScreen('LEDGER_MENU');
      }
      else if (currentScreen === 'GROUP_CREATE' || currentScreen === 'GROUP_DISPLAY_LIST' || currentScreen === 'GROUP_ALTER_LIST') {
        setCurrentScreen('GROUP_MENU');
      }
      else if (currentScreen === 'VOUCHER_ENTRY') setCurrentScreen('GATEWAY');
      else if (currentScreen !== 'COMPANY_SELECT') {
        setCurrentScreen('GATEWAY');
      }
    },
    // Hotkeys
    menuItems.map(m => ({ key: m.hotkey, action: m.action })),
    // Only enable menu keys when on menu screens
    !isMenuScreen
  );

  // Alt+D listener for deleting ledgers and groups in Alteration mode
  useEffect(() => {
    const handleAltD = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'd') {
        if (currentScreen === 'LEDGER_CREATE' && editingLedgerId && !isLedgerReadOnly) {
          e.preventDefault();
          handleDeleteLedger();
        } else if (currentScreen === 'GROUP_CREATE' && editingGroupId && !isGroupReadOnly) {
          e.preventDefault();
          handleDeleteGroup();
        } else if (currentScreen === 'COMPANY_ALTER' && editingCompanyId) {
          e.preventDefault();
          handleDeleteCompany(editingCompanyId);
        }
      }
    };
    window.addEventListener('keydown', handleAltD);
    return () => window.removeEventListener('keydown', handleAltD);
  }, [currentScreen, editingLedgerId, isLedgerReadOnly, editingGroupId, isGroupReadOnly, ledName, groupName, editingCompanyId]);

  // Alt+P listener for printing reports and invoices
  useEffect(() => {
    const handlePrintShortcut = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'p') {
        const printableScreens = [
          'REPORT_TRIAL_BALANCE',
          'REPORT_DAY_BOOK',
          'REPORT_PROFIT_LOSS',
          'REPORT_BALANCE_SHEET',
          'REPORT_STOCK_SUMMARY',
          'REPORT_SALES_BY_CUSTOMER',
          'SALES_INVOICE_ENTRY'
        ];
        if (printableScreens.includes(currentScreen)) {
          e.preventDefault();
          window.print();
        }
      }
    };
    window.addEventListener('keydown', handlePrintShortcut);
  }, [currentScreen]);

  // Ctrl+A listener for saving price list changes
  useEffect(() => {
    const handleSaveShortcut = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        if (currentScreen === 'PRICE_LIST') {
          e.preventDefault();
          handleSavePriceList();
        }
      }
    };
    window.addEventListener('keydown', handleSaveShortcut);
    return () => window.removeEventListener('keydown', handleSaveShortcut);
  }, [currentScreen, priceListChanges]);

  // Alt+R listener for resetting price list changes
  useEffect(() => {
    const handleResetShortcut = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'r') {
        if (currentScreen === 'PRICE_LIST') {
          e.preventDefault();
          setPriceListChanges({});
          fetchStockItems();
          showStatus('Changes reloaded & reset', 'success');
        }
      }
    };
    window.addEventListener('keydown', handleResetShortcut);
    return () => window.removeEventListener('keydown', handleResetShortcut);
  }, [currentScreen]);

  // Global F2 (Change Date) and Alt+F2 (Change Period) keyboard listener
  useEffect(() => {
    const handleDatePeriodShortcuts = (e: KeyboardEvent) => {
      if (showChangeDate || showChangePeriod) return;
      
      // F2 -> Change Date
      if (e.key === 'F2' && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        setTempDate(currentDate);
        setShowChangeDate(true);
      }
      // Alt + F2 -> Change Period
      if (e.key === 'F2' && e.altKey) {
        e.preventDefault();
        setTempPeriodStart(currentPeriodStart);
        setTempPeriodEnd(currentPeriodEnd);
        setShowChangePeriod(true);
      }
    };
    window.addEventListener('keydown', handleDatePeriodShortcuts);
    return () => window.removeEventListener('keydown', handleDatePeriodShortcuts);
  }, [currentDate, currentPeriodStart, currentPeriodEnd, showChangeDate, showChangePeriod]);

  // Keep menu index bounds safe on screen transition
  useEffect(() => {
    setMenuIndex(0);
  }, [currentScreen]);

  // Helper to highlight hotkey letter
  const renderItemLabel = (label: string, hotkey: string) => {
    const idx = label.toLowerCase().indexOf(hotkey.toLowerCase());
    if (idx === -1) {
      return (
        <span>
          {label} (<span className="hotkey-letter">{hotkey}</span>)
        </span>
      );
    }
    return (
      <span>
        {label.substring(0, idx)}
        <span className="hotkey-letter">{label.charAt(idx)}</span>
        {label.substring(idx + 1)}
      </span>
    );
  };

  return (
    <div className="tally-container">
      {/* Top Header */}
      <header className="tally-header">
        <div>
          <span className="tally-logo-text">OpenLedger ERP</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {systemClock && (
            <span style={{ color: '#fbbf24', fontFamily: "'Courier New', Courier, monospace", fontWeight: 'bold', fontSize: '12.5px' }}>
              IST: {systemClock}
            </span>
          )}
          {activeCompany ? (
            <span style={{ color: 'var(--tally-accent)' }}>Company: {activeCompany.name}</span>
          ) : (
            <span>No Company Selected</span>
          )}
          <div style={{ borderLeft: '1px solid #444', height: '24px' }}></div>
          <span style={{ color: '#aaa', fontSize: '12px' }}>{user?.email}</span>
          <button 
            onClick={logout}
            style={{ padding: '4px 10px', background: 'none', border: '1px solid #e94560', color: '#e94560', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Area */}
      <div className="tally-body">
        
        {/* Left Dashboard Panel */}
        <div className="tally-left-pane">
          <h3 style={{ borderBottom: '1px solid var(--tally-border)', paddingBottom: '5px', color: 'var(--tally-accent)' }}>
            CURRENT STATUS
          </h3>
          
          <table className="company-info-table">
            <tbody>
              <tr>
                <td>Current Period:</td>
                <td className="info-highlight" style={{ cursor: 'pointer' }} onClick={() => { setTempPeriodStart(currentPeriodStart); setTempPeriodEnd(currentPeriodEnd); setShowChangePeriod(true); }}>
                  {fmtDateForDisplay(currentPeriodStart, '-')} to {fmtDateForDisplay(currentPeriodEnd, '-')}
                </td>
              </tr>
              <tr>
                <td>Current Date:</td>
                <td className="info-highlight" style={{ cursor: 'pointer' }} onClick={() => { setTempDate(currentDate); setShowChangeDate(true); }}>
                  {fmtDateForDisplay(currentDate)}
                </td>
              </tr>
            </tbody>
          </table>

          <h3 style={{ marginTop: '25px', borderBottom: '1px solid var(--tally-border)', paddingBottom: '5px', color: 'var(--tally-accent)' }}>
            SELECTED COMPANIES
          </h3>
          
          {activeCompany ? (
            <table className="company-info-table">
              <thead>
                <tr>
                  <th>Name of Company</th>
                  <th style={{ textAlign: 'right' }}>Date of Last Entry</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bold-row">
                  <td>{activeCompany.name}</td>
                  <td style={{ textAlign: 'right' }}>No Vouchers</td>
                </tr>
              </tbody>
            </table>
          ) : (
            <p style={{ marginTop: '10px', color: 'var(--tally-text-secondary)', fontStyle: 'italic' }}>
              No companies selected. Use Arrow keys and Enter to select one.
            </p>
          )}

          {/* Quick Help/Controls */}
          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--tally-border-light)', paddingTop: '15px', fontSize: '11px', color: 'var(--tally-text-secondary)' }}>
            <p style={{ color: 'var(--tally-accent)', fontWeight: 600, marginBottom: '5px' }}>KEYBOARD CHEATSHEET:</p>
            <ul style={{ paddingLeft: '15px' }}>
              <li><kbd>↑</kbd> / <kbd>↓</kbd> : Move selection</li>
              <li><kbd>Enter</kbd> : Confirm / Open</li>
              <li><kbd>Esc</kbd> : Go Back / Quit</li>
              <li><kbd>Red letter</kbd> : Quick hotkey shortcut</li>
            </ul>
          </div>
        </div>

        {/* Right Work Area */}
        <div className="tally-right-pane">
          {statusMsg && (
            <div
              style={{
                position: 'absolute',
                top: '50px',
                right: '20px',
                padding: '10px 20px',
                borderRadius: '4px',
                background: statusMsg.type === 'success' ? '#00796b' : '#c62828',
                color: '#fff',
                fontWeight: 600,
                zIndex: 100,
                boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
              }}
            >
              {statusMsg.text}
            </div>
          )}

          {/* 1. SELECT COMPANY SCREEN */}
          {currentScreen === 'COMPANY_SELECT' && (
            <div className="tally-menu-card">
              <div className="tally-menu-title">SELECT COMPANY</div>
              <ul className="tally-menu-list">
                {menuItems.map((item, idx) => (
                  <li
                    key={item.label}
                    className={`tally-menu-item ${menuIndex === idx ? 'selected' : ''}`}
                    onClick={item.action}
                  >
                    {renderItemLabel(item.label, item.hotkey)}
                    <span>→</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 2. CREATE COMPANY SCREEN */}
          {currentScreen === 'COMPANY_CREATE' && (
            <div className="tally-form-card">
              <h2 className="tally-form-title">Create Company</h2>
              <form onSubmit={handleCreateCompany} className="form-grid">
                <span className="form-label">Company Name:</span>
                <input
                  type="text"
                  placeholder="e.g. Saurashtra Book Store"
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  required
                />

                <span className="form-label">Mailing Name:</span>
                <input
                  type="text"
                  placeholder="e.g. Saurashtra Book Store Private Ltd"
                  value={compMailing}
                  onChange={(e) => setCompMailing(e.target.value)}
                />

                <span className="form-label">Address:</span>
                <textarea
                  placeholder="Street, City"
                  value={compAddress}
                  onChange={(e) => setCompAddress(e.target.value)}
                  rows={2}
                />

                <span className="form-label">State:</span>
                <input
                  type="text"
                  placeholder="e.g. Gujarat"
                  value={compState}
                  onChange={(e) => setCompState(e.target.value)}
                />

                <span className="form-label">Country:</span>
                <input
                  type="text"
                  placeholder="e.g. India"
                  value={compCountry}
                  onChange={(e) => setCompCountry(e.target.value)}
                />

                <span className="form-label">Pincode:</span>
                <input
                  type="text"
                  placeholder="e.g. 360001"
                  value={compPincode}
                  onChange={(e) => setCompPincode(e.target.value)}
                />

                <span className="form-label">Phone No.:</span>
                <input
                  type="text"
                  placeholder="e.g. 0281-222444"
                  value={compPhone}
                  onChange={(e) => setCompPhone(e.target.value)}
                />

                <span className="form-label">Email Address:</span>
                <input
                  type="email"
                  placeholder="info@saurashtrabooks.com"
                  value={compEmail}
                  onChange={(e) => setCompEmail(e.target.value)}
                />

                <span className="form-label">Financial Year starts:</span>
                <input
                  type="date"
                  value={compFYStart}
                  onChange={(e) => setCompFYStart(e.target.value)}
                  required
                />

                <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
                  <button type="button" onClick={() => setCurrentScreen('COMPANY_SELECT')} style={{ background: '#757575', borderColor: '#616161' }}>
                    Cancel
                  </button>
                  <button type="submit">Create Company</button>
                </div>
              </form>
            </div>
          )}

          {/* 1b. ALTER COMPANY LIST SCREEN */}
          {currentScreen === 'COMPANY_ALTER_LIST' && (
            <div className="tally-menu-card">
              <div className="tally-menu-title">ALTER COMPANY</div>
              <ul className="tally-menu-list">
                {menuItems.map((item, idx) => (
                  <li
                    key={item.label}
                    className={`tally-menu-item ${menuIndex === idx ? 'selected' : ''}`}
                    onClick={item.action}
                  >
                    {renderItemLabel(item.label, item.hotkey)}
                    <span>→</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 2b. ALTER COMPANY SCREEN */}
          {currentScreen === 'COMPANY_ALTER' && (
            <div className="tally-form-card">
              <h2 className="tally-form-title">Alter Company</h2>
              <form onSubmit={handleUpdateCompany} className="form-grid">
                <span className="form-label">Company Name:</span>
                <input
                  type="text"
                  placeholder="e.g. Saurashtra Book Store"
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  required
                />

                <span className="form-label">Mailing Name:</span>
                <input
                  type="text"
                  placeholder="e.g. Saurashtra Book Store Private Ltd"
                  value={compMailing}
                  onChange={(e) => setCompMailing(e.target.value)}
                />

                <span className="form-label">Address:</span>
                <textarea
                  placeholder="Street, City"
                  value={compAddress}
                  onChange={(e) => setCompAddress(e.target.value)}
                  rows={2}
                />

                <span className="form-label">State:</span>
                <input
                  type="text"
                  placeholder="e.g. Gujarat"
                  value={compState}
                  onChange={(e) => setCompState(e.target.value)}
                />

                <span className="form-label">Country:</span>
                <input
                  type="text"
                  placeholder="e.g. India"
                  value={compCountry}
                  onChange={(e) => setCompCountry(e.target.value)}
                />

                <span className="form-label">Pincode:</span>
                <input
                  type="text"
                  placeholder="e.g. 360001"
                  value={compPincode}
                  onChange={(e) => setCompPincode(e.target.value)}
                />

                <span className="form-label">Phone No.:</span>
                <input
                  type="text"
                  placeholder="e.g. 0281-222444"
                  value={compPhone}
                  onChange={(e) => setCompPhone(e.target.value)}
                />

                <span className="form-label">Email Address:</span>
                <input
                  type="email"
                  placeholder="info@saurashtrabooks.com"
                  value={compEmail}
                  onChange={(e) => setCompEmail(e.target.value)}
                />

                <span className="form-label">Financial Year starts:</span>
                <input
                  type="date"
                  value={compFYStart}
                  onChange={(e) => setCompFYStart(e.target.value)}
                  required
                />

                <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
                  <button type="button" onClick={() => editingCompanyId && handleDeleteCompany(editingCompanyId)} style={{ background: '#d32f2f', borderColor: '#c62828', color: '#fff', marginRight: 'auto' }}>
                    Delete (Alt+D)
                  </button>
                  <button type="button" onClick={() => setCurrentScreen('COMPANY_ALTER_LIST')} style={{ background: '#757575', borderColor: '#616161' }}>
                    Cancel
                  </button>
                  <button type="submit">Alter Company</button>
                </div>
              </form>
            </div>
          )}

          {/* 3. GATEWAY OF TALLY MAIN MENU */}
          {currentScreen === 'GATEWAY' && (
            <div className="tally-menu-card">
              <div className="tally-menu-title">Gateway of Tally</div>
              <ul className="tally-menu-list">
                <li style={{ padding: '5px 25px', fontSize: '11px', color: 'var(--tally-text-secondary)', fontWeight: 600 }}>MASTERS</li>
                {menuItems.slice(0, 3).map((item, idx) => (
                  <li
                    key={item.label}
                    className={`tally-menu-item ${menuIndex === idx ? 'selected' : ''}`}
                    onClick={item.action}
                  >
                    {renderItemLabel(item.label, item.hotkey)}
                  </li>
                ))}
                
                <li style={{ padding: '10px 25px 5px', fontSize: '11px', color: 'var(--tally-text-secondary)', fontWeight: 600 }}>TRANSACTIONS</li>
                {menuItems.slice(3, 8).map((item, idx) => (
                  <li
                    key={item.label}
                    className={`tally-menu-item ${menuIndex === (idx + 3) ? 'selected' : ''}`}
                    onClick={item.action}
                  >
                    {renderItemLabel(item.label, item.hotkey)}
                  </li>
                ))}

                <li style={{ padding: '10px 25px 5px', fontSize: '11px', color: 'var(--tally-text-secondary)', fontWeight: 600 }}>REPORTS</li>
                {menuItems.slice(8).map((item, idx) => (
                  <li
                    key={item.label}
                    className={`tally-menu-item ${menuIndex === (idx + 8) ? 'selected' : ''}`}
                    onClick={item.action}
                  >
                    {renderItemLabel(item.label, item.hotkey)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ACCOUNTS INFO SUB-MENU */}
          {currentScreen === 'ACCOUNTS_INFO_MENU' && (
            <div className="tally-menu-card">
              <div className="tally-menu-title">Accounts Info.</div>
              <ul className="tally-menu-list">
                {menuItems.map((item, idx) => (
                  <li
                    key={item.label}
                    className={`tally-menu-item ${menuIndex === idx ? 'selected' : ''}`}
                    onClick={item.action}
                  >
                    {renderItemLabel(item.label, item.hotkey)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* LEDGERS SUB-MENU */}
          {currentScreen === 'LEDGER_MENU' && (
            <div className="tally-menu-card">
              <div className="tally-menu-title">Ledgers</div>
              <ul className="tally-menu-list">
                <li style={{ padding: '5px 25px', fontSize: '11px', color: 'var(--tally-text-secondary)', fontWeight: 600 }}>Single Ledger</li>
                {menuItems.slice(0, 3).map((item, idx) => (
                  <li
                    key={item.label}
                    className={`tally-menu-item ${menuIndex === idx ? 'selected' : ''}`}
                    onClick={item.action}
                  >
                    {renderItemLabel(item.label, item.hotkey)}
                  </li>
                ))}
                <li style={{ padding: '10px 25px 5px', fontSize: '11px', color: 'var(--tally-text-secondary)', fontWeight: 600 }}>Options</li>
                {menuItems.slice(3).map((item, idx) => (
                  <li
                    key={item.label}
                    className={`tally-menu-item ${menuIndex === (idx + 3) ? 'selected' : ''}`}
                    onClick={item.action}
                  >
                    {renderItemLabel(item.label, item.hotkey)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* GROUPS SUB-MENU */}
          {currentScreen === 'GROUP_MENU' && (
            <div className="tally-menu-card">
              <div className="tally-menu-title">Groups</div>
              <ul className="tally-menu-list">
                <li style={{ padding: '5px 25px', fontSize: '11px', color: 'var(--tally-text-secondary)', fontWeight: 600 }}>Single Group</li>
                {menuItems.slice(0, 3).map((item, idx) => (
                  <li
                    key={item.label}
                    className={`tally-menu-item ${menuIndex === idx ? 'selected' : ''}`}
                    onClick={item.action}
                  >
                    {renderItemLabel(item.label, item.hotkey)}
                  </li>
                ))}
                <li style={{ padding: '10px 25px 5px', fontSize: '11px', color: 'var(--tally-text-secondary)', fontWeight: 600 }}>Options</li>
                {menuItems.slice(3).map((item, idx) => (
                  <li
                    key={item.label}
                    className={`tally-menu-item ${menuIndex === (idx + 3) ? 'selected' : ''}`}
                    onClick={item.action}
                  >
                    {renderItemLabel(item.label, item.hotkey)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CUSTOMERS SUB-MENU */}
          {currentScreen === 'CUSTOMER_MENU' && (
            <div className="tally-menu-card">
              <div className="tally-menu-title">Customers</div>
              <ul className="tally-menu-list">
                <li style={{ padding: '5px 25px', fontSize: '11px', color: 'var(--tally-text-secondary)', fontWeight: 600 }}>Single Customer</li>
                {menuItems.slice(0, 3).map((item, idx) => (
                  <li
                    key={item.label}
                    className={`tally-menu-item ${menuIndex === idx ? 'selected' : ''}`}
                    onClick={item.action}
                  >
                    {renderItemLabel(item.label, item.hotkey)}
                  </li>
                ))}
                <li style={{ padding: '10px 25px 5px', fontSize: '11px', color: 'var(--tally-text-secondary)', fontWeight: 600 }}>Options</li>
                {menuItems.slice(3).map((item, idx) => (
                  <li
                    key={item.label}
                    className={`tally-menu-item ${menuIndex === (idx + 3) ? 'selected' : ''}`}
                    onClick={item.action}
                  >
                    {renderItemLabel(item.label, item.hotkey)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 4. MASTER LEDGER CREATE SCREEN */}
          {currentScreen === 'LEDGER_CREATE' && (() => {
            const selectedGroup = groups.find(g => g.id === ledGroupId);
            const isPartyGroup = selectedGroup && (
              selectedGroup.name.toLowerCase().includes('sundry') ||
              selectedGroup.name.toLowerCase().includes('debtor') ||
              selectedGroup.name.toLowerCase().includes('creditor')
            );
            
            let screenTitle = "Ledger Creation";
            if (isLedgerReadOnly) screenTitle = "Ledger Display";
            else if (editingLedgerId) screenTitle = "Ledger Alteration";

            const handleCancel = () => {
              if (isLedgerReadOnly) setCurrentScreen('LEDGER_DISPLAY_LIST');
              else if (editingLedgerId) setCurrentScreen('LEDGER_ALTER_LIST');
              else setCurrentScreen('LEDGER_MENU');
            };

            return (
            <div className="tally-form-card" style={{ maxWidth: '800px' }}>
              <h2 className="tally-form-title">{screenTitle}</h2>
              <form onSubmit={handleCreateLedger} className="form-grid">
                <span className="form-label">Ledger Name:</span>
                <input
                  type="text"
                  placeholder="e.g. Purchase A/c, HDFC Bank, Saurashtra Traders"
                  value={ledName}
                  onChange={(e) => setLedName(e.target.value)}
                  disabled={isLedgerReadOnly}
                  required
                />

                <span className="form-label">Under Group:</span>
                <select 
                  value={ledGroupId} 
                  onChange={(e) => setLedGroupId(e.target.value)} 
                  disabled={isLedgerReadOnly}
                  required
                >
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({group.groupType})
                    </option>
                  ))}
                </select>

                <span className="form-label">Opening Balance:</span>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="number"
                    value={ledOpeningBal}
                    onChange={(e) => setLedOpeningBal(e.target.value)}
                    style={{ flex: 1 }}
                    disabled={isLedgerReadOnly}
                  />
                  <select 
                    value={ledBalType} 
                    onChange={(e) => setLedBalType(e.target.value as 'Dr' | 'Cr')} 
                    style={{ width: '80px' }}
                    disabled={isLedgerReadOnly}
                  >
                    <option value="Dr">Dr</option>
                    <option value="Cr">Cr</option>
                  </select>
                </div>

                {isPartyGroup && (
                  <div style={{ gridColumn: 'span 2', marginTop: '10px' }}>
                    <h3 style={{ borderBottom: '1px solid #ccc', paddingBottom: '5px', marginBottom: '15px' }}>Mailing & Contact Details</h3>
                    <div className="form-grid">
                      <span className="form-label">Contact Person:</span>
                      <input type="text" value={ledContactPerson} onChange={e => setLedContactPerson(e.target.value)} disabled={isLedgerReadOnly} />
                      
                      <span className="form-label">Phone:</span>
                      <input type="text" value={ledPhone} onChange={e => setLedPhone(e.target.value)} disabled={isLedgerReadOnly} />

                      <span className="form-label">Email:</span>
                      <input type="email" value={ledEmail} onChange={e => setLedEmail(e.target.value)} disabled={isLedgerReadOnly} />

                      <span className="form-label">Address:</span>
                      <textarea value={ledAddress} onChange={e => setLedAddress(e.target.value)} rows={2} disabled={isLedgerReadOnly}></textarea>

                      <span className="form-label">City:</span>
                      <input type="text" value={ledCity} onChange={e => setLedCity(e.target.value)} disabled={isLedgerReadOnly} />

                      <span className="form-label">State:</span>
                      <input type="text" value={ledState} onChange={e => setLedState(e.target.value)} disabled={isLedgerReadOnly} />

                      <span className="form-label">Pincode:</span>
                      <input type="text" value={ledPincode} onChange={e => setLedPincode(e.target.value)} disabled={isLedgerReadOnly} />

                      <h3 style={{ gridColumn: 'span 2', borderBottom: '1px solid #ccc', paddingBottom: '5px', marginTop: '10px', marginBottom: '15px' }}>Tax Details</h3>

                      <span className="form-label">GSTIN/UIN:</span>
                      <input type="text" value={ledGstin} onChange={e => setLedGstin(e.target.value)} disabled={isLedgerReadOnly} />

                      <span className="form-label">PAN No:</span>
                      <input type="text" value={ledPanNo} onChange={e => setLedPanNo(e.target.value)} disabled={isLedgerReadOnly} />
                    </div>
                  </div>
                )}

                <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                  {editingLedgerId && !isLedgerReadOnly && (
                    <button 
                      type="button" 
                      onClick={handleDeleteLedger} 
                      style={{ background: '#d32f2f', borderColor: '#c62828', color: '#fff', marginRight: 'auto' }}
                    >
                      Delete Ledger (Alt+D)
                    </button>
                  )}
                  <button type="button" onClick={handleCancel} style={{ background: '#757575', borderColor: '#616161' }}>
                    {isLedgerReadOnly ? 'Back' : 'Cancel'}
                  </button>
                  {!isLedgerReadOnly && (
                    <button type="submit">
                      {editingLedgerId ? 'Alter Ledger' : 'Create Ledger'}
                    </button>
                  )}
                </div>
              </form>
            </div>
            );
          })()}

          {/* LEDGER DISPLAY & ALTER LIST SCREENS */}
          {(currentScreen === 'LEDGER_DISPLAY_LIST' || currentScreen === 'LEDGER_ALTER_LIST') && (
            <div className="tally-form-card" style={{ maxWidth: '600px', width: '100%' }}>
              <h2 className="tally-form-title">
                {currentScreen === 'LEDGER_DISPLAY_LIST' ? 'List of Ledgers (Display Mode)' : 'List of Ledgers (Alteration Mode)'}
              </h2>
              
              <div style={{ marginBottom: '15px' }}>
                <input
                  type="text"
                  placeholder="🔍 Search ledger by name..."
                  value={ledSearchQuery}
                  onChange={(e) => setLedSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px' }}
                  autoFocus
                />
              </div>

              <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--tally-border-light)', borderRadius: '4px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }} className="report-table">
                  <thead>
                    <tr style={{ background: 'var(--tally-bg-mid)', borderBottom: '1px solid var(--tally-border)' }}>
                      <th style={{ padding: '8px', textAlign: 'left', color: 'var(--tally-accent)' }}>Ledger Name</th>
                      <th style={{ padding: '8px', textAlign: 'left', color: 'var(--tally-accent)' }}>Under Group</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgers
                      .filter(l => l.name.toLowerCase().includes(ledSearchQuery.toLowerCase()))
                      .map(ledger => {
                        const isAlter = currentScreen === 'LEDGER_ALTER_LIST';
                        const selectLedger = () => {
                          setEditingLedgerId(ledger.id);
                          setIsLedgerReadOnly(!isAlter);
                          
                          // Populate states
                          setLedName(ledger.name);
                          setLedGroupId(ledger.groupId);
                          setLedOpeningBal(String(ledger.openingBalance || 0));
                          setLedBalType((ledger.balanceType as 'Dr' | 'Cr') || 'Dr');
                          setLedContactPerson(ledger.contactPerson || '');
                          setLedPhone(ledger.phone || '');
                          setLedEmail(ledger.email || '');
                          setLedAddress(ledger.address || '');
                          setLedCity(ledger.city || '');
                          setLedState(ledger.state || '');
                          setLedPincode(ledger.pincode || '');
                          setLedGstin(ledger.gstin || '');
                          setLedPanNo(ledger.panNo || '');
                          
                          setCurrentScreen('LEDGER_CREATE');
                        };

                        return (
                          <tr 
                            key={ledger.id} 
                            onClick={selectLedger}
                            className="clickable-row"
                            style={{ borderBottom: '1px solid var(--tally-border-light)' }}
                          >
                            <td style={{ padding: '10px 8px', fontWeight: 600 }}>{ledger.name}</td>
                            <td style={{ padding: '10px 8px', color: 'var(--tally-text-secondary)' }}>{ledger.groupName || 'Primary'}</td>
                          </tr>
                        );
                      })}
                    {ledgers.filter(l => l.name.toLowerCase().includes(ledSearchQuery.toLowerCase())).length === 0 && (
                      <tr>
                        <td colSpan={2} style={{ padding: '20px', textAlign: 'center', color: 'var(--tally-text-secondary)' }}>
                          No ledgers matched your search
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setCurrentScreen('LEDGER_MENU')} style={{ background: '#757575', borderColor: '#616161' }}>
                  Back (Esc)
                </button>
              </div>
            </div>
          )}

          {/* GROUP DISPLAY & ALTER LIST SCREENS */}
          {(currentScreen === 'GROUP_DISPLAY_LIST' || currentScreen === 'GROUP_ALTER_LIST') && (
            <div className="tally-form-card" style={{ maxWidth: '600px', width: '100%' }}>
              <h2 className="tally-form-title">
                {currentScreen === 'GROUP_DISPLAY_LIST' ? 'List of Groups (Display Mode)' : 'List of Groups (Alteration Mode)'}
              </h2>
              
              <div style={{ marginBottom: '15px' }}>
                <input
                  type="text"
                  placeholder="🔍 Search group by name..."
                  value={groupSearchQuery}
                  onChange={(e) => setGroupSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px' }}
                  autoFocus
                />
              </div>

              <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--tally-border-light)', borderRadius: '4px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }} className="report-table">
                  <thead>
                    <tr style={{ background: 'var(--tally-bg-mid)', borderBottom: '1px solid var(--tally-border)' }}>
                      <th style={{ padding: '8px', textAlign: 'left', color: 'var(--tally-accent)' }}>Group Name</th>
                      <th style={{ padding: '8px', textAlign: 'left', color: 'var(--tally-accent)' }}>Parent Group</th>
                      <th style={{ padding: '8px', textAlign: 'left', color: 'var(--tally-accent)' }}>Group Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups
                      .filter(g => g.name.toLowerCase().includes(groupSearchQuery.toLowerCase()))
                      .map(group => {
                        const isAlter = currentScreen === 'GROUP_ALTER_LIST';
                        const selectGroup = () => {
                          setEditingGroupId(group.id);
                          setIsGroupReadOnly(!isAlter);
                          
                          // Populate states
                          setGroupName(group.name);
                          setGroupParentId(group.parentId || '');
                          setGroupType(group.groupType || 'Asset');
                          
                          setCurrentScreen('GROUP_CREATE');
                        };

                        return (
                          <tr 
                            key={group.id} 
                            onClick={selectGroup}
                            className="clickable-row"
                            style={{ borderBottom: '1px solid var(--tally-border-light)' }}
                          >
                            <td style={{ padding: '10px 8px', fontWeight: 600 }}>{group.name}</td>
                            <td style={{ padding: '10px 8px', color: 'var(--tally-text-secondary)' }}>
                              {group.parent ? group.parent.name : 'Primary'}
                            </td>
                            <td style={{ padding: '10px 8px', color: 'var(--tally-text-secondary)' }}>
                              {group.groupType}
                            </td>
                          </tr>
                        );
                      })}
                    {groups.filter(g => g.name.toLowerCase().includes(groupSearchQuery.toLowerCase())).length === 0 && (
                      <tr>
                        <td colSpan={3} style={{ padding: '20px', textAlign: 'center', color: 'var(--tally-text-secondary)' }}>
                          No groups matched your search
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setCurrentScreen('GROUP_MENU')} style={{ background: '#757575', borderColor: '#616161' }}>
                  Back (Esc)
                </button>
              </div>
            </div>
          )}

          {/* GROUP CREATE & ALTER SCREEN */}
          {currentScreen === 'GROUP_CREATE' && (
            <div className="tally-form-card" style={{ maxWidth: '500px', width: '100%' }}>
              <h2 className="tally-form-title">
                {isGroupReadOnly ? 'Group Display' : editingGroupId ? 'Group Alteration' : 'Group Creation'}
              </h2>
              <form onSubmit={handleCreateGroup} className="form-grid">
                <span className="form-label">Group Name:</span>
                <input
                  type="text"
                  placeholder="e.g. Indirect Incomes, Sub Debtors"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  disabled={isGroupReadOnly}
                  required
                />

                <span className="form-label">Under Parent Group:</span>
                <select 
                  value={groupParentId} 
                  onChange={(e) => setGroupParentId(e.target.value)}
                  disabled={isGroupReadOnly}
                >
                  <option value="">-- Primary --</option>
                  {groups
                    .filter(g => !editingGroupId || g.id !== editingGroupId)
                    .map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name} ({group.groupType})
                      </option>
                    ))}
                </select>

                <span className="form-label">Group Type:</span>
                <select 
                  value={groupType} 
                  onChange={(e) => setGroupType(e.target.value as 'Asset' | 'Liability' | 'Income' | 'Expense')}
                  disabled={isGroupReadOnly}
                  required
                >
                  <option value="Asset">Asset</option>
                  <option value="Liability">Liability</option>
                  <option value="Income">Income</option>
                  <option value="Expense">Expense</option>
                </select>

                <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                  {editingGroupId && !isGroupReadOnly && (
                    <button 
                      type="button" 
                      onClick={handleDeleteGroup} 
                      style={{ background: '#d32f2f', borderColor: '#c62828', color: '#fff', marginRight: 'auto' }}
                    >
                      Delete Group (Alt+D)
                    </button>
                  )}
                  <button 
                    type="button" 
                    onClick={() => {
                      if (isGroupReadOnly) setCurrentScreen('GROUP_DISPLAY_LIST');
                      else if (editingGroupId) setCurrentScreen('GROUP_ALTER_LIST');
                      else setCurrentScreen('GROUP_MENU');
                    }} 
                    style={{ background: '#757575', borderColor: '#616161' }}
                  >
                    {isGroupReadOnly ? 'Back' : 'Cancel'}
                  </button>
                  {!isGroupReadOnly && (
                    <button type="submit">
                      {editingGroupId ? 'Alter Group' : 'Create Group'}
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* 5. MASTER STOCK CREATE SCREEN — Tally ERP 9 Style */}
          {currentScreen === 'STOCK_CREATE' && (() => {
            const openVal = (parseFloat(stockOpenQty) || 0) * (parseFloat(stockOpenRate) || 0);
            const mrp = parseFloat(stockSalePrice) || 0;
            const cost = parseFloat(stockPurchasePrice) || 0;
            const disc = parseFloat(stockDiscount) || 0;
            const margin = mrp - cost;
            const marginPct = cost > 0 ? (margin / cost * 100) : 0;
            const netMrp = mrp * (1 - disc / 100);
            return (
              <div className="tally-voucher-screen" style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: "'Courier New', Courier, monospace" }}>
                {/* ── Top Bar ── */}
                <div style={{ background: '#1a3a2a', borderBottom: '2px solid var(--tally-accent)', padding: '6px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: '13px', letterSpacing: '1px' }}>Stock Item Creation</span>
                  <span style={{ color: 'var(--tally-accent)', fontSize: '11px' }}>{activeCompany?.name}</span>
                </div>

                {/* ── Main Body: two-column tally layout ── */}
                <div style={{ flex: 1, overflow: 'auto', display: 'flex', gap: 0 }}>
                  {/* LEFT PANE — fields */}
                  <div style={{ flex: 1, borderRight: '1px solid var(--tally-border-light)', padding: 0 }}>

                    {/* Field rows */}
                    {[
                      { label: 'Name', node: <input id="si-name" autoFocus type="text" value={stockName} onChange={e => setStockName(e.target.value)} className="tally-field-input" placeholder="(Name of Item)" /> },
                      { label: 'Alias / Part No.', node: <input id="si-alias" type="text" value={stockAliasCode} onChange={e => setStockAliasCode(e.target.value)} className="tally-field-input" placeholder="(Optional alias or SKU)" /> },
                      { label: 'Under', node: (
                        <select id="si-group" value={stockItemGroupId} onChange={e => setStockItemGroupId(e.target.value)} className="tally-field-select">
                          <option value="">Primary</option>
                          {itemGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                      )},
                      { label: 'Category', node: <span className="tally-field-value" style={{ color: 'var(--tally-text-secondary)' }}>Not Applicable</span> },
                      { label: 'Units', node: (
                        <select id="si-uom" value={stockUom} onChange={e => setStockUom(e.target.value)} className="tally-field-select">
                          {['Pcs','Kgs','Nos','Box','Ltr','Mtr','Set','Dz','Pkt','Rms','Bnd','Gms'].map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      )},
                      { label: 'Alternate Units', node: <span className="tally-field-value" style={{ color: 'var(--tally-text-secondary)' }}>Not Applicable</span> },
                      { label: 'Description', node: <input id="si-desc" type="text" value={stockDescription} onChange={e => setStockDescription(e.target.value)} className="tally-field-input" placeholder="(Optional description)" /> },
                    ].map((row, i) => (
                      <div key={i} className="tally-field-row">
                        <div className="tally-field-label">{row.label}</div>
                        <div className="tally-field-value-wrap">{row.node}</div>
                      </div>
                    ))}

                    {/* Section: GST Details */}
                    <div className="tally-section-header">GST Details</div>
                    {[
                      { label: 'GST Applicable', node: <span className="tally-field-value" style={{ color: '#4ade80' }}>Applicable</span> },
                      { label: 'HSN/SAC Code', node: <input id="si-hsn" type="text" value={stockHsn} onChange={e => setStockHsn(e.target.value)} className="tally-field-input" placeholder="e.g. 4901" /> },
                      { label: 'Source of Details', node: <span className="tally-field-value" style={{ color: 'var(--tally-text-secondary)' }}>Not Applicable</span> },
                      { label: 'Tax/Rate', node: <span className="tally-field-value" style={{ color: 'var(--tally-text-secondary)' }}>As per group</span> },
                    ].map((row, i) => (
                      <div key={i} className="tally-field-row">
                        <div className="tally-field-label">{row.label}</div>
                        <div className="tally-field-value-wrap">{row.node}</div>
                      </div>
                    ))}

                    {/* Section: Statutory */}
                    <div className="tally-section-header">Statutory Details</div>
                    <div className="tally-field-row">
                      <div className="tally-field-label">Set/Alter GST Details</div>
                      <div className="tally-field-value-wrap"><span className="tally-field-value" style={{ color: '#facc15' }}>No</span></div>
                    </div>

                    {/* Section: Pricing */}
                    <div className="tally-section-header">Pricing &amp; Discount</div>
                    {[
                      { label: 'MRP / Sale Price (₹)', node: <input id="si-mrp" type="number" step="0.01" min="0" value={stockSalePrice} onChange={e => setStockSalePrice(e.target.value)} className="tally-field-input tally-amt" /> },
                      { label: 'Purchase / Cost Price (₹)', node: <input id="si-cost" type="number" step="0.01" min="0" value={stockPurchasePrice} onChange={e => setStockPurchasePrice(e.target.value)} className="tally-field-input tally-amt" /> },
                      { label: 'Default Discount (%)', node: <input id="si-disc" type="number" step="0.01" min="0" max="100" value={stockDiscount} onChange={e => setStockDiscount(e.target.value)} className="tally-field-input tally-amt" /> },
                      ...(mrp > 0 && cost > 0 ? [{ label: 'Margin / Profit', node: <span className="tally-field-value" style={{ color: margin >= 0 ? '#4ade80' : '#f87171', fontWeight: 700 }}>₹{margin.toFixed(2)} ({marginPct.toFixed(1)}%)</span> }] : []),
                      ...(mrp > 0 && disc > 0 ? [{ label: 'Net Sale Price (after disc)', node: <span className="tally-field-value" style={{ color: '#fb923c', fontWeight: 700 }}>₹{netMrp.toFixed(2)}</span> }] : []),
                    ].map((row, i) => (
                      <div key={i} className="tally-field-row">
                        <div className="tally-field-label">{row.label}</div>
                        <div className="tally-field-value-wrap">{row.node}</div>
                      </div>
                    ))}

                    {/* Section: Opening Balance */}
                    <div className="tally-section-header">Opening Balance</div>
                    {[
                      { label: 'Opening Quantity', node: <input id="si-openqty" type="number" step="0.001" min="0" value={stockOpenQty} onChange={e => setStockOpenQty(e.target.value)} className="tally-field-input tally-amt" /> },
                      { label: 'Opening Rate (₹)', node: <input id="si-openrate" type="number" step="0.01" min="0" value={stockOpenRate} onChange={e => setStockOpenRate(e.target.value)} className="tally-field-input tally-amt" /> },
                      { label: 'Opening Value (₹)', node: <span className="tally-field-value" style={{ color: 'var(--tally-accent)', fontWeight: 700, fontFamily: "'Courier New', monospace" }}>₹{openVal.toFixed(2)}</span> },
                    ].map((row, i) => (
                      <div key={i} className="tally-field-row">
                        <div className="tally-field-label">{row.label}</div>
                        <div className="tally-field-value-wrap">{row.node}</div>
                      </div>
                    ))}

                  </div>

                  {/* RIGHT PANE — hints */}
                  <div style={{ width: '220px', flexShrink: 0, padding: '12px', background: 'rgba(0,0,0,0.2)', fontSize: '11px' }}>
                    <div style={{ color: 'var(--tally-accent)', fontWeight: 700, marginBottom: '10px', borderBottom: '1px solid var(--tally-border-light)', paddingBottom: '5px' }}>FIELD GUIDE</div>
                    <div style={{ color: '#94a3b8', lineHeight: 1.8 }}>
                      <div><span style={{ color: '#fbbf24' }}>Name</span> — Full item name</div>
                      <div><span style={{ color: '#fbbf24' }}>Alias</span> — SKU / Part no.</div>
                      <div><span style={{ color: '#fbbf24' }}>Under</span> — Item group</div>
                      <div><span style={{ color: '#fbbf24' }}>Units</span> — Pcs, Kgs, etc.</div>
                      <div><span style={{ color: '#fbbf24' }}>HSN</span> — GST HSN code</div>
                      <div><span style={{ color: '#fbbf24' }}>MRP</span> — Selling price</div>
                      <div><span style={{ color: '#fbbf24' }}>Cost</span> — Purchase price</div>
                      <div><span style={{ color: '#fbbf24' }}>Disc%</span> — Default discount</div>
                    </div>
                    <div style={{ marginTop: '20px', color: 'var(--tally-accent)', fontWeight: 700, borderBottom: '1px solid var(--tally-border-light)', paddingBottom: '5px', marginBottom: '8px' }}>KEYBOARD</div>
                    <div style={{ color: '#94a3b8', lineHeight: 2 }}>
                      <div><span style={{ color: '#fff', background: '#374151', padding: '1px 5px', borderRadius: '3px', fontSize: '10px' }}>Tab</span> Next field</div>
                      <div><span style={{ color: '#fff', background: '#374151', padding: '1px 5px', borderRadius: '3px', fontSize: '10px' }}>Ctrl+A</span> Accept</div>
                      <div><span style={{ color: '#fff', background: '#374151', padding: '1px 5px', borderRadius: '3px', fontSize: '10px' }}>Esc</span> Quit/Back</div>
                    </div>
                    {stockName && (
                      <div style={{ marginTop: '20px', padding: '10px', background: 'rgba(0,121,107,0.15)', borderRadius: '6px', borderLeft: '3px solid var(--tally-accent)' }}>
                        <div style={{ color: 'var(--tally-accent)', fontWeight: 700, fontSize: '11px', marginBottom: '6px' }}>PREVIEW</div>
                        <div style={{ color: '#fff', fontSize: '12px', fontWeight: 700 }}>{stockName}</div>
                        {stockItemGroupId && <div style={{ color: '#94a3b8', fontSize: '11px' }}>📁 {itemGroups.find(g => g.id === stockItemGroupId)?.name}</div>}
                        <div style={{ color: '#94a3b8', fontSize: '11px' }}>📦 {stockUom}</div>
                        {mrp > 0 && <div style={{ color: '#4ade80', fontSize: '11px' }}>₹{mrp.toFixed(2)} MRP</div>}
                        {openVal > 0 && <div style={{ color: '#fb923c', fontSize: '11px' }}>Opening: ₹{openVal.toFixed(2)}</div>}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Bottom Button Bar ── */}
                <div style={{ background: '#1a3a2a', borderTop: '1px solid var(--tally-border-light)', padding: '8px 16px', display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={handleCreateStockItem as any}
                    style={{ background: 'var(--tally-accent)', color: '#000', border: 'none', padding: '7px 22px', fontWeight: 700, fontSize: '12px', borderRadius: '3px', cursor: 'pointer', letterSpacing: '0.5px' }}
                  >
                    ✔ Accept  <span style={{ fontWeight: 400, fontSize: '10px', opacity: 0.7 }}>(Ctrl+A)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentScreen('GATEWAY')}
                    style={{ background: '#374151', color: '#fff', border: '1px solid #4b5563', padding: '7px 22px', fontWeight: 600, fontSize: '12px', borderRadius: '3px', cursor: 'pointer' }}
                  >
                    ✕ Quit  <span style={{ fontWeight: 400, fontSize: '10px', opacity: 0.7 }}>(Esc)</span>
                  </button>
                  <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: '11px' }}>Stock Item Master</span>
                </div>
              </div>
            );
          })()}

          {/* 6. VOUCHER TRANSACTION SCREEN — Tally ERP 9 Style */}
          {currentScreen === 'VOUCHER_ENTRY' && (() => {
            const totalDr = vEntries.filter(e => e.entryType === 'Dr').reduce((s,e) => s + (parseFloat(e.amount)||0), 0);
            const totalCr = vEntries.filter(e => e.entryType === 'Cr').reduce((s,e) => s + (parseFloat(e.amount)||0), 0);
            const balanced = Math.abs(totalDr - totalCr) < 0.01;
            const voucherTypes: { key: string; label: string; type: typeof vType }[] = [
              { key:'F4', label:'Contra',   type:'CONTRA'   },
              { key:'F5', label:'Payment',  type:'PAYMENT'  },
              { key:'F6', label:'Receipt',  type:'RECEIPT'  },
              { key:'F7', label:'Journal',  type:'JOURNAL'  },
              { key:'F8', label:'Sales',    type:'SALES'    },
              { key:'F9', label:'Purchase', type:'PURCHASE' },
            ];
            return (
              <div style={{ display:'flex', flexDirection:'column', height:'100%', fontFamily:"'Courier New',Courier,monospace", background:'var(--tally-bg)' }}>

                {/* ── Top type-selector bar ── */}
                <div style={{ background:'#0d2318', borderBottom:'2px solid var(--tally-accent)', padding:'6px 10px', display:'flex', gap:'6px', alignItems:'center', flexShrink:0 }}>
                  <span style={{ color:'#94a3b8', fontSize:'11px', marginRight:'6px', whiteSpace:'nowrap' }}>Accounting Voucher</span>
                  {voucherTypes.map(vt => (
                    <button
                      key={vt.type}
                      onClick={() => setVType(vt.type)}
                      style={{
                        padding:'4px 12px', fontSize:'11.5px', fontFamily:"'Courier New',monospace",
                        border: vType === vt.type ? '2px solid var(--tally-accent)' : '1px solid #2d4a3a',
                        background: vType === vt.type ? 'var(--tally-accent)' : 'transparent',
                        color: vType === vt.type ? '#000' : '#94a3b8',
                        borderRadius:'3px', cursor:'pointer', fontWeight: vType === vt.type ? 700 : 400,
                        transition:'all 0.15s',
                      }}
                    >
                      <span style={{ color: vType === vt.type ? '#004d40' : 'var(--tally-accent)', fontWeight:700, marginRight:'4px' }}>{vt.key}</span>
                      {vt.label}
                    </button>
                  ))}
                  <span style={{ marginLeft:'auto', color:'#64748b', fontSize:'11px' }}>{activeCompany?.name}</span>
                </div>

                {/* ── Main body ── */}
                <div style={{ flex:1, overflow:'auto', display:'flex' }}>
                  <div style={{ flex:1, borderRight:'1px solid var(--tally-border-light)' }}>

                    {/* Header fields row */}
                    <div style={{ display:'flex', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
                      <div className="tally-field-row" style={{ flex:1, borderBottom:'none' }}>
                        <div className="tally-field-label" style={{ width:'110px' }}>Voucher No</div>
                        <div className="tally-field-value-wrap">
                          <input className="tally-field-input" type="text" placeholder="(Auto)" value={vNum} onChange={e => setVNum(e.target.value)} />
                        </div>
                      </div>
                      <div className="tally-field-row" style={{ flex:1, borderBottom:'none' }}>
                        <div className="tally-field-label" style={{ width:'60px' }}>Date</div>
                        <div className="tally-field-value-wrap">
                          <input className="tally-field-input" type="date" value={vDate} onChange={e => setVDate(e.target.value)} />
                        </div>
                      </div>
                      <div className="tally-field-row" style={{ flex:1, borderBottom:'none' }}>
                        <div className="tally-field-label" style={{ width:'70px' }}>Ref No.</div>
                        <div className="tally-field-value-wrap">
                          <input className="tally-field-input" type="text" placeholder="(Reference)" value={vRef} onChange={e => setVRef(e.target.value)} />
                        </div>
                      </div>
                    </div>

                    {/* Ledger entry table */}
                    <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:"'Courier New',monospace", fontSize:'13px' }}>
                      <thead>
                        <tr style={{ background:'rgba(0,0,0,0.3)', borderBottom:'1px solid rgba(0,121,107,0.4)' }}>
                          <th style={{ padding:'7px 16px', textAlign:'left', fontWeight:700, fontSize:'11px', color:'#64748b', width:'45%' }}>PARTICULARS</th>
                          <th style={{ padding:'7px 10px', textAlign:'right', fontWeight:700, fontSize:'11px', color:'#64748b', width:'20%' }}>DEBIT (₹)</th>
                          <th style={{ padding:'7px 10px', textAlign:'right', fontWeight:700, fontSize:'11px', color:'#64748b', width:'20%' }}>CREDIT (₹)</th>
                          <th style={{ padding:'7px 6px', width:'60px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {vEntries.map((entry, idx) => (
                          <tr key={idx} style={{ borderBottom:'1px solid rgba(255,255,255,0.05)' }}
                            onMouseEnter={e => (e.currentTarget.style.background='rgba(0,121,107,0.08)')}
                            onMouseLeave={e => (e.currentTarget.style.background='transparent')}
                          >
                            <td style={{ padding:'6px 16px', display:'flex', alignItems:'center', gap:'8px' }}>
                              <select
                                value={entry.entryType}
                                onChange={e => { const l=[...vEntries]; l[idx].entryType=e.target.value as 'Dr'|'Cr'; setVEntries(l); }}
                                style={{ background:'transparent', border:'none', color: entry.entryType==='Dr'?'#f87171':'#4ade80', fontWeight:700, fontFamily:"'Courier New',monospace", fontSize:'12px', cursor:'pointer', width:'36px', outline:'none' }}
                              >
                                <option value="Dr" style={{ background:'#0d2318', color:'#f87171' }}>Dr</option>
                                <option value="Cr" style={{ background:'#0d2318', color:'#4ade80' }}>Cr</option>
                              </select>
                              <select
                                value={entry.ledgerId}
                                onChange={e => { const l=[...vEntries]; l[idx].ledgerId=e.target.value; setVEntries(l); }}
                                style={{ flex:1, background:'transparent', border:'none', borderBottom:'1px solid rgba(0,121,107,0.4)', color:'#fff', fontFamily:"'Courier New',monospace", fontSize:'12.5px', padding:'2px 4px', outline:'none', cursor:'pointer' }}
                              >
                                <option value="" style={{ background:'#0d2318' }}>-- Select Ledger --</option>
                                {ledgers.map(l => <option key={l.id} value={l.id} style={{ background:'#0d2318' }}>{l.name}  [{l.groupName}]</option>)}
                              </select>
                            </td>
                            <td style={{ padding:'6px 10px', textAlign:'right' }}>
                              {entry.entryType === 'Dr' && (
                                <input type="number" value={entry.amount}
                                  onChange={e => { const l=[...vEntries]; l[idx].amount=e.target.value; setVEntries(l); }}
                                  style={{ width:'100%', background:'transparent', border:'none', borderBottom:'1px solid rgba(0,121,107,0.4)', color:'#f87171', fontFamily:"'Courier New',monospace", fontSize:'13px', textAlign:'right', outline:'none', padding:'2px 4px' }}
                                  placeholder="0.00"
                                />
                              )}
                            </td>
                            <td style={{ padding:'6px 10px', textAlign:'right' }}>
                              {entry.entryType === 'Cr' && (
                                <input type="number" value={entry.amount}
                                  onChange={e => { const l=[...vEntries]; l[idx].amount=e.target.value; setVEntries(l); }}
                                  style={{ width:'100%', background:'transparent', border:'none', borderBottom:'1px solid rgba(0,121,107,0.4)', color:'#4ade80', fontFamily:"'Courier New',monospace", fontSize:'13px', textAlign:'right', outline:'none', padding:'2px 4px' }}
                                  placeholder="0.00"
                                />
                              )}
                            </td>
                            <td style={{ padding:'4px 6px', textAlign:'center' }}>
                              <button onClick={() => vEntries.length > 2 && setVEntries(vEntries.filter((_,i)=>i!==idx))}
                                style={{ background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontSize:'14px', lineHeight:1, padding:'2px 6px' }} title="Remove line">
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                        {/* Add line row */}
                        <tr>
                          <td colSpan={4} style={{ padding:'8px 16px' }}>
                            <button onClick={() => setVEntries([...vEntries, { ledgerId:'', amount:'', entryType: totalDr<=totalCr?'Dr':'Cr' }])}
                              style={{ background:'none', border:'1px dashed rgba(0,121,107,0.4)', color:'var(--tally-accent)', fontFamily:"'Courier New',monospace", fontSize:'12px', padding:'4px 14px', borderRadius:'3px', cursor:'pointer' }}>
                              + Add Line
                            </button>
                          </td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop:'2px solid rgba(0,121,107,0.5)', background:'rgba(0,0,0,0.3)' }}>
                          <td style={{ padding:'8px 16px', fontWeight:700, color:'#94a3b8', fontSize:'12px' }}>TOTAL</td>
                          <td style={{ padding:'8px 10px', textAlign:'right', fontFamily:"'Courier New',monospace", fontWeight:700, color:'#f87171', fontSize:'14px' }}>
                            {totalDr > 0 ? `₹${totalDr.toFixed(2)}` : ''}
                          </td>
                          <td style={{ padding:'8px 10px', textAlign:'right', fontFamily:"'Courier New',monospace", fontWeight:700, color:'#4ade80', fontSize:'14px' }}>
                            {totalCr > 0 ? `₹${totalCr.toFixed(2)}` : ''}
                          </td>
                          <td>
                            {!balanced && (totalDr > 0 || totalCr > 0) && (
                              <span style={{ color:'#ef4444', fontSize:'11px', fontWeight:700 }}>⚠</span>
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>

                    {/* Optional Inventory Allocations for Sales/Purchases */}
                    {(vType === 'SALES' || vType === 'PURCHASE') && (
                      <div style={{ borderTop:'1px solid var(--tally-border-light)', padding:'0' }}>
                        <div className="tally-section-header">Inventory Allocations</div>
                        <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:"'Courier New',monospace", fontSize:'13px' }}>
                          <thead>
                            <tr style={{ background:'rgba(0,0,0,0.3)', borderBottom:'1px solid rgba(0,121,107,0.4)' }}>
                              <th style={{ padding:'6px 16px', textAlign:'left', fontWeight:700, fontSize:'11px', color:'#64748b' }}>ITEM</th>
                              <th style={{ padding:'6px 10px', textAlign:'right', fontWeight:700, fontSize:'11px', color:'#64748b', width:'100px' }}>QTY</th>
                              <th style={{ padding:'6px 10px', textAlign:'right', fontWeight:700, fontSize:'11px', color:'#64748b', width:'130px' }}>RATE (₹)</th>
                              <th style={{ padding:'6px 10px', textAlign:'right', fontWeight:700, fontSize:'11px', color:'#64748b', width:'130px' }}>AMOUNT (₹)</th>
                              <th style={{ width:'40px' }}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {vInventory.map((item, idx) => (
                              <tr key={idx} style={{ borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding:'6px 16px' }}>
                                  <select value={item.stockItemId}
                                    onChange={e => { const l=[...vInventory]; l[idx].stockItemId=e.target.value; setVInventory(l); }}
                                    style={{ width:'100%', background:'transparent', border:'none', borderBottom:'1px solid rgba(0,121,107,0.4)', color:'#fff', fontFamily:"'Courier New',monospace", fontSize:'12.5px', padding:'2px 4px', outline:'none' }}>
                                    <option value="" style={{ background:'#0d2318' }}>-- Select Item --</option>
                                    {stockItems.map(s => <option key={s.id} value={s.id} style={{ background:'#0d2318' }}>{s.name}</option>)}
                                  </select>
                                </td>
                                <td style={{ padding:'6px 10px' }}>
                                  <input type="number" value={item.qty} placeholder="0"
                                    onChange={e => { const l=[...vInventory]; l[idx].qty=e.target.value; setVInventory(l); }}
                                    style={{ width:'100%', background:'transparent', border:'none', borderBottom:'1px solid rgba(0,121,107,0.4)', color:'#e2e8f0', fontFamily:"'Courier New',monospace", fontSize:'13px', textAlign:'right', outline:'none', padding:'2px 4px' }} />
                                </td>
                                <td style={{ padding:'6px 10px' }}>
                                  <input type="number" value={item.rate} placeholder="0.00"
                                    onChange={e => { const l=[...vInventory]; l[idx].rate=e.target.value; setVInventory(l); }}
                                    style={{ width:'100%', background:'transparent', border:'none', borderBottom:'1px solid rgba(0,121,107,0.4)', color:'#e2e8f0', fontFamily:"'Courier New',monospace", fontSize:'13px', textAlign:'right', outline:'none', padding:'2px 4px' }} />
                                </td>
                                <td style={{ padding:'6px 10px', textAlign:'right', fontFamily:"'Courier New',monospace", color:'#fbbf24', fontWeight:600 }}>
                                  {((parseFloat(item.qty)||0)*(parseFloat(item.rate)||0)).toFixed(2)}
                                </td>
                                <td style={{ textAlign:'center' }}>
                                  <button onClick={() => setVInventory(vInventory.filter((_,i)=>i!==idx))}
                                    style={{ background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontSize:'14px' }}>✕</button>
                                </td>
                              </tr>
                            ))}
                            <tr>
                              <td colSpan={5} style={{ padding:'8px 16px' }}>
                                <button onClick={() => setVInventory([...vInventory, { stockItemId:'', qty:'', rate:'' }])}
                                  style={{ background:'none', border:'1px dashed rgba(0,121,107,0.4)', color:'var(--tally-accent)', fontFamily:"'Courier New',monospace", fontSize:'12px', padding:'4px 14px', borderRadius:'3px', cursor:'pointer' }}>
                                  + Add Item
                                </button>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Narration */}
                    <div className="tally-field-row" style={{ marginTop:'4px' }}>
                      <div className="tally-field-label">Narration</div>
                      <div className="tally-field-value-wrap">
                        <input className="tally-field-input" type="text" placeholder="(Brief description of transaction)"
                          value={vNarration} onChange={e => setVNarration(e.target.value)} />
                      </div>
                    </div>

                  </div>{/* end left pane */}

                  {/* Right info pane */}
                  <div style={{ width:'200px', flexShrink:0, padding:'14px 12px', background:'rgba(0,0,0,0.2)', fontSize:'11px' }}>
                    <div style={{ color:'var(--tally-accent)', fontWeight:700, marginBottom:'8px', borderBottom:'1px solid var(--tally-border-light)', paddingBottom:'4px' }}>BALANCE CHECK</div>
                    <div style={{ lineHeight:2.2, fontFamily:"'Courier New',monospace" }}>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <span style={{ color:'#94a3b8' }}>Dr Total</span>
                        <span style={{ color:'#f87171', fontWeight:700 }}>₹{totalDr.toFixed(2)}</span>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <span style={{ color:'#94a3b8' }}>Cr Total</span>
                        <span style={{ color:'#4ade80', fontWeight:700 }}>₹{totalCr.toFixed(2)}</span>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', borderTop:'1px solid var(--tally-border-light)', paddingTop:'4px', marginTop:'4px' }}>
                        <span style={{ color:'#94a3b8' }}>Diff</span>
                        <span style={{ color: balanced ? '#4ade80' : '#ef4444', fontWeight:700 }}>₹{Math.abs(totalDr-totalCr).toFixed(2)}</span>
                      </div>
                      <div style={{ textAlign:'center', marginTop:'8px', padding:'4px', borderRadius:'3px', background: balanced ? 'rgba(74,222,128,0.12)' : 'rgba(239,68,68,0.12)', color: balanced ? '#4ade80' : '#ef4444', fontWeight:700 }}>
                        {balanced ? '✔ Balanced' : '⚠ Not Balanced'}
                      </div>
                    </div>
                    <div style={{ marginTop:'18px', color:'var(--tally-accent)', fontWeight:700, borderBottom:'1px solid var(--tally-border-light)', paddingBottom:'4px', marginBottom:'8px' }}>TYPE</div>
                    <div style={{ color:'#fbbf24', fontWeight:700, fontSize:'12px', fontFamily:"'Courier New',monospace" }}>{vType}</div>
                    <div style={{ marginTop:'18px', color:'var(--tally-accent)', fontWeight:700, borderBottom:'1px solid var(--tally-border-light)', paddingBottom:'4px', marginBottom:'8px' }}>KEYBOARD</div>
                    <div style={{ color:'#94a3b8', lineHeight:2 }}>
                      {[['F4','Contra'],['F5','Payment'],['F6','Receipt'],['F7','Journal'],['F8','Sales'],['F9','Purchase']].map(([k,l]) => (
                        <div key={k} style={{ color: vType===l.toUpperCase() ? '#fbbf24':'#94a3b8' }}>
                          <span style={{ background:'#374151', padding:'0 4px', borderRadius:'2px', fontSize:'10px', color:'#fff', marginRight:'4px' }}>{k}</span>{l}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Bottom Button Bar ── */}
                <div style={{ background:'#0d2318', borderTop:'1px solid var(--tally-border-light)', padding:'8px 16px', display:'flex', gap:'12px', alignItems:'center', flexShrink:0 }}>
                  <button onClick={handleCreateVoucher}
                    style={{ background: balanced?'var(--tally-accent)':'#374151', color: balanced?'#000':'#9ca3af', border:'none', padding:'7px 22px', fontWeight:700, fontSize:'12px', borderRadius:'3px', cursor: balanced?'pointer':'not-allowed', letterSpacing:'0.5px', fontFamily:"'Courier New',monospace", transition:'all 0.2s' }}>
                    ✔ Accept
                  </button>
                  <button onClick={() => setCurrentScreen('GATEWAY')}
                    style={{ background:'#374151', color:'#fff', border:'1px solid #4b5563', padding:'7px 22px', fontWeight:600, fontSize:'12px', borderRadius:'3px', cursor:'pointer', fontFamily:"'Courier New',monospace" }}>
                    ✕ Quit <span style={{ fontSize:'10px', opacity:0.6 }}>(Esc)</span>
                  </button>
                  <span style={{ marginLeft:'auto', color:'#64748b', fontSize:'11px', fontFamily:"'Courier New',monospace" }}>Accounting Voucher · {vType}</span>
                </div>
              </div>
            );
          })()}

          {/* 7. TRIAL BALANCE REPORT */}
          {currentScreen === 'REPORT_TRIAL_BALANCE' && reportData && (
            <div className="tally-report-card printable-area">
              <div className="report-header">
                <div>
                  <h2 className="report-title">Trial Balance</h2>
                  <p style={{ fontSize: '12px', color: 'var(--tally-text-secondary)' }}>{activeCompany?.name}</p>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--tally-text-secondary)' }}>
                  {fmtDateForDisplay(currentPeriodStart, '-')} to {fmtDateForDisplay(currentPeriodEnd, '-')}
                </div>
              </div>
              <div className="report-table-container">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Particulars (Account Group / Ledgers)</th>
                      <th style={{ width: '180px', textAlign: 'right' }}>Debit (₹)</th>
                      <th style={{ width: '180px', textAlign: 'right' }}>Credit (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((group: any) => {
                      const balance = group.totalDr - group.totalCr;
                      return (
                        <React.Fragment key={group.id}>
                          {/* Group Row */}
                          <tr className="bold-row" style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <td style={{ paddingLeft: '10px' }}>{group.name}</td>
                            <td className="amount-col">
                              {balance > 0 ? balance.toFixed(2) : ''}
                            </td>
                            <td className="amount-col">
                              {balance < 0 ? Math.abs(balance).toFixed(2) : ''}
                            </td>
                          </tr>
                          {/* Sub Ledgers of this Group */}
                          {group.ledgers.map((led: any) => (
                            <tr key={led.id}>
                              <td style={{ paddingLeft: '30px', fontStyle: 'italic', color: 'var(--tally-text-secondary)' }}>
                                {led.name}
                              </td>
                              <td className="amount-col">
                                {led.closingBalanceType === 'Dr' && led.closingBalance > 0 ? led.closingBalance.toFixed(2) : ''}
                              </td>
                              <td className="amount-col">
                                {led.closingBalanceType === 'Cr' && led.closingBalance > 0 ? led.closingBalance.toFixed(2) : ''}
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                    
                    {/* Trial Balance Total Footer */}
                    <tr className="total-row">
                      <td>Grand Total</td>
                      <td className="amount-col">
                        ₹{reportData.reduce((sum: number, g: any) => sum + (g.totalDr > g.totalCr ? g.totalDr - g.totalCr : 0), 0).toFixed(2)}
                      </td>
                      <td className="amount-col">
                        ₹{reportData.reduce((sum: number, g: any) => sum + (g.totalCr > g.totalDr ? g.totalCr - g.totalDr : 0), 0).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: '10px', textAlign: 'right' }} className="no-print">
                <button type="button" onClick={() => setCurrentScreen('GATEWAY')}>Back to Gateway (Esc)</button>
                <button type="button" onClick={() => window.print()} style={{ marginLeft: '10px', background: 'var(--tally-accent)', color: '#000', borderColor: 'var(--tally-accent)' }}>
                  🖨️ Print (Alt+P)
                </button>
              </div>
            </div>
          )}

          {/* 8. DAY BOOK REPORT */}
          {currentScreen === 'REPORT_DAY_BOOK' && reportData && (
            <div className="tally-report-card printable-area">
              <div className="report-header">
                <div>
                  <h2 className="report-title">Day Book</h2>
                  <p style={{ fontSize: '12px', color: 'var(--tally-text-secondary)' }}>{activeCompany?.name}</p>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--tally-text-secondary)' }}>Transactions Registered</div>
              </div>
              <div className="report-table-container">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th style={{ width: '100px' }}>Date</th>
                      <th style={{ width: '120px' }}>Vch Type</th>
                      <th style={{ width: '80px' }}>Vch No.</th>
                      <th>Particulars (Ledger)</th>
                      <th style={{ width: '150px', textAlign: 'right' }}>Debit Amount (₹)</th>
                      <th style={{ width: '150px', textAlign: 'right' }}>Credit Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', color: 'var(--tally-text-secondary)', padding: '20px' }}>
                          No voucher entries recorded yet.
                        </td>
                      </tr>
                    ) : (
                      reportData.map((vch: any) => (
                        <React.Fragment key={vch.id}>
                          {/* Main Voucher info row */}
                          <tr className="bold-row" style={{ borderTop: '1px solid var(--tally-border)' }}>
                            <td>{new Date(vch.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td>
                            <td style={{ color: 'var(--tally-accent)' }}>{vch.voucherType}</td>
                            <td>{vch.voucherNumber}</td>
                            <td><span style={{ fontSize: '11px', color: 'var(--tally-text-secondary)' }}>Narration: {vch.narration || '-'}</span></td>
                            <td colSpan={2}></td>
                          </tr>
                          {/* Ledger details nested below */}
                          {vch.entries.map((ent: any) => (
                            <tr key={ent.id} style={{ borderBottom: 'none' }}>
                              <td colSpan={3}></td>
                              <td style={{ paddingLeft: '20px', fontSize: '13px' }}>
                                {ent.entryType === 'Cr' ? '  To ' : ''} {ent.ledger.name}
                              </td>
                              <td className="amount-col">
                                {ent.entryType === 'Dr' ? ent.amount.toFixed(2) : ''}
                              </td>
                              <td className="amount-col">
                                {ent.entryType === 'Cr' ? ent.amount.toFixed(2) : ''}
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="no-print">
                <span style={{ fontSize: '12px', color: 'var(--tally-text-secondary)' }}>Total Vouchers: {reportData.length}</span>
                <div>
                  <button type="button" onClick={() => setCurrentScreen('GATEWAY')}>Back to Gateway (Esc)</button>
                  <button type="button" onClick={() => window.print()} style={{ marginLeft: '10px', background: 'var(--tally-accent)', color: '#000', borderColor: 'var(--tally-accent)' }}>
                    🖨️ Print (Alt+P)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 9. PROFIT & LOSS REPORT */}
          {currentScreen === 'REPORT_PROFIT_LOSS' && reportData && (
            <div className="tally-report-card printable-area">
              <div className="report-header">
                <div>
                  <h2 className="report-title">Profit & Loss A/c</h2>
                  <p style={{ fontSize: '12px', color: 'var(--tally-text-secondary)' }}>{activeCompany?.name}</p>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--tally-text-secondary)' }}>
                  {fmtDateForDisplay(currentPeriodStart, '-')} to {fmtDateForDisplay(currentPeriodEnd, '-')}
                </div>
              </div>
              <div className="report-table-container">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Particulars</th>
                      <th style={{ width: '200px', textAlign: 'right' }}>Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bold-row"><td style={{ color: 'var(--tally-accent)' }}>Trading Account</td><td></td></tr>
                    {reportData.openingStockValue > 0 && (
                      <tr>
                        <td style={{ paddingLeft: '20px' }}>Opening Stock</td>
                        <td className="amount-col">₹{reportData.openingStockValue.toFixed(2)}</td>
                      </tr>
                    )}
                    {reportData.purchases.map((p: any) => (
                      <tr key={p.name}>
                        <td style={{ paddingLeft: '20px' }}>Purchase Accounts ({p.name})</td>
                        <td className="amount-col">₹{p.balance.toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td style={{ paddingLeft: '20px' }}>Cost of Purchase Accounts Total</td>
                      <td className="amount-col bold-row">₹{reportData.totalPurchases.toFixed(2)}</td>
                    </tr>
                    {reportData.sales.map((s: any) => (
                      <tr key={s.name}>
                        <td style={{ paddingLeft: '20px' }}>Sales Accounts ({s.name})</td>
                        <td className="amount-col">₹{s.balance.toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td style={{ paddingLeft: '20px' }}>Sales Total</td>
                      <td className="amount-col bold-row">₹{reportData.totalSales.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td style={{ paddingLeft: '20px' }}>Closing Stock (Calculated)</td>
                      <td className="amount-col bold-row" style={{ color: 'var(--tally-text-white)' }}>₹{reportData.closingStockValue.toFixed(2)}</td>
                    </tr>
                    <tr className="total-row" style={{ background: 'rgba(0,121,107,0.1)' }}>
                      <td>Gross Profit c/o</td>
                      <td className="amount-col">₹{reportData.grossProfit.toFixed(2)}</td>
                    </tr>

                    {/* Indirect elements */}
                    <tr className="bold-row" style={{ height: '30px', verticalAlign: 'bottom' }}><td style={{ color: 'var(--tally-accent)' }}>Income / Expenses Statement</td><td></td></tr>
                    <tr className="bold-row">
                      <td style={{ paddingLeft: '20px' }}>Gross Profit b/f</td>
                      <td className="amount-col">₹{reportData.grossProfit.toFixed(2)}</td>
                    </tr>
                    {reportData.indirectExpenses.map((e: any) => (
                      <tr key={e.name}>
                        <td style={{ paddingLeft: '20px', color: 'var(--tally-text-secondary)' }}>Indirect Expenses: {e.name}</td>
                        <td className="amount-col">₹{e.balance.toFixed(2)}</td>
                      </tr>
                    ))}
                    {reportData.indirectExpenses.length > 0 && (
                      <tr>
                        <td style={{ paddingLeft: '20px' }}>Total Indirect Expenses</td>
                        <td className="amount-col bold-row">₹{reportData.totalIndirectExpense.toFixed(2)}</td>
                      </tr>
                    )}
                    {reportData.indirectIncomes.map((i: any) => (
                      <tr key={i.name}>
                        <td style={{ paddingLeft: '20px', color: 'var(--tally-text-secondary)' }}>Indirect Incomes: {i.name}</td>
                        <td className="amount-col">₹{i.balance.toFixed(2)}</td>
                      </tr>
                    ))}
                    {reportData.indirectIncomes.length > 0 && (
                      <tr>
                        <td style={{ paddingLeft: '20px' }}>Total Indirect Incomes</td>
                        <td className="amount-col bold-row">₹{reportData.totalIndirectIncome.toFixed(2)}</td>
                      </tr>
                    )}
                    <tr className="total-row">
                      <td style={{ color: 'var(--tally-accent)' }}>Net Profit</td>
                      <td className="amount-col">₹{reportData.netProfit.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: '10px', textAlign: 'right' }} className="no-print">
                <button type="button" onClick={() => setCurrentScreen('GATEWAY')}>Back to Gateway (Esc)</button>
                <button type="button" onClick={() => window.print()} style={{ marginLeft: '10px', background: 'var(--tally-accent)', color: '#000', borderColor: 'var(--tally-accent)' }}>
                  🖨️ Print (Alt+P)
                </button>
              </div>
            </div>
          )}

          {/* 10. BALANCE SHEET REPORT */}
          {currentScreen === 'REPORT_BALANCE_SHEET' && reportData && (
            <div className="tally-report-card printable-area">
              <div className="report-header">
                <div>
                  <h2 className="report-title">Balance Sheet</h2>
                  <p style={{ fontSize: '12px', color: 'var(--tally-text-secondary)' }}>{activeCompany?.name}</p>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--tally-text-secondary)' }}>
                  As on {fmtDateForDisplay(currentPeriodEnd, '-')}
                </div>
              </div>
              <div className="report-table-container">
                <div style={{ display: 'flex', gap: '20px', height: '100%' }}>
                  {/* Liabilities Column */}
                  <div style={{ flex: 1, borderRight: '1px solid var(--tally-border)' }}>
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th>Liabilities</th>
                          <th style={{ width: '130px', textAlign: 'right' }}>Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.liabilities.map((item: any, idx: number) => (
                          <tr key={idx}>
                            <td>{item.name} <span style={{ fontSize: '10px', color: 'var(--tally-text-secondary)' }}>({item.group})</span></td>
                            <td className="amount-col">₹{item.balance.toFixed(2)}</td>
                          </tr>
                        ))}
                        <tr style={{ height: '40px' }}><td colSpan={2}></td></tr>
                        <tr className="total-row">
                          <td>Total Liabilities</td>
                          <td className="amount-col">₹{reportData.totalLiabilities.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Assets Column */}
                  <div style={{ flex: 1 }}>
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th>Assets</th>
                          <th style={{ width: '130px', textAlign: 'right' }}>Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.assets.map((item: any, idx: number) => (
                          <tr key={idx}>
                            <td>{item.name} <span style={{ fontSize: '10px', color: 'var(--tally-text-secondary)' }}>({item.group})</span></td>
                            <td className="amount-col">₹{item.balance.toFixed(2)}</td>
                          </tr>
                        ))}
                        <tr style={{ height: '40px' }}><td colSpan={2}></td></tr>
                        <tr className="total-row">
                          <td>Total Assets</td>
                          <td className="amount-col">₹{reportData.totalAssets.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              
              {/* Difference Checker */}
              {Math.abs(reportData.difference) > 0.01 && (
                <div style={{ padding: '8px', border: '1px solid #ff5252', borderRadius: '4px', marginTop: '10px', fontSize: '12px', background: 'rgba(255,82,82,0.1)', color: '#ff5252' }}>
                  Warning: Balance Sheet is out of balance by ₹{reportData.difference.toFixed(2)} (Difference in Opening Balances or Double-entry calculation).
                </div>
              )}
              
              <div style={{ marginTop: '10px', textAlign: 'right' }} className="no-print">
                <button type="button" onClick={() => setCurrentScreen('GATEWAY')}>Back to Gateway (Esc)</button>
                <button type="button" onClick={() => window.print()} style={{ marginLeft: '10px', background: 'var(--tally-accent)', color: '#000', borderColor: 'var(--tally-accent)' }}>
                  🖨️ Print (Alt+P)
                </button>
              </div>
            </div>
          )}

          {/* 11. STOCK SUMMARY REPORT */}
          {currentScreen === 'REPORT_STOCK_SUMMARY' && reportData && (
            <div className="tally-report-card printable-area">
              <div className="report-header">
                <div>
                  <h2 className="report-title">Stock Summary</h2>
                  <p style={{ fontSize: '12px', color: 'var(--tally-text-secondary)' }}>{activeCompany?.name}</p>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--tally-text-secondary)' }}>Inventory Valuation</div>
              </div>
              <div className="report-table-container">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th rowSpan={2} style={{ verticalAlign: 'middle' }}>Particulars (Items)</th>
                      <th colSpan={3} style={{ textAlign: 'center', borderBottom: '1px solid var(--tally-border-light)' }}>Inwards</th>
                      <th colSpan={3} style={{ textAlign: 'center', borderBottom: '1px solid var(--tally-border-light)' }}>Outwards</th>
                      <th colSpan={3} style={{ textAlign: 'center', borderBottom: '1px solid var(--tally-border-light)' }}>Closing Balance</th>
                    </tr>
                    <tr>
                      <th style={{ textAlign: 'right', fontSize: '11px' }}>Qty</th>
                      <th style={{ textAlign: 'right', fontSize: '11px' }}>Rate</th>
                      <th style={{ textAlign: 'right', fontSize: '11px' }}>Value</th>
                      <th style={{ textAlign: 'right', fontSize: '11px' }}>Qty</th>
                      <th style={{ textAlign: 'right', fontSize: '11px' }}>Rate</th>
                      <th style={{ textAlign: 'right', fontSize: '11px' }}>Value</th>
                      <th style={{ textAlign: 'right', fontSize: '11px' }}>Qty</th>
                      <th style={{ textAlign: 'right', fontSize: '11px' }}>Rate</th>
                      <th style={{ textAlign: 'right', fontSize: '11px' }}>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.length === 0 ? (
                      <tr>
                        <td colSpan={10} style={{ textAlign: 'center', padding: '20px', color: 'var(--tally-text-secondary)' }}>
                          No stock items registered. Create one in "Inventory Info".
                        </td>
                      </tr>
                    ) : (
                      reportData.map((item: any) => (
                        <tr key={item.id}>
                          <td className="bold-row">{item.name}</td>
                          {/* Inwards */}
                          <td className="amount-col">{item.inwards.qty} {item.uom}</td>
                          <td className="amount-col">₹{item.inwards.rate.toFixed(2)}</td>
                          <td className="amount-col">₹{item.inwards.val.toFixed(2)}</td>
                          {/* Outwards */}
                          <td className="amount-col">{item.outwards.qty} {item.uom}</td>
                          <td className="amount-col">₹{item.outwards.rate.toFixed(2)}</td>
                          <td className="amount-col">₹{item.outwards.val.toFixed(2)}</td>
                          {/* Closing */}
                          <td className="amount-col" style={{ color: 'var(--tally-accent)' }}>{item.closing.qty} {item.uom}</td>
                          <td className="amount-col" style={{ color: 'var(--tally-accent)' }}>₹{item.closing.rate.toFixed(2)}</td>
                          <td className="amount-col" style={{ color: 'var(--tally-accent)' }}>₹{item.closing.val.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                    <tr className="total-row">
                      <td>Grand Total</td>
                      <td colSpan={2}></td>
                      <td className="amount-col">₹{reportData.reduce((sum: number, i: any) => sum + i.inwards.val, 0).toFixed(2)}</td>
                      <td colSpan={2}></td>
                      <td className="amount-col">₹{reportData.reduce((sum: number, i: any) => sum + i.outwards.val, 0).toFixed(2)}</td>
                      <td colSpan={2}></td>
                      <td className="amount-col">₹{reportData.reduce((sum: number, i: any) => sum + i.closing.val, 0).toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: '10px', textAlign: 'right' }} className="no-print">
                <button type="button" onClick={() => setCurrentScreen('GATEWAY')}>Back to Gateway (Esc)</button>
                <button type="button" onClick={() => window.print()} style={{ marginLeft: '10px', background: 'var(--tally-accent)', color: '#000', borderColor: 'var(--tally-accent)' }}>
                  🖨️ Print (Alt+P)
                </button>
              </div>
            </div>
          )}

          {/* 12. ITEM GROUPS MASTER */}
          {currentScreen === 'ITEMGROUPS_MASTER' && (
            <div className="tally-form-card">
              <h2 className="tally-form-title">Item Groups (Inventory Categories)</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', height: 'calc(100% - 60px)' }}>
                {/* Left: List of Item Groups */}
                <div style={{ borderRight: '1px solid var(--tally-border)', paddingRight: '15px', overflowY: 'auto' }}>
                  <h4 style={{ color: 'var(--tally-accent)', marginBottom: '10px' }}>Existing Item Groups:</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {itemGroups.length === 0 ? (
                      <p style={{ color: 'var(--tally-text-secondary)', fontStyle: 'italic' }}>No item groups created yet</p>
                    ) : (
                      itemGroups.map(group => (
                        <div key={group.id} style={{ padding: '10px', background: 'rgba(0,121,107,0.1)', borderRadius: '4px', borderLeft: '3px solid var(--tally-accent)' }}>
                          <div style={{ fontWeight: 600, color: 'var(--tally-accent)' }}>{group.name}</div>
                          {group.description && <div style={{ fontSize: '12px', color: 'var(--tally-text-secondary)' }}>{group.description}</div>}
                          <div style={{ fontSize: '11px', color: 'var(--tally-text-secondary)', marginTop: '5px' }}>Items: {group.stockItems?.length || 0}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Right: Create New Item Group Form */}
                <div style={{ paddingLeft: '15px' }}>
                  <h4 style={{ color: 'var(--tally-accent)', marginBottom: '15px' }}>Create New Item Group:</h4>
                  <form onSubmit={handleCreateItemGroup} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label className="form-label">Group Name:</label>
                      <input
                        type="text"
                        placeholder="e.g. Books, Stationery, Electronics"
                        value={newItemGroupName}
                        onChange={(e) => setNewItemGroupName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label">Description:</label>
                      <textarea
                        placeholder="Optional description"
                        value={newItemGroupDesc}
                        onChange={(e) => setNewItemGroupDesc(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                      <button type="button" onClick={() => setCurrentScreen('GATEWAY')} style={{ background: '#757575', borderColor: '#616161' }}>
                        Cancel
                      </button>
                      <button type="submit">Create Group</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* 13. SALES GROUPS MASTER */}
          {currentScreen === 'SALESGROUPS_MASTER' && (
            <div className="tally-form-card">
              <h2 className="tally-form-title">Sales Groups (Invoice Categories)</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', height: 'calc(100% - 60px)' }}>
                {/* Left: List of Sales Groups */}
                <div style={{ borderRight: '1px solid var(--tally-border)', paddingRight: '15px', overflowY: 'auto' }}>
                  <h4 style={{ color: 'var(--tally-accent)', marginBottom: '10px' }}>Existing Sales Groups:</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {salesGroups.length === 0 ? (
                      <p style={{ color: 'var(--tally-text-secondary)', fontStyle: 'italic' }}>No sales groups created yet</p>
                    ) : (
                      salesGroups.map(group => (
                        <div key={group.id} style={{ padding: '10px', background: 'rgba(0,121,107,0.1)', borderRadius: '4px', borderLeft: '3px solid var(--tally-accent)' }}>
                          <div style={{ fontWeight: 600, color: 'var(--tally-accent)' }}>{group.name}</div>
                          {group.description && <div style={{ fontSize: '12px', color: 'var(--tally-text-secondary)' }}>{group.description}</div>}
                          <div style={{ fontSize: '11px', color: 'var(--tally-text-secondary)', marginTop: '5px' }}>Invoices: {group.invoices?.length || 0}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Right: Create New Sales Group Form */}
                <div style={{ paddingLeft: '15px' }}>
                  <h4 style={{ color: 'var(--tally-accent)', marginBottom: '15px' }}>Create New Sales Group:</h4>
                  <form onSubmit={handleCreateSalesGroup} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label className="form-label">Group Name:</label>
                      <input
                        type="text"
                        placeholder="e.g. Local Sales, Online Sales, Wholesale"
                        value={newSalesGroupName}
                        onChange={(e) => setNewSalesGroupName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label">Description:</label>
                      <textarea
                        placeholder="Optional description"
                        value={newSalesGroupDesc}
                        onChange={(e) => setNewSalesGroupDesc(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                      <button type="button" onClick={() => setCurrentScreen('GATEWAY')} style={{ background: '#757575', borderColor: '#616161' }}>
                        Cancel
                      </button>
                      <button type="submit">Create Group</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* 14. CUSTOMER MASTER (TALLY STYLE) */}
          {currentScreen === 'CUSTOMER_CREATE' && (() => {
            let screenTitle = "Customer Creation";
            if (isCustomerReadOnly) screenTitle = "Customer Display";
            else if (editCustomerId) screenTitle = "Customer Alteration";

            const handleCancel = () => {
              if (isCustomerReadOnly) setCurrentScreen('CUSTOMER_DISPLAY_LIST');
              else if (editCustomerId) setCurrentScreen('CUSTOMER_ALTER_LIST');
              else setCurrentScreen('CUSTOMER_MENU');
            };

            return (
              <div className="tally-form-card" style={{ maxWidth: '800px' }}>
                <h2 className="tally-form-title">{screenTitle}</h2>
                <form onSubmit={handleCreateCustomer} className="form-grid">
                  <span className="form-label">Customer Name:</span>
                  <input
                    type="text"
                    placeholder="e.g. John Enterprises"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    disabled={isCustomerReadOnly}
                    autoFocus
                    required
                  />

                  <span className="form-label">Under Group:</span>
                  <span style={{ fontWeight: 600 }}>Sundry Debtors</span>
                  
                  <div style={{ gridColumn: 'span 2', marginTop: '10px' }}>
                    <h3 style={{ borderBottom: '1px solid var(--tally-border)', paddingBottom: '5px', marginBottom: '15px' }}>Mailing & Contact Details</h3>
                    <div className="form-grid">
                      <span className="form-label">Phone:</span>
                      <input
                        type="tel"
                        value={newCustomerPhone}
                        onChange={(e) => setNewCustomerPhone(e.target.value)}
                        disabled={isCustomerReadOnly}
                      />

                      <span className="form-label">Email:</span>
                      <input
                        type="email"
                        value={newCustomerEmail}
                        onChange={(e) => setNewCustomerEmail(e.target.value)}
                        disabled={isCustomerReadOnly}
                      />

                      <span className="form-label">GST No.:</span>
                      <input
                        type="text"
                        value={newCustomerGSTIN}
                        onChange={(e) => setNewCustomerGSTIN(e.target.value)}
                        disabled={isCustomerReadOnly}
                      />
                    </div>
                  </div>

                  <div className="form-actions no-print" style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                    {editCustomerId && !isCustomerReadOnly && (
                      <button 
                        type="button" 
                        onClick={() => handleDeleteCustomer(editCustomerId, newCustomerName)} 
                        style={{ background: '#d32f2f', borderColor: '#c62828', color: '#fff', marginRight: 'auto' }}
                      >
                        Delete (Alt+D)
                      </button>
                    )}
                    <button type="button" onClick={handleCancel} style={{ background: '#757575', borderColor: '#616161' }}>
                      {isCustomerReadOnly ? 'Back' : 'Cancel'}
                    </button>
                    {!isCustomerReadOnly && (
                      <button type="submit">
                        {editCustomerId ? 'Alter Customer' : 'Create Customer'}
                      </button>
                    )}
                  </div>
                </form>
              </div>
            );
          })()}

          {/* CUSTOMER DISPLAY & ALTER LIST SCREENS */}
          {(currentScreen === 'CUSTOMER_DISPLAY_LIST' || currentScreen === 'CUSTOMER_ALTER_LIST') && (
            <div className="tally-form-card" style={{ maxWidth: '600px', width: '100%' }}>
              <h2 className="tally-form-title">
                {currentScreen === 'CUSTOMER_DISPLAY_LIST' ? 'List of Customers (Display Mode)' : 'List of Customers (Alteration Mode)'}
              </h2>
              
              <div style={{ marginBottom: '15px' }}>
                <input
                  type="text"
                  placeholder="🔍 Search customer by name..."
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px' }}
                  autoFocus
                />
              </div>

              <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--tally-border-light)', borderRadius: '4px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }} className="report-table">
                  <thead>
                    <tr style={{ background: 'var(--tally-bg-mid)', borderBottom: '1px solid var(--tally-border)' }}>
                      <th style={{ padding: '8px', textAlign: 'left', color: 'var(--tally-accent)' }}>Customer Name</th>
                      <th style={{ padding: '8px', textAlign: 'left', color: 'var(--tally-accent)' }}>Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers
                      .filter(c => c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()))
                      .map(customer => {
                        const isAlter = currentScreen === 'CUSTOMER_ALTER_LIST';
                        const selectCustomer = () => {
                          setEditCustomerId(customer.id);
                          setIsCustomerReadOnly(!isAlter);
                          
                          // Populate states
                          setNewCustomerName(customer.name);
                          setNewCustomerPhone(customer.phone || '');
                          setNewCustomerEmail(customer.email || '');
                          setNewCustomerGSTIN(customer.gstin || '');
                          
                          setCurrentScreen('CUSTOMER_CREATE');
                        };
                        return (
                          <tr key={customer.id} onClick={selectCustomer} style={{ cursor: 'pointer', borderBottom: '1px solid var(--tally-border-light)' }}>
                            <td style={{ padding: '8px', color: '#fff' }}>{customer.name}</td>
                            <td style={{ padding: '8px', color: '#fff' }}>{customer.phone || '-'}</td>
                          </tr>
                        );
                      })}
                    {customers.length === 0 && (
                      <tr>
                        <td colSpan={2} style={{ padding: '15px', textAlign: 'center', color: 'var(--tally-text-secondary)' }}>
                          No customers found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: '15px', textAlign: 'right' }}>
                <button type="button" onClick={() => setCurrentScreen('CUSTOMER_MENU')} style={{ background: '#757575', borderColor: '#616161' }}>
                  Back
                </button>
              </div>
            </div>
          )}

          {/* 14. SUPPLIER MASTER (TALLY STYLE) */}
          {currentScreen === 'SUPPLIER_CREATE' && (() => {
            let screenTitle = "Supplier Creation";
            if (isCustomerReadOnly) screenTitle = "Supplier Display";
            else if (editSupplierId) screenTitle = "Supplier Alteration";

            const handleCancel = () => {
              if (isCustomerReadOnly) setCurrentScreen('SUPPLIER_DISPLAY_LIST');
              else if (editSupplierId) setCurrentScreen('SUPPLIER_ALTER_LIST');
              else setCurrentScreen('SUPPLIER_MENU');
            };

            return (
              <div className="tally-form-card" style={{ maxWidth: '800px' }}>
                <h2 className="tally-form-title">{screenTitle}</h2>
                <form onSubmit={handleCreateSupplier} className="form-grid">
                  <span className="form-label">Supplier Name:</span>
                  <input
                    type="text"
                    placeholder="e.g. Saurashtra Paper Mart"
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    disabled={isCustomerReadOnly}
                    autoFocus
                    required
                  />

                  <span className="form-label">Under Group:</span>
                  <span style={{ fontWeight: 600 }}>Sundry Creditors</span>
                  
                  <div style={{ gridColumn: 'span 2', marginTop: '10px' }}>
                    <h3 style={{ borderBottom: '1px solid var(--tally-border)', paddingBottom: '5px', marginBottom: '15px' }}>Mailing & Contact Details</h3>
                    <div className="form-grid">
                      <span className="form-label">Phone:</span>
                      <input
                        type="tel"
                        value={newSupplierPhone}
                        onChange={(e) => setNewSupplierPhone(e.target.value)}
                        disabled={isCustomerReadOnly}
                      />

                      <span className="form-label">Email:</span>
                      <input
                        type="email"
                        value={newSupplierEmail}
                        onChange={(e) => setNewSupplierEmail(e.target.value)}
                        disabled={isCustomerReadOnly}
                      />

                      <span className="form-label">GST No.:</span>
                      <input
                        type="text"
                        value={newSupplierGSTIN}
                        onChange={(e) => setNewSupplierGSTIN(e.target.value)}
                        disabled={isCustomerReadOnly}
                      />

                      <span className="form-label">Address:</span>
                      <input
                        type="text"
                        value={newSupplierAddress}
                        onChange={(e) => setNewSupplierAddress(e.target.value)}
                        disabled={isCustomerReadOnly}
                      />

                      <span className="form-label">City:</span>
                      <input
                        type="text"
                        value={newSupplierCity}
                        onChange={(e) => setNewSupplierCity(e.target.value)}
                        disabled={isCustomerReadOnly}
                      />

                      <span className="form-label">State:</span>
                      <input
                        type="text"
                        value={newSupplierState}
                        onChange={(e) => setNewSupplierState(e.target.value)}
                        disabled={isCustomerReadOnly}
                      />

                      <span className="form-label">PAN No:</span>
                      <input
                        type="text"
                        value={newSupplierPanNo}
                        onChange={(e) => setNewSupplierPanNo(e.target.value)}
                        disabled={isCustomerReadOnly}
                      />
                    </div>
                  </div>

                  <div className="form-actions no-print" style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                    {editSupplierId && !isCustomerReadOnly && (
                      <button 
                        type="button" 
                        onClick={() => handleDeleteSupplier(editSupplierId, newSupplierName)} 
                        style={{ background: '#d32f2f', borderColor: '#c62828', color: '#fff', marginRight: 'auto' }}
                      >
                        Delete (Alt+D)
                      </button>
                    )}
                    <button type="button" onClick={handleCancel} style={{ background: '#757575', borderColor: '#616161' }}>
                      {isCustomerReadOnly ? 'Back' : 'Cancel'}
                    </button>
                    {!isCustomerReadOnly && (
                      <button type="submit">
                        {editSupplierId ? 'Alter Supplier' : 'Create Supplier'}
                      </button>
                    )}
                  </div>
                </form>
              </div>
            );
          })()}

          {/* SUPPLIER DISPLAY & ALTER LIST SCREENS */}
          {(currentScreen === 'SUPPLIER_DISPLAY_LIST' || currentScreen === 'SUPPLIER_ALTER_LIST') && (
            <div className="tally-form-card" style={{ maxWidth: '600px', width: '100%' }}>
              <h2 className="tally-form-title">
                {currentScreen === 'SUPPLIER_DISPLAY_LIST' ? 'List of Suppliers (Display Mode)' : 'List of Suppliers (Alteration Mode)'}
              </h2>
              
              <div style={{ marginBottom: '15px' }}>
                <input
                  type="text"
                  placeholder="🔍 Search supplier by name..."
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px' }}
                  autoFocus
                />
              </div>

              <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--tally-border-light)', borderRadius: '4px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }} className="report-table">
                  <thead>
                    <tr style={{ background: 'var(--tally-bg-mid)', borderBottom: '1px solid var(--tally-border)' }}>
                      <th style={{ padding: '8px', textAlign: 'left', color: 'var(--tally-accent)' }}>Supplier Name</th>
                      <th style={{ padding: '8px', textAlign: 'left', color: 'var(--tally-accent)' }}>Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers
                      .filter(c => c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()))
                      .map(supplier => {
                        const isAlter = currentScreen === 'SUPPLIER_ALTER_LIST';
                        const selectSupplier = () => {
                          setEditSupplierId(supplier.id);
                          setIsCustomerReadOnly(!isAlter);
                          
                          setNewSupplierName(supplier.name);
                          setNewSupplierPhone(supplier.phone || '');
                          setNewSupplierEmail(supplier.email || '');
                          setNewSupplierGSTIN(supplier.gstin || '');
                          setNewSupplierAddress(supplier.address || '');
                          setNewSupplierCity(supplier.city || '');
                          setNewSupplierState(supplier.state || '');
                          setNewSupplierPanNo(supplier.panNo || '');
                          setNewSupplierGroupId(supplier.groupId || '');
                          
                          setCurrentScreen('SUPPLIER_CREATE');
                        };
                        return (
                          <tr key={supplier.id} onClick={selectSupplier} style={{ cursor: 'pointer', borderBottom: '1px solid var(--tally-border-light)' }}>
                            <td style={{ padding: '8px', color: '#fff' }}>{supplier.name}</td>
                            <td style={{ padding: '8px', color: '#fff' }}>{supplier.phone || '-'}</td>
                          </tr>
                        );
                      })}
                    {suppliers.length === 0 && (
                      <tr>
                        <td colSpan={2} style={{ padding: '15px', textAlign: 'center', color: 'var(--tally-text-secondary)' }}>
                          No suppliers found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: '15px', textAlign: 'right' }}>
                <button type="button" onClick={() => setCurrentScreen('SUPPLIER_MENU')} style={{ background: '#757575', borderColor: '#616161' }}>
                  Back
                </button>
              </div>
            </div>
          )}

          {/* 15. SALES INVOICE ENTRY - TALLY STYLE */}
          {currentScreen === 'SALES_INVOICE_ENTRY' && activeCompany && (
            <TallySalesInvoice
              companyId={activeCompany.id}
              activeCompany={activeCompany}
              customers={customers}
              stockItems={stockItems}
              systemDate={currentDate}
              onCancel={() => setCurrentScreen('GATEWAY')}
              onSuccess={() => {
                fetchCustomers();
                fetchStockItems();
                setCurrentScreen('GATEWAY');
              }}
              onRefreshCustomers={fetchCustomers}
              onRefreshStockItems={fetchStockItems}
            />
          )}

          {/* 15b. PURCHASE INVOICE ENTRY - TALLY STYLE */}
          {currentScreen === 'PURCHASE_INVOICE_ENTRY' && activeCompany && (
            <TallyPurchaseInvoice
              companyId={activeCompany.id}
              activeCompany={activeCompany}
              suppliers={suppliers}
              stockItems={stockItems}
              systemDate={currentDate}
              onCancel={() => setCurrentScreen('GATEWAY')}
              onSuccess={() => {
                fetchSuppliers();
                fetchStockItems();
                setCurrentScreen('GATEWAY');
              }}
              onRefreshSuppliers={fetchSuppliers}
              onRefreshStockItems={fetchStockItems}
            />
          )}

          {/* 16. PARTY LEDGER */}
          {currentScreen === 'PARTY_LEDGER' && activeCompany && (
            <PartyLedger
              companyId={activeCompany.id}
              activeCompany={activeCompany}
              ledgers={ledgers}
              fromDate={currentPeriodStart}
              toDate={currentPeriodEnd}
              onBack={() => setCurrentScreen('GATEWAY')}
              onRefreshLedgers={() => fetchLedgersAndGroups()}
            />
          )}

          {/* 17. SALES BY CUSTOMER REPORT */}
          {currentScreen === 'REPORT_SALES_BY_CUSTOMER' && reportData && (
            <div className="tally-report-card printable-area">
              <div className="report-header">
                <div>
                  <h2 className="report-title">Sales by Customer</h2>
                  <p style={{ fontSize: '12px', color: 'var(--tally-text-secondary)' }}>{activeCompany?.name}</p>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--tally-text-secondary)' }}>Sales Analytics</div>
              </div>
              <div className="report-table-container">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Customer Name</th>
                      <th style={{ width: '120px', textAlign: 'right' }}>Total Invoices</th>
                      <th style={{ width: '150px', textAlign: 'right' }}>Total Sales (₹)</th>
                      <th style={{ width: '150px', textAlign: 'right' }}>Total Paid (₹)</th>
                      <th style={{ width: '150px', textAlign: 'right' }}>Pending (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: 'var(--tally-text-secondary)' }}>
                          No invoice data available. Create sales invoices to see customer analytics.
                        </td>
                      </tr>
                    ) : (
                      reportData.map((customerData: any, idx: number) => (
                        <tr key={idx}>
                          <td className="bold-row">{customerData.customer.name}</td>
                          <td className="amount-col">{customerData.totalInvoices}</td>
                          <td className="amount-col">₹{customerData.totalAmount.toFixed(2)}</td>
                          <td className="amount-col" style={{ color: '#00796b' }}>₹{customerData.totalPaid.toFixed(2)}</td>
                          <td className="amount-col" style={{ color: '#ff6f00' }}>₹{customerData.totalPending.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: '10px', textAlign: 'right' }} className="no-print">
                <button type="button" onClick={() => setCurrentScreen('GATEWAY')}>Back to Gateway (Esc)</button>
                <button type="button" onClick={() => window.print()} style={{ marginLeft: '10px', background: 'var(--tally-accent)', color: '#000', borderColor: 'var(--tally-accent)' }}>
                  🖨️ Print (Alt+P)
                </button>
              </div>
            </div>
          )}

          {/* NEW REPORTS & SCREENS */}

          {/* REPORT: SALES REGISTER */}
          {currentScreen === 'REPORT_SALES_REGISTER' && reportData && (
            <div className="tally-report-card printable-area">
              <div className="report-header">
                <div>
                  <h2 className="report-title">Sales Register</h2>
                  <p style={{ fontSize: '12px', color: 'var(--tally-text-secondary)' }}>{activeCompany?.name} ({currentPeriodStart} to {currentPeriodEnd})</p>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--tally-text-secondary)' }}>Sales Voucher Registry</div>
              </div>
              <div className="report-table-container">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Invoice No</th>
                      <th>Particulars (Customer)</th>
                      <th style={{ textAlign: 'right' }}>Taxable Amt (₹)</th>
                      <th style={{ textAlign: 'right' }}>Tax Amt (₹)</th>
                      <th style={{ textAlign: 'right' }}>Gross Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.invoices?.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: 'var(--tally-text-secondary)' }}>No Sales Invoices entered in this period.</td>
                      </tr>
                    ) : (
                      reportData.invoices?.map((inv: any) => (
                        <tr key={inv.id}>
                          <td>{fmtDateForDisplay(inv.invoiceDate.split('T')[0], '-')}</td>
                          <td style={{ fontWeight: 'bold' }}>{inv.invoiceNo}</td>
                          <td style={{ color: 'var(--tally-accent)' }}>{inv.customer?.name || 'Cash Sales'}</td>
                          <td style={{ textAlign: 'right' }}>₹{(inv.subtotal - inv.discount).toFixed(2)}</td>
                          <td style={{ textAlign: 'right' }}>₹{inv.taxAmount.toFixed(2)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold' }}>₹{inv.totalAmount.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                    <tr className="total-row">
                      <td colSpan={3}>Grand Total</td>
                      <td style={{ textAlign: 'right' }}>₹{reportData.invoices?.reduce((s: number, inv: any) => s + (inv.subtotal - inv.discount), 0).toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>₹{reportData.invoices?.reduce((s: number, inv: any) => s + inv.taxAmount, 0).toFixed(2)}</td>
                      <td style={{ textAlign: 'right', color: 'var(--tally-accent)' }}>₹{reportData.summary?.totalSales.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: '10px', textAlign: 'right' }} className="no-print">
                <button type="button" onClick={() => setCurrentScreen('GATEWAY')}>Back to Gateway (Esc)</button>
                <button type="button" onClick={() => {
                  const csv = [
                    ['Date', 'Invoice No', 'Particulars', 'Taxable Amt', 'Tax Amt', 'Total'],
                    ...(reportData.invoices || []).map((inv: any) => [
                      inv.invoiceDate.split('T')[0],
                      inv.invoiceNo,
                      inv.customer?.name || 'Cash Sales',
                      (inv.subtotal - inv.discount).toFixed(2),
                      inv.taxAmount.toFixed(2),
                      inv.totalAmount.toFixed(2)
                    ])
                  ].map(row => row.join(',')).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.setAttribute('href', url);
                  a.setAttribute('download', `Sales_Register_${activeCompany?.name}.csv`);
                  a.click();
                }} style={{ marginLeft: '10px' }}>Export CSV</button>
                <button type="button" onClick={() => window.print()} style={{ marginLeft: '10px', background: 'var(--tally-accent)', color: '#000', borderColor: 'var(--tally-accent)' }}>🖨️ Print (Alt+P)</button>
              </div>
            </div>
          )}

          {/* REPORT: PURCHASE REGISTER */}
          {currentScreen === 'REPORT_PURCHASE_REGISTER' && reportData && (
            <div className="tally-report-card printable-area">
              <div className="report-header">
                <div>
                  <h2 className="report-title">Purchase Register</h2>
                  <p style={{ fontSize: '12px', color: 'var(--tally-text-secondary)' }}>{activeCompany?.name} ({currentPeriodStart} to {currentPeriodEnd})</p>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--tally-text-secondary)' }}>Purchase Voucher Registry</div>
              </div>
              <div className="report-table-container">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Invoice No</th>
                      <th>Particulars (Supplier)</th>
                      <th style={{ textAlign: 'right' }}>Taxable Amt (₹)</th>
                      <th style={{ textAlign: 'right' }}>Tax Amt (₹)</th>
                      <th style={{ textAlign: 'right' }}>Gross Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.invoices?.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: 'var(--tally-text-secondary)' }}>No Purchase Invoices entered in this period.</td>
                      </tr>
                    ) : (
                      reportData.invoices?.map((inv: any) => (
                        <tr key={inv.id}>
                          <td>{fmtDateForDisplay(inv.invoiceDate.split('T')[0], '-')}</td>
                          <td style={{ fontWeight: 'bold' }}>{inv.invoiceNo}</td>
                          <td style={{ color: 'var(--tally-accent)' }}>{inv.supplier?.name || 'Cash Purchases'}</td>
                          <td style={{ textAlign: 'right' }}>₹{(inv.subtotal - inv.discount).toFixed(2)}</td>
                          <td style={{ textAlign: 'right' }}>₹{inv.taxAmount.toFixed(2)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold' }}>₹{inv.totalAmount.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                    <tr className="total-row">
                      <td colSpan={3}>Grand Total</td>
                      <td style={{ textAlign: 'right' }}>₹{reportData.invoices?.reduce((s: number, inv: any) => s + (inv.subtotal - inv.discount), 0).toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>₹{reportData.invoices?.reduce((s: number, inv: any) => s + inv.taxAmount, 0).toFixed(2)}</td>
                      <td style={{ textAlign: 'right', color: 'var(--tally-accent)' }}>₹{reportData.summary?.totalPurchases.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: '10px', textAlign: 'right' }} className="no-print">
                <button type="button" onClick={() => setCurrentScreen('GATEWAY')}>Back to Gateway (Esc)</button>
                <button type="button" onClick={() => {
                  const csv = [
                    ['Date', 'Invoice No', 'Particulars', 'Taxable Amt', 'Tax Amt', 'Total'],
                    ...(reportData.invoices || []).map((inv: any) => [
                      inv.invoiceDate.split('T')[0],
                      inv.invoiceNo,
                      inv.supplier?.name || 'Cash Purchases',
                      (inv.subtotal - inv.discount).toFixed(2),
                      inv.taxAmount.toFixed(2),
                      inv.totalAmount.toFixed(2)
                    ])
                  ].map(row => row.join(',')).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.setAttribute('href', url);
                  a.setAttribute('download', `Purchase_Register_${activeCompany?.name}.csv`);
                  a.click();
                }} style={{ marginLeft: '10px' }}>Export CSV</button>
                <button type="button" onClick={() => window.print()} style={{ marginLeft: '10px', background: 'var(--tally-accent)', color: '#000', borderColor: 'var(--tally-accent)' }}>🖨️ Print (Alt+P)</button>
              </div>
            </div>
          )}

          {/* REPORT: CASH FLOW STATEMENT */}
          {currentScreen === 'REPORT_CASH_FLOW' && reportData && (
            <div className="tally-report-card printable-area">
              <div className="report-header">
                <div>
                  <h2 className="report-title">Cash Flow Statement</h2>
                  <p style={{ fontSize: '12px', color: 'var(--tally-text-secondary)' }}>{activeCompany?.name} ({currentPeriodStart} to {currentPeriodEnd})</p>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--tally-text-secondary)' }}>Inflow &amp; Outflow Analysis</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '10px' }}>
                <div>
                  <h3 style={{ color: 'var(--tally-accent)', paddingBottom: '5px', borderBottom: '1px solid var(--tally-border-light)' }}>Cash Inflows (Receipts)</h3>
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Particulars</th>
                        <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.inflows?.map((inf: any, idx: number) => (
                        <tr key={idx}>
                          <td>{fmtDateForDisplay(inf.date.split('T')[0], '-')}</td>
                          <td>{inf.particulars}</td>
                          <td style={{ textAlign: 'right', color: '#4ade80' }}>₹{inf.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                      {reportData.inflows?.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: '#64748b' }}>No Cash Inflows</td></tr>}
                      <tr className="total-row">
                        <td colSpan={2}>Total Inflows</td>
                        <td style={{ textAlign: 'right', color: '#4ade80' }}>₹{reportData.totalInflows?.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div>
                  <h3 style={{ color: '#ff6f00', paddingBottom: '5px', borderBottom: '1px solid var(--tally-border-light)' }}>Cash Outflows (Payments)</h3>
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Particulars</th>
                        <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.outflows?.map((outf: any, idx: number) => (
                        <tr key={idx}>
                          <td>{fmtDateForDisplay(outf.date.split('T')[0], '-')}</td>
                          <td>{outf.particulars}</td>
                          <td style={{ textAlign: 'right', color: '#f87171' }}>₹{outf.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                      {reportData.outflows?.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: '#64748b' }}>No Cash Outflows</td></tr>}
                      <tr className="total-row">
                        <td colSpan={2}>Total Outflows</td>
                        <td style={{ textAlign: 'right', color: '#f87171' }}>₹{reportData.totalOutflows?.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div style={{ borderTop: '2px solid var(--tally-accent)', marginTop: '20px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                <span>Opening Cash Balance: ₹{reportData.openingBalance?.toFixed(2)}</span>
                <span style={{ color: reportData.netCashFlow >= 0 ? '#4ade80' : '#f87171' }}>Net Flow: ₹{reportData.netCashFlow?.toFixed(2)}</span>
                <span style={{ color: 'var(--tally-accent)' }}>Closing Balance: ₹{reportData.closingBalance?.toFixed(2)}</span>
              </div>
              <div style={{ marginTop: '20px', textAlign: 'right' }} className="no-print">
                <button type="button" onClick={() => setCurrentScreen('GATEWAY')}>Back to Gateway (Esc)</button>
                <button type="button" onClick={() => window.print()} style={{ marginLeft: '10px', background: 'var(--tally-accent)', color: '#000', borderColor: 'var(--tally-accent)' }}>🖨️ Print (Alt+P)</button>
              </div>
            </div>
          )}

          {/* REPORT: OUTSTANDING RECEIVABLES */}
          {currentScreen === 'REPORT_RECEIVABLES' && reportData && (
            <div className="tally-report-card printable-area">
              <div className="report-header">
                <div>
                  <h2 className="report-title">Outstanding Receivables (Sundry Debtors)</h2>
                  <p style={{ fontSize: '12px', color: 'var(--tally-text-secondary)' }}>{activeCompany?.name} (As on {currentPeriodEnd})</p>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--tally-text-secondary)' }}>Customer Ageing Statement</div>
              </div>
              <div className="report-table-container">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Customer/Party Ledger</th>
                      <th style={{ textAlign: 'right' }}>0-30 Days</th>
                      <th style={{ textAlign: 'right' }}>31-60 Days</th>
                      <th style={{ textAlign: 'right' }}>61-90 Days</th>
                      <th style={{ textAlign: 'right' }}>&gt;90 Days</th>
                      <th style={{ textAlign: 'right' }}>Total Outstanding (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.receivables?.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: 'var(--tally-text-secondary)' }}>No outstanding customer accounts.</td>
                      </tr>
                    ) : (
                      reportData.receivables?.map((rec: any) => {
                        const sumB = (bName: string) => rec.bills?.filter((b: any) => b.bucket === bName).reduce((s: number, b: any) => s + b.pending, 0) || 0;
                        return (
                          <tr key={rec.ledgerId}>
                            <td className="bold-row" style={{ color: 'var(--tally-accent)' }}>{rec.name}</td>
                            <td style={{ textAlign: 'right' }}>₹{sumB('0-30').toFixed(2)}</td>
                            <td style={{ textAlign: 'right' }}>₹{sumB('31-60').toFixed(2)}</td>
                            <td style={{ textAlign: 'right' }}>₹{sumB('61-90').toFixed(2)}</td>
                            <td style={{ textAlign: 'right', color: '#ff8a65' }}>₹{sumB('90+').toFixed(2)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>₹{rec.outstanding.toFixed(2)}</td>
                          </tr>
                        );
                      })
                    )}
                    <tr className="total-row">
                      <td>Grand Total</td>
                      <td style={{ textAlign: 'right' }}>
                        ₹{(reportData.receivables || []).reduce((sum: number, rec: any) => sum + (rec.bills?.filter((b: any) => b.bucket === '0-30').reduce((s: number, b: any) => s + b.pending, 0) || 0), 0).toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        ₹{(reportData.receivables || []).reduce((sum: number, rec: any) => sum + (rec.bills?.filter((b: any) => b.bucket === '31-60').reduce((s: number, b: any) => s + b.pending, 0) || 0), 0).toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        ₹{(reportData.receivables || []).reduce((sum: number, rec: any) => sum + (rec.bills?.filter((b: any) => b.bucket === '61-90').reduce((s: number, b: any) => s + b.pending, 0) || 0), 0).toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right', color: '#ff8a65' }}>
                        ₹{(reportData.receivables || []).reduce((sum: number, rec: any) => sum + (rec.bills?.filter((b: any) => b.bucket === '90+').reduce((s: number, b: any) => s + b.pending, 0) || 0), 0).toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--tally-accent)' }}>₹{reportData.totalOutstanding?.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: '20px', textAlign: 'right' }} className="no-print">
                <button type="button" onClick={() => setCurrentScreen('GATEWAY')}>Back to Gateway (Esc)</button>
                <button type="button" onClick={() => window.print()} style={{ marginLeft: '10px', background: 'var(--tally-accent)', color: '#000', borderColor: 'var(--tally-accent)' }}>🖨️ Print (Alt+P)</button>
              </div>
            </div>
          )}

          {/* REPORT: OUTSTANDING PAYABLES */}
          {currentScreen === 'REPORT_PAYABLES' && reportData && (
            <div className="tally-report-card printable-area">
              <div className="report-header">
                <div>
                  <h2 className="report-title">Outstanding Payables (Sundry Creditors)</h2>
                  <p style={{ fontSize: '12px', color: 'var(--tally-text-secondary)' }}>{activeCompany?.name} (As on {currentPeriodEnd})</p>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--tally-text-secondary)' }}>Supplier Ageing Statement</div>
              </div>
              <div className="report-table-container">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Supplier/Vendor Ledger</th>
                      <th style={{ textAlign: 'right' }}>0-30 Days</th>
                      <th style={{ textAlign: 'right' }}>31-60 Days</th>
                      <th style={{ textAlign: 'right' }}>61-90 Days</th>
                      <th style={{ textAlign: 'right' }}>&gt;90 Days</th>
                      <th style={{ textAlign: 'right' }}>Total Outstanding (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.payables?.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: 'var(--tally-text-secondary)' }}>No outstanding supplier accounts.</td>
                      </tr>
                    ) : (
                      reportData.payables?.map((rec: any) => {
                        const sumB = (bName: string) => rec.bills?.filter((b: any) => b.bucket === bName).reduce((s: number, b: any) => s + b.pending, 0) || 0;
                        return (
                          <tr key={rec.ledgerId}>
                            <td className="bold-row" style={{ color: 'var(--tally-accent)' }}>{rec.name}</td>
                            <td style={{ textAlign: 'right' }}>₹{sumB('0-30').toFixed(2)}</td>
                            <td style={{ textAlign: 'right' }}>₹{sumB('31-60').toFixed(2)}</td>
                            <td style={{ textAlign: 'right' }}>₹{sumB('61-90').toFixed(2)}</td>
                            <td style={{ textAlign: 'right', color: '#ff8a65' }}>₹{sumB('90+').toFixed(2)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>₹{rec.outstanding.toFixed(2)}</td>
                          </tr>
                        );
                      })
                    )}
                    <tr className="total-row">
                      <td>Grand Total</td>
                      <td style={{ textAlign: 'right' }}>
                        ₹{(reportData.payables || []).reduce((sum: number, rec: any) => sum + (rec.bills?.filter((b: any) => b.bucket === '0-30').reduce((s: number, b: any) => s + b.pending, 0) || 0), 0).toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        ₹{(reportData.payables || []).reduce((sum: number, rec: any) => sum + (rec.bills?.filter((b: any) => b.bucket === '31-60').reduce((s: number, b: any) => s + b.pending, 0) || 0), 0).toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        ₹{(reportData.payables || []).reduce((sum: number, rec: any) => sum + (rec.bills?.filter((b: any) => b.bucket === '61-90').reduce((s: number, b: any) => s + b.pending, 0) || 0), 0).toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right', color: '#ff8a65' }}>
                        ₹{(reportData.payables || []).reduce((sum: number, rec: any) => sum + (rec.bills?.filter((b: any) => b.bucket === '90+').reduce((s: number, b: any) => s + b.pending, 0) || 0), 0).toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--tally-accent)' }}>₹{reportData.totalOutstanding?.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: '20px', textAlign: 'right' }} className="no-print">
                <button type="button" onClick={() => setCurrentScreen('GATEWAY')}>Back to Gateway (Esc)</button>
                <button type="button" onClick={() => window.print()} style={{ marginLeft: '10px', background: 'var(--tally-accent)', color: '#000', borderColor: 'var(--tally-accent)' }}>🖨️ Print (Alt+P)</button>
              </div>
            </div>
          )}

          {/* REPORT: GST SUMMARY REPORT */}
          {currentScreen === 'REPORT_GST_SUMMARY' && reportData && (
            <div className="tally-report-card printable-area">
              <div className="report-header">
                <div>
                  <h2 className="report-title">GST Summary Report (GSTR-1 &amp; GSTR-3B Basis)</h2>
                  <p style={{ fontSize: '12px', color: 'var(--tally-text-secondary)' }}>{activeCompany?.name} ({currentPeriodStart} to {currentPeriodEnd})</p>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--tally-text-secondary)' }}>GST Liability &amp; Input Tax Credit (ITC)</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '10px' }}>
                <div>
                  <h3 style={{ color: 'var(--tally-accent)', paddingBottom: '5px', borderBottom: '1px solid var(--tally-border-light)' }}>Outward Supplies (Sales)</h3>
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Party</th>
                        <th>GSTIN</th>
                        <th style={{ textAlign: 'right' }}>Taxable Amt (₹)</th>
                        <th style={{ textAlign: 'right' }}>Tax Collected (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.sales?.map((s: any, idx: number) => (
                        <tr key={idx}>
                          <td>{s.partyName}</td>
                          <td>{s.gstin}</td>
                          <td style={{ textAlign: 'right' }}>₹{s.taxableValue.toFixed(2)}</td>
                          <td style={{ textAlign: 'right', color: '#4ade80' }}>₹{s.taxAmount.toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr className="total-row">
                        <td colSpan={2}>Total Outward Supplies</td>
                        <td style={{ textAlign: 'right' }}>₹{reportData.summary?.totalSalesTaxable.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', color: '#4ade80' }}>₹{reportData.summary?.totalSalesTax.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div>
                  <h3 style={{ color: '#fb923c', paddingBottom: '5px', borderBottom: '1px solid var(--tally-border-light)' }}>Inward Supplies (Purchases/ITC)</h3>
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Party</th>
                        <th>GSTIN</th>
                        <th style={{ textAlign: 'right' }}>Taxable Amt (₹)</th>
                        <th style={{ textAlign: 'right' }}>Tax Paid (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.purchases?.map((p: any, idx: number) => (
                        <tr key={idx}>
                          <td>{p.partyName}</td>
                          <td>{p.gstin}</td>
                          <td style={{ textAlign: 'right' }}>₹{p.taxableValue.toFixed(2)}</td>
                          <td style={{ textAlign: 'right', color: '#fb923c' }}>₹{p.taxAmount.toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr className="total-row">
                        <td colSpan={2}>Total Inward Supplies</td>
                        <td style={{ textAlign: 'right' }}>₹{reportData.summary?.totalPurchasesTaxable.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', color: '#fb923c' }}>₹{reportData.summary?.totalPurchasesTax.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div style={{ borderTop: '2px solid var(--tally-accent)', marginTop: '20px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                <span>Total Tax Liability: ₹{reportData.summary?.totalSalesTax.toFixed(2)}</span>
                <span>Total ITC Claimable: ₹{reportData.summary?.totalPurchasesTax.toFixed(2)}</span>
                <span style={{ color: reportData.summary?.netTaxLiability >= 0 ? '#ff8a65' : '#4ade80' }}>
                  Net GST Payable: ₹{reportData.summary?.netTaxLiability.toFixed(2)}
                </span>
              </div>
              <div style={{ marginTop: '20px', textAlign: 'right' }} className="no-print">
                <button type="button" onClick={() => setCurrentScreen('GATEWAY')}>Back to Gateway (Esc)</button>
                <button type="button" onClick={() => window.print()} style={{ marginLeft: '10px', background: 'var(--tally-accent)', color: '#000', borderColor: 'var(--tally-accent)' }}>🖨️ Print (Alt+P)</button>
              </div>
            </div>
          )}

          {/* VOUCHER LIST & MANAGEMENT SCREEN */}
          {/* currentScreen === 'VOUCHER_LIST' && (
            <VoucherListScreen
              companyId={activeCompany?.id || ''}
              onBack={() => setCurrentScreen('GATEWAY')}
              onAlterVoucher={(voucherId: any) => {
                // setEditingVoucherId(voucherId);
                setCurrentScreen('VOUCHER_ALTER');
              }}
            />
          )*/}

          {/* VOUCHER ALTERATION SCREEN */}
          {/* currentScreen === 'VOUCHER_ALTER' && (
            <VoucherAlterationScreen
              companyId={activeCompany?.id || ''}
              voucherId={editingVoucherId || ''}
              onBack={() => {
                // setEditingVoucherId(null);
                setCurrentScreen('VOUCHER_LIST');
              }}
              onSaveSuccess={() => {
                // setEditingVoucherId(null);
                setCurrentScreen('VOUCHER_LIST');
              }}
            />
          )*/}

          {/* 18. PRICE LIST & INVENTORY PRICE MANAGER */}
          {currentScreen === 'PRICE_LIST' && (
            <div className="tally-report-card no-print" style={{ fontFamily: "'Courier New', Courier, monospace" }}>
              <div className="report-header" style={{ borderBottom: '2px solid var(--tally-accent)', paddingBottom: '10px', marginBottom: '15px' }}>
                <div>
                  <h2 className="report-title" style={{ color: 'var(--tally-accent)' }}>Price List &amp; Inventory Manager</h2>
                  <p style={{ fontSize: '12.5px', color: 'var(--tally-text-secondary)', marginTop: '4px' }}>
                    Quickly configure prices, stock quantities, and brand makes for your catalog.
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: '13px' }}>{activeCompany?.name}</span>
                  <div style={{ fontSize: '11px', color: 'var(--tally-text-secondary)', marginTop: '2px' }}>Inventory Info</div>
                </div>
              </div>

              {/* FILTERS & SEARCH ROW */}
              <div style={{ display: 'flex', gap: '20px', background: 'rgba(0,0,0,0.2)', padding: '10px 15px', borderRadius: '4px', marginBottom: '15px', border: '1px solid var(--tally-border-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: 'var(--tally-accent)', fontSize: '12px', fontWeight: 700 }}>Stock Group:</span>
                  <select
                    value={priceListGroupFilter}
                    onChange={e => setPriceListGroupFilter(e.target.value)}
                    style={{ background: '#0d2318', color: '#fff', border: '1px solid var(--tally-border-light)', padding: '4px 8px', fontSize: '12px', fontFamily: 'Courier New', outline: 'none' }}
                  >
                    <option value="ALL">All Items</option>
                    {itemGroups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                  <span style={{ color: 'var(--tally-accent)', fontSize: '12px', fontWeight: 700 }}>Search Item:</span>
                  <input
                    type="text"
                    value={priceListSearchQuery}
                    onChange={e => setPriceListSearchQuery(e.target.value)}
                    placeholder="Enter item name or SKU..."
                    style={{ background: '#0d2318', color: '#fff', border: '1px solid var(--tally-border-light)', padding: '4px 8px', fontSize: '12px', fontFamily: 'Courier New', outline: 'none', flex: 1 }}
                  />
                </div>

                {Object.keys(priceListChanges).length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', color: '#facc15', fontSize: '12px', fontWeight: 700, gap: '5px' }}>
                    ⚠️ {Object.keys(priceListChanges).length} unsaved changes
                  </div>
                )}
              </div>

              {/* MAIN EDITABLE GRID */}
              <div className="report-table-container" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                <table className="report-table" style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <thead>
                    <tr style={{ background: '#112217' }}>
                      <th style={{ width: '40px', textAlign: 'center' }}>Sl</th>
                      <th>Stock Item Particulars</th>
                      <th style={{ width: '120px' }}>Alias / SKU</th>
                      <th style={{ width: '160px' }}>Make (Brand)</th>
                      <th style={{ width: '60px', textAlign: 'center' }}>UOM</th>
                      <th style={{ width: '110px', textAlign: 'right' }}>Cost Price (₹)</th>
                      <th style={{ width: '110px', textAlign: 'right' }}>Sale Price (₹)</th>
                      <th style={{ width: '90px', textAlign: 'right' }}>Disc %</th>
                      <th style={{ width: '90px', textAlign: 'right' }}>Open Qty</th>
                      <th style={{ width: '100px', textAlign: 'right' }}>Open Rate</th>
                      <th style={{ width: '90px', textAlign: 'right' }}>Current Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockItems.length === 0 ? (
                      <tr>
                        <td colSpan={11} style={{ textAlign: 'center', padding: '30px', color: 'var(--tally-text-secondary)' }}>
                          No stock items found. Please register stock items under "Inventory Info".
                        </td>
                      </tr>
                    ) : (
                      (() => {
                        const filteredItems = stockItems.filter(item => {
                          const matchesGroup = priceListGroupFilter === 'ALL' || item.groupId === priceListGroupFilter;
                          const matchesSearch = !priceListSearchQuery || 
                            item.name.toLowerCase().includes(priceListSearchQuery.toLowerCase()) ||
                            (item.aliasCode && item.aliasCode.toLowerCase().includes(priceListSearchQuery.toLowerCase()));
                          return matchesGroup && matchesSearch;
                        });

                        if (filteredItems.length === 0) {
                          return (
                            <tr>
                              <td colSpan={11} style={{ textAlign: 'center', padding: '20px', color: 'var(--tally-text-secondary)' }}>
                                No items matching search filters.
                              </td>
                            </tr>
                          );
                        }

                        // Group items
                        const grouped: Record<string, typeof stockItems> = {};
                        filteredItems.forEach(item => {
                          const gName = item.groupName || 'Primary';
                          if (!grouped[gName]) grouped[gName] = [];
                          grouped[gName].push(item);
                        });

                        let serial = 1;

                        const inputStyle = {
                          background: '#143022',
                          color: '#fbbf24',
                          border: '1px solid #005a4e',
                          padding: '3px 6px',
                          fontFamily: "'Courier New', monospace",
                          width: '100%',
                          fontSize: '11.5px',
                          outline: 'none',
                          borderRadius: '2px',
                          transition: 'border-color 0.2s'
                        };

                        return Object.entries(grouped).map(([groupName, items]) => (
                          <React.Fragment key={groupName}>
                            {/* Group Header Row */}
                            <tr style={{ background: 'rgba(0, 121, 107, 0.15)' }}>
                              <td colSpan={11} style={{ padding: '6px 10px', fontWeight: 'bold', color: 'var(--tally-accent)', letterSpacing: '1px', borderBottom: '1px solid var(--tally-border-light)' }}>
                                📁 Group: {groupName.toUpperCase()}
                              </td>
                            </tr>
                            {/* Item Rows */}
                            {items.map(item => {
                              const currSerial = serial++;
                              const changes = priceListChanges[item.id] || {};
                              
                              const makeVal = changes.make !== undefined ? changes.make : (item.make || '');
                              const purchasePriceVal = changes.purchasePrice !== undefined ? changes.purchasePrice : String(item.purchasePrice || 0);
                              const salePriceVal = changes.salePrice !== undefined ? changes.salePrice : String(item.salePrice || 0);
                              const discountVal = changes.discount !== undefined ? changes.discount : String(item.discount || 0);
                              const openingQtyVal = changes.openingQty !== undefined ? changes.openingQty : String(item.opening?.qty ?? 0);
                              const openingRateVal = changes.openingRate !== undefined ? changes.openingRate : String(item.opening?.rate ?? 0);

                              const updateField = (field: 'make' | 'salePrice' | 'purchasePrice' | 'discount' | 'openingQty' | 'openingRate', val: string) => {
                                setPriceListChanges(prev => {
                                  const itemChanges = { ...prev[item.id] };
                                  itemChanges[field] = val;
                                  return { ...prev, [item.id]: itemChanges };
                                });
                              };

                              return (
                                <tr key={item.id} style={{ borderBottom: '1px solid var(--tally-border-light)' }}>
                                  <td style={{ textAlign: 'center', color: 'var(--tally-text-secondary)' }}>{currSerial}</td>
                                  <td style={{ fontWeight: 'bold', color: '#fff' }}>{item.name}</td>
                                  <td style={{ color: 'var(--tally-text-secondary)', fontSize: '11px' }}>{item.aliasCode || '-'}</td>
                                  
                                  {/* Make (Brand) */}
                                  <td>
                                    <input
                                      type="text"
                                      value={makeVal}
                                      onChange={e => updateField('make', e.target.value)}
                                      style={inputStyle}
                                      placeholder="Brand/Make"
                                    />
                                  </td>

                                  <td style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8' }}>{item.uom}</td>

                                  {/* Cost Price */}
                                  <td>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={purchasePriceVal}
                                      onChange={e => updateField('purchasePrice', e.target.value)}
                                      style={{ ...inputStyle, textAlign: 'right' }}
                                    />
                                  </td>

                                  {/* Sale Price */}
                                  <td>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={salePriceVal}
                                      onChange={e => updateField('salePrice', e.target.value)}
                                      style={{ ...inputStyle, textAlign: 'right' }}
                                    />
                                  </td>

                                  {/* Discount */}
                                  <td>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      max="100"
                                      value={discountVal}
                                      onChange={e => updateField('discount', e.target.value)}
                                      style={{ ...inputStyle, textAlign: 'right' }}
                                    />
                                  </td>

                                  {/* Opening Qty */}
                                  <td>
                                    <input
                                      type="number"
                                      step="0.001"
                                      min="0"
                                      value={openingQtyVal}
                                      onChange={e => updateField('openingQty', e.target.value)}
                                      style={{ ...inputStyle, textAlign: 'right' }}
                                    />
                                  </td>

                                  {/* Opening Rate */}
                                  <td>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={openingRateVal}
                                      onChange={e => updateField('openingRate', e.target.value)}
                                      style={{ ...inputStyle, textAlign: 'right' }}
                                    />
                                  </td>

                                  {/* Closing Qty (calculated read-only) */}
                                  <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--tally-accent)', paddingRight: '10px' }}>
                                    {item.closing?.qty ?? 0} {item.uom}
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        ));
                      })()
                    )}
                  </tbody>
                </table>
              </div>

              {/* BOTTOM CONTROL BUTTONS */}
              <div style={{ marginTop: '20px', display: 'flex', gap: '15px', borderTop: '1px solid var(--tally-border-light)', paddingTop: '15px' }}>
                <button
                  type="button"
                  onClick={handleSavePriceList}
                  style={{ background: 'var(--tally-accent)', color: '#000', borderColor: 'var(--tally-accent)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  ✔ Accept Changes <span style={{ fontWeight: 400, fontSize: '10px', opacity: 0.8 }}>(Ctrl+A)</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setPriceListChanges({});
                    fetchStockItems();
                    showStatus('Changes reloaded & reset', 'success');
                  }}
                  style={{ background: '#374151', color: '#fff', borderColor: '#4b5563' }}
                >
                  🔄 Reload / Reset <span style={{ fontWeight: 400, fontSize: '10px', opacity: 0.8 }}>(Alt+R)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentScreen('GATEWAY')}
                  style={{ background: '#1f2937', color: '#f3f4f6', borderColor: '#374151', marginLeft: 'auto' }}
                >
                  ✕ Quit <span style={{ fontWeight: 400, fontSize: '10px', opacity: 0.8 }}>(Esc)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Footer Bar */}
      <footer className="tally-footer">
        <button className="footer-btn" onClick={() => {
          setTempDate(currentDate);
          setShowChangeDate(true);
        }}>
          <span>F2</span> Date
        </button>
        <button className="footer-btn" onClick={() => {
          setTempPeriodStart(currentPeriodStart);
          setTempPeriodEnd(currentPeriodEnd);
          setShowChangePeriod(true);
        }}>
          <span>Alt+F2</span> Period
        </button>
        {([
          { key:'F4', label:'Contra',   type:'CONTRA'   },
          { key:'F5', label:'Payment',  type:'PAYMENT'  },
          { key:'F6', label:'Receipt',  type:'RECEIPT'  },
          { key:'F7', label:'Journal',  type:'JOURNAL'  },
          { key:'F8', label:'Sales',    type:'SALES'    },
          { key:'F9', label:'Purchase', type:'PURCHASE' },
        ] as Array<{ key: string; label: string; type: typeof vType }>).map(vt => (
          <button
            key={vt.type}
            className={`footer-btn ${currentScreen === 'VOUCHER_ENTRY' && vType === vt.type ? 'footer-btn-active' : ''}`}
            onClick={() => { setVType(vt.type); setCurrentScreen('VOUCHER_ENTRY'); }}
          >
            <span>{vt.key}</span> {vt.label}
          </button>
        ))}
        
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '15px', fontSize: '11px', color: 'var(--tally-text-secondary)', alignItems: 'center' }}>
          {systemClock && (
            <span style={{ color: '#fbbf24', fontWeight: 'bold', fontFamily: "'Courier New', Courier, monospace" }}>
              {systemClock}
            </span>
          )}
          <span style={{ borderLeft: '1px solid var(--tally-border-light)', paddingLeft: '15px', color: '#fbbf24', fontWeight: 'bold' }}>Developed by Mohit Jain</span>
          <span style={{ borderLeft: '1px solid var(--tally-border-light)', paddingLeft: '15px' }}>Version: OpenLedger ERP (Free Edition)</span>
          <span style={{ borderLeft: '1px solid var(--tally-border-light)', paddingLeft: '15px' }}>OS: {getOSClientName()}</span>
          <span style={{ borderLeft: '1px solid var(--tally-border-light)', paddingLeft: '15px', color: 'var(--tally-accent)' }}>Online</span>
        </div>
      </footer>

      {/* Change Date Modal */}
      {showChangeDate && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.6)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <div className="tally-form-card" style={{ width: '380px', padding: '15px' }}>
            <div className="tally-form-title" style={{ fontSize: '15px', marginBottom: '15px', borderBottom: '1px solid var(--tally-border)' }}>
              Change Date
            </div>
            <div className="form-grid" style={{ gridTemplateColumns: '120px 1fr', gap: '10px' }}>
              <span className="form-label">Current Date:</span>
              <input
                type="date"
                value={tempDate}
                onChange={(e) => setTempDate(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setCurrentDate(tempDate);
                    setShowChangeDate(false);
                  } else if (e.key === 'Escape') {
                    setShowChangeDate(false);
                  }
                }}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
              <button
                type="button"
                onClick={() => setShowChangeDate(false)}
                style={{ background: '#757575', borderColor: '#616161', padding: '4px 10px', fontSize: '12px' }}
              >
                Cancel (Esc)
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentDate(tempDate);
                  setShowChangeDate(false);
                }}
                style={{ background: 'var(--tally-accent)', color: '#000', borderColor: 'var(--tally-accent)', padding: '4px 10px', fontSize: '12px' }}
              >
                Accept (Enter)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Period Modal */}
      {showChangePeriod && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.6)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <div className="tally-form-card" style={{ width: '380px', padding: '15px' }}>
            <div className="tally-form-title" style={{ fontSize: '15px', marginBottom: '15px', borderBottom: '1px solid var(--tally-border)' }}>
              Change Period
            </div>
            <div className="form-grid" style={{ gridTemplateColumns: '120px 1fr', gap: '10px' }}>
              <span className="form-label">From:</span>
              <input
                type="date"
                value={tempPeriodStart}
                onChange={(e) => setTempPeriodStart(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    document.getElementById('temp-period-end-input')?.focus();
                  } else if (e.key === 'Escape') {
                    setShowChangePeriod(false);
                  }
                }}
                style={{ width: '100%' }}
              />
              <span className="form-label">To:</span>
              <input
                id="temp-period-end-input"
                type="date"
                value={tempPeriodEnd}
                onChange={(e) => setTempPeriodEnd(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setCurrentPeriodStart(tempPeriodStart);
                    setCurrentPeriodEnd(tempPeriodEnd);
                    setShowChangePeriod(false);
                  } else if (e.key === 'Escape') {
                    setShowChangePeriod(false);
                  }
                }}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
              <button
                type="button"
                onClick={() => setShowChangePeriod(false)}
                style={{ background: '#757575', borderColor: '#616161', padding: '4px 10px', fontSize: '12px' }}
              >
                Cancel (Esc)
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentPeriodStart(tempPeriodStart);
                  setCurrentPeriodEnd(tempPeriodEnd);
                  setShowChangePeriod(false);
                }}
                style={{ background: 'var(--tally-accent)', color: '#000', borderColor: 'var(--tally-accent)', padding: '4px 10px', fontSize: '12px' }}
              >
                Accept (Enter)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
