import test from 'ava';
import { ServiceConsul } from '../src/service-consul.mjs';

test('consul service fail to connect', async t => {
  const m = new Registry(
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
    ]
  );

  registry.add([import('@kronos-integation/service-health-check'), import('@kronos-integation/service-koa')]);
  registry.add(ServiceConsul);

  const cs = m.services.registry;

  try {
    await cs.start();
  } catch (e) {
    t.is(cs.state, 'failed');
  }
});
