/* jslint node: true, esnext: true */

"use strict";

const consul = require('consul')(),
	service = require('kronos-service');


exports.registerWithManager = function (manager) {

	const healthMountPoint = '/health';

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
			"http": `http://localhost:${manager.httpServerPort}${healthMountPoint}`,
			"interval": '10s',
			"timeout": "1s"
		},

		/**
		 * Register the service in consul
		 * @return {Promise} that fullfills with the registered service
		 */
		_start() {
			return this.registerConsul();
		},

		/**
		 * deregister the service from consul
		 * @return {Promise} that fullfills when the deregitering has finished
		 */
		_stop() {
			return this.deregisterConsul();
		},

		registerConsul() {
			const service = this;
			return new Promise(function (resolve, reject) {
				stepRegisteredListener = function (step) {
					cs.tags = Object.keys(manager.steps);
					cs.update(1000);
				};

				manager.addListener('stepRegistered', stepRegisteredListener);

				consul.agent.service.register(service.consulDefinition(), error => {
					if (error) {
						//console.log(`error registering: ${service} ${error}`);
						reject(error);
					} else {
						//console.log(`registered: ${JSON.stringify(service.consulDefinition())}`);
						resolve(service);
					}
				});
			});
		},

		deregisterConsul() {
			const service = this;
			return new Promise(function (resolve, reject) {
				consul.agent.service.deregister(service.name, error => {
					if (error) {
						//console.log(`error deregistering: ${service} ${error}`);
						reject(error);
					} else {
						//console.log(`deregistered: ${service}`);
						manager.removeListener('stepRegistered', stepRegisteredListener);

						resolve(service);
					}
				});
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
					return this.deregisterConsul().then(this.registerConsul());
				}, delay);
			} else {
				return this.deregisterConsul().then(this.registerConsul());
			}
		},

		kronosNodes() {
			const o = {
				dc: this.dataCenter,
				service: this.name
			};

			return new Promise(function (f, r) {
				consul.catalog.service.nodes(o, (error, data) => {
					if (error) {
						r(error);
					} else {
						f(data);
					}
				});
			});
		},

		datacenters() {
			return new Promise(function (fullfill, reject) {
				consul.catalog.datacenters((error, data) => {
					if (error) {
						reject(error);
					} else {
						fullfill(data);
					}
				});
			});
		},

		markCheckAsPassed() {
			consul.agent.check.pass(this.check.id, error =>
				this.trace(level => `check marked as passed: ${service} ${error}`)
			);
		}
	});

	cs.tags = Object.keys(manager.steps);

	manager.serviceRegister(cs);
};
