# jira-pr-status-sync

🔄 Syncs a PR's lifecycle state to a Jira issue status (via a Jira Automation
webhook) and mirrors the result as a GitHub label.

Internally uses [`jolution/jira-get-ticket-id`](https://github.com/jolution/jira-get-ticket-id)
and [`jolution/jira-get-ticket-state`](https://github.com/jolution/jira-get-ticket-state).

## Usage

```yaml
on:
  pull_request:
    types:
      [
        opened,
        reopened,
        edited,
        synchronize,
        ready_for_review,
        converted_to_draft,
        closed,
      ]
  pull_request_review:
    types: [submitted]

jobs:
  sync:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: jolution/jira-pr-status-sync@v1
        with:
          jira-base-url: ${{ secrets.JIRA_BASE_URL }}
          jira-token: ${{ secrets.JIRA_TOKEN }}
          jira-webhook-url: ${{ secrets.JIRA_WEBHOOK_URL }}
          status-new: "Zu erledigen"
          status-active: "In Arbeit"
          status-review: "In Code-Review"
          status-closed: "Fertig"
          label-map: |
            {
              "Zu erledigen": "state:new",
              "In Arbeit": "state:in-progress",
              "In Code-Review": "state:review",
              "Fertig": "state:closed",
              "Geblockt": "state:blocked",
              "In Prüfung": "state:testing"
            }
```

## Transition rules

Given the board columns To Do / In Progress / Code Review / Done:

- PR open + draft + state in `[To Do, In Progress, Code Review]` → In Progress
- PR open + not draft + state in `[To Do, In Progress]` → Code Review
- `ready_for_review` event + state in `[To Do, In Progress]` → Code Review
- `converted_to_draft` event + state in `[To Do, In Progress, Code Review]` → In Progress
- Review submitted with `changes_requested` + state `Code Review` → In Progress
- PR merged → Done
- PR closed without merge + state `Code Review` → In Progress

The transition is performed by posting to `jira-webhook-url` (a Jira Automation
rule listening for incoming webhook events), using the configured
`event-active` / `event-review` / `event-closed` event names.

## Inputs

| Name               | Required | Default        | Description                                            |
| ------------------ | -------- | -------------- | ------------------------------------------------------ |
| `github-token`     | no       | `github.token` | Token with pull-requests write permission              |
| `jira-base-url`    | yes      | —              | Jira base URL                                          |
| `jira-token`       | yes      | —              | Jira personal access token                             |
| `jira-webhook-url` | yes      | —              | Jira Automation incoming webhook URL                   |
| `status-new`       | yes      | —              | Jira status name for the "To Do" column                |
| `status-active`    | yes      | —              | Jira status name for the "In Progress" column          |
| `status-review`    | yes      | —              | Jira status name for the "Code Review" column          |
| `status-closed`    | yes      | —              | Jira status name for the "Done" column                 |
| `event-active`     | no       | `in-progress`  | Webhook event name for the "In Progress" transition    |
| `event-review`     | no       | `review`       | Webhook event name for the "Code Review" transition    |
| `event-closed`     | no       | `closed`       | Webhook event name for the "Done" transition           |
| `label-map`        | yes      | —              | JSON object mapping Jira status names to GitHub labels |

## Outputs

| Name    | Description                               |
| ------- | ----------------------------------------- |
| `state` | Resulting Jira status name after the sync |

## Development

```bash
node --test tests/*.test.js
```
