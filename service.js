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
	route = require('koa-route'),
	service = require('kronos-service'),
	ServiceConsumerMixin = require('kronos-service').ServiceConsumerMixin;

class ServiceConsul extends service.Service {

	static get name() {
		return "consul";
	}

	get type() {
		return ServiceConsul.name;
	}

	get autostart() {
		return true;
	}

	constructor(config, owner) {
		super(config, owner);

		Object.defineProperty(this, 'consul', {
			value: consul
		});

		Object.defineProperty(this, 'checkPath', {
			value: config.checkPath || '/check'
		});

		Object.defineProperty(this, 'checkInterval', {
			value: config.checkInterval || '10s'
		});
	}

	get serviceDefinition() {
		return {
			port: this.listener.port,
			address: this.listener.hostname,
			tags: this.tags,
			name: "kronos",
			id: this.listener.url,
			check: {
				"id": this.listener.url + this.checkPath,
				"http": this.listener.url + this.checkPath,
				"interval": this.checkInterval,
				"timeout": "1s"
			}
		};
	}

	/**
	 * Register the service in consul
	 * @return {Promise} that fullfills
	 */
	_start() {
		return super._start().then(() => {
			//this.info(level => this.serviceDefinition);

			this.tags = Object.keys(this.owner.steps);

			// wait until health-check and koa services are present
			return ServiceConsumerMixin.defineServiceConsumerProperties(this, {
				"listener": {
					name: "admin",
					type: "koa"
				},
				"hcs": {
					type: "health-check"
				}
			}, this.owner, true).then(() =>
				this.listener.start().then(() =>
					consul.agent.service.register(this.serviceDefinition).then(f => {
						consul.status.leader().then(leader => this.info(level =>
							`Consul raft leader is ${Object.keys(leader).join(',')}`));
						consul.status.peers().then(peers => this.info(level =>
							`Consul raft peers are ${peers.map(p => p.body)}`));
						this.kronosNodes().then(nodes => this.info(level =>
							`Kronos nodes are ${nodes[0].map( n => n.ServiceID)}`)).catch(console.log);

						/*
												this.kronosNodes().then(nodes => this.info(level =>
													`Kronos nodes are ${nodes.map(n => JSON.stringify(n.body))}`)).catch(console.log);
						*/

						this._stepRegisteredListener = step => {
							this.tags = Object.keys(this.owner.steps);
							this.update(1000);
						};

						this.owner.addListener('stepRegistered', this._stepRegisteredListener);

						this.listener.koa.use(route.get(this.checkPath, ctx =>
							this.hcs.endpoints.state.receive({}).then(r => {
								this.info({
									'health': r
								});
								this.status = r ? 200 : 300;
								ctx.body = r ? 'OK' : 'ERROR';
							})
						));

						return Promise.resolve();
					})
				)
			);
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
		const reregister = () => {
			return consul.agent.service.deregister(this.consulDefinition.id)
				.then(() => consul.agent.service.register(this.consulDefinition));
		};

		if (delay) {
			if (this._updateTimer) {
				clearTimeout(this._updateTimer);
			}
			this._updateTimer = setTimeout(reregister, delay);
		} else {
			return reregister();
		}
	}

	kronosNodes() {
		return consul.catalog.service.nodes({
			service: this.serviceDefinition.name
		});
	}

	registerService(name, options) {
		this.info({
			message: 'registerService',
			name: name,
			options: options
		});

		const serviceDefinition = {
			name: name,
			id: options.url,
			tags: options.tags
		};

		return consul.agent.service.register(serviceDefinition).then(f => {
			//this.info(`registered: ${JSON.stringify(f)}`);
			return Promise.resolve();
		});
	}

	unregisterService(name) {
		this.info({
			message: 'unregisterService',
			name: name
		});

		return consul.agent.service.deregister(name);
	}

	* serviceURLs(name) {
		let si = [];

		let firstPromise = consul.catalog.service.nodes({
			service: name
		}).then(nodes => {
			si = nodes[0].map(n => n.ServiceID);
			//	console.log(`AAA size: ${si.length} ${si[0]}`);

			firstPromise = undefined;

			return Promise.resolve(si[0]);
		});

		while (firstPromise) {
			yield firstPromise;
			//console.log(`size: ${si.length} ${firstPromise}`);
		}

		if (si.length) {
			for (let i = 1;; i++) {
				if (i >= si.length) {
					i = 0;
				}
				//console.log(`yield: ${i} ${si.length}`);
				yield Promise.resolve(si[i]);
			}
		}
		return undefined;
	}

}

module.exports.registerWithManager = manager =>
	manager.registerServiceFactory(ServiceConsul).then(sf =>
		manager.declareService({
			'type': sf.name,
			'name': 'registry'
		}));
