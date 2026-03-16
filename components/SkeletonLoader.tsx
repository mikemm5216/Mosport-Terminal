export default function SkeletonLoader() {
  return (
    <div className="w-full bg-[#181A20] animate-pulse rounded-lg p-5 border border-gray-800 h-40 flex flex-col justify-between">
      <div className="space-y-3">
         <div className="h-6 bg-gray-800 rounded w-3/4"></div>
         <div className="h-3 bg-gray-800 rounded w-1/4"></div>
         <div className="h-6 bg-gray-800 rounded w-2/3"></div>
      </div>
      <div className="flex justify-between mt-4">
         <div className="h-4 bg-gray-800 rounded w-1/3"></div>
         <div className="h-4 bg-gray-800 rounded w-1/5"></div>
      </div>
    </div>
  )
}
