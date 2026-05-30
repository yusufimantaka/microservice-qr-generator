"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

interface BatchItem {
  id: string;
  text: string;
  fill_color: string;
  back_color: string;
}

interface BatchStatus {
  batch_id: string;
  status: string;
  total: number;
  completed: number;
  failed: number;
  in_progress: number;
  progress_pct: number;
  submitted_at: string;
  finished_at?: string;
}

function newItem(): BatchItem {
  return {
    id: crypto.randomUUID(),
    text: "",
    fill_color: "#000000",
    back_color: "#ffffff",
  };
}

export default function BatchPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<BatchItem[]>([newItem()]);
  const [bulkText, setBulkText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [batchStatus, setBatchStatus] = useState<BatchStatus | null>(null);
  const [error, setError] = useState("");
  const [pollingId, setPollingId] = useState<ReturnType<typeof setInterval> | null>(null);

  const addRow = () => setItems((p) => [...p, newItem()]);

  const removeRow = (id: string) =>
    setItems((p) => (p.length > 1 ? p.filter((r) => r.id !== id) : p));

  const updateRow = (id: string, field: keyof BatchItem, value: string) =>
    setItems((p) => p.map((r) => (r.id === id ? { ...r, [field]: value } : r)));

  const importBulk = () => {
    const lines = bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) return;
    setItems(lines.map((text) => ({ ...newItem(), text })));
    setBulkText("");
  };

  const pollStatus = (batchId: string) => {
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/batch/status/${batchId}`);
        const data: BatchStatus = await res.json();
        setBatchStatus(data);
        if (data.status === "completed" || data.status === "partial") {
          clearInterval(id);
          setPollingId(null);
        }
      } catch {
        clearInterval(id);
        setPollingId(null);
      }
    }, 2000);
    setPollingId(id);
  };

  const submit = async () => {
    const valid = items.filter((i) => i.text.trim());
    if (!valid.length) {
      setError("Add at least one URL or text before submitting.");
      return;
    }
    setError("");
    setSubmitting(true);
    setBatchStatus(null);
    if (pollingId) clearInterval(pollingId);

    try {
      const res = await fetch("/api/batch/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user?.user_id ?? "anonymous",
          items: valid.map(({ text, fill_color, back_color }) => ({
            text,
            fill_color,
            back_color,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Batch submission failed");
      setBatchStatus(data);
      pollStatus(data.batch_id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = async () => {
    if (!batchStatus) return;
    if (pollingId) { clearInterval(pollingId); setPollingId(null); }
    const res = await fetch(`/api/batch/status/${batchStatus.batch_id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    setBatchStatus((p) => (p ? { ...p, ...data } : null));
  };

  const statusColor = {
    queued: "text-yellow-400",
    completed: "text-green-400",
    partial: "text-orange-400",
    cancelled: "text-gray-400",
  }[batchStatus?.status ?? ""] ?? "text-blue-400";

  return (
    <main className="flex-1 flex flex-col items-center p-6 pt-12">
      <div className="w-full max-w-4xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Batch QR Generator</h1>
          <p className="text-gray-400 text-sm mt-1">
            Generate hundreds of QR codes at once via async Kafka workers.
            {!user && (
              <span className="text-yellow-500 ml-2">
                ⚠ Not logged in — results will be saved as &quot;anonymous&quot;.
              </span>
            )}
          </p>
        </div>

        {/* Bulk import */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
            Bulk Import
          </h2>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={"Paste one URL per line:\nhttps://example.com\nhttps://google.com\nhttps://github.com"}
            rows={4}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 font-mono focus:outline-none focus:border-gray-500 resize-none"
          />
          <button
            onClick={importBulk}
            disabled={!bulkText.trim()}
            className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-xl transition-colors disabled:opacity-40"
          >
            Import as rows
          </button>
        </div>

        {/* Row editor */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
              Items ({items.length})
            </h2>
            <button
              onClick={addRow}
              className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-colors"
            >
              + Add row
            </button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3"
              >
                <span className="text-gray-600 text-xs w-5 text-right shrink-0">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={item.text}
                  onChange={(e) => updateRow(item.id, "text", e.target.value)}
                  placeholder="https://example.com"
                  className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none"
                />
                <input
                  type="color"
                  value={item.fill_color}
                  onChange={(e) => updateRow(item.id, "fill_color", e.target.value)}
                  title="Foreground color"
                  className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
                />
                <input
                  type="color"
                  value={item.back_color}
                  onChange={(e) => updateRow(item.id, "back_color", e.target.value)}
                  title="Background color"
                  className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
                />
                <button
                  onClick={() => removeRow(item.id)}
                  className="text-gray-600 hover:text-red-400 transition-colors text-lg leading-none"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-950 border border-red-800 text-red-300 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <button
          onClick={submit}
          disabled={submitting}
          className="w-full bg-white text-black py-3 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          {submitting ? "Submitting…" : `Submit ${items.filter((i) => i.text.trim()).length} QR codes`}
        </button>

        {/* Batch status card */}
        {batchStatus && (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                Batch Status
              </h2>
              <span className={`text-sm font-semibold capitalize ${statusColor}`}>
                {batchStatus.status}
                {(batchStatus.status === "queued" || batchStatus.status === "processing") && (
                  <span className="ml-1 animate-pulse">…</span>
                )}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className="bg-white rounded-full h-2 transition-all duration-500"
                style={{ width: `${batchStatus.progress_pct}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { label: "Total", value: batchStatus.total, color: "text-white" },
                { label: "Done", value: batchStatus.completed, color: "text-green-400" },
                { label: "Failed", value: batchStatus.failed, color: "text-red-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-gray-800 rounded-xl py-3">
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            <div className="text-xs text-gray-500 font-mono">
              ID: {batchStatus.batch_id}
            </div>

            {(batchStatus.status === "queued" || batchStatus.status === "processing") && (
              <button
                onClick={cancel}
                className="text-xs text-red-400 hover:text-red-300 underline transition-colors"
              >
                Cancel batch
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
