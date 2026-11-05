// Google Maps styling; Apple Maps uses userInterfaceStyle on the map view.
export const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#202936' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#17202c' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#bac7d8' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#101e30' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#3b4657' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#243c35' }] },
];
