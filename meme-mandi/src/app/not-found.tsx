import Link from "next/link";
export default function NotFound() {
  return (
    <div className="error-page">
      <h1>LOST THE PLOT?</h1>
      <p>This page isn't here. The good fits still are.</p>
      <Link href="/" className="button button-accent">
        Back to the store
      </Link>
    </div>
  );
}
