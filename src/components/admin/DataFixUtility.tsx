import { SeedingDashboard } from './SeedingDashboard';
import { LocationDataFix } from './LocationDataFix';
import { AddressEnrichmentUtility } from './AddressEnrichmentUtility';
import { AdminToolsSection } from './AdminToolsSection';

const DataFixUtility = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Left Column - Seeding Dashboard (main focus) */}
      <SeedingDashboard />
      
      {/* Right Column - Tools stacked */}
      <div className="space-y-4">
        <AdminToolsSection />
        <LocationDataFix />
        <AddressEnrichmentUtility />
      </div>
    </div>
  );
};

export default DataFixUtility;
