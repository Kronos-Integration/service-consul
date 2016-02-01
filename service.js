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
	ServiceKOA = require('kronos-service-koa').Service;

class ServiceConsul extends ServiceKOA {
	constructor(config) {
		super(config);

		this.hcs = {
			url: "http://localhost:1234/"
		};
		//const hcs = manager.serviceGet('health-check');
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

		//this.tags = Object.keys(manager.steps);

		return consul.agent.service.register(this.serviceDefinition).then(f => {

			consul.status.leader().then(leader => {
				this.info(level => `Consul raft leader is ${Object.keys(leader).join(',')}`);
			});

			consul.status.peers().then(peers => {
				this.info(level => `Consul raft peers are ${peers.map(p => p.body)}`);
			});

			this.kronosNodes().then(nodes => {
				this.info(level => `Kronos nodes are ${nodes.map(n => JSON.stringify(n.body))}`);
			});

			this._stepRegisteredListener = step => {
				// TODO where to get the regitered steps from ?
				//this.tags = Object.keys(manager.steps);
				this.update(1000);
			};

			// TODO
			//manager.addListener('stepRegistered', this._stepRegisteredListener);
			return Promise.resolve();
		});
	}

	/**
	 * deregister the service from consul
	 * @return {Promise} that fullfills when the deregitering has finished
	 */
	_stop() {
		return consul.agent.service.deregister().then(f => {
			manager.removeListener('stepRegistered', this._stepRegisteredListener);
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

module.exports.registerWithManager = manager => manager.registerServiceFactory(ServiceConsul);
