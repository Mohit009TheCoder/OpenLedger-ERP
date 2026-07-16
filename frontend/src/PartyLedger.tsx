import React, { useState, useEffect, useRef } from 'react';

const API_BASE = 'http://localhost:5010/api';

type SubScreen = 'PARTY_LIST' | 'PARTY_STATEMENT' | 'SALES_ENTRY' | 'PURCHASE_ENTRY' | 'RECEIPT_ENTRY' | 'PAYMENT_ENTRY';

interface PartyInfo {
  id: string;
  name: string;
  groupName: string;
  groupType: string;
  currentBalance: number;
  currentBalanceType: 'Dr' | 'Cr';
  totalBills: number;
  outstandingBills: number;
  totalOutstanding: number;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  gstin?: string;
  panNo?: string;
  contactPerson?: string;
}

interface Transaction {
  id: string;
  date: string;
  voucherType: string;
  voucherNumber: string;
  referenceNo?: string;
  narration?: string;
  debit: number;
  credit: number;
  balance: number;
  balanceType: string;
  billDetails?: {
    billNo: string;
    billDate: string;
    billAmount: number;
    settledAmount: number;
    outstandingAmount: number;
  };
}

interface OutstandingBill {
  billDetailId: string;
  billNo: string;
  billDate: string;
  billAmount: number;
  settledAmount: number;
  outstandingAmount: number;
  voucherNumber: string;
  voucherType: string;
  voucherDate: string;
  isAdvance?: boolean;
}

interface LedgerOption {
  id: string;
  name: string;
  groupName: string;
  groupType: string;
  currentBalance: number;
  currentBalanceType: string;
}

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
  gstin?: string;
  financialYearFrom?: string;
  booksBeginningFrom?: string;
  currencySymbol?: string;
}

interface Props {
  companyId: string;
  activeCompany?: Company | null;
  ledgers: LedgerOption[];
  onBack: () => void;
  onRefreshLedgers: () => void;
  fromDate?: string;
  toDate?: string;
}

export default function PartyLedger({ companyId, activeCompany, ledgers, onBack, onRefreshLedgers, fromDate, toDate }: Props) {
  const [subScreen, setSubScreen] = useState<SubScreen>('PARTY_LIST');
  const [parties, setParties] = useState<PartyInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Statement
  const [selectedParty, setSelectedParty] = useState<PartyInfo | null>(null);
  const [statementData, setStatementData] = useState<any>(null);
  const [showEditParty, setShowEditParty] = useState(false);
  const [editPartyData, setEditPartyData] = useState<any>({});

  // Adjust Bills Modal States
  const [showAdjustBills, setShowAdjustBills] = useState(false);
  const [adjCreditBillId, setAdjCreditBillId] = useState('');
  const [adjDebitBillId, setAdjDebitBillId] = useState('');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjDate, setAdjDate] = useState(new Date().toISOString().split('T')[0]);

  // Sales Entry state (like Tally Sales Voucher)
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [saleVchNo, setSaleVchNo] = useState('');
  const [saleBillNo, setSaleBillNo] = useState('');
  const [salePartyId, setSalePartyId] = useState('');
  const [salePartySearch, setSalePartySearch] = useState('');
  const [saleSalesLedgerId, setSaleSalesLedgerId] = useState('');
  const [saleAmount, setSaleAmount] = useState('');
  const [saleNarration, setSaleNarration] = useState('');
  const [showSalePartyDropdown, setShowSalePartyDropdown] = useState(false);

  // Purchase Entry state
  const [purDate, setPurDate] = useState(new Date().toISOString().split('T')[0]);
  const [purBillNo, setPurBillNo] = useState('');
  const [purPartyId, setPurPartyId] = useState('');
  const [purPartySearch, setPurPartySearch] = useState('');
  const [purPurchaseLedgerId, setPurPurchaseLedgerId] = useState('');
  const [purAmount, setPurAmount] = useState('');
  const [purNarration, setPurNarration] = useState('');
  const [showPurPartyDropdown, setShowPurPartyDropdown] = useState(false);

  // Receipt Entry state (Party pays us - Cash/Bank Dr, Party Cr)
  const [recDate, setRecDate] = useState(new Date().toISOString().split('T')[0]);
  const [recPartyId, setRecPartyId] = useState('');
  const [recPartySearch, setRecPartySearch] = useState('');
  const [recCashBankId, setRecCashBankId] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [recNarration, setRecNarration] = useState('');
  const [recMode, setRecMode] = useState('Cash');
  const [recRefNo, setRecRefNo] = useState('');
  const [showRecPartyDropdown, setShowRecPartyDropdown] = useState(false);
  const [outstandingBills, setOutstandingBills] = useState<OutstandingBill[]>([]);
  const [billSettlements, setBillSettlements] = useState<{ billDetailId: string; settledAmount: number; checked: boolean }[]>([]);

  // Payment Entry state (We pay party - Party Dr, Cash/Bank Cr)
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payPartyId, setPayPartyId] = useState('');
  const [payPartySearch, setPayPartySearch] = useState('');
  const [payCashBankId, setPayCashBankId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payNarration, setPayNarration] = useState('');
  const [payRefNo, setPayRefNo] = useState('');
  const [showPayPartyDropdown, setShowPayPartyDropdown] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchParties(); }, [companyId]);
  useEffect(() => {
    if (subScreen === 'PARTY_LIST') setTimeout(() => searchRef.current?.focus(), 100);
  }, [subScreen]);
  useEffect(() => {
    if (subScreen === 'PARTY_STATEMENT' && selectedParty) {
      fetchStatement(selectedParty.id);
    }
  }, [fromDate, toDate]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const fmtDate = (d: string) => {
    try {
      const dt = new Date(d);
      const day = String(dt.getDate()).padStart(2, '0');
      const mon = dt.toLocaleString('en-IN', { month: 'short' });
      const yr  = dt.getFullYear();
      return `${day}-${mon}-${yr}`;
    } catch { return d; }
  };
  const fmtAmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const cashBankLedgers = ledgers.filter(l =>
    l.groupName?.toLowerCase().includes('cash') ||
    l.groupName?.toLowerCase().includes('bank') ||
    l.name?.toLowerCase().includes('cash') ||
    l.name?.toLowerCase().includes('bank')
  );
  const salesLedgers = ledgers.filter(l =>
    l.groupName?.toLowerCase().includes('sales') ||
    l.name?.toLowerCase().includes('sales')
  );
  const purchaseLedgers = ledgers.filter(l =>
    l.groupName?.toLowerCase().includes('purchase') ||
    l.name?.toLowerCase().includes('purchase')
  );


  const filterLedgers = (list: LedgerOption[], q: string) =>
    q.trim() ? list.filter(l => l.name.toLowerCase().includes(q.toLowerCase())).slice(0, 15) : list.slice(0, 15);

  // ── API calls ─────────────────────────────────────────────────────────────
  const fetchParties = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/party-ledger/${companyId}/parties`);
      const data = await res.json();
      // If server returns all ledgers, filter to only party groups on frontend as well
      setParties(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const fetchStatement = async (ledgerId: string) => {
    setLoading(true);
    try {
      let url = `${API_BASE}/party-ledger/${companyId}/party/${ledgerId}/statement`;
      const params = [];
      if (fromDate) params.push(`fromDate=${fromDate}`);
      if (toDate) params.push(`toDate=${toDate}`);
      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setStatementData(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const fetchOutstandingBills = async (ledgerId: string) => {
    try {
      const res = await fetch(`${API_BASE}/party-ledger/${companyId}/party/${ledgerId}/outstanding`);
      const data = await res.json();
      const invoicesOnly = (data.outstandingBills || []).filter((b: any) => !b.isAdvance);
      setOutstandingBills(invoicesOnly);
      setBillSettlements(
        invoicesOnly.map((b: OutstandingBill) => ({
          billDetailId: b.billDetailId,
          settledAmount: 0,
          checked: false,
        }))
      );
    } catch (err) { console.error(err); }
  };

  const openStatement = (party: PartyInfo) => {
    setSelectedParty(party);
    fetchStatement(party.id);
    setSubScreen('PARTY_STATEMENT');
  };

  // ── Sales Entry (Party Dr / Sales Cr) ─────────────────────────────────────
  const handleSalesEntry = async () => {
    if (!salePartyId || !saleSalesLedgerId || !saleAmount || !saleBillNo) {
      return alert('Please fill: Party A/c, Sales A/c, Bill No, Amount');
    }
    try {
      const res = await fetch(`${API_BASE}/party-ledger/${companyId}/bill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billNo: saleBillNo,
          billDate: saleDate,
          partyLedgerId: salePartyId,
          salesLedgerId: saleSalesLedgerId,
          amount: saleAmount,
          narration: saleNarration || `Sales to ${salePartySearch}`,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      alert(`✅ Sales entry created! Party A/c DEBITED ₹${parseFloat(saleAmount).toFixed(2)}`);
      setSalePartyId(''); setSalePartySearch(''); setSaleBillNo(''); setSaleAmount(''); setSaleNarration('');
      fetchParties(); onRefreshLedgers();
      setSubScreen('PARTY_LIST');
    } catch (err) { alert('Error: ' + (err as Error).message); }
  };

  // ── Purchase Entry (Purchase Dr / Party Cr) ────────────────────────────────
  const handlePurchaseEntry = async () => {
    if (!purPartyId || !purPurchaseLedgerId || !purAmount || !purBillNo) {
      return alert('Please fill: Party A/c, Purchase A/c, Bill No, Amount');
    }
    try {
      const res = await fetch(`${API_BASE}/party-ledger/${companyId}/purchase-bill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billNo: purBillNo,
          billDate: purDate,
          partyLedgerId: purPartyId,
          purchaseLedgerId: purPurchaseLedgerId,
          amount: purAmount,
          narration: purNarration || `Purchase from ${purPartySearch}`,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      alert(`✅ Purchase entry created! Party A/c CREDITED ₹${parseFloat(purAmount).toFixed(2)}`);
      setPurPartyId(''); setPurPartySearch(''); setPurBillNo(''); setPurAmount(''); setPurNarration('');
      fetchParties(); onRefreshLedgers();
      setSubScreen('PARTY_LIST');
    } catch (err) { alert('Error: ' + (err as Error).message); }
  };

  // ── Receipt Entry (Cash/Bank Dr / Party Cr — party pays us) ─────────────────
  const handleReceiptEntry = async () => {
    if (!recPartyId || !recCashBankId) {
      return alert('Please fill: Party A/c, Cash/Bank A/c');
    }
    const receiptAmt = parseFloat(recAmount) || 0;
    if (receiptAmt <= 0) {
      return alert('Receipt Amount must be greater than zero');
    }
    const settlements = billSettlements.filter(s => s.checked && s.settledAmount > 0);
    if (settlements.length > 0 && totalSettled > receiptAmt) {
      return alert(`Total settling (₹${totalSettled.toFixed(2)}) exceeds receipt amount (₹${receiptAmt.toFixed(2)})`);
    }
    try {
      const res = await fetch(`${API_BASE}/party-ledger/${companyId}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentDate: recDate,
          partyLedgerId: recPartyId,
          cashBankLedgerId: recCashBankId,
          amount: receiptAmt,
          paymentMode: recMode,
          referenceNo: recRefNo,
          narration: recNarration || `Receipt from ${recPartySearch} by ${recMode}`,
          billSettlements: settlements.map(s => ({ billDetailId: s.billDetailId, settledAmount: s.settledAmount })),
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      alert(`✅ Receipt of ₹${receiptAmt.toFixed(2)} recorded! Cash/Bank DEBITED, Party CREDITED`);
      setRecPartyId(''); setRecPartySearch(''); setRecAmount(''); setRecNarration(''); setRecRefNo('');
      setOutstandingBills([]); setBillSettlements([]);
      fetchParties(); onRefreshLedgers();
      setSubScreen('PARTY_LIST');
    } catch (err) { alert('Error: ' + (err as Error).message); }
  };

  // ── Payment Entry (Party Dr / Cash/Bank Cr — we pay party) ─────────────────
  const handlePaymentEntry = async () => {
    if (!payPartyId || !payCashBankId || !payAmount) {
      return alert('Please fill: Party A/c, Cash/Bank A/c, Amount');
    }
    try {
      const res = await fetch(`${API_BASE}/party-ledger/${companyId}/make-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentDate: payDate,
          partyLedgerId: payPartyId,
          cashBankLedgerId: payCashBankId,
          amount: payAmount,
          referenceNo: payRefNo,
          narration: payNarration || `Payment to ${payPartySearch}`,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      alert(`✅ Payment of ₹${parseFloat(payAmount).toFixed(2)} recorded! Party DEBITED, Cash/Bank CREDITED`);
      setPayPartyId(''); setPayPartySearch(''); setPayAmount(''); setPayNarration(''); setPayRefNo('');
      fetchParties(); onRefreshLedgers();
      setSubScreen('PARTY_LIST');
    } catch (err) { alert('Error: ' + (err as Error).message); }
  };

  // ── Edit party details ──────────────────────────────────────────────────────
  const handleEditPartySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParty) return;
    try {
      const res = await fetch(`${API_BASE}/accounts/${companyId}/ledgers/${selectedParty.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editPartyData),
      });
      if (!res.ok) throw new Error('Failed to update party');
      setShowEditParty(false);
      fetchStatement(selectedParty.id);
      fetchParties();
    } catch (err) { alert('Error: ' + (err as Error).message); }
  };

  // ── Adjust bills (offset advance vs invoice) ────────────────────────────────
  const handleAdjustBillsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParty) return;
    if (!adjCreditBillId || !adjDebitBillId || !adjAmount) {
      return alert('Please select advance, invoice, and enter amount.');
    }
    const amt = parseFloat(adjAmount) || 0;
    if (amt <= 0) {
      return alert('Amount must be greater than zero.');
    }
    try {
      const res = await fetch(`${API_BASE}/party-ledger/${companyId}/party/${selectedParty.id}/adjust-bills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creditBillDetailId: adjCreditBillId,
          debitBillDetailId: adjDebitBillId,
          amount: amt,
          date: adjDate,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to adjust bills');
      }
      alert('✅ Bills adjusted successfully!');
      setShowAdjustBills(false);
      setAdjCreditBillId('');
      setAdjDebitBillId('');
      setAdjAmount('');
      fetchStatement(selectedParty.id);
    } catch (err) {
      alert('Error: ' + (err as Error).message);
    }
  };

  const filteredParties = searchQuery
    ? parties.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : parties;

  // Keyboard ESC & Print Shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (subScreen === 'PARTY_LIST') onBack();
        else setSubScreen('PARTY_LIST');
      }
      if (e.altKey && e.key.toLowerCase() === 'p') {
        if (subScreen === 'PARTY_STATEMENT') {
          e.preventDefault();
          window.print();
        }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [subScreen, onBack]);

  const totalSettled = billSettlements.filter(s => s.checked).reduce((s, b) => s + b.settledAmount, 0);
  const totalOutstandingBefore = outstandingBills.reduce((s, b) => s + b.outstandingAmount, 0);
  const totalOutstandingAfter = totalOutstandingBefore - totalSettled;
  const receiptAmtNum = parseFloat(recAmount) || 0;
  const unallocated = receiptAmtNum - totalSettled;

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className={`party-ledger-container ${subScreen === 'PARTY_STATEMENT' ? 'printable-area' : ''}`}>

      {/* ═══════════════════════════════════════════════════════
          SCREEN 1: PARTY LIST
      ═══════════════════════════════════════════════════════ */}
      {subScreen === 'PARTY_LIST' && (
        <>
          <div className="party-ledger-header">
            <div>
              <div className="title">Party Ledgers</div>
              <div className="subtitle">Sundry Debtors &amp; Creditors — Double-Entry Tracking</div>
            </div>
            <div style={{ fontSize: '11px', color: '#ff9800' }}>⚡ Click party for Statement | Esc: Back</div>
          </div>

          <div className="party-ledger-body">
            {/* Action Bar */}
            <div className="ledger-action-bar">
              <button className="ledger-action-btn secondary" onClick={() => setSubScreen('SALES_ENTRY')}>
                <span className="tally-hotkey">F8:</span> Sales
              </button>
              <button className="ledger-action-btn secondary" onClick={() => setSubScreen('PURCHASE_ENTRY')}>
                <span className="tally-hotkey">F9:</span> Purchase
              </button>
              <button className="ledger-action-btn secondary" onClick={() => setSubScreen('RECEIPT_ENTRY')}>
                <span className="tally-hotkey">F6:</span> Receipt
              </button>
              <button className="ledger-action-btn secondary" onClick={() => setSubScreen('PAYMENT_ENTRY')}>
                <span className="tally-hotkey">F5:</span> Payment
              </button>
              <button className="ledger-action-btn secondary" onClick={fetchParties} style={{ marginLeft: 'auto' }}>
                Refresh
              </button>
              <button className="ledger-action-btn secondary" onClick={onBack}>
                Quit
              </button>
            </div>

            {/* Search */}
            <div className="party-search-bar">
              <input ref={searchRef} type="text" placeholder="🔍 Search party by name..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>

            {/* Summary */}
            <div className="ledger-summary-bar">
              <div className="summary-item">
                <span className="summary-label">Total Parties</span>
                <span className="summary-value accent">{parties.length}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">With Outstanding</span>
                <span className="summary-value dr">{parties.filter(p => p.totalOutstanding > 0).length}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Total Outstanding (Dr)</span>
                <span className="summary-value dr">₹{fmtAmt(parties.filter(p => p.currentBalanceType === 'Dr').reduce((s, p) => s + p.currentBalance, 0))}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Total Payable (Cr)</span>
                <span className="summary-value cr">₹{fmtAmt(parties.filter(p => p.currentBalanceType === 'Cr').reduce((s, p) => s + p.currentBalance, 0))}</span>
              </div>
            </div>

            {/* Party Table */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              <table className="party-list-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Party Name</th>
                    <th style={{ textAlign: 'left', width: '130px' }}>Group</th>
                    <th style={{ textAlign: 'right', width: '160px' }}>Balance</th>
                    <th style={{ textAlign: 'center', width: '80px' }}>Bills</th>
                    <th style={{ textAlign: 'right', width: '160px' }}>Outstanding</th>
                    <th style={{ textAlign: 'center', width: '80px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParties.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--tally-text-secondary)' }}>
                        {loading ? 'Loading...' : 'No party ledgers found. Create ledgers under Sundry Debtors / Sundry Creditors from Ledger Creation.'}
                      </td>
                    </tr>
                  )}
                  {filteredParties.map(party => (
                    <tr key={party.id} className="clickable-row" onClick={() => openStatement(party)}>
                      <td>
                        <div className="party-row-name">{party.name}</div>
                        <div className="party-row-group">{party.gstin && `GSTIN: ${party.gstin}`}</div>
                      </td>
                      <td style={{ fontSize: '11px' }}>
                        <span className={`bill-status-badge ${party.groupType === 'Asset' ? 'outstanding' : 'partial'}`}>
                          {party.groupName}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        <span style={{ color: party.currentBalanceType === 'Dr' ? '#ef5350' : '#66bb6a' }}>
                          ₹{fmtAmt(party.currentBalance)} {party.currentBalanceType}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {party.totalBills > 0 ? (
                          <span>{party.outstandingBills}/{party.totalBills}</span>
                        ) : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {party.totalOutstanding > 0 ? (
                          <span style={{ color: '#ff9800' }}>₹{fmtAmt(party.totalOutstanding)}</span>
                        ) : <span style={{ color: '#4caf50' }}>Nil</span>}
                      </td>
                      <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <button className="ledger-action-btn success" style={{ padding: '3px 10px', fontSize: '11px' }}
                          onClick={() => {
                            setRecPartyId(party.id); setRecPartySearch(party.name);
                            fetchOutstandingBills(party.id); setSubScreen('RECEIPT_ENTRY');
                          }}>
                          Pay
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════
          SCREEN 2: PARTY STATEMENT (Ledger Account)
      ═══════════════════════════════════════════════════════ */}
      {subScreen === 'PARTY_STATEMENT' && selectedParty && (
        <>
          <div className="party-ledger-header">
            <div>
              <div className="title">Ledger Account: {selectedParty.name}</div>
              <div className="subtitle">{selectedParty.groupName} | {selectedParty.gstin ? `GSTIN: ${selectedParty.gstin}` : 'No GSTIN'}</div>
            </div>
            <div style={{ fontSize: '11px', color: '#ff9800' }}>Esc: Back to List</div>
          </div>

          <div className="party-ledger-body">
            <div className="ledger-action-bar">
              <button className="ledger-action-btn secondary" onClick={() => {
                setSalePartyId(selectedParty.id); setSalePartySearch(selectedParty.name);
                setSubScreen('SALES_ENTRY');
              }}><span className="tally-hotkey">F8:</span> Sales</button>
              <button className="ledger-action-btn secondary" onClick={() => {
                setRecPartyId(selectedParty.id); setRecPartySearch(selectedParty.name);
                fetchOutstandingBills(selectedParty.id); setSubScreen('RECEIPT_ENTRY');
              }}><span className="tally-hotkey">F6:</span> Receipt</button>
              <button className="ledger-action-btn secondary" onClick={() => {
                setPayPartyId(selectedParty.id); setPayPartySearch(selectedParty.name);
                setSubScreen('PAYMENT_ENTRY');
              }}><span className="tally-hotkey">F5:</span> Payment</button>
              <button className="ledger-action-btn secondary" onClick={() => {
                setPurPartyId(selectedParty.id); setPurPartySearch(selectedParty.name);
                setSubScreen('PURCHASE_ENTRY');
              }}><span className="tally-hotkey">F9:</span> Purchase</button>
              
              <button className="ledger-action-btn secondary" onClick={() => {
                setEditPartyData(statementData?.ledger || selectedParty); setShowEditParty(true);
              }}>Edit Details</button>
              
              {statementData?.outstandingBills?.some((b: any) => b.isAdvance) && statementData?.outstandingBills?.some((b: any) => !b.isAdvance) && (
                <button
                  className="ledger-action-btn secondary"
                  style={{ background: 'var(--tally-accent)', color: '#000', borderColor: 'var(--tally-accent)', fontWeight: 'bold' }}
                  onClick={() => {
                    const creditBills = statementData.outstandingBills.filter((b: any) => b.isAdvance);
                    const debitBills = statementData.outstandingBills.filter((b: any) => !b.isAdvance);
                    setAdjCreditBillId(creditBills[0]?.billDetailId || '');
                    setAdjDebitBillId(debitBills[0]?.billDetailId || '');
                    setAdjAmount(String(Math.min(creditBills[0]?.outstandingAmount || 0, debitBills[0]?.outstandingAmount || 0)));
                    setShowAdjustBills(true);
                  }}
                >
                  Adjust Bills
                </button>
              )}
              
              <button className="ledger-action-btn secondary" onClick={() => fetchStatement(selectedParty.id)}>Refresh</button>
              <button className="ledger-action-btn secondary no-print" onClick={() => window.print()}><span className="tally-hotkey">Alt+P:</span> Print</button>
              <button className="ledger-action-btn secondary" onClick={() => setSubScreen('PARTY_LIST')} style={{ marginLeft: 'auto' }}>Quit</button>
            </div>

            {/* ── Print-only Company Header (matches billing invoice style) ── */}
            {activeCompany && (
              <div className="ledger-print-company-header">
                <div className="lpch-left">
                  <div className="lpch-company-name">{activeCompany.mailingName || activeCompany.name}</div>
                  {activeCompany.address && <div className="lpch-detail">{activeCompany.address}{activeCompany.state ? `, ${activeCompany.state}` : ''}{activeCompany.pincode ? ` – ${activeCompany.pincode}` : ''}</div>}
                  {activeCompany.phone && <div className="lpch-detail">Phone: {activeCompany.phone}</div>}
                  {activeCompany.email && <div className="lpch-detail">Email: {activeCompany.email}</div>}
                  {activeCompany.gstin && <div className="lpch-detail lpch-gstin">GSTIN: {activeCompany.gstin}</div>}
                </div>
                <div className="lpch-right">
                  <div className="lpch-doc-type">LEDGER ACCOUNT STATEMENT</div>
                  <div className="lpch-party-name">{selectedParty?.name}</div>
                  {(fromDate || toDate) && (
                    <div className="lpch-period">Period: {fromDate ? fromDate : '—'} to {toDate ? toDate : '—'}</div>
                  )}
                </div>
              </div>
            )}

            {/* Party Info */}
            {statementData?.ledger && (
              <div style={{ padding: '10px 15px', background: 'var(--tally-bg-secondary)', borderRadius: '4px', marginBottom: '8px', fontSize: '12px', display: 'flex', gap: '30px', borderLeft: '3px solid var(--tally-accent)' }}>
                <div>
                  <span style={{ color: 'var(--tally-text-secondary)' }}>Address: </span>
                  <span>{[statementData.ledger.address, statementData.ledger.city, statementData.ledger.state].filter(Boolean).join(', ') || '-'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--tally-text-secondary)' }}>Phone: </span>
                  <span>{statementData.ledger.phone || '-'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--tally-text-secondary)' }}>GSTIN: </span>
                  <span style={{ fontWeight: 700 }}>{statementData.ledger.gstin || '-'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--tally-text-secondary)' }}>PAN: </span>
                  <span>{statementData.ledger.panNo || '-'}</span>
                </div>
              </div>
            )}

            {/* Summary Bar */}
            {statementData && (
              <div className="ledger-summary-bar">
                <div className="summary-item">
                  <span className="summary-label">Opening Balance</span>
                  <span className={`summary-value ${statementData.openingBalance.type === 'Dr' ? 'dr' : 'cr'}`}>
                    ₹{fmtAmt(statementData.openingBalance.amount)} {statementData.openingBalance.type}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Current Balance</span>
                  <span className={`summary-value ${statementData.currentBalance.type === 'Dr' ? 'dr' : 'cr'}`} style={{ fontWeight: 800, fontSize: '15px' }}>
                    ₹{fmtAmt(statementData.currentBalance.amount)} {statementData.currentBalance.type}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Bills</span>
                  <span className="summary-value accent">{statementData.summary.totalBills}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Outstanding</span>
                  <span className={`summary-value ${statementData.summary.outstandingType === 'Dr' ? 'dr' : 'cr'}`}>
                    ₹{fmtAmt(statementData.summary.totalOutstandingAmount)} {statementData.summary.outstandingType}
                  </span>
                </div>
              </div>
            )}

            {/* Ledger Statement Table — like Tally */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              {statementData && (
                <table className="ledger-statement-table" style={{ tableLayout: 'fixed' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '88px', textAlign: 'left' }}>DATE</th>
                      <th style={{ textAlign: 'left' }}>PARTICULARS</th>
                      <th style={{ width: '72px', textAlign: 'center' }}>VCH NO.</th>
                      <th style={{ width: '120px', textAlign: 'right' }}>DEBIT (₹)</th>
                      <th style={{ width: '120px', textAlign: 'right' }}>CREDIT (₹)</th>
                      <th style={{ width: '140px', textAlign: 'right' }}>BALANCE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Opening Balance Row */}
                    <tr className="opening-row">
                      <td></td>
                      <td style={{ fontWeight: 700, letterSpacing: '0.3px' }}>Opening Balance</td>
                      <td></td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#f87171' }}>
                        {statementData.openingBalance.type === 'Dr' && statementData.openingBalance.amount > 0 ? `₹${fmtAmt(statementData.openingBalance.amount)}` : ''}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#4ade80' }}>
                        {statementData.openingBalance.type === 'Cr' && statementData.openingBalance.amount > 0 ? `₹${fmtAmt(statementData.openingBalance.amount)}` : ''}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: statementData.openingBalance.type === 'Dr' ? '#f87171' : '#4ade80' }}>
                        ₹{fmtAmt(statementData.openingBalance.amount)} {statementData.openingBalance.type}
                      </td>
                    </tr>

                    {/* Transactions — each entry on two lines like Tally ERP */}
                    {statementData.transactions.map((txn: Transaction) => (
                      <tr key={txn.id} className="txn-row">
                        <td className="col-date">{fmtDate(txn.date)}</td>
                        <td className="col-particulars">
                          <div className="particulars-main-line">
                            <span className={`vch-pill vch-${txn.voucherType.toLowerCase()}`}>
                              {txn.voucherType === 'SALES' ? 'SALES' : txn.voucherType === 'PURCHASE' ? 'PURCHASE' : txn.voucherType === 'RECEIPT' ? 'RECEIPT' : 'PAYMENT'}
                            </span>
                            <span className="particulars-desc">
                              {txn.narration
                                ? txn.narration
                                : txn.voucherType === 'SALES' ? 'Sales Invoice'
                                : txn.voucherType === 'PURCHASE' ? 'Purchase Entry'
                                : txn.voucherType === 'RECEIPT' ? 'Receipt from party'
                                : 'Payment to party'}
                            </span>
                          </div>
                          {(txn.billDetails || txn.referenceNo) && (
                            <div className="particulars-sub-line">
                              {txn.billDetails && (
                                <span className="bill-no-badge">Bill# {txn.billDetails.billNo}</span>
                              )}
                              {txn.billDetails && (
                                <span className="bill-date-info">📅 {fmtDate(txn.billDetails.billDate)}</span>
                              )}
                              {txn.referenceNo && <span className="ref-no">Ref: {txn.referenceNo}</span>}
                              {txn.billDetails && (
                                txn.billDetails.outstandingAmount > 0.01
                                  ? <span className="due-amt-badge">Due ₹{fmtAmt(txn.billDetails.outstandingAmount)}</span>
                                  : <span className="paid-badge">✓ PAID</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="col-vchno">{txn.voucherNumber}</td>
                        <td className="col-dr">{txn.debit > 0 ? `₹${fmtAmt(txn.debit)}` : ''}</td>
                        <td className="col-cr">{txn.credit > 0 ? `₹${fmtAmt(txn.credit)}` : ''}</td>
                        <td className={`col-bal ${txn.balanceType === 'Dr' ? 'bal-dr' : 'bal-cr'}`}>
                          ₹{fmtAmt(txn.balance)} <span className="bal-type">{txn.balanceType}</span>
                        </td>
                      </tr>
                    ))}

                    {statementData.transactions.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--tally-text-secondary)', fontStyle: 'italic' }}>
                          No transactions yet. Use Sales Entry to create a bill.
                        </td>
                      </tr>
                    )}

                    {/* Closing Balance */}
                    <tr className="closing-row">
                      <td></td>
                      <td style={{ fontWeight: 700, letterSpacing: '0.3px' }}>Closing Balance</td>
                      <td></td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#f87171' }}>
                        ₹{fmtAmt(statementData.transactions.reduce((s: number, t: Transaction) => s + t.debit, 0) + (statementData.openingBalance.type === 'Dr' ? statementData.openingBalance.amount : 0))}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#4ade80' }}>
                        ₹{fmtAmt(statementData.transactions.reduce((s: number, t: Transaction) => s + t.credit, 0) + (statementData.openingBalance.type === 'Cr' ? statementData.openingBalance.amount : 0))}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '14px', color: statementData.currentBalance.type === 'Dr' ? '#ef5350' : '#66bb6a' }}>
                        ₹{fmtAmt(statementData.currentBalance.amount)} {statementData.currentBalance.type}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}

              {/* Outstanding Bills — Tally ERP Style */}
              {statementData?.outstandingBills?.length > 0 && (
                <div className="outstanding-bills-panel" style={{ marginTop: '16px' }}>
                  <div className="outstanding-panel-header">
                    <span className="outstanding-panel-title">📋 Bill-wise Details (Unadjusted References)</span>
                    <span className="outstanding-panel-count">{statementData.outstandingBills.length} Unadjusted Ref{statementData.outstandingBills.length > 1 ? 's' : ''}</span>
                  </div>
                  <table className="outstanding-bills-table">
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'center', width: '70px' }}>REF NO</th>
                        <th style={{ textAlign: 'left', width: '100px' }}>BILL DATE</th>
                        <th style={{ textAlign: 'left', width: '90px' }}>EFF DATE</th>
                        <th style={{ textAlign: 'center', width: '70px' }}>VCH NO</th>
                        <th style={{ textAlign: 'right' }}>OPENING AMOUNT</th>
                        <th style={{ textAlign: 'right' }}>ADJUSTED</th>
                        <th style={{ textAlign: 'right' }}>PENDING AMOUNT</th>
                        <th style={{ textAlign: 'center', width: '90px' }}>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statementData.outstandingBills.map((bill: OutstandingBill, idx: number) => {
                        const pctPaid = bill.billAmount > 0 ? (bill.settledAmount / bill.billAmount) * 100 : 0;
                        return (
                        <tr key={bill.billDetailId || bill.billNo} className={idx % 2 === 0 ? 'ob-row-even' : 'ob-row-odd'}>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: '#fbbf24', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
                            #{bill.billNo}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#94a3b8' }}>
                            {fmtDate(bill.billDate)}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#94a3b8' }}>
                            {fmtDate(bill.voucherDate || bill.billDate)}
                          </td>
                          <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#64748b' }}>
                            {bill.voucherNumber}
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#e2e8f0' }}>
                            ₹{fmtAmt(bill.billAmount)}
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#4ade80' }}>
                            {bill.settledAmount > 0 ? `₹${fmtAmt(bill.settledAmount)}` : <span style={{ color: '#475569' }}>—</span>}
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '14px', color: bill.isAdvance ? '#4ade80' : '#fb923c' }}>
                            ₹{fmtAmt(bill.outstandingAmount)} {bill.isAdvance ? 'Cr (Adv)' : 'Dr'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {bill.isAdvance ? (
                              <span style={{ color: '#4ade80', fontSize: '11px', background: 'rgba(74,222,128,0.1)', padding: '2px 6px', borderRadius: '3px' }}>ADVANCE</span>
                            ) : (
                              <div className="ob-progress-wrap">
                                <div className="ob-progress-bar">
                                  <div className="ob-progress-fill" style={{ width: `${pctPaid}%` }}></div>
                                </div>
                                <span className="ob-pct-label">{Math.round(pctPaid)}% paid</span>
                              </div>
                            )}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="ob-total-row">
                        <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700, fontSize: '12px', color: '#94a3b8', paddingRight: '10px' }}>TOTAL</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#e2e8f0' }}>
                          ₹{fmtAmt(statementData.outstandingBills.reduce((s: number, b: OutstandingBill) => s + b.billAmount, 0))}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#4ade80' }}>
                          ₹{fmtAmt(statementData.outstandingBills.reduce((s: number, b: OutstandingBill) => s + b.settledAmount, 0))}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '15px', color: '#f97316' }}>
                          ₹{fmtAmt(statementData.summary.totalOutstandingAmount)} {statementData.summary.outstandingType}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════
          SCREEN 3: SALES ENTRY
          Accounting: Party A/c Dr  /  Sales A/c Cr
      ═══════════════════════════════════════════════════════ */}
      {subScreen === 'SALES_ENTRY' && (
        <>
          <div className="party-ledger-header">
            <div>
              <div className="title">📄 Sales Voucher Entry</div>
              <div className="subtitle">Dr: Party A/c (Sundry Debtor) | Cr: Sales A/c — Party owes money</div>
            </div>
            <div style={{ fontSize: '11px', color: '#ff9800' }}>Esc: Cancel</div>
          </div>
          <div className="party-ledger-body">
            <div className="ledger-action-bar">
              <button className="ledger-action-btn danger" onClick={() => setSubScreen('PARTY_LIST')} style={{ marginLeft: 'auto' }}>← Cancel (Esc)</button>
            </div>

            <div style={{ background: '#0d2a1e', border: '1px solid var(--tally-accent)', borderRadius: '8px', padding: '24px', maxWidth: '700px', margin: '0 auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '14px', alignItems: 'center' }}>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Date:</label>
                <input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} />

                <label style={{ fontSize: '13px', fontWeight: 600 }}>Voucher No:</label>
                <input type="text" placeholder="Auto-generated" value={saleVchNo} onChange={e => setSaleVchNo(e.target.value)} />

                <label style={{ fontSize: '13px', fontWeight: 600 }}>Bill No:</label>
                <input type="text" placeholder="e.g. BILL-001" value={saleBillNo} onChange={e => setSaleBillNo(e.target.value)} required />

                <label style={{ fontSize: '13px', fontWeight: 600, color: '#ef5350' }}>Party A/c (Dr):</label>
                <div style={{ position: 'relative' }}>
                  <input type="text" placeholder="Type party name..." value={salePartySearch}
                    onChange={e => { setSalePartySearch(e.target.value); setSalePartyId(''); setShowSalePartyDropdown(true); }}
                    onFocus={() => setShowSalePartyDropdown(true)} />
                  {showSalePartyDropdown && (
                    <div className="party-dropdown">
                      {filterLedgers(ledgers, salePartySearch).map(l => (
                        <div key={l.id} className="party-dropdown-item" onClick={() => {
                          setSalePartyId(l.id); setSalePartySearch(l.name); setShowSalePartyDropdown(false);
                        }}>{l.name} <span style={{ fontSize: '10px', color: '#aaa' }}>({l.groupName})</span></div>
                      ))}
                    </div>
                  )}
                </div>

                <label style={{ fontSize: '13px', fontWeight: 600, color: '#66bb6a' }}>Sales A/c (Cr):</label>
                <select value={saleSalesLedgerId} onChange={e => setSaleSalesLedgerId(e.target.value)}>
                  <option value="">— Select Sales Ledger —</option>
                  {salesLedgers.length > 0
                    ? salesLedgers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)
                    : ledgers.map(l => <option key={l.id} value={l.id}>{l.name} ({l.groupName})</option>)
                  }
                </select>

                <label style={{ fontSize: '13px', fontWeight: 600 }}>Amount (₹):</label>
                <input type="number" placeholder="0.00" value={saleAmount} onChange={e => setSaleAmount(e.target.value)} min="0" />

                <label style={{ fontSize: '13px', fontWeight: 600 }}>Narration:</label>
                <input type="text" placeholder="Optional description" value={saleNarration} onChange={e => setSaleNarration(e.target.value)} />
              </div>

              {/* Double entry preview */}
              {salePartySearch && saleAmount && (
                <div style={{ marginTop: '20px', padding: '12px', background: '#051a0e', borderRadius: '6px', border: '1px solid #1b5e20', fontSize: '12px' }}>
                  <div style={{ fontWeight: 700, color: '#4caf50', marginBottom: '8px' }}>📊 Accounting Effect (Double Entry)</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#ef5350' }}>Dr: {salePartySearch || 'Party A/c'}</span>
                    <span style={{ color: '#ef5350', fontFamily: 'monospace', fontWeight: 700 }}>₹{fmtAmt(parseFloat(saleAmount) || 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#66bb6a' }}>Cr: {salesLedgers.find(l => l.id === saleSalesLedgerId)?.name || 'Sales A/c'}</span>
                    <span style={{ color: '#66bb6a', fontFamily: 'monospace', fontWeight: 700 }}>₹{fmtAmt(parseFloat(saleAmount) || 0)}</span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                <button className="ledger-action-btn secondary" onClick={() => setSubScreen('PARTY_LIST')}>Cancel</button>
                <button className="ledger-action-btn primary" onClick={handleSalesEntry}>✅ Save Sales Entry (Alt+S)</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════
          SCREEN 4: PURCHASE ENTRY
          Accounting: Purchase A/c Dr  /  Party A/c Cr
      ═══════════════════════════════════════════════════════ */}
      {subScreen === 'PURCHASE_ENTRY' && (
        <>
          <div className="party-ledger-header">
            <div>
              <div className="title">📦 Purchase Voucher Entry</div>
              <div className="subtitle">Dr: Purchase A/c | Cr: Party A/c (Sundry Creditor) — We owe money</div>
            </div>
            <div style={{ fontSize: '11px', color: '#ff9800' }}>Esc: Cancel</div>
          </div>
          <div className="party-ledger-body">
            <div className="ledger-action-bar">
              <button className="ledger-action-btn danger" onClick={() => setSubScreen('PARTY_LIST')} style={{ marginLeft: 'auto' }}>← Cancel (Esc)</button>
            </div>
            <div style={{ background: '#1a0d2e', border: '1px solid #9c27b0', borderRadius: '8px', padding: '24px', maxWidth: '700px', margin: '0 auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '14px', alignItems: 'center' }}>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Date:</label>
                <input type="date" value={purDate} onChange={e => setPurDate(e.target.value)} />

                <label style={{ fontSize: '13px', fontWeight: 600 }}>Supplier Bill No:</label>
                <input type="text" placeholder="e.g. SUP-101" value={purBillNo} onChange={e => setPurBillNo(e.target.value)} required />

                <label style={{ fontSize: '13px', fontWeight: 600, color: '#66bb6a' }}>Party A/c (Cr):</label>
                <div style={{ position: 'relative' }}>
                  <input type="text" placeholder="Type supplier name..." value={purPartySearch}
                    onChange={e => { setPurPartySearch(e.target.value); setPurPartyId(''); setShowPurPartyDropdown(true); }}
                    onFocus={() => setShowPurPartyDropdown(true)} />
                  {showPurPartyDropdown && (
                    <div className="party-dropdown">
                      {filterLedgers(ledgers, purPartySearch).map(l => (
                        <div key={l.id} className="party-dropdown-item" onClick={() => {
                          setPurPartyId(l.id); setPurPartySearch(l.name); setShowPurPartyDropdown(false);
                        }}>{l.name} <span style={{ fontSize: '10px', color: '#aaa' }}>({l.groupName})</span></div>
                      ))}
                    </div>
                  )}
                </div>

                <label style={{ fontSize: '13px', fontWeight: 600, color: '#ef5350' }}>Purchase A/c (Dr):</label>
                <select value={purPurchaseLedgerId} onChange={e => setPurPurchaseLedgerId(e.target.value)}>
                  <option value="">— Select Purchase Ledger —</option>
                  {purchaseLedgers.length > 0
                    ? purchaseLedgers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)
                    : ledgers.map(l => <option key={l.id} value={l.id}>{l.name} ({l.groupName})</option>)
                  }
                </select>

                <label style={{ fontSize: '13px', fontWeight: 600 }}>Amount (₹):</label>
                <input type="number" placeholder="0.00" value={purAmount} onChange={e => setPurAmount(e.target.value)} min="0" />

                <label style={{ fontSize: '13px', fontWeight: 600 }}>Narration:</label>
                <input type="text" placeholder="Optional" value={purNarration} onChange={e => setPurNarration(e.target.value)} />
              </div>

              {purPartySearch && purAmount && (
                <div style={{ marginTop: '20px', padding: '12px', background: '#12001f', borderRadius: '6px', border: '1px solid #6a1b9a', fontSize: '12px' }}>
                  <div style={{ fontWeight: 700, color: '#ce93d8', marginBottom: '8px' }}>📊 Accounting Effect (Double Entry)</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#ef5350' }}>Dr: {purchaseLedgers.find(l => l.id === purPurchaseLedgerId)?.name || 'Purchase A/c'}</span>
                    <span style={{ color: '#ef5350', fontFamily: 'monospace', fontWeight: 700 }}>₹{fmtAmt(parseFloat(purAmount) || 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#66bb6a' }}>Cr: {purPartySearch}</span>
                    <span style={{ color: '#66bb6a', fontFamily: 'monospace', fontWeight: 700 }}>₹{fmtAmt(parseFloat(purAmount) || 0)}</span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                <button className="ledger-action-btn secondary" onClick={() => setSubScreen('PARTY_LIST')}>Cancel</button>
                <button className="ledger-action-btn" style={{ background: '#6a1b9a', borderColor: '#4a148c', color: '#fff' }} onClick={handlePurchaseEntry}>✅ Save Purchase Entry</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════
          SCREEN 5: RECEIPT ENTRY
          Accounting: Cash/Bank A/c Dr  /  Party A/c Cr
          (Party pays us — reduces outstanding)
      ═══════════════════════════════════════════════════════ */}
      {subScreen === 'RECEIPT_ENTRY' && (
        <>
          <div className="party-ledger-header">
            <div>
              <div className="title">💰 Receipt Voucher Entry (F6)</div>
              <div className="subtitle">Dr: Cash/Bank A/c | Cr: Party A/c — Party pays outstanding amount</div>
            </div>
            <div style={{ fontSize: '11px', color: '#ff9800' }}>Esc: Cancel</div>
          </div>
          <div className="party-ledger-body">
            <div className="ledger-action-bar">
              <button className="ledger-action-btn danger" onClick={() => setSubScreen('PARTY_LIST')} style={{ marginLeft: 'auto' }}>← Cancel (Esc)</button>
            </div>
            <div style={{ background: '#0a2010', border: '1px solid #2e7d32', borderRadius: '8px', padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '14px', alignItems: 'center' }}>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Receipt Date:</label>
                <input type="date" value={recDate} onChange={e => setRecDate(e.target.value)} />

                <label style={{ fontSize: '13px', fontWeight: 600, color: '#66bb6a' }}>Party A/c (Cr):</label>
                <div style={{ position: 'relative' }}>
                  <input type="text" placeholder="Type party name..." value={recPartySearch}
                    onChange={e => {
                      setRecPartySearch(e.target.value); setRecPartyId('');
                      setShowRecPartyDropdown(true); setOutstandingBills([]); setBillSettlements([]);
                    }}
                    onFocus={() => setShowRecPartyDropdown(true)} />
                  {showRecPartyDropdown && (
                    <div className="party-dropdown">
                      {filterLedgers(ledgers, recPartySearch).map(l => (
                        <div key={l.id} className="party-dropdown-item" onClick={() => {
                          setRecPartyId(l.id); setRecPartySearch(l.name);
                          setShowRecPartyDropdown(false);
                          fetchOutstandingBills(l.id);
                        }}>{l.name} <span style={{ fontSize: '10px', color: '#aaa' }}>({l.groupName})</span></div>
                      ))}
                    </div>
                  )}
                </div>

                <label style={{ fontSize: '13px', fontWeight: 600, color: '#ef5350' }}>Cash/Bank A/c (Dr):</label>
                <select value={recCashBankId} onChange={e => setRecCashBankId(e.target.value)}>
                  <option value="">— Select Cash or Bank —</option>
                  {cashBankLedgers.length > 0
                    ? cashBankLedgers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)
                    : ledgers.map(l => <option key={l.id} value={l.id}>{l.name} ({l.groupName})</option>)
                  }
                </select>

                <label style={{ fontSize: '13px', fontWeight: 600 }}>Payment Mode:</label>
                <select value={recMode} onChange={e => setRecMode(e.target.value)}>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="NEFT">NEFT</option>
                  <option value="RTGS">RTGS</option>
                  <option value="UPI">UPI</option>
                </select>

                <label style={{ fontSize: '13px', fontWeight: 600 }}>Reference / Cheque No:</label>
                <input type="text" placeholder="Optional" value={recRefNo} onChange={e => setRecRefNo(e.target.value)} />

                <label style={{ fontSize: '13px', fontWeight: 600 }}>Amount (₹): <span style={{ fontSize: '11px', color: '#aaa', fontWeight: 400 }}>(Amount received from party)</span></label>
                <input type="number" placeholder="e.g. 5000" value={recAmount} onChange={e => setRecAmount(e.target.value)} min="0" />

                <label style={{ fontSize: '13px', fontWeight: 600 }}>Narration:</label>
                <input type="text" placeholder="e.g. Cash receipt against bill" value={recNarration} onChange={e => setRecNarration(e.target.value)} />
              </div>

              {/* Outstanding Bills for Bill-wise Settlement */}
              {outstandingBills.length > 0 && (
                <div style={{ marginTop: '20px', padding: '12px', background: '#051510', borderRadius: '6px', border: '1px solid #2e7d32' }}>
                  <div style={{ fontWeight: 700, color: '#4caf50', marginBottom: '10px' }}>📋 Bill-wise Settlement (Allocate ₹{fmtAmt(receiptAmtNum)} across bills)</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #1b5e20', color: '#aaa' }}>
                        <th style={{ textAlign: 'left', padding: '5px', width: '5%' }}>✓</th>
                        <th style={{ textAlign: 'left', padding: '5px', width: '10%' }}>Bill No</th>
                        <th style={{ textAlign: 'left', padding: '5px', width: '15%' }}>Date</th>
                        <th style={{ textAlign: 'right', padding: '5px', width: '15%' }}>Bill Amt</th>
                        <th style={{ textAlign: 'right', padding: '5px', width: '15%' }}>Outstanding</th>
                        <th style={{ textAlign: 'right', padding: '5px', width: '20%' }}>Settling Now</th>
                        <th style={{ textAlign: 'right', padding: '5px', width: '20%' }}>Remaining</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outstandingBills.map((bill, idx) => {
                        const s = billSettlements[idx] || { checked: false, settledAmount: 0 };
                        const remainingAfter = bill.outstandingAmount - (s.checked ? s.settledAmount : 0);
                        return (
                          <tr key={bill.billDetailId} style={{ borderBottom: '1px solid #0a2010' }}>
                            <td style={{ padding: '5px' }}>
                              <input type="checkbox" checked={s.checked} onChange={e => {
                                const upd = [...billSettlements];
                                upd[idx] = { ...upd[idx], checked: e.target.checked };
                                if (!e.target.checked) upd[idx].settledAmount = 0;
                                else upd[idx].settledAmount = Math.min(bill.outstandingAmount, Math.max(0, receiptAmtNum - billSettlements.filter((ss, ii) => ii !== idx && ss.checked).reduce((a, ss) => a + ss.settledAmount, 0)));
                                setBillSettlements(upd);
                              }} />
                            </td>
                            <td style={{ padding: '5px', fontWeight: 600, color: 'var(--tally-accent)' }}>{bill.billNo}</td>
                            <td style={{ padding: '5px' }}>{fmtDate(bill.billDate)}</td>
                            <td style={{ padding: '5px', textAlign: 'right' }}>₹{fmtAmt(bill.billAmount)}</td>
                            <td style={{ padding: '5px', textAlign: 'right', color: '#ff9800', fontWeight: 700 }}>₹{fmtAmt(bill.outstandingAmount)}</td>
                            <td style={{ padding: '5px' }}>
                              <input type="number" value={s.settledAmount} min="0" max={bill.outstandingAmount}
                                style={{ width: '100%', textAlign: 'right' }}
                                onChange={e => {
                                  const alreadyAllocated = billSettlements.filter((ss, ii) => ii !== idx && ss.checked).reduce((a, ss) => a + ss.settledAmount, 0);
                                  const availableForThis = Math.max(0, receiptAmtNum - alreadyAllocated);
                                  const val = Math.min(parseFloat(e.target.value) || 0, bill.outstandingAmount, availableForThis);
                                  const upd = [...billSettlements];
                                  upd[idx] = { ...upd[idx], settledAmount: val };
                                  setBillSettlements(upd);
                                }} disabled={!s.checked} />
                            </td>
                            <td style={{ padding: '5px', textAlign: 'right', fontWeight: 700, color: remainingAfter > 0 ? '#ff9800' : '#4caf50' }}>
                              {remainingAfter > 0 ? `₹${fmtAmt(remainingAfter)}` : '✅ Settled'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: '2px solid #2e7d32', fontWeight: 700 }}>
                        <td colSpan={4} style={{ padding: '5px', color: '#4caf50' }}>Total Being Settled:</td>
                        <td style={{ padding: '5px', textAlign: 'right', color: '#aaa', fontSize: '11px' }}>₹{fmtAmt(totalOutstandingBefore)}</td>
                        <td style={{ padding: '5px', textAlign: 'right', color: totalSettled > receiptAmtNum ? '#ef5350' : '#4caf50' }}>₹{fmtAmt(totalSettled)}</td>
                        <td style={{ padding: '5px', textAlign: 'right', color: totalOutstandingAfter > 0 ? '#ff9800' : '#4caf50' }}>₹{fmtAmt(totalOutstandingAfter)}</td>
                      </tr>
                    </tfoot>
                  </table>

                  {/* Warnings / Info */}
                  {totalSettled > receiptAmtNum && receiptAmtNum > 0 && (
                    <div style={{ marginTop: '8px', padding: '6px 10px', background: '#3e0000', borderRadius: '4px', color: '#ef5350', fontSize: '11px' }}>
                      ⚠️ Total settling (₹{fmtAmt(totalSettled)}) exceeds receipt amount (₹{fmtAmt(receiptAmtNum)}). Please reduce settling amounts.
                    </div>
                  )}
                  {unallocated > 0.01 && receiptAmtNum > 0 && totalSettled <= receiptAmtNum && (
                    <div style={{ marginTop: '8px', padding: '6px 10px', background: '#1a1a00', borderRadius: '4px', color: '#ffeb3b', fontSize: '11px' }}>
                      ℹ️ Unallocated: ₹{fmtAmt(unallocated)} — This will be recorded as On Account (advance).
                    </div>
                  )}
                  {totalOutstandingAfter > 0 && totalSettled > 0 && (
                    <div style={{ marginTop: '8px', padding: '6px 10px', background: '#1a0f00', borderRadius: '4px', color: '#ff9800', fontSize: '11px' }}>
                      📌 Remaining Outstanding after this receipt: ₹{fmtAmt(totalOutstandingAfter)}
                    </div>
                  )}
                </div>
              )}

              {/* Double entry preview */}
              {recPartySearch && receiptAmtNum > 0 && (
                <div style={{ marginTop: '16px', padding: '12px', background: '#000', borderRadius: '6px', border: '1px solid #4caf50', fontSize: '12px' }}>
                  <div style={{ fontWeight: 700, color: '#4caf50', marginBottom: '8px' }}>📊 Accounting Effect (Double Entry)</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#ef5350' }}>Dr: {recCashBankId ? (cashBankLedgers.find(l => l.id === recCashBankId)?.name || ledgers.find(l => l.id === recCashBankId)?.name || 'Cash/Bank A/c') : 'Cash/Bank A/c'}</span>
                    <span style={{ color: '#ef5350', fontFamily: 'monospace', fontWeight: 700 }}>₹{fmtAmt(receiptAmtNum)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#66bb6a' }}>Cr: {recPartySearch} (Party A/c)</span>
                    <span style={{ color: '#66bb6a', fontFamily: 'monospace', fontWeight: 700 }}>₹{fmtAmt(receiptAmtNum)}</span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                <button className="ledger-action-btn secondary" onClick={() => setSubScreen('PARTY_LIST')}>Cancel</button>
                <button className="ledger-action-btn success" onClick={handleReceiptEntry}>✅ Save Receipt Entry</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════
          SCREEN 6: PAYMENT ENTRY
          Accounting: Party A/c Dr  /  Cash/Bank A/c Cr
          (We pay the party — reduces our payable)
      ═══════════════════════════════════════════════════════ */}
      {subScreen === 'PAYMENT_ENTRY' && (
        <>
          <div className="party-ledger-header">
            <div>
              <div className="title">💸 Payment Voucher Entry (F5)</div>
              <div className="subtitle">Dr: Party A/c | Cr: Cash/Bank A/c — We pay outstanding to supplier</div>
            </div>
            <div style={{ fontSize: '11px', color: '#ff9800' }}>Esc: Cancel</div>
          </div>
          <div className="party-ledger-body">
            <div className="ledger-action-bar">
              <button className="ledger-action-btn danger" onClick={() => setSubScreen('PARTY_LIST')} style={{ marginLeft: 'auto' }}>← Cancel (Esc)</button>
            </div>
            <div style={{ background: '#1a0800', border: '1px solid #e65100', borderRadius: '8px', padding: '24px', maxWidth: '700px', margin: '0 auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '14px', alignItems: 'center' }}>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Payment Date:</label>
                <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />

                <label style={{ fontSize: '13px', fontWeight: 600, color: '#ef5350' }}>Party A/c (Dr):</label>
                <div style={{ position: 'relative' }}>
                  <input type="text" placeholder="Type supplier name..." value={payPartySearch}
                    onChange={e => { setPayPartySearch(e.target.value); setPayPartyId(''); setShowPayPartyDropdown(true); }}
                    onFocus={() => setShowPayPartyDropdown(true)} />
                  {showPayPartyDropdown && (
                    <div className="party-dropdown">
                      {filterLedgers(ledgers, payPartySearch).map(l => (
                        <div key={l.id} className="party-dropdown-item" onClick={() => {
                          setPayPartyId(l.id); setPayPartySearch(l.name); setShowPayPartyDropdown(false);
                        }}>{l.name} <span style={{ fontSize: '10px', color: '#aaa' }}>({l.groupName})</span></div>
                      ))}
                    </div>
                  )}
                </div>

                <label style={{ fontSize: '13px', fontWeight: 600, color: '#66bb6a' }}>Cash/Bank A/c (Cr):</label>
                <select value={payCashBankId} onChange={e => setPayCashBankId(e.target.value)}>
                  <option value="">— Select Cash or Bank —</option>
                  {cashBankLedgers.length > 0
                    ? cashBankLedgers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)
                    : ledgers.map(l => <option key={l.id} value={l.id}>{l.name} ({l.groupName})</option>)
                  }
                </select>

                <label style={{ fontSize: '13px', fontWeight: 600 }}>Reference No:</label>
                <input type="text" placeholder="Cheque / NEFT / UPI ref" value={payRefNo} onChange={e => setPayRefNo(e.target.value)} />

                <label style={{ fontSize: '13px', fontWeight: 600 }}>Amount (₹):</label>
                <input type="number" placeholder="0.00" value={payAmount} onChange={e => setPayAmount(e.target.value)} min="0" />

                <label style={{ fontSize: '13px', fontWeight: 600 }}>Narration:</label>
                <input type="text" placeholder="e.g. Payment by cheque" value={payNarration} onChange={e => setPayNarration(e.target.value)} />
              </div>

              {payPartySearch && payAmount && (
                <div style={{ marginTop: '16px', padding: '12px', background: '#100000', borderRadius: '6px', border: '1px solid #e65100', fontSize: '12px' }}>
                  <div style={{ fontWeight: 700, color: '#ff9800', marginBottom: '8px' }}>📊 Accounting Effect (Double Entry)</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#ef5350' }}>Dr: {payPartySearch} (Party A/c)</span>
                    <span style={{ color: '#ef5350', fontFamily: 'monospace', fontWeight: 700 }}>₹{fmtAmt(parseFloat(payAmount) || 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#66bb6a' }}>Cr: {payCashBankId ? (cashBankLedgers.find(l => l.id === payCashBankId)?.name || ledgers.find(l => l.id === payCashBankId)?.name || 'Cash/Bank') : 'Cash/Bank A/c'}</span>
                    <span style={{ color: '#66bb6a', fontFamily: 'monospace', fontWeight: 700 }}>₹{fmtAmt(parseFloat(payAmount) || 0)}</span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                <button className="ledger-action-btn secondary" onClick={() => setSubScreen('PARTY_LIST')}>Cancel</button>
                <button className="ledger-action-btn" style={{ background: '#e65100', borderColor: '#bf360c', color: '#fff' }} onClick={handlePaymentEntry}>✅ Save Payment Entry</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Edit Party Modal ─────────────────────────────────────────────────── */}
      {showEditParty && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', width: '90%' }}>
            <h2 className="modal-title">Edit Party Details — {selectedParty?.name}</h2>
            <form onSubmit={handleEditPartySubmit} className="form-grid">
              <span className="form-label">Contact Person:</span>
              <input type="text" value={editPartyData.contactPerson || ''} onChange={e => setEditPartyData({ ...editPartyData, contactPerson: e.target.value })} />
              <span className="form-label">Phone:</span>
              <input type="text" value={editPartyData.phone || ''} onChange={e => setEditPartyData({ ...editPartyData, phone: e.target.value })} />
              <span className="form-label">Email:</span>
              <input type="email" value={editPartyData.email || ''} onChange={e => setEditPartyData({ ...editPartyData, email: e.target.value })} />
              <span className="form-label">Address:</span>
              <textarea rows={2} value={editPartyData.address || ''} onChange={e => setEditPartyData({ ...editPartyData, address: e.target.value })}></textarea>
              <span className="form-label">City:</span>
              <input type="text" value={editPartyData.city || ''} onChange={e => setEditPartyData({ ...editPartyData, city: e.target.value })} />
              <span className="form-label">State:</span>
              <input type="text" value={editPartyData.state || ''} onChange={e => setEditPartyData({ ...editPartyData, state: e.target.value })} />
              <span className="form-label">Pincode:</span>
              <input type="text" value={editPartyData.pincode || ''} onChange={e => setEditPartyData({ ...editPartyData, pincode: e.target.value })} />
              <span className="form-label">GSTIN/UIN:</span>
              <input type="text" value={editPartyData.gstin || ''} onChange={e => setEditPartyData({ ...editPartyData, gstin: e.target.value })} />
              <span className="form-label">PAN No:</span>
              <input type="text" value={editPartyData.panNo || ''} onChange={e => setEditPartyData({ ...editPartyData, panNo: e.target.value })} />
              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowEditParty(false)} className="ledger-action-btn secondary">Cancel</button>
                <button type="submit" className="ledger-action-btn primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Adjust Bills Modal (Advance vs Invoice offset) ────────────────────── */}
      {/* ── Adjust Bills Modal (Advance vs Invoice offset) - TALLY STYLE ────────────────────── */}
      {showAdjustBills && (
        <div className="tally-form-card" style={{ 
          position: 'fixed', top: '20%', left: '50%', transform: 'translate(-50%, 0)', 
          zIndex: 1000, maxWidth: '750px', width: '90%', 
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        }}>
          <h2 className="tally-form-title">Bill-wise Details</h2>
          
          <form onSubmit={handleAdjustBillsSubmit} className="form-grid" style={{ marginTop: '10px' }}>
            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', padding: '0 10px' }}>
              <span style={{ fontWeight: 600 }}>Party: <span style={{ color: 'var(--tally-accent)' }}>{selectedParty?.name}</span></span>
              <span style={{ fontWeight: 600 }}>Upto: <span style={{ color: 'var(--tally-accent)' }}>₹{fmtAmt(statementData?.summary?.totalOutstandingAmount || 0)}</span></span>
            </div>

            <div style={{ gridColumn: 'span 2', margin: '15px 0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--tally-border-light)' }}>
                    <th style={{ padding: '8px', textAlign: 'left', color: 'var(--tally-text-secondary)', fontWeight: 'normal' }}>Type of Ref</th>
                    <th style={{ padding: '8px', textAlign: 'left', color: 'var(--tally-text-secondary)', fontWeight: 'normal' }}>Name</th>
                    <th style={{ padding: '8px', textAlign: 'right', color: 'var(--tally-text-secondary)', fontWeight: 'normal' }}>Amount</th>
                    <th style={{ padding: '8px', textAlign: 'center', color: 'var(--tally-text-secondary)', fontWeight: 'normal' }}>Dr/Cr</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Row 1: Advance */}
                  <tr>
                    <td style={{ padding: '5px', fontSize: '14px' }}>Agst Ref</td>
                    <td style={{ padding: '5px' }}>
                      <select
                        value={adjCreditBillId}
                        onChange={e => {
                          setAdjCreditBillId(e.target.value);
                          const selected = statementData?.outstandingBills?.find((b: any) => b.billDetailId === e.target.value);
                          const debitSelected = statementData?.outstandingBills?.find((b: any) => b.billDetailId === adjDebitBillId);
                          if (selected) {
                            setAdjAmount(String(Math.min(selected.outstandingAmount || 0, debitSelected?.outstandingAmount || 0)));
                          }
                        }}
                        style={{ background: 'transparent', color: '#fff', border: 'none', width: '100%', outline: 'none', fontSize: '14px', fontFamily: 'inherit' }}
                      >
                        <option value="" style={{ color: '#000' }}>-- Select Advance --</option>
                        {statementData?.outstandingBills?.filter((b: any) => b.isAdvance).map((b: any) => (
                          <option key={b.billDetailId} value={b.billDetailId} style={{ color: '#000' }}>
                            {b.billNo} (₹{fmtAmt(b.outstandingAmount)} Cr)
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '5px', textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }}>
                      {adjCreditBillId && adjAmount ? `₹${fmtAmt(parseFloat(adjAmount))}` : ''}
                    </td>
                    <td style={{ padding: '5px', textAlign: 'center', fontSize: '14px' }}>Cr</td>
                  </tr>

                  {/* Row 2: Invoice */}
                  <tr style={{ borderBottom: '1px solid var(--tally-border-light)' }}>
                    <td style={{ padding: '5px', fontSize: '14px' }}>Agst Ref</td>
                    <td style={{ padding: '5px' }}>
                      <select
                        value={adjDebitBillId}
                        onChange={e => {
                          setAdjDebitBillId(e.target.value);
                          const selected = statementData?.outstandingBills?.find((b: any) => b.billDetailId === e.target.value);
                          const creditSelected = statementData?.outstandingBills?.find((b: any) => b.billDetailId === adjCreditBillId);
                          if (selected) {
                            setAdjAmount(String(Math.min(selected.outstandingAmount || 0, creditSelected?.outstandingAmount || 0)));
                          }
                        }}
                        style={{ background: 'transparent', color: '#fff', border: 'none', width: '100%', outline: 'none', fontSize: '14px', fontFamily: 'inherit' }}
                      >
                        <option value="" style={{ color: '#000' }}>-- Select Invoice --</option>
                        {statementData?.outstandingBills?.filter((b: any) => !b.isAdvance).map((b: any) => (
                          <option key={b.billDetailId} value={b.billDetailId} style={{ color: '#000' }}>
                            {b.billNo} (₹{fmtAmt(b.outstandingAmount)} Dr)
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '5px' }}>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={adjAmount}
                        onChange={e => setAdjAmount(e.target.value)}
                        style={{ background: 'transparent', color: '#fff', border: 'none', width: '100%', textAlign: 'right', outline: 'none', fontSize: '14px', fontFamily: 'inherit', fontWeight: 'bold' }}
                      />
                    </td>
                    <td style={{ padding: '5px', textAlign: 'center', fontSize: '14px' }}>Dr</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px' }}>
              <span className="form-label" style={{ minWidth: 'auto', display: 'inline-block' }}>Adjustment Date:</span>
              <input
                type="date"
                value={adjDate}
                onChange={e => setAdjDate(e.target.value)}
                style={{ background: 'transparent', color: '#fff', border: 'none', outline: 'none', borderBottom: '1px solid var(--tally-border)' }}
              />
            </div>

            <div className="form-actions no-print" style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button type="button" onClick={() => setShowAdjustBills(false)} style={{ background: 'transparent', color: 'var(--tally-accent)', border: 'none', fontWeight: 'normal', cursor: 'pointer', outline: 'none', marginRight: '20px' }}>
                Cancel (Esc)
              </button>
              <button type="submit" style={{ background: 'transparent', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer', outline: 'none' }}>
                Accept ?
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
