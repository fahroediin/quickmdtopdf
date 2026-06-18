# QuickMDtoPDF — Sample Document

Ini adalah contoh dokumen Markdown yang mendemonstrasikan berbagai elemen formatting. Preview di sebelah kanan akan **match** dengan output PDF.

---

## 1. Text Formatting

Ini adalah teks **bold**, *italic*, dan ***bold italic***. Anda juga bisa menggunakan ~~strikethrough~~ untuk mencoret teks.

Ini adalah [link ke Google](https://google.com) dan ini URL otomatis: https://github.com

## 2. Lists

### Unordered List
- Item pertama
- Item kedua
  - Sub-item A
  - Sub-item B
- Item ketiga

### Ordered List
1. Langkah pertama
2. Langkah kedua
   1. Sub-langkah 2.1
   2. Sub-langkah 2.2
3. Langkah ketiga

## 3. Code

Gunakan `inline code` untuk referensi singkat.

```javascript
// Code block dengan syntax
function greet(name) {
  console.log(`Hello, ${name}!`);
  return { status: "success", message: `Greeted ${name}` };
}

greet("World");
```

## 4. Table

| Fitur | Status | Keterangan |
|-------|--------|------------|
| Heading | ✅ | H1 sampai H6 |
| Bold/Italic | ✅ | Inline formatting |
| Table | ✅ | Dengan border dan zebra stripe |
| Code Block | ✅ | Syntax highlighting |
| Blockquote | ✅ | Dengan border kiri |

## 5. Blockquote

> Ini adalah blockquote. Digunakan untuk kutipan atau catatan penting.
>
> Bisa memiliki **multiple paragraphs** dan *formatting* di dalamnya.

> Nested quote:
>> Ini adalah nested blockquote di dalam blockquote.

## 6. Horizontal Rule

Konten di atas garis.

---

Konten di bawah garis.

## 7. Mixed Content

Berikut adalah contoh penggunaan **berbagai elemen** secara bersamaan:

1. Buat file baru dengan perintah `touch index.js`
2. Tambahkan kode berikut:
   ```python
   def calculate(x, y):
       return x + y
   ```
3. Jalankan dengan `python index.py`

> **Catatan:** Pastikan Python sudah terinstall di sistem Anda.