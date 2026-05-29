export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background kr-dot-grid flex flex-col">
      {/* Top glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px]"
        style={{
          background:
            "radial-gradient(ellipse at center top, rgba(232,168,53,0.07) 0%, transparent 70%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
        {children}
      </div>
    </div>
  );
}
