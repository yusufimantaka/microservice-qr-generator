"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/generate", label: "Generator" },
  { href: "/history", label: "History" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-4 z-50 max-w-5xl mx-auto w-[calc(100%-2rem)] border border-gray-200 bg-white backdrop-blur-md rounded-full shadow-md px-6">
      <div className="flex h-16 items-center justify-between">
        <Link href="/" className="font-bold text-xl px-5 text-black">
          QR Generator
        </Link>
        <nav className="flex gap-1 px-5">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-black text-white"
                    : "text-black hover:bg-gray-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}