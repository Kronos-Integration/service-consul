/* jslint node: true, esnext: true */

'use strict';

const address = require('network-address'),
	url = require('url'),
	route = require('koa-route'),
	endpoint = require('kronos-endpoint'),
	service = require('kronos-service'),
	ServiceConsumerMixin = require('kronos-service').ServiceConsumerMixin;

class ServiceConsul extends service.Service {

	static get name() {
		return 'consul';
	}

	get type() {
		return ServiceConsul.name;
	}

	get autostart() {
		return true;
	}

	constructor(config, owner) {
		super(config, owner);

		// id of our node in the consul cluster
		Object.defineProperty(this, 'id', {
			value: config.id || address()
		});

		Object.defineProperty(this, 'checkPath', {
			value: config.checkPath || '/check'
		});

		Object.defineProperty(this, 'checkInterval', {
			value: config.checkInterval || '10s'
		});

		Object.defineProperty(this, 'checkTimeout', {
			value: config.checkTimeout || '5s'
		});

		this.addEndpoint(new endpoint.ReceiveEndpoint('nodes', this)).receive = request => this.kronosNodes();
	}

	_configure(config) {
		const options = {
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
		};

		['host', 'port', 'secure', 'ca'].forEach(name => {
			if (config[name] !== undefined) {
				options[name] = config[name];
			}
		});

		this.consul = require('consul')(options);
	}

	get serviceDefinition() {
		return {
			name: 'kronos',
			id: this.id,
			port: this.listener.port,
			address: this.listener.hostname,
			tags: this.tags,
			check: {
				id: this.listener.url + this.checkPath,
				http: this.listener.url + this.checkPath,
				interval: this.checkInterval,
				timeout: this.checkTimeout
			}
		};
	}

	/**
	 * Register the service in consul
	 * @return {Promise} that fullfills on succesfull startup
	 */
	_start() {
		return super._start().then(() => {
			this.tags = Object.keys(this.owner.steps);

			// wait until health-check and koa services are present
			return ServiceConsumerMixin.defineServiceConsumerProperties(this, {
				listener: {
					name: 'koa-admin',
					type: 'koa'
				},
				hcs: {
					name: 'health-check',
					type: 'health-check'
				}
			}, this.owner, true).then(() =>
				this.listener.start().then(() =>
					this.consul.agent.service.register(this.serviceDefinition).then(f => {
						this.consul.status.leader().then(leader => this.info(level =>
							`Consul raft leader is ${Object.keys(leader).join(',')}`));
						this.consul.status.peers().then(peers => this.info(level =>
							`Consul raft peers are ${peers.map(p => p.body)}`));
						this.kronosNodes().then(nodes => this.info(level =>
							`Kronos nodes are ${nodes.map( n => n.ServiceID)}`));

						this._stepRegisteredListener = step => {
							this.tags = Object.keys(this.owner.steps);
							this.update(5000);
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
		return this.consul.agent.service.deregister(this.serviceDefinition.id).then(f => {
			this.owner.removeListener('stepRegistered', this._stepRegisteredListener);
			return Promise.resolve();
		});
	}

	/**
	 * Update service definition in consul
	 * @param {Number} delay time to wait before doing the unregister/register action
	 */
	update(delay) {
		const reregister = () =>
			this.consul.agent.service.deregister(this.serviceDefinition.id)
			.then(() => this.consul.agent.service.register(this.serviceDefinition));

		if (this._updateTimer) {
			clearTimeout(this._updateTimer);
		}

		if (delay) {
			this._updateTimer = setTimeout(reregister, delay);
		} else {
			return reregister();
		}
	}

	kronosNodes() {
		return this.consul.catalog.service.nodes({
			service: this.serviceDefinition.name
		}).then(response => response[0]);
	}

	registerService(name, options) {
		this.info({
			message: 'registerService',
			name: name,
			options: options
		});

		const u = url.parse(options.url);

		return this.consul.kv.set({
			key: `services/${name}/${this.id}/url`,
			value: options.url
		});

		/*
				const serviceDefinition = {
					name: name,
					id: u.href,
					address: u.hostname,
					port: parseInt(u.port, 10),
					tags: options.tags
				};


				return consul.agent.service.register(serviceDefinition).then(f => {
					//this.info(`registered: ${JSON.stringify(f)}`);
					return Promise.resolve();
				});
				*/
	}

	unregisterService(name) {
		this.info({
			message: 'unregisterService',
			name: name
		});

		return this.consul.kv.del({
			key: `services/${name}/${this.id}`,
			recurse: true
		});

		//return consul.agent.service.deregister(name);
	}

	* serviceURLs(name) {
		let si = [];

		let firstPromise = this.consul.kv.get({
				key: `services/${name}`,
				recurse: true
			})
			.then(data => {
				si = data[0].map(d => d.Value);
				firstPromise = undefined;
				return si.length === 0 ? Promise.reject() : Promise.resolve(si[0]);
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
