-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mailingName" TEXT,
    "address" TEXT,
    "state" TEXT,
    "country" TEXT,
    "pincode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "financialYearFrom" TIMESTAMP(3) NOT NULL,
    "booksBeginningFrom" TIMESTAMP(3) NOT NULL,
    "currencySymbol" TEXT NOT NULL DEFAULT '₹',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "parentId" TEXT,
    "groupType" TEXT NOT NULL,

    CONSTRAINT "AccountGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ledger" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "openingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "balanceType" TEXT NOT NULL DEFAULT 'Dr',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "gstin" TEXT,
    "panNo" TEXT,

    CONSTRAINT "Ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voucher" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "voucherType" TEXT NOT NULL,
    "voucherNumber" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "referenceNo" TEXT,
    "narration" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "ledgerId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "entryType" TEXT NOT NULL,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillDetail" (
    "id" TEXT NOT NULL,
    "ledgerEntryId" TEXT NOT NULL,
    "billNo" TEXT NOT NULL,
    "billDate" TIMESTAMP(3) NOT NULL,
    "billAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillSettlement" (
    "id" TEXT NOT NULL,
    "billDetailId" TEXT NOT NULL,
    "paymentEntryId" TEXT NOT NULL,
    "billEntryId" TEXT NOT NULL,
    "settledAmount" DOUBLE PRECISION NOT NULL,
    "settlementDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aliasCode" TEXT,
    "sku" TEXT,
    "description" TEXT,
    "make" TEXT DEFAULT '',
    "companyId" TEXT NOT NULL,
    "itemGroupId" TEXT NOT NULL,
    "uom" TEXT NOT NULL,
    "salePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "purchasePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "openingQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "openingRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "openingValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryEntry" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "entryType" TEXT NOT NULL DEFAULT 'In',

    CONSTRAINT "InventoryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "description" TEXT,
    "hsn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "gstin" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "description" TEXT,
    "salesAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesInvoice" (
    "id" TEXT NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "salesGroupId" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "additionalDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "packagingCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "transportCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "roundOff" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentStatus" TEXT NOT NULL DEFAULT 'Pending',
    "paymentMode" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLineItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lineAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoicePayment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL,
    "paymentMode" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "referenceNo" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoicePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "gstin" TEXT,
    "panNo" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseInvoice" (
    "id" TEXT NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "additionalDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "packagingCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "transportCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "roundOff" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentStatus" TEXT NOT NULL DEFAULT 'Pending',
    "paymentMode" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseLineItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lineAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchasePayment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL,
    "paymentMode" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "referenceNo" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchasePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AccountGroup_companyId_name_key" ON "AccountGroup"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Ledger_companyId_name_key" ON "Ledger"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Voucher_companyId_voucherType_voucherNumber_key" ON "Voucher"("companyId", "voucherType", "voucherNumber");

-- CreateIndex
CREATE UNIQUE INDEX "BillDetail_ledgerEntryId_key" ON "BillDetail"("ledgerEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "StockItem_companyId_name_key" ON "StockItem"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ItemGroup_companyId_name_key" ON "ItemGroup"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_companyId_name_key" ON "Customer"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SalesGroup_companyId_name_key" ON "SalesGroup"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SalesInvoice_companyId_invoiceNo_key" ON "SalesInvoice"("companyId", "invoiceNo");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_companyId_name_key" ON "Supplier"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseInvoice_companyId_invoiceNo_key" ON "PurchaseInvoice"("companyId", "invoiceNo");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountGroup" ADD CONSTRAINT "AccountGroup_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountGroup" ADD CONSTRAINT "AccountGroup_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "AccountGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ledger" ADD CONSTRAINT "Ledger_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ledger" ADD CONSTRAINT "Ledger_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AccountGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "Ledger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillDetail" ADD CONSTRAINT "BillDetail_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "LedgerEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillSettlement" ADD CONSTRAINT "BillSettlement_billDetailId_fkey" FOREIGN KEY ("billDetailId") REFERENCES "BillDetail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillSettlement" ADD CONSTRAINT "BillSettlement_paymentEntryId_fkey" FOREIGN KEY ("paymentEntryId") REFERENCES "LedgerEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillSettlement" ADD CONSTRAINT "BillSettlement_billEntryId_fkey" FOREIGN KEY ("billEntryId") REFERENCES "LedgerEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_itemGroupId_fkey" FOREIGN KEY ("itemGroupId") REFERENCES "ItemGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryEntry" ADD CONSTRAINT "InventoryEntry_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryEntry" ADD CONSTRAINT "InventoryEntry_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemGroup" ADD CONSTRAINT "ItemGroup_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesGroup" ADD CONSTRAINT "SalesGroup_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_salesGroupId_fkey" FOREIGN KEY ("salesGroupId") REFERENCES "SalesGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "SalesInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoicePayment" ADD CONSTRAINT "InvoicePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "SalesInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseLineItem" ADD CONSTRAINT "PurchaseLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PurchaseInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseLineItem" ADD CONSTRAINT "PurchaseLineItem_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasePayment" ADD CONSTRAINT "PurchasePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PurchaseInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

