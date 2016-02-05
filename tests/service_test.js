/* global describe, it*/
/* jslint node: true, esnext: true */

"use strict";

const chai = require('chai'),
  assert = chai.assert,
  expect = chai.expect,
  should = chai.should(),
  ksm = require('kronos-service-manager'),
  ServiceConsul = require('../service.js');


describe('consul service', function () {
  this.timeout(30000);
  it("create", () =>
    ksm.manager({}, [ServiceConsul, require('kronos-service-health-check')]).then(manager => {
      const cs = manager.services.consul;

      assert.equal(cs.name, "consul");

      return cs.start().then(f => {
        assert.equal(cs.state, "running");
        assert.deepEqual(cs.tags, []);

        return new Promise((f, r) =>
          setTimeout(f, 20000));
      });
    })
  )
});
