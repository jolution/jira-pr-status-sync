"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { updateJiraState, syncLabel } = require("../src/run");

const statuses = {
  new: "To Do",
  active: "In Progress",
  review: "Code Review",
  closed: "Done",
};
const events = {
  "In Progress": "in-progress",
  "Code Review": "review",
  Done: "closed",
};

function createCore() {
  const outputs = {};
  const failures = [];
  return {
    outputs,
    failures,
    setOutput: (name, value) => {
      outputs[name] = value;
    },
    setFailed: (message) => failures.push(message),
    info: () => {},
  };
}

test("updateJiraState posts to the webhook and sets the new state", async () => {
  const core = createCore();
  const calls = [];
  const fetchFn = async (url, options) => {
    calls.push({ url, options });
    return { ok: true };
  };
  const context = {
    payload: {
      action: "ready_for_review",
      pull_request: { number: 1, html_url: "https://pr" },
    },
    eventName: "pull_request",
  };

  await updateJiraState({
    context,
    core,
    ticketId: "JOL-1",
    actualState: "To Do",
    statuses,
    events,
    webhookUrl: "https://hook",
    fetchFn,
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://hook");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    issues: ["JOL-1"],
    data: {
      event: "review",
      pullRequestNumber: 1,
      pullRequestUrl: "https://pr",
    },
  });
  assert.deepEqual(core.outputs, { state: "Code Review" });
});

test("updateJiraState keeps the state when no transition matches", async () => {
  const core = createCore();
  const fetchFn = async () => {
    throw new Error("should not be called");
  };
  const context = {
    payload: {
      action: "edited",
      pull_request: { state: "open", draft: false },
    },
    eventName: "pull_request",
  };

  await updateJiraState({
    context,
    core,
    ticketId: "JOL-1",
    actualState: "Code Review",
    statuses,
    events,
    webhookUrl: "https://hook",
    fetchFn,
  });

  assert.deepEqual(core.outputs, { state: "Code Review" });
});

test("updateJiraState fails clearly when the webhook call fails", async () => {
  const core = createCore();
  const fetchFn = async () => ({ ok: false, status: 500 });
  const context = {
    payload: {
      action: "ready_for_review",
      pull_request: { number: 1, html_url: "https://pr" },
    },
    eventName: "pull_request",
  };

  await updateJiraState({
    context,
    core,
    ticketId: "JOL-1",
    actualState: "To Do",
    statuses,
    events,
    webhookUrl: "https://hook",
    fetchFn,
  });

  assert.deepEqual(core.failures, ["Jira webhook failed: 500"]);
});

test("syncLabel adds the target label and removes the others", async () => {
  const core = createCore();
  const added = [];
  const removed = [];
  const github = {
    rest: {
      issues: {
        addLabels: async (request) => added.push(request),
        removeLabel: async (request) => removed.push(request),
      },
    },
  };
  const context = {
    repo: { owner: "owner", repo: "repo" },
    issue: { number: 42 },
  };
  const labelMap = { "To Do": "state:new", "In Progress": "state:in-progress" };

  await syncLabel({ github, context, core, state: "In Progress", labelMap });

  assert.deepEqual(added, [
    {
      owner: "owner",
      repo: "repo",
      issue_number: 42,
      labels: ["state:in-progress"],
    },
  ]);
  assert.deepEqual(removed, [
    { owner: "owner", repo: "repo", issue_number: 42, name: "state:new" },
  ]);
});

test("syncLabel does nothing when there is no state", async () => {
  const core = createCore();
  const github = {
    rest: {
      issues: {
        addLabels: async () => {
          throw new Error("should not be called");
        },
      },
    },
  };
  await syncLabel({ github, context: {}, core, state: "", labelMap: {} });
  assert.deepEqual(core.outputs, {});
});
