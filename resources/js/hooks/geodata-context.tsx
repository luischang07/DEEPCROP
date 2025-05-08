import { createContext, useContext, useState } from 'react';

type GeoJsonType = {
  type: string;
  features: Array<{
    type: string;
    properties: Record<string, object>;
  }>;
  geometry: {
    type: string;
    coordinates: number[];
  };
};

type GeoDataContextType = {
  geoJson: GeoJsonType | null;
  setGeoJson: (geo: GeoJsonType) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  tiffBuffer: ArrayBuffer | null;
  setTiffBuffer: (buffer: ArrayBuffer) => void;
};

const GeoDataContext = createContext<GeoDataContextType | undefined>(undefined);

export const GeoDataProvider = ({ children }: { children: React.ReactNode }) => {
  const [geoJson, setGeoJson] = useState<GeoJsonType | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [tiffBuffer, setTiffBuffer] = useState<ArrayBuffer | null>(null);


  return (
    <GeoDataContext.Provider value={{ geoJson, setGeoJson, startDate, setStartDate, endDate, setEndDate, tiffBuffer, setTiffBuffer }}>
      {children}
    </GeoDataContext.Provider>
  );
};

export const useGeoData = () => {
  const context = useContext(GeoDataContext);
  if (!context) throw new Error('useGeoData must be used within GeoDataProvider');
  return context;
};
