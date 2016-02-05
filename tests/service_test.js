/* global describe, it*/
/* jslint node: true, esnext: true */

"use strict";

const chai = require('chai'),
  assert = chai.assert,
  expect = chai.expect,
  should = chai.should(),
  ksm = require('kronos-service-manager'),
  ServiceConsul = require('../service.js');


describe('consul service', () => {
  it("create", done => {
    try {
      ksm.manager({}, [ServiceConsul, require('kronos-service-health-check')]).then(manager => {
        const cs = manager.services.consul;

        assert.equal(cs.name, "consul");
        assert.equal(cs.state, "starting");

        cs.start().then(f => {
          assert.equal(cs.state, "running");
          console.log(`${JSON.stringify(cs.tags)}`);
          done();
        }, done);
      }).catch(done);

    } catch (err) {
      done(err);
    }
  });
});
