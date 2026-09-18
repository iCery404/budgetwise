export default function LeafScatter({ className = "" }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <svg className="absolute -top-6 -left-8 opacity-40" width="140" height="140" viewBox="0 0 100 100" fill="none">
        <path d="M50 10c-22 8-34 28-24 52 20 4 38-8 42-30 2-10 -2-18-18-22z" fill="#8FBF9E" />
        <path d="M28 58C40 40 46 26 50 12" stroke="#5C8A6C" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
      <svg className="absolute top-10 -right-10 opacity-30 rotate-45" width="160" height="160" viewBox="0 0 100 100" fill="none">
        <path d="M50 10c-22 8-34 28-24 52 20 4 38-8 42-30 2-10 -2-18-18-22z" fill="#D9B27C" />
        <path d="M28 58C40 40 46 26 50 12" stroke="#B98F52" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
      <svg className="absolute bottom-4 left-1/4 opacity-25 -rotate-12" width="110" height="110" viewBox="0 0 100 100" fill="none">
        <path d="M50 10c-22 8-34 28-24 52 20 4 38-8 42-30 2-10 -2-18-18-22z" fill="#C67B62" />
      </svg>
      <svg className="absolute -bottom-8 right-8 opacity-30 rotate-[110deg]" width="150" height="150" viewBox="0 0 100 100" fill="none">
        <path d="M50 10c-22 8-34 28-24 52 20 4 38-8 42-30 2-10 -2-18-18-22z" fill="#8FBF9E" />
      </svg>
    </div>
  );
}
