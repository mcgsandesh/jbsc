// src/utils/validators.js

export const VALIDATION_RULES = {
  mobile10: {
    regex: /^[6-9]\d{9}$/,
    errorMsg: "Krupaya 10 anki valid mobile number taka.",
  },
  pin6: {
    regex: /^[1-9][0-9]{5}$/,
    errorMsg: "Krupaya 6 anki valid pincode taka.",
  },
  textOnly: {
    regex: /^[A-Za-z\s]+$/,
    errorMsg: "Fakt ingraji akshare (alphabets) valid aahat.",
  },
};

export const validateField = (val, ruleType) => {
  if (!ruleType || ruleType === "none" || !val) return null;
  const rule = VALIDATION_RULES[ruleType];
  if (!rule) return null;
  return rule.regex.test(val.trim()) ? null : rule.errorMsg;
};