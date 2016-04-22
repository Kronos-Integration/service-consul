/* global describe, it*/
/* jslint node: true, esnext: true */

'use strict';

const chai = require('chai'),
  assert = chai.assert,
  expect = chai.expect,
  should = chai.should(),
  ksm = require('kronos-service-manager'),
  endpoint = require('kronos-endpoint'),
  ServiceConsul = require('../service.js');


describe('consul service', function () {
  this.timeout(30000);
  it('create', () =>
    ksm.manager([{}, {
      name: 'consul',
      port: 4713
    }], [ServiceConsul, require('kronos-service-health-check'), require('kronos-service-koa')]).then(
      manager => {
        const cs = manager.services.registry;

        assert.equal(cs.name, 'registry');
        assert.equal(cs.type, 'consul');

        return cs.start().then(f => {
          assert.equal(cs.state, 'running');
          assert.deepEqual(cs.tags, []);

          const te = new endpoint.SendEndpoint('test', {}, {
            createOpposite: true
          });

          te.opposite.receive = request => {
            console.log(`te.opposite.receive: ${JSON.stringify(request)}`);
          };

          te.connected = cs.endpoints.nodes;
          te.receive({
            update: true
          }).then(r => {
            console.log(r);
            //assert.equal(r[0].ServiceName, 'kronos');
          });

          cs.registerService('myService', {
            url: cs.listener.url + '/somepath'
          }).then(() => {
            const us = cs.serviceURLs('myService');

            us.next().value.then(u => assert.equal(u, cs.listener.url + '/somepath'));

            setInterval(() =>
              us.next().value.then(u => {
                assert.equal(u, cs.listener.url + '/somepath');
                console.log(`myService: ${u}`);
              }),
              1000);

            setTimeout(() => {
                cs.unregisterService('myService').then(() => {
                  assert.ok("unregistered");

                  const us = cs.serviceURLs('myService');
                  console.log(`after: ${JSON.stringify(us.next())}`);
                });
              },
              5000);
          }).catch(console.log);

          return new Promise((f, r) =>
            setTimeout(() => {
              cs.stop();
              f();
            }, 20000));
        });
      })
  );
});
