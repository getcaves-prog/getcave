export interface MexicanState {
  name: string;
  abbreviation: string;
  lat: number;
  lng: number;
}

export const MEXICAN_STATES: MexicanState[] = [
  { name: "Aguascalientes", abbreviation: "AGS", lat: 21.8818, lng: -102.2916 },
  { name: "Baja California", abbreviation: "BC", lat: 30.8406, lng: -115.2838 },
  { name: "Baja California Sur", abbreviation: "BCS", lat: 24.1426, lng: -110.3128 },
  { name: "Campeche", abbreviation: "CAM", lat: 19.8301, lng: -90.5349 },
  { name: "Chiapas", abbreviation: "CHIS", lat: 16.7569, lng: -93.1292 },
  { name: "Chihuahua", abbreviation: "CHIH", lat: 28.6353, lng: -106.0889 },
  { name: "Ciudad de México", abbreviation: "CDMX", lat: 19.4326, lng: -99.1332 },
  { name: "Coahuila", abbreviation: "COAH", lat: 25.4232, lng: -100.9924 },
  { name: "Colima", abbreviation: "COL", lat: 19.2452, lng: -103.7241 },
  { name: "Durango", abbreviation: "DGO", lat: 24.0277, lng: -104.6532 },
  { name: "Estado de México", abbreviation: "EDOMEX", lat: 19.4969, lng: -99.7233 },
  { name: "Guanajuato", abbreviation: "GTO", lat: 21.019, lng: -101.2574 },
  { name: "Guerrero", abbreviation: "GRO", lat: 17.4392, lng: -99.5451 },
  { name: "Hidalgo", abbreviation: "HGO", lat: 20.0911, lng: -98.7624 },
  { name: "Jalisco", abbreviation: "JAL", lat: 20.6597, lng: -103.3496 },
  { name: "Michoacán", abbreviation: "MICH", lat: 19.5665, lng: -101.7068 },
  { name: "Morelos", abbreviation: "MOR", lat: 18.6813, lng: -99.1013 },
  { name: "Nayarit", abbreviation: "NAY", lat: 21.7514, lng: -104.8455 },
  { name: "Nuevo León", abbreviation: "NL", lat: 25.6866, lng: -100.3161 },
  { name: "Oaxaca", abbreviation: "OAX", lat: 17.0732, lng: -96.7266 },
  { name: "Puebla", abbreviation: "PUE", lat: 19.0414, lng: -98.2063 },
  { name: "Querétaro", abbreviation: "QRO", lat: 20.5888, lng: -100.3899 },
  { name: "Quintana Roo", abbreviation: "QROO", lat: 21.1619, lng: -86.8515 },
  { name: "San Luis Potosí", abbreviation: "SLP", lat: 22.1565, lng: -100.9855 },
  { name: "Sinaloa", abbreviation: "SIN", lat: 24.8091, lng: -107.394 },
  { name: "Sonora", abbreviation: "SON", lat: 29.0729, lng: -110.9559 },
  { name: "Tabasco", abbreviation: "TAB", lat: 17.9869, lng: -92.9303 },
  { name: "Tamaulipas", abbreviation: "TAMS", lat: 24.2669, lng: -98.8363 },
  { name: "Tlaxcala", abbreviation: "TLAX", lat: 19.3182, lng: -98.2375 },
  { name: "Veracruz", abbreviation: "VER", lat: 19.1738, lng: -96.1342 },
  { name: "Yucatán", abbreviation: "YUC", lat: 20.9674, lng: -89.6237 },
  { name: "Zacatecas", abbreviation: "ZAC", lat: 22.7709, lng: -102.5832 },
];
