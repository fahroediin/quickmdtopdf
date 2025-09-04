<!-- src/routes/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import markdownit from 'markdown-it';
  import jsPDF from 'jspdf';
  import { supabase } from '$lib/supabaseClient';
  import { user } from '$lib/stores.js';
  import { robotoNormalBase64, robotoBoldBase64 } from '$lib/fonts.js';

  // 1. Mengimpor konten dari file .md sebagai teks mentah
 import sampleMarkdown from '$lib/sample.md?raw';

  // 2. Menggunakan konten yang diimpor sebagai nilai awal
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
  const previewElement = document.getElementById('pdf-preview');
  
  previewElement.classList.add('pdf-render-mode');

  try {
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'pt',
      format: 'a4'
    });

    // Menambahkan font dari data Base64 ke file virtual jsPDF
    pdf.addFileToVFS('Roboto-Regular.ttf', robotoNormalBase64);
    pdf.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');

    pdf.addFileToVFS('Roboto-Bold.ttf', robotoBoldBase64);
    pdf.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');

    // Mengatur font default untuk dokumen
    pdf.setFont('Roboto', 'normal');

    const contentWidth = previewElement.offsetWidth;

    // Opsi 'fontFaces' dihapus karena font sudah dimuat secara manual
    await pdf.html(previewElement, {
      callback: function(pdf) {
        pdf.save(`${documentName}.pdf`);
      },
      x: 40,
      y: 40,
      width: 515,
      windowWidth: contentWidth,
      autoPaging: 'text',
      margin: [40, 40, 40, 40]
    });
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
    alert('Failed to generate PDF.');
  } finally {
    previewElement.classList.remove('pdf-render-mode');
    isProcessing = false;
  }
}
</script>

<!-- 3. Memuat font Roboto di browser agar cocok dengan PDF -->
<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
</svelte:head>

<!-- 4. CSS khusus yang hanya aktif saat merender PDF -->
<style>
  :global(.pdf-render-mode) {
    font-family: 'Roboto', sans-serif !important;
  }
  :global(.pdf-render-mode p, 
          .pdf-render-mode h1, 
          .pdf-render-mode h2, 
          .pdf-render-mode h3, 
          .pdf-render-mode h4, 
          .pdf-render-mode ul, 
          .pdf-render-mode ol) {
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

<!-- Bagian HTML/Markup tidak berubah -->
<div class="container mx-auto">
  <div class="flex justify-between items-center mb-4">
    <input
      type="text"
      bind:value={documentName}
      class="text-2xl font-bold p-2 border-b-2 focus:outline-none focus:border-green-500"
    />
    <button
      on:click={handleDownloadAndSave}
      disabled={isProcessing}
      class="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
    >
      {isProcessing ? 'Processing...' : 'Download PDF'}
    </button>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-4" style="height: 75vh;">
    <textarea
      bind:value={markdownContent}
      class="w-full h-full p-4 border rounded-md shadow-sm resize-none font-mono text-sm"
      placeholder="Type your Markdown here..."
    ></textarea>

    <div class="w-full h-full p-4 border rounded-md shadow-sm bg-white overflow-y-auto">
      <div id="pdf-preview" class="prose max-w-none">
        {@html renderedHtml}
      </div>
    </div>
  </div>
</div>