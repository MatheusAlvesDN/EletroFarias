const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Força o Chrome a ser instalado e lido de dentro da pasta do seu código
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};