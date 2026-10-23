const fs = require('fs');
const path = require('path');

const file = 'C:\\Users\\CE JOSE ANTONIO G\\Documents\\GitHub\\PUROLLANORADIO-COM\\PUROLLANORADIO-COM\\artistas.html';
let content = fs.readFileSync(file, 'utf8');

const gradients = [
  ['#f44336', '#ff9800'],
  ['#4caf50', '#8bc34a'],
  ['#673ab7', '#3f51b5'],
  ['#00bcd4', '#009688'],
  ['#e91e63', '#f44336'],
  ['#ff5722', '#ff9800'],
  ['#795548', '#9e9e9e'],
  ['#607d8b', '#455a64'],
  ['#3f51b5', '#2196f3'],
  ['#009688', '#4caf50'],
];

const pattern = /(<\!--\s*Artista\s+\d+:\s*([^->]+?)\s*-->\s*<article[^>]*>)\s*<div class="artist-video">\s*<iframe\s+src="https:\/\/www\.youtube\.com\/embed\?listType=user_uploads&list=([^"]+)"[^>]*title="[^"]*"[^>]*>\s*<\/iframe>\s*<\/div>/g;

let count = 0;
content = content.replace(pattern, (match, articleHeader, artistName, channelHandle) => {
  const idx = count % gradients.length;
  const [c1, c2] = gradients[idx];
  const cleanName = artistName.replace(/^["'\u00a1!+\u00bf?]+/, '').trim();
  const initials = cleanName.substring(0, 2).toUpperCase();
  const replacement = `${articleHeader}
                <a href="https://www.youtube.com/@${channelHandle}" target="_blank" class="artist-banner">
                    <div class="artist-banner-bg" style="background: linear-gradient(135deg, ${c1}, ${c2});">
                        <div class="artist-banner-initial">${initials}</div>
                        <div class="artist-banner-overlay"></div>
                        <div class="artist-banner-yt"><i class="fa-brands fa-youtube"></i> YouTube</div>
                    </div>
                </a>`;
  console.log(`${count + 1}. ${cleanName} -> @${channelHandle} (${initials})`);
  count++;
  return replacement;
});

const tmpFile = 'C:\\temp\\artistas_new.html';
fs.writeFileSync(tmpFile, content, 'utf8');
console.log(`\nTotal replacements: ${count}`);
console.log('Written to: ' + tmpFile);
