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
  let loadingStatusText = 'Initiating export...';
  let loadingProgress = 5;

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
    loadingProgress = 5;
    loadingStatusText = 'Launching browser engine...';
    
    // Simulate real-time progress steps for Puppeteer + pdf-lib process
    const progressInterval = setInterval(() => {
      if (loadingProgress < 25) {
        loadingProgress += Math.floor(Math.random() * 3) + 1;
      } else if (loadingProgress < 55) {
        loadingStatusText = 'Rendering markdown document layout...';
        loadingProgress += Math.floor(Math.random() * 2) + 1;
      } else if (loadingProgress < 80) {
        loadingStatusText = 'Compressing embedded fonts...';
        loadingProgress += Math.floor(Math.random() * 2) + 1;
      } else if (loadingProgress < 95) {
        loadingStatusText = 'Rebuilding compressed PDF object streams...';
        loadingProgress += 0.5;
      }
    }, 150);
    
    try {
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if ($user) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      }

      // Kirim Markdown ke backend API kita
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers,
        body: JSON.stringify({ markdown: markdownContent }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || 'Failed to generate PDF');
      }

      loadingStatusText = 'Finalizing download...';
      loadingProgress = 100;

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
      }

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(`Failed to generate PDF: ${error.message}`);
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        isProcessing = false;
      }, 500);
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

<div class="px-6 py-6 font-sans max-w-7xl mx-auto flex flex-col space-y-6">
  <!-- Top Action Bar -->
  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#dddddd] pb-6">
    <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
      <span class="text-[11px] font-bold text-[#9297a0] uppercase tracking-wider select-none">Document Title</span>
      <input type="text" bind:value={documentName} class="bg-white text-[#181d26] border border-[#dddddd] rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[#458fff] focus:ring-1 focus:ring-[#458fff] transition-all font-sans font-medium w-full sm:w-80 shadow-sm" />
    </div>
    
    <button on:click={handleDownloadAndSave} disabled={isProcessing} class="bg-[#181d26] hover:bg-[#0d1218] active:bg-[#0d1218] text-white px-6 py-2.5 rounded-lg font-medium text-xs tracking-wide transition-all duration-150 flex items-center space-x-2 disabled:bg-gray-400 select-none shadow-sm cursor-pointer w-full sm:w-auto justify-center">
      <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
      </svg>
      <span>{isProcessing ? 'Processing PDF...' : 'Download PDF'}</span>
    </button>
  </div>

  <!-- Workspace split screen -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6" style="height: calc(100vh - 180px);">
    <!-- Editor Pane -->
    <div class="flex flex-col h-full">
      <span class="text-[11px] font-bold text-[#9297a0] tracking-wider mb-2 uppercase select-none">Markdown Editor</span>
      <textarea bind:value={markdownContent} class="w-full flex-grow p-5 border border-[#dddddd] rounded-xl focus:outline-none focus:border-[#458fff] focus:ring-1 focus:ring-[#458fff] transition-all shadow-sm resize-none font-mono text-sm leading-relaxed text-[#181d26] bg-[#f8fafc]" placeholder="Write your markdown here..."></textarea>
    </div>

    <!-- Preview Pane -->
    <div class="flex flex-col h-full">
      <span class="text-[11px] font-bold text-[#9297a0] tracking-wider mb-2 uppercase select-none">Document Preview</span>
      <div class="w-full flex-grow p-8 border border-[#dddddd] rounded-xl bg-white shadow-sm overflow-y-auto relative">
        <div id="pdf-preview" class="markdown-preview">
          {@html renderedHtml}
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Loading Overlay -->
{#if isProcessing}
  <div class="fixed inset-0 bg-[#181d26]/40 backdrop-blur-[2px] flex items-center justify-center z-50 transition-all duration-300">
    <div class="bg-white border border-[#dddddd] p-8 rounded-xl shadow-xl max-w-md w-full mx-4 relative overflow-hidden flex flex-col items-center">
      <!-- Brand voltage coral accent strip -->
      <div class="absolute top-0 left-0 right-0 h-1.5 bg-[#aa2d00]"></div>
      
      <!-- Spinning animation -->
      <div class="w-12 h-12 border-4 border-[#e0e2e6] border-t-[#aa2d00] rounded-full animate-spin mb-6"></div>
      
      <h3 class="text-lg font-bold text-[#181d26] mb-1">Optimizing PDF Layout</h3>
      <p class="text-xs text-[#9297a0] mb-6 font-medium tracking-wide uppercase text-center h-4">{loadingStatusText}</p>
      
      <!-- Custom progress bar -->
      <div class="w-full bg-[#e0e2e6] h-1.5 rounded-full overflow-hidden mb-6">
        <div class="bg-[#aa2d00] h-full transition-all duration-200" style="width: {loadingProgress}%"></div>
      </div>
      
      <!-- Explanation box -->
      <div class="bg-[#f5e9d4] rounded-lg p-4 text-left border border-[#dddddd]/50">
        <p class="text-xs text-[#aa2d00] font-bold mb-1 flex items-center">
          <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          Why does this take a few seconds?
        </p>
        <p class="text-xs text-[#333840] leading-relaxed">
          QuickMDtoPDF runs a background browser engine and processes the output using advanced compression to reduce your PDF file size by up to <strong>55%</strong>, ensuring faster sharing and storage.
        </p>
      </div>
    </div>
  </div>
{/if}