import './image-card.css';

interface ImageCardProps {
    id: string;
    date: string;
    thumbnail: string | null;
    coordinates: object;
}

const ImageCard = ({ id, date, thumbnail, coordinates }: ImageCardProps) => {
    const [day, month, year] = date.split('/');
    const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    const handleClickDescarga = async () => {
        try {
            const response = await fetch('/api/sentinel/coordinates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: 1,
                    coordinates: coordinates,
                    sampleType: 'FLOAT32',
                    start_date: formattedDate,
                    end_date: formattedDate,
                    resolution: 10,
                }),
            });

            if (!response.ok) {
                throw new Error(`Sentinel API error! status: ${response.status}`);
            }

            const data = await response.json();

            const responseBlob = await fetch(data['download_url'], {
                method: 'GET',
            });

            if (!responseBlob.ok) {
                throw new Error(`Sentinel API error! status: ${response.status}`);
            }

            alert('Imagen descargada correctamente');
        } catch (error) {
            console.error('Error al descargar la imagen:', error.message);
            console.log(JSON.stringify({
                    id: 1,
                    coordinates: coordinates,
                    sampleType: 'FLOAT32',
                    start_date: formattedDate,
                    end_date: formattedDate,
                    resolution: 10,
                }));
        }
    };

    return (
        <div className="image-card">
            <img className="thumbnail" src={thumbnail ?? '/icons/no-image.png'} alt={`Thumbnail ${id}`} />
            <div className="image-info">
                <h3>{id}</h3>
                <p>{date}</p>
                <div className="image-card-buttons">
                    <button className="analyze-button">
                        <img src="/icons/edit.png" alt="Editar" />
                    </button>
                    <button className="download-button" onClick={handleClickDescarga}>
                        <img src="/icons/download.png" alt="Descargar" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImageCard;
