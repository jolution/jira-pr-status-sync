"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { computeTargetState } = require("../src/transition");

const statuses = {
  new: "To Do",
  active: "In Progress",
  review: "Code Review",
  closed: "Done",
};

test("moves to review when ready_for_review from new or active", () => {
  assert.equal(
    computeTargetState({
      actualState: "To Do",
      action: "ready_for_review",
      eventName: "pull_request",
      pullRequest: {},
      statuses,
    }),
    "Code Review",
  );
});

test("moves back to active when converted to draft", () => {
  assert.equal(
    computeTargetState({
      actualState: "Code Review",
      action: "converted_to_draft",
      eventName: "pull_request",
      pullRequest: {},
      statuses,
    }),
    "In Progress",
  );
});

test("moves back to active on changes requested review", () => {
  assert.equal(
    computeTargetState({
      actualState: "Code Review",
      eventName: "pull_request_review",
      reviewState: "changes_requested",
      pullRequest: {},
      statuses,
    }),
    "In Progress",
  );
});

test("keeps open draft PRs in active", () => {
  assert.equal(
    computeTargetState({
      actualState: "To Do",
      eventName: "pull_request",
      pullRequest: { state: "open", draft: true },
      statuses,
    }),
    "In Progress",
  );
});

test("moves open non-draft PRs to review", () => {
  assert.equal(
    computeTargetState({
      actualState: "In Progress",
      eventName: "pull_request",
      pullRequest: { state: "open", draft: false },
      statuses,
    }),
    "Code Review",
  );
});

test("moves merged PRs to closed", () => {
  assert.equal(
    computeTargetState({
      actualState: "Code Review",
      eventName: "pull_request",
      pullRequest: { merged: true },
      statuses,
    }),
    "Done",
  );
});

test("moves closed-without-merge PRs back to active", () => {
  assert.equal(
    computeTargetState({
      actualState: "Code Review",
      action: "closed",
      eventName: "pull_request",
      pullRequest: { merged: false },
      statuses,
    }),
    "In Progress",
  );
});

test("returns null when no rule matches", () => {
  assert.equal(
    computeTargetState({
      actualState: "Done",
      eventName: "pull_request",
      pullRequest: { state: "open", draft: false },
      statuses,
    }),
    null,
  );
});
