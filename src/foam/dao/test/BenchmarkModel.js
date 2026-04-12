/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

/**
 * A model with ~50 properties covering ALL FOAM property types,
 * designed to verify Jackson parser handles every type correctly.
 * Used for journal replay benchmarking.
 */
foam.CLASS({
  package: 'foam.dao.test',
  name: 'BenchmarkModel',

  ids: ['seq'],

  properties: [
    // ---- Simple scalars ----
    { class: 'Long',     name: 'seq' },
    { class: 'String',   name: 'groupId',       shortName: 'gi' },
    { class: 'String',   name: 'network',        shortName: 'nn' },
    { class: 'String',   name: 'convRate',       shortName: 'crb' },
    { class: 'String',   name: 'currCode',       shortName: 'cc' },
    { class: 'String',   name: 'altCurrCode',    shortName: 'cchb' },
    { class: 'String',   name: 'authInd',        shortName: 'ai' },
    { class: 'String',   name: 'extraData',      shortName: 'ad' },
    { class: 'String',   name: 'approvalNum',    shortName: 'an' },
    { class: 'String',   name: 'traceId',        shortName: 'lt' },
    { class: 'String',   name: 'respCode',       shortName: 'rcd' },
    { class: 'String',   name: 'baseCurr',       shortName: 'bc' },
    { class: 'String',   name: 'flag1',          shortName: 'ia' },
    { class: 'String',   name: 'flag2',          shortName: 'em' },
    { class: 'String',   name: 'ref1',           shortName: 'gl' },
    { class: 'String',   name: 'code1',          shortName: 'e' },
    { class: 'String',   name: 'token' },
    { class: 'String',   name: 'amountStr' },
    { class: 'String',   name: 'statusCode' },
    { class: 'String',   name: 'accountRef' },
    { class: 'String',   name: 'entityRef' },
    { class: 'String',   name: 'acquirerRef' },
    { class: 'String',   name: 'merchantId' },
    { class: 'String',   name: 'categoryCode' },
    { class: 'String',   name: 'merchantName' },
    { class: 'String',   name: 'city' },
    { class: 'String',   name: 'country' },
    { class: 'String',   name: 'terminalId' },
    { class: 'String',   name: 'filePath' },
    { class: 'DateTime', name: 'dateTime1',      shortName: 'ltd' },
    { class: 'Date',     name: 'date1',          shortName: 'cd' },
    { class: 'Date',     name: 'date2',          shortName: 'sd' },
    { class: 'DateTime', name: 'createdAt' },
    { class: 'Double',   name: 'value1',         shortName: 'ra' },
    { class: 'Double',   name: 'value2',         shortName: 'racb' },
    { class: 'Double',   name: 'value3',         shortName: 'ab' },
    { class: 'Double',   name: 'amount' },
    { class: 'Double',   name: 'fee' },
    { class: 'Double',   name: 'baseValue' },
    { class: 'Double',   name: 'reconValue' },
    { class: 'Double',   name: 'holdValue' },
    { class: 'Long',     name: 'counter',        shortName: 'rc' },
    { class: 'Long',     name: 'refSeq' },
    { class: 'Long',     name: 'sourceId' },
    { class: 'Boolean',  name: 'active' },
    { class: 'Int',      name: 'priority' },

    // ---- Complex types (Enum, Reference, nested FObject, Array) ----
    {
      class: 'Enum',
      of: 'foam.core.auth.LifecycleState',
      name: 'lifecycleState'
    },
    {
      class: 'Reference',
      of: 'foam.core.auth.User',
      name: 'createdBy'
    },
    {
      class: 'StringArray',
      name: 'tags'
    }
  ]
});
