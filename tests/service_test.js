/* global describe, it*/
/* jslint node: true, esnext: true */

"use strict";

const chai = require('chai'),
  assert = chai.assert,
  expect = chai.expect,
  should = chai.should(),
  service = require('kronos-service'),
  ServiceConsul = require('../service.js');

class ServiceProvider extends service.ServiceProviderMixin(service.Service) {}

const sp = new ServiceProvider();

describe('consul service', () => {
  it("create", done => {
    try {
      ServiceConsul.registerWithManager(sp).then(() => {
        const cs = sp.createServiceFactoryInstanceFromConfig({
          type: 'consul',
          port: 1234
        });

        cs.start();

        assert.equal(cs.name, "consul");
        assert.equal(cs.state, "starting");

        cs.start().then(f => {
          assert.equal(cs.state, "running");
          console.log(`${JSON.stringify(cs.tags)}`);
          done();
        }, done);
      });

    } catch (err) {
      done(err);
    }
  });
});
