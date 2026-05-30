import Link from "next/link";
import Card from "@/components/Card";

const features = [
  {
    title: "Instant Generation",
    description:
      "Generate QR codes in milliseconds with caching. Repeated codes return instantly without reprocessing.",
  },
  {
    title: "Customizable Colors",
    description:
      "Customize foreground and background colors to match your brand identity.",
  },
  {
    title: "Batch Processing",
    description:
      "Generate thousands of QR codes at once via async worker processing with Kafka message queues.",
  },
  {
    title: "Auto-Saved History",
    description:
      "Every QR you generate is automatically saved. Browse your history anytime.",
  },
  {
    title: "ISO/IEC 18004 Compliant",
    description:
      "All QR codes follow international standards, guaranteed scannable by any standard reader.",
  },
  {
    title: "Scalable Architecture",
    description:
      "Horizontal scaling via Docker containers. Redis caching, MongoDB storage, and message-driven workers.",
  },
];

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center p-6 pt-12 gap-12">
      <section className="flex flex-col items-center gap-4 text-center max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight">
          Microservice QR Generator
        </h1>
        <p className="text-lg text-gray-500">
          A scalable, containerized QR code generation platform powered by
          microservices, Redis caching, Kafka messaging, and MongoDB.
        </p>
        <Link
          href="/generate"
          className="mt-2 rounded-full bg-black px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          Generate a QR Code
        </Link>
      </section>

      <section className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-4">
        {features.map((f) => (
          <Card key={f.title} title={f.title} description={f.description} />
        ))}
      </section>
    </main>
  );
}
