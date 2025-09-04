<!-- src/routes/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import markdownit from 'markdown-it';
  import jsPDF from 'jspdf';
  import { supabase } from '$lib/supabaseClient';
  import { user } from '$lib/stores.js';
  import sampleMarkdown from '$lib/sample.md?raw';

  // --- LOGIKA BARU UNTUK MEMUAT FONT LOKAL ---
  // Impor file font sebagai URL
  import robotoNormalURL from '$lib/fonts/Roboto-Regular.ttf';
  import robotoBoldURL from '$lib/fonts/Roboto-Bold.ttf';

  // Fungsi untuk mengubah file menjadi Base64
  async function fileToBase64(url) {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]); // Ambil hanya data Base64
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  let markdownContent = sampleMarkdown;
  let renderedHtml = '';
  let documentName = 'Untitled Document';
  let isProcessing = false;

  const md = markdownit();

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
      throw new Error('Network response was not ok');
    }

    // Ambil PDF yang dikembalikan sebagai blob
    const pdfBlob = await response.blob();

    // Buat URL sementara untuk blob tersebut
    const url = window.URL.createObjectURL(pdfBlob);
    
    // Buat link sementara untuk memicu unduhan
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `${documentName}.pdf`; // Gunakan nama dokumen dari input
    document.body.appendChild(a);
    a.click();
    
    // Bersihkan URL sementara
    window.URL.revokeObjectURL(url);
    a.remove();

    // Logika penyimpanan ke Supabase (tetap sama)
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
    alert('Failed to generate PDF. Check the server console for details.');
  } finally {
    isProcessing = false;
  }
}
</script>

<!-- Sisa file (svelte:head, style, HTML) tidak berubah -->
<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
</svelte:head>

<style>
  :global(.pdf-render-mode) {
    font-family: 'Roboto', sans-serif !important;
  }
  :global(.pdf-render-mode p, .pdf-render-mode h1, .pdf-render-mode h2, .pdf-render-mode h3, .pdf-render-mode h4, .pdf-render-mode ul, .pdf-render-mode ol) {
    margin-top: 0 !important;
    margin-bottom: 12px !important;
    line-height: 1.5 !important;
  }
  :global(.pdf-render-mode ul), :global(.pdf-render-mode ol) {
    padding-left: 20px !important;
    margin-left: 10px !important;
  }
  :global(.pdf-render-mode li) {
    margin-bottom: 5px !important;
  }
  :global(.pdf-render-mode pre) {
    padding: 10px !important;
    background-color: #f3f4f6 !important;
    white-space: pre-wrap !important;
    word-break: break-all !important;
  }
</style>

<div class="container mx-auto">
  <div class="flex justify-between items-center mb-4">
    <input type="text" bind:value={documentName} class="text-2xl font-bold p-2 border-b-2 focus:outline-none focus:border-green-500" />
    <button on:click={handleDownloadAndSave} disabled={isProcessing} class="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
      {isProcessing ? 'Processing...' : 'Download PDF'}
    </button>
  </div>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4" style="height: 75vh;">
    <textarea bind:value={markdownContent} class="w-full h-full p-4 border rounded-md shadow-sm resize-none font-mono text-sm" placeholder="Type your Markdown here..."></textarea>
    <div class="w-full h-full p-4 border rounded-md shadow-sm bg-white overflow-y-auto">
      <div id="pdf-preview" class="prose max-w-none">
        {@html renderedHtml}
      </div>
    </div>
  </div>
</div>