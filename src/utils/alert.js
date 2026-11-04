// src/utils/alert.js
import Swal from "sweetalert2";

// Yashasvi Alert
export const showSuccess = (title = "यशस्वी", text = "") => {
  return Swal.fire({
    icon: "success",
    title: `<span style="font-family: inherit; font-weight: 800;">${title}</span>`,
    text: text,
    confirmButtonText: "ठीक आहे",
    confirmButtonColor: "#ea580c",
    customClass: {
      popup: "rounded-3xl border border-slate-200 font-sans text-slate-800 shadow-xl",
      confirmButton: "px-5 py-2.5 rounded-xl font-bold text-xs"
    }
  });
};

// Truti / Error Alert
export const showError = (title = "त्रुटी", text = "") => {
  return Swal.fire({
    icon: "error",
    title: `<span style="font-family: inherit; font-weight: 800;">${title}</span>`,
    text: text,
    confirmButtonText: "समजले",
    confirmButtonColor: "#dc2626",
    customClass: {
      popup: "rounded-3xl border border-slate-200 font-sans text-slate-800 shadow-xl",
      confirmButton: "px-5 py-2.5 rounded-xl font-bold text-xs"
    }
  });
};

// Khatri / Confirm Alert
export const showConfirm = async (title = "खात्री करा", text = "") => {
  const result = await Swal.fire({
    icon: "warning",
    title: `<span style="font-family: inherit; font-weight: 800;">${title}</span>`,
    text: text,
    showCancelButton: true,
    confirmButtonText: "होय, पुढे जा",
    cancelButtonText: "रद्द करा",
    confirmButtonColor: "#ea580c",
    cancelButtonColor: "#64748b",
    customClass: {
      popup: "rounded-3xl border border-slate-200 font-sans text-slate-800 shadow-xl",
      confirmButton: "px-5 py-2.5 rounded-xl font-bold text-xs",
      cancelButton: "px-5 py-2.5 rounded-xl font-bold text-xs"
    }
  });
  return result.isConfirmed;
};