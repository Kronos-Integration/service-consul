/* global describe, it*/
/* jslint node: true, esnext: true */

'use strict';

const chai = require('chai'),
  assert = chai.assert,
  expect = chai.expect,
  should = chai.should(),
  {
    manager
  } = require('kronos-service-manager'),
  {
    ServiceConsul
  } = require('../dist/module.js');

describe('consul service', function () {
  this.timeout(200000);
  it('create', () =>
    manager([{}, {
      name: 'registry',
      port: 12345
    }, {
      name: 'koa-admin',
      listen: {
        port: 9896
      }
    }], [require('../dist/module.js'), require('kronos-service-health-check'), require('kronos-service-koa')]).then(
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
