"use client";

import { useAuth } from "@/context/AuthContext";
import HistoryList from "@/components/HistoryList";
import Link from "next/link";

export default function HistoryPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <p className="text-gray-400">You need to be logged in to view your history.</p>
          <Link
            href="/auth"
            className="inline-block bg-white text-black px-6 py-2.5 rounded-full text-sm font-medium hover:bg-gray-100 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex items-start justify-center p-6 pt-12">
      <div className="w-full max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Generation History</h1>
          <p className="text-sm text-gray-500 mt-1">
            Showing history for <span className="text-gray-300">{user.username}</span>.
          </p>
        </div>
        <HistoryList userId={user.user_id} />
      </div>
    </main>
  );
}
