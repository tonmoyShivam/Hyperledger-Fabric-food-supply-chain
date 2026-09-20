'use strict';

/**
 * Recall reports are derived exclusively from ledger events —
 * never from manually typed store lists.
 */
function deriveTouchpoints(events) {
  return {
    origin: events.find((e) => e.stage === 'ORIGIN') || null,
    processors: events.filter((e) => e.stage === 'PROCESSOR'),
    distributors: events.filter((e) => e.stage === 'DISTRIBUTOR'),
    stores: events.filter((e) => e.stage === 'WALMART_STORE'),
    sales: events.filter((e) => e.stage === 'CUSTOMER_SALE'),
  };
}

module.exports = { deriveTouchpoints };
