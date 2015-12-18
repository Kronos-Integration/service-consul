/* global describe, it*/
/* jslint node: true, esnext: true */

"use strict";

const chai = require('chai'),
  assert = chai.assert,
  expect = chai.expect,
  should = chai.should();
chai.use(require('chai-as-promised'));

const http = require('http');

const kronos = require('kronos-service-manager'),
  service = require('../lib/consulService.js');

const srv = http.createServer(function (req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/plain'
  });

  console.log("got request");

  setTimeout(
    () => res.end('okay'), 500);
  //res.end('okay');
});

srv.listen(8500, '127.0.0.1');

describe('consul service', function () {
  it("create", function (done) {
    kronos.manager().then(
      function (manager) {
        describe('create', function () {
          try {
            service.registerWithManager(manager);
            const cs = manager.serviceGet('consul');

            assert.equal(cs.name, "consul");
            assert.equal(cs.state, "stopped");

            cs.start().then(f => {
              assert.equal(cs.state, "running");
              done();
            }, done);
            //done();
          } catch (err) {
            done(err);
          }
        });
      }
    );
  });

});


srv.close();
