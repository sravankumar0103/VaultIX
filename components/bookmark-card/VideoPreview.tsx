"use client"

import { Play } from "lucide-react"

type Props = {
  src: string
}

export default function VideoPreview({ src }: Props) {
  return (
    <div className="w-full h-full relative overflow-hidden flex items-center justify-center bg-black">
      <video src={`${src}#t=0.1`} muted playsInline className="w-full h-full object-cover" onLoadedMetadata={(e) => { (e.target as HTMLVideoElement).currentTime = 0.1 }} />
      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Play size={32} className="text-white/80" />
      </div>
    </div>
  )
}
