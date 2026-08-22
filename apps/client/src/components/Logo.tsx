export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="45" y="51" width="135" height="96" rx="18" fill="var(--sidebar)" stroke="currentColor" strokeWidth="3.5" />
      <rect x="57" y="72" width="135" height="96" rx="18" fill="var(--sidebar)" stroke="currentColor" strokeWidth="3.5" />
      <rect x="69" y="93" width="135" height="96" rx="18" fill="var(--sidebar)" stroke="currentColor" strokeWidth="4.5" />
      <rect x="87" y="117" width="90" height="9" rx="4.5" fill="currentColor" />
      <rect x="87" y="141" width="75" height="9" rx="4.5" fill="currentColor" />
      <rect x="87" y="165" width="60" height="9" rx="4.5" fill="currentColor" />
      <circle cx="185" cy="170" r="26" fill="currentColor" />
      <path d="M175 153 L175 187 L205 170 Z" fill="var(--sidebar)" />
    </svg>
  )
}
