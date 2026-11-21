import { Link, useLocation } from "react-router-dom";
import { Compass } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <Compass className="h-6 w-6" />
      </div>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        We couldn't find <span className="break-all text-foreground">{location.pathname}</span>. It may have moved, or the
        link may be out of date.
      </p>
      <Link
        to="/"
        className="mt-2 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Back to dashboard
      </Link>
    </main>
  );
};

export default NotFound;
