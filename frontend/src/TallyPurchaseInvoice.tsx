import React, { useState, useEffect, useRef, useCallback } from 'react';

const API_BASE = 'http://localhost:5010/api';

interface StockItem {
  id: string;
  name: string;
  aliasCode?: string;
  purchasePrice: number;
  discount: number;
  groupName?: string;
  closing?: { qty: number; rate: number };
}

interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  gstin?: string;
}

interface InvoiceLine {
  id: string;
  aliasOrName: string;
  stockItemId: string;
  itemName: string;
  group: string;
  mrp: number;
  qty: number;
  discountPct: number;
  amount: number;
  stock: number;
}

interface Props {
  companyId: string;
  suppliers: Supplier[];
  stockItems: StockItem[];
  onCancel: () => void;
  onSuccess: () => void;
  activeCompany?: any;
  onRefreshSuppliers?: () => Promise<void> | void;
  onRefreshStockItems?: () => Promise<void> | void;
  systemDate?: string;
}

function numToWords(n: number): string {
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const num = Math.floor(n);
  if (num === 0) return 'Zero Rupees Only';

  function g(n: number): string {
    if (n < 20) return a[n];
    const digit = n % 10;
    return b[Math.floor(n / 10)] + (digit ? ' ' + a[digit] : '');
  }

  function c(n: number): string {
    if (n < 100) return g(n);
    return a[n / 100 | 0] + ' Hundred' + (n % 100 ? ' and ' + g(n % 100) : '');
  }

  let str = '';
  const crore = num / 10000000 | 0;
  if (crore > 0) {
    str += c(crore) + ' Crore ';
  }
  const lakh = (num % 10000000) / 100000 | 0;
  if (lakh > 0) {
    str += c(lakh) + ' Lakh ';
  }
  const thousand = (num % 100000) / 1000 | 0;
  if (thousand > 0) {
    str += c(thousand) + ' Thousand ';
  }
  const remaining = num % 1000;
  if (remaining > 0) {
    str += c(remaining);
  }

  return str.trim() + ' Rupees Only';
}

export default function TallyPurchaseInvoice({ companyId, suppliers, stockItems, onCancel, onSuccess, activeCompany, onRefreshSuppliers, onRefreshStockItems, systemDate }: Props) {
  // ---- Invoice header state ----
  const [billNo, setBillNo] = useState('...');
  const [refNo, setRefNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(systemDate || new Date().toISOString().split('T')[0]);

  // ---- Invoice navigation state ----
  const [savedInvoices, setSavedInvoices] = useState<any[]>([]);
  const [currentInvoiceIndex, setCurrentInvoiceIndex] = useState<number | null>(null);

  // ---- Party (supplier) state ----
  const [partySearch, setPartySearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [partyHighlightIdx, setPartyHighlightIdx] = useState(0);
  const [filteredParties, setFilteredParties] = useState<Supplier[]>([]);
  const [showCreateParty, setShowCreateParty] = useState(false);

  // ---- New party inline form state ----
  const [newParty, setNewParty] = useState({
    name: '', phone: '', email: '', address: '', city: '', state: '', gstin: '', groupId: ''
  });

  // ---- Group and Stock Item inline creation states ----
  const [accountGroups, setAccountGroups] = useState<any[]>([]);
  const [itemGroups, setItemGroups] = useState<any[]>([]);
  const [showCreateStockItem, setShowCreateStockItem] = useState(false);
  const [activeItemLineForCreate, setActiveItemLineForCreate] = useState<number | null>(null);
  const [newStock, setNewStock] = useState({
    name: '',
    aliasCode: '',
    itemGroupId: '',
    uom: 'Pcs',
    salePrice: '',
  });

  // ---- Line items state ----
  const [lines, setLines] = useState<InvoiceLine[]>([createEmptyLine()]);

  // ---- Invoice charges state ----
  const [additionalDiscount, setAdditionalDiscount] = useState('0');
  const [packagingCharge, setPackagingCharge] = useState('0');
  const [transportCharge, setTransportCharge] = useState('0');

  // ---- Item autocomplete state ----
  const [activeItemLine, setActiveItemLine] = useState<number | null>(null);
  const [itemHighlightIdx, setItemHighlightIdx] = useState(0);
  const [filteredItems, setFilteredItems] = useState<StockItem[]>([]);

  // ---- Refs ----
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const partyInputRef = useRef<HTMLInputElement | null>(null);
  const partyDropdownRef = useRef<HTMLDivElement | null>(null);
  const refNoRef = useRef<HTMLInputElement | null>(null);

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/purchase-invoices/${companyId}/invoices`);
      if (res.ok) {
        const data = await res.json();
        const sorted = data.sort((a: any, b: any) => {
          const numA = parseInt(a.invoiceNo, 10);
          const numB = parseInt(b.invoiceNo, 10);
          if (!isNaN(numA) && !isNaN(numB)) {
            return numB - numA;
          }
          return String(b.invoiceNo).localeCompare(String(a.invoiceNo), undefined, { numeric: true, sensitivity: 'base' });
        });
        setSavedInvoices(sorted);
        return sorted;
      }
    } catch (err) {
      console.error('Error fetching invoices', err);
    }
    return [];
  }, [companyId]);

  useEffect(() => {
    const initData = async () => {
      await fetchInvoices();
      try {
        const res = await fetch(`${API_BASE}/purchase-invoices/${companyId}/next-invoice-no`);
        const data = await res.json();
        setBillNo(data.invoiceNo);
        const saved = localStorage.getItem(`tally_purchase_draft_${companyId}`);
        if (saved) {
          try {
            const draft = JSON.parse(saved);
            if (draft.refNo) setRefNo(draft.refNo);
            if (draft.invoiceDate) setInvoiceDate(draft.invoiceDate);
            if (draft.selectedSupplier) setSelectedSupplier(draft.selectedSupplier);
            if (draft.partySearch) setPartySearch(draft.partySearch);
            if (draft.lines) setLines(draft.lines);
            if (draft.additionalDiscount != null) setAdditionalDiscount(String(draft.additionalDiscount));
            if (draft.packagingCharge != null) setPackagingCharge(String(draft.packagingCharge));
            if (draft.transportCharge != null) setTransportCharge(String(draft.transportCharge));
            return;
          } catch (e) {
            console.error('Failed to parse draft', e);
          }
        }
        setRefNo(String(parseInt(data.invoiceNo, 10)));
      } catch {
        setBillNo('00001');
        setRefNo('1');
      }
    };
    initData();
  }, [companyId, fetchInvoices]);

  useEffect(() => {
    const loadGroups = async () => {
      try {
        const res1 = await fetch(`${API_BASE}/accounts/${companyId}/groups`);
        const data1 = await res1.json();
        setAccountGroups(data1);
        const res2 = await fetch(`${API_BASE}/itemgroups/${companyId}`);
        const data2 = await res2.json();
        setItemGroups(data2);
      } catch (err) {
        console.error('Error loading groups', err);
      }
    };
    loadGroups();
  }, [companyId]);

  const handleCreateNewStockItem = async () => {
    if (!newStock.name.trim()) return;
    if (!newStock.itemGroupId) {
      alert('Stock group is required');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/reports/${companyId}/stock-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newStock.name,
          aliasCode: newStock.aliasCode || null,
          itemGroupId: newStock.itemGroupId,
          uom: newStock.uom,
          salePrice: 0,
          purchasePrice: parseFloat(newStock.salePrice) || 0,
          discount: 0,
          openingQty: 0,
          openingRate: 0,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const createdItem = await res.json();
      setShowCreateStockItem(false);
      if (onRefreshStockItems) {
        await onRefreshStockItems();
      }
      if (activeItemLineForCreate !== null) {
        selectItem(activeItemLineForCreate, createdItem);
      }
    } catch (err) {
      alert('Error creating stock item: ' + (err as Error).message);
    }
  };

  useEffect(() => {
    if (billNo === '...' || currentInvoiceIndex !== null) return;
    const isEmpty = !selectedSupplier && !partySearch.trim() && (lines.length === 0 || (lines.length === 1 && !lines[0].aliasOrName && lines[0].qty === 0));
    if (isEmpty) {
      localStorage.removeItem(`tally_purchase_draft_${companyId}`);
      return;
    }
    const draft = {
      refNo,
      invoiceDate,
      selectedSupplier,
      partySearch,
      lines,
      additionalDiscount,
      packagingCharge,
      transportCharge,
    };
    localStorage.setItem(`tally_purchase_draft_${companyId}`, JSON.stringify(draft));
  }, [refNo, invoiceDate, selectedSupplier, partySearch, lines, additionalDiscount, packagingCharge, transportCharge, companyId, billNo, currentInvoiceIndex]);

  useEffect(() => {
    if (!partySearch.trim()) {
      setFilteredParties(suppliers.slice(0, 20));
    } else {
      const q = partySearch.toLowerCase();
      const matched = suppliers.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(partySearch)) ||
        (c.gstin && c.gstin.toLowerCase().includes(q))
      ).slice(0, 20);
      setFilteredParties(matched);
    }
    setPartyHighlightIdx(0);
  }, [partySearch, suppliers]);

  useEffect(() => {
    if (activeItemLine === null) {
      setFilteredItems([]);
      return;
    }
    const line = lines[activeItemLine];
    if (!line || !line.aliasOrName.trim()) {
      setFilteredItems(stockItems.slice(0, 15));
    } else {
      const q = line.aliasOrName.toLowerCase();
      const matched = stockItems.filter(item =>
        item.name.toLowerCase().includes(q) ||
        (item.aliasCode && item.aliasCode.toLowerCase().includes(q))
      ).slice(0, 15);
      setFilteredItems(matched);
    }
    setItemHighlightIdx(0);
  }, [activeItemLine !== null ? lines[activeItemLine]?.aliasOrName : null, stockItems, activeItemLine]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (partyDropdownRef.current && !partyDropdownRef.current.contains(e.target as Node) &&
          partyInputRef.current && !partyInputRef.current.contains(e.target as Node)) {
        setShowPartyDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadInvoiceIntoState = useCallback((invoice: any) => {
    setBillNo(invoice.invoiceNo);
    setRefNo(invoice.notes ? invoice.notes.replace(/^Ref:\s*/, '') : '');
    setInvoiceDate(new Date(invoice.invoiceDate).toISOString().split('T')[0]);
    setSelectedSupplier(invoice.supplier);
    setPartySearch(invoice.supplier?.name || '');
    setAdditionalDiscount(String(invoice.additionalDiscount || 0));
    setPackagingCharge(String(invoice.packagingCharge || 0));
    setTransportCharge(String(invoice.transportCharge || 0));
    const formattedLines = invoice.items.map((item: any) => {
      const localItem = stockItems.find(si => si.id === item.stockItemId);
      const qty = item.qty || 0;
      const mrp = item.rate || 0;
      const discountPct = (mrp && qty) ? ((item.discount || 0) / (mrp * qty)) * 100 : 0;
      return {
        id: item.id || Math.random().toString(36).substr(2, 9),
        aliasOrName: (() => {
            const alias = (item.stockItem?.aliasCode || '').trim();
            const name  = (item.stockItem?.name || '').trim();
            if (!alias || alias === name) return name;
            return alias.length >= name.length ? alias : name;
          })(),
        stockItemId: item.stockItemId,
        itemName: (() => {
            const alias = (item.stockItem?.aliasCode || '').trim();
            const name  = (item.stockItem?.name || '').trim();
            if (!alias || alias === name) return name;
            return alias.length >= name.length ? alias : name;
          })(),
        group: localItem?.groupName || item.stockItem?.groupName || '',
        mrp,
        qty,
        discountPct,
        amount: item.lineAmount || (mrp * qty - (item.discount || 0)),
        stock: localItem?.closing?.qty || item.stockItem?.closing?.qty || 0,
      };
    });
    setLines(formattedLines);
  }, [stockItems]);

  const resetToNewInvoice = useCallback(async () => {
    setCurrentInvoiceIndex(null);
    const saved = localStorage.getItem(`tally_purchase_draft_${companyId}`);
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        if (draft.refNo) setRefNo(draft.refNo);
        if (draft.invoiceDate) setInvoiceDate(draft.invoiceDate);
        if (draft.selectedSupplier) setSelectedSupplier(draft.selectedSupplier);
        if (draft.partySearch) setPartySearch(draft.partySearch);
        if (draft.lines) setLines(draft.lines);
        if (draft.additionalDiscount != null) setAdditionalDiscount(String(draft.additionalDiscount));
        if (draft.packagingCharge != null) setPackagingCharge(String(draft.packagingCharge));
        if (draft.transportCharge != null) setTransportCharge(String(draft.transportCharge));
      } catch (e) {
        console.error('Failed to parse draft', e);
      }
    } else {
      setInvoiceDate(systemDate || new Date().toISOString().split('T')[0]);
      setSelectedSupplier(null);
      setPartySearch('');
      setLines([createEmptyLine()]);
      setAdditionalDiscount('0');
      setPackagingCharge('0');
      setTransportCharge('0');
    }
    try {
      const res = await fetch(`${API_BASE}/purchase-invoices/${companyId}/next-invoice-no`);
      const data = await res.json();
      setBillNo(data.invoiceNo);
      if (!saved) {
        setRefNo(String(parseInt(data.invoiceNo, 10)));
      }
    } catch {
      setBillNo('00001');
      if (!saved) {
        setRefNo('1');
      }
    }
  }, [companyId, systemDate]);

  const handlePrevBill = useCallback(() => {
    if (savedInvoices.length === 0) return;
    let newIndex = null;
    if (currentInvoiceIndex === null) {
      newIndex = 0;
    } else if (currentInvoiceIndex < savedInvoices.length - 1) {
      newIndex = currentInvoiceIndex + 1;
    } else {
      return;
    }
    setCurrentInvoiceIndex(newIndex);
    loadInvoiceIntoState(savedInvoices[newIndex]);
  }, [savedInvoices, currentInvoiceIndex, loadInvoiceIntoState]);

  const handleNextBill = useCallback(() => {
    if (currentInvoiceIndex === null) return;
    if (currentInvoiceIndex > 0) {
      const newIndex = currentInvoiceIndex - 1;
      setCurrentInvoiceIndex(newIndex);
      loadInvoiceIntoState(savedInvoices[newIndex]);
    } else {
      resetToNewInvoice();
    }
  }, [savedInvoices, currentInvoiceIndex, loadInvoiceIntoState, resetToNewInvoice]);

  const handleNewBill = useCallback(() => {
    resetToNewInvoice();
  }, [resetToNewInvoice]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PageUp') {
        e.preventDefault();
        handlePrevBill();
      }
      if (e.key === 'PageDown') {
        e.preventDefault();
        handleNextBill();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleNewBill();
      }
      if (e.key === 'Escape' && !showCreateParty && !showPartyDropdown && activeItemLine === null) {
        e.preventDefault();
        localStorage.removeItem(`tally_purchase_draft_${companyId}`);
        onCancel();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSubmit();
      }
      if (e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        window.print();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [onCancel, lines, selectedSupplier, invoiceDate, refNo, showCreateParty, showPartyDropdown, activeItemLine, companyId, currentInvoiceIndex, handlePrevBill, handleNextBill, handleNewBill]);

  function createEmptyLine(): InvoiceLine {
    return {
      id: Math.random().toString(36).substr(2, 9),
      aliasOrName: '',
      stockItemId: '',
      itemName: '',
      group: '',
      mrp: 0,
      qty: 0,
      discountPct: 0,
      amount: 0,
      stock: 0,
    };
  }

  function calculateAmount(line: InvoiceLine) {
    const gross = line.mrp * line.qty;
    const discAmount = (gross * line.discountPct) / 100;
    line.amount = gross - discAmount;
  }

  const selectParty = useCallback((supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setPartySearch(supplier.name);
    setShowPartyDropdown(false);
    setTimeout(() => {
      inputRefs.current['alias-0']?.focus();
    }, 50);
  }, []);

  const handlePartyKeyDown = (e: React.KeyboardEvent) => {
    if (!showPartyDropdown) {
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (selectedSupplier) {
          inputRefs.current['alias-0']?.focus();
        } else {
          setShowPartyDropdown(true);
        }
      }
      return;
    }
    const totalItems = filteredParties.length + (partySearch.trim() ? 1 : 0);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setPartyHighlightIdx(prev => Math.min(prev + 1, totalItems - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setPartyHighlightIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (partyHighlightIdx < filteredParties.length) {
        selectParty(filteredParties[partyHighlightIdx]);
      } else {
        setShowPartyDropdown(false);
        setShowCreateParty(true);
        setNewParty({ ...newParty, name: partySearch });
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowPartyDropdown(false);
    }
  };

  const handleCreateNewParty = async () => {
    if (!newParty.name.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/supplier/${companyId}/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newParty, groupId: newParty.groupId || undefined }),
      });
      if (!res.ok) throw new Error('Failed to create supplier');
      const created: Supplier = await res.json();
      setShowCreateParty(false);
      selectParty(created);
      if (onRefreshSuppliers) {
        await onRefreshSuppliers();
      }
    } catch (err) {
      alert('Error creating supplier: ' + (err as Error).message);
    }
  };

  const getItemDisplay = (item: StockItem): { code: string; label: string } => {
    const alias = (item.aliasCode || '').trim();
    const name  = (item.name || '').trim();
    if (!alias || alias === name) return { code: '', label: name };
    return alias.length <= name.length
      ? { code: alias, label: name }
      : { code: name,  label: alias };
  };

  const selectItem = (lineIndex: number, item: StockItem) => {
    const newLines = [...lines];
    const { label } = getItemDisplay(item);
    newLines[lineIndex].stockItemId = item.id;
    newLines[lineIndex].itemName = label || item.name;
    newLines[lineIndex].aliasOrName = label || item.name;
    newLines[lineIndex].group = item.groupName || '';
    newLines[lineIndex].mrp = item.purchasePrice || item.closing?.rate || 0;
    newLines[lineIndex].discountPct = item.discount || 0;
    newLines[lineIndex].stock = item.closing?.qty || 0;
    if (newLines[lineIndex].qty === 0) {
      newLines[lineIndex].qty = 1;
    }
    calculateAmount(newLines[lineIndex]);
    setLines(newLines);
    setActiveItemLine(null);
    setTimeout(() => {
      inputRefs.current[`qty-${lineIndex}`]?.focus();
    }, 30);
  };

  const handleAliasChange = (lineIndex: number, value: string) => {
    const newLines = [...lines];
    newLines[lineIndex].aliasOrName = value;
    newLines[lineIndex].stockItemId = '';
    newLines[lineIndex].itemName = '';
    newLines[lineIndex].group = '';
    newLines[lineIndex].mrp = 0;
    newLines[lineIndex].stock = 0;
    setLines(newLines);
    setActiveItemLine(lineIndex);
  };

  const handleItemKeyDown = (e: React.KeyboardEvent, lineIndex: number) => {
    if (activeItemLine !== lineIndex) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setItemHighlightIdx(prev => Math.min(prev + 1, filteredItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setItemHighlightIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (filteredItems.length > 0 && !lines[lineIndex].stockItemId) {
        selectItem(lineIndex, filteredItems[itemHighlightIdx]);
      } else {
        setActiveItemLine(null);
        inputRefs.current[`qty-${lineIndex}`]?.focus();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setActiveItemLine(null);
    }
  };

  const handleFieldKeyDown = (e: React.KeyboardEvent, lineIndex: number, field: 'qty' | 'disc') => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const newLines = [...lines];
      calculateAmount(newLines[lineIndex]);
      setLines(newLines);
      if (field === 'qty') {
        inputRefs.current[`disc-${lineIndex}`]?.focus();
      } else if (field === 'disc') {
        newLines.push(createEmptyLine());
        setLines(newLines);
        setTimeout(() => {
          inputRefs.current[`alias-${lineIndex + 1}`]?.focus();
        }, 30);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (!showCreateParty) onCancel();
    }
  };

  const handleQtyChange = (lineIndex: number, value: string) => {
    const newLines = [...lines];
    newLines[lineIndex].qty = parseFloat(value) || 0;
    calculateAmount(newLines[lineIndex]);
    setLines(newLines);
  };

  const handleDiscountChange = (lineIndex: number, value: string) => {
    const newLines = [...lines];
    newLines[lineIndex].discountPct = parseFloat(value) || 0;
    calculateAmount(newLines[lineIndex]);
    setLines(newLines);
  };

  const handleRefNoKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      partyInputRef.current?.focus();
      setShowPartyDropdown(true);
    }
  };

  const grossTotal = lines.reduce((sum, line) => sum + (line.mrp * line.qty), 0);
  const totalDiscount = lines.reduce((sum, line) => sum + ((line.mrp * line.qty * line.discountPct) / 100), 0);
  const netAfterLineDiscount = grossTotal - totalDiscount;
  const addDiscountPct = parseFloat(additionalDiscount) || 0;
  const addDiscountAmt = (netAfterLineDiscount * addDiscountPct) / 100;
  const pkgChargeAmt = parseFloat(packagingCharge) || 0;
  const transChargeAmt = parseFloat(transportCharge) || 0;
  const netBeforeRound = netAfterLineDiscount - addDiscountAmt + pkgChargeAmt + transChargeAmt;
  const netRounded = Math.round(netBeforeRound);
  const roundOffAmt = netRounded - netBeforeRound;
  const netTotal = netRounded;

  const handleSubmit = async () => {
    if (!selectedSupplier) {
      alert('Please select a supplier');
      partyInputRef.current?.focus();
      return;
    }
    const validLines = lines.filter(line => line.stockItemId && line.qty > 0);
    if (validLines.length === 0) {
      alert('Please add at least one item');
      return;
    }
    const isEditing = currentInvoiceIndex !== null;
    const url = isEditing
      ? `${API_BASE}/purchase-invoices/${companyId}/invoices/${savedInvoices[currentInvoiceIndex].id}`
      : `${API_BASE}/purchase-invoices/${companyId}/invoices`;
    const method = isEditing ? 'PUT' : 'POST';
    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: selectedSupplier.id,
          invoiceDate,
          items: validLines.map(line => ({
            stockItemId: line.stockItemId,
            qty: line.qty,
            rate: line.mrp,
            discount: (line.mrp * line.qty * line.discountPct) / 100,
          })),
          taxAmount: 0,
          discount: 0,
          additionalDiscount: addDiscountPct,
          packagingCharge: pkgChargeAmt,
          transportCharge: transChargeAmt,
          roundOff: roundOffAmt,
          notes: refNo ? `Ref: ${refNo}` : undefined,
        }),
      });
      if (!response.ok) throw new Error(isEditing ? 'Failed to update purchase invoice' : 'Failed to create purchase invoice');
      alert(isEditing ? `✅ Purchase Invoice #${billNo} updated successfully!` : `✅ Purchase Invoice #${billNo} created successfully!`);
      if (!isEditing) {
        localStorage.removeItem(`tally_purchase_draft_${companyId}`);
      }
      onSuccess();
    } catch (error) {
      alert((isEditing ? 'Error updating invoice: ' : 'Error creating invoice: ') + (error as Error).message);
    }
  };

  useEffect(() => {
    setTimeout(() => {
      refNoRef.current?.focus();
    }, 100);
  }, []);

  return (
    <div className="voucher-panel printable-area">
      <div className="no-print" style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
        <div className="voucher-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span className="voucher-type-indicator">Purchase Invoice Entry</span>
            {currentInvoiceIndex !== null && (
              <span style={{
                marginLeft: '15px',
                padding: '2px 8px',
                background: '#ff5722',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 'bold',
                borderRadius: '3px',
                textTransform: 'uppercase'
              }}>
                Saved Voucher
              </span>
            )}
          </div>
        </div>

      <div className="voucher-body">
        <div className="invoice-header-grid">
          <div className="invoice-header-field">
            <label>Bill No:</label>
            <span className="field-value">{billNo}</span>
          </div>
          <div className="invoice-header-field">
            <label>Date:</label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
          </div>
          <div className="invoice-header-field">
            <label>Ref No:</label>
            <input
              ref={refNoRef}
              type="text"
              placeholder="Bill reference..."
              value={refNo}
              onChange={(e) => setRefNo(e.target.value)}
              onKeyDown={handleRefNoKeyDown}
            />
          </div>
          <div className="invoice-header-field" style={{ position: 'relative' }}>
            <label>Party A/c:</label>
            <div className="party-autocomplete-wrapper">
              <input
                ref={partyInputRef}
                type="text"
                placeholder="Type supplier name..."
                value={partySearch}
                onChange={(e) => {
                  setPartySearch(e.target.value);
                  setSelectedSupplier(null);
                  setShowPartyDropdown(true);
                }}
                onFocus={() => setShowPartyDropdown(true)}
                onKeyDown={handlePartyKeyDown}
                style={selectedSupplier ? { borderColor: '#4caf50', color: 'var(--tally-accent)' } : {}}
              />

              {showPartyDropdown && (
                <div className="party-autocomplete-dropdown" ref={partyDropdownRef}>
                  {filteredParties.length === 0 && !partySearch.trim() && (
                    <div style={{ padding: '12px', textAlign: 'center', color: 'var(--tally-text-secondary)', fontSize: '12px' }}>
                      No suppliers found. Type a name to create one.
                    </div>
                  )}
                  {filteredParties.map((c, idx) => (
                    <div
                      key={c.id}
                      className={`party-autocomplete-item ${idx === partyHighlightIdx ? 'highlighted' : ''}`}
                      onClick={() => selectParty(c)}
                      onMouseEnter={() => setPartyHighlightIdx(idx)}
                    >
                      <span className="party-name">{c.name}</span>
                      <span className="party-meta">
                        {c.phone || ''}{c.city ? ` • ${c.city}` : ''}
                      </span>
                    </div>
                  ))}
                  {partySearch.trim() && (
                    <div
                      className={`party-autocomplete-item create-new ${partyHighlightIdx === filteredParties.length ? 'highlighted' : ''}`}
                      onClick={() => {
                        setShowPartyDropdown(false);
                        setShowCreateParty(true);
                        setNewParty({ ...newParty, name: partySearch });
                      }}
                      onMouseEnter={() => setPartyHighlightIdx(filteredParties.length)}
                    >
                      <span>＋ Create New Supplier: <strong>"{partySearch}"</strong></span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {selectedSupplier && (
          <div className="party-details-panel">
            <div className="party-detail-item">
              <span className="detail-label">Supplier Name</span>
              <span className="detail-value accent">{selectedSupplier.name}</span>
            </div>
            <div className="party-detail-item">
              <span className="detail-label">Phone</span>
              <span className="detail-value">{selectedSupplier.phone || '—'}</span>
            </div>
            <div className="party-detail-item">
              <span className="detail-label">GSTIN</span>
              <span className="detail-value">{selectedSupplier.gstin || '—'}</span>
            </div>
            <div className="party-detail-item">
              <span className="detail-label">Address</span>
              <span className="detail-value">{selectedSupplier.address || '—'}</span>
            </div>
            <div className="party-detail-item">
              <span className="detail-label">City</span>
              <span className="detail-value">{selectedSupplier.city || '—'}</span>
            </div>
            <div className="party-detail-item">
              <span className="detail-label">State</span>
              <span className="detail-value">{selectedSupplier.state || '—'}</span>
            </div>
          </div>
        )}

        {showCreateParty && (
          <div className="new-party-inline-form">
            <div className="form-title">
              <span>🆕</span> Create New Supplier
            </div>
            <div className="form-grid">
              <div className="form-field full-width">
                <label>Supplier Name *</label>
                <input
                  type="text"
                  value={newParty.name}
                  onChange={(e) => setNewParty({ ...newParty, name: e.target.value })}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); setShowCreateParty(false); partyInputRef.current?.focus(); } }}
                />
              </div>
              <div className="form-field">
                <label>Phone</label>
                <input
                  type="text"
                  placeholder="9876543210"
                  value={newParty.phone}
                  onChange={(e) => setNewParty({ ...newParty, phone: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>Email</label>
                <input
                  type="text"
                  placeholder="email@example.com"
                  value={newParty.email}
                  onChange={(e) => setNewParty({ ...newParty, email: e.target.value })}
                />
              </div>
              <div className="form-field full-width">
                <label>Address</label>
                <input
                  type="text"
                  placeholder="Street address..."
                  value={newParty.address}
                  onChange={(e) => setNewParty({ ...newParty, address: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>City</label>
                <input
                  type="text"
                  placeholder="City"
                  value={newParty.city}
                  onChange={(e) => setNewParty({ ...newParty, city: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>State</label>
                <input
                  type="text"
                  placeholder="State"
                  value={newParty.state}
                  onChange={(e) => setNewParty({ ...newParty, state: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>GSTIN</label>
                <input
                  type="text"
                  placeholder="27AAACR5055K1Z5"
                  value={newParty.gstin}
                  onChange={(e) => setNewParty({ ...newParty, gstin: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>Under Group (Account Group)</label>
                <select
                  value={newParty.groupId}
                  onChange={(e) => setNewParty({ ...newParty, groupId: e.target.value })}
                  style={{ width: '100%', padding: '6px', background: 'var(--tally-bg)', color: 'var(--tally-text)', border: '1px solid var(--tally-border)' }}
                >
                  <option value="">-- Sundry Creditors --</option>
                  {accountGroups.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button
                className="btn-cancel"
                onClick={() => { setShowCreateParty(false); partyInputRef.current?.focus(); }}
              >
                Cancel (Esc)
              </button>
              <button className="btn-save" onClick={handleCreateNewParty}>
                ✓ Save & Select Supplier
              </button>
            </div>
          </div>
        )}

      {showCreateStockItem && (
        <div className="new-party-inline-form" style={{ borderColor: 'var(--tally-accent)' }}>
          <div className="form-title" style={{ color: 'var(--tally-accent)' }}>
            <span>📦</span> Create New Stock Item
          </div>
          <div className="form-grid">
            <div className="form-field full-width">
              <label>Item Name *</label>
              <input
                type="text"
                value={newStock.name}
                onChange={(e) => setNewStock({ ...newStock, name: e.target.value })}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); setShowCreateStockItem(false); } }}
              />
            </div>
            <div className="form-field">
              <label>Alias / Code</label>
              <input
                type="text"
                placeholder="e.g. 101"
                value={newStock.aliasCode}
                onChange={(e) => setNewStock({ ...newStock, aliasCode: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label>Under Group (Stock Group) *</label>
              <select
                value={newStock.itemGroupId}
                onChange={(e) => setNewStock({ ...newStock, itemGroupId: e.target.value })}
                style={{ width: '100%', padding: '6px', background: 'var(--tally-bg)', color: 'var(--tally-text)', border: '1px solid var(--tally-border)' }}
                required
              >
                <option value="">-- Select Item Group --</option>
                {itemGroups.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Unit of Measure (UOM) *</label>
              <select
                value={newStock.uom}
                onChange={(e) => setNewStock({ ...newStock, uom: e.target.value })}
                style={{ width: '100%', padding: '6px', background: 'var(--tally-bg)', color: 'var(--tally-text)', border: '1px solid var(--tally-border)' }}
                required
              >
                <option value="Pcs">Pcs (Pieces)</option>
                <option value="Kgs">Kgs (Kilograms)</option>
                <option value="Nos">Nos (Numbers)</option>
              </select>
            </div>
            <div className="form-field">
              <label>Purchase Price (₹)</label>
              <input
                type="number"
                placeholder="0.00"
                value={newStock.salePrice}
                onChange={(e) => setNewStock({ ...newStock, salePrice: e.target.value })}
              />
            </div>
          </div>
          <div className="form-actions">
            <button
              className="btn-cancel"
              onClick={() => setShowCreateStockItem(false)}
            >
              Cancel (Esc)
            </button>
            <button className="btn-save" style={{ background: 'var(--tally-accent)', color: '#000' }} onClick={handleCreateNewStockItem}>
              ✓ Save & Select Item
            </button>
          </div>
        </div>
      )}

        <table className="voucher-table" style={{ width: '100%', marginBottom: '20px' }}>
          <thead>
            <tr>
              <th style={{ width: '30%' }}>Item Name / Alias</th>
              <th style={{ width: '12%', textAlign: 'center' }}>Group</th>
              <th style={{ width: '12%', textAlign: 'right' }}>Purchase Rate (₹)</th>
              <th style={{ width: '10%', textAlign: 'right' }}>Qty</th>
              <th style={{ width: '10%', textAlign: 'right' }}>Disc %</th>
              <th style={{ width: '15%', textAlign: 'right' }}>Amount (₹)</th>
              <th style={{ width: '11%', textAlign: 'center' }}>Stock</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => (
              <tr key={line.id} className="voucher-input-row">
                <td>
                  <div className="item-autocomplete-wrapper">
                    <input
                      ref={(el) => { inputRefs.current[`alias-${idx}`] = el; }}
                      type="text"
                      value={line.aliasOrName}
                      onChange={(e) => handleAliasChange(idx, e.target.value)}
                      onKeyDown={(e) => handleItemKeyDown(e, idx)}
                      onFocus={() => {
                        setActiveItemLine(idx);
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          if (activeItemLine === idx) setActiveItemLine(null);
                        }, 200);
                      }}
                      placeholder="Type alias or name..."
                      style={{ width: '100%', padding: '6px' }}
                    />
                    {activeItemLine === idx && !line.stockItemId && (
                    <div className="item-autocomplete-dropdown">
                      {filteredItems.map((item, iIdx) => (
                        <div
                          key={item.id}
                          className={`item-autocomplete-item ${iIdx === itemHighlightIdx ? 'highlighted' : ''}`}
                          onMouseDown={(e) => { e.preventDefault(); selectItem(idx, item); }}
                          onMouseEnter={() => setItemHighlightIdx(iIdx)}
                        >
                          <span className="item-name">
                            {(() => {
                              const { code, label } = getItemDisplay(item);
                              return code ? `[${code}] ${label}` : label;
                            })()}
                          </span>
                          <span className="item-details">
                            ₹{item.purchasePrice?.toFixed(2)} | {item.groupName || ''}
                          </span>
                        </div>
                      ))}
                      <div
                        className="item-autocomplete-item create-new-item-option"
                        style={{
                          color: 'var(--tally-accent)',
                          fontWeight: 'bold',
                          borderTop: '1px solid var(--tally-border)',
                          textAlign: 'center',
                          padding: '8px',
                          cursor: 'pointer'
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setNewStock({
                            name: line.aliasOrName,
                            aliasCode: '',
                            itemGroupId: itemGroups[0]?.id || '',
                            uom: 'Pcs',
                            salePrice: ''
                          });
                          setActiveItemLineForCreate(idx);
                          setShowCreateStockItem(true);
                          setActiveItemLine(null);
                        }}
                      >
                        ➕ Create New Stock Item ("{line.aliasOrName}")
                      </div>
                    </div>
                  )}
                  </div>
                </td>
                <td style={{ textAlign: 'center', fontSize: '11px', color: 'var(--tally-text-secondary)' }}>
                  {line.group || '—'}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', padding: '6px' }}>
                  {line.mrp > 0 ? line.mrp.toFixed(2) : '—'}
                </td>
                <td>
                  <input
                    ref={(el) => { inputRefs.current[`qty-${idx}`] = el; }}
                    type="number"
                    value={line.qty || ''}
                    onChange={(e) => handleQtyChange(idx, e.target.value)}
                    onKeyDown={(e) => handleFieldKeyDown(e, idx, 'qty')}
                    placeholder="0"
                    style={{ width: '100%', textAlign: 'right', padding: '6px' }}
                  />
                </td>
                <td>
                  <input
                    ref={(el) => { inputRefs.current[`disc-${idx}`] = el; }}
                    type="number"
                    value={line.discountPct || ''}
                    onChange={(e) => handleDiscountChange(idx, e.target.value)}
                    onKeyDown={(e) => handleFieldKeyDown(e, idx, 'disc')}
                    placeholder="0"
                    style={{ width: '100%', textAlign: 'right', padding: '6px' }}
                  />
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--tally-accent)', padding: '6px' }}>
                  ₹{line.amount.toFixed(2)}
                </td>
                <td style={{ textAlign: 'center', fontSize: '11px' }}>
                  {line.stock > 0 ? (
                    <span style={{ color: '#4caf50' }}>
                      {(line.stock + line.qty).toFixed(0)}
                    </span>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button
          type="button"
          onClick={() => {
            const newLines = [...lines, createEmptyLine()];
            setLines(newLines);
            setTimeout(() => {
              inputRefs.current[`alias-${lines.length}`]?.focus();
            }, 30);
          }}
          style={{
            marginBottom: '20px',
            padding: '8px 16px',
            background: 'transparent',
            border: '1px dashed var(--tally-border)',
            color: 'var(--tally-accent)',
            cursor: 'pointer',
          }}
        >
          + Add Line Item
        </button>

        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, background: '#0a2a2a', border: '1px solid var(--tally-border)', borderRadius: '4px', padding: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tally-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
              📋 Other Charges / Adjustments
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '5px 8px', fontSize: '12px', color: 'var(--tally-text-secondary)', width: '55%' }}>
                    Additional Discount (%)
                  </td>
                  <td style={{ padding: '4px', width: '45%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={additionalDiscount}
                        onChange={(e) => setAdditionalDiscount(e.target.value)}
                        style={{
                          flex: 1, textAlign: 'right', padding: '5px 8px',
                          background: 'var(--tally-bg)', color: '#ff9800',
                          border: '1px solid var(--tally-border)', borderRadius: '3px',
                          fontFamily: 'monospace', fontSize: '13px'
                        }}
                      />
                      <span style={{ color: '#ff9800', fontWeight: 700, fontSize: '14px' }}>%</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '5px 8px', fontSize: '12px', color: 'var(--tally-text-secondary)' }}>Packaging Charges (₹)</td>
                  <td style={{ padding: '4px' }}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={packagingCharge}
                      onChange={(e) => setPackagingCharge(e.target.value)}
                      style={{
                        width: '100%', textAlign: 'right', padding: '5px 8px',
                        background: 'var(--tally-bg)', color: 'var(--tally-accent)',
                        border: '1px solid var(--tally-border)', borderRadius: '3px',
                        fontFamily: 'monospace', fontSize: '13px'
                      }}
                    />
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '5px 8px', fontSize: '12px', color: 'var(--tally-text-secondary)' }}>Transport Charges (₹)</td>
                  <td style={{ padding: '4px' }}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={transportCharge}
                      onChange={(e) => setTransportCharge(e.target.value)}
                      style={{
                        width: '100%', textAlign: 'right', padding: '5px 8px',
                        background: 'var(--tally-bg)', color: 'var(--tally-accent)',
                        border: '1px solid var(--tally-border)', borderRadius: '3px',
                        fontFamily: 'monospace', fontSize: '13px'
                      }}
                    />
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '5px 8px', fontSize: '12px', color: '#888' }}>Round Off (Auto)</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'monospace', fontSize: '13px', color: roundOffAmt >= 0 ? '#4caf50' : '#ff9800' }}>
                    {roundOffAmt >= 0 ? '+' : ''}{roundOffAmt.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ minWidth: '280px', background: '#0a3d3d', border: '1px solid var(--tally-border)', borderRadius: '4px', padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12px' }}>
              <span style={{ color: 'var(--tally-text-secondary)' }}>Gross Total:</span>
              <span style={{ fontFamily: 'monospace' }}>₹{grossTotal.toFixed(2)}</span>
            </div>
            <div style={{ borderTop: '1px solid var(--tally-border)', marginTop: '8px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--tally-text-secondary)' }}>NET TOTAL:</span>
              <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--tally-accent)', fontFamily: 'monospace' }}>₹{netTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', marginTop: '10px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={handlePrevBill}
              disabled={savedInvoices.length === 0 || currentInvoiceIndex === savedInvoices.length - 1}
              style={{ padding: '10px 20px', background: (savedInvoices.length === 0 || currentInvoiceIndex === savedInvoices.length - 1) ? '#224d4d' : 'var(--tally-accent)', border: 'none', color: '#000', fontWeight: 700, cursor: 'pointer', borderRadius: '4px' }}
            >
              ⬅️ Prev Bill (PgUp)
            </button>
            <button
              type="button"
              onClick={handleNextBill}
              disabled={currentInvoiceIndex === null}
              style={{ padding: '10px 20px', background: currentInvoiceIndex === null ? '#224d4d' : 'var(--tally-accent)', border: 'none', color: '#000', fontWeight: 700, cursor: 'pointer', borderRadius: '4px' }}
            >
              Next Bill (PgDn) ➡️
            </button>
            <button
              type="button"
              onClick={handleNewBill}
              disabled={currentInvoiceIndex === null}
              style={{ padding: '10px 20px', background: currentInvoiceIndex === null ? '#224d4d' : 'var(--tally-accent)', border: 'none', color: '#000', fontWeight: 700, cursor: 'pointer', borderRadius: '4px' }}
            >
              ➕ New Bill (Ctrl+N)
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem(`tally_purchase_draft_${companyId}`);
                onCancel();
              }}
              style={{ padding: '10px 20px', background: '#666', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '4px' }}
            >
              Cancel (Esc)
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              style={{ padding: '10px 20px', background: 'var(--tally-accent)', border: 'none', color: '#000', fontWeight: 700, cursor: 'pointer', borderRadius: '4px' }}
            >
              🖨️ Print (Alt+P)
            </button>
            {currentInvoiceIndex !== null ? (
              <button
                type="button"
                onClick={handleSubmit}
                style={{ padding: '10px 20px', background: '#ff5722', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', borderRadius: '4px' }}
              >
                Update Purchase Invoice (Ctrl+S)
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                style={{ padding: '10px 20px', background: 'var(--tally-accent)', border: 'none', color: '#000', fontWeight: 700, cursor: 'pointer', borderRadius: '4px' }}
              >
                Create Purchase Invoice (Ctrl+S)
              </button>
            )}
          </div>
        </div>
      </div>
      </div>

      <div className="tally-invoice-print-layout tally-print-only" style={{ border: '1px solid #000', color: '#000', background: '#fff', padding: '15px', fontFamily: 'monospace' }}>
        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '18px', borderBottom: '1px solid #000', paddingBottom: '5px' }}>
          PURCHASE INVOICE
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #000' }}>
          <div style={{ padding: '8px', borderRight: '1px solid #000' }}>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#555' }}>Supplier / Vendor</div>
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{selectedSupplier?.name || 'Cash Purchases'}</div>
            <div style={{ fontSize: '12px' }}>{selectedSupplier?.address || 'Address Not Provided'}</div>
            <div style={{ fontSize: '12px' }}>{selectedSupplier?.city} {selectedSupplier?.state}</div>
            {selectedSupplier?.phone && <div style={{ fontSize: '12px' }}>Phone: {selectedSupplier.phone}</div>}
            {selectedSupplier?.gstin && <div style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '4px' }}>GSTIN/UIN: {selectedSupplier.gstin}</div>}
          </div>
          
          <div style={{ padding: '8px' }}>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#555' }}>Receiver / Buyer</div>
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{activeCompany?.name}</div>
            <div style={{ fontSize: '12px' }}>{activeCompany?.address || 'Address Not Provided'}</div>
            <div style={{ fontSize: '12px' }}>{activeCompany?.city} {activeCompany?.state}</div>
            {activeCompany?.phone && <div style={{ fontSize: '12px' }}>Phone: {activeCompany.phone}</div>}
            {activeCompany?.email && <div style={{ fontSize: '12px' }}>Email: {activeCompany.email}</div>}
            {activeCompany?.gstin && <div style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '4px' }}>GSTIN/UIN: {activeCompany.gstin}</div>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid #000', fontSize: '12px' }}>
          <div style={{ padding: '8px', borderRight: '1px solid #000' }}>
            <div>Purchase Invoice No.</div>
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{billNo}</div>
          </div>
          <div style={{ padding: '8px', borderRight: '1px solid #000' }}>
            <div>Dated</div>
            <div style={{ fontWeight: 'bold' }}>{invoiceDate}</div>
          </div>
          <div style={{ padding: '8px' }}>
            <div>Reference / Ref No.</div>
            <div style={{ fontWeight: 'bold' }}>{refNo || '—'}</div>
          </div>
        </div>

        {(() => {
          const ITEMS_PER_PAGE = 15;
          const MIN_ROWS = 12;
          const validPrintLines = lines.filter(l => l.stockItemId);
          const totalPages = Math.max(1, Math.ceil(validPrintLines.length / ITEMS_PER_PAGE));

          return Array.from({ length: totalPages }, (_, pageIdx) => {
            const isLastPage = pageIdx === totalPages - 1;
            const pageLines = validPrintLines.slice(pageIdx * ITEMS_PER_PAGE, (pageIdx + 1) * ITEMS_PER_PAGE);
            const globalOffset = pageIdx * ITEMS_PER_PAGE;
            const cfAmount = validPrintLines.slice(0, (pageIdx + 1) * ITEMS_PER_PAGE).reduce((s, l) => s + l.amount, 0);
            const bfAmount = pageIdx > 0 ? validPrintLines.slice(0, pageIdx * ITEMS_PER_PAGE).reduce((s, l) => s + l.amount, 0) : 0;
            const emptyRowsNeeded = isLastPage ? Math.max(0, MIN_ROWS - pageLines.length - (pageIdx > 0 ? 1 : 0)) : 0;

            return (
              <div key={`page-${pageIdx}`} style={{ pageBreakAfter: isLastPage ? 'auto' : 'always', breakAfter: isLastPage ? 'auto' : 'page' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', borderBottom: isLastPage ? '1px solid #000' : 'none' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #000', background: '#f2f2f2' }}>
                      <th style={{ borderRight: '1px solid #000', padding: '6px', textAlign: 'left', width: '8%' }}>Sl No.</th>
                      <th style={{ borderRight: '1px solid #000', padding: '6px', textAlign: 'left', width: '42%' }}>Product Name</th>
                      <th style={{ borderRight: '1px solid #000', padding: '6px', textAlign: 'right', width: '12%' }}>Rate (₹)</th>
                      <th style={{ borderRight: '1px solid #000', padding: '6px', textAlign: 'right', width: '12%' }}>Quantity</th>
                      <th style={{ borderRight: '1px solid #000', padding: '6px', textAlign: 'right', width: '10%' }}>Disc %</th>
                      <th style={{ padding: '6px', textAlign: 'right', width: '16%' }}>Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageIdx > 0 && (
                      <tr style={{ background: '#f9f9f9', borderBottom: '1px dashed #ccc' }}>
                        <td style={{ borderRight: '1px solid #000', padding: '5px 6px' }}></td>
                        <td style={{ borderRight: '1px solid #000', padding: '5px 6px', fontStyle: 'italic', color: '#555' }} colSpan={4}>(Brought Forward from Page {pageIdx})</td>
                        <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 'bold' }}>{bfAmount.toFixed(2)}</td>
                      </tr>
                    )}
                    {pageLines.map((line, idx) => (
                      <tr key={line.id} style={{ borderBottom: '1px dashed #ddd' }}>
                        <td style={{ borderRight: '1px solid #000', padding: '6px' }}>{globalOffset + idx + 1}</td>
                        <td style={{ borderRight: '1px solid #000', padding: '6px', fontWeight: 'bold' }}>{line.itemName}</td>
                        <td style={{ borderRight: '1px solid #000', padding: '6px', textAlign: 'right' }}>{line.mrp.toFixed(2)}</td>
                        <td style={{ borderRight: '1px solid #000', padding: '6px', textAlign: 'right' }}>{line.qty}</td>
                        <td style={{ borderRight: '1px solid #000', padding: '6px', textAlign: 'right' }}>{line.discountPct > 0 ? `${line.discountPct.toFixed(2)}%` : '—'}</td>
                        <td style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>{line.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                    {Array.from({ length: emptyRowsNeeded }).map((_, i) => (
                      <tr key={`empty-${i}`} style={{ height: '22px' }}>
                        <td style={{ borderRight: '1px solid #000' }}></td>
                        <td style={{ borderRight: '1px solid #000' }}></td>
                        <td style={{ borderRight: '1px solid #000' }}></td>
                        <td style={{ borderRight: '1px solid #000' }}></td>
                        <td style={{ borderRight: '1px solid #000' }}></td>
                        <td></td>
                      </tr>
                    ))}
                    {!isLastPage && (
                      <tr style={{ background: '#f2f2f2', borderTop: '1px solid #000' }}>
                        <td style={{ borderRight: '1px solid #000', padding: '5px 6px' }}></td>
                        <td style={{ borderRight: '1px solid #000', padding: '5px 6px', fontStyle: 'italic', fontWeight: 'bold', color: '#333' }} colSpan={4}>Carried Forward to Page {pageIdx + 2}</td>
                        <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 'bold' }}>{cfAmount.toFixed(2)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {isLastPage && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', borderBottom: '1px solid #000', fontSize: '12px' }}>
                      <div style={{ padding: '8px', borderRight: '1px solid #000' }}>
                        <div style={{ fontSize: '10px', color: '#555', marginBottom: '4px' }}>Amount Chargeable (in words)</div>
                        <div style={{ fontWeight: 'bold' }}>{numToWords(netTotal)}</div>
                      </div>
                      <div style={{ padding: '8px' }}>
                        <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                          <tbody>
                            <tr><td style={{ padding: '2px 4px', color: '#333' }}>Gross Total</td><td style={{ padding: '2px 4px', textAlign: 'right', fontFamily: 'monospace' }}>₹{grossTotal.toFixed(2)}</td></tr>
                            <tr style={{ borderTop: '1px solid #000', fontWeight: 'bold' }}><td style={{ padding: '4px', fontSize: '13px' }}>Amount Payable</td><td style={{ padding: '4px', textAlign: 'right', fontFamily: 'monospace', fontSize: '14px' }}>₹{netTotal.toFixed(2)}</td></tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', fontSize: '11px', height: '100px' }}>
                      <div style={{ padding: '8px', borderRight: '1px solid #000', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div><span style={{ fontWeight: 'bold' }}>Declaration:</span><br />We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</div>
                        <div style={{ fontSize: '9px', color: '#555' }}>Thank you for your business!</div>
                      </div>
                      <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'right' }}>
                        <div style={{ fontWeight: 'bold' }}>For {selectedSupplier?.name || 'Cash Purchases'}</div>
                        <div style={{ fontSize: '10px', borderTop: '1px solid #000', paddingTop: '4px', minHeight: '30px' }}></div>
                        <div style={{ fontSize: '10px', borderTop: '1px solid #000', paddingTop: '4px' }}>Authorized Signatory</div>
                      </div>
                    </div>
                  </>
                )}
                {!isLastPage && (
                  <div style={{ textAlign: 'center', fontSize: '10px', padding: '4px', color: '#555', borderTop: '1px solid #ccc' }}>Page {pageIdx + 1} of {totalPages} — Continued on next page</div>
                )}
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
}
