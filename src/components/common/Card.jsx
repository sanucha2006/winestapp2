export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-[#0f0f17] border border-white/[0.05] rounded-xl shadow-sm ${className}`}>
      {children}
    </div>
  )
}
