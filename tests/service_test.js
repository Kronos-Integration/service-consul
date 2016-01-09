/* global describe, it*/
/* jslint node: true, esnext: true */

"use strict";

const chai = require('chai'),
  assert = chai.assert,
  expect = chai.expect,
  should = chai.should();
chai.use(require('chai-as-promised'));

const kronos = require('kronos-service-manager'),
  service = require('../lib/consulService.js');


describe('consul service', function () {
  it("create", function (done) {
    kronos.manager().then(
      function (manager) {
        describe('create', function () {
          try {
            require('kronos-service-koa').registerWithManager(manager);
            require('kronos-service-health-check').registerWithManager(manager);
            service.registerWithManager(manager);

            const cs = manager.serviceGet('consul');

            assert.equal(cs.name, "consul");
            assert.equal(cs.state, "starting");

            cs.start().then(f => {
              assert.equal(cs.state, "running");
              console.log(`${JSON.stringify(cs.tags)}`);
              done();
            }, done);
          } catch (err) {
            done(err);
          }
        });
      }
    );
  });

});
