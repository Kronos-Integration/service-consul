import test from "ava";
import { StandaloneServiceProvider } from "@kronos-integration/service";
import { ServiceConsul } from "../src/service-consul.mjs";

test("consul service fail to connect", async t => {
  const sp = new StandaloneServiceProvider();

  const [consul] = sp.declareServices({
    consul: {
      type: ServiceConsul
    }
  });

  await consul.start();

  t.is(consul.state, "running");
});
