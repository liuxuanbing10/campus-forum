module.exports = {
  apps: [{
    name: 'campus-forum',
    script: 'packages/server/dist/index.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      OSS_REGION: 'oss-cn-shenzhen',
      OSS_BUCKET: 'campus-forum-files',
      OSS_ACCESS_KEY_ID: '',
      OSS_ACCESS_KEY_SECRET: '',
    }
  }]
};
