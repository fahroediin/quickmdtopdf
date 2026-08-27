<!-- src/routes/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import markdownit from 'markdown-it';
  import { supabase } from '$lib/supabaseClient';
  import { user } from '$lib/stores.js';
  import sampleMarkdown from '$lib/sample.md?raw';
  import { PUBLIC_GOOGLE_CLIENT_ID } from '$env/static/public';

  let markdownContent = sampleMarkdown;
  let renderedHtml = '';
  let documentName = 'Untitled Document';
  let isProcessing = false;
  let loadingStatusText = 'Initiating export...';
  let loadingProgress = 5;
  let currentDocumentId = null;
  let isDocLoading = false;
  let isSaving = false;
  let isTitleManuallyEdited = false;
  
  const googleClientId = PUBLIC_GOOGLE_CLIENT_ID;
  let isUploadingToDrive = false;
  let gdriveLink = '';
  let showDriveInstructions = false;
  let gdriveFolderUrl = '';
  let showDriveSettings = false;

  function extractFolderId(urlOrId) {
    if (!urlOrId) return null;
    const trimmed = urlOrId.trim();
    if (trimmed.includes('drive.google.com')) {
      const match = trimmed.match(/\/folders\/([a-zA-Z0-9-_]+)/);
      return match ? match[1] : null;
    }
    return trimmed;
  }

  function handleSaveFolderUrl() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('qmd_gdrive_folder_url', gdriveFolderUrl);
    }
  }

  function extractDocumentName(mdText) {
    if (!mdText) return '';
    const lines = mdText.split('\n');
    for (let line of lines) {
      line = line.trim();
      if (line.startsWith('#')) {
        // Strip # and trim
        let title = line.replace(/^#+\s*/, '').trim();
        // Remove common profiling titles prefixes
        title = title.replace(/^(intelligence brief|company profile|profile|laporan)\s*:\s*/i, '');
        // Replace invalid filename characters
        title = title.replace(/[/\\?%*:|"<>]/g, '-').trim();
        return title;
      }
    }
    return '';
  }

  $: if (!isTitleManuallyEdited && markdownContent) {
    const extracted = extractDocumentName(markdownContent);
    if (extracted) {
      documentName = extracted;
    }
  }

  // Konfigurasi markdown-it SAMA dengan server
  const md = markdownit({
    html: true,
    linkify: true,
    typographer: true
  });

  function renderMarkdown(content) {
    renderedHtml = md.render(content);
  }

  onMount(async () => {
    // Load Google Identity Services script
    if (typeof window !== 'undefined') {
      gdriveFolderUrl = localStorage.getItem('qmd_gdrive_folder_url') || '';
      
      if (!window.google) {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    }

    renderMarkdown(markdownContent);

    const urlParams = new URLSearchParams(window.location.search);
    const docId = urlParams.get('id');

    if (docId) {
      isDocLoading = true;
      try {
        let sessionUser = $user;
        if (!sessionUser) {
          const { data: { session } } = await supabase.auth.getSession();
          sessionUser = session?.user;
          if (sessionUser) {
            user.set(sessionUser);
          }
        }

        if (!sessionUser) {
          alert('You must be logged in to view this document.');
          window.location.href = '/login';
          return;
        }

        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('id', docId)
          .eq('user_id', sessionUser.id)
          .single();

        if (error || !data) {
          console.error('Error fetching document:', error);
          alert('Document not found or access denied.');
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('id');
          window.history.replaceState({}, '', newUrl);
        } else {
          documentName = data.document_name;
          markdownContent = data.markdown_content;
          currentDocumentId = data.id;
          isTitleManuallyEdited = true;
          renderMarkdown(markdownContent);
        }
      } catch (err) {
        console.error('Failed to load document:', err);
      } finally {
        isDocLoading = false;
      }
    }
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
      // Get today's date formatted as DD-MMMM-YYYY (e.g. 28-Agustus-2026)
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mmmm = months[today.getMonth()];
      const yyyy = today.getFullYear();
      const currentDateString = `${dd}-${mmmm}-${yyyy}`;
      
      // Normalize filename spacing to underscores and strip non-ASCII characters to keep HTTP/filesystems safe
      let downloadFileName = documentName.trim()
        .replace(/\s+/g, '_')
        .replace(/[^\x00-\x7F]/g, '');
      
      // Append date if not already present
      const dateRegex = /_\d{2}-[a-zA-Z\u00C0-\u017F]+-\d{4}$/;
      if (!dateRegex.test(downloadFileName)) {
        downloadFileName = `${downloadFileName}_${currentDateString}`;
      }

      a.download = `${downloadFileName}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Bersihkan URL sementara
      window.URL.revokeObjectURL(url);
      a.remove();

      // Logika penyimpanan ke Supabase
      if ($user) {
        if (currentDocumentId) {
          const { error } = await supabase
            .from('documents')
            .update({
              document_name: documentName,
              markdown_content: markdownContent
            })
            .eq('id', currentDocumentId)
            .eq('user_id', $user.id);
          if (error) throw error;
        } else {
          const { data, error } = await supabase
            .from('documents')
            .insert({
              user_id: $user.id,
              document_name: documentName,
              markdown_content: markdownContent
            })
            .select()
            .single();
          if (error) throw error;
          if (data) {
            currentDocumentId = data.id;
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set('id', data.id);
            window.history.replaceState({}, '', newUrl);
          }
        }
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

  async function handleSaveOnly() {
    if (!$user) return;
    isSaving = true;
    try {
      if (currentDocumentId) {
        const { error } = await supabase
          .from('documents')
          .update({
            document_name: documentName,
            markdown_content: markdownContent
          })
          .eq('id', currentDocumentId)
          .eq('user_id', $user.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('documents')
          .insert({
            user_id: $user.id,
            document_name: documentName,
            markdown_content: markdownContent
          })
          .select()
          .single();
        if (error) throw error;
        if (data) {
          currentDocumentId = data.id;
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.set('id', data.id);
          window.history.replaceState({}, '', newUrl);
        }
      }
      alert('Document saved successfully!');
    } catch (error) {
      console.error('Error saving document:', error);
      alert(`Failed to save document: ${error.message}`);
    } finally {
      isSaving = false;
    }
  }

  async function handleUploadToDrive() {
    if (!googleClientId) {
      showDriveInstructions = true;
      return;
    }

    isUploadingToDrive = true;
    try {
      // 1. Generate the PDF blob by hitting our backend API
      loadingStatusText = 'Generating PDF for Google Drive...';
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if ($user) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      }

      const pdfResponse = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers,
        body: JSON.stringify({ markdown: markdownContent }),
      });

      if (!pdfResponse.ok) {
        throw new Error('Failed to generate PDF for upload.');
      }

      const pdfBlob = await pdfResponse.blob();

      // Get today's date formatted as DD-MMMM-YYYY
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mmmm = months[today.getMonth()];
      const yyyy = today.getFullYear();
      const currentDateString = `${dd}-${mmmm}-${yyyy}`;
      
      // Normalize filename spacing to underscores and strip non-ASCII characters to keep HTTP/filesystems safe
      let uploadFileName = documentName.trim()
        .replace(/\s+/g, '_')
        .replace(/[^\x00-\x7F]/g, '');
      
      const dateRegex = /_\d{2}-[a-zA-Z\u00C0-\u017F]+-\d{4}$/;
      if (!dateRegex.test(uploadFileName)) {
        uploadFileName = `${uploadFileName}_${currentDateString}`;
      }

      const finalFilename = `${uploadFileName}.pdf`;

      // 2. Request Google OAuth Token using Google Identity Services (GIS)
      if (typeof window.google === 'undefined') {
        throw new Error('Google Identity Services library not loaded yet. Please wait a moment and try again.');
      }

      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: 'https://www.googleapis.com/auth/drive',
        callback: async (tokenResponse) => {
          if (tokenResponse.error !== undefined) {
            isUploadingToDrive = false;
            console.error('Google OAuth error:', tokenResponse);
            alert(`Google authentication failed: ${tokenResponse.error}`);
            return;
          }

          const accessToken = tokenResponse.access_token;
          loadingStatusText = 'Uploading PDF to Google Drive...';

          try {
             // 3. Upload to Google Drive using multipart upload
             const folderId = extractFolderId(gdriveFolderUrl);
             const metadata = {
               name: finalFilename,
               mimeType: 'application/pdf',
             };
             
             if (folderId) {
               metadata.parents = [folderId];
             }

            const formData = new FormData();
            formData.append(
              'metadata',
              new Blob([JSON.stringify(metadata)], { type: 'application/json' })
            );
            formData.append('file', pdfBlob);

            const uploadResponse = await fetch(
              'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
                body: formData,
              }
            );

            if (!uploadResponse.ok) {
              const errDetails = await uploadResponse.text();
              throw new Error(`GDrive upload HTTP error: ${uploadResponse.status} - ${errDetails}`);
            }

            const fileData = await uploadResponse.json();
            gdriveLink = fileData.webViewLink;
            alert('File uploaded to Google Drive successfully!');
          } catch (uploadErr) {
            console.error('Error uploading to GDrive:', uploadErr);
            alert(`Failed to upload to Google Drive: ${uploadErr.message}`);
          } finally {
            isUploadingToDrive = false;
          }
        },
      });

      tokenClient.requestAccessToken({ prompt: 'consent' });

    } catch (err) {
      console.error(err);
      alert(`Google Drive Upload failed: ${err.message}`);
      isUploadingToDrive = false;
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
  <!-- Google Drive Alert Banner -->
  {#if gdriveLink}
    <div class="bg-[#e8f0fe] border border-[#1a73e8]/30 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm">
      <div class="flex items-center space-x-3">
        <div class="bg-[#1a73e8] text-white p-2 rounded-lg">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h4 class="text-sm font-bold text-[#181d26]">Uploaded to Google Drive successfully!</h4>
          <p class="text-xs text-[#1a73e8] font-medium truncate max-w-lg">{gdriveLink}</p>
        </div>
      </div>
      <div class="flex items-center space-x-2 w-full sm:w-auto">
        <button on:click={() => { navigator.clipboard.writeText(gdriveLink); alert('Link copied to clipboard!'); }} class="bg-[#1a73e8] hover:bg-[#1557b0] text-white px-4 py-2 rounded-lg font-medium text-xs tracking-wide transition-all shadow-sm cursor-pointer select-none w-full sm:w-auto text-center">
          Copy Link
        </button>
        <button on:click={() => gdriveLink = ''} class="bg-white hover:bg-gray-100 text-gray-500 border border-[#dddddd] px-3 py-2 rounded-lg font-medium text-xs transition-all shadow-sm cursor-pointer select-none">
          Dismiss
        </button>
      </div>
    </div>
  {/if}

  <!-- Google Drive Instructions Modal -->
  {#if showDriveInstructions}
    <div class="fixed inset-0 bg-[#181d26]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white border border-[#dddddd] rounded-2xl shadow-xl max-w-md w-full p-6 relative overflow-hidden">
        <div class="absolute top-0 left-0 right-0 h-1 bg-[#1a73e8]"></div>
        <h3 class="text-base font-bold text-[#181d26] mb-2">Google Drive Integration Not Configured</h3>
        <p class="text-xs text-[#8a8d94] leading-relaxed mb-4">
          To enable Google Drive upload, you need to configure a Google OAuth Client ID in your application configuration.
        </p>
        <div class="bg-gray-50 border border-[#dddddd] p-3 rounded-lg text-left text-[11px] text-[#333840] space-y-2 mb-6 font-mono">
          <p class="font-bold text-gray-600 uppercase tracking-wider text-[10px]">Setup Instructions:</p>
          <p>1. Open Google Cloud Console.</p>
          <p>2. Enable the Google Drive API.</p>
          <p>3. Create an OAuth 2.0 Client ID for your Web Application domain.</p>
          <p>4. Add this line to your .env file:</p>
          <p class="text-[#aa2d00] font-semibold bg-white p-1 border border-dashed border-gray-300 rounded">PUBLIC_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com</p>
        </div>
        <div class="flex justify-end space-x-2">
          <button on:click={() => showDriveInstructions = false} class="bg-[#181d26] hover:bg-[#0d1218] text-white px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all shadow-sm cursor-pointer">
            Close
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Top Action Bar -->
  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#dddddd] pb-6">
    <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
      <span class="text-[11px] font-bold text-[#9297a0] uppercase tracking-wider select-none">Document Title</span>
      <input type="text" bind:value={documentName} on:input={() => isTitleManuallyEdited = true} class="bg-white text-[#181d26] border border-[#dddddd] rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[#458fff] focus:ring-1 focus:ring-[#458fff] transition-all font-sans font-medium w-full sm:w-80 shadow-sm" />
    </div>
    
    <div class="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
      {#if $user}
        <button on:click={handleSaveOnly} disabled={isProcessing || isSaving || isUploadingToDrive} class="bg-white hover:bg-[#f8fafc] text-[#181d26] border border-[#dddddd] px-6 py-2.5 rounded-lg font-medium text-xs tracking-wide transition-all duration-150 flex items-center space-x-2 disabled:bg-gray-100 disabled:text-gray-400 select-none shadow-sm cursor-pointer w-full sm:w-auto justify-center">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
          </svg>
          <span>{isSaving ? 'Saving...' : 'Save Document'}</span>
        </button>

        <button on:click={handleUploadToDrive} disabled={isProcessing || isSaving || isUploadingToDrive} class="bg-white hover:bg-[#f8fafc] text-[#1a73e8] border border-[#1a73e8]/30 px-6 py-2.5 rounded-lg font-medium text-xs tracking-wide transition-all duration-150 flex items-center space-x-2 disabled:bg-gray-100 disabled:text-gray-400 select-none shadow-sm cursor-pointer w-full sm:w-auto justify-center">
          <svg class="w-4 h-4 text-[#1a73e8]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span>{isUploadingToDrive ? 'Uploading...' : 'Upload to GDrive'}</span>
        </button>

        <button type="button" on:click={() => showDriveSettings = !showDriveSettings} class="bg-white hover:bg-gray-100 text-gray-500 border border-[#dddddd] p-2.5 rounded-lg transition-all shadow-sm cursor-pointer select-none" aria-label="Google Drive Settings">
          <svg class="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      {/if}
      
      <button on:click={handleDownloadAndSave} disabled={isProcessing || isSaving || isUploadingToDrive} class="bg-[#181d26] hover:bg-[#0d1218] active:bg-[#0d1218] text-white px-6 py-2.5 rounded-lg font-medium text-xs tracking-wide transition-all duration-150 flex items-center space-x-2 disabled:bg-gray-400 select-none shadow-sm cursor-pointer w-full sm:w-auto justify-center">
        <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
        </svg>
        <span>{isProcessing ? 'Processing PDF...' : 'Download PDF'}</span>
      </button>
    </div>
  </div>

  {#if showDriveSettings}
    <div class="bg-white border border-[#dddddd] rounded-xl p-5 shadow-sm flex flex-col gap-3">
      <div class="flex justify-between items-center border-b border-[#dddddd] pb-2">
        <h4 class="text-xs font-bold text-[#181d26] uppercase tracking-wider flex items-center">
          <svg class="w-4 h-4 mr-1.5 text-[#1a73e8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          Google Drive Target Folder Configuration
        </h4>
        <button on:click={() => showDriveSettings = false} class="text-gray-400 hover:text-gray-600 text-xs font-semibold">✕ Close</button>
      </div>
      <p class="text-xs text-[#8a8d94] leading-relaxed">Paste your Google Drive Folder URL (e.g. <code>https://drive.google.com/drive/folders/...</code>) or a direct Folder ID below. If left blank, files will be uploaded to your root "My Drive" directory.</p>
      <div class="flex flex-col sm:flex-row gap-3">
        <input type="text" placeholder="https://drive.google.com/drive/folders/your_folder_id_here" bind:value={gdriveFolderUrl} on:input={handleSaveFolderUrl} class="flex-grow p-3 border border-[#dddddd] rounded-lg text-xs bg-white text-[#181d26] focus:outline-none focus:border-[#458fff] focus:ring-1 focus:ring-[#458fff] transition-all font-mono font-medium shadow-sm" />
      </div>
    </div>
  {/if}

  <!-- Workspace split screen -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6" style="height: calc(100vh - 180px);">
    <!-- Editor Pane -->
    <div class="flex flex-col h-full min-h-0">
      <span class="text-[11px] font-bold text-[#9297a0] tracking-wider mb-2 uppercase select-none">Markdown Editor</span>
      <textarea bind:value={markdownContent} class="w-full flex-grow p-5 border border-[#dddddd] rounded-xl focus:outline-none focus:border-[#458fff] focus:ring-1 focus:ring-[#458fff] transition-all shadow-sm resize-none font-mono text-sm leading-relaxed text-[#181d26] bg-[#f8fafc] overflow-y-auto" placeholder="Write your markdown here..."></textarea>
    </div>

    <!-- Preview Pane -->
    <div class="flex flex-col h-full min-h-0">
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

{#if isDocLoading}
  <div class="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
    <div class="flex flex-col items-center space-y-4">
      <div class="w-10 h-10 border-4 border-gray-200 border-t-[#181d26] rounded-full animate-spin"></div>
      <p class="text-sm font-medium text-[#181d26]">Loading document...</p>
    </div>
  </div>
{/if}