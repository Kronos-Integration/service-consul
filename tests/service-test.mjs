import { ServiceConsul, registerWithManager } from '../src/service-consul.mjs';
import { SendEndpoint } from '@kronos-integration/endpoint';
import test from 'ava';

test('consul service', async t => {
  const m = await manager(
    [
      {
        id: 'myId'
      },
      {
        name: 'registry',
        checkInterval: 100
      }
    ],
    [require('kronos-service-health-check'), require('kronos-service-koa')]
  );

  const cs = m.services.registry;

  t.is(cs.name, 'registry');
  t.is(cs.type, 'consul');

  await cs.start();

  t.is(cs.state, 'running');
  t.deepEqual(cs.tags, []);

  const kv = new SendEndpoint(
    'kv',
    {},
    {
      createOpposite: true
    }
  );

  kv.opposite.receive = data => {
    console.log(`kv.receive: ${data ? data[0].Value : 'null'}`);
  };

  cs.endpoints.kv.connected = kv;
  kv.receive({
    update: true
  });
  let i = 0;

  setInterval(() => {
    cs.consul.kv.set('kronos', '' + i);
    i = i + 1;
  }, 2000);

  const te = new SendEndpoint(
    'test',
    {},
    {
      createOpposite: true
    }
  );

  te.opposite.receive = request => {
    console.log(`te.opposite.receive: ${JSON.stringify(request)}`);
  };

  te.connected = cs.endpoints.nodes;

  te
    .receive({
      update: true
    })
    .then(r => {
      console.log(r);
      //assert.equal(r[0].ServiceName, 'kronos');
      te.receive({
        update: false
      });
    });

  cs
    .registerService('myService', {
      url: cs.listener.url + '/somepath'
    })
    .then(() => {
      const us = cs.serviceURLs('myService');

      us.next().value.then(u => t.is(u, cs.listener.url + '/somepath'));

      setInterval(
        () =>
          us.next().value.then(u => {
            console.log(`myService: ${u}`);
            t.is(u, cs.listener.url + '/somepath');
          }),
        1000
      );

      setTimeout(() => {
        cs.unregisterService('myService').then(() => {
          t.pass('unregistered');

          const us = cs.serviceURLs('myService');
          console.log(`after: ${JSON.stringify(us.next())}`);
        });
      }, 5000);
    })
    .catch(console.log);

  return new Promise((f, r) =>
    setTimeout(() => {
      cs.stop();
      f();
    }, 20000)
  );
});
