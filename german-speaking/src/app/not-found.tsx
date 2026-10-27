import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-24 text-center space-y-4">
      <p className="text-5xl font-extrabold">404</p>
      <p className="de">Diese Seite gibt es leider nicht.</p>
      <Link href="/" className="btn btn-primary">
        الرئيسية · Home
      </Link>
    </div>
  );
}
