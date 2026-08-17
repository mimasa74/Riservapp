module.exports = {
  swSrc: 'public/firebase-messaging-sw.js',
  swDest: 'dist/firebase-messaging-sw.js',
  globDirectory: 'dist',
  globPatterns: ['**/*.{js,css,html,png,jpg,svg,woff2,pdf}'],
  globIgnores: ['**/firebase-messaging-sw.js'],
  maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
};
