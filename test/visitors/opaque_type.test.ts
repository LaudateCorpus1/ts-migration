import pluginTester from "babel-plugin-tester";
import { buildPlugin } from "../../src/babel-plugin/plugin";
import { OpaqueType } from "../../src/babel-plugin/visitors/opaque_type";

pluginTester({
  plugin: buildPlugin([OpaqueType]),
  tests: [
    {
      title: "opaque type",
      code: `opaque type A = B;`,
      output: `type A = B;`
    },
    {
      title: "opaque type with super type",
      code: `opaque type A: S = B;`,
      output: `type A = B;`
    }
  ]
});
