
const TravelStats = () => {
  const travelStats = [
    { label: 'Countries', value: '24', icon: '✈️' },
    { label: 'Cities', value: '87', icon: '📍' },
    { label: 'Places', value: '156', icon: '🔍' },
  ];

  return (
    <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-xl mx-4">
      {travelStats.map((stat, index) => (
        <div key={index} className="text-center">
          <div className="text-2xl mb-1">{stat.icon}</div>
          <div className="text-lg font-bold text-gray-900">{stat.value}</div>
          <div className="text-xs text-gray-600">{stat.label}</div>
        </div>
      ))}
    </div>
  );
};

export default TravelStats;
