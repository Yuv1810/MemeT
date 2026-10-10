"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="error-page">
      <h1>A SMALL PLOT TWIST.</h1>
      <p>We couldn't load this page. Give it another try.</p>
      <button className="button button-accent" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
