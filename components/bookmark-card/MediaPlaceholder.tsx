import { ExternalLink, Play } from "lucide-react"

type Props = {
  mediaType: "pdf" | "video" | "generic"
}

export default function MediaPlaceholder({ mediaType }: Props) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#0e0e11] to-[#1a1a1f] relative overflow-hidden group-hover:from-purple-500/10 group-hover:to-indigo-500/10 transition-all duration-700">
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-purple-500/20 rounded-full blur-[60px]" />
      </div>

      {mediaType === "pdf" ? (
        <div className="relative z-10 flex flex-col items-center gap-4 w-full px-8">
          <div className="w-full aspect-[3/4] max-w-[80px] bg-white/[0.03] border border-white/10 rounded-lg p-3 flex flex-col gap-2.5 group-hover:border-purple-500/20 transition-all shadow-2xl">
            <div className="w-8 h-1.5 bg-purple-500/30 rounded-full mb-1" />
            <div className="flex flex-col gap-2 opacity-10">
              <div className="w-full h-1 bg-white rounded-full" />
              <div className="w-full h-8 bg-white/20 rounded-md" />
              <div className="w-3/4 h-1 bg-white rounded-full" />
            </div>
          </div>
          <span className="text-[10px] font-black tracking-[0.4em] uppercase text-white/10 group-hover:text-purple-400/40 transition-colors">Vault PDF</span>
        </div>
      ) : (
        <div className="relative z-10 flex flex-col items-center gap-5">
          {mediaType === "video" ? (
            <Play size={48} className="text-purple-400/20 fill-purple-400/5 transition-transform group-hover:scale-110 duration-700 ml-1" strokeWidth={1} />
          ) : (
            <ExternalLink size={38} className="text-white/5" strokeWidth={1} />
          )}
          <span className="text-[10px] font-black tracking-[0.4em] uppercase text-white/10 group-hover:text-purple-400/40 transition-colors">
            {mediaType === "video" ? "Video Stream" : "Digital Asset"}
          </span>
        </div>
      )}
    </div>
  )
}
