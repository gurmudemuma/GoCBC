const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, '../src/migrations');
const destination = path.join(__dirname, '../dist/migrations');

// The build must not leave stale migrations behind: a migration file that
// was renamed in src (e.g. 062_create_shipping_bookings.sql -> 064) would
// otherwise survive in dist and be applied under its old name on the next
// fresh build, even though src no longer contains it. Wipe the destination
// first, then copy exactly what src holds, so dist/migrations always
// matches src/migrations.
fs.rmSync(destination, { recursive: true, force: true });
fs.cpSync(source, destination, { recursive: true });
