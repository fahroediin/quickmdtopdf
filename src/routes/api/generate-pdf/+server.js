// src/routes/api/generate-pdf/+server.js

import puppeteer from 'puppeteer';
import markdownit from 'markdown-it';

// Inisialisasi markdown-it dengan opsi lengkap
const md = markdownit({
  html: true,        // Izinkan tag HTML di dalam Markdown
  linkify: true,     // Auto-detect URL dan jadikan link
  typographer: true  // Smart quotes, dashes, dll
});

export async function POST({ request }) {
  let browser = null;

  try {
    const { markdown } = await request.json();

    if (!markdown || typeof markdown !== 'string') {
      return new Response(JSON.stringify({ error: 'Markdown content is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const contentHtml = md.render(markdown);

    // --- CSS LENGKAP GAYA GITHUB ---
    // Mencakup SEMUA elemen Markdown: heading, paragraph, list, table,
    // code block, blockquote, link, image, hr, bold, italic, task list.
    const css = `
      <style>
        /* === BASE === */
        * {
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
          font-size: 12pt;
          line-height: 1.6;
          color: #24292e;
          max-width: 100%;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        /* === PAGE BREAK RULES === */
        @page {
          margin: 0;
        }

        h1, h2, h3, h4, h5, h6 {
          page-break-after: avoid;
          break-after: avoid;
        }

        pre, table, blockquote, figure, img {
          page-break-inside: avoid;
          break-inside: avoid;
        }

        /* Pastikan tidak ada orphan/widow */
        p {
          orphans: 3;
          widows: 3;
        }

        /* === HEADINGS === */
        h1, h2, h3, h4, h5, h6 {
          margin-top: 24px;
          margin-bottom: 16px;
          font-weight: 600;
          line-height: 1.25;
        }

        h1 {
          font-size: 2em;
          padding-bottom: 0.3em;
          border-bottom: 1px solid #eaecef;
        }

        h2 {
          font-size: 1.5em;
          padding-bottom: 0.3em;
          border-bottom: 1px solid #eaecef;
        }

        h3 { font-size: 1.25em; }
        h4 { font-size: 1em; }
        h5 { font-size: 0.875em; }
        h6 { font-size: 0.85em; color: #6a737d; }

        /* Heading pertama di dokumen tidak perlu margin top besar */
        body > h1:first-child,
        body > h2:first-child,
        body > h3:first-child {
          margin-top: 0;
        }

        /* === PARAGRAPH & INLINE === */
        p {
          margin-top: 0;
          margin-bottom: 16px;
        }

        strong {
          font-weight: 600;
        }

        em {
          font-style: italic;
        }

        del {
          text-decoration: line-through;
          color: #6a737d;
        }

        /* === LINKS === */
        a {
          color: #0366d6;
          text-decoration: none;
        }

        a:hover {
          text-decoration: underline;
        }

        /* === LISTS === */
        ul, ol {
          margin-top: 0;
          margin-bottom: 16px;
          padding-left: 2em;
        }

        li {
          margin-bottom: 4px;
        }

        li > p {
          margin-top: 0;
          margin-bottom: 8px;
        }

        /* Nested lists */
        li > ul,
        li > ol {
          margin-top: 4px;
          margin-bottom: 4px;
        }

        /* Task list / checkbox list */
        ul.contains-task-list {
          list-style-type: none;
          padding-left: 1.5em;
        }

        li.task-list-item {
          position: relative;
        }

        input[type="checkbox"] {
          margin-right: 0.5em;
          vertical-align: middle;
        }

        /* === BLOCKQUOTE === */
        blockquote {
          margin: 0 0 16px 0;
          padding: 0.5em 1em;
          color: #6a737d;
          border-left: 4px solid #dfe2e5;
          background-color: #f8f9fa;
        }

        blockquote > p {
          margin-bottom: 8px;
        }

        blockquote > p:last-child {
          margin-bottom: 0;
        }

        /* Nested blockquotes */
        blockquote blockquote {
          margin-top: 8px;
          border-left-color: #c8ccd0;
        }

        /* === CODE — INLINE === */
        code {
          font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
          font-size: 0.9em;
          background-color: rgba(27, 31, 35, 0.05);
          padding: 0.2em 0.4em;
          margin: 0;
          border-radius: 3px;
        }

        /* === CODE — BLOCK === */
        pre {
          padding: 16px;
          overflow: auto;
          font-size: 0.85em;
          line-height: 1.45;
          background-color: #f6f8fa;
          border-radius: 6px;
          border: 1px solid #e1e4e8;
          margin-top: 0;
          margin-bottom: 16px;
          /* Penting: wrap code panjang agar tidak keluar halaman */
          white-space: pre-wrap;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        pre code {
          background-color: transparent;
          padding: 0;
          margin: 0;
          border-radius: 0;
          font-size: inherit;
          white-space: pre-wrap;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        /* === TABLE === */
        table {
          border-collapse: collapse;
          border-spacing: 0;
          width: 100%;
          margin-top: 0;
          margin-bottom: 16px;
          display: table;
        }

        thead {
          display: table-header-group;
        }

        tbody {
          display: table-row-group;
        }

        tr {
          border-top: 1px solid #c6cbd1;
        }

        /* Zebra striping */
        tbody tr:nth-child(even) {
          background-color: #f6f8fa;
        }

        th, td {
          padding: 8px 13px;
          border: 1px solid #dfe2e5;
          text-align: left;
        }

        th {
          font-weight: 600;
          background-color: #f1f3f5;
        }

        /* === HORIZONTAL RULE === */
        hr {
          height: 3px;
          padding: 0;
          margin: 24px 0;
          background-color: #e1e4e8;
          border: 0;
          border-radius: 2px;
        }

        /* === IMAGE === */
        img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 16px 0;
          border-radius: 4px;
        }

        /* === DEFINITION LIST === */
        dl {
          margin-top: 0;
          margin-bottom: 16px;
        }

        dt {
          font-weight: 600;
          margin-top: 12px;
        }

        dd {
          margin-left: 2em;
          margin-bottom: 8px;
        }

        /* === MISC === */
        mark {
          background-color: #fff3cd;
          padding: 0.1em 0.3em;
          border-radius: 2px;
        }

        sup, sub {
          font-size: 0.75em;
          line-height: 0;
          position: relative;
          vertical-align: baseline;
        }

        sup { top: -0.5em; }
        sub { bottom: -0.25em; }

        /* === PRINT OPTIMIZATIONS === */
        @media print {
          body {
            color: #000;
          }

          a {
            color: #0366d6;
          }

          pre, code {
            background-color: #f6f8fa !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          blockquote {
            border-left-color: #dfe2e5 !important;
            background-color: #f8f9fa !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          th {
            background-color: #f1f3f5 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          tbody tr:nth-child(even) {
            background-color: #f6f8fa !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    `;

    const fullHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${css}
</head>
<body>
  ${contentHtml}
</body>
</html>`;

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '25.4mm',
        right: '25.4mm',
        bottom: '25.4mm',
        left: '25.4mm'
      },
      preferCSSPageSize: false
    });

    await browser.close();
    browser = null;

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="document.pdf"'
      }
    });

  } catch (error) {
    console.error('Error generating PDF:', error);

    // Pastikan browser ditutup jika terjadi error
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }

    return new Response(JSON.stringify({
      error: 'Failed to generate PDF',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}