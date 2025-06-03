
const Achievements = () => {
  const achievements = [
    { name: 'Top Reviewer', level: 3, icon: '⭐', color: 'bg-yellow-100 border-yellow-200' },
    { name: 'Foodie', level: 2, icon: '🍽️', color: 'bg-orange-100 border-orange-200' },
    { name: 'Explorer', level: 4, icon: '🧭', color: 'bg-green-100 border-green-200' },
  ];

  return (
    <div className="px-4 py-4 bg-white border-b border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Achievements</h2>
        <span className="text-sm text-blue-600 font-medium">View All</span>
      </div>
      
      <div className="flex gap-4">
        {achievements.map((achievement, index) => (
          <div key={index} className={`flex flex-col items-center p-3 rounded-xl border-2 ${achievement.color} min-w-[80px]`}>
            <div className="text-2xl mb-1 relative">
              {achievement.icon}
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center">
                <span className="text-xs font-bold">{achievement.level}</span>
              </div>
            </div>
            <span className="text-xs font-medium text-gray-700 text-center leading-tight">
              {achievement.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Achievements;
