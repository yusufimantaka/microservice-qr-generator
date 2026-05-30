"use client";

import { useEffect, useState } from "react";

interface HistoryRecord {
  user_id: string;
  input_text: string;
  fill_color: string;
  back_color: string;
  format: string;
  created_at: string;
}

interface HistoryResponse {
  records: HistoryRecord[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface Props {
  userId: string;
}

export default function HistoryList({ userId }: Props) {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/history?user_id=${encodeURIComponent(userId)}&page=${page}&limit=20`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((json) => { setData(json); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId, page]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        Loading…
      </div>
    );
  }

  if (!data || data.records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
        <p className="text-lg">No history yet</p>
        <p className="text-sm">Generate a QR code to see it here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-600">
              <th className="px-4 py-3 font-medium">Text</th>
              <th className="px-4 py-3 font-medium">Colors</th>
              <th className="px-4 py-3 font-medium">Format</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.records.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="max-w-xs truncate px-4 py-3 font-mono text-xs">
                  {r.input_text}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-5 w-5 rounded border border-gray-300"
                      style={{ backgroundColor: r.fill_color }}
                      title={`Foreground: ${r.fill_color}`}
                    />
                    <span
                      className="inline-block h-5 w-5 rounded border border-gray-300"
                      style={{ backgroundColor: r.back_color }}
                      title={`Background: ${r.back_color}`}
                    />
                  </div>
                </td>
                <td className="px-4 py-3 uppercase text-gray-500">{r.format}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {new Date(r.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">
          Page {data.page} of {data.pages} &middot; {data.total} total
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm disabled:opacity-40 hover:bg-gray-50"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= (data.pages ?? 1)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm disabled:opacity-40 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
