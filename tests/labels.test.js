"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { resolveLabel, labelsToRemove } = require("../src/labels");

const labelMap = {
  "To Do": "state:new",
  "In Progress": "state:in-progress",
  "Code Review": "state:review",
  Done: "state:closed",
  Blocked: "state:blocked",
};

test("resolves the label for a known state", () => {
  assert.equal(resolveLabel(labelMap, "In Progress"), "state:in-progress");
});

test("returns null for an unknown state", () => {
  assert.equal(resolveLabel(labelMap, "Unknown"), null);
});

test("lists all labels except the target one for removal", () => {
  assert.deepEqual(
    labelsToRemove(labelMap, "state:in-progress").sort(),
    ["state:new", "state:review", "state:closed", "state:blocked"].sort(),
  );
});
