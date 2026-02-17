import { useState } from 'react';
import { Camera, Film } from 'lucide-react';
import { OptimizedImage } from './OptimizedImage';
import { PhotoComingSoon } from './PhotoComingSoon';
import { getOptimizedImageUrl } from '../lib/fenderApi';
import type { FenderVehicle } from '../lib/fenderApi';

interface VehicleMediaGalleryProps {
  vehicle: FenderVehicle;
}

type MediaTab = 'photos' | 'videos';

function getVideos(vehicle: FenderVehicle): { url: string; thumbnail?: string; caption?: string }[] {
  const mediaVideos = vehicle.media?.filter(m => m.media_type === 'video').map(m => ({
    url: m.url,
    thumbnail: m.thumbnail_url,
    caption: m.caption,
  })) || [];

  if (mediaVideos.length > 0) return mediaVideos;

  const urlVideos = vehicle.video_urls?.map(url => ({
    url,
    thumbnail: undefined,
    caption: undefined,
  })) || [];

  return urlVideos;
}

function getImages(vehicle: FenderVehicle): string[] {
  if (vehicle.photo_urls && vehicle.photo_urls.length > 0) return vehicle.photo_urls;
  if (vehicle.primary_photo_url) return [vehicle.primary_photo_url];
  return [];
}

export default function VehicleMediaGallery({ vehicle }: VehicleMediaGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState<MediaTab>('photos');

  const images = getImages(vehicle);
  const videos = getVideos(vehicle);
  const hasPhotos = images.length > 0;
  const hasVideos = videos.length > 0;
  const hasBoth = hasPhotos && hasVideos;

  const vehicleAlt = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  return (
    <div className="space-y-4">
      {hasBoth && (
        <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
          <button
            onClick={() => setActiveTab('photos')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-md text-sm font-semibold transition-all ${
              activeTab === 'photos'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Photos ({images.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('videos')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-md text-sm font-semibold transition-all ${
              activeTab === 'videos'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Videos ({videos.length})</span>
          </button>
        </div>
      )}

      {(activeTab === 'photos' || !hasVideos) && hasPhotos && (
        <>
          <div className="rounded-2xl overflow-hidden border border-white/10">
            <OptimizedImage
              src={getOptimizedImageUrl(images[selectedImage], 'large')}
              alt={vehicleAlt}
              aspectRatio="aspect-[16/10]"
              priority={true}
            />
          </div>

          {images.length > 1 && (
            <div className="grid grid-cols-6 gap-2">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImage === index
                      ? 'border-blue-500 scale-95'
                      : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <OptimizedImage
                    src={getOptimizedImageUrl(image, 'thumbnail')}
                    alt={`View ${index + 1}`}
                    aspectRatio="aspect-[4/3]"
                    priority={index < 6}
                  />
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {(activeTab === 'photos' || !hasVideos) && !hasPhotos && (
        <div className="rounded-2xl overflow-hidden border border-white/10">
          <PhotoComingSoon />
        </div>
      )}

      {((activeTab === 'videos' && hasBoth) || (!hasPhotos && hasVideos)) && (
        <div className="space-y-4">
          {videos.map((video, index) => (
            <div key={index} className="rounded-2xl overflow-hidden border border-white/10 bg-black">
              <video
                controls
                poster={video.thumbnail}
                className="w-full aspect-video"
                preload="metadata"
              >
                <source src={video.url} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              {video.caption && (
                <div className="p-3 text-gray-400 text-sm bg-white/5">{video.caption}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {!hasBoth && hasPhotos && hasVideos === false && images.length === 1 && (
        <p className="text-center text-gray-500 text-sm">More photos coming soon</p>
      )}
    </div>
  );
}
