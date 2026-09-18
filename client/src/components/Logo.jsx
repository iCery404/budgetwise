export default function Logo({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <rect x="8" y="24" width="48" height="30" rx="7" fill="#B5D0AD" />
      <rect x="12" y="28" width="40" height="22" rx="4" fill="#C8DEC2" opacity="0.45" />
      <circle cx="46" cy="39" r="3.5" fill="#2F3D36" />
      <circle cx="46" cy="39" r="1.5" fill="#B5D0AD" />
      <path
        d="M16 24V20c0-4.4 3.6-8 8-8h16c4.4 0 8 3.6 8 8v4"
        stroke="#B5D0AD"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <ellipse cx="22" cy="12" rx="9" ry="5.5" transform="rotate(-35 22 12)" fill="#6FAF6C" />
      <path d="M16 15c3-3.5 7-5.5 11-6" stroke="#4E8F4C" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
