type Props = {
  level: "Critical" | "High" | "Medium" | "Low" | "Vaulted"
}

export default function ImportanceBadge({ level }: Props) {
  const colorMap = {
    Critical: "bg-red-600",
    High: "bg-orange-500",
    Medium: "bg-yellow-500 text-black",
    Low: "bg-blue-500",
    Vaulted: "bg-purple-500",
  }

  return (
    <span
      className={`text-xs px-2 py-1 rounded-full font-medium ${colorMap[level]}`}
    >
      {level}
    </span>
  )
}
