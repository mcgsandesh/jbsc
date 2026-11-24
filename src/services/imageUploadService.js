// src/services/imageUploadService.js

// ब्राउझरमध्येच फोटो कॉम्प्रेस करणे
export async function compressImageFile(file, maxWidth = 600, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Image compression failed"));
              return;
            }
            resolve(blob);
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = reject;
      img.src = event.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// कॉम्प्रेस केलेला फोटो imgbb वर नावासह अपलोड करणे
export async function uploadToImgbb(file, options = {}) {
  const apiKey = import.meta.env.VITE_IMGBB_API_KEY;
  if (!apiKey) {
    throw new Error("VITE_IMGBB_API_KEY .env मध्ये सेट केलेली नाही.");
  }

  const compressedBlob = await compressImageFile(
    file,
    options.maxWidth || 600,
    options.quality || 0.78
  );

  const base64Data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || "");
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(compressedBlob);
  });

  // imgbb वर ओळखण्यासाठी कस्टम नाव तयार करणे
  const rawPrefix = (options.namePrefix || "JBSC_AUCTION").replace(/[^a-zA-Z0-9_-]/g, "_");
  const cleanFileName = `${rawPrefix}_${Date.now()}`;

  const formData = new FormData();
  formData.append("key", apiKey);
  formData.append("image", base64Data);
  formData.append("name", cleanFileName);

  const res = await fetch("https://api.imgbb.com/1/upload", {
    method: "POST",
    body: formData
  });

  const data = await res.json();
  if (!res.ok || !data?.success || !data?.data?.url) {
    throw new Error(data?.error?.message || "imgbb अपलोड अयशस्वी झाले.");
  }

  return data.data.display_url || data.data.url;
}