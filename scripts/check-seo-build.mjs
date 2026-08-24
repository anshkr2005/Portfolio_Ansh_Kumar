import fs from 'node:fs/promises';
import path, { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptsDirectory, '..');
const distDirectory = path.join(repositoryRoot, 'dist');

/*
 * Canonical production domain.
 *
 * IMPORTANT:
 * Keep this WITHOUT a trailing slash.
 */
const siteOrigin = 'https://anshkumar.dev';

const failures = [];

const fail = (message) => failures.push(message);

const decodeEntities = (value) =>
    value
        .replaceAll('&amp;', '&')
        .replaceAll('&quot;', '"')
        .replaceAll('&#39;', "'")
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>');

const parseAttributes = (tag) =>
    Object.fromEntries(
        [...tag.matchAll(/([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(
            (match) => [
                match[1].toLowerCase(),
                decodeEntities(match[2] ?? match[3] ?? ''),
            ],
        ),
    );

const getMeta = (html, key, value) => {
    for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
        const attributes = parseAttributes(match[0]);

        if (attributes[key] === value) {
            return attributes.content;
        }
    }

    return undefined;
};

const getCanonical = (html) => {
    for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
        const attributes = parseAttributes(match[0]);

        if (
            attributes.rel
                ?.split(/\s+/)
                .includes('canonical')
        ) {
            return attributes.href;
        }
    }

    return undefined;
};

/*
 * Creates clean canonical URLs.
 *
 * /
 *   -> https://anshkumar.dev/
 *
 * /privacy
 *   -> https://anshkumar.dev/privacy
 */
const canonicalUrl = (route = '/') => {
    const cleanOrigin = siteOrigin.replace(/\/+$/, '');

    if (route === '/') {
        return `${cleanOrigin}/`;
    }

    const cleanRoute = route.replace(/^\/+|\/+$/g, '');

    return `${cleanOrigin}/${cleanRoute}`;
};

/*
 * Convert a sitemap route into its corresponding
 * production HTML file.
 *
 * /
 *   -> dist/index.html
 *
 * /about
 *   -> dist/about.html
 */
const routeToFile = (route) => {
    if (route === '/') {
        return path.join(distDirectory, 'index.html');
    }

    return path.join(
        distDirectory,
        `${route.replace(/^\/+/, '')}.html`,
    );
};

/*
 * Read generated sitemap.
 */
const sitemapPath = path.join(
    distDirectory,
    'sitemap.xml',
);

let sitemapSource;

try {
    sitemapSource = await fs.readFile(
        sitemapPath,
        'utf8',
    );
} catch {
    fail('sitemap.xml is missing from the production build');
    sitemapSource = '';
}

/*
 * Read sitemap URLs using the canonical production domain.
 *
 * Example:
 * https://anshkumar.dev/
 * becomes:
 * /
 */
const escapedSiteOrigin = siteOrigin.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&',
);

const sitemapRegex = new RegExp(
    `<loc>${escapedSiteOrigin}([^<]*)</loc>`,
    'g',
);

const sitemapRoutes = [
    ...sitemapSource.matchAll(sitemapRegex),
].map((match) => {
    const rawRoute = match[1] || '/';

    /*
     * Normalize accidental duplicate slashes.
     *
     * // -> /
     * /about/ -> /about
     */
    if (rawRoute === '/' || rawRoute === '') {
        return '/';
    }

    return `/${rawRoute
        .replace(/^\/+|\/+$/g, '')}`;
});

const expectedRoutes = new Set(sitemapRoutes);
const checkedHtml = new Map();

/*
 * Sitemap validation
 */
if (sitemapRoutes.length === 0) {
    fail('Sitemap contains no canonical routes');
}

if (
    expectedRoutes.size !== sitemapRoutes.length
) {
    fail('Sitemap contains duplicate routes');
}

if (expectedRoutes.has('/privacy')) {
    fail(
        'Privacy page must not be included in the sitemap',
    );
}

/*
 * Validate every sitemap route.
 */
for (const route of sitemapRoutes) {
    const filePath = routeToFile(route);

    let html;

    try {
        html = await fs.readFile(
            filePath,
            'utf8',
        );
    } catch {
        fail(
            `${route}: sitemap target is missing from dist`,
        );
        continue;
    }

    checkedHtml.set(route, html);

    const title =
        /<title>([\s\S]*?)<\/title>/i
            .exec(html)?.[1]
            ?.trim();

    const description = getMeta(
        html,
        'name',
        'description',
    );

    const robots =
        getMeta(
            html,
            'name',
            'robots',
        ) ?? '';

    const canonical = getCanonical(html);

    const h1Count = [
        ...html.matchAll(/<h1\b/gi),
    ].length;

    const expectedCanonical =
        canonicalUrl(route);

    /*
     * Title
     */
    if (!title) {
        fail(
            `${route}: missing title`,
        );
    }

    /*
     * Meta description
     */
    if (!description) {
        fail(
            `${route}: missing meta description`,
        );
    }

    /*
     * Sitemap URLs must be indexable.
     */
    if (/\bnoindex\b/i.test(robots)) {
        fail(
            `${route}: indexable sitemap URL has noindex`,
        );
    }

    /*
     * Canonical URL
     */
    if (
        canonical !== expectedCanonical
    ) {
        fail(
            `${route}: canonical is ${
                canonical ?? 'missing'
            }, expected ${expectedCanonical}`,
        );
    }

    /*
     * Exactly one H1.
     */
    if (h1Count !== 1) {
        fail(
            `${route}: expected one H1, found ${h1Count}`,
        );
    }

    /*
     * Open Graph image.
     */
    const expectedOgImage =
        `${siteOrigin}/og.png`;

    if (
        getMeta(
            html,
            'property',
            'og:image',
        ) !== expectedOgImage
    ) {
        fail(
            `${route}: missing canonical Open Graph image`,
        );
    }

    /*
     * Twitter image.
     */
    const expectedTwitterImage =
        `${siteOrigin}/og.png`;

    if (
        getMeta(
            html,
            'name',
            'twitter:image',
        ) !== expectedTwitterImage
    ) {
        fail(
            `${route}: missing canonical Twitter image`,
        );
    }

    /*
     * Validate JSON-LD.
     */
    for (
        const match of html.matchAll(
            /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
        )
    ) {
        try {
            JSON.parse(match[1]);
        } catch (error) {
            fail(
                `${route}: invalid JSON-LD (${error.message})`,
            );
        }
    }
}

/*
 * Privacy page
 */
try {
    const privacyHtml =
        await fs.readFile(
            path.join(
                distDirectory,
                'privacy.html',
            ),
            'utf8',
        );

    if (
        !/\bnoindex\b/i.test(
            getMeta(
                privacyHtml,
                'name',
                'robots',
            ) ?? '',
        )
    ) {
        fail(
            '/privacy: expected noindex',
        );
    }

    if (
        getCanonical(privacyHtml) !==
        canonicalUrl('/privacy')
    ) {
        fail(
            '/privacy: canonical must use the extensionless route',
        );
    }
} catch {
    fail(
        'privacy.html is missing from the production build',
    );
}

/*
 * 404 page
 */
try {
    const notFoundHtml =
        await fs.readFile(
            path.join(
                distDirectory,
                '404.html',
            ),
            'utf8',
        );

    if (
        !/\bnoindex\b/i.test(
            getMeta(
                notFoundHtml,
                'name',
                'robots',
            ) ?? '',
        )
    ) {
        fail(
            '/404.html: expected noindex',
        );
    }

    if (getCanonical(notFoundHtml)) {
        fail(
            '/404.html: not-found page must not declare a canonical',
        );
    }
} catch {
    fail(
        '404.html is missing from the production build',
    );
}

/*
 * Validate internal links.
 */
const knownRoutes = new Set([
    ...sitemapRoutes,
    '/privacy',
]);

for (
    const [route, html]
    of checkedHtml
) {
    for (
        const match of html.matchAll(
            /<a\b[^>]*href=(?:"([^"]*)"|'([^']*)')[^>]*>/gi,
        )
    ) {
        const href =
            match[1] ??
            match[2] ??
            '';

        /*
         * Ignore:
         * - external URLs
         * - protocol-relative URLs
         * - anchors
         * - mailto/tel/etc.
         */
        if (
            !href.startsWith('/') ||
            href.startsWith('//')
        ) {
            continue;
        }

        const targetPath =
            new URL(
                href,
                `${siteOrigin}/`,
            ).pathname;

        const publicFilePath =
            join(
                repositoryRoot,
                'public',
                decodeURIComponent(
                    targetPath,
                ).replace(
                    /^\/+/,
                    '',
                ),
            );

        const isKnownRoute =
            knownRoutes.has(targetPath);

        const isPublicFile =
            existsSync(
                publicFilePath,
            );

        if (
            !isKnownRoute &&
            !isPublicFile
        ) {
            fail(
                `${route}: internal link points to unknown target ${targetPath}`,
            );
        }
    }
}

/*
 * Validate robots.txt
 */
let robotsSource = '';

try {
    robotsSource =
        await fs.readFile(
            path.join(
                distDirectory,
                'robots.txt',
            ),
            'utf8',
        );
} catch {
    fail(
        'robots.txt is missing from the production build',
    );
}

const canonicalSitemap =
    `${siteOrigin}/sitemap.xml`;

if (
    !robotsSource.includes(
        `Sitemap: ${canonicalSitemap}`,
    )
) {
    fail(
        'robots.txt does not reference the canonical sitemap',
    );
}

/*
 * Validate Open Graph image.
 */
try {
    const ogStats =
        await fs.stat(
            path.join(
                distDirectory,
                'og.png',
            ),
        );

    if (ogStats.size === 0) {
        fail(
            'og.png is empty',
        );
    }
} catch {
    fail(
        'og.png is missing from the production build',
    );
}

/*
 * Final result
 */
if (failures.length > 0) {
    console.error(
        `SEO build validation failed:\n- ${failures.join(
            '\n- ',
        )}`,
    );

    process.exitCode = 1;
} else {
    console.log(
        `SEO build validation passed for ${sitemapRoutes.length} indexable routes.`,
    );
}
