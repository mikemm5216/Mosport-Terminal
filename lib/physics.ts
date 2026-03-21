import { VENUE_COORDS } from './venues';

export const PhysicsEngine = {
  haversineDistance: (venueA: string, venueB: string): number => {
    const coordsA = VENUE_COORDS[venueA];
    const coordsB = VENUE_COORDS[venueB];
    
    if (!coordsA || !coordsB) return 0; // Fallback to 0 km if unknown
    
    const R = 6371; // Earth radius in km
    const dLat = (coordsB.lat - coordsA.lat) * Math.PI / 180;
    const dLng = (coordsB.lng - coordsA.lng) * Math.PI / 180;
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(coordsA.lat * Math.PI / 180) * Math.cos(coordsB.lat * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
      
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  },

  getFatigueScore: (daysRest: number, travelKm: number): number => {
    // Math.min(1.0, (1 / (daysRest + 0.5)) * Math.log10(travelKm + 10) / 2)
    const effectiveRest = Math.max(0, daysRest); // ensure non-negative
    return Math.min(1.0, (1 / (effectiveRest + 0.5)) * Math.log10(travelKm + 10) / 2);
  }
};
