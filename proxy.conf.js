require('dotenv').config();

const PROXY_CONFIG = {
  "/parse-recipe-url": {
    target: process.env['API_TARGET'] || "http://localhost:5001",
    secure: false,
    changeOrigin: true
  },
  "/get-recipes": {
    target: process.env['API_TARGET'] || "http://localhost:5001",
    secure: false,
    changeOrigin: true
  },
  "/convert-raw-recipe": {
    target: process.env['API_TARGET'] || "http://localhost:5001",
    secure: false,
    changeOrigin: true
  },
  "/test-scrape": {
    target: process.env['API_TARGET'] || "http://localhost:5001",
    secure: false,
    changeOrigin: true
  }
};

module.exports = PROXY_CONFIG;
