"use client";

import { useState, useEffect, useRef } from "react";
import {
  getFeatureRequests,
  saveFeatureRequest,
  type FeatureRequest,
} from "@/store/db";
import { adminFetchInit } from "@/lib/admin-client";

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const STATUS_COLORS: Record<FeatureRequest['status'], string> = {
  pending: 'bg-gray-600 text-gray-200',
  building: 'bg-yellow-600 text-yellow-100',
  ready: 'bg-green-600 text-green-100',
  approved: 'bg-blue-500 text-blue-100',
  deployed: 'bg-blue-600 text-blue-100',
  rejected: 'bg-red-700 text-red-100',
  failed: 'bg-red-700 text-red-100',
};

const TERMINAL = new Set<FeatureRequest['status']>(['deployed', 'rejected', 'failed']);

/** Statuses that go in the folded "completed/deployed" section */
const COMPLETED_DEPLOYED = new Set<FeatureRequest['status']>(['deployed', 'rejected', 'failed']);

// Pipeline stages for visual progress indicator
const PIPELINE_STAGES: { label: string; statuses: FeatureRequest['status'][] }[] = [
  { label: 'Action', statuses: ['pending', 'building'] },
  { label: 'PR', statuses: ['building', 'ready', 'approved', 'deployed'] },
  { label: 'Preview', statuses: ['ready', 'approved', 'deployed'] },
  { label: 'Merged', statuses: ['approved', 'deployed'] },
  { label: 'Live', statuses: ['deployed'] },
];

function getActiveStageIndex(feature: FeatureRequest): number {
  const { status, buildStep = '' } = feature;
  if (status === 'deployed') return 4;
  if (status === 'approved') return 3;
  if (status === 'ready') return 2;
  if (status === 'building') {
    // Distinguish sub-steps within building
    if (/PR created|awaiting|queued|deploying/i.test(buildStep)) return 1;
    return 0;
  }
  return 0;
}

function PipelineProgress({ feature }: { feature: FeatureRequest }) {
  if (feature.status === 'rejected' || feature.status === 'failed') return null;

  const activeIdx = getActiveStageIndex(feature);

  return (
    <div className="flex items-center gap-1 pt-1">
      {PIPELINE_STAGES.map((stage, i) => {
        const isCompleted = i < activeIdx;
        const isActive = i === activeIdx;
        const isFuture = i > activeIdx;
        return (
          <div key={stage.label} className="flex items-center gap-1 flex-1 min-w-0">
            <div className="flex flex-col items-center flex-1 min-w-0">
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  isCompleted
                    ? 'bg-blue-500'
                    : isActive
                    ? 'bg-yellow-400 ring-2 ring-yellow-400 ring-offset-1 ring-offset-gray-900'
                    : 'bg-gray-700'
                }`}
              />
              <span
                className={`text-[9px] mt-0.5 truncate w-full text-center ${
                  isCompleted
                    ? 'text-blue-400'
                    : isActive
                    ? 'text-yellow-300'
                    : isFuture
                    ? 'text-gray-600'
                    : 'text-gray-500'
                }`}
              >
                {stage.label}
              </span>
            </div>
            {i < PIPELINE_STAGES.length - 1 && (
              <div
                className={`h-px flex-1 mb-3 ${
                  i < activeIdx ? 'bg-blue-500' : 'bg-gray-700'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function BuilderPage() {
  const [features, setFeatures] = useState<FeatureRequest[]>([]);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [showCompletedDeployed, setShowCompletedDeployed] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeFeatures = features.filter((f) => !COMPLETED_DEPLOYED.has(f.status));
  const completedDeployedFeatures = features.filter((f) => COMPLETED_DEPLOYED.has(f.status));

  useEffect(() => {
    loadFeatures();
  }, []);

  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, [features]);

  useEffect(() => {
    const handler = () => { loadFeatures(); };
    window.addEventListener('jarvis-sync', handler);
    return () => window.removeEventListener('jarvis-sync', handler);
  }, []);

  async function loadFeatures() {
    const all = await getFeatureRequests();
    setFeatures(all.sort((a, b) => b.createdAt - a.createdAt));
  }

  function startPolling() {
    stopPolling();
    const nonTerminal = features.filter((f) => !TERMINAL.has(f.status));
    if (nonTerminal.length === 0) return;
    intervalRef.current = setInterval(() => {
      pollStatus(nonTerminal);
    }, 15000);
  }

  function stopPolling() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  async function pollStatus(items: FeatureRequest[]) {
    for (const item of items) {
      if (!item.branchName) continue;
      try {
        const res = await fetch(
          `/api/build-status?id=${item.id}&branchName=${item.branchName}`,
          adminFetchInit(),
        );
        if (!res.ok) continue;
        const data = (await res.json()) as {
          status: FeatureRequest['status'];
          buildStep: string | null;
          prNumber: number | null;
          prUrl: string | null;
          previewUrl: string | null;
        };
        const updated: FeatureRequest = {
          ...item,
          status: data.status,
          buildStep: data.buildStep ?? item.buildStep,
          prNumber: data.prNumber ?? item.prNumber,
          prUrl: data.prUrl ?? item.prUrl,
          previewUrl: data.previewUrl ?? item.previewUrl,
          updatedAt: Date.now(),
        };
        await saveFeatureRequest(updated);
      } catch {
        // ignore poll errors
      }
    }
    await loadFeatures();
  }

  async function handleRefreshStatus() {
    const nonTerminal = features.filter((f) => !TERMINAL.has(f.status));
    if (nonTerminal.length === 0) return;
    setRefreshing(true);
    await pollStatus(nonTerminal);
    setRefreshing(false);
  }

  async function handleSubmit() {
    const trimmed = draft.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    const id = crypto.randomUUID();
    const branchName = `feature/build-${id}`;
    const feature: FeatureRequest = {
      id,
      description: trimmed,
      status: 'pending',
      buildStep: 'Queued — waiting for GitHub Action',
      branchName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveFeatureRequest(feature);
    try {
      const res = await fetch(
        "/api/build-submit",
        adminFetchInit({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, description: trimmed }),
        }),
      );
      if (res.ok) {
        const dispatched: FeatureRequest = {
          ...feature,
          status: 'building',
          buildStep: 'Claude Code implementing feature…',
          updatedAt: Date.now(),
        };
        await saveFeatureRequest(dispatched);
        setDraft('');
        showToast('Feature queued');
      } else {
        showToast('Submit failed — check console');
      }
    } catch {
      showToast('Submit failed — network error');
    }
    setSubmitting(false);
    loadFeatures();
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function handleApprove(feature: FeatureRequest) {
    if (!feature.prNumber) return;
    setActionLoading((prev) => ({ ...prev, [`approve-${feature.id}`]: true }));
    try {
      await fetch(
        "/api/build-approve",
        adminFetchInit({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prNumber: feature.prNumber }),
        }),
      );
      const updated: FeatureRequest = {
        ...feature,
        status: 'approved',
        buildStep: 'Merged to main — production deploy pending',
        updatedAt: Date.now(),
      };
      await saveFeatureRequest(updated);
      loadFeatures();
    } finally {
      setActionLoading((prev) => ({ ...prev, [`approve-${feature.id}`]: false }));
    }
  }

  async function handleReject(feature: FeatureRequest) {
    if (!feature.prNumber) return;
    setActionLoading((prev) => ({ ...prev, [`reject-${feature.id}`]: true }));
    try {
      await fetch(
        "/api/build-reject",
        adminFetchInit({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prNumber: feature.prNumber }),
        }),
      );
      const updated: FeatureRequest = {
        ...feature,
        status: 'rejected',
        buildStep: 'PR closed without merging',
        updatedAt: Date.now(),
      };
      await saveFeatureRequest(updated);
      loadFeatures();
    } finally {
      setActionLoading((prev) => ({ ...prev, [`reject-${feature.id}`]: false }));
    }
  }

  return (
    <div className="flex flex-col h-full bg-black text-white">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-semibold">Builder</h1>
        <p className="text-xs text-gray-400 mt-1">Describe a feature — Claude Code will implement it</p>
      </div>

      {/* Submission form */}
      <div className="px-4 pb-3">
        <textarea
          className="w-full bg-gray-900 text-white text-sm rounded-xl px-3 py-2 resize-none outline-none border border-gray-700 focus:border-blue-500"
          rows={4}
          placeholder="Describe the feature you want to add…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={submitting}
        />
        <button
          onClick={handleSubmit}
          disabled={!draft.trim() || submitting}
          className="mt-2 w-full bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-xl py-2 min-h-[44px] active:scale-95 transition-transform"
        >
          {submitting ? 'Submitting…' : 'Submit Feature'}
        </button>
      </div>

      {/* Feature cards */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {features.some((f) => !TERMINAL.has(f.status)) && (
          <button
            type="button"
            onClick={handleRefreshStatus}
            disabled={refreshing}
            className="text-xs text-gray-400 hover:text-gray-300 disabled:opacity-50"
          >
            {refreshing ? 'Checking…' : 'Refresh status'}
          </button>
        )}
        {features.length === 0 && (
          <div className="text-center mt-8 px-4">
            <p className="text-gray-400 text-sm">No features queued yet</p>
            <p className="text-gray-600 text-xs mt-2">
              Describe a feature above and Claude Code will implement it in a GitHub Actions
              workflow, then open a PR for your review.
            </p>
          </div>
        )}

        {activeFeatures.map((feature) => (
          <div key={feature.id} className="bg-gray-900 rounded-xl px-4 py-3 space-y-2">
            {/* Description + status badge */}
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-white leading-snug line-clamp-2 flex-1">
                {feature.description}
              </p>
              <span
                className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[feature.status]}`}
              >
                {feature.status}
              </span>
            </div>

            {/* Current build step */}
            {feature.buildStep && (
              <p className="text-xs text-gray-400 leading-snug">{feature.buildStep}</p>
            )}

            {/* Pipeline progress indicator */}
            <PipelineProgress feature={feature} />

            {/* Timestamp */}
            <p className="text-xs text-gray-500">{timeAgo(feature.createdAt)}</p>

            {/* Actions when ready */}
            {feature.status === 'ready' && (
              <div className="space-y-2 pt-1">
                <div className="flex gap-2">
                  {feature.previewUrl && (
                    <a
                      href={feature.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center text-xs bg-gray-700 hover:bg-gray-600 text-white rounded-lg py-2 min-h-[36px] flex items-center justify-center"
                    >
                      {feature.prUrl && feature.previewUrl === feature.prUrl
                        ? 'View PR & deployment'
                        : 'Preview'}
                    </a>
                  )}
                  <button
                    onClick={() => handleApprove(feature)}
                    disabled={actionLoading[`approve-${feature.id}`]}
                    className="flex-1 text-xs bg-green-700 disabled:opacity-50 text-white rounded-lg py-2 min-h-[36px] active:scale-95 transition-transform"
                  >
                    {actionLoading[`approve-${feature.id}`] ? '…' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleReject(feature)}
                    disabled={actionLoading[`reject-${feature.id}`]}
                    className="flex-1 text-xs bg-red-700 disabled:opacity-50 text-white rounded-lg py-2 min-h-[36px] active:scale-95 transition-transform"
                  >
                    {actionLoading[`reject-${feature.id}`] ? '…' : 'Reject'}
                  </button>
                </div>
                {feature.prUrl && feature.previewUrl === feature.prUrl && (
                  <p className="text-xs text-gray-500">
                    Open the PR to get the Vercel preview link, then Approve to merge into main.
                  </p>
                )}
              </div>
            )}
          </div>
        ))}

        {completedDeployedFeatures.length > 0 && (
          <div className="pt-2 border-t border-gray-800">
            <button
              type="button"
              onClick={() => setShowCompletedDeployed((v) => !v)}
              className="flex items-center gap-2 w-full py-2 text-left text-gray-400 hover:text-gray-300 text-sm"
              aria-expanded={showCompletedDeployed}
            >
              <svg
                className={`w-4 h-4 transition-transform flex-shrink-0 ${showCompletedDeployed ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span>Completed & deployed ({completedDeployedFeatures.length})</span>
            </button>
            {showCompletedDeployed && (
              <div className="space-y-3 pt-1">
                {completedDeployedFeatures.map((feature) => (
                  <div key={feature.id} className="bg-gray-900 rounded-xl px-4 py-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-white leading-snug line-clamp-2 flex-1">
                        {feature.description}
                      </p>
                      <span
                        className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[feature.status]}`}
                      >
                        {feature.status}
                      </span>
                    </div>
                    {feature.buildStep && (
                      <p className="text-xs text-gray-400 leading-snug">{feature.buildStep}</p>
                    )}
                    <PipelineProgress feature={feature} />
                    <p className="text-xs text-gray-500">{timeAgo(feature.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-sm px-4 py-2 rounded-full shadow-lg pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  );
}