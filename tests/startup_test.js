/* global describe, it*/
/* jslint node: true, esnext: true */

'use strict';

const chai = require('chai'),
  assert = chai.assert,
  expect = chai.expect,
  should = chai.should(),
  ksm = require('kronos-service-manager'),
  ServiceConsul = require('../service.js');

describe('consul service', function () {
  this.timeout(100000);
  it('create', () =>
    ksm.manager([{}, {
      name: 'registry',
      xport: 12345
    }], [ServiceConsul, require('kronos-service-health-check'), require('kronos-service-koa')]).then(
      manager => {
        const cs = manager.services.registry;

        return cs.start().then(f => {
          assert.equal(cs.state, 'running');
        });
      })
  );
});
