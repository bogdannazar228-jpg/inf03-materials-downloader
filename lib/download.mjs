export function downloadUrl(publicUrl, title) {
  const url = new URL(publicUrl);
  const match = url.pathname.match(/\.(pdf|zip|7z)$/i);
  const ext = match ? `.${match[1].toLowerCase()}` : '';
  const name = title.replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').trim().slice(0, 160) || 'INF.03';
  url.searchParams.set('download', name.toLowerCase().endsWith(ext) && ext ? name : name + ext);
  return url.toString();
}
