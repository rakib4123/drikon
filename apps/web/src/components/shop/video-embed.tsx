'use client';

function parse(url: string): { type: 'youtube' | 'vimeo' | 'file' | 'iframe'; src: string } {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      return { type: 'youtube', src: `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}` };
    }
    if (host.endsWith('youtube.com')) {
      const id = u.searchParams.get('v') || u.pathname.split('/').filter(Boolean).pop();
      return { type: 'youtube', src: `https://www.youtube-nocookie.com/embed/${id}` };
    }
    if (host.endsWith('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean).pop();
      return { type: 'vimeo', src: `https://player.vimeo.com/video/${id}` };
    }
    if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(u.pathname)) {
      return { type: 'file', src: url };
    }
    return { type: 'iframe', src: url };
  } catch {
    return { type: 'file', src: url };
  }
}

export function VideoEmbed({ url, className }: { url: string; className?: string }) {
  const { type, src } = parse(url);

  return (
    <div
      className={`relative aspect-video w-full overflow-hidden rounded-2xl border border-[color:var(--border)] bg-black ${className ?? ''}`}
    >
      {type === 'file' ? (
        <video src={src} controls preload="metadata" className="absolute inset-0 h-full w-full object-contain" />
      ) : (
        <iframe
          src={src}
          title="Product video"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      )}
    </div>
  );
}
