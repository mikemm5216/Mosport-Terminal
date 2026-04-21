export default function LeagueDashboard() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">League Dashboard</h1>
      <p className="text-gray-400">Aggregate league statistics and macro momentum will be tracked here in V4.1</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
         <div className="h-64 border border-gray-800 bg-[#181A20] rounded flex items-center justify-center text-gray-600 text-sm">
            [ League Pace Index ]
         </div>
         <div className="h-64 border border-gray-800 bg-[#181A20] rounded flex items-center justify-center text-gray-600 text-sm">
            [ Home Advantage Baseline Matrix ]
         </div>
      </div>
    </div>
  )
}
