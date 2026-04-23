export type VideoSource = { kind: 'iframe' | 'video'; src: string };

export function resolveVideoSource(raw: string | undefined | null): VideoSource {
  const url = (raw || '').trim();
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]+)/);
  if (yt) return { kind: 'iframe', src: `https://www.youtube.com/embed/${yt[1]}` };
  if (/player\.vimeo\.com\/video\//.test(url)) return { kind: 'iframe', src: url };
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return { kind: 'iframe', src: `https://player.vimeo.com/video/${vm[1]}` };
  return { kind: 'video', src: url };
}
