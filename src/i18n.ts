import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import Backend from "i18next-http-backend"
import platform from "./platform"

// Determine loadPath based on environment
const getLoadPath = async () => {
  // Get the resources path from our platform layer
  return await platform.getResourcesPath("locales/{{lng}}/{{ns}}.json")
}

const loadPath = await getLoadPath()

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    backend: {
      loadPath,
    },
    fallbackLng: "en",
    supportedLngs: ["zh-TW", "zh-CN", "en", "es", "ja"],
    interpolation: {
      escapeValue: false
    },
    debug: false // Set to true for debugging i18n issues
  })

export default i18n
