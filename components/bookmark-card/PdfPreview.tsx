type Props = {
  src: string
}

export default function PdfPreview({ src }: Props) {
  return (
    <div className="w-full h-full relative overflow-hidden flex items-center justify-center bg-white pointer-events-none">
      <iframe
        src={`${src}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
        className="absolute top-0 left-0 w-[400%] h-[400%] origin-top-left border-0"
        style={{ transform: "scale(0.25)" }}
        tabIndex={-1}
      />
      <div className="absolute inset-0 bg-transparent z-10" />
    </div>
  )
}
