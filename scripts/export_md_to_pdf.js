/**
 * Automated Markdown to PDF Exporter
 * Uses marked + GitHub Markdown CSS + Microsoft Edge Headless Print to PDF
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const marked = require('./marked.min.js');

// Custom renderer or extensions for alert blocks
function renderAlerts(html) {
  // Replace > [!NOTE], > [!IMPORTANT], > [!TIP], > [!WARNING], > [!CAUTION]
  return html
    .replace(/<blockquote>\s*<p>\[!NOTE\]\s*<br\s*\/?>([\s\S]*?)<\/blockquote>/gi, '<div class="alert alert-note"><div class="alert-title">ℹ️ NOTE</div><p>$1</div>')
    .replace(/<blockquote>\s*<p>\[!IMPORTANT\]\s*<br\s*\/?>([\s\S]*?)<\/blockquote>/gi, '<div class="alert alert-important"><div class="alert-title">📌 IMPORTANT</div><p>$1</div>')
    .replace(/<blockquote>\s*<p>\[!TIP\]\s*<br\s*\/?>([\s\S]*?)<\/blockquote>/gi, '<div class="alert alert-tip"><div class="alert-title">💡 TIP</div><p>$1</div>')
    .replace(/<blockquote>\s*<p>\[!WARNING\]\s*<br\s*\/?>([\s\S]*?)<\/blockquote>/gi, '<div class="alert alert-warning"><div class="alert-title">⚠️ WARNING</div><p>$1</div>')
    .replace(/<blockquote>\s*<p>\[!CAUTION\]\s*<br\s*\/?>([\s\S]*?)<\/blockquote>/gi, '<div class="alert alert-caution"><div class="alert-title">🚨 CAUTION</div><p>$1</div>');
}

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browserExecutable = fs.existsSync(edgePath) ? edgePath : (fs.existsSync(chromePath) ? chromePath : null);

if (!browserExecutable) {
  console.error('❌ Error: Neither Microsoft Edge nor Google Chrome was found for headless printing.');
  process.exit(1);
}

const cssContent = fs.existsSync(path.join(__dirname, 'github-markdown.min.css'))
  ? fs.readFileSync(path.join(__dirname, 'github-markdown.min.css'), 'utf8')
  : '';

const customPrintCSS = `
  @page {
    size: A4;
    margin: 18mm 16mm 18mm 16mm;
  }
  body {
    background-color: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #24292f;
    line-height: 1.6;
    font-size: 13.5px;
  }
  .markdown-body {
    box-sizing: border-box;
    min-width: 200px;
    max-width: 980px;
    margin: 0 auto;
    padding: 10px;
  }
  h1 {
    font-size: 24px;
    border-bottom: 2px solid #0969da;
    padding-bottom: 8px;
    margin-top: 20px;
    color: #1f2328;
    page-break-after: avoid;
  }
  h2 {
    font-size: 18px;
    border-bottom: 1px solid #d0d7de;
    padding-bottom: 6px;
    margin-top: 18px;
    color: #0969da;
    page-break-after: avoid;
  }
  h3 {
    font-size: 15px;
    margin-top: 14px;
    page-break-after: avoid;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    margin-top: 10px;
    margin-bottom: 15px;
    page-break-inside: avoid;
    font-size: 12px;
  }
  th, td {
    border: 1px solid #d0d7de !important;
    padding: 7px 10px !important;
  }
  th {
    background-color: #f6f8fa !important;
    font-weight: 600;
  }
  tr:nth-child(even) {
    background-color: #fcfcfc;
  }
  pre, code {
    font-family: "Cascadia Code", Consolas, "Courier New", monospace;
    font-size: 11.5px;
  }
  pre {
    background-color: #f6f8fa;
    border-radius: 6px;
    padding: 12px;
    overflow-x: auto;
    border: 1px solid #e1e4e8;
    page-break-inside: avoid;
  }
  blockquote {
    border-left: 4px solid #0969da;
    color: #57606a;
    padding: 8px 16px;
    background-color: #f6f8fa;
    margin: 12px 0;
    border-radius: 0 6px 6px 0;
  }
  .alert {
    padding: 12px 16px;
    margin: 14px 0;
    border-left: 4px solid;
    border-radius: 0 6px 6px 0;
    background: #f6f8fa;
    page-break-inside: avoid;
  }
  .alert-title {
    font-weight: 700;
    margin-bottom: 4px;
    font-size: 13px;
  }
  .alert-important { border-color: #8250df; background-color: #fbefff; color: #5a2e9d; }
  .alert-important .alert-title { color: #8250df; }
  .alert-note { border-color: #0969da; background-color: #ddf4ff; color: #0550ae; }
  .alert-note .alert-title { color: #0969da; }
  .alert-tip { border-color: #1a7f37; background-color: #dafbe1; color: #116329; }
  .alert-tip .alert-title { color: #1a7f37; }
  .alert-warning { border-color: #9a6700; background-color: #fff8c5; color: #7d4e00; }
  .alert-warning .alert-title { color: #9a6700; }
  .alert-caution { border-color: #cf222e; background-color: #ffebe9; color: #a40e26; }
  .alert-caution .alert-title { color: #cf222e; }
  a {
    color: #0969da;
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
`;

function exportMarkdownToPdf(mdRelativePath, pdfRelativePath) {
  const rootDir = path.resolve(__dirname, '..');
  const mdFullPath = path.join(rootDir, mdRelativePath);
  const pdfFullPath = path.join(rootDir, pdfRelativePath);

  if (!fs.existsSync(mdFullPath)) {
    console.warn(`⚠️ Warning: Markdown file not found: ${mdFullPath}`);
    return false;
  }

  const mdContent = fs.readFileSync(mdFullPath, 'utf8');
  let rawHtml = marked.parse(mdContent);
  rawHtml = renderAlerts(rawHtml);

  const fullHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>${path.basename(mdRelativePath, '.md')}</title>
  <style>
    ${cssContent}
    ${customPrintCSS}
  </style>
</head>
<body class="markdown-body">
  ${rawHtml}
</body>
</html>`;

  const tempHtmlPath = path.join(rootDir, `temp_${path.basename(mdRelativePath, '.md')}.html`);
  fs.writeFileSync(tempHtmlPath, fullHtml, 'utf8');

  try {
    const cmd = `"${browserExecutable}" --headless --disable-gpu --no-pdf-header-footer "--print-to-pdf=${pdfFullPath}" "${tempHtmlPath}"`;
    execSync(cmd, { stdio: 'pipe', timeout: 30000 });
    const stats = fs.statSync(pdfFullPath);
    console.log(`✅ Exported: ${pdfRelativePath} (${(stats.size / 1024).toFixed(1)} KB)`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to export ${mdRelativePath} to PDF:`, err.message);
    return false;
  } finally {
    if (fs.existsSync(tempHtmlPath)) {
      try { fs.unlinkSync(tempHtmlPath); } catch (_) {}
    }
  }
}

// Target reports to export as PDF
const filesToExport = [
  { md: 'report.md', pdf: 'report.pdf' },
  { md: 'AI_Audit_Report.md', pdf: 'AI_Audit_Report.pdf' },
  { md: 'README.md', pdf: 'README.pdf' },
  { md: 'bug_reports.md', pdf: 'bug_reports.pdf' },
  { md: 'Human_Review_Report.md', pdf: 'Human_Review_Report.pdf' },
  { md: 'test_cases.md', pdf: 'test_cases.pdf' },
  { md: 'Video_Demo_Script.md', pdf: 'Video_Demo_Script.pdf' }
];

console.log('===========================================================================');
console.log('  EXPORTING MARKDOWN REPORTS TO PDF (HEADLESS CHROMIUM)');
console.log('===========================================================================');

let successCount = 0;
for (const item of filesToExport) {
  if (exportMarkdownToPdf(item.md, item.pdf)) {
    successCount++;
  }
}

console.log('===========================================================================');
console.log(`🎉 Successfully converted ${successCount}/${filesToExport.length} documents to PDF!`);
