type Props = {
  category?: string
  isMedia: boolean
}

export default function CategoryBadge({ category, isMedia }: Props) {
  return (
    <span className="px-2.5 py-1 rounded-md bg-white/5 text-themeMuted text-xs font-semibold tracking-wide border border-white/10 group-hover:bg-purple-500/10 group-hover:text-purple-500 group-hover:border-purple-500/20 transition-all">
      {category || (isMedia ? "Media" : "URL")}
    </span>
  )
}
