<!-- src/routes/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import markdownit from 'markdown-it';
  import { supabase } from '$lib/supabaseClient';
  import { user } from '$lib/stores.js';
  import sampleMarkdown from '$lib/sample.md?raw';

  let markdownContent = sampleMarkdown;
  let renderedHtml = '';
  let documentName = 'Untitled Document';
  let isProcessing = false;

  // Konfigurasi markdown-it SAMA dengan server
  const md = markdownit({
    html: true,
    linkify: true,
    typographer: true
  });

  function renderMarkdown(content) {
    renderedHtml = md.render(content);
  }

  onMount(() => {
    renderMarkdown(markdownContent);
  });

  $: renderMarkdown(markdownContent);

  async function handleDownloadAndSave() {
    isProcessing = true;
    
    try {
      // Kirim Markdown ke backend API kita
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ markdown: markdownContent }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || 'Failed to generate PDF');
      }

      // Ambil PDF yang dikembalikan sebagai blob
      const pdfBlob = await response.blob();

      // Buat URL sementara untuk blob tersebut
      const url = window.URL.createObjectURL(pdfBlob);
      
      // Buat link sementara untuk memicu unduhan
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${documentName}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Bersihkan URL sementara
      window.URL.revokeObjectURL(url);
      a.remove();

      // Logika penyimpanan ke Supabase
      if ($user) {
        const { error } = await supabase
          .from('documents')
          .insert({
            user_id: $user.id,
            document_name: documentName,
            markdown_content: markdownContent
          });
        if (error) throw error;
        alert('PDF downloaded and document saved to your account!');
      } else {
        alert('PDF downloaded! Login to save your documents.');
      }

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(`Failed to generate PDF: ${error.message}`);
    } finally {
      isProcessing = false;
    }
  }
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</svelte:head>

<style>
  /* === PREVIEW STYLING (GITHUB-STYLE) ===
   * CSS ini di-mirror dari server CSS agar preview match dengan PDF output.
   * Ini menciptakan pengalaman WYSIWYG yang sesungguhnya.
   */

  .markdown-preview {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: #24292e;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  /* Headings */
  .markdown-preview :global(h1),
  .markdown-preview :global(h2),
  .markdown-preview :global(h3),
  .markdown-preview :global(h4),
  .markdown-preview :global(h5),
  .markdown-preview :global(h6) {
    margin-top: 24px;
    margin-bottom: 16px;
    font-weight: 600;
    line-height: 1.25;
  }

  .markdown-preview :global(h1) {
    font-size: 2em;
    padding-bottom: 0.3em;
    border-bottom: 1px solid #eaecef;
  }

  .markdown-preview :global(h2) {
    font-size: 1.5em;
    padding-bottom: 0.3em;
    border-bottom: 1px solid #eaecef;
  }

  .markdown-preview :global(h3) { font-size: 1.25em; }
  .markdown-preview :global(h4) { font-size: 1em; }
  .markdown-preview :global(h5) { font-size: 0.875em; }
  .markdown-preview :global(h6) { font-size: 0.85em; color: #6a737d; }

  .markdown-preview :global(h1:first-child),
  .markdown-preview :global(h2:first-child),
  .markdown-preview :global(h3:first-child) {
    margin-top: 0;
  }

  /* Paragraph */
  .markdown-preview :global(p) {
    margin-top: 0;
    margin-bottom: 16px;
  }

  /* Strong & Emphasis */
  .markdown-preview :global(strong) { font-weight: 600; }
  .markdown-preview :global(em) { font-style: italic; }
  .markdown-preview :global(del) { text-decoration: line-through; color: #6a737d; }

  /* Links */
  .markdown-preview :global(a) {
    color: #0366d6;
    text-decoration: none;
  }

  .markdown-preview :global(a:hover) {
    text-decoration: underline;
  }

  /* Lists */
  .markdown-preview :global(ul),
  .markdown-preview :global(ol) {
    margin-top: 0;
    margin-bottom: 16px;
    padding-left: 2em;
  }

  .markdown-preview :global(li) {
    margin-bottom: 4px;
  }

  .markdown-preview :global(li > p) {
    margin-top: 0;
    margin-bottom: 8px;
  }

  .markdown-preview :global(li > ul),
  .markdown-preview :global(li > ol) {
    margin-top: 4px;
    margin-bottom: 4px;
  }

  /* Blockquote */
  .markdown-preview :global(blockquote) {
    margin: 0 0 16px 0;
    padding: 0.5em 1em;
    color: #6a737d;
    border-left: 4px solid #dfe2e5;
    background-color: #f8f9fa;
    border-radius: 0 4px 4px 0;
  }

  .markdown-preview :global(blockquote > p) {
    margin-bottom: 8px;
  }

  .markdown-preview :global(blockquote > p:last-child) {
    margin-bottom: 0;
  }

  .markdown-preview :global(blockquote blockquote) {
    margin-top: 8px;
    border-left-color: #c8ccd0;
  }

  /* Inline Code */
  .markdown-preview :global(code) {
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
    font-size: 0.9em;
    background-color: rgba(27, 31, 35, 0.05);
    padding: 0.2em 0.4em;
    margin: 0;
    border-radius: 3px;
  }

  /* Code Block */
  .markdown-preview :global(pre) {
    padding: 16px;
    overflow: auto;
    font-size: 0.85em;
    line-height: 1.45;
    background-color: #f6f8fa;
    border-radius: 6px;
    border: 1px solid #e1e4e8;
    margin-top: 0;
    margin-bottom: 16px;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  .markdown-preview :global(pre code) {
    background-color: transparent;
    padding: 0;
    margin: 0;
    border-radius: 0;
    font-size: inherit;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  /* Table */
  .markdown-preview :global(table) {
    border-collapse: collapse;
    border-spacing: 0;
    width: 100%;
    margin-top: 0;
    margin-bottom: 16px;
    display: table;
  }

  .markdown-preview :global(tr) {
    border-top: 1px solid #c6cbd1;
  }

  .markdown-preview :global(tbody tr:nth-child(even)) {
    background-color: #f6f8fa;
  }

  .markdown-preview :global(th),
  .markdown-preview :global(td) {
    padding: 8px 13px;
    border: 1px solid #dfe2e5;
    text-align: left;
  }

  .markdown-preview :global(th) {
    font-weight: 600;
    background-color: #f1f3f5;
  }

  /* Horizontal Rule */
  .markdown-preview :global(hr) {
    height: 3px;
    padding: 0;
    margin: 24px 0;
    background-color: #e1e4e8;
    border: 0;
    border-radius: 2px;
  }

  /* Image */
  .markdown-preview :global(img) {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 16px 0;
    border-radius: 4px;
  }
</style>

<div class="container mx-auto">
  <div class="flex justify-between items-center mb-4">
    <input type="text" bind:value={documentName} class="text-2xl font-bold p-2 border-b-2 focus:outline-none focus:border-green-500" />
    <button on:click={handleDownloadAndSave} disabled={isProcessing} class="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors">
      {isProcessing ? 'Processing...' : 'Download PDF'}
    </button>
  </div>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4" style="height: 75vh;">
    <textarea bind:value={markdownContent} class="w-full h-full p-4 border rounded-md shadow-sm resize-none font-mono text-sm" placeholder="Type your Markdown here..."></textarea>
    <div class="w-full h-full p-4 border rounded-md shadow-sm bg-white overflow-y-auto">
      <div id="pdf-preview" class="markdown-preview">
        {@html renderedHtml}
      </div>
    </div>
  </div>
</div>