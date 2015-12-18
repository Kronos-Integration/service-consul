/* jslint node: true, esnext: true */

"use strict";

const consul = require('consul')(),
	service = require('kronos-service');

const rootService = {

	markCheckAsPassed() {
		const service = this;
		consul.agent.check.pass(this.check.id, function (error) {
			console.log(`check marked as passed: ${service} ${error}`);
		});
	}
};


exports.service = function (options) {
	const serviceid = options.serviceid === undefined ? name : options.serviceid;
	const port = options.port;
	const ttl = options.ttl;
	const notes = options.notes;
	const check = options.check;
	let tags = options.tags;
	let needsUpdate = true;

	if (check) {
		/*	if (check.serviceid === undefined) {
				check.serviceid = serviceid;
			}*/
		if (check.name === undefined) {
			check.name = `${serviceid} check`;
		}

		if (check.ttl === undefined) {
			check.ttl = ttl;
		}
	}

	const properties = {
		serviceid: {
			value: serviceid
		},
		port: {
			value: port
		},
		ttl: {
			value: ttl
		},
		check: {
			value: check
		},
		notes: {
			value: notes
		},
		tags: {
			set: function (newTags) {
				this.needsUpdate = true;
				tags = newTags;
			},
			get: function () {
				return tags;
			}
		}
	};

	return Object.create(rootService, properties);
};


exports.registerWithManager = function (manager) {

	const stepNames = Object.keys(manager.steps);

	const healthMountPoint = '/health';
	const kronosCheckInterval = 10;

	const cs = service.createService('consul', {

		tags: stepNames,

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
			"interval": `${kronosCheckInterval}s`,
			"timeout": "1s"
		},

		/**
		 * Register the service in consul
		 * @return {Promise} that fullfills with the registered service
		 */
		_start() {
			const service = this;
			return new Promise(function (resolve, reject) {
				consul.agent.service.register(service.consulDefinition(), function (error) {
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

		/**
		 * deregister the service from consul
		 * @return {Promise} that fullfills when the deregitering has finished
		 */
		_stop() {
			const service = this;
			return new Promise(function (resolve, reject) {
				consul.agent.service.deregister(service.name, function (error) {
					if (error) {
						//console.log(`error deregistering: ${service} ${error}`);
						reject(error);
					} else {
						//console.log(`deregistered: ${service}`);
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
					return this.deregister().then(this.register());
				}, delay);
			} else {
				return this.deregister().then(this.register());
			}
		},

		kronosNodes() {
			const o = {
				dc: this.dataCenter,
				service: this.name
			};

			return new Promise(function (f, r) {
				consul.catalog.service.nodes(o, function (error, data) {
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
				consul.catalog.datacenters(function (error, data) {
					if (error) {
						reject(error);
					} else {
						fullfill(data);
					}
				});
			});
		}
	});

	manager.serviceRegister(cs);

	manager.addListener('stepRegistered', function (step) {
		cs.tags = Object.keys(manager.steps);
		cs.update(1000);
	});

};
