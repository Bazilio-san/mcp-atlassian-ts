export const isMainModule = (url) => {
  const modulePath = (process.argv[1] || '').replace(/\\/g, '/');
  url = url.replace(/file:\/+/, '');
  return modulePath && (url === modulePath);
};
