import '../../css/browser.css';
import Sidebar from "@/components/sidebar-menu/sidebar";
import Map from "@/components/map/map";
import { GeoDataProvider } from '@/hooks/geodata-context';

export default function Main() {
    return (
    <GeoDataProvider>
      <Sidebar>
      </Sidebar>
      <Map>
      </Map>
    </GeoDataProvider>
    );
}