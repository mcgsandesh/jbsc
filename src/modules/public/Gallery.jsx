// src/modules/public/Gallery.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Images, 
  Sparkles, 
  Calendar, 
  Play, 
  X, 
  Filter,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { getGalleryItems } from "../../services/galleryService";

export default function Gallery() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  
  // सध्या उघडलेल्या फोटोचा इंडेक्स (Index)
  const [activePhotoIndex, setActivePhotoIndex] = useState(null);

  // १. फोटो लोड करणे
  useEffect(() => {
    const fetchMedia = async () => {
      setLoading(true);
      try {
        const data = await getGalleryItems();
        setItems(data);
      } catch (err) {
        console.error("Gallery Load Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMedia();
  }, []);

  // २. उपलब्ध वर्षे आणि कॅटेगरीज
  const years = useMemo(() => {
    const ySet = new Set(items.map((i) => String(i.year)).filter(Boolean));
    return ["all", ...Array.from(ySet).sort().reverse()];
  }, [items]);

  const categories = useMemo(() => {
    const cSet = new Set(items.map((i) => i.eventName || i.category).filter(Boolean));
    return ["all", ...Array.from(cSet)];
  }, [items]);

  // ३. फिल्टर केलेली लिस्ट
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchYear = selectedYear === "all" || String(item.year) === selectedYear;
      const matchCategory = selectedCategory === "all" || (item.eventName || item.category) === selectedCategory;
      return matchYear && matchCategory;
    });
  }, [items, selectedYear, selectedCategory]);

  // ४. Next आणि Previous हँडलर्स
  const handlePrev = useCallback(() => {
    if (activePhotoIndex === null) return;
    setActivePhotoIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
  }, [activePhotoIndex, filteredItems.length]);

  const handleNext = useCallback(() => {
    if (activePhotoIndex === null) return;
    setActivePhotoIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
  }, [activePhotoIndex, filteredItems.length]);

  // ५. कीबोर्ड एरो कीज (ArrowLeft / ArrowRight / Escape) सपोर्ट
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (activePhotoIndex === null) return;
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "Escape") setActivePhotoIndex(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePhotoIndex, handlePrev, handleNext]);

  const currentMedia = activePhotoIndex !== null ? filteredItems[activePhotoIndex] : null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-16">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white py-8 px-4 sm:px-6 shadow-md text-center relative overflow-hidden">
        <div className="relative z-10 max-w-2xl mx-auto space-y-1.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider bg-white/20 border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" /> सुवर्ण क्षण व आठवणी
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            जागेवाला बाबा स्पोर्ट्स क्लब गॅलरी
          </h1>
          <p className="text-xs sm:text-sm text-orange-100 font-medium">
            दीपोत्सव, BOXT20 क्रिकेट स्पर्धा आणि ऐतिहासिक सोहळ्यांची छायाचित्रे
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-6 pt-5 space-y-4">

        {/* Filters Strip */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row gap-2.5 items-center justify-between">
          
          {/* Year Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar pb-0.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1 shrink-0">
              <Calendar className="w-3.5 h-3.5" /> वर्ष:
            </span>
            {years.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => {
                  setSelectedYear(y);
                  setActivePhotoIndex(null);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedYear === y
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {y === "all" ? "सर्व वर्षे" : y}
              </button>
            ))}
          </div>

          {/* Event Filter */}
          {categories.length > 2 && (
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar pb-0.5 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1 shrink-0">
                <Filter className="w-3.5 h-3.5" /> इव्हेंट:
              </span>
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(c);
                    setActivePhotoIndex(null);
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    selectedCategory === c
                      ? "bg-orange-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {c === "all" ? "सर्व इव्हेंट्स" : c}
                </button>
              ))}
            </div>
          )}

        </div>

        {/* Gallery Grid (१, २, ३, ४... क्रमाने) */}
        {loading ? (
          <div className="py-20 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
            <div className="w-7 h-7 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs sm:text-sm font-bold">आठवणी लोड होत आहेत...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200 space-y-2">
            <Images className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-600">कोणतीही छायाचित्रे सापडली नाहीत</h3>
            <p className="text-xs text-slate-400">निवडलेल्या वर्षाचे फोटो लवकरच उपलब्ध होतील.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-4">
            {filteredItems.map((item, index) => (
              <div
                key={item.id}
                onClick={() => setActivePhotoIndex(index)}
                className="group relative bg-slate-900 rounded-2xl overflow-hidden shadow-xs cursor-pointer aspect-square border border-slate-200 hover:border-orange-400 transition"
              >
                <img
                  src={item.mediaUrl}
                  alt={item.caption || "JBSC Photo"}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />

                {/* फोटो नंबर बॅज (वर डावीकडे: #1, #2...) */}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[10px] font-black text-white border border-white/20">
                  #{index + 1}
                </div>

                {/* Video Play Indicator */}
                {item.type === "video" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="w-10 h-10 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition">
                      <Play className="w-5 h-5 fill-white ml-0.5" />
                    </div>
                  </div>
                )}

                {/* तळातील माहिती */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-white">
                  <span className="text-[10px] font-black uppercase text-amber-300 block line-clamp-1">
                    {item.eventName} {item.year}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Lightbox / Slider Modal (Next & Prev Support) */}
      {currentMedia && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
          
          {/* Top Bar: Counter & Close */}
          <div className="absolute top-4 inset-x-4 flex items-center justify-between text-white z-50 max-w-5xl mx-auto">
            <span className="px-3 py-1 rounded-full bg-white/10 text-xs font-bold border border-white/20">
              फोटो {activePhotoIndex + 1} / {filteredItems.length}
            </span>
            <button
              type="button"
              onClick={() => setActivePhotoIndex(null)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              title="बंद करा (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Left Arrow (Previous) */}
          {filteredItems.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="absolute left-2 sm:left-6 z-50 p-2 sm:p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition cursor-pointer active:scale-95"
              title="मागील फोटो"
            >
              <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>
          )}

          {/* Image Display */}
          <div 
            className="relative max-w-4xl w-full flex flex-col items-center justify-center px-8 sm:px-12"
            onClick={(e) => e.stopPropagation()}
          >
            {currentMedia.type === "video" ? (
              <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl border border-slate-800">
                <iframe
                  src={currentMedia.mediaUrl.replace("watch?v=", "embed/")}
                  title="Video"
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <img
                src={currentMedia.mediaUrl}
                alt={currentMedia.caption}
                className="max-h-[78vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl border border-slate-800 transition"
              />
            )}

            {/* Event Name & Caption */}
            <div className="mt-3 text-center text-white space-y-0.5">
              <span className="text-xs sm:text-sm font-bold text-amber-400">
                {currentMedia.eventName} • {currentMedia.year}
              </span>
            </div>
          </div>

          {/* Right Arrow (Next) */}
          {filteredItems.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-2 sm:right-6 z-50 p-2 sm:p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition cursor-pointer active:scale-95"
              title="पुढील फोटो"
            >
              <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>
          )}

        </div>
      )}

    </div>
  );
}