import fs from 'fs';
import crypto from 'crypto';

function hashFile(path) {
  if (!fs.existsSync(path)) return 'NOT FOUND';
  const buf = fs.readFileSync(path);
  return crypto.createHash('sha256').update(buf).digest('hex') + ' (' + buf.length + ' bytes)';
}

console.log('root stamp:     ', hashFile('Santhaya-Associates/public/santhaya-round-stamp.png'));
console.log('branding stamp: ', hashFile('Santhaya-Associates/public/branding/santhaya-round-stamp.png'));
console.log('original stamp: ', hashFile('Santhaya-Associates/public/santhaya-round-stamp-original.png'));
console.log('brand ref:      ', hashFile('Santhaya-Associates/public/branding/full-brand-reference.png'));
console.log('placeholder:    ', hashFile('Santhaya-Associates/public/PLACE-ORIGINAL-LOGO-HERE.txt'));
console.log('header logo:    ', hashFile('Santhaya-Associates/public/branding/santhaya-logo-header.png'));
console.log('symbol:         ', hashFile('Santhaya-Associates/public/branding/santhaya-symbol.png'));

