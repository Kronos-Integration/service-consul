/* jslint node: true, esnext: true */

"use strict";

const consul = require('consul')({
		promisify: function (fn) {
			return new Promise(function (resolve, reject) {
				try {
					return fn(function (err, data, res) {
						if (err) {
							err.res = res;
							return reject(err);
						}
						return resolve([data, res]);
					});
				} catch (err) {
					return reject(err);
				}
			});
		}
	}),
	service = require('kronos-service');

exports.registerWithManager = function (manager) {

	// where to get from ?

	const healthURL = 'http://localhost:4711/health';

	let stepRegisteredListener;

	const cs = service.createService('consul', {
		autostart: true,

		consulDefinition: function () {
			return {
				name: this.name,
				serviceid: this.serviceid,
				ttl: this.ttl,
				check: this.check,
				port: this.port,
				tags: this.tags,
				notes: this.notes
			};
		},

		check: {
			"id": "kronos-check",
			"http": healthURL,
			"interval": '10s',
			"timeout": "1s"
		},

		/**
		 * Register the service in consul
		 * @return {Promise} that fullfills with the registered service
		 */
		_start() {
			return consul.agent.service.register(this.consulDefinition()).then(f => {
				stepRegisteredListener = function (step) {
					cs.tags = Object.keys(manager.steps);
					cs.update(1000);
				};

				consul.status.leader().then(leader => {
					this.info(level => `Consul raft leader is ${Object.keys(leader).join(',')}`);
				});

				consul.status.peers().then(peers => {
					this.info(level => `Consul raft peers are ${peers.map(p => p.body)}`);
				});

				this.kronosNodes().then(nodes => {
					this.info(level => `Kronos nodes are ${nodes.map(n => JSON.stringify(n.body))}`);
				});

				manager.addListener('stepRegistered', stepRegisteredListener);
				return Promise.resolve(this);
			});
		},

		/**
		 * deregister the service from consul
		 * @return {Promise} that fullfills when the deregitering has finished
		 */
		_stop() {
			return consul.agent.service.deregister().then(f => {
				manager.removeListener('stepRegistered', stepRegisteredListener);
				return Promise.resolve(this);
			});
		},

		/**
		 * Update service definition in consul
		 * @param {Number} delay time to wait before doing the unregister/register action
		 */
		update(delay) {
			if (delay) {
				if (this.updateTimer) {
					clearTimeout(this.updateTimer);
				}
				this.updateTimer = setTimeout(() => {
					return consul.agent.service.deregister().then(consul.agent.service.register(this.consulDefinition()));
				}, delay);
			} else {
				return consul.agent.service.deregister().then(consul.agent.service.register(this.consulDefinition()));
			}
		},

		kronosNodes() {
			return consul.catalog.service.nodes({
				//dc: this.dataCenter,
				service: this.name
			});
		},

		datacenters() {
			return consul.catalog.datacenters();
		},

		markCheckAsPassed() {
			consul.agent.check.pass(this.check.id, error =>
				this.trace(level => `Check marked as passed: ${service} ${error}`)
			);
		}
	});

	cs.tags = Object.keys(manager.steps);

	manager.serviceRegister(cs);
};
