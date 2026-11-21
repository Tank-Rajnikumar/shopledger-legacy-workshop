var test = require('node:test');
var assert = require('node:assert/strict');
var invoice = require('../lib/invoice');
var pricing = require('../lib/pricing');
var reports = require('../lib/reports');

test('invoice uses the HSN slab used when the order was billed', function () {
  var items = [{
    id: 1,
    name: 'Rice',
    sku: 'RICE-1',
    hsn: '1006',
    price: 640,
    qty: 1
  }];
  var billed = pricing.computeTotals(items, '');
  var printed = invoice.computeInvoiceFigures({ items: items, coupon: '' });

  assert.deepEqual(billed, {
    subtotal: 640,
    discount: 0,
    taxable: 640,
    tax: 32,
    cgst: 16,
    sgst: 16,
    total: 672,
    lines: [{
      id: 1,
      name: 'Rice',
      hsn: '1006',
      gstPercent: 5,
      gross: 640,
      discount: 0,
      taxable: 640,
      tax: 32,
      net: 672
    }]
  });
  assert.deepEqual(printed, {
    subtotal: 640,
    discount: 0,
    tax: 32,
    cgst: 16,
    sgst: 16,
    total: 672,
    rows: [{
      name: 'Rice',
      sku: 'RICE-1',
      hsn: '1006',
      qty: 1,
      price: 640,
      gstPercent: 5,
      line: 640,
      lineTax: 32
    }]
  });
});

test('invoice discounts before GST in the same way as billed totals', function () {
  var items = [{
    id: 1,
    name: 'Rice',
    hsn: '1006',
    price: 640,
    qty: 1
  }];
  var billed = pricing.computeTotals(items, 'SAVE10');
  var printed = invoice.computeInvoiceFigures({ items: items, coupon: 'SAVE10' });

  assert.deepEqual({
    discount: billed.discount,
    tax: billed.tax,
    total: billed.total
  }, {
    discount: 64,
    tax: 28.8,
    total: 604.8
  });
  assert.deepEqual({
    discount: printed.discount,
    tax: printed.tax,
    cgst: printed.cgst,
    sgst: printed.sgst,
    total: printed.total
  }, {
    discount: 64,
    tax: 28.8,
    cgst: 14.4,
    sgst: 14.4,
    total: 604.8
  });
});

test('invoice accepts decimal gstRate values used by billed totals', function () {
  var items = [{
    id: 2,
    name: 'Decimal-rate item',
    hsn: '1006',
    price: 100,
    qty: 1,
    gstRate: 0.05
  }];
  var billed = pricing.computeTotals(items, '');
  var printed = invoice.computeInvoiceFigures({ items: items, coupon: '' });

  assert.deepEqual({ tax: billed.tax, total: billed.total }, { tax: 5, total: 105 });
  assert.deepEqual({
    tax: printed.tax,
    cgst: printed.cgst,
    sgst: printed.sgst,
    total: printed.total,
    gstPercent: printed.rows[0].gstPercent
  }, {
    tax: 5,
    cgst: 2.5,
    sgst: 2.5,
    total: 105,
    gstPercent: 5
  });
});

test('GST reconciliation matches invoice figures to in-memory billed orders', function () {
  var items = [{
    id: 1,
    name: 'Rice',
    hsn: '1006',
    price: 640,
    qty: 1
  }];
  var billed = pricing.computeTotals(items, 'SAVE10');
  var db = {
    orders: [{
      id: 101,
      date: '2026-11-21',
      customer: 'Asha',
      coupon: 'SAVE10',
      items: items,
      subtotal: billed.subtotal,
      discount: billed.discount,
      tax: billed.tax,
      total: billed.total
    }]
  };

  assert.deepEqual(reports.getGstReconciliation(db), {
    totalChecked: 1,
    mismatchCount: 0,
    totalDelta: 0,
    rows: [{
      orderId: 101,
      date: '2026-11-21',
      customer: 'Asha',
      coupon: 'SAVE10',
      ledgerSubtotal: 640,
      ledgerDiscount: 64,
      ledgerTax: 28.8,
      ledgerTotal: 604.8,
      invoiceDiscount: 64,
      invoiceTax: 28.8,
      invoiceTotal: 604.8,
      delta: 0,
      matched: true
    }]
  });
});
