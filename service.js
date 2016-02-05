/* jslint node: true, esnext: true */

"use strict";

const consul = require('consul')({
		promisify(fn) {
			return new Promise((resolve, reject) => {
				try {
					return fn((err, data, res) => {
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
	ServiceKOA = require('kronos-service-koa').Service,
	ServiceConsumerMixin = require('kronos-service').ServiceConsumerMixin;

class ServiceConsul extends ServiceKOA {
	constructor(config, owner) {
		super(config, owner);
		this.hcs = {
			url: "http://localhost:1234/"
		};
	}

	static get name() {
		return "consul";
	}

	get type() {
		return ServiceConsul.name;
	}

	get autostart() {
		return true;
	}

	get serviceId() {
		return this.serviceName;
	}

	get serviceName() {
		return "kronos";
	}

	get serviceDefinition() {
		return {
			name: this.serviceName,
			serviceid: this.serviceId,
			ttl: this.ttl,
			check: this.checkDefinition,
			port: this.port,
			tags: this.tags,
			notes: this.notes
		};
	}

	get checkDefinition() {
		return {
			"id": `${this.serviceName}-check`,
			"http": this.hcs.url,
			"interval": '10s',
			"timeout": "1s"
		};
	}

	/**
	 * Register the service in consul
	 * @return {Promise} that fullfills
	 */
	_start() {
		this.info(level => this.serviceDefinition);
		const self = this;

		return new Promise(function (fullfill, reject) {

			setTimeout(() => {
				console.log(`services: ${Object.keys(self.owner.services)}`);

				// TODO wait until service becomes available
				ServiceConsumerMixin.defineServiceConsumerProperties(self, {
					"hcs": {
						type: "health-check"
					}
				}, self.owner);

				self.tags = Object.keys(self.owner.steps);

				consul.agent.service.register(self.serviceDefinition).then(f => {
					consul.status.leader().then(leader => self.info(level =>
						`Consul raft leader is ${Object.keys(leader).join(',')}`));
					consul.status.peers().then(peers => self.info(level => `Consul raft peers are ${peers.map(p => p.body)}`));
					this.kronosNodes().then(nodes => self.info(level =>
						`Kronos nodes are ${nodes.map(n => JSON.stringify(n.body))}`));

					self._stepRegisteredListener = step => {
						self.tags = Object.keys(self.owner.steps);
						self.update(1000);
					};

					self.owner.addListener('stepRegistered', self._stepRegisteredListener);
					fullfill();
				}, reject);
			}, 1000);
		});
	}

	/**
	 * deregister the service from consul
	 * @return {Promise} that fullfills when the deregitering has finished
	 */
	_stop() {
		return consul.agent.service.deregister().then(f => {
			this.owner.removeListener('stepRegistered', this._stepRegisteredListener);
			return Promise.resolve();
		});
	}

	/**
	 * Update service definition in consul
	 * @param {Number} delay time to wait before doing the unregister/register action
	 */
	update(delay) {
		if (delay) {
			if (this._updateTimer) {
				clearTimeout(this._updateTimer);
			}
			this._updateTimer = setTimeout(() =>
				consul.agent.service.deregister().then(consul.agent.service.register(this.consulDefinition())), delay);
		} else {
			return consul.agent.service.deregister().then(consul.agent.service.register(this.consulDefinition()));
		}
	}

	kronosNodes() {
		return consul.catalog.service.nodes({
			//dc: this.dataCenter,
			service: this.name
		});
	}

	datacenters() {
		return consul.catalog.datacenters();
	}

	markCheckAsPassed() {
		consul.agent.check.pass(this.checkDefinition.id, error =>
			this.trace(level => `Check marked as passed: ${service} ${error}`)
		);
	}
}

module.exports.registerWithManager = manager =>
	manager.registerServiceFactory(ServiceConsul).then(sf =>
		manager.declareService({
			'type': sf.name,
			'name': sf.name,
			'port': 4712
		}));
