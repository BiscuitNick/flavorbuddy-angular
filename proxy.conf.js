require('dotenv').config();

const PROXY_CONFIG = {
  '/parse-recipe-url': makeProxyConfig(),
  '/get-recipes': makeProxyConfig(),
  '/get-recipe-by-id': makeProxyConfig(),
  '/get-related-recipes': makeProxyConfig(),
  '/get-favorited-recipes': makeProxyConfig(),
  '/convert-raw-recipe': makeProxyConfig(),
  '/like-recipe': makeProxyConfig(),
  '/dislike-recipe': makeProxyConfig(),
  '/favorite-recipe': makeProxyConfig(),
  '/delete-recipe': makeProxyConfig(),
  '/test-scrape': makeProxyConfig(),
};

function makeProxyConfig() {
  return {
    target: process.env['API_TARGET'] || 'http://localhost:5001',
    secure: false,
    changeOrigin: true,
  };
}

console.log(26, process.env['API_TARGET']);

module.exports = PROXY_CONFIG;
