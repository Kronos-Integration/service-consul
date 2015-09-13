/* jslint node: true, esnext: true */

"use strict";

const cs = require('./consulService');
const consul = cs.consul;

const kronosCheckInterval = 10;

exports.manager = function (manager, options) {
  const consulOptions = options || {};

  let dataCenter = consulOptions.dataCenter;

  return manager.then(function (manager) {

    manager.addListener('stepImplementationRegistered', function (step) {
      kronosService.tags = Object.keys(manager.stepImplementations);
      kronosService.update(1000);
    });

    const protoShutdown = manager.shutdown;

    manager = Object.create(manager, {
      consul: {
        value: {
          services: {},
          nodes: {}
        }
      },
      shutdown: {
        value: function () {
          return Promise.all([kronosService.deregister(), protoShutdown(), new Promise(function (resolve,
            reject) {
            delete manager.consul.services[kronosService.name];
            resolve(manager);
          })]);
        }
      }
    });

    const stepNames = Object.keys(manager.stepImplementations);

    const healthMountPoint = '/health';
    const kronosService = cs.service({
      "name": manager.name,
      "notes": "kronos manager",
      "port": manager.httpServerPort,
      "tags": stepNames,
      "check": {
        "id": "kronos-check",
        "http": `http://localhost:${manager.httpServerPort}${healthMountPoint}`,
        "interval": `${kronosCheckInterval}s`,
        "timeout": "1s"
      }
    });

    manager.consul.services[kronosService.name] = kronosService;

    function getKronosNodes() {
      const o = {
        dc: dataCenter,
        service: kronosService.name
      };

      consul.catalog.service.nodes(o, function (error, data) {
        if (error) {
          console.log(`services: ${error}`);
        } else {
          data.forEach(function (node) {
            manager.consul.nodes[node.Node] = node;
            //console.log(`${node.Node}`);
          });

          //console.log(`services: ${JSON.stringify(data)}`);
        }
      });
    }

    return new Promise(function (resolve, reject) {
      return kronosService.register().then(function () {
        if (dataCenter) {
          getKronosNodes();
        } else {
          consul.catalog.datacenters(function (error, data) {
            if (error) {
              console.log(`datacenters: ${error}`);
              reject(error);
              return;
            }
            //console.log(`datacenters: ${JSON.stringify(data)}`);

            dataCenter = data[0];
            getKronosNodes();
          });
        }

        resolve(manager);
      });
    });
  });
};
