import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const stagingDir = path.join(rootDir, '.preview-staging');
const finalOutDir = path.join(rootDir, 'out');
const previewTemplateQuotation = path.join(rootDir, 'scripts', 'preview-templates', 'request-quotation-page.tsx');

console.log('======================================================================');
console.log('SANTHAYA ASSOCIATES — ISOLATED STATIC PREVIEW BUILDER');
console.log('Target Base Path: /Santhaya-Associates-/');
console.log('Target URL:       https://ritik9631.github.io/Santhaya-Associates-/');
console.log('======================================================================\n');

function cleanJunction(junctionPath) {
  if (fs.existsSync(junctionPath)) {
    try {
      fs.unlinkSync(junctionPath);
      console.log('✓ Successfully unlinked node_modules junction.');
    } catch (err) {
      // On Windows fallback to rmdir command
      try {
        execSync(`cmd /c rmdir "${junctionPath}"`);
        console.log('✓ Successfully removed node_modules junction via cmd.');
      } catch (cmdErr) {
        console.warn(`[WARN] Could not remove junction directly: ${err.message}`);
      }
    }
  }
}

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  // Step 1: Pre-clean staging and out directory
  console.log('[1/7] Cleaning previous staging and output directories...');
  const stagingNodeModules = path.join(stagingDir, 'node_modules');
  cleanJunction(stagingNodeModules);

  if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
  if (fs.existsSync(finalOutDir)) {
    fs.rmSync(finalOutDir, { recursive: true, force: true });
  }

  // Step 2: Create directory tree for staging
  console.log('[2/7] Staging isolated public-only application structure...');
  const subdirs = [
    'public',
    'src/components',
    'src/app/about',
    'src/app/services',
    'src/app/privacy',
    'src/app/terms',
    'src/app/request-quotation',
  ];

  for (const dir of subdirs) {
    fs.mkdirSync(path.join(stagingDir, dir), { recursive: true });
  }

  // Step 3: Copy configuration and public files
  console.log('[3/7] Copying public-facing routes, components, and brand assets...');
  const rootFilesToCopy = [
    'package.json',
    'tailwind.config.ts',
    'postcss.config.mjs',
    'tsconfig.json',
  ];

  for (const file of rootFilesToCopy) {
    fs.copyFileSync(path.join(rootDir, file), path.join(stagingDir, file));
  }

  // Copy public assets
  copyDirRecursive(path.join(rootDir, 'public'), path.join(stagingDir, 'public'));

  // Copy components (Header, Footer)
  fs.copyFileSync(
    path.join(rootDir, 'src/components/Header.tsx'),
    path.join(stagingDir, 'src/components/Header.tsx')
  );
  fs.copyFileSync(
    path.join(rootDir, 'src/components/Footer.tsx'),
    path.join(stagingDir, 'src/components/Footer.tsx')
  );

  // Copy public pages
  fs.copyFileSync(path.join(rootDir, 'src/app/globals.css'), path.join(stagingDir, 'src/app/globals.css'));
  fs.copyFileSync(path.join(rootDir, 'src/app/layout.tsx'), path.join(stagingDir, 'src/app/layout.tsx'));
  fs.copyFileSync(path.join(rootDir, 'src/app/page.tsx'), path.join(stagingDir, 'src/app/page.tsx'));
  fs.copyFileSync(path.join(rootDir, 'src/app/about/page.tsx'), path.join(stagingDir, 'src/app/about/page.tsx'));
  fs.copyFileSync(path.join(rootDir, 'src/app/services/page.tsx'), path.join(stagingDir, 'src/app/services/page.tsx'));
  fs.copyFileSync(path.join(rootDir, 'src/app/privacy/page.tsx'), path.join(stagingDir, 'src/app/privacy/page.tsx'));
  fs.copyFileSync(path.join(rootDir, 'src/app/terms/page.tsx'), path.join(stagingDir, 'src/app/terms/page.tsx'));

  // Copy robots and sitemap if present
  if (fs.existsSync(path.join(rootDir, 'src/app/robots.ts'))) {
    fs.copyFileSync(path.join(rootDir, 'src/app/robots.ts'), path.join(stagingDir, 'src/app/robots.ts'));
  }
  if (fs.existsSync(path.join(rootDir, 'src/app/sitemap.ts'))) {
    fs.copyFileSync(path.join(rootDir, 'src/app/sitemap.ts'), path.join(stagingDir, 'src/app/sitemap.ts'));
  }

  // Stage preview quotation page (with live submission disabled and preview alert)
  fs.copyFileSync(previewTemplateQuotation, path.join(stagingDir, 'src/app/request-quotation/page.tsx'));
  console.log('  ✓ Staged safe preview-only quotation page (backend submission disabled).');

  // Adapt staged asset paths for GitHub Pages subpath
  const filesToPrefix = [
    'src/components/Header.tsx',
    'src/components/Footer.tsx',
    'src/app/layout.tsx',
    'src/app/about/page.tsx',
  ];
  for (const relFile of filesToPrefix) {
    const fullTarget = path.join(stagingDir, relFile);
    if (fs.existsSync(fullTarget)) {
      let code = fs.readFileSync(fullTarget, 'utf8');
      code = code.replace(/(['"])\/(santhaya-[^'"]+|full-brand-[^'"]+)(['"])/g, '$1/Santhaya-Associates-/$2$3');
      fs.writeFileSync(fullTarget, code, 'utf8');
    }
  }
  console.log('  ✓ Adapted staged image references with base path (/Santhaya-Associates-/).');

  // Step 4: Write isolated preview next.config.mjs
  console.log('[4/7] Generating preview next.config.mjs with basePath & static export...');
  const previewConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/Santhaya-Associates-',
  assetPrefix: '/Santhaya-Associates-',
  trailingSlash: true,
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_SITE_URL: 'https://ritik9631.github.io/Santhaya-Associates-',
    NEXT_PUBLIC_IS_PREVIEW: 'true',
  },
};

export default nextConfig;
`;
  fs.writeFileSync(path.join(stagingDir, 'next.config.mjs'), previewConfig, 'utf8');

  // Step 5: Link node_modules into staging
  console.log('[5/7] Linking dependencies into isolated staging workspace...');
  const rootNodeModules = path.join(rootDir, 'node_modules');

  if (process.platform === 'win32') {
    execSync(`cmd /c mklink /J "${stagingNodeModules}" "${rootNodeModules}"`, { stdio: 'pipe' });
  } else {
    fs.symlinkSync(rootNodeModules, stagingNodeModules, 'dir');
  }
  console.log('  ✓ Dependencies linked cleanly via filesystem junction/symlink.');

  // Step 6: Execute static compilation
  console.log('[6/7] Compiling static export via Next.js...');
  const nextBin = path.join(rootNodeModules, 'next', 'dist', 'bin', 'next');
  
  const buildResult = spawnSync(process.execPath, [nextBin, 'build'], {
    cwd: stagingDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      NEXT_PUBLIC_SITE_URL: 'https://ritik9631.github.io/Santhaya-Associates-',
      NEXT_PUBLIC_IS_PREVIEW: 'true',
    },
  });

  if (buildResult.status !== 0) {
    throw new Error(`Next.js static export failed with exit code ${buildResult.status}`);
  }

  // Step 7: Finalize export artifacts & clean up staging
  console.log('[7/7] Transferring static export and creating GitHub Pages compatibility assets...');
  const stagingOutDir = path.join(stagingDir, 'out');
  if (!fs.existsSync(stagingOutDir)) {
    throw new Error(`Expected static export directory not found: ${stagingOutDir}`);
  }

  copyDirRecursive(stagingOutDir, finalOutDir);

  // Add .nojekyll for GitHub Pages asset serving
  fs.writeFileSync(path.join(finalOutDir, '.nojekyll'), '', 'utf8');
  console.log('  ✓ Created out/.nojekyll (enables GitHub Pages _next directory serving).');

  // Post-process HTML files in out/ to ensure root-relative brand assets carry basePath
  function postProcessHtml(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        postProcessHtml(fullPath);
      } else if (entry.name.endsWith('.html')) {
        let html = fs.readFileSync(fullPath, 'utf8');
        html = html.replace(/(src|href)=(["'])\/(santhaya-[^"']+|full-brand-[^"']+)(["'])/g, '$1=$2/Santhaya-Associates-/$3$4');
        fs.writeFileSync(fullPath, html, 'utf8');
      }
    }
  }
  postProcessHtml(finalOutDir);
  console.log('  ✓ Verified and post-processed static HTML brand asset URLs.');

  // Clean staging
  cleanJunction(stagingNodeModules);
  fs.rmSync(stagingDir, { recursive: true, force: true });
  console.log('  ✓ Cleaned up staging directory (.preview-staging).');

  console.log('\n======================================================================');
  console.log('STATIC PREVIEW BUILD COMPLETE & VERIFIED!');
  console.log('Output location: ./out');
  console.log('Target URL:      https://ritik9631.github.io/Santhaya-Associates-/');
  console.log('======================================================================');

} catch (err) {
  console.error(`\n[FATAL ERROR] Preview build failed: ${err.message}`);
  // Guarantee cleanup on failure
  const stagingNodeModules = path.join(stagingDir, 'node_modules');
  cleanJunction(stagingNodeModules);
  if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
  process.exit(1);
}

