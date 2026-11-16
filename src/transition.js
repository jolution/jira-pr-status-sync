"use strict";

function computeTargetState({
  actualState,
  action,
  eventName,
  pullRequest,
  reviewState,
  statuses,
}) {
  const { new: toDo, active, review, closed } = statuses;

  if (action === "ready_for_review" && [toDo, active].includes(actualState)) {
    return review;
  }

  if (
    action === "converted_to_draft" &&
    [toDo, active, review].includes(actualState)
  ) {
    return active;
  }

  if (
    eventName === "pull_request_review" &&
    reviewState === "changes_requested" &&
    actualState === review
  ) {
    return active;
  }

  if (
    eventName === "pull_request" &&
    pullRequest.state === "open" &&
    pullRequest.draft === true &&
    [toDo, active, review].includes(actualState)
  ) {
    return active;
  }

  if (
    eventName === "pull_request" &&
    pullRequest.state === "open" &&
    pullRequest.draft === false &&
    [toDo, active].includes(actualState)
  ) {
    return review;
  }

  if (pullRequest.merged === true) {
    return closed;
  }

  if (
    action === "closed" &&
    pullRequest.merged === false &&
    actualState === review
  ) {
    return active;
  }

  return null;
}

module.exports = { computeTargetState };
