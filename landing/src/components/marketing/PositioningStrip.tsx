const ITEMS = ['Actual speech analysis', 'Indic language review', 'Reproducible voice defects', 'Regression verification']

export default function PositioningStrip() {
  return (
    <section aria-label="Product positioning" className="border-y border-line">
      <div className="wrap">
        <ul className="grid grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((t, i) => (
            <li
              key={t}
              className={`flex items-baseline gap-4 px-0 py-7 lg:px-8 ${
                i > 0 ? 'lg:border-l lg:border-line' : 'lg:pl-0'
              } ${i % 2 === 1 ? 'border-l border-line pl-5 lg:pl-8' : ''}`}
            >
              <span className="font-mono text-[11px] text-mute">0{i + 1}</span>
              <span className="text-[12px] font-medium uppercase leading-snug tracking-[0.16em]">{t}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
