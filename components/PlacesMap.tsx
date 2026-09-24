import { useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { theme } from '../constants/theme';
import { sportPinColor } from '../lib/sportPinColor';
import { mapSportsOnly } from '../lib/places';

export type MapPlace = {
  id: string;
  name: string;
  neighbourhood: string;
  address?: string;
  lat: number;
  lng: number;
  sports: string[];
};

type Props = {
  places: MapPlace[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

type Pin = {
  id: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  color: string;
  sports: string[];
};

function toPins(places: MapPlace[]): Pin[] {
  return places.map((p) => {
    const sports = mapSportsOnly(p.sports);
    const sport = sports[0] ?? 'Park';
    return {
      id: p.id,
      name: p.name,
      address: p.address,
      lat: p.lat,
      lng: p.lng,
      sports,
      color: sportPinColor(sport),
    };
  });
}

const LEAFLET_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #map { height: 100%; margin: 0; background: #E7EFE4; }
  .leaflet-tooltip.sm-tip-wrap {
    padding: 0;
    background: #FFFEFB;
    border: 1px solid #D5DDD0;
    border-radius: 10px;
    box-shadow: 0 4px 14px rgba(20,32,24,.18);
    white-space: normal;
    width: max-content;
    min-width: 210px;
    max-width: 280px;
    color: #142018;
  }
  .leaflet-tooltip.sm-tip-wrap::before { display: none; }
  .sm-tip { padding: 8px 10px 9px; }
  .sm-name {
    font-weight: 700;
    font-size: 14px;
    line-height: 1.25;
    color: #142018;
  }
  .sm-kicker {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #6E7A72;
  }
  .sm-addr {
    margin-top: 3px;
    font-size: 12px;
    line-height: 1.35;
    color: #4E5C54;
    white-space: nowrap;
  }
  .sm-play {
    margin-top: 8px;
    padding-top: 7px;
    border-top: 1px solid #D5DDD0;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .sm-chip {
    display: inline-block;
    flex: 0 0 auto;
    white-space: nowrap;
    font-size: 11px;
    font-weight: 600;
    color: #0F3D22;
    background: #D6E6D9;
    border-radius: 999px;
    padding: 2px 8px;
  }
  .sm-icon { background: none !important; border: none !important; }
  .sm-pin {
    width: 18px; height: 18px;
    border-radius: 50%;
    border: 2px solid #FFFEFB;
    box-sizing: border-box;
    box-shadow: 0 1px 3px rgba(20,32,24,.45);
  }
  .sm-pin.on {
    width: 22px; height: 22px;
    box-shadow: 0 0 0 3px rgba(26,92,52,.3), 0 1px 3px rgba(20,32,24,.45);
  }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  const map = L.map('map', { scrollWheelZoom: true, zoomControl: true });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);
  map.setView([45.4215, -75.6972], 11);
  const layer = L.layerGroup().addTo(map);
  let lastSelected = null;
  let lastPinKey = '';
  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  function pinHtml(p, on) {
    return '<div class="sm-pin' + (on ? ' on' : '') + '" style="background:' + p.color + '"></div>';
  }
  function tipHtml(p) {
    const chips = (p.sports || []).map(function (s) {
      return '<span class="sm-chip">' + esc(s) + '</span>';
    }).join('');
    const addr = p.address
      ? '<div class="sm-addr"><span class="sm-kicker">Meet at</span> ' + esc(p.address) + '</div>'
      : '';
    const play = chips ? '<div class="sm-play">' + chips + '</div>' : '';
    return '<div class="sm-tip"><div class="sm-name">' + esc(p.name) + '</div>' + addr + play + '</div>';
  }

  function render(pins, selectedId) {
    layer.clearLayers();
    const latlngs = [];
    pins.forEach(function (p) {
      const on = p.id === selectedId;
      const size = on ? 22 : 18;
      const m = L.marker([p.lat, p.lng], {
        icon: L.divIcon({
          className: 'sm-icon',
          html: pinHtml(p, on),
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
          tooltipAnchor: [0, -12]
        }),
        zIndexOffset: on ? 800 : 0
      });
      m.bindTooltip(tipHtml(p), {
        direction: 'top',
        opacity: 1,
        className: 'sm-tip-wrap'
      });
      m.on('click', function () {
        parent.postMessage({ type: 'sportmatchr-place', id: p.id }, '*');
      });
      m.addTo(layer);
      latlngs.push([p.lat, p.lng]);
    });
    if (!latlngs.length) return;
    const pinKey = pins.map(function (p) { return p.id; }).join(',');
    const pinsChanged = pinKey !== lastPinKey;
    lastPinKey = pinKey;
    if (pinsChanged) {
      map.fitBounds(latlngs, { padding: [40, 40], maxZoom: 13 });
      lastSelected = selectedId || null;
      return;
    }
    if (selectedId && selectedId !== lastSelected) {
      const hit = pins.find(function (p) { return p.id === selectedId; });
      if (hit) map.flyTo([hit.lat, hit.lng], 14, { duration: 0.45 });
    }
    lastSelected = selectedId || null;
  }

  window.addEventListener('message', function (e) {
    const d = e.data;
    if (!d || d.type !== 'sportmatchr-map') return;
    render(d.pins || [], d.selectedId || null);
  });
  parent.postMessage({ type: 'sportmatchr-map-ready' }, '*');
</script>
</body>
</html>`;

export function PlacesMap({ places, selectedId, onSelect }: Props) {
  const iframeRef = useRef<{ contentWindow: Window | null } | null>(null);
  const pins = useMemo(() => toPins(places), [places]);
  const readyRef = useRef(false);
  const legend = useMemo(() => {
    const seen = new Map<string, string>();
    for (const place of places) {
      for (const sport of mapSportsOnly(place.sports)) {
        if (!seen.has(sport)) seen.set(sport, sportPinColor(sport));
      }
    }
    return [...seen.entries()]
      .map(([sport, color]) => ({ sport, color }))
      .sort((a, b) => a.sport.localeCompare(b.sport));
  }, [places]);

  const push = (target: { contentWindow: Window | null } | null) => {
    target?.contentWindow?.postMessage(
      { type: 'sportmatchr-map', pins, selectedId },
      '*'
    );
  };

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onMsg = (e: MessageEvent) => {
      const d = e.data;
      if (!d || typeof d !== 'object') return;
      if (d.type === 'sportmatchr-map-ready') {
        readyRef.current = true;
        push(iframeRef.current);
      }
      if (d.type === 'sportmatchr-place' && typeof d.id === 'string') {
        onSelect(d.id);
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [onSelect, pins, selectedId]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !readyRef.current) return;
    push(iframeRef.current);
  }, [pins, selectedId]);

  if (Platform.OS !== 'web') {
    return (
      <View>
        <NativePlacesMap places={places} />
        <PinLegend items={legend} count={places.length} />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.shell}>
        <iframe
          ref={(node) => {
            iframeRef.current = node;
          }}
          title="Ottawa free places map"
          srcDoc={LEAFLET_HTML}
          style={{ border: 0, width: '100%', height: '100%', display: 'block' }}
        />
      </View>
      <PinLegend items={legend} count={places.length} />
    </View>
  );
}

function PinLegend({
  items,
  count,
}: {
  items: { sport: string; color: string }[];
  count: number;
}) {
  const shown = items.slice(0, 18);
  const extra = items.length - shown.length;
  return (
    <View style={styles.legendBox}>
      <Text style={styles.legendTitle}>
        {count} free {count === 1 ? 'place' : 'places'} · one pin per park
      </Text>
      <View style={styles.legendRow}>
        {shown.map((item) => (
          <View key={item.sport} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: item.color }]} />
            <Text style={styles.legendLabel}>{item.sport}</Text>
          </View>
        ))}
      </View>
      {extra > 0 ? (
        <Text style={styles.legendTitle}>{extra} more sports on the pins</Text>
      ) : null}
    </View>
  );
}

function NativePlacesMap({ places }: { places: MapPlace[] }) {
  return (
    <View style={styles.fallback}>
      <Text style={styles.fallbackTitle}>{places.length} free places</Text>
      <Text style={styles.fallbackSub}>Tap a card below to pick a park. Map pins are on web.</Text>
    </View>
  );
}

const MAP_H = Platform.OS === 'web' ? 420 : 300;

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  shell: {
    width: '100%',
    height: MAP_H,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: theme.border,
    borderWidth: 1.5,
    borderColor: theme.borderStrong,
  },
  legendBox: {
    marginTop: 8,
    backgroundColor: theme.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  legendTitle: {
    fontFamily: theme.fonts.bodyMed,
    fontSize: 12,
    color: theme.muted,
    marginBottom: 6,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 4,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(20,32,24,0.2)',
  },
  legendLabel: {
    fontFamily: theme.fonts.bodyMed,
    fontSize: 12,
    color: theme.ink,
  },
  fallback: {
    height: MAP_H,
    borderRadius: 16,
    backgroundColor: theme.bgDeep,
    padding: 16,
    justifyContent: 'center',
  },
  fallbackTitle: { color: theme.ink, fontFamily: theme.fonts.bodyBold, fontSize: 16 },
  fallbackSub: { color: theme.muted, marginTop: 4, fontSize: 13 },
});
