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
    }], [ServiceConsul, require('kronos-service-health-check')]).then(
      manager => {
        const cs = manager.services.consul;

        console.log(`${cs}`);
        assert.equal(cs.name, "consul");

        return cs.start().then(f => {
          assert.equal(cs.state, "running");
          assert.deepEqual(cs.tags, []);

          /*
                    cs.registerService('maService', {
                      url: cs.url + "/somepath"
                    });
          */
          cs.consul.kv.set('hello', 'world').then(f => {
            //console.log(`SET ${f}`);

            return cs.consul.kv.get('hello').then(f => {
              //console.log(f);
              console.log(`GET ${f[0].Key} = ${f[0].Value}`);
            });
          }).catch(console.log);

          return new Promise((f, r) =>
            setTimeout(f, 20000));
        });
      })
  )
});
