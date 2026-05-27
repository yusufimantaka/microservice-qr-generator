// components/navbar.tsx
export default function Navbar() {
  return (
    <header className="sticky top-4 z-50 max-w-5xl mx-auto w-[calc(100%-2rem)] border border-gray-200 bg-white/80 backdrop-blur-md rounded-full shadow-md px-6">
      <div className="flex h-16 items-center justify-between">
        <div className="font-bold text-xl px-5">QR Generator</div>
        <nav className="flex gap-6 px-5">
          <p>Home</p>
          <p>Generator</p>
        </nav>
      </div>
    </header>
  );
}