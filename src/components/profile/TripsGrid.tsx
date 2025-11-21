import { Plus, MapPin, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';
import CreateTripModal from './CreateTripModal';
import { useTranslation } from 'react-i18next';
import tripsEmptyImage from '@/assets/trips-empty-state.png';
import { useTrips } from '@/hooks/useTrips';
import TripDetailModal from './TripDetailModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const TripsGrid = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [editingTrip, setEditingTrip] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const { t } = useTranslation('trips');
  const { trips, isLoading, createTrip, updateTrip, deleteTrip } = useTrips();

  const handleCreateTrip = async (tripData: any) => {
    await createTrip(tripData);
    setShowCreateModal(false);
  };

  const handleEditTrip = (trip: any) => {
    setEditingTrip(trip);
    setEditName(trip.name);
    setEditDescription(trip.description || '');
  };

  const handleSaveEdit = async () => {
    if (editingTrip) {
      await updateTrip(editingTrip.id, {
        name: editName,
        description: editDescription
      });
      setEditingTrip(null);
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    if (confirm(t('confirmDelete', 'Are you sure you want to delete this list?'))) {
      await deleteTrip(tripId);
    }
  };

  if (isLoading) {
    return (
      <div className="px-4 pt-6 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-[25px]">
      {trips.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <div className="flex flex-col gap-3 w-full max-w-xs mb-8">
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              {t('createButton')}
            </button>
          </div>
          
          <div className="mb-6 relative w-full max-w-xs aspect-[4/3]">
            <img 
              src={tripsEmptyImage} 
              alt="Travel group"
              className="w-full h-full object-contain"
            />
          </div>
          
          <p className="text-foreground text-base font-medium max-w-xs">
            {t('planWithFriends')}
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <Button
              onClick={() => setShowCreateModal(true)}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('createButton')}
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-3 pb-4">
            {trips.map((trip) => (
              <div
                key={trip.id}
                className="relative bg-card rounded-xl overflow-hidden shadow-sm border border-border cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedTrip(trip)}
              >
                {trip.cover_image_url ? (
                  <div className="aspect-square bg-muted">
                    <img
                      src={trip.cover_image_url}
                      alt={trip.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-square bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <MapPin className="w-12 h-12 text-primary/40" />
                  </div>
                )}
                
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-foreground truncate">
                        {trip.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {trip.trip_locations?.length || 0} places
                      </p>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleEditTrip(trip);
                        }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTrip(trip.id);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <CreateTripModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateTrip={handleCreateTrip}
      />

      {selectedTrip && (
        <TripDetailModal
          trip={selectedTrip}
          isOpen={!!selectedTrip}
          onClose={() => setSelectedTrip(null)}
        />
      )}

      <Dialog open={!!editingTrip} onOpenChange={(open) => !open && setEditingTrip(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit List</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="List name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTrip(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TripsGrid;
