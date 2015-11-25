/* global describe, it*/
/* jslint node: true, esnext: true */

"use strict";

const chai = require('chai'),
  assert = chai.assert,
  expect = chai.expect,
  should = chai.should();
chai.use(require('chai-as-promised'));

const kronos = require('kronos-service-manager'),
  consul = require('../lib/manager.js');

describe('service manager', function () {
  const flowDecl = {
    "name": "flow1",
    "type": "kronos-flow",
    "steps": {
      "s1": {
        "type": "kronos-stdin",
        "endpoints": {
          "out": "s2"
        }
      },
      "s2": {
        "type": "kronos-stdout"
      }
    }
  };

  describe('creation', function (done) {
    it('promise should be fulfilled', function () {
      consul.manager(kronos.manager().then(function (manager) {
        console.log('registerFlow: A');
        manager.registerFlow(manager.getStepInstance(flowDecl));
        console.log('registerFlow: B');
        return manager;
      })).should.be.fulfilled.notify(done);
    });
  });
});
