export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20">
      <h1 className="text-4xl font-bold">Badminton Club Platform</h1>
      <p className="text-lg text-muted-foreground">
        Manage your badminton club, schedule events, and track registrations
      </p>
      <a
        href="/api/auth/login/line"
        className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Get Started with LINE Login
      </a>
    </div>
  );
}
