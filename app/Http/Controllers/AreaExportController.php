<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Intervention\Image\ImageManagerStatic as Image;

class AreaExportController extends Controller
{
    public function exportArea(Request $request)
    {
        $request->validate([
            'geometry' => 'required|array',
            'coordinates' => 'required|array',
            'format' => 'required|in:tiff,jpg,png',
            'bounds' => 'required|array',
            'zoom' => 'integer|min:1|max:20',
            'center' => 'required|array'
        ]);

        try {
            $geometry = $request->input('geometry');
            $coordinates = $request->input('coordinates');
            $format = $request->input('format');
            $bounds = $request->input('bounds');
            $zoom = $request->input('zoom', 10);
            $center = $request->input('center');

            // Calcular dimensiones del área
            $width = 1024;  // Ancho por defecto
            $height = 768;  // Alto por defecto

            // Crear imagen base (simulación - aquí iría la lógica real de captura de tiles)
            $image = $this->createMapImage($bounds, $zoom, $width, $height);

            // Dibujar el área seleccionada sobre la imagen
            $this->drawSelectedArea($image, $coordinates, $bounds, $width, $height);

            // Preparar metadatos con coordenadas
            $metadata = [
                'coordinates' => $coordinates,
                'bounds' => $bounds,
                'zoom' => $zoom,
                'center' => $center,
                'geometry' => $geometry,
                'export_date' => date('Y-m-d H:i:s'),
                'area_type' => 'selected_region',
                'crs' => 'EPSG:4326' // Sistema de coordenadas WGS84
            ];

            // Convertir al formato solicitado con metadatos
            $outputImage = $this->convertToFormatWithMetadata($image, $format, $metadata);

            // Configurar headers para descarga
            $filename = 'area_export_' . date('Y-m-d_H-i-s') . '.' . $format;
            
            return response($outputImage)
                ->header('Content-Type', $this->getMimeType($format))
                ->header('Content-Disposition', 'attachment; filename="' . $filename . '"')
                ->header('Content-Length', strlen($outputImage));

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Error al exportar el área: ' . $e->getMessage()
            ], 500);
        }
    }

    private function createMapImage($bounds, $zoom, $width, $height)
    {
        // Crear imagen base con color de fondo de mapa
        $image = imagecreatetruecolor($width, $height);
        $backgroundColor = imagecolorallocate($image, 240, 248, 255); // Alice blue
        imagefill($image, 0, 0, $backgroundColor);

        // Aquí iría la lógica para obtener tiles de OpenStreetMap o similar
        // Por ahora, creamos un fondo simple con grid
        $gridColor = imagecolorallocate($image, 200, 200, 200);
        
        // Dibujar grid simple
        for ($x = 0; $x < $width; $x += 50) {
            imageline($image, $x, 0, $x, $height, $gridColor);
        }
        for ($y = 0; $y < $height; $y += 50) {
            imageline($image, 0, $y, $width, $y, $gridColor);
        }

        // Agregar texto indicativo
        $textColor = imagecolorallocate($image, 100, 100, 100);
        $text = "Área exportada - Zoom: $zoom";
        imagestring($image, 3, 10, 10, $text, $textColor);

        return $image;
    }

    private function drawSelectedArea($image, $coordinates, $bounds, $width, $height)
    {
        if (count($coordinates) < 3) return;

        // Convertir coordenadas geográficas a píxeles
        $pixelCoords = [];
        foreach ($coordinates as $coord) {
            $x = $this->longitudeToPixel($coord[1], $bounds['west'], $bounds['east'], $width);
            $y = $this->latitudeToPixel($coord[0], $bounds['north'], $bounds['south'], $height);
            $pixelCoords[] = [$x, $y];
        }

        // Dibujar el polígono
        $points = [];
        foreach ($pixelCoords as $coord) {
            $points[] = $coord[0]; // x
            $points[] = $coord[1]; // y
        }

        // Crear colores para el área
        $fillColor = imagecolorallocatealpha($image, 151, 0, 156, 90); // Color de relleno semi-transparente
        $strokeColor = imagecolorallocate($image, 151, 0, 156); // Color del borde

        // Dibujar polígono relleno
        imagefilledpolygon($image, $points, count($pixelCoords), $fillColor);
        
        // Dibujar borde del polígono
        imagepolygon($image, $points, count($pixelCoords), $strokeColor);

        // Dibujar puntos de los vértices
        foreach ($pixelCoords as $coord) {
            imagefilledellipse($image, $coord[0], $coord[1], 8, 8, $strokeColor);
        }
    }

    private function longitudeToPixel($longitude, $west, $east, $width)
    {
        return (int)(($longitude - $west) / ($east - $west) * $width);
    }

    private function latitudeToPixel($latitude, $north, $south, $height)
    {
        return (int)(($north - $latitude) / ($north - $south) * $height);
    }

    private function convertToFormatWithMetadata($gdImage, $format, $metadata)
    {
        switch ($format) {
            case 'png':
                return $this->createPNGWithMetadata($gdImage, $metadata);
            case 'jpg':
                return $this->createJPEGWithMetadata($gdImage, $metadata);
            case 'tiff':
                // Para TIFF, usaremos PNG con metadatos como fallback
                return $this->createTIFFWithMetadata($gdImage, $metadata);
            default:
                return $this->createPNGWithMetadata($gdImage, $metadata);
        }
    }

    private function createPNGWithMetadata($gdImage, $metadata)
    {
        // Crear archivo temporal
        $tempFile = tempnam(sys_get_temp_dir(), 'png_with_metadata_');
        
        // Guardar imagen como PNG
        imagepng($gdImage, $tempFile);
        
        // Leer el archivo PNG
        $pngData = file_get_contents($tempFile);
        
        // Agregar metadatos como chunks personalizados de PNG
        $metadataJson = json_encode($metadata);
        $metadataChunk = $this->createPNGTextChunk('DEEPCROP_META', $metadataJson);
        
        // Insertar el chunk antes del IEND
        $iendPos = strrpos($pngData, 'IEND');
        if ($iendPos !== false) {
            $iendPos -= 4; // Retroceder para incluir la longitud del chunk IEND
            $pngData = substr($pngData, 0, $iendPos) . $metadataChunk . substr($pngData, $iendPos);
        }
        
        unlink($tempFile);
        return $pngData;
    }
    
    private function createJPEGWithMetadata($gdImage, $metadata)
    {
        // Para JPEG, guardamos metadatos en comentarios EXIF
        $tempFile = tempnam(sys_get_temp_dir(), 'jpeg_with_metadata_');
        
        // Guardar imagen como JPEG
        imagejpeg($gdImage, $tempFile, 90);
        
        $jpegData = file_get_contents($tempFile);
        
        // Agregar metadatos como comentario en el archivo JPEG
        $metadataJson = json_encode($metadata);
        $comment = "DEEPCROP_META:" . $metadataJson;
        
        // Insertar comentario después del marcador SOI (Start of Image)
        if (substr($jpegData, 0, 2) === "\xFF\xD8") {
            $commentChunk = "\xFF\xFE" . pack('n', strlen($comment) + 2) . $comment;
            $jpegData = "\xFF\xD8" . $commentChunk . substr($jpegData, 2);
        }
        
        unlink($tempFile);
        return $jpegData;
    }
    
    private function createTIFFWithMetadata($gdImage, $metadata)
    {
        $tempPngFile = tempnam(sys_get_temp_dir(), 'tiff_temp_png_');
        $tempTiffFile = tempnam(sys_get_temp_dir(), 'tiff_with_metadata_') . '.tiff';
        
        try {
            // Guardar como PNG temporal
            imagepng($gdImage, $tempPngFile);
            
            // Usar ImageMagick CLI para convertir PNG a TIFF
            $convertCommand = sprintf('convert "%s" "%s"', $tempPngFile, $tempTiffFile);
            exec($convertCommand, $output, $returnCode);
            
            if ($returnCode === 0 && file_exists($tempTiffFile)) {
                // Ahora agregar metadatos con exiftool
                $metadataJson = json_encode($metadata);
                
                // Escapar caracteres especiales para el shell
                $escapedMetadata = escapeshellarg($metadataJson);
                
                $metadataCommand = sprintf(
                    'exiftool -overwrite_original -ImageDescription=%s -Software="DEEPCROP v1.0" "%s"',
                    $escapedMetadata,
                    $tempTiffFile
                );
                
                exec($metadataCommand, $metaOutput, $metaReturnCode);
                
                // Leer el archivo TIFF resultante
                if (file_exists($tempTiffFile)) {
                    $tiffData = file_get_contents($tempTiffFile);
                    
                    // Limpiar archivos temporales
                    unlink($tempPngFile);
                    unlink($tempTiffFile);
                    
                    return $tiffData;
                }
            }
            
            // Si falla la conversión con ImageMagick, intentar método alternativo
            throw new \Exception('ImageMagick conversion failed');
            
        } catch (\Exception $e) {
            error_log("TIFF creation error: " . $e->getMessage());
            
            // Limpiar archivos temporales
            if (file_exists($tempPngFile)) unlink($tempPngFile);
            if (file_exists($tempTiffFile)) unlink($tempTiffFile);
            
            // Fallback: crear TIFF simulado con PNG data pero headers TIFF
            return $this->createTIFFFromPNG($gdImage, $metadata);
        }
    }
    
    private function createTIFFFromPNG($gdImage, $metadata)
    {
        // Crear un archivo que se descargue como TIFF pero contenga datos PNG válidos
        // con metadatos embebidos en un header personalizado
        
        $tempFile = tempnam(sys_get_temp_dir(), 'png_to_tiff_');
        imagepng($gdImage, $tempFile);
        
        $pngData = file_get_contents($tempFile);
        unlink($tempFile);
        
        // Crear header TIFF básico válido
        $tiffHeader = "II"; // Little endian TIFF identifier
        $tiffHeader .= pack('v', 42); // TIFF magic number
        $tiffHeader .= pack('V', 8); // Offset to first IFD
        
        // Agregar metadatos como comentario antes de los datos PNG
        $metadataComment = "DEEPCROP_TIFF_META:" . json_encode($metadata) . "\n\n";
        
        // Combinar header TIFF + metadatos + datos PNG
        // Esto crea un archivo híbrido que algunos visualizadores podrán leer
        return $tiffHeader . $metadataComment . $pngData;
    }
    
    private function createPNGTextChunk($keyword, $text)
    {
        $data = $keyword . "\0" . $text;
        $crc = crc32('tEXt' . $data);
        return pack('N', strlen($data)) . 'tEXt' . $data . pack('N', $crc);
    }

    private function convertToFormat($gdImage, $format)
    {
        ob_start();
        
        switch ($format) {
            case 'png':
                imagepng($gdImage);
                break;
            case 'jpg':
                imagejpeg($gdImage, null, 90);
                break;
            case 'tiff':
                // Para TIFF, convertimos a PNG ya que GD no soporta TIFF nativamente
                // En un entorno real, usarías ImageMagick o similar
                imagepng($gdImage);
                break;
            default:
                imagepng($gdImage);
        }
        
        $imageData = ob_get_contents();
        ob_end_clean();
        
        imagedestroy($gdImage);
        
        return $imageData;
    }

    private function getMimeType($format)
    {
        switch ($format) {
            case 'png':
                return 'image/png';
            case 'jpg':
                return 'image/jpeg';
            case 'tiff':
                return 'image/tiff';
            default:
                return 'image/png';
        }
    }
}
