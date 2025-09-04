// src/routes/api/generate-pdf/+server.js

import puppeteer from 'puppeteer';
import markdownit from 'markdown-it';

// Inisialisasi markdown-it. Defaultnya sudah sangat bagus.
const md = markdownit();

export async function POST({ request }) {
  const { markdown } = await request.json();
  const contentHtml = md.render(markdown);

  // --- CSS YANG DISEMPURNAKAN (GAYA GITHUB) ---
  // CSS ini akan menata semua elemen Markdown dengan benar.
  const css = `
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
        font-size: 12pt;
        line-height: 1.6;
        color: #24292e;
      }
      h1, h2, h3, h4, h5, h6 {
        margin-top: 24px;
        margin-bottom: 16px;
        font-weight: 600;
        line-height: 1.25;
      }
      h1 { font-size: 2em; padding-bottom: .3em; border-bottom: 1px solid #eaecef; }
      h2 { font-size: 1.5em; padding-bottom: .3em; border-bottom: 1px solid #eaecef; }
      h3 { font-size: 1.25em; }
      h4 { font-size: 1em; }
      h5 { font-size: .875em; }
      h6 { font-size: .85em; color: #6a737d; }
      p, blockquote, ul, ol, dl, table {
        margin-top: 0;
        margin-bottom: 16px;
      }
      ul, ol {
        padding-left: 2em;
      }
      li > p {
        margin-top: 0;
      }
      code {
        font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
        font-size: 11pt;
        background-color: rgba(27,31,35,.05);
        padding: .2em .4em;
        margin: 0;
        border-radius: 3px;
      }
      pre {
        padding: 16px;
        overflow: auto;
        font-size: 85%;
        line-height: 1.45;
        background-color: #f6f8fa;
        border-radius: 3px;
      }
      pre code {
        background-color: transparent;
        padding: 0;
        margin: 0;
      }
      strong {
        font-weight: 600;
      }
      em {
        font-style: italic;
      }
    </style>
  `;

  const fullHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8">${css}</head><body>${contentHtml}</body></html>`;

  // Logika Puppeteer tetap sama
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '1in',
      right: '1in',
      bottom: '1in',
      left: '1in'
    }
  });

  await browser.close();

  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="document.pdf"'
    }
  });
}