import './image-card.css';

interface ImageCardProps {
    id: string;
    date: string;
    thumbnail: string;
}

const ImageCard = ({ id, date, thumbnail }: ImageCardProps) => {
    return (
        <div className="image-card">
            <img className="thumbnail" src={`${thumbnail}`} alt={`Thumbnail ${id}`} />
            <div className="image-info">
                <h3>{id}</h3>
                <p>{date}</p>
                <div className="image-card-buttons">
                    <button className="analyze-button">
                        <img src="/icons/edit.png" />
                    </button>
                    <button className="download-button">
                        <img src="/icons/download.png" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImageCard;
