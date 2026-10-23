/**
 * Validador de Sitemap XML
 * Verifica que el sitemap.xml esté bien formado y sea válido
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 === VALIDACIÓN DE SITEMAP ===\n');

try {
    // Leer el sitemap
    const sitemapPath = path.join(__dirname, 'sitemap.xml');
    const sitemap = fs.readFileSync(sitemapPath, 'utf8');

    // Verificaciones básicas
    console.log('✅ Archivo sitemap.xml encontrado');
    console.log(`📊 Tamaño: ${(Buffer.byteLength(sitemap) / 1024).toFixed(2)} KB`);

    // Contar URLs
    const urlMatches = sitemap.match(/<url>/g);
    const urlCount = urlMatches ? urlMatches.length : 0;
    console.log(`📝 Total de URLs: ${urlCount}`);

    // Verificar estructura XML
    if (!sitemap.includes('<?xml version="1.0"')) {
        console.log('❌ Falta la declaración XML');
    } else {
        console.log('✅ Declaración XML presente');
    }

    if (!sitemap.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')) {
        console.log('❌ Falta el namespace de sitemap');
    } else {
        console.log('✅ Namespace de sitemap presente');
    }

    // Verificar que todas las URLs tengan loc, lastmod, changefreq, priority
    const urls = sitemap.match(/<url>[\s\S]*?<\/url>/g) || [];
    let validUrls = 0;
    let invalidUrls = [];

    urls.forEach((url, index) => {
        const loc = url.match(/<loc>(.*?)<\/loc>/);
        const lastmod = url.match(/<lastmod>(.*?)<\/lastmod>/);
        const changefreq = url.match(/<changefreq>(.*?)<\/changefreq>/);
        const priority = url.match(/<priority>(.*?)<\/priority>/);

        if (loc && lastmod && changefreq && priority) {
            validUrls++;
        } else {
            invalidUrls.push({
                index: index + 1,
                loc: loc ? loc[1] : 'N/A',
                missing: [
                    !loc && 'loc',
                    !lastmod && 'lastmod',
                    !changefreq && 'changefreq',
                    !priority && 'priority'
                ].filter(Boolean)
            });
        }
    });

    console.log(`✅ URLs válidas: ${validUrls}`);
    
    if (invalidUrls.length > 0) {
        console.log(`⚠️  URLs incompletas: ${invalidUrls.length}`);
        invalidUrls.forEach(url => {
            console.log(`   - ${url.loc} (falta: ${url.missing.join(', ')})`);
        });
    }

    // Verificar imágenes
    const imageMatches = sitemap.match(/<image:image>/g);
    const imageCount = imageMatches ? imageMatches.length : 0;
    console.log(`🖼️  Total de imágenes: ${imageCount}`);

    // Verificar que las URLs usen HTTPS
    const httpUrls = (sitemap.match(/http:\/\//g) || []).length;
    const httpsUrls = (sitemap.match(/https:\/\//g) || []).length;
    
    if (httpUrls > 0) {
        console.log(`⚠️  URLs con HTTP (inseguro): ${httpUrls}`);
    } else {
        console.log('✅ Todas las URLs usan HTTPS');
    }
    console.log(`🔒 URLs con HTTPS: ${httpsUrls}`);

    // Validar dominios
    const domains = [...new Set(sitemap.match(/https:\/\/([a-zA-Z0-9.-]+)\//g) || [])];
    console.log(`\n🌐 Dominios encontrados:`);
    domains.forEach(domain => {
        const cleanDomain = domain.replace('https://', '').replace('/', '');
        if (cleanDomain === 'purollanoradio.com') {
            console.log(`   ✅ ${cleanDomain}`);
        } else {
            console.log(`   ⚠️  ${cleanDomain} (dominio externo)`);
        }
    });

    // Verificar robots.txt
    console.log('\n📋 === RECOMENDACIONES ===\n');
    console.log('1. Agrega el sitemap a robots.txt:');
    console.log('   Sitemap: https://purollanoradio.com/sitemap.xml');
    console.log('\n2. Envía el sitemap a Google Search Console:');
    console.log('   https://search.google.com/search-console');
    console.log('\n3. Envía el sitemap a Bing Webmaster Tools:');
    console.log('   https://www.bing.com/webmasters');
    console.log('\n4. Actualiza las fechas <lastmod> cuando modifiques páginas');

    console.log('\n✅ === VALIDACIÓN COMPLETADA ===\n');

} catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
}
