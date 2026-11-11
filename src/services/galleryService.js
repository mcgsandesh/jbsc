// src/services/galleryService.js
import { db } from "../config/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

// 'gallery' किंवा 'gallary' दोन्ही स्पेलिंग्स ऑटो-डिटेक्ट करेल
const localImages = import.meta.glob(
  [
    "/src/assets/gallery/**/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}",
    "/src/assets/gallary/**/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}"
  ],
  { eager: true }
);

const loadAutoLocalGallery = () => {
  const items = [];
  let index = 1;

  for (const path in localImages) {
    const mod = localImages[path];
    const mediaUrl = mod?.default || mod;

    // पाथ स्प्लिट करून वर्ष व इव्हेंट नाव काढणे
    const parts = path.split("/");
    const filename = parts.pop();
    const folderOrYear = parts.pop();
    const parentFolder = parts.pop();

    const isYear = /^\d{4}$/.test(folderOrYear);
    const year = isYear ? folderOrYear : "2013";
    const rawCategory = isYear ? parentFolder : folderOrYear;

    let eventName = "दीपोत्सव";
    let category = "दीपोत्सव";

    if (rawCategory && rawCategory.toLowerCase().includes("cricket")) {
      eventName = "BOXT20 क्रिकेट";
      category = "BOXT20 क्रिकेट";
    }

    items.push({
      id: `local-${index++}`,
      year: String(year),
      eventName: eventName,
      category: category,
      type: "photo",
      mediaUrl: mediaUrl,
      caption: `${eventName} ${year} (${filename})`
    });
  }

  return items;
};

export const getGalleryItems = async () => {
  const localItems = loadAutoLocalGallery();

  try {
    const q = query(collection(db, "gallery"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const firestoreData = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    if (firestoreData.length > 0) {
      return [...firestoreData, ...localItems];
    }
    return localItems;
  } catch (error) {
    console.warn("Firestore fallback to local gallery:", error);
    return localItems;
  }
};