/* jslint node: true, esnext: true */

'use strict';

const address = require('network-address'),
	url = require('url'),
	route = require('koa-route'),
	PromiseRepeat = require('promise-repeat'),
	mat = require('model-attributes'),
	endpoint = require('kronos-endpoint'),
	service = require('kronos-service'),
	ServiceConsumerMixin = require('kronos-service').ServiceConsumerMixin;

function createWatchEndpoint(name, owner, makeWatch, dataProvider) {
	let watch;

	const options = {
		createOpposite: true
	};

	options.willBeClosed = () => {
		owner.trace({
			endpoint: this.identifier,
			state: 'close'
		});

		if (watch) {
			watch.end();
			watch = undefined;
		}
	};

	options.hasBeenOpened = () => {
		owner.trace({
			endpoint: this.identifier,
			state: 'open'
		});

		watch = makeWatch();
		watch.on('change', (data, res) => this.opposite.receive(data));
		watch.on('error', err => owner.error({
			error: err,
			endpoint: this.identifier
		}));
	};

	const ep = new endpoint.ReceiveEndpoint(name, owner, options);

	ep.receive = request => {
		if (request) {
			if (request.update && watch === undefined) {

			} else if (request.update === false && watch) {
				watch.end();
				watch = undefined;
			}
		}

		return dataProvider();
	};

	return ep;
}

class ServiceConsul extends service.Service {
	static get name() {
		return 'consul';
	}

	get autostart() {
		return true;
	}

	constructor(config, owner) {
		super(config, owner);

		const svc = this;

		let watch;

		const nodesEndpoint = new endpoint.ReceiveEndpoint('nodes', this, {
			createOpposite: true,
			willBeClosed() {
				this.trace({
					endpoint: this.identifier,
					state: 'close'
				});

				if (watch) {
					watch.end();
					watch = undefined;
				}
			},
			hasBeenOpened() {
				this.trace({
					endpoint: this.identifier,
					state: 'open'
				});
			}
		});

		nodesEndpoint.receive = request => {
			if (request) {
				if (request.update && watch === undefined) {
					watch = this.consul.watch({
						method: this.consul.catalog.service.nodes,
						options: {
							service: this.serviceDefinition.name
						}
					});

					watch.on('change', (data, res) => {
						console.log(data);
						return nodesEndpoint.opposite.receive(data);
					});
					watch.on('error', err => svc.error(err));
				} else if (request.update === false && watch) {
					watch.end();
					watch = undefined;
				}
			}

			return this.kronosNodes();
		};

		this.addEndpoint(nodesEndpoint);

		const options = {
			key: '',
			recurse: true
		};

		this.addEndpoint(createWatchEndpoint('kv', this, () => this.consul.watch({
			method: this.consul.kv.get,
			options: options
		}), () => this.consul.kv.get(options).then(r => {
			const dict = {};
			r[0].forEach(e => dict[e.Key] = e.Value);
			//console.log(dict);
			return dict;
		})));


		this.addEndpoint(createWatchEndpoint('checks', this, () => this.consul.watch({
			method: this.consul.health.checks,
			options: options
		}), () => this.consul.health.checks(options).then(r => {
			console.log(r);
			return r;
		})));
	}

	get configurationAttributes() {
		const co = this.consulOptions;

		function consulOptionSetter(value, attribute) {
			if (value !== undefined) {
				console.log(`set ${JSON.stringify(attribute)} ${value}`);
				co[attribute.name] = value;
			}
		}

		return Object.assign(mat.createAttributes({
			host: {
				description: 'consul host',
				default: 'localhost',
				type: 'string',
				setter: consulOptionSetter
			},
			port: {
				description: 'consul port',
				default: 8500,
				type: 'integer',
				setter: consulOptionSetter
			},
			secure: {
				default: false,
				type: 'boolean',
				setter: consulOptionSetter
			},
			ca: {
				setter: consulOptionSetter
			},
			checkPath: {
				description: 'url path used for the kronos check',
				type: 'string',
				default: '/check'
			},
			checkInterval: {
				description: 'interval the kronos check is called',
				default: 10,
				type: 'duration'
			},
			checkTimeout: {
				description: 'timeout for the kronos check interval',
				default: 5,
				type: 'duration'
			},
			startTimeout: {
				description: 'timeout for the service startup',
				default: 600,
				type: 'duration'
			}
		}), service.Service.configurationAttributes);
	}

	_configure(config) {
		if (this.consulOptions === undefined) {
			this.consulOptions = {
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
		}

		return super._configure(config);
	}

	get consul() {
		if (!this._consul) {
			console.log(this.consulOptions);

			this._consul = require('consul')(this.consulOptions);
		}

		return this._consul;
	}

	get serviceDefinition() {
		function asSeconds(value) {
			return value instanceof String && value.matches(/s$/) ? value : `${value}s`;
		}

		return {
			name: 'kronos',
			id: this.owner.id,
			port: this.listener.port,
			address: this.listener.address,
			tags: this.tags,
			check: {
				id: this.listener.url + this.checkPath,
				http: this.listener.url + this.checkPath,
				interval: asSeconds(this.checkInterval),
				timeout: asSeconds(this.checkTimeout)
			}
		};
	}

	updateTags() {
		this.tags = Object.keys(this.owner.steps).map(name => `step:${name}`);
	}

	timeoutForTransition(transition) {
		if (transition.name === 'start') {
			return this.startTimeout * 1000;
		}

		return super.timeoutForTransition(transition);
	}

	/**
	 * Register the kronos service in consul
	 * @return {Promise} that fullfills on succesfull startup
	 */
	_start() {
		const cs = this;

		return super._start().then(() => {
			this.updateTags();

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
				}, this.owner, true)
				.then(() =>
					this.listener.start().then(() =>
						PromiseRepeat(
							() =>
							this.consul.agent.service.register(this.serviceDefinition).then(fullfilled => {
								this._stepRegisteredListener = step => {
									this.updateTags();
									this.update(5000);
								};

								this.owner.addListener('stepRegistered', this._stepRegisteredListener);

								this.listener.koa.use(route.get(this.checkPath, ctx =>
									this.hcs.endpoints.state.receive({}).then(isHealthy => [this.status, ctx.body] = isHealthy ? [200, 'OK'] : [
										300,
										'ERROR'
									])
								));

								return Promise.resolve();
							}), {
								maxAttempts: 5,
								minTimeout: 2000,
								maxTimeout: cs.startTimeout * 1000,
								throttle: 2000,
								boolRetryFn(e, options) {
									cs.info({
										message: 'retry start',
										error: e
									});
									/*if (e.errno === 'ECONNREFUSED') {
										return true;
									}*/

									return true;
								}
							})()
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
			if (this._stepRegisteredListener) {
				this.owner.removeListener('stepRegistered', this._stepRegisteredListener);
				this._stepRegisteredListener = undefined;
			}
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

		/*
				const watch = this.consul.watch({
					method: this.consul.kv.get,
					options: {
						key: `services/${name}/${this.id}/url`
					}
				});

				watch.on('change', (data, res) => {
					console.log('change data:', data);
				});

				watch.on('error', err => console.log('error:', err));
		*/

		return this.consul.kv.set({
			key: `services/${name}/${this.owner.id}/url`,
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
			type: sf.name,
			name: 'registry'
		}));
