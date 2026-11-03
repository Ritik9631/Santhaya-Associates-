import fs from 'fs';
import path from 'path';

function listDir(d) {
  const entries = fs.readdirSync(d, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(d, e.name);
    if (e.isDirectory()) {
      listDir(full);
    } else {
      console.log(full);
    }
  }
}

listDir('Santhaya-Associates/supabase');

