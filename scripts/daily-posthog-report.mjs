#!/usr/bin/env node

/**
 * Daily PostHog Analytics Report Generator
 *
 * Queries PostHog HogQL API for yesterday's data (or a specified date),
 * generates a markdown report, and saves it to /reports/.
 *
 * Usage:
 *   node scripts/daily-posthog-report.mjs              # yesterday
 *   node scripts/daily-posthog-report.mjs 2026-03-24   # specific date
 */

const POSTHOG_BASE = 'https://us.posthog.com';
const PROJECT_ID = '310428';
// Personal API key — set POSTHOG_PERSONAL_API_KEY in .env.local (never commit it).
const API_KEY = process.env.POSTHOG_PERSONAL_API_KEY;
if (!API_KEY) {
  console.error('Missing POSTHOG_PERSONAL_API_KEY. Run with: node --env-file=.env.local scripts/daily-posthog-report.mjs');
  process.exit(1);
}

// --- Date helpers ---

function getDateStr(daysAgo = 1) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

function parseTargetDate(arg) {
  if (!arg) return getDateStr(1);
  if (/^\d{4}-\d{2}-\d{2}$/.test(arg)) return arg;
  console.error(`Invalid date format: ${arg}. Use YYYY-MM-DD.`);
  process.exit(1);
}

function previousDay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

// --- PostHog HogQL query helper ---

async function hogql(query) {
  const url = `${POSTHOG_BASE}/api/projects/${PROJECT_ID}/query/`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: { kind: 'HogQLQuery', query },
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`PostHog API error (${res.status}): ${text.slice(0, 300)}`);
      return null;
    }
    const data = await res.json();
    return data.results || [];
  } catch (err) {
    console.error(`PostHog fetch error: ${err.message}`);
    return null;
  }
}

// Convenience: returns first row first column, or fallback
async function hogqlScalar(query, fallback = 0) {
  const rows = await hogql(query);
  if (!rows || rows.length === 0) return fallback;
  return rows[0][0] ?? fallback;
}

// --- Queries ---

async function getUniqueVisitors(date) {
  return hogqlScalar(`
    SELECT count(DISTINCT distinct_id)
    FROM events
    WHERE event = '$pageview'
      AND toDate(timestamp) = '${date}'
  `);
}

async function getPageviews(date) {
  return hogqlScalar(`
    SELECT count()
    FROM events
    WHERE event = '$pageview'
      AND toDate(timestamp) = '${date}'
  `);
}

async function getSignups(date) {
  return hogqlScalar(`
    SELECT count()
    FROM events
    WHERE event = 'user_signed_up'
      AND toDate(timestamp) = '${date}'
  `);
}

async function getTopPages(date, limit = 10) {
  const rows = await hogql(`
    SELECT
      properties.$pathname AS page,
      count() AS views,
      count(DISTINCT distinct_id) AS visitors
    FROM events
    WHERE event = '$pageview'
      AND toDate(timestamp) = '${date}'
    GROUP BY page
    ORDER BY views DESC
    LIMIT ${limit}
  `);
  return rows || [];
}

async function getTrafficSources(date, limit = 10) {
  const rows = await hogql(`
    SELECT
      if(
        properties.$referring_domain = '' OR properties.$referring_domain IS NULL,
        '(direct)',
        properties.$referring_domain
      ) AS source,
      count() AS hits,
      count(DISTINCT distinct_id) AS visitors
    FROM events
    WHERE event = '$pageview'
      AND toDate(timestamp) = '${date}'
    GROUP BY source
    ORDER BY hits DESC
    LIMIT ${limit}
  `);
  return rows || [];
}

async function getEventCounts(date) {
  const events = [
    'audio_uploaded',
    'analysis_completed',
    'preset_downloaded',
    'recipe_published',
    'checkout_started',
    'feedback_submitted',
    'hero_demo_clicked',
    'hero_cta_clicked',
    'user_signed_up',
    'user_signed_in',
    'stem_separation_started',
    'demo_sound_generated',
    'save_prompt_shown',
    'save_prompt_converted',
    'recipe_viewed',
    'search_performed',
    'pricing_page_viewed',
  ];
  const eventList = events.map(e => `'${e}'`).join(', ');
  const rows = await hogql(`
    SELECT event, count() AS cnt
    FROM events
    WHERE event IN (${eventList})
      AND toDate(timestamp) = '${date}'
    GROUP BY event
    ORDER BY cnt DESC
  `);
  return rows || [];
}

async function getFunnelData(date) {
  const visitors = await getUniqueVisitors(date);

  const analyzeVisitors = await hogqlScalar(`
    SELECT count(DISTINCT distinct_id)
    FROM events
    WHERE event = '$pageview'
      AND properties.$pathname LIKE '/analyze%'
      AND toDate(timestamp) = '${date}'
  `);

  const analysesCompleted = await hogqlScalar(`
    SELECT count(DISTINCT distinct_id)
    FROM events
    WHERE event = 'analysis_completed'
      AND toDate(timestamp) = '${date}'
  `);

  const signups = await hogqlScalar(`
    SELECT count(DISTINCT distinct_id)
    FROM events
    WHERE event = 'user_signed_up'
      AND toDate(timestamp) = '${date}'
  `);

  return { visitors, analyzeVisitors, analysesCompleted, signups };
}

async function getNewAccounts(date) {
  const rows = await hogql(`
    SELECT
      properties.$set.username AS username,
      if(
        properties.$set.auth_provider = '' OR properties.$set.auth_provider IS NULL,
        'email',
        properties.$set.auth_provider
      ) AS method,
      formatDateTime(timestamp, '%H:%M') AS signup_time
    FROM events
    WHERE event = 'user_signed_up'
      AND toDate(timestamp) = '${date}'
    ORDER BY timestamp ASC
  `);
  return rows || [];
}

async function getGeography(date, limit = 10) {
  const rows = await hogql(`
    SELECT
      if(
        properties.$geoip_country_name = '' OR properties.$geoip_country_name IS NULL,
        'Unknown',
        properties.$geoip_country_name
      ) AS country,
      if(
        properties.$geoip_city_name = '' OR properties.$geoip_city_name IS NULL,
        'Unknown',
        properties.$geoip_city_name
      ) AS city,
      count(DISTINCT distinct_id) AS visitors
    FROM events
    WHERE event = '$pageview'
      AND toDate(timestamp) = '${date}'
    GROUP BY country, city
    ORDER BY visitors DESC
    LIMIT ${limit}
  `);
  return rows || [];
}

async function getCountrySummary(date) {
  const rows = await hogql(`
    SELECT
      if(
        properties.$geoip_country_name = '' OR properties.$geoip_country_name IS NULL,
        'Unknown',
        properties.$geoip_country_name
      ) AS country,
      count(DISTINCT distinct_id) AS visitors
    FROM events
    WHERE event = '$pageview'
      AND toDate(timestamp) = '${date}'
    GROUP BY country
    ORDER BY visitors DESC
    LIMIT 15
  `);
  return rows || [];
}

async function getDeviceBreakdown(date) {
  const rows = await hogql(`
    SELECT
      if(
        properties.$device_type = '' OR properties.$device_type IS NULL,
        'Unknown',
        properties.$device_type
      ) AS device,
      count() AS hits,
      count(DISTINCT distinct_id) AS visitors
    FROM events
    WHERE event = '$pageview'
      AND toDate(timestamp) = '${date}'
    GROUP BY device
    ORDER BY hits DESC
  `);
  return rows || [];
}

// --- Formatting helpers ---

function pct(num, denom) {
  if (!denom || denom === 0) return '0%';
  return ((num / denom) * 100).toFixed(1) + '%';
}

function change(current, previous) {
  if (previous === 0 && current === 0) return '0 (-)';
  if (previous === 0) return `${current} (new)`;
  const diff = current - previous;
  const pctChange = ((diff / previous) * 100).toFixed(1);
  const arrow = diff > 0 ? '^^' : diff < 0 ? 'vv' : '--';
  const sign = diff > 0 ? '+' : '';
  return `${current} ${arrow} ${sign}${pctChange}%`;
}

function padRight(str, len) {
  const s = String(str);
  return s + ' '.repeat(Math.max(0, len - s.length));
}

// --- Report generation ---

async function generateReport(targetDate) {
  const prevDate = previousDay(targetDate);

  console.log(`Fetching PostHog data for ${targetDate} (comparing to ${prevDate})...\n`);

  // Parallel fetch for both days
  const [
    visitors, prevVisitors,
    pageviews, prevPageviews,
    signups, prevSignups,
    topPages,
    trafficSources,
    eventCounts, prevEventCounts,
    funnel,
    devices,
    newAccounts,
    countrySummary,
    geoDetails,
  ] = await Promise.all([
    getUniqueVisitors(targetDate),
    getUniqueVisitors(prevDate),
    getPageviews(targetDate),
    getPageviews(prevDate),
    getSignups(targetDate),
    getSignups(prevDate),
    getTopPages(targetDate),
    getTrafficSources(targetDate),
    getEventCounts(targetDate),
    getEventCounts(prevDate),
    getFunnelData(targetDate),
    getDeviceBreakdown(targetDate),
    getNewAccounts(targetDate),
    getCountrySummary(targetDate),
    getGeography(targetDate),
  ]);

  // Build event count maps
  const evMap = Object.fromEntries((eventCounts || []).map(r => [r[0], r[1]]));
  const prevEvMap = Object.fromEntries((prevEventCounts || []).map(r => [r[0], r[1]]));

  // --- Build markdown ---
  const lines = [];
  const h = (level, text) => lines.push(`${'#'.repeat(level)} ${text}`);
  const br = () => lines.push('');
  const ln = (text) => lines.push(text);

  h(1, `SoundSauce Analytics Report -- ${targetDate}`);
  br();

  // Summary
  h(2, 'Summary');
  br();
  ln(`| Metric | Today | Previous Day | Change |`);
  ln(`|--------|------:|-------------:|--------|`);
  ln(`| Unique Visitors | ${visitors} | ${prevVisitors} | ${change(visitors, prevVisitors)} |`);
  ln(`| Pageviews | ${pageviews} | ${prevPageviews} | ${change(pageviews, prevPageviews)} |`);
  ln(`| Signups | ${signups} | ${prevSignups} | ${change(signups, prevSignups)} |`);
  br();

  // Top Pages
  h(2, 'Top Pages');
  br();
  if (topPages.length === 0) {
    ln('No pageview data.');
  } else {
    ln(`| Page | Views | Unique Visitors |`);
    ln(`|------|------:|----------------:|`);
    for (const [page, views, vis] of topPages) {
      ln(`| ${page || '/'} | ${views} | ${vis} |`);
    }
  }
  br();

  // Traffic Sources
  h(2, 'Traffic Sources');
  br();
  if (trafficSources.length === 0) {
    ln('No referrer data.');
  } else {
    const totalHits = trafficSources.reduce((s, r) => s + r[1], 0);
    ln(`| Source | Hits | Visitors | Share |`);
    ln(`|--------|-----:|---------:|------:|`);
    for (const [source, hits, vis] of trafficSources) {
      ln(`| ${source} | ${hits} | ${vis} | ${pct(hits, totalHits)} |`);
    }
  }
  br();

  // New Accounts
  h(2, 'New Accounts');
  br();
  if (newAccounts.length === 0) {
    ln('No signups today.');
  } else {
    ln(`**${newAccounts.length} new account${newAccounts.length === 1 ? '' : 's'}:**`);
    br();
    ln(`| Time (UTC) | Username | Method |`);
    ln(`|------------|----------|--------|`);
    for (const [username, method, time] of newAccounts) {
      ln(`| ${time} | ${username || '(unknown)'} | ${method} |`);
    }
  }
  br();

  // Geography
  h(2, 'Geography');
  br();
  if (countrySummary.length === 0) {
    ln('No geographic data.');
  } else {
    ln('**By Country:**');
    br();
    const totalGeoVisitors = countrySummary.reduce((s, r) => s + r[1], 0);
    ln(`| Country | Visitors | Share |`);
    ln(`|---------|--------:|---------:|`);
    for (const [country, vis] of countrySummary) {
      ln(`| ${country} | ${vis} | ${pct(vis, totalGeoVisitors)} |`);
    }
    br();
    ln('**Top Locations (City):**');
    br();
    ln(`| Country | City | Visitors |`);
    ln(`|---------|------|--------:|`);
    for (const [country, city, vis] of geoDetails) {
      ln(`| ${country} | ${city} | ${vis} |`);
    }
  }
  br();

  // Key Events
  h(2, 'Key Events');
  br();
  const eventLabels = {
    audio_uploaded: 'Audio Uploads',
    analysis_completed: 'Analyses Completed',
    preset_downloaded: 'Preset Downloads',
    recipe_published: 'Recipes Published',
    checkout_started: 'Checkout Started',
    feedback_submitted: 'Feedback Submitted',
    hero_demo_clicked: 'Hero Demo Clicked',
    hero_cta_clicked: 'Hero CTA Clicked',
    user_signed_up: 'Signups',
    user_signed_in: 'Sign-ins',
    stem_separation_started: 'Stem Separations',
    demo_sound_generated: 'Demo Sound Generated',
    save_prompt_shown: 'Save Prompt Shown',
    save_prompt_converted: 'Save Prompt Converted',
    recipe_viewed: 'Recipe Views',
    search_performed: 'Searches',
    pricing_page_viewed: 'Pricing Page Views',
  };
  ln(`| Event | Count | Prev Day | Change |`);
  ln(`|-------|------:|---------:|--------|`);
  for (const [key, label] of Object.entries(eventLabels)) {
    const curr = evMap[key] || 0;
    const prev = prevEvMap[key] || 0;
    ln(`| ${label} | ${curr} | ${prev} | ${change(curr, prev)} |`);
  }
  br();

  // Funnel
  h(2, 'Conversion Funnel');
  br();
  const { visitors: fVisitors, analyzeVisitors, analysesCompleted, signups: fSignups } = funnel;
  ln(`| Step | Count | Rate |`);
  ln(`|------|------:|-----:|`);
  ln(`| 1. All Visitors | ${fVisitors} | 100% |`);
  ln(`| 2. Visited /analyze | ${analyzeVisitors} | ${pct(analyzeVisitors, fVisitors)} |`);
  ln(`| 3. Completed Analysis | ${analysesCompleted} | ${pct(analysesCompleted, fVisitors)} |`);
  ln(`| 4. Signed Up | ${fSignups} | ${pct(fSignups, fVisitors)} |`);
  br();
  if (fVisitors > 0) {
    ln('**Step conversion rates:**');
    ln(`- Visitor -> /analyze: ${pct(analyzeVisitors, fVisitors)}`);
    ln(`- /analyze -> Analysis: ${pct(analysesCompleted, analyzeVisitors)}`);
    ln(`- Analysis -> Signup: ${pct(fSignups, analysesCompleted)}`);
  }
  br();

  // Device Breakdown
  h(2, 'Device Breakdown');
  br();
  if (devices.length === 0) {
    ln('No device data.');
  } else {
    const totalDevHits = devices.reduce((s, r) => s + r[1], 0);
    ln(`| Device | Pageviews | Visitors | Share |`);
    ln(`|--------|----------:|---------:|------:|`);
    for (const [device, hits, vis] of devices) {
      ln(`| ${device} | ${hits} | ${vis} | ${pct(hits, totalDevHits)} |`);
    }
  }
  br();

  // Actionable Insights
  h(2, 'Actionable Insights');
  br();
  const insights = [];

  // Reddit traffic
  const redditSource = trafficSources.find(r => r[0] && r[0].includes('reddit'));
  if (redditSource) {
    const totalHits = trafficSources.reduce((s, r) => s + r[1], 0);
    insights.push(`- Reddit is driving ${pct(redditSource[1], totalHits)} of traffic (${redditSource[2]} visitors).`);
  }

  // Analyze conversion
  if (fVisitors > 0 && analyzeVisitors > 0) {
    const analyzeRate = ((analyzeVisitors / fVisitors) * 100).toFixed(1);
    const completeRate = analysesCompleted > 0
      ? ((analysesCompleted / analyzeVisitors) * 100).toFixed(1)
      : '0';
    insights.push(`- ${analyzeRate}% of visitors reach /analyze, but only ${completeRate}% of those complete an analysis.`);
    if (parseFloat(completeRate) < 20) {
      insights.push(`- Low analysis completion rate -- consider improving the /analyze page onboarding or CTA.`);
    }
  }

  // Demo click rate
  const demoClicks = evMap['hero_demo_clicked'] || 0;
  if (fVisitors > 0 && demoClicks > 0) {
    insights.push(`- ${pct(demoClicks, fVisitors)} of homepage visitors clicked "See It In Action".`);
  }

  // Signup vs checkout
  const checkouts = evMap['checkout_started'] || 0;
  if (signups > 0 && checkouts > 0) {
    insights.push(`- ${checkouts} of ${signups} new signups started checkout (${pct(checkouts, signups)} conversion to paid).`);
  } else if (signups > 0 && checkouts === 0) {
    insights.push(`- ${signups} signups but 0 checkout attempts -- consider adding upgrade nudges.`);
  }

  // Mobile vs desktop
  const desktopRow = devices.find(r => r[0] && r[0].toLowerCase() === 'desktop');
  const mobileRow = devices.find(r => r[0] && r[0].toLowerCase() === 'mobile');
  if (desktopRow && mobileRow) {
    const dVis = desktopRow[2];
    const mVis = mobileRow[2];
    const totalVis = dVis + mVis;
    if (totalVis > 0) {
      insights.push(`- Desktop: ${pct(dVis, totalVis)} of visitors, Mobile: ${pct(mVis, totalVis)}.`);
    }
  }

  // Visitor trend
  if (visitors > prevVisitors && prevVisitors > 0) {
    const growth = (((visitors - prevVisitors) / prevVisitors) * 100).toFixed(0);
    insights.push(`- Traffic up ${growth}% day-over-day.`);
  } else if (visitors < prevVisitors && prevVisitors > 0) {
    const decline = (((prevVisitors - visitors) / prevVisitors) * 100).toFixed(0);
    insights.push(`- Traffic down ${decline}% day-over-day.`);
  }

  if (insights.length === 0) {
    insights.push('- Not enough data to generate insights. Check back when there is more traffic.');
  }

  for (const insight of insights) {
    ln(insight);
  }
  br();

  ln('---');
  ln(`*Generated at ${new Date().toISOString()} by daily-posthog-report.mjs*`);

  return lines.join('\n');
}

// --- Main ---

async function main() {
  const targetDate = parseTargetDate(process.argv[2]);
  const report = await generateReport(targetDate);

  // Print to stdout
  console.log('\n' + report);

  // Save to file
  const { mkdirSync, writeFileSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const reportsDir = join(__dirname, '..', 'reports');

  mkdirSync(reportsDir, { recursive: true });

  const filename = `analytics-${targetDate}.md`;
  const filepath = join(reportsDir, filename);
  writeFileSync(filepath, report, 'utf-8');

  console.log(`\nReport saved to: ${filepath}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
