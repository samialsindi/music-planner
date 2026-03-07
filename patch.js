const fs = require('fs');

const file = './src/app/api/sync/route.ts';
let code = fs.readFileSync(file, 'utf8');

const search = `  const url = process.env.GCAL_ICS_URL;
  if (!url) {
    return NextResponse.json({ error: 'Missing GCAL_ICS_URL env variable.' }, { status: 400 });
  }`;

const replace = `  let url = process.env.GCAL_ICS_URL;

  if (!url) {
    // Try to find any env var that looks like a Google Calendar URL or has CAL/ICS in the name
    const possibleKeys = Object.keys(process.env).filter(key =>
      key.toUpperCase().includes('CAL') ||
      key.toUpperCase().includes('ICS') ||
      key.toUpperCase().includes('URL')
    );

    for (const key of possibleKeys) {
      const val = process.env[key];
      if (typeof val === 'string' && (val.includes('calendar.google.com') || val.endsWith('.ics'))) {
        url = val;
        break;
      }
    }
  }

  if (!url) {
    return NextResponse.json({ error: 'Missing GCAL_ICS_URL env variable.' }, { status: 400 });
  }`;

code = code.replace(search, replace);
fs.writeFileSync(file, code);
