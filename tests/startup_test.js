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
  this.timeout(200000);
  it('create', () =>
    ksm.manager([{}, {
      name: 'registry',
      port: 12345
    }, {
      name: 'koa',
      listen: {
        port: 9896
      }
    }], [ServiceConsul, require('kronos-service-health-check'), require('kronos-service-koa')]).then(
      manager => {
        const cs = manager.services.registry;

        return cs.start().then(f => {
          // should fail
          assert.equal(cs.state, 'failed');
        }, r => {
          assert.equal(cs.state, 'failed');
        });
      })
  );
});
