import assert from "node:assert/strict";
import test from "node:test";
import { refreshPackedEntries } from "../scripts/testing/consumer-lock.mjs";

const template = { lockfileVersion: 3, packages: {
  "": { dependencies: { "@subvertic/vrl-core": "file:tarballs/vrl-core.tgz", react: "19.3.0" } },
  "node_modules/@subvertic/vrl-core": { version: "0.1.0", resolved: "file:tarballs/vrl-core.tgz", integrity: "old", dependencies: { obsolete: "1.0.0" }, peerDependencies: { obsolete: ">=1" } },
  "node_modules/react": { version: "19.3.0", resolved: "https://registry.npmjs.org/react/-/react-19.3.0.tgz", integrity: "locked" }
} };
const packed = [{ name: "@subvertic/vrl-core", version: "0.2.0", integrity: "fresh", manifest: { engines: { node: ">=20.0.0" } } }];

test("fresh tarballs replace stale first-party metadata and remove obsolete dependencies", () => {
  const actual = JSON.parse(JSON.stringify(refreshPackedEntries(template, packed)));
  assert.deepEqual(actual.packages["node_modules/@subvertic/vrl-core"], { version: "0.2.0", resolved: "file:tarballs/vrl-core.tgz", integrity: "fresh", engines: { node: ">=20.0.0" } });
});
test("refreshing first-party artifacts preserves locked registry packages and consumer requirements", () => {
  const actual = refreshPackedEntries(template, packed);
  assert.deepEqual([actual.packages[""], actual.packages["node_modules/react"]], [template.packages[""], template.packages["node_modules/react"]]);
});
test("refreshing artifacts does not mutate the committed lock template or package metadata", () => {
  const before = structuredClone([template, packed]);
  refreshPackedEntries(template, packed);
  assert.deepEqual([template, packed], before);
});
for (const entry of [undefined, { link: true, resolved: "../../packages/vrl-core" }]) {
  test(`a ${entry ? "linked" : "missing"} package cannot pass as an installed tarball`, () => {
    assert.throws(() => refreshPackedEntries({ packages: { "node_modules/@subvertic/vrl-core": entry } }, packed), { message: "Missing packed consumer lock entry: @subvertic/vrl-core" });
  });
}
