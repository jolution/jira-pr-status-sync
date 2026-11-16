"use strict";

const { computeTargetState } = require("./transition");
const { resolveLabel, labelsToRemove } = require("./labels");

async function updateJiraState({
  context,
  core,
  ticketId,
  actualState,
  statuses,
  events,
  webhookUrl,
  fetchFn = fetch,
}) {
  const pullRequest = context.payload.pull_request;
  const targetState = computeTargetState({
    actualState,
    action: context.payload.action,
    eventName: context.eventName,
    pullRequest,
    reviewState: context.payload.review?.state,
    statuses,
  });

  if (!targetState || targetState === actualState) {
    core.setOutput("state", actualState);
    return;
  }

  const response = await fetchFn(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      issues: [ticketId],
      data: {
        event: events[targetState],
        pullRequestNumber: pullRequest.number,
        pullRequestUrl: pullRequest.html_url,
      },
    }),
  });

  if (!response.ok) {
    core.setFailed(`Jira webhook failed: ${response.status}`);
    return;
  }

  core.info(`✅ Jira state updated to: ${targetState}`);
  core.setOutput("state", targetState);
}

async function syncLabel({ github, context, core, state, labelMap }) {
  if (!state) {
    core.info("⚠️ No Jira state available, skipping label sync");
    return;
  }

  const label = resolveLabel(labelMap, state);
  if (!label) {
    core.info(`⚠️ Unknown Jira state: ${state}`);
    return;
  }

  const { owner, repo } = context.repo;
  const issue_number = context.issue.number;

  for (const staleLabel of labelsToRemove(labelMap, label)) {
    try {
      await github.rest.issues.removeLabel({
        owner,
        repo,
        issue_number,
        name: staleLabel,
      });
    } catch {
      // Label was not present, nothing to remove.
    }
  }

  await github.rest.issues.addLabels({
    owner,
    repo,
    issue_number,
    labels: [label],
  });
  core.info(`✅ Jira state synced: '${state}' -> GitHub label '${label}'`);
}

module.exports = { updateJiraState, syncLabel };
