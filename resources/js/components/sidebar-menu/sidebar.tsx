import { useState } from 'react';
import ImageCard from '../image-card/image-card';
import './sidebar.css';
import { useGeoData } from '../../hooks/geodata-context';

const Sidebar = () => {
    const [activeTab, setActiveTab] = useState('descarga');
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedName, setSelectedName] = useState("");
    const { geoJson, startDate, setStartDate, endDate, setEndDate } = useGeoData();


    const handleClickDescarga = () => {
        setActiveTab('descarga');
    };

    const handleClickAnalisis = () => {
        setActiveTab('analisis');
    };

    const handleClickBusqueda = () => {
        alert(`Buscando imágenes entre ${startDate} y ${endDate} con el poligono ${geoJson}`);
        setActiveTab('resultados');
    };
    
    const handleFileChange = (event) => {
      const file = event.target.files[0];
      setSelectedFile(file);
      setSelectedName(file.name);
      setActiveTab('analisis');
    };

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <h2>
                    Sistema de análisis de
                    <br />
                    imágenes satelitales
                </h2>
                <div className="icon-placeholder">🌱</div>
            </div>
            <div className="sidebar-content">
                <div className="tab-buttons">
                    <button className={activeTab != 'analisis' ? 'tab inactive' : 'tab active'} onClick={handleClickDescarga}>
                        Descarga
                    </button>
                    <button className={activeTab == 'analisis' ? 'tab inactive' : 'tab active'} onClick={handleClickAnalisis}>
                        Análisis
                    </button>
                </div>
                {activeTab == 'descarga' ? (
                    <div className="sidebar-content">
                        <div className="checkbox-group">
                            <label>
                                <input type="checkbox" defaultChecked />
                                <span>Sentinel</span>
                            </label>
                            <label>
                                <input type="checkbox" defaultChecked />
                                <span>Planet Scope</span>
                            </label>
                        </div>

                        <div className="time-range">
                            <h4>RANGO TEMPORAL:</h4>
                            <div className="time-input">
                                <label>Desde:</label>
                                <div className="input-group">
                                    <input type="date" defaultValue="2025-03-02" onChange={(e) => setStartDate(e.target.value)}/>
                                    <input type="time" defaultValue={'12:00'} />
                                </div>
                            </div>
                            <div className="time-input">
                                <label>Hasta:</label>
                                <div className="input-group">
                                    <input type="date" defaultValue="2025-04-02" onChange={(e) => setEndDate(e.target.value)}/>
                                    <input type="time" defaultValue={'12:00'} />
                                </div>
                            </div>
                        </div>

                        <button className="search-button" onClick={handleClickBusqueda}>
                            Buscar
                        </button>

                        <div className="file-upload">
                            <h3>{selectedName || "Subir imagen"}</h3>
                            <img src="/icons/upload.png" alt="upload" />
                            <input type="file" onChange={handleFileChange} />
                        </div>
                    </div>
                ) : null}
                {activeTab == 'resultados' ? (
                    <div className="sidebar-content">
                        <button className="search-button" onClick={handleClickDescarga}>
                            Hacer otra búsqueda
                        </button>
                        <ImageCard id="S2B_MSIL2AS2B_MS" date="30/04/2025" />
                        <ImageCard id="S2B_MSIL2AS2B_MS" date="30/04/2025" />
                        <ImageCard id="S2B_MSIL2AS2B_MS" date="30/04/2025" />
                        <ImageCard id="S2B_MSIL2AS2B_MS" date="30/04/2025" />
                    </div>
                ) : null}
                {activeTab == 'analisis' ? (
                    <div className="sidebar-content">
                        <div className="checkbox-group analisis">
                            <label>
                                <input type="checkbox" defaultChecked />
                                <span>Recorte de imagen</span>
                            </label>
                            <label>
                                <input type="checkbox" defaultChecked />
                                <span>Cálculo de NDVI</span>
                            </label>
                            <label>
                                <input type="checkbox" defaultChecked />
                                <span>Renderizador pseudocolor</span>
                            </label>
                        </div>
                        <button className="search-button">Generar mapa</button>
                        <hr></hr>
                        <button className="search-button">⬇️ Guardar imagen</button>
                        <button className="search-button">NDVI en formato tabla</button>
                    </div>
                ) : null}
                ;
            </div>
        </div>
    );
};

export default Sidebar;
