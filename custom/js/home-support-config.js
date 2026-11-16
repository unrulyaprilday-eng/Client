// Page-local configuration. Keep the existing production floating-button configuration
// as the source of these values when integrating. No production SDK is loaded here.
window.HOME_SUPPORT_CONFIG = {
  launcher: {
    enabled: true,
    label: "Support",
    image: "", // Optional relative custom/assets/ image, with the default icon as fallback.
    side: "right",
    inset: 16,
    bottom: 104,
    size: 60
  },
  channels: {
    facebook: "https://www.facebook.com/777vip", // Example account path supplied for this prototype.
    telegram: "https://t.me/zzyybb4"
  },
  channelDetails: {
    facebook: { name: "Official Facebook", availability: "24/7" },
    telegram: { name: "Official Telegram", availability: "24/7" }
  },
  prototype: { responseDelay: 900 }
};
