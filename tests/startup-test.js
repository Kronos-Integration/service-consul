import { ServiceConsul, registerWithManager } from '../src/service-consul';
import test from 'ava';

const { manager } = require('kronos-service-manager');

test('consul service fail to connect', async t => {
  const m = await manager(
    [
      {},
      {
        name: 'registry',
        port: 12345
      },
      {
        name: 'koa-admin',
        listen: {
          port: 9896
        }
      }
    ],
    [require('kronos-service-health-check'), require('kronos-service-koa')]
  );

  await registerWithManager(m);

  const cs = m.services.registry;

  try {
    await cs.start();
  } catch (e) {
    t.is(cs.state, 'failed');
  }
});
