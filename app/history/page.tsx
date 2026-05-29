import HistoryList from "@/components/HistoryList";

export default function HistoryPage() {
  return (
    <main className="flex-1 flex items-start justify-center p-6 pt-12">
      <div className="w-full max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold">Generation History</h1>
        <p className="text-sm text-gray-500">
          Previously generated QR codes are automatically saved here.
        </p>
        <HistoryList />
      </div>
    </main>
  );
}
