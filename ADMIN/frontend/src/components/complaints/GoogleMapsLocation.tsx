import { MapPin, ExternalLink } from 'lucide-react';
import { useTranslation } from '@/i18n/translate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface GoogleMapsLocationProps {
  address: string | null;
  location: unknown;
}

/**
 * Renders a Google Maps embed for the complaint location.
 * Uses the Google Maps embed iframe (no API key required for basic embed).
 * Falls back to address text if no location data.
 */
export function GoogleMapsLocation({ address, location }: GoogleMapsLocationProps) {
  const { t } = useTranslation();
  // Try to extract lat/lng from the PostGIS geography object.
  // PostgREST returns geography as WKB hex or a GeoJSON-like object depending
  // on the column setup. We attempt both.
  let lat: number | null = null;
  let lng: number | null = null;

  if (location && typeof location === 'object') {
    const loc = location as Record<string, unknown>;
    // GeoJSON Point: { type: "Point", coordinates: [lng, lat] }
    if (loc.type === 'Point' && Array.isArray(loc.coordinates)) {
      lng = Number(loc.coordinates[0]);
      lat = Number(loc.coordinates[1]);
    }
  }

  // If we have coords, build a maps embed
  const hasCoords = lat !== null && lng !== null;
  const embedUrl = hasCoords
    ? `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`
    : `https://maps.google.com/maps?q=${encodeURIComponent(address ?? '')}&z=15&output=embed`;
  const linkUrl = hasCoords
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address ?? '')}`;

  if (!hasCoords && !address) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" />
            {t('complaints.location')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('complaints.noLocation')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {t('complaints.location')}
          </span>
          <a
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-normal text-primary hover:underline"
          >
            {t('complaints.openInMaps')}
            <ExternalLink className="h-3 w-3" />
          </a>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {address && (
          <p className="text-sm text-muted-foreground">{address}</p>
        )}
        <div className="overflow-hidden rounded-md border">
          <iframe
            title={t('complaints.locationIframeTitle')}
            src={embedUrl}
            width="100%"
            height="250"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </CardContent>
    </Card>
  );
}
