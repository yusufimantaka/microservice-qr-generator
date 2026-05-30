"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const publicLinks = [
  { href: "/", label: "Home" },
  { href: "/generate", label: "Generator" },
  { href: "/batch", label: "Batch" },
  { href: "/history", label: "History" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-4 z-50 max-w-5xl mx-auto w-[calc(100%-2rem)] border border-gray-200 bg-white backdrop-blur-md rounded-full shadow-md px-6">
      <div className="flex h-16 items-center justify-between">
        <Link href="/" className="font-bold text-xl px-5 text-black">
          QR Generator
        </Link>
        <nav className="flex gap-1 px-5 items-center">
          {publicLinks.map((link) => {
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
          {user ? (
            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-200">
              <span className="text-xs text-gray-500 hidden sm:block">
                {user.username}
              </span>
              <button
                onClick={logout}
                className="px-4 py-2 rounded-full text-sm font-medium text-black hover:bg-gray-100 transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              href="/auth"
              className={`ml-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                pathname === "/auth"
                  ? "bg-black text-white"
                  : "text-black hover:bg-gray-100"
              }`}
            >
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
