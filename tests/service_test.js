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
    ksm.manager([{}, {
      name: "consul",
      port: 4713
    }], [ServiceConsul, require('kronos-service-health-check'), require('kronos-service-koa')]).then(
      manager => {
        const cs = manager.services.registry;

        assert.equal(cs.name, "registry");

        return cs.start().then(f => {
          assert.equal(cs.state, "running");
          assert.deepEqual(cs.tags, []);

          cs.registerService('myService', {
            url: cs.listener.url + "/somepath"
          }).then(() => {
            for (let up of cs.serviceURLs('myService')) {
              up.then(u => {
                console.log(`Service: ${u}`);
              }).catch(console.log);
              break;
            }
            setTimeout(() => {
                cs.unregisterService('myService').then(() => {
                  assert.ok("unregistered");
                });
              },
              5000);
          }).catch(console.log);

          cs.consul.kv.set('hello', 'world').then(f => {
            return cs.consul.kv.get('hello').then(f => {
              console.log(`GET ${f[0].Key} = ${f[0].Value}`);
            });
          }).catch(console.log);

          return new Promise((f, r) =>
            setTimeout(f, 20000));
        });
      })
  );
});
