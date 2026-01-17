import { SeedingDashboard } from './SeedingDashboard';
import { LocationDataFix } from './LocationDataFix';
import { AddressEnrichmentUtility } from './AddressEnrichmentUtility';
import { AdminToolsSection } from './AdminToolsSection';
import { GoogleEnrichmentDashboard } from './GoogleEnrichmentDashboard';

const DataFixUtility = () => {
  return (
    <div className="space-y-6">
      {/* Top Row - Main Dashboards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column - Seeding Dashboard */}
        <SeedingDashboard />
        
        {/* Right Column - Google Enrichment Dashboard */}
        <GoogleEnrichmentDashboard />
      </div>
      
      {/* Bottom Row - Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AdminToolsSection />
        <LocationDataFix />
        <AddressEnrichmentUtility />
      </div>
    </div>
  );
};

export default DataFixUtility;
