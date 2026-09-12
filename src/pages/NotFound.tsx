import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <main className="flex flex-col items-start gap-3" aria-labelledby="notfound-heading">
      <p className="text-sm font-medium uppercase tracking-widest text-[#e8a73e]" aria-hidden="true">
        404
      </p>
      <h1 id="notfound-heading" className="text-2xl font-semibold tracking-tight text-[#f3f1ec] sm:text-3xl">
        Page not found
      </h1>
      <p className="max-w-xl text-sm text-[#9aa1a6] sm:text-base">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <Link to="/" className="btn btn-primary mt-2">
        Go home
      </Link>
    </main>
  );
}
