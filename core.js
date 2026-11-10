'use strict';
function decodePhoto(value) {
  if (typeof value !== 'string' || value.length > 3000000 || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) throw new Error('Choose and crop a photo first.');
  const png = Buffer.from(value.split(',')[1], 'base64');
  if (png.length < 24 || png.subarray(0,8).toString('hex') !== '89504e470d0a1a0a' || png.toString('ascii',12,16) !== 'IHDR' || png.readUInt32BE(16) !== 512 || png.readUInt32BE(20) !== 512) throw new Error('Expected a 512 × 512 PNG crop.');
  return png;
}
function cssFor(png) {
  const selectors = ['.codicon-accounts-view-bar-icon', '.codicon-accounts'].map(s => '.monaco-workbench .activitybar .action-label' + s);
  return `/* Custom Profile Photo: local image, no network requests. */\n${selectors.join(',\n')} { background: center / cover no-repeat url("data:image/png;base64,${png.toString('base64')}") !important; border-radius: 50% !important; width: 28px !important; height: 28px !important; margin: auto !important; mask: none !important; -webkit-mask: none !important; }\n${selectors.map(s=>s+'::before').join(',\n')} { content: "" !important; }\n`;
}
module.exports = { decodePhoto, cssFor };
