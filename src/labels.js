"use strict";

function resolveLabel(labelMap, state) {
  return labelMap[state] ?? null;
}

function labelsToRemove(labelMap, targetLabel) {
  return Object.values(labelMap).filter((label) => label !== targetLabel);
}

module.exports = { resolveLabel, labelsToRemove };
